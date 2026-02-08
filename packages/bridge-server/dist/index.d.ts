/**
 * WebSocket server that bridges browser extension to Claude Code CLI
 * No authentication required - for local development use only
 */
declare class VDevWebSocketServer {
    private wss;
    private terminalManager;
    private sessionClients;
    constructor(port?: number);
    private getSessionId;
    private handleConnection;
    private activePtys;
    private ensureSession;
    private subscribeToSession;
    private broadcastToSession;
    private handleTerminalInit;
    private handleExecuteTask;
    private handleResolveProjectPath;
    private handleTerminalData;
    private handleTerminalResize;
    private handleTerminalReset;
    private send;
    close(): void;
}

interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}
interface ClientMessage {
    type: 'AUTH' | 'EXECUTE_TASK' | 'CANCEL_TASK' | 'GET_STATUS' | 'RESOLVE_PROJECT_PATH' | 'TERMINAL_DATA' | 'TERMINAL_RESIZE' | 'TERMINAL_INIT' | 'TERMINAL_RESET';
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

export { type ClientMessage, type ExecuteResult, type ExecuteTaskPayload, PromptBuilder, type ResolveProjectPathPayload, type ServerMessage, type ServerOptions, type SourceLocation, type StreamMessage, type TerminalDataPayload, type TerminalResizePayload, VDevWebSocketServer, startServer };
