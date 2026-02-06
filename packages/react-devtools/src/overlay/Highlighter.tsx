import React, { useEffect, useState } from 'react';

interface Props {
    element: HTMLElement;
    color?: string;
}

/**
 * Highlighter overlay component - shows a blue overlay on hovered elements
 */
export const Highlighter: React.FC<Props> = ({
    element,
    color = 'rgba(66, 153, 225, 0.3)'
}) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const update = () => setRect(element.getBoundingClientRect());
        update();

        const observer = new ResizeObserver(update);
        observer.observe(element);

        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [element]);

    if (!rect) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                backgroundColor: color,
                border: '2px solid #4299e1',
                pointerEvents: 'none',
                zIndex: 999999,
                transition: 'all 0.1s ease',
                boxSizing: 'border-box',
            }}
            data-vdev-overlay="highlighter"
        />
    );
};
