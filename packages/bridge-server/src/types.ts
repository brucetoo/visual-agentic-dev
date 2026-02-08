export interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}

export interface ClientMessage {
    type: 'AUTH' | 'EXECUTE_TASK' | 'CANCEL_TASK' | 'GET_STATUS' | 'RESOLVE_PROJECT_PATH' | 'TERMINAL_DATA' | 'TERMINAL_RESIZE' | 'TERMINAL_INIT' | 'TERMINAL_RESET';
    id: string;
    token?: string;
    payload?: ExecuteTaskPayload | ResolveProjectPathPayload | TerminalDataPayload | TerminalResizePayload;
}

export interface ExecuteTaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}

export interface ResolveProjectPathPayload {
    port: number;
}

export interface TerminalDataPayload {
    data: string;
    projectPath?: string;
    useYolo?: boolean;
}

export interface TerminalResizePayload {
    cols: number;
    rows: number;
}

export type ServerMessage =
    | { type: 'AUTH_RESULT'; id: string; payload?: any }
    | { type: 'TASK_STARTED'; id: string; payload?: any; projectPath?: string }
    | { type: 'TASK_PROGRESS'; id: string; payload?: any; projectPath?: string }
    | { type: 'TASK_LOG'; id: string; payload?: any; projectPath?: string }
    | { type: 'TASK_COMPLETED'; id: string; payload?: any; projectPath?: string }
    | { type: 'TASK_ERROR'; id: string; payload?: any; projectPath?: string }
    | { type: 'PROJECT_PATH_RESOLVED'; id: string; payload?: any }
    | { type: 'TERMINAL_OUTPUT'; id: string; payload: { data: string } }
    | { type: 'TERMINAL_READY'; id: string; payload: { sessionId: string } };

// Claude CLI stream-json output format
export interface StreamMessage {
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

export interface ExecuteResult {
    success: boolean;
    filesModified: string[];
    messages: StreamMessage[];
}
