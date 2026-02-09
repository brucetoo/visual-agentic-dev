import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TerminalPanel, TerminalPanelHandle } from './TerminalPanel';
import { useWebSocket } from '../hooks/useWebSocket';

import { ConnectionStatus } from '../../shared/types';

interface ProjectTerminalProps {
    projectPath: string;
    isActive: boolean;
    useYolo: boolean;
    globalStatus?: ConnectionStatus; // Passed from App
}

export const ProjectTerminal: React.FC<ProjectTerminalProps> = ({
    projectPath,
    isActive,
    useYolo,
    globalStatus
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
        console.log(`[ProjectTerminal] Mount connect for ${projectPath}`);
        connect();
        // No disconnect on unmount? 
        // We WANT to keep it alive if we are just hiding it?
        // Actually, if this component is unmounted (e.g. user closes tab or we clear cache), 
        // useWebSocket's cleanup will disconnect.
        // But in App.tsx we will keep this rendered but hidden.
    }, [connect, projectPath]);

    // Sync with global status: If global becomes connected and we are disconnected, try connecting
    useEffect(() => {
        if (globalStatus === 'connected' && status === 'disconnected') {
            console.log(`[ProjectTerminal] Global is connected but local is disconnected. Retrying connect for ${projectPath}...`);
            connect();
        }
    }, [globalStatus, status, connect, projectPath]);

    // Initialize terminal when connected
    useEffect(() => {
        if (status === 'connected') {
            terminalRef.current?.clear(); // Clear display first
            console.log(`[ProjectTerminal] Connected! Initializing terminal for ${projectPath}`);
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
                onResize={useCallback((cols: number, rows: number) => {
                    // Only send resize if we are actually visible/active to avoid zero-size issues
                    if (isActive) {
                        sendTerminalResize(cols, rows, projectPath);
                    }
                }, [isActive, sendTerminalResize, projectPath])}
                isReady={isTerminalReady}
                isActive={isActive}
            />
        </div>
    );
};
