import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export interface TerminalPanelHandle {
    write: (data: string) => void;
    clear: () => void;
}

interface TerminalPanelProps {
    onBinaryData: (data: string) => void;
    onResize: (cols: number, rows: number) => void;
    isReady: boolean;
    isActive?: boolean;
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(
    ({ onBinaryData, onResize, isReady, isActive = true }, ref) => {
        const terminalRef = useRef<HTMLDivElement>(null);
        const xtermRef = useRef<Terminal | null>(null);
        const fitAddonRef = useRef<FitAddon | null>(null);

        // Throttling refs
        const lastResizeTimeRef = useRef<number>(0);
        const resizeTimeoutRef = useRef<any>(null);

        useImperativeHandle(ref, () => ({
            write: (data: string) => {
                xtermRef.current?.write(data);
            },
            clear: () => {
                xtermRef.current?.clear();
            },
        }));

        // Keep onBinaryData fresh in a ref to avoid stale closures in the xterm callback
        const onBinaryDataRef = useRef(onBinaryData);
        useEffect(() => {
            onBinaryDataRef.current = onBinaryData;
        }, [onBinaryData]);

        // Initialize xterm only once
        useEffect(() => {
            if (!terminalRef.current) return;

            const term = new Terminal({
                cursorBlink: true,
                fontSize: 12,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: '#1a1a1a',
                    foreground: '#efefef',
                    cursor: '#ffffff',
                },
                convertEol: true,
                allowProposedApi: true,
            });

            // ... (rest of init)

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);

            xtermRef.current = term;
            fitAddonRef.current = fitAddon;

            term.open(terminalRef.current);

            term.onData((data: string) => {
                console.log('[TerminalPanel] Input data received:', JSON.stringify(data));
                onBinaryDataRef.current(data);
            });

            // term.onResize removed to prevent duplicate/undebounced calls.
            // onResize prop is now called debounced inside handleFit.

            return () => {
                term.dispose();
            };
        }, []);

        // Handle Fit and Focus when active/resized
        useEffect(() => {
            if (!terminalRef.current || !xtermRef.current || !fitAddonRef.current) return;


            const handleFit = () => {
                if (isActive && terminalRef.current && xtermRef.current && fitAddonRef.current) {
                    const width = terminalRef.current.clientWidth;
                    const height = terminalRef.current.clientHeight;

                    if (width > 0 && height > 0) {
                        try {
                            // 1. Immediate Frontend Resize (Visual Fluidity)
                            fitAddonRef.current.fit();
                            const { cols, rows } = xtermRef.current;

                            // 2. Throttled Backend Notification (Data Consistnecy)
                            // We want to send updates *during* drag, not just after.
                            const now = Date.now();
                            const timeSinceLast = now - lastResizeTimeRef.current;
                            const THROTTLE_MS = 60; // ~16fps updates to backend

                            if (timeSinceLast >= THROTTLE_MS) {
                                // Execute immediately
                                if (resizeTimeoutRef.current) {
                                    clearTimeout(resizeTimeoutRef.current);
                                    resizeTimeoutRef.current = null;
                                }
                                console.log(`[TerminalPanel] Throttled resize send: ${cols}x${rows}`);
                                onResize(cols, rows);
                                lastResizeTimeRef.current = now;
                            } else {
                                // Schedule trailing edge (ensure final size is always sent)
                                if (!resizeTimeoutRef.current) {
                                    resizeTimeoutRef.current = setTimeout(() => {
                                        console.log(`[TerminalPanel] Trailing resize send: ${cols}x${rows}`);
                                        onResize(cols, rows);
                                        lastResizeTimeRef.current = Date.now();
                                        resizeTimeoutRef.current = null;
                                    }, THROTTLE_MS - timeSinceLast + 10);
                                }
                            }

                        } catch (e) {
                            console.error('[TerminalPanel] Fit error:', e);
                        }
                    }
                }
            };

            // Observer for size changes
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    console.log(`[TerminalPanel] ResizeObserver: ${entry.contentRect.width}x${entry.contentRect.height}`);
                }
                // Debounce slightly to ensure layout is settled
                requestAnimationFrame(handleFit);
            });

            resizeObserver.observe(terminalRef.current);

            // Also trigger immediately if active
            if (isActive) {
                console.log('[TerminalPanel] isActive become YES - scheduling fit');
                setTimeout(handleFit, 100); // Increased delay slightly to allow flex layout to settle
            } else {
                console.log('[TerminalPanel] isActive become NO');
            }

            return () => {
                resizeObserver.disconnect();
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }
            };
        }, [isActive, onResize]); // Re-run when active state changes or onResize prop changes
        // Handle Ready State Focus
        const isReadyRef = useRef(isReady);
        useEffect(() => {
            isReadyRef.current = isReady;
            if (isReady && isActive) {
                console.log('[TerminalPanel] isReady became true & isActive is true. Focusing.');
                setTimeout(() => xtermRef.current?.focus(), 100);
            }
        }, [isReady, isActive]);


        return (
            <div
                className="terminal-container"
                onClick={() => {
                    console.log('[TerminalPanel] Container Clicked. Forcing focus.');
                    if (xtermRef.current) {
                        xtermRef.current.focus();
                        console.log('[TerminalPanel] Click focus called.');
                    }
                }}
                style={{
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    minHeight: '200px',
                    backgroundColor: '#1a1a1a',
                    padding: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {!isReady && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        color: 'white',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div className="spinner" style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ fontSize: '12px' }}>Starting Claude Code...</span>
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                )}
                <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
            </div>
        );
    }
);

TerminalPanel.displayName = 'TerminalPanel';
