import type { SourceLocation } from '../types';

/**
 * Parse the data-vdev-source attribute value into a SourceLocation object
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
        // console.warn('[VDev] Failed to parse source attribute:', attrValue);
    }

    return null;
}

/**
 * Find the closest element with source information
 */
export function findSourceElement(target: HTMLElement, prefix = 'vdev'): HTMLElement | null {
    // Check for new format first, then legacy format
    return target.closest(`[data-${prefix}-file], [data-${prefix}-source]`) as HTMLElement | null;
}

/**
 * Get source location from an element
 */
export function getSourceFromElement(element: HTMLElement, prefix = 'vdev'): SourceLocation | null {
    // Try new format first (separate attributes)
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

    // Fallback to legacy format (JSON in single attribute)
    const attrValue = element.getAttribute(`data-${prefix}-source`);
    return parseSourceAttr(attrValue);
}
