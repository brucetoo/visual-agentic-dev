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

export interface VDevMessage {
    type: string;
    source?: string;
    payload?: unknown;
}

export interface ElementSelectedPayload {
    source: SourceLocation;
    elementInfo: ElementInfo;
}
