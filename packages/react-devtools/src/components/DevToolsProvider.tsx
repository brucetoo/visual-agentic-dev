import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode
} from 'react';
import { Highlighter } from '../overlay/Highlighter';
import { SelectionBox } from '../overlay/SelectionBox';
import { getSourceFromElement, findSourceElement } from '../utils/sourceLocator';
import { sendToExtension, createMessageHandler, notifyReady } from '../utils/messaging';
import type { SourceLocation, VDevMessage } from '../types';

interface DevToolsContextValue {
    isInspecting: boolean;
    setInspecting: (v: boolean) => void;
    selectedElement: HTMLElement | null;
    selectedSource: SourceLocation | null;
    clearSelection: () => void;
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

export const useDevTools = () => {
    const context = useContext(DevToolsContext);
    if (!context) {
        throw new Error('useDevTools must be used within a DevToolsProvider');
    }
    return context;
};

interface DevToolsProviderProps {
    children: ReactNode;
    /** Only enable in development mode (default: true) */
    enabled?: boolean;
    /** Attribute prefix (default: 'vdev') */
    prefix?: string;
}

export const DevToolsProvider: React.FC<DevToolsProviderProps> = ({
    children,
    enabled = true,
    prefix = 'vdev'
}) => {
    const [isInspecting, setInspecting] = useState(false);
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
    const [selectedSource, setSelectedSource] = useState<SourceLocation | null>(null);

    const clearSelection = useCallback(() => {
        setSelectedElement(null);
        setSelectedSource(null);
    }, []);

    // Listen to messages from extension
    useEffect(() => {
        if (!enabled) return;

        const handler = createMessageHandler((message: VDevMessage) => {
            console.log('[DevTools] Received message:', message);
            if (message.type === 'VDEV_START_INSPECT') {
                console.log('[DevTools] Starting inspection');
                setInspecting(true);
                clearSelection();
            } else if (message.type === 'VDEV_STOP_INSPECT') {
                console.log('[DevTools] Stopping inspection');
                setInspecting(false);
                setHoveredElement(null);
            } else if (message.type === 'VDEV_TOGGLE_INSPECT') {
                console.log('[DevTools] Toggling inspection');
                setInspecting(prev => {
                    const newState = !prev;
                    if (newState) {
                        // Starting inspection, clear selection
                        clearSelection();
                    } else {
                        // Stopping inspection, clear hovered
                        setHoveredElement(null);
                    }
                    // Notify extension of state change
                    sendToExtension({
                        type: 'VDEV_INSPECT_STATE_CHANGED',
                        payload: { isInspecting: newState }
                    });
                    return newState;
                });
            } else if (message.type === 'VDEV_CLEAR_SELECTION') {
                clearSelection();
            }
        });

        window.addEventListener('message', handler);

        // Notify extension that SDK is ready
        notifyReady();
        console.log('[DevTools] SDK Ready, listening for messages');

        return () => window.removeEventListener('message', handler);
    }, [enabled, clearSelection]);

    // Handle mouse events in inspect mode
    useEffect(() => {
        if (!isInspecting || !enabled) return;

        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Ignore our own overlay elements
            if (target.hasAttribute('data-vdev-overlay')) return;

            const sourceElement = findSourceElement(target, prefix);
            // console.log('[DevTools] Mouse move', target, sourceElement);

            if (sourceElement && sourceElement !== hoveredElement) {
                console.log('[DevTools] Hovered element found:', sourceElement);
                setHoveredElement(sourceElement);
            }
        };

        const handleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target as HTMLElement;

            // Ignore clicks on overlay
            if (target.hasAttribute('data-vdev-overlay')) return;

            const sourceElement = findSourceElement(target, prefix);

            if (sourceElement) {
                const source = getSourceFromElement(sourceElement, prefix);
                setSelectedElement(sourceElement);
                setSelectedSource(source);
                setInspecting(false);
                setHoveredElement(null);

                // Notify extension of selection
                sendToExtension({
                    type: 'VDEV_ELEMENT_SELECTED',
                    payload: {
                        source,
                        elementInfo: {
                            tagName: sourceElement.tagName.toLowerCase(),
                            className: sourceElement.className,
                            textContent: sourceElement.textContent?.slice(0, 100) || '',
                        },
                    },
                });
            }
        };

        // Use capture to intercept before normal handlers
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);

        // Add cursor style
        document.body.style.cursor = 'crosshair';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('click', handleClick, true);
            document.body.style.cursor = '';
        };
    }, [isInspecting, enabled, hoveredElement, prefix]);

    // Don't render anything if disabled
    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <DevToolsContext.Provider
            value={{
                isInspecting,
                setInspecting,
                selectedElement,
                selectedSource,
                clearSelection
            }}
        >
            {children}

            {/* Hover highlighter */}
            {isInspecting && hoveredElement && (
                <Highlighter element={hoveredElement} />
            )}

            {/* Selection box */}
            {selectedElement && (
                <SelectionBox element={selectedElement} prefix={prefix} />
            )}
        </DevToolsContext.Provider>
    );
};
