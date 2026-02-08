export interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}

export interface ElementInfo {
    tagName: string;
    className: string;
    textContent: string;
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

// Task execution
export interface TaskMessage {
    type: 'TASK_STARTED' | 'TASK_PROGRESS' | 'TASK_COMPLETED' | 'TASK_ERROR' | 'TASK_LOG';
    id: string;
    payload: any; // Flexible payload based on type
    projectPath?: string; // Optional project path for filtering
}

export interface SelectedElement {
    source: SourceLocation;
    elementInfo: ElementInfo;
    timestamp: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}

export interface ResolveProjectPathPayload {
    port: number;
}
