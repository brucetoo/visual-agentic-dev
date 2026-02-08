import * as pty from 'node-pty';
import * as os from 'os';
import { ToolManager } from './ToolManager';

const shell = os.platform() === 'win32'
    ? 'powershell.exe'
    : (process.env.SHELL || '/bin/zsh');

interface TerminalSession {
    pty: pty.IPty;
    history: string[]; // Circular buffer-ish
    useYolo: boolean;
    isReady: boolean;
}

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();
    // Persist history for Normal mode sessions by ID
    private normalModeHistory: Map<string, string[]> = new Map();
    private readonly MAX_HISTORY_LINES = 1000;

    private _onReady: (sessionId: string) => void = () => { };

    // Register a callback for when a session is ready
    onReady(callback: (sessionId: string) => void) {
        this._onReady = callback;
    }

    clearHistory(id: string): void {
        const session = this.sessions.get(id);
        if (session) {
            session.history = [];
        }
        this.normalModeHistory.set(id, []);
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

            // History Strategy
            // History Strategy
            // We want history for YOLO mode too now to support page reloading
            let historyArray: string[] = [];

            // Try to restore from normal mode history if switching modes? 
            // Or just keep separate?
            // User wants history to persist when switching pages (which might look like new init).
            // So we should persist history by ID regardless of mode?
            // Actually, getOrCreateSession handles the "session exists case" earlier.
            // This block is only for NEW sessions.
            // If we are here, it means we are creating a FRESH pty.

            // However, if we want to PERSIST history across pty restarts (like YOLO toggle),
            // we need to shore it outside.
            // But here we are just talking about page reload (client reconnect).
            // Client reconnect should hit the *existing* session if it's still alive.

            // WAIT. If I reload the page, the WS connection closes.
            // WebSocketServer.ts: handleConnection -> close -> unsubscribe -> delete if empty?
            // `this.sessionClients.delete(sessionId);` logic in WSS.

            // BUT `TerminalManager` keeps the session alive?
            // `TerminalManager` stores sessions in `this.sessions`.
            // There is no auto-cleanup in `TerminalManager` unless process exits.

            // So if I reload page:
            // 1. Old WS closes.
            // 2. New WS connects.
            // 3. New WS sends TERMINAL_INIT.
            // 4. WSS calls `getOrCreateSession`.
            // 5. TM finds existing session in `this.sessions`.
            // 6. Returns existing PTY.
            // 7. WSS sends history.

            // So why is history empty?
            // Ah! `historyArray` initialization logic here:
            // History Strategy
            // We want history for YOLO mode too now to support page reloading

            if (!this.normalModeHistory.has(id)) {
                this.normalModeHistory.set(id, []);
            }
            historyArray = this.normalModeHistory.get(id)!;

            // If the session is kept alive, `sessionWrapper.history` should have data.
            // `getHistory` uses `session.history`.

            // Let's look at `getHistory`:
            /*
            getHistory(id: string): string {
                const session = this.sessions.get(id);
                if (session) {
                    return session.history.join('');
                }
                const normalHistory = this.normalModeHistory.get(id);
                return normalHistory ? normalHistory.join('') : '';
            }
            */

            // If session exists, it returns `session.history`.
            // If I am in YOLO mode, `session.history` is being populated (line 95).

            // So why empty? 
            // Maybe the session IS being killed?

            // In WSS close handler:
            // if (clients.size === 0) { ... // Optional: Terminate session if no clients? }
            // It says "We still keep the process alive in TerminalManager".

            // Wait, does checking `isLocalhost` cause a `disconnect` call from frontend?
            // App.tsx: 
            // useEffect(() => { connect() }, [])
            // If unmounted? useWebSocket doesn't auto-disconnect on unmount?

            // If I switch to a non-local page:
            // Content script might stop sending messages?
            // The extension sidepanel is global for the window.
            // The sidepanel might NOT unmount if I just switch tabs?
            // But `App` causes `TerminalPanel` to unmount. 
            // `useWebSocket` hook is still running in `App`.

            // If `isLocalhost` becomes false:
            // `App` returns "Not Supported" UI. 
            // `TerminalPanel` is gone.

            // `useWebSocket` is still connected!
            // But `onTerminalOutput` logic:
            // onTerminalOutput: (data) => terminalRef.current?.write(data)

            // `terminalRef.current` is NULL because `TerminalPanel` is unmounted.
            // So any data arriving during this time is DROPPED by the frontend.

            // When I switch back:
            // `TerminalPanel` remounts. Term is empty.
            // `useWebSocket` is ALREADY connected.
            // `useEffect` -> `sendTerminalInit`.

            // WSS handles `TERMINAL_INIT`.
            // It subscribes (or re-subscribes).
            // It calls `ensureSession`.
            // It calls `getHistory`.
            // It sends history!

            // So history IS sent.
            // Why doesn't the terminal show it?

            // Maybe `terminalRef.current` is not ready when `onTerminalOutput` receives history?
            // `App.tsx`:
            // useEffect(() => { if(projectPath...) sendTerminalInit(...) }, ...)

            // `useWebSocket` receives message.
            // `onTerminalOutput` calls `terminalRef.current.write`.

            // If `sendTerminalInit` triggers immediate response, and `TerminalPanel` is just mounting...
            // `TerminalPanel` uses `useEffect([], ...)` to init xterm.
            // Ref is assigned inside `useEffect`.
            // `terminalRef` passed to `TerminalPanel` is `useRef(null)`.
            // `useImperativeHandle` populates it.

            // Race condition?
            // `TerminalPanel` mount -> `useImperativeHandle` (sync-ish but ref update might be late?) -> `useEffect`.
            // `App` useEffect -> `sendTerminalInit`.

            // The `sendTerminalInit` is in a `useEffect`.
            // `TerminalPanel` is rendered in the return.

            // React render flow:
            // 1. Render `App` (with `isLocalhost=true`).
            // 2. Render `TerminalPanel`.
            // 3. `TerminalPanel` mounts. `useImperativeHandle` runs. Ref is set?
            // 4. `App` useEffect runs. calls `sendTerminalInit`.

            // Verify `TerminalManager.ts` change first just in case:
            // Make history persistent for YOLO too.
            // Because if the session WAS terminated (e.g. error), we lose history.
            // But the user says "Switching between local pages is fine", "Switching from non-local is fail".
            // Switching between local pages -> `TerminalPanel` might stay mounted? Or re-mount very fast?

            // If I go to non-local page, `isLocalhost` is false.
            // `TerminalPanel` unmounts.
            // `App` is waiting.

            // If backend sends history, it should work.

            // Let's patch `TerminalManager` to be safe regarding YOLO history 
            // (currently it init to `[]` every time `getOrCreateSession` makes a new one, 
            // preventing persistence if session restarts).
            // But the main issue might be frontend race.

            // I will apply the TerminalManager fix first as it's definitely "wrong" to not have history for YOLO.

            if (!this.normalModeHistory.has(id)) {
                this.normalModeHistory.set(id, []);
            }
            historyArray = this.normalModeHistory.get(id)!;

            // --- Readiness Detection Logic ---
            // Markers that indicate Claude Code is interactive/ready
            // e.g. "Welcome back!", "Try", "Visual Dev", or the prompt "> " or specific control sequences
            // Markers that indicate Claude Code is interactive/ready
            // e.g. "Welcome back!", "Try", "Visual Dev", or the prompt "> " or specific control sequences
            const readyMarkers = [
                'Welcome back',
                'Visual Dev', // If we have a custom banner
                'Try "',      // Suggestion text (generic)
                'bypass permissions',
                '\u276F',     // The prompt character often used by Claude Code
                '/model to try', // Hint text often present at startup
                '> '          // Standard prompt fallback
            ];

            sessionWrapper = {
                pty: ptyProcess,
                history: historyArray,
                useYolo,
                isReady: false
            };

            // Capture output for history & readiness
            ptyProcess.onData((data) => {
                if (sessionWrapper) {
                    sessionWrapper.history.push(data);
                    if (sessionWrapper.history.length > this.MAX_HISTORY_LINES) {
                        sessionWrapper.history.shift();
                    }

                    // Check for readiness if not already ready
                    if (!sessionWrapper.isReady) {
                        // Strip ANSI codes for cleaner matching
                        // eslint-disable-next-line no-control-regex
                        const cleanData = data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

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
            } catch (e) {
                console.error('[TerminalManager] Resize error:', e);
            }
        }
    }

    terminateSession(id: string): void {
        const session = this.sessions.get(id);
        if (session) {
            const pid = session.pty.pid;

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
            return session.history.join('');
        }

        // Fallback for sessions that might have been terminated but we want to keep history?
        // With the new logic, we are storing history in `normalModeHistory` map if !useYolo?
        // Wait, I updated the creation logic to ALWAYS use `normalModeHistory`.
        // So checking `normalModeHistory` is correct.

        const history = this.normalModeHistory.get(id);
        return history ? history.join('') : '';
    }
}
