import * as pty from 'node-pty';

/**
 * WebSocket server that bridges browser extension to Claude Code CLI
 * No authentication required - for local development use only
 */
declare class VDevWebSocketServer {
    private wss;
    private runners;
    private terminalManager;
    private sessionClients;
    private attachedSessions;
    constructor(port?: number);
    private getSessionId;
    private handleConnection;
    private activePtys;
    private ensureSession;
    private subscribeToSession;
    private broadcastToSession;
    private handleTerminalInit;
    private handleExecuteTask;
    private handleCancelTask;
    private handleGetStatus;
    private handleResolveProjectPath;
    private handleTerminalData;
    private handleTerminalResize;
    private handleTerminalReset;
    private send;
    close(): void;
}

declare class TerminalManager {
    private sessions;
    private normalModeHistory;
    private readonly MAX_HISTORY_LINES;
    private _onReady;
    onReady(callback: (sessionId: string) => void): void;
    clearHistory(id: string): void;
    isSessionReady(id: string): boolean;
    getOrCreateSession(id: string, cwd: string, useYolo?: boolean): Promise<pty.IPty>;
    sendData(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    terminateSession(id: string): void;
    getHistory(id: string): string;
}

interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}
interface ClientMessage {
    type: 'AUTH' | 'EXECUTE_TASK' | 'CANCEL_TASK' | 'GET_STATUS' | 'RESOLVE_PROJECT_PATH' | 'TERMINAL_DATA' | 'TERMINAL_RESIZE';
    id: string;
    token?: string;
    payload?: ExecuteTaskPayload | ResolveProjectPathPayload | TerminalDataPayload | TerminalResizePayload;
}
interface ExecuteTaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}
interface ResolveProjectPathPayload {
    port: number;
}
interface TerminalDataPayload {
    data: string;
    projectPath?: string;
    useYolo?: boolean;
}
interface TerminalResizePayload {
    cols: number;
    rows: number;
}
type ServerMessage = {
    type: 'AUTH_RESULT';
    id: string;
    payload?: any;
} | {
    type: 'TASK_STARTED';
    id: string;
    payload?: any;
    projectPath?: string;
} | {
    type: 'TASK_PROGRESS';
    id: string;
    payload?: any;
    projectPath?: string;
} | {
    type: 'TASK_LOG';
    id: string;
    payload?: any;
    projectPath?: string;
} | {
    type: 'TASK_COMPLETED';
    id: string;
    payload?: any;
    projectPath?: string;
} | {
    type: 'TASK_ERROR';
    id: string;
    payload?: any;
    projectPath?: string;
} | {
    type: 'PROJECT_PATH_RESOLVED';
    id: string;
    payload?: any;
} | {
    type: 'TERMINAL_OUTPUT';
    id: string;
    payload: {
        data: string;
    };
} | {
    type: 'TERMINAL_READY';
    id: string;
    payload: {
        sessionId: string;
    };
};
interface StreamMessage {
    type: 'assistant' | 'user' | 'system' | 'result';
    message?: {
        content: Array<{
            type: 'text' | 'tool_use' | 'tool_result';
            text?: string;
            name?: string;
            input?: Record<string, unknown>;
        }>;
    };
    result?: {
        success: boolean;
    };
}
interface ExecuteResult {
    success: boolean;
    filesModified: string[];
    messages: StreamMessage[];
}

interface ExecuteOptions {
    projectPath: string;
    source: SourceLocation;
    instruction: string;
    onLog?: (log: string) => void;
    terminalManager: TerminalManager;
    sessionId: string;
}
/**
 * Executes Claude Code CLI via the internal TerminalManager (node-pty)
 */
declare class ClaudeCodeRunner {
    execute(options: ExecuteOptions): Promise<ExecuteResult>;
    cancel(): void;
    isRunning(): boolean;
}

interface BuildOptions {
    source: SourceLocation;
    instruction: string;
}
/**
 * Builds prompts for Claude Code CLI
 */
declare class PromptBuilder {
    static build(options: BuildOptions): string;
}

interface ServerOptions {
    port?: number;
}
/**
 * Start the Visual Dev Bridge Server
 */
declare function startServer(options?: ServerOptions): VDevWebSocketServer;

export { ClaudeCodeRunner, type ClientMessage, type ExecuteResult, type ExecuteTaskPayload, PromptBuilder, type ResolveProjectPathPayload, type ServerMessage, type ServerOptions, type SourceLocation, type StreamMessage, type TerminalDataPayload, type TerminalResizePayload, VDevWebSocketServer, startServer };
