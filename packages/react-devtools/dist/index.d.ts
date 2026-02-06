import React, { ReactNode } from 'react';

interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}
interface ElementInfo {
    tagName: string;
    className: string;
    textContent: string;
}
interface VDevMessage {
    type: string;
    source?: string;
    payload?: unknown;
}
interface ElementSelectedPayload {
    source: SourceLocation;
    elementInfo: ElementInfo;
}

interface DevToolsContextValue {
    isInspecting: boolean;
    setInspecting: (v: boolean) => void;
    selectedElement: HTMLElement | null;
    selectedSource: SourceLocation | null;
    clearSelection: () => void;
}
declare const useDevTools: () => DevToolsContextValue;
interface DevToolsProviderProps {
    children: ReactNode;
    /** Only enable in development mode (default: true) */
    enabled?: boolean;
    /** Attribute prefix (default: 'vdev') */
    prefix?: string;
}
declare const DevToolsProvider: React.FC<DevToolsProviderProps>;

interface Props$1 {
    element: HTMLElement;
    color?: string;
}
/**
 * Highlighter overlay component - shows a blue overlay on hovered elements
 */
declare const Highlighter: React.FC<Props$1>;

interface Props {
    element: HTMLElement;
    prefix?: string;
}
/**
 * SelectionBox component - shows a persistent selection box with source info label
 */
declare const SelectionBox: React.FC<Props>;

/**
 * Parse the data-vdev-source attribute value into a SourceLocation object
 * (Legacy support for projects using the babel/vite plugin)
 */
declare function parseSourceAttr(attrValue: string | null): SourceLocation | null;
/**
 * Find the closest element with source information
 * First tries React Fiber (runtime), then falls back to data attributes
 */
declare function findSourceElement(target: HTMLElement, prefix?: string): HTMLElement | null;
/**
 * Get source location from an element
 * Prioritizes React Fiber _debugSource, falls back to data attributes
 */
declare function getSourceFromElement(element: HTMLElement, prefix?: string): SourceLocation | null;

/**
 * Send a message to the Chrome extension via window.postMessage
 */
declare function sendToExtension(message: VDevMessage): void;
/**
 * Notify extension that SDK is ready
 */
declare function notifyReady(): void;
/**
 * Create a message handler that only processes messages from the extension
 */
declare function createMessageHandler(handler: (message: VDevMessage) => void): (event: MessageEvent) => void;

export { DevToolsProvider, type ElementInfo, type ElementSelectedPayload, Highlighter, SelectionBox, type SourceLocation, type VDevMessage, createMessageHandler, findSourceElement, getSourceFromElement, notifyReady, parseSourceAttr, sendToExtension, useDevTools };
