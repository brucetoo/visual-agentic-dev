import { WebSocketServer, WebSocket } from 'ws';
import * as crypto from 'crypto';
import { PromptBuilder } from '../claude/PromptBuilder';
import { resolveProjectPath, deriveProjectPathFromSource } from '../utils/ProjectUtils';
import { TerminalManager } from '../utils/TerminalManager';
import type { ClientMessage, ServerMessage, StreamMessage, ResolveProjectPathPayload, TerminalDataPayload, TerminalResizePayload } from '../types';

/**
 * WebSocket server that bridges browser extension to Claude Code CLI
 * No authentication required - for local development use only
 */
export class VDevWebSocketServer {
    private wss: WebSocketServer;
    private terminalManager: TerminalManager = new TerminalManager();

    // Mapping from sessionId (projectPath hash) to connected clients
    private sessionClients: Map<string, Set<WebSocket>> = new Map();

    constructor(port: number = 9527) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', this.handleConnection.bind(this));

        // Listen for readiness events
        this.terminalManager.onReady((sessionId) => {
            console.log(`[VDev Bridge] Session ${sessionId} is ready. Broadcasting to clients...`);
            this.broadcastToSession(sessionId, {
                type: 'TERMINAL_READY',
                id: 'broadcast',
                payload: { sessionId }
            } as any); // Type cast until we strictly type broadcastToSession arg
        });

        console.log(`[VDev Bridge] WebSocket server running on ws://localhost:${port}`);
    }

    private getSessionId(projectPath: string): string {
        // Use a stable hash of the project path as the session ID
        return crypto.createHash('md5').update(projectPath).digest('hex');
    }

    private handleConnection(ws: WebSocket): void {
        console.log('[VDev Bridge] Client connected');
        // ephemeral ID for task tracking, though tasks might be better keyed by project now too?
        // For task execution, we still use one runner per request? 
        // Or should runner be per session?
        // Currently architecture assumes ephemeral runner. Let's keep clientId for runner/task tracking.
        const clientId = Math.random().toString(36).substring(7);

        // Track subscriptions for this client to clean up on disconnect
        const subscribedSessions: Set<string> = new Set();

        ws.on('message', async (data) => {
            try {
                const message: ClientMessage = JSON.parse(data.toString());

                // Handle different message types
                switch (message.type) {
                    case 'EXECUTE_TASK':
                        await this.handleExecuteTask(ws, message, subscribedSessions);
                        break;
                    case 'RESOLVE_PROJECT_PATH':
                        await this.handleResolveProjectPath(ws, message);
                        break;
                    case 'TERMINAL_DATA':
                        await this.handleTerminalData(ws, message, subscribedSessions);
                        break;
                    case 'TERMINAL_RESIZE':
                        this.handleTerminalResize(message);
                        break;
                    case 'TERMINAL_INIT':
                        await this.handleTerminalInit(ws, message, subscribedSessions);
                        break;
                    case 'TERMINAL_RESET':
                        this.handleTerminalReset(message);
                        break;
                }
            } catch (error) {
                console.error('[VDev Bridge] Message error:', error);
            }
        });

        ws.on('close', () => {
            console.log(`[VDev Bridge] Client disconnected`);

            // Unsubscribe from sessions
            for (const sessionId of subscribedSessions) {
                const clients = this.sessionClients.get(sessionId);
                if (clients) {
                    clients.delete(ws);
                    if (clients.size === 0) {
                        this.sessionClients.delete(sessionId);
                        // Optional: Terminate session if no clients? 
                        // User requested "reuse existing session", so we KEEP it alive.
                        // But maybe we should have a timeout? For now, keep it simple: manual kill or server restart.
                    }
                }
            }
        });
    }

    // Track which PTYs we are currently listening to, to handle restarts (Swap PTY)
    private activePtys: Map<string, any> = new Map();

    private async ensureSession(sessionId: string, projectPath: string, useYolo: boolean = false): Promise<void> {
        try {
            // We modify getOrCreateSession signature on the fly if needed, but here it's fine.
            // If YOLO mode changes, this returns a NEW pty object.
            const sessionPty = await this.terminalManager.getOrCreateSession(sessionId, projectPath, useYolo);

            const lastPty = this.activePtys.get(sessionId);

            // If we haven't seen this PTY before (New session OR Restarted session), attach listener
            if (lastPty !== sessionPty) {
                console.log(`[VDev Bridge] Attaching listener to new PTY for session ${sessionId}`);
                sessionPty.onData((data: string) => {
                    this.broadcastToSession(sessionId, data);
                });
                this.activePtys.set(sessionId, sessionPty);
            }
        } catch (error) {
            console.error(`[VDev Bridge] Error ensuring session ${sessionId} for project ${projectPath}:`, error);
            const errorMessage = (error as Error).message || String(error);

            if (errorMessage.includes('Missing required tools')) {
                this.broadcastToSession(sessionId, {
                    type: 'TOOL_MISSING',
                    id: 'broadcast',
                    payload: { message: errorMessage }
                });
            }

            this.broadcastToSession(sessionId, {
                type: 'TERMINAL_OUTPUT',
                id: 'broadcast',
                payload: { data: `\r\n\x1b[31mError: Failed to ensure terminal session. ${errorMessage}\r\nCheck if 'npx' execution environment has correct permissions and 'node-pty' is compatible.\x1b[0m\r\n` }
            });
            // We should arguably re-throw or handle the fact that session is not ready?
            // But for now, notifying the client is key.
        }
    }

    private subscribeToSession(ws: WebSocket, sessionId: string, subscribedSessions: Set<string>): void {
        // Enforce SINGLE active session per client socket.
        // Iterate over a COPY to safely modify the original Set during iteration.
        const currentSessions = Array.from(subscribedSessions);

        for (const oldSessionId of currentSessions) {
            if (oldSessionId !== sessionId) {
                console.log(`[VDev Bridge] Unsubscribing client from old session: ${oldSessionId}`);
                const oldClients = this.sessionClients.get(oldSessionId);
                if (oldClients) {
                    oldClients.delete(ws);
                    if (oldClients.size === 0) {
                        this.sessionClients.delete(oldSessionId);
                        // We still keep the process alive in TerminalManager
                    }
                }
                subscribedSessions.delete(oldSessionId);
            }
        }

        if (!subscribedSessions.has(sessionId)) {
            console.log(`[VDev Bridge] Subscribing client to new session: ${sessionId}`);
            if (!this.sessionClients.has(sessionId)) {
                this.sessionClients.set(sessionId, new Set());
            }
            this.sessionClients.get(sessionId)?.add(ws);
            subscribedSessions.add(sessionId);
        }
    }

    private broadcastToSession(sessionId: string, messageOrData: string | object): void {
        const clients = this.sessionClients.get(sessionId);
        if (clients && clients.size > 0) {
            let payload: string;

            if (typeof messageOrData === 'string') {
                payload = JSON.stringify({
                    type: 'TERMINAL_OUTPUT',
                    id: 'stream',
                    payload: { data: messageOrData }
                });
            } else {
                payload = JSON.stringify(messageOrData);
            }

            for (const client of clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            }
        }
    }

    private async handleTerminalInit(
        ws: WebSocket,
        message: ClientMessage,
        subscribedSessions: Set<string>
    ): Promise<void> {
        const payload = message.payload as any;
        const { projectPath, useYolo } = payload;

        if (!projectPath) return;

        console.log(`[VDev Bridge] Initializing terminal for ${projectPath}`);
        const sessionId = this.getSessionId(projectPath);

        this.subscribeToSession(ws, sessionId, subscribedSessions);
        await this.ensureSession(sessionId, projectPath, !!useYolo);

        // Replay history
        const history = this.terminalManager.getHistory(sessionId);
        if (history) {
            this.send(ws, {
                type: 'TERMINAL_OUTPUT',
                id: message.id, // Response to INIT
                payload: { data: history }
            });
        }

        // Check readiness
        if (this.terminalManager.isSessionReady(sessionId)) {
            console.log(`[VDev Bridge] Session ${sessionId} is already READY. Notifying client.`);
            this.send(ws, {
                type: 'TERMINAL_READY',
                id: message.id,
                payload: { sessionId }
            });
        }
    }

    private async handleExecuteTask(
        ws: WebSocket,
        message: ClientMessage,
        subscribedSessions: Set<string>
    ): Promise<void> {
        const payload = message.payload as { source: { fileName: string; lineNumber: number; columnNumber: number }; instruction: string; projectPath: string };
        const { source, instruction, projectPath: extensionProvidedPath } = payload;

        const projectPath = deriveProjectPathFromSource(source.fileName) || extensionProvidedPath;
        const sessionId = this.getSessionId(projectPath);

        console.log(`[VDev Bridge] Executing task for ${projectPath} (Session: ${sessionId})`);

        // Ensure we are subscribed to output
        this.subscribeToSession(ws, sessionId, subscribedSessions);
        await this.ensureSession(sessionId, projectPath, false);

        const prompt = PromptBuilder.build({ source, instruction });

        // Send the prompt to the pty process via terminal manager
        // We add a few newlines to ensure clean input
        this.terminalManager.sendData(sessionId, `\n${prompt}\n`);

        this.send(ws, {
            type: 'TASK_STARTED',
            id: message.id,
            payload: { status: 'running' },
            projectPath,
        });
    }

    private async handleResolveProjectPath(
        ws: WebSocket,
        message: ClientMessage
    ): Promise<void> {
        const payload = message.payload as ResolveProjectPathPayload;
        const port = payload?.port;

        if (!port) {
            this.send(ws, {
                type: 'PROJECT_PATH_RESOLVED',
                id: message.id,
                payload: { projectPath: null, error: 'No port provided' },
            });
            return;
        }

        console.log(`[VDev Bridge] Resolving project path for port ${port}`);

        const projectPath = await resolveProjectPath(port);

        this.send(ws, {
            type: 'PROJECT_PATH_RESOLVED',
            id: message.id,
            payload: { projectPath },
        });
    }

    private async handleTerminalData(
        ws: WebSocket,
        message: ClientMessage,
        subscribedSessions: Set<string>
    ): Promise<void> {
        const payload = message.payload as TerminalDataPayload;
        if (!payload) return;

        const { data, projectPath, useYolo } = payload;

        if (projectPath) {
            const sessionId = this.getSessionId(projectPath);
            this.subscribeToSession(ws, sessionId, subscribedSessions);
            try {
                await this.ensureSession(sessionId, projectPath, !!useYolo);
                if (data) {
                    this.terminalManager.sendData(sessionId, data);
                }
            } catch (error) {
                console.error('[VDev Bridge] Error ensuring session likely due to spawn failure:', error);
                const errorMessage = (error as Error).message || String(error);
                this.send(ws, {
                    type: 'TERMINAL_OUTPUT',
                    id: message.id,
                    payload: { data: `\r\n\x1b[31mError: Failed to start terminal session. ${errorMessage}\x1b[0m\r\n` }
                });
            }
        }
    }

    private handleTerminalResize(message: ClientMessage): void {
        // We need sessionId or projectPath to resize correct terminal.
        // Current payload might not have it if xterm-addon-fit triggers strictly UI event.
        // But App.tsx sends sendTerminalResize(cols, rows) which needs specific session.
        // Let's assume the frontend should pass projectPath in payload for resize too if possible?
        // Or we assume the client is focused on one session.
        // Current implementation receives projectPath via `sendTerminalResize`.

        const payload = message.payload as any; // Using any to access potential projectPath if we add it
        if (payload && payload.projectPath) {
            const sessionId = this.getSessionId(payload.projectPath);
            this.terminalManager.resize(sessionId, payload.cols, payload.rows);
        }
    }

    private handleTerminalReset(message: ClientMessage): void {
        const payload = message.payload as any;
        if (payload && payload.projectPath) {
            const sessionId = this.getSessionId(payload.projectPath);
            console.log(`[VDev Bridge] RESETTING session for ${payload.projectPath} (Session: ${sessionId})`);

            // 1. Terminate process
            this.terminalManager.terminateSession(sessionId);

            // 2. Clear history
            this.terminalManager.clearHistory(sessionId);

            // 3. Clear from active PTYs listener map
            this.activePtys.delete(sessionId);

            // 4. Force disconnect clients from this session? 
            // Maybe not needed, they will reconnect/re-init if page reloads.
        }
    }

    private send(ws: WebSocket, message: ServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    close(): void {
        this.wss.close();
        console.log('[VDev Bridge] Server closed');
    }
}
