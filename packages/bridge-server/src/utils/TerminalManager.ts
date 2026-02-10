import * as pty from 'node-pty';
import * as os from 'os';
import { Terminal } from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { ToolManager } from './ToolManager';

const shell = os.platform() === 'win32'
    ? 'powershell.exe'
    : (process.env.SHELL || '/bin/zsh');

interface TerminalSession {
    pty: pty.IPty;
    headless: Terminal;
    serializer: SerializeAddon;
    useYolo: boolean;
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

    async getOrCreateSession(
        id: string,
        cwd: string,
        useYolo: boolean = false
    ): Promise<pty.IPty> {
        let sessionWrapper = this.sessions.get(id);

        // If session exists but YOLO mode changed, we MUST restart it to apply new flag
        if (sessionWrapper && sessionWrapper.useYolo !== useYolo) {
            console.log(`[TerminalManager] YOLO mode changed for session ${id}. Restarting...`);
            this.terminateSession(id);
            sessionWrapper = undefined;
        }

        if (!sessionWrapper) {
            console.log(`[TerminalManager] Creating new session for project: ${cwd} (useYolo: ${useYolo})`);

            // Ensure tools are installed before launching
            await ToolManager.ensureTools();

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


            // Markers that indicate Claude Code is interactive/ready
            // e.g. "Welcome back!", "Try", or the prompt "> " or specific control sequences
            const readyMarkers = [
                'Welcome back',
                'Try "',      // Suggestion text (generic)
                'bypass permissions',
                '\u276F',     // The prompt character often used by Claude Code
                '/model to try', // Hint text often present at startup
                '> '          // Standard prompt fallback
            ];

            sessionWrapper = {
                pty: ptyProcess,
                headless,
                serializer,
                useYolo,
                isReady: false,
                historyBuffer
            };

            // Capture output for history & readiness
            ptyProcess.onData((data) => {
                if (sessionWrapper) {
                    // Write to headless terminal for state tracking
                    sessionWrapper.headless.write(data);

                    // Buffer for readiness detection only
                    sessionWrapper.historyBuffer.push(data);
                    if (sessionWrapper.historyBuffer.length > this.READINESS_BUFFER_SIZE) {
                        sessionWrapper.historyBuffer.shift();
                    }

                    // Check for readiness if not already ready
                    if (!sessionWrapper.isReady) {
                        // eslint-disable-next-line no-control-regex
                        const cleanData = data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
                        // Check logic remains same, but we check `data` chunk mainly
                        const hasMarker = readyMarkers.some(marker => cleanData.includes(marker) || data.includes(marker));

                        if (hasMarker) {
                            sessionWrapper.isReady = true;
                            console.log(`[TerminalManager] Session ${id} is READY. Match found.`);
                            this._onReady(id);
                        }
                    }
                }
            });

            ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
                console.log(`[TerminalManager] Session ${id} exited with code ${exitCode}, signal ${signal}`);
                if (this.sessions.get(id) === sessionWrapper) {
                    this.sessions.delete(id);
                }
            });

            this.sessions.set(id, sessionWrapper);

            // Auto-launch ccr code
            const launchCmd = useYolo ? 'ccr code --dangerously-skip-permissions' : 'ccr code';
            console.log(`[TerminalManager] Launching: ${launchCmd}`);
            ptyProcess.write(`${launchCmd}\r`);
        } else {
            // If reusing existing session, it's likely already ready.
            // We should probably trigger ready immediately if it's been running for a bit?
            // BUT now we have explicit state.
            // If session is ALREADY ready, getting it here might need to notify caller?
            // The caller (WebSocketServer) will verify `isSessionReady`.
        }

        return sessionWrapper.pty;
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
