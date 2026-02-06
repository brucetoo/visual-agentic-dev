import type { SourceLocation } from '../types';

/**
 * Get React Fiber node from DOM element
 * React attaches fiber information to DOM elements with internal keys
 */
function getReactFiber(element: HTMLElement): any {
    const key = Object.keys(element).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    return key ? (element as any)[key] : null;
}

/**
 * Walk up the fiber tree to find a fiber with _debugSource
 */
function findFiberWithSource(fiber: any): any {
    let current = fiber;
    while (current) {
        if (current._debugSource) {
            return current;
        }
        current = current.return;
    }
    return null;
}

/**
 * Get source from React Fiber's _debugSource (runtime detection)
 * This is the preferred method as it doesn't require any build plugin
 */
export function getSourceFromFiber(element: HTMLElement): SourceLocation | null {
    const fiber = getReactFiber(element);
    if (!fiber) return null;

    const fiberWithSource = findFiberWithSource(fiber);
    if (fiberWithSource?._debugSource) {
        const { fileName, lineNumber, columnNumber } = fiberWithSource._debugSource;
        return {
            fileName,
            lineNumber,
            columnNumber: columnNumber || 1
        };
    }
    return null;
}

/**
 * Parse the data-vdev-source attribute value into a SourceLocation object
 * (Legacy support for projects using the babel/vite plugin)
 */
export function parseSourceAttr(attrValue: string | null): SourceLocation | null {
    if (!attrValue) return null;

    try {
        const parsed = JSON.parse(attrValue);
        if (
            typeof parsed.fileName === 'string' &&
            typeof parsed.lineNumber === 'number' &&
            typeof parsed.columnNumber === 'number'
        ) {
            return parsed as SourceLocation;
        }
    } catch {
        // Ignore parse errors
    }

    return null;
}

/**
 * Find the closest element with source information
 * First tries React Fiber (runtime), then falls back to data attributes
 */
export function findSourceElement(target: HTMLElement, prefix = 'vdev'): HTMLElement | null {
    // First, try to find source from React Fiber (runtime)
    let current: HTMLElement | null = target;
    while (current && current !== document.body) {
        if (getSourceFromFiber(current)) {
            return current;
        }
        current = current.parentElement;
    }

    // Fallback: check for data attributes (legacy plugin support)
    return target.closest(`[data-${prefix}-file], [data-${prefix}-source]`) as HTMLElement | null;
}

/**
 * Get source location from an element
 * Prioritizes React Fiber _debugSource, falls back to data attributes
 */
export function getSourceFromElement(element: HTMLElement, prefix = 'vdev'): SourceLocation | null {
    // 1. Try React Fiber _debugSource first (runtime, no plugin needed)
    const fiberSource = getSourceFromFiber(element);
    if (fiberSource) {
        return fiberSource;
    }

    // 2. Try new data attribute format (plugin-based)
    const fileName = element.getAttribute(`data-${prefix}-file`);
    const lineStr = element.getAttribute(`data-${prefix}-line`);
    const colStr = element.getAttribute(`data-${prefix}-col`);

    if (fileName && lineStr) {
        return {
            fileName,
            lineNumber: parseInt(lineStr, 10),
            columnNumber: colStr ? parseInt(colStr, 10) : 1
        };
    }

    // 3. Fallback to legacy format (JSON in single attribute)
    const attrValue = element.getAttribute(`data-${prefix}-source`);
    return parseSourceAttr(attrValue);
}

