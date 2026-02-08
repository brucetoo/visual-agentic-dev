import React, { useRef, useEffect, useState } from 'react';
import { TerminalPanel, TerminalPanelHandle } from './TerminalPanel';
import { useWebSocket } from '../hooks/useWebSocket';

interface ProjectTerminalProps {
    projectPath: string;
    isActive: boolean;
    useYolo: boolean;
}

export const ProjectTerminal: React.FC<ProjectTerminalProps> = ({
    projectPath,
    isActive,
    useYolo
}) => {
    const terminalRef = useRef<TerminalPanelHandle>(null);
    const [isTerminalReady, setIsTerminalReady] = useState(false);

    // Each project terminal has ITS OWN WebSocket connection
    const {
        status,
        connect,
        sendTerminalData,
        sendTerminalInit,
        sendTerminalResize,
        sendTerminalReset
    } = useWebSocket({
        projectPath, // Bind strict 1:1 project path
        onTerminalOutput: (data) => {
            terminalRef.current?.write(data);
            // Removed premature ready check. We wait for TERMINAL_READY event.
        },
        onTerminalReady: () => {
            console.log(`[ProjectTerminal] Received TERMINAL_READY for ${projectPath}`);
            setIsTerminalReady(true);
        }
    });

    // Auto-connect on mount
    useEffect(() => {
        connect();
        // No disconnect on unmount? 
        // We WANT to keep it alive if we are just hiding it?
        // Actually, if this component is unmounted (e.g. user closes tab or we clear cache), 
        // useWebSocket's cleanup will disconnect.
        // But in App.tsx we will keep this rendered but hidden.
    }, [connect]);

    // Initialize terminal when connected
    useEffect(() => {
        if (status === 'connected') {
            setIsTerminalReady(false); // Reset readiness on init/reconnect
            // Initialize the PTY on the server
            // Note: server will attach listener if not already attached
            sendTerminalInit(projectPath, useYolo);
        }
    }, [status, projectPath, useYolo, sendTerminalInit]);

    // Handle Resize - only if active? 
    // Or we should allow resize even if hidden? 
    // xterm-addon-fit might need visibility to calculate size.
    // So we primarily rely on the parent (active) to trigger resize events via TerminalPanel's ResizeObserver.
    // But if we are hidden, ResizeObserver might not trigger or trigger 0x0.
    // We should probably ONLY send resize if we are active/visible.

    return (
        <div
            style={{
                // Use height: 0 + overflow: hidden for hiding.
                // This keeps the terminal connected to the DOM flow better than absolute positioning.
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                ...(isActive ? {
                    // Active state: take full space
                    flex: 1,
                    height: '100%',
                    opacity: 1,
                    pointerEvents: 'auto',
                } : {
                    // Inactive state: collapse to zero height
                    flex: '0 0 0',
                    height: 0,
                    opacity: 0,
                    pointerEvents: 'none',
                })
            }}
        >
            <div className="terminal-header" style={{ background: isActive ? '#252526' : '#1e1e1e' }}>
                <span>Terminal ({projectPath.split('/').pop()})</span>
                <span className={`status-tag ${status}`}>{status}</span>
            </div>
            <TerminalPanel
                ref={terminalRef}
                onBinaryData={(data) => sendTerminalData(data, projectPath, useYolo)}
                onResize={(cols, rows) => {
                    // Only send resize if we are actually visible/active to avoid zero-size issues
                    if (isActive) {
                        sendTerminalResize(cols, rows, projectPath);
                    }
                }}
                isReady={isTerminalReady}
                isActive={isActive}
            />
        </div>
    );
};
