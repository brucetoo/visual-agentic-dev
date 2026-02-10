import * as pty from 'node-pty';
import * as os from 'os';
import { Terminal } from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { ToolManager } from './ToolManager';
import { AgentRegistry } from './AgentRegistry';

const shell = os.platform() === 'win32'
    ? 'powershell.exe'
    : (process.env.SHELL || '/bin/zsh');

interface TerminalSession {
    pty: pty.IPty;
    headless: Terminal;
    serializer: SerializeAddon;
    useYolo: boolean;
    agentCommand: string;
    isReady: boolean;
    historyBuffer: string[]; // Keep a small buffer for readiness detection
}

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();
    // Persist serialized state for sessions by ID
    private persistedState: Map<string, string> = new Map();
    private readonly READINESS_BUFFER_SIZE = 50;

    private _onReady: (sessionId: string) => void = () => { };

    // Register a callback for when a session is ready
    onReady(callback: (sessionId: string) => void) {
        this._onReady = callback;
    }

    clearHistory(id: string): void {
        const session = this.sessions.get(id);
        if (session) {
            session.headless.reset();
            session.historyBuffer = [];
        }
        this.persistedState.delete(id);
    }

    isSessionReady(id: string): boolean {
        return this.sessions.get(id)?.isReady || false;
    }

    private pendingCreations: Map<string, Promise<pty.IPty>> = new Map();

    async getOrCreateSession(
        id: string,
        cwd: string,
        useYolo: boolean = false,
        agentCommand: string = 'ccr code'
    ): Promise<pty.IPty> {
        // 1. Check if session exists AND configuration matches
        let sessionWrapper = this.sessions.get(id);

        if (sessionWrapper) {
            const configChanged = sessionWrapper.useYolo !== useYolo || sessionWrapper.agentCommand !== agentCommand;

            if (configChanged) {
                console.log(`[TerminalManager] Configuration changed for session ${id}. Restarting...`);
                this.terminateSession(id);
                sessionWrapper = undefined;
            } else {
                return sessionWrapper.pty;
            }
        }

        // 2. Check if creation is already in progress
        if (this.pendingCreations.has(id)) {
            console.log(`[TerminalManager] Joining pending creation for session ${id}`);
            return this.pendingCreations.get(id)!;
        }

        // 3. Start new creation
        const creationPromise: Promise<pty.IPty> = (async () => {
            console.log(`[TerminalManager] Creating new session for project: ${cwd} (useYolo: ${useYolo}, command: ${agentCommand})`);

            try {
                // Ensure tools are installed before launching
                await ToolManager.ensureTools(agentCommand);
            } catch (error) {
                console.error(`[TerminalManager] Tool check failed: ${(error as Error).message}`);
                throw error; // Re-throw to be handled by caller (WebSocketServer)
            }

            console.log(`[TerminalManager] Spawning shell: ${shell} in verified CWD: ${cwd}`);

            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80,
                rows: 24,
                cwd: cwd,
                env: { ...process.env } as any
            });

            // Create headless terminal
            const headless = new Terminal({
                allowProposedApi: true,
                cols: 80,
                rows: 24,
                scrollback: 1000
            });
            const serializer = new SerializeAddon();
            headless.loadAddon(serializer);

            // Restore state if exists
            const savedState = this.persistedState.get(id);
            if (savedState) {
                headless.write(savedState);
            }

            let historyBuffer: string[] = [];

            // --- Readiness Detection Logic ---
            const readyMarkers = AgentRegistry.getReadyMarkers(agentCommand);
            console.log(`[TerminalManager] Using readiness markers for '${agentCommand}':`, readyMarkers);

            sessionWrapper = {
                pty: ptyProcess,
                headless,
                serializer,
                useYolo,
                agentCommand,
                isReady: false,
                historyBuffer
            };

            // Capture output for history & readiness
            ptyProcess.onData((data) => {
                const currentSession = this.sessions.get(id);
                if (currentSession && currentSession.pty.pid === ptyProcess.pid) {
                    currentSession.headless.write(data);
                    currentSession.historyBuffer.push(data);
                    if (currentSession.historyBuffer.length > this.READINESS_BUFFER_SIZE) {
                        currentSession.historyBuffer.shift();
                    }

                    if (!currentSession.isReady) {
                        // eslint-disable-next-line no-control-regex
                        const cleanData = data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
                        const hasMarker = readyMarkers.some(marker => cleanData.includes(marker) || data.includes(marker));

                        if (hasMarker) {
                            currentSession.isReady = true;
                            console.log(`[TerminalManager] Session ${id} is READY. Match found.`);
                            this._onReady(id);
                        }
                    }
                }
            });

            ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
                console.log(`[TerminalManager] Session ${id} exited with code ${exitCode}, signal ${signal}`);
                const current = this.sessions.get(id);
                if (current && current.pty.pid === ptyProcess.pid) {
                    this.sessions.delete(id);
                }
            });

            this.sessions.set(id, sessionWrapper);

            // Auto-launch agent command
            let launchCmd = agentCommand;
            if (useYolo) {
                launchCmd += ' --dangerously-skip-permissions';
            }

            console.log(`[TerminalManager] Launching: ${launchCmd}`);
            ptyProcess.write(`${launchCmd}\r`);

            return ptyProcess;

        })(); // Immediately invoke async function

        // Add to pending creations
        this.pendingCreations.set(id, creationPromise);

        // Remove from pending map when done (success or failure)
        creationPromise.finally(() => {
            if (this.pendingCreations.get(id) === creationPromise) {
                this.pendingCreations.delete(id);
            }
        });

        return creationPromise;
    }

    sendData(id: string, data: string): void {
        const session = this.sessions.get(id);
        if (session) {
            session.pty.write(data);
        }
    }

    resize(id: string, cols: number, rows: number): void {
        const session = this.sessions.get(id);
        if (session) {
            try {
                session.pty.resize(cols, rows);
                session.headless.resize(cols, rows);
            } catch (e) {
                console.error('[TerminalManager] Resize error:', e);
            }
        }
    }

    terminateSession(id: string): void {
        const session = this.sessions.get(id);
        if (session) {
            const pid = session.pty.pid;

            // Save state before destroying
            this.persistedState.set(id, session.serializer.serialize());

            // Clean up headless
            session.headless.dispose();

            // Remove immediately to prevent race conditions
            this.sessions.delete(id);

            try {
                if (os.platform() !== 'win32') {
                    try {
                        process.kill(-pid, 'SIGKILL');
                    } catch (e: any) {
                        if (e.code !== 'ESRCH') {
                            console.warn(`[TerminalManager] Failed to kill process group ${pid}, falling back to pty.kill:`, e);
                            session.pty.kill('SIGKILL');
                        }
                    }
                } else {
                    session.pty.kill();
                }
            } catch (e) {
                console.error('[TerminalManager] Kill error:', e);
            }
        }
    }

    getHistory(id: string): string {
        const session = this.sessions.get(id);
        if (session) {
            return session.serializer.serialize();
        }

        return this.persistedState.get(id) || '';
    }
}
