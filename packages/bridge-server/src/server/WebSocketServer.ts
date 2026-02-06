import { WebSocketServer, WebSocket } from 'ws';
import { ClaudeCodeRunner } from '../claude/ClaudeCodeRunner';
import { resolveProjectPath, deriveProjectPathFromSource } from '../utils/ProjectUtils';
import type { ClientMessage, ServerMessage, StreamMessage, ResolveProjectPathPayload } from '../types';

/**
 * WebSocket server that bridges browser extension to Claude Code CLI
 * No authentication required - for local development use only
 */
export class VDevWebSocketServer {
    private wss: WebSocketServer;
    private runners: Map<string, ClaudeCodeRunner> = new Map();

    constructor(port: number = 9527) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', this.handleConnection.bind(this));

        console.log(`[VDev Bridge] WebSocket server running on ws://localhost:${port}`);
    }

    private handleConnection(ws: WebSocket): void {
        console.log('[VDev Bridge] Client connected');
        const clientId = Math.random().toString(36).substring(7);

        ws.on('message', async (data) => {
            try {
                const message: ClientMessage = JSON.parse(data.toString());

                // Handle different message types
                switch (message.type) {
                    case 'EXECUTE_TASK':
                        await this.handleExecuteTask(ws, message, clientId);
                        break;
                    case 'CANCEL_TASK':
                        this.handleCancelTask(ws, message, clientId);
                        break;
                    case 'GET_STATUS':
                        this.handleGetStatus(ws, message, clientId);
                        break;
                    case 'RESOLVE_PROJECT_PATH':
                        await this.handleResolveProjectPath(ws, message);
                        break;
                }
            } catch (error) {
                console.error('[VDev Bridge] Message error:', error);
            }
        });

        ws.on('close', () => {
            console.log(`[VDev Bridge] Client ${clientId} disconnected`);
            // Cancel any running tasks for this client
            const runner = this.runners.get(clientId);
            if (runner) {
                runner.cancel();
                this.runners.delete(clientId);
            }
        });
    }

    private async handleExecuteTask(
        ws: WebSocket,
        message: ClientMessage,
        clientId: string
    ): Promise<void> {
        const payload = message.payload as { source: { fileName: string; lineNumber: number; columnNumber: number }; instruction: string; projectPath: string };
        const { source, instruction, projectPath: extensionProvidedPath } = payload;

        // Derive project path from source file - this is more reliable than extension-provided path
        // because the source file path always points to the actual file location
        const projectPath = deriveProjectPathFromSource(source.fileName) || extensionProvidedPath;

        console.log(`[VDev Bridge] Executing task for ${projectPath}`);
        console.log(`[VDev Bridge] Target: ${source.fileName}:${source.lineNumber}`);
        console.log(`[VDev Bridge] Instruction: ${instruction.slice(0, 100)}...`);

        this.send(ws, {
            type: 'TASK_STARTED',
            id: message.id,
            payload: { status: 'running' },
        });

        const runner = new ClaudeCodeRunner();
        this.runners.set(clientId, runner);

        try {
            const result = await runner.execute({
                projectPath,
                source,
                instruction,
                onLog: (log: string) => {
                    console.log(`[VDev Bridge log] ${log}`);
                    this.send(ws, {
                        type: 'TASK_LOG',
                        id: message.id,
                        payload: { log },
                    });
                },
            });

            console.log(`[VDev Bridge] Task completed. Files modified: ${result.filesModified.join(', ')}`);

            this.send(ws, {
                type: 'TASK_COMPLETED',
                id: message.id,
                payload: result,
            });
        } catch (error) {
            console.error('[VDev Bridge] Task error:', error);
            this.send(ws, {
                type: 'TASK_ERROR',
                id: message.id,
                payload: { error: (error as Error).message },
            });
        } finally {
            this.runners.delete(clientId);
        }
    }

    private handleCancelTask(
        ws: WebSocket,
        message: ClientMessage,
        clientId: string
    ): void {
        const runner = this.runners.get(clientId);
        if (runner) {
            runner.cancel();
            this.runners.delete(clientId);
            console.log(`[VDev Bridge] Task cancelled for client ${clientId}`);
        }

        this.send(ws, {
            type: 'TASK_COMPLETED',
            id: message.id,
            payload: { cancelled: true },
        });
    }

    private handleGetStatus(
        ws: WebSocket,
        message: ClientMessage,
        clientId: string
    ): void {
        const runner = this.runners.get(clientId);
        this.send(ws, {
            type: 'TASK_PROGRESS',
            id: message.id,
            payload: {
                running: runner?.isRunning() ?? false
            },
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

    private send(ws: WebSocket, message: ServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    close(): void {
        // Cancel all running tasks
        for (const runner of this.runners.values()) {
            runner.cancel();
        }
        this.runners.clear();

        this.wss.close();
        console.log('[VDev Bridge] Server closed');
    }
}
