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

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TaskPayload {
    source: SourceLocation;
    instruction: string;
    projectPath: string;
}

export interface ResolveProjectPathPayload {
    port: number;
}
