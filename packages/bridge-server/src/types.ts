export interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}

export interface ClientMessage {
    type: 'AUTH' | 'EXECUTE_TASK' | 'CANCEL_TASK' | 'GET_STATUS' | 'RESOLVE_PROJECT_PATH';
    id: string;
    token?: string;
    payload?: ExecuteTaskPayload | ResolveProjectPathPayload;
}

export interface ExecuteTaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}

export interface ResolveProjectPathPayload {
    port: number;
}

export interface ServerMessage {
    type: 'AUTH_RESULT' | 'TASK_STARTED' | 'TASK_PROGRESS' | 'TASK_LOG' | 'TASK_COMPLETED' | 'TASK_ERROR' | 'PROJECT_PATH_RESOLVED';
    id: string;
    payload?: unknown;
}

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
