export interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}

export interface ClientMessage {
    type: 'AUTH' | 'EXECUTE_TASK' | 'CANCEL_TASK' | 'GET_STATUS';
    id: string;
    token?: string;
    payload?: ExecuteTaskPayload;
}

export interface ExecuteTaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}

export interface ServerMessage {
    type: 'AUTH_RESULT' | 'TASK_STARTED' | 'TASK_PROGRESS' | 'TASK_LOG' | 'TASK_COMPLETED' | 'TASK_ERROR';
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
