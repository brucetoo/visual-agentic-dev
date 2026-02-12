import { SourceLocation } from '../types';

/**
 * Source Location Detection Utilities
 * Reference implementation based on:
 * https://github.com/benjitaylor/agentation/blob/main/package/src/utils/source-location.ts
 */

/**
 * React Fiber node structure (partial)
 */
interface ReactFiber {
    _debugSource?: {
        fileName: string;
        lineNumber: number;
        columnNumber?: number;
    };
    _debugOwner?: ReactFiber;
    _debugInfo?: any; // React 19 specific
    type?: {
        displayName?: string;
        name?: string;
    } | string | any;
    tag?: number;
    return?: ReactFiber | null;
    memoizedProps?: Record<string, any>;
    pendingProps?: Record<string, any>;
}

/**
 * Gets the React fiber node associated with a DOM element
 */
function getFiberFromElement(element: HTMLElement): ReactFiber | null {
    if (!element || typeof element !== "object") {
        return null;
    }

    const keys = Object.keys(element);

    // React 18+ uses __reactFiber$ prefix
    const fiberKey = keys.find((key) => key.startsWith("__reactFiber$"));
    if (fiberKey) {
        return (element as any)[fiberKey];
    }

    // React 16-17 uses __reactInternalInstance$ prefix
    const instanceKey = keys.find((key) => key.startsWith("__reactInternalInstance$"));
    if (instanceKey) {
        return (element as any)[instanceKey];
    }

    // React 19 may use different patterns - check for any fiber-like object
    // that contains _debugSource, or looks like a fiber
    const possibleFiberKey = keys.find((key) => {
        if (!key.startsWith("__react")) return false;
        // Avoid known non-fiber keys
        if (key.startsWith("__reactContainer") || key.startsWith("__reactProps") || key.startsWith("__reactEvents")) return false;

        const value = (element as any)[key];
        return value && typeof value === "object" &&
            ("_debugSource" in value || "tag" in value || "return" in value);
    });

    if (possibleFiberKey) {
        return (element as any)[possibleFiberKey];
    }

    return null;
}

/**
 * Gets the display name of a React component from its fiber
 */
function getComponentName(fiber: ReactFiber): string | null {
    if (!fiber.type) return null;
    if (typeof fiber.type === "string") return null;

    if (typeof fiber.type === "object" || typeof fiber.type === "function") {
        return fiber.type.displayName || fiber.type.name || null;
    }
    return null;
}

/**
 * Walks up the fiber tree to find the nearest component with _debugSource
 * (Standard React 16-18)
 */
function findDebugSource(fiber: ReactFiber, maxDepth = 50): { source: NonNullable<ReactFiber["_debugSource"]>; componentName: string | null } | null {
    let current: ReactFiber | null | undefined = fiber;
    let depth = 0;

    while (current && depth < maxDepth) {
        if (current._debugSource) {
            return {
                source: current._debugSource,
                componentName: getComponentName(current),
            };
        }

        if (current._debugOwner?._debugSource) {
            return {
                source: current._debugOwner._debugSource,
                componentName: getComponentName(current._debugOwner),
            };
        }

        current = current.return;
        depth++;
    }

    return null;
}

/**
 * Attempts to find source location using React 19's potentially different structure
 * or alternative build tool injections
 */
function findDebugSourceReact19(fiber: ReactFiber): { source: NonNullable<ReactFiber["_debugSource"]>; componentName: string | null } | null {
    let current: ReactFiber | null | undefined = fiber;
    let depth = 0;
    const maxDepth = 50;

    while (current && depth < maxDepth) {
        const anyFiber = current as any;

        // 1. Check for valid keys on the fiber itself
        const possibleSourceKeys = ["_debugSource", "__source", "_source", "debugSource", "_debugInfo"];
        for (const key of possibleSourceKeys) {
            const source = anyFiber[key];
            if (source) {
                // Handle standard object with fileName
                if (typeof source === "object" && typeof source.fileName === 'string') {
                    return {
                        source: source,
                        componentName: getComponentName(current),
                    };
                }
                // Handle React 19 _debugInfo array
                if (Array.isArray(source)) {
                    for (const info of source) {
                        if (info && typeof info.fileName === 'string') {
                            return {
                                source: info,
                                componentName: getComponentName(current)
                            };
                        }
                    }
                }
            }
        }

        // 2. Check memoizedProps/pendingProps for injected __source
        const props = current.memoizedProps || current.pendingProps;
        if (props && typeof props === 'object') {
            if (props.__source && typeof props.__source === 'object' && props.__source.fileName) {
                return {
                    source: props.__source as any,
                    componentName: getComponentName(current)
                };
            }
        }

        current = current.return;
        depth++;
    }

    return null;
}
/**
 * Parse a source location from a data attribute value
 */
export function parseSourceAttr(attrValue: string | null): SourceLocation | null {
    if (!attrValue) return null;
    try {
        // Try parsing JSON first
        if (attrValue.startsWith('{')) {
            const parsed = JSON.parse(attrValue);
            if (parsed.fileName && typeof parsed.lineNumber === 'number') {
                return parsed as SourceLocation;
            }
        }
    } catch { }
    return null;
}

/**
 * Main function to get source location from an element
 * Combines Fiber inspection and data attribute fallbacks
 */
export function getSourceFromElement(element: HTMLElement, prefix = 'vdev'): SourceLocation | null {
    // 1. Try Data attributes FIRST (High precision build-time info)
    const file = element.getAttribute(`data-${prefix}-file`);
    const line = element.getAttribute(`data-${prefix}-line`);
    const col = element.getAttribute(`data-${prefix}-col`);

    if (file && line) {
        return {
            fileName: file,
            lineNumber: parseInt(line, 10),
            columnNumber: col ? parseInt(col, 10) : 1,
            componentName: element.tagName.toLowerCase()
        };
    }

    // 2. Fallback: React Fiber (Runtime info)
    const fiber = getFiberFromElement(element);
    if (fiber) {
        // Try standard strategy
        let result = findDebugSource(fiber);

        // Try React 19 strategy if standard failed
        if (!result) {
            result = findDebugSourceReact19(fiber);
        }

        if (result) {
            return {
                fileName: result.source.fileName,
                lineNumber: result.source.lineNumber,
                columnNumber: result.source.columnNumber || 1,
                componentName: result.componentName || undefined
            };
        }
    }

    return null;
}

/**
 * Find the closest element with source information
 */
export function findSourceElement(target: HTMLElement, prefix = 'vdev'): HTMLElement | null {
    let current: HTMLElement | null = target;

    while (current && current !== document.body) {
        if (getSourceFromElement(current, prefix)) {
            return current;
        }
        current = current.parentElement;
    }

    return null;
}
