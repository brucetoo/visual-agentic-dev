/**
 * WebSocket server that bridges browser extension to Claude Code CLI
 * No authentication required - for local development use only
 */
declare class VDevWebSocketServer {
    private wss;
    private runners;
    constructor(port?: number);
    private handleConnection;
    private handleExecuteTask;
    private handleCancelTask;
    private handleGetStatus;
    private send;
    close(): void;
}

interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}
interface ClientMessage {
    type: 'AUTH' | 'EXECUTE_TASK' | 'CANCEL_TASK' | 'GET_STATUS';
    id: string;
    token?: string;
    payload?: ExecuteTaskPayload;
}
interface ExecuteTaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}
interface ServerMessage {
    type: 'AUTH_RESULT' | 'TASK_STARTED' | 'TASK_PROGRESS' | 'TASK_LOG' | 'TASK_COMPLETED' | 'TASK_ERROR';
    id: string;
    payload?: unknown;
}
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
}
/**
 * Executes Claude Code CLI via interactive iTerm session
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

export { ClaudeCodeRunner, type ClientMessage, type ExecuteResult, type ExecuteTaskPayload, PromptBuilder, type ServerMessage, type ServerOptions, type SourceLocation, type StreamMessage, VDevWebSocketServer, startServer };
