import React, { useEffect, useState } from 'react';
import type { SourceLocation } from '../types';
import { getSourceFromElement } from '../utils/sourceLocator';

interface Props {
    element: HTMLElement;
    prefix?: string;
}

/**
 * SelectionBox component - shows a persistent selection box with source info label
 */
export const SelectionBox: React.FC<Props> = ({ element, prefix = 'vdev' }) => {
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [source, setSource] = useState<SourceLocation | null>(null);

    useEffect(() => {
        const update = () => setRect(element.getBoundingClientRect());
        update();

        // Get source info
        setSource(getSourceFromElement(element, prefix));

        const observer = new ResizeObserver(update);
        observer.observe(element);

        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [element, prefix]);

    if (!rect) return null;

    // Format file path for display (show only basename)
    const fileName = source?.fileName.split('/').pop() || 'unknown';
    const lineInfo = source ? `${fileName}:${source.lineNumber}` : '';

    return (
        <>
            {/* Selection border */}
            <div
                style={{
                    position: 'fixed',
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    border: '2px solid #6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 999999,
                    boxSizing: 'border-box',
                }}
                data-vdev-overlay="selection"
            />

            {/* Label showing file:line */}
            {lineInfo && (
                <div
                    style={{
                        position: 'fixed',
                        top: Math.max(0, rect.top - 24),
                        left: rect.left,
                        backgroundColor: '#6366f1',
                        color: 'white',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        pointerEvents: 'none',
                        zIndex: 999999,
                        whiteSpace: 'nowrap',
                    }}
                    data-vdev-overlay="label"
                >
                    {lineInfo}
                </div>
            )}
        </>
    );
};
