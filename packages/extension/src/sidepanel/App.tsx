import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { SourceInfo } from './components/SourceInfo';
import { Settings } from './components/Settings';
import { ProjectTerminal } from './components/ProjectTerminal'; // Import the new component
import { useWebSocket } from './hooks/useWebSocket';
import { STORAGE_KEY_PROJECT_PATH } from '../shared/constants';
import type { SourceLocation, ElementInfo, Message } from '../shared/types';

// Check if URL is localhost
function isLocalhostUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

// Extract port from URL (e.g., http://localhost:3000 -> 3000)
function extractPort(url: string): number | null {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
            return parseInt(urlObj.port, 10) || (urlObj.protocol === 'https:' ? 443 : 80);
        }
    } catch {
        // Invalid URL
    }
    return null;
}

const App: React.FC = () => {
    // State for selected elements per project
    // Map<ProjectPath, SelectedElement[]>
    const [projectSelections, setProjectSelections] = useState<Map<string, Array<{ source: SourceLocation; elementInfo: ElementInfo; timestamp: number }>>>(new Map());
    const [isInspecting, setIsInspecting] = useState(false);

    // Main project path (currently active)
    const [projectPath, setProjectPath] = useState<string>('');

    // List of ALL known/active project paths for multi-terminal support
    const [activeProjects, setActiveProjects] = useState<Set<string>>(new Set());

    const [showSettings, setShowSettings] = useState(false);
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [isLocalhost, setIsLocalhost] = useState<boolean | null>(null); // null = loading, true/false = determined
    const [useYolo, setUseYolo] = useState(() => {
        return localStorage.getItem('vdev_yolo_mode') === 'true';
    });
    const [agentCommand, setAgentCommand] = useState(() => {
        const cmd = localStorage.getItem('vdev_agent_command') || 'ccr code';
        console.log('[App] Initialized agentCommand:', cmd);
        return cmd;
    });

    // Sync settings across tabs/windows
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'vdev_agent_command') {
                const newValue = e.newValue || 'ccr code';
                console.log('[App] Syncing agentCommand from storage:', newValue);
                // Force reload to ensure clean session state and prevent conflicts
                window.location.reload();
            } else if (e.key === 'vdev_yolo_mode') {
                const newValue = e.newValue === 'true';
                console.log('[App] Syncing useYolo from storage:', newValue);
                setUseYolo(newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // We NO LONGER manage a single terminalRef here. 
    // Each ProjectTerminal has its own ref.
    // We send data to terminals via SPECIFIC ProjectTerminal instances or global broadcast.

    // Cache for origin -> projectPath mapping
    const pathCacheRef = useRef<Map<string, string>>(new Map());

    // Window and Tab tracking for isolation
    const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
    const [activeTabId, setActiveTabId] = useState<number | null>(null);

    // Get current window on mount
    useEffect(() => {
        chrome.windows.getCurrent((win) => {
            setCurrentWindowId(win.id || null);
        });
    }, []);

    // WebSocket hook - MAIN DISCOVERY & CONTROL SOCKET
    // This socket is used for:
    // 1. Resolving project paths (Discovery)
    // 2. Sending "Task" commands (that might need to be routed to specific project)
    // 3. Sending global "Reset" or control signals
    // IT IS NOT USED FOR TERMINAL OUPUT (ProjectTerminal handles that individually)
    const {
        status,
        connect,
        disconnect,
        sendTask,
        resolveProjectPath,
        sendTerminalData,
        sendTerminalReset
    } = useWebSocket({
        // No projectPath bound here - this is the "System" connection
        onTerminalOutput: (data) => {
            // Should not happen on system connection effectively?
            // Or maybe we use this for global logs?
            console.log('[App System Socket] Received output:', data);
        },
        onTerminalReady: () => {
            console.log('[App System Socket] Ready!');
        }
    });

    const lastSelectionTimeRef = useRef<number>(0);

    // Handle element selection - sending directly to RELEVANT terminal
    const handleElementSelected = useCallback((payload: { source: SourceLocation; elementInfo: ElementInfo; isInspecting?: boolean }) => {
        const now = Date.now();
        // Throttle selection events to avoid duplicates (e.g. within 500ms)
        if (now - lastSelectionTimeRef.current < 500) {
            return;
        }
        lastSelectionTimeRef.current = now;

        // Identify current project
        if (!projectPath) {
            console.warn('[VDev] Selected element but no project path active.');
            return;
        }

        const newSelection = {
            source: payload.source,
            elementInfo: payload.elementInfo,
            timestamp: now
        };

        // Update selection state
        setProjectSelections(prev => {
            const newMap = new Map(prev);
            const currentList = newMap.get(projectPath) || [];

            // Avoid duplicates (same file/line)
            const exists = currentList.find(item =>
                item.source.fileName === newSelection.source.fileName &&
                item.source.lineNumber === newSelection.source.lineNumber
            );

            if (!exists) {
                // Limit to 5 selections
                const updatedList = [...currentList, newSelection].slice(-5);
                newMap.set(projectPath, updatedList);

                // Construct prompt from UPDATED list
                updateTerminalPrompt(updatedList, projectPath, useYolo);
            }

            return newMap;
        });

        setIsInspecting(false);

    }, [projectPath, useYolo]); // dependency on updateTerminalPrompt logic helper

    // Helper to send updated prompt to terminal
    const updateTerminalPrompt = (selections: Array<{ source: SourceLocation; elementInfo: ElementInfo }>, targetPath: string, yolo: boolean) => {
        if (!targetPath || selections.length === 0) return;

        let inputText = `You need to help me modify the code.\n`;
        inputText += `## Target Location (${selections.length} items)\n`;

        selections.forEach((item, index) => {
            const { fileName, lineNumber, columnNumber } = item.source;
            const startLine = Math.max(1, lineNumber - 10);
            const endLine = lineNumber + 10;

            inputText += `${index + 1}. File: ${fileName}:${lineNumber} (Line ${lineNumber})\n`;
            inputText += `   - Context: Please check lines ${startLine} to ${endLine}\n`;
            inputText += `   - Element: <${item.elementInfo.tagName}.${item.elementInfo.className.split(' ')[0]}>\n`;
        });

        inputText += `\n## Task\n`;

        // Send Ctrl+C to clear/cancel first
        sendTerminalData(`\x03`, targetPath, yolo);

        // Wait for PTY to process interrupt/flush (avoid race condition where text is flushed with ^C)
        setTimeout(() => {
            sendTerminalData(inputText, targetPath, yolo);
        }, 50);
    };

    // Check current tab and update isLocalhost state
    const checkCurrentTab = useCallback(async () => {
        if (currentWindowId === null) return;

        try {
            const tabs = await chrome.tabs.query({ active: true, windowId: currentWindowId });
            const tab = tabs[0];

            if (!tab?.url) {
                // If no URL (e.g. empty tab), and we have no project, show loading/error?
                // If we have project, keep it.
                if (!projectPath) setIsLocalhost(false);
                return;
            }

            const isLocal = isLocalhostUrl(tab.url);

            // LOGIC CHANGE: 
            // 1. If we don't have a project path yet, we strictly follow isLocal.
            // 2. If we HAVE a project path, we ONLY update isLocalhost if it's TRUE (to recover from error state if any)
            //    or if we want to confirm we are back on local.
            //    BUT we DO NOT set it to false if we are on non-local, to avoid "Not Supported" UI.

            if (!projectPath) {
                setIsLocalhost(isLocal);
            } else {
                // Project is loaded. 
                // If isLocal is true, great, set it (might be switching between local projects).
                // If isLocal is false, IGNORE it. Keep isLocalhost=true (or whatever allowed the UI to show).
                if (isLocal) {
                    setIsLocalhost(true);
                }
            }

            console.log(`[VDev] Current tab localhost check: ${isLocal}, ProjectPath: ${projectPath}`);
        } catch (error) {
            console.error('[VDev] Error checking current tab:', error);
            if (!projectPath) setIsLocalhost(false);
        }
    }, [projectPath, currentWindowId]);

    // Auto-detect project path from current tab URL
    const detectProjectPath = useCallback(async () => {
        if (status !== 'connected' || currentWindowId === null) return;

        try {
            const tabs = await chrome.tabs.query({ active: true, windowId: currentWindowId });
            const tab = tabs[0];

            if (!tab?.url) return;

            // Update isLocalhost state logic (similar to checkCurrentTab but also detects path)
            const isLocal = isLocalhostUrl(tab.url);

            // If strictly local, we can try to detect path.
            if (isLocal) {
                setIsLocalhost(true);
            } else {
                // If not local, and we have project, active project remains (but might need to switch view?)
                // Actually if user switches to Google, we probably stay on last active project or show "Not Supported"?
                // Current logic: if strictly not local, and no project path, we show error.
            }

            const port = extractPort(tab.url);
            if (!port) {
                // Not a localhost URL port, don't try to detect path
                return;
            }

            // Check cache first
            const origin = new URL(tab.url).origin;
            const cachedPath = pathCacheRef.current.get(origin);

            if (cachedPath) {
                // Found in cache
                // ONLY update if different
                if (cachedPath !== projectPath) {
                    setProjectPath(cachedPath);
                    setIsAutoDetected(true);

                    // Add to active projects
                    setActiveProjects(prev => {
                        const newSet = new Set(prev);
                        newSet.add(cachedPath);
                        return newSet;
                    });
                }
                // ALWAYS update active tab ID, even if path didn't change (different tab, same project)
                setActiveTabId(tab.id || null);
                return;
            }

            // Resolve project path from port
            const resolvedPath = await resolveProjectPath(port);
            if (resolvedPath) {
                // IMPORTANT: Before setting path, double check we are still on the same tab
                const currentTabs = await chrome.tabs.query({ active: true, windowId: currentWindowId });
                const currentTab = currentTabs[0];

                if (currentTab?.id !== tab.id) return;

                // Found new path
                // ONLY update if different
                if (resolvedPath !== projectPath) {
                    setProjectPath(resolvedPath);
                    setIsAutoDetected(true);
                    pathCacheRef.current.set(origin, resolvedPath);
                    console.log(`[VDev] Auto-detected NEW project path: ${resolvedPath}`);

                    // Add to active projects
                    setActiveProjects(prev => {
                        const newSet = new Set(prev);
                        newSet.add(resolvedPath);
                        return newSet;
                    });
                }

                setActiveTabId(tab.id || null);
            }
        } catch (error) {
            console.error('[VDev] Error detecting project path:', error);
        }
    }, [status, resolveProjectPath, projectPath, currentWindowId]);

    // Check current tab on mount
    useEffect(() => {
        checkCurrentTab();
    }, [checkCurrentTab]);

    // Auto-connect on mount
    useEffect(() => {
        connect(undefined, undefined, agentCommand);
    }, [connect, agentCommand]);

    // Auto-detect project path when connected
    useEffect(() => {
        if (status === 'connected') {
            detectProjectPath();
        }
    }, [status, detectProjectPath]);

    // Call terminal init when project path is set or changed or connected
    useEffect(() => {
        // This effect is no longer needed to explicitly init a terminal,
        // as ProjectTerminal components will handle their own initialization
        // when they are mounted with a projectPath.
        // We keep it empty or remove it if no other logic is needed here.
    }, [projectPath, status, useYolo]); // Removed sendTerminalInit

    // Listen for tab changes to update project path and isLocalhost
    useEffect(() => {
        if (currentWindowId === null) return;

        const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
            // Only respond to tabs in our own window
            if (activeInfo.windowId === currentWindowId) {
                console.log(`[VDev] Tab activated in my window: ${activeInfo.tabId}`);
                checkCurrentTab();
                if (status === 'connected') {
                    detectProjectPath();
                }
            }
        };

        const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            // Only respond to updates in our own window
            if (tab.windowId === currentWindowId && changeInfo.url) {
                console.log(`[VDev] Tab updated in my window: ${tabId}`);
                checkCurrentTab();
                if (status === 'connected') {
                    detectProjectPath();
                }
            }
        };

        chrome.tabs.onActivated.addListener(handleTabActivated);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);

        return () => {
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
        };
    }, [checkCurrentTab, detectProjectPath, status, currentWindowId]);

    // Save project path to storage (only for manual changes)
    const handleProjectPathChange = useCallback((path: string) => {
        setProjectPath(path);

        // Add to active projects
        if (path) {
            setActiveProjects(prev => {
                const newSet = new Set(prev);
                newSet.add(path);
                return newSet;
            });
        }

        setIsAutoDetected(false);
        chrome.storage.local.set({ [STORAGE_KEY_PROJECT_PATH]: path });
    }, []);

    // Listen for element selection from page
    useEffect(() => {
        const handler = (message: any, sender: chrome.runtime.MessageSender) => {
            // ISOLATION: Check if message is from the tab we are currently monitoring
            if (message.type === 'VDEV_ELEMENT_SELECTED' && message.payload) {
                if (sender.tab && sender.tab.id === activeTabId) {
                    handleElementSelected(message.payload);
                } else {
                    console.log(`[VDev] Ignoring selection from other tab: ${sender.tab?.id} (I am watching ${activeTabId})`);
                }
            } else if (message.type === 'VDEV_SDK_READY') {
                if (sender.tab && sender.tab.id === activeTabId) {
                    console.log('[VDev SidePanel] SDK ready');
                }
            } else if (message.type === 'VDEV_INSPECT_STATE_CHANGED' && message.payload) {
                if (sender.tab && sender.tab.id === activeTabId) {
                    console.log('[VDev SidePanel] Inspect state changed:', message.payload.isInspecting);
                    setIsInspecting(!!message.payload.isInspecting);
                }
            }
        };

        chrome.runtime.onMessage.addListener(handler);
        return () => chrome.runtime.onMessage.removeListener(handler);
    }, [handleElementSelected, activeTabId]);

    // Toggle inspect mode
    const toggleInspect = useCallback(() => {
        const newState = !isInspecting;
        setIsInspecting(newState);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: newState ? 'VDEV_START_INSPECT' : 'VDEV_STOP_INSPECT',
                });
            }
        });
    }, [isInspecting]);

    // Clear selection
    const clearSelection = useCallback(() => {
        if (!projectPath) return;

        setProjectSelections(prev => {
            const newMap = new Map(prev);
            newMap.delete(projectPath);
            return newMap;
        });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'VDEV_CLEAR_SELECTION' });
            }
        });

        // Clear terminal input with Ctrl+C
        sendTerminalData(`\x03`, projectPath, useYolo);

    }, [projectPath, useYolo, sendTerminalData]);

    const removeFromSelection = useCallback((index: number) => {
        if (!projectPath) return;

        setProjectSelections(prev => {
            const newMap = new Map(prev);
            const currentList = newMap.get(projectPath) || [];

            const updatedList = currentList.filter((_, i) => i !== index);

            if (updatedList.length === 0) {
                newMap.delete(projectPath);
                // If empty, clear terminal input with Ctrl+C
                sendTerminalData(`\x03`, projectPath, useYolo);
            } else {
                newMap.set(projectPath, updatedList);
                // Update terminal with remaining items
                updateTerminalPrompt(updatedList, projectPath, useYolo);
            }

            return newMap;
        });
    }, [projectPath, useYolo, sendTerminalData]);


    // Show loading state while checking tab
    if (isLocalhost === null) {
        return (
            <div className="vdev-sidepanel vdev-not-supported">
                <div className="not-supported-content">
                    <div className="not-supported-icon">⏳</div>
                    <p>Detecting page type...</p>
                </div>
            </div>
        );
    }

    // Logic:
    // If isLocalhost is false, AND we have NO project path, then we show "Not Supported".
    // This handles the case where user opens extension on Google.com first time.
    if (!isLocalhost && !projectPath) {
        return (
            <div className="vdev-sidepanel vdev-not-supported">
                <header className="vdev-header">
                    <h1>🎨 Visual Agentic Dev</h1>
                </header>
                <div className="not-supported-content">
                    <div className="not-supported-icon">🚫</div>
                    <h2>Online pages not supported</h2>
                    <p>Visual Agentic Dev only supports local development servers</p>
                    <p className="hint">Please open localhost or 127.0.0.1 to use</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {showSettings && <Settings
                projectPath={projectPath}
                onProjectPathChange={handleProjectPathChange}
                onConnect={() => connect(projectPath, useYolo, agentCommand)}
                onDisconnect={disconnect}
                onResetSession={() => {
                    if (projectPath) {
                        sendTerminalReset(projectPath);
                    }
                    // Give WebSocket a moment to send the buffer before reloading
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }}
                status={status}
                onClose={() => setShowSettings(false)}
                isAutoDetected={isAutoDetected}
            // Pass current value but we rely on localStorage update + reload for now
            // Actually, Settings component has its own local state for agentCommand?
            // No, Settings uses localStorage value as init, then internal state.
            // We should probably lift state up or sync it.
            // Settings component currently handles save by writing to localStorage and reloading.
            // So this prop isn't strictly needed for the fix, but helps if we remove reload later.
            />}


            <div className="vdev-sidepanel">
                <header className="vdev-header">
                    <div className="header-left">
                        <h1>🎨 Visual Agentic Dev</h1>
                        <div className={`status-indicator-compact ${status}`} title={`Status: ${status}`}>
                            <span className="status-dot"></span>
                        </div>
                    </div>
                    <div className="header-actions">
                        {/* Connection Control */}
                        {status === 'connected' ? (
                            <button
                                className="action-btn disconnect-btn"
                                onClick={disconnect}
                                title="Disconnect"
                            >
                                🔌
                            </button>
                        ) : (
                            <button
                                className="action-btn connect-btn"
                                onClick={() => connect(projectPath, useYolo, agentCommand)}
                                title="Connect"
                            >
                                🔗
                            </button>
                        )}

                        {/* YOLO Mode Toggle */}
                        <button
                            className={`action-btn yolo-btn ${useYolo ? 'active' : ''}`}
                            onClick={() => {
                                const newState = !useYolo;
                                localStorage.setItem('vdev_yolo_mode', String(newState));
                                setUseYolo(newState);
                                // No global terminal ready reset here, individual terminals handle their own state?
                                // Ideally we should reload to propagate YOLO state cleanly.
                                window.location.reload();
                            }}
                            title={`YOLO Mode: ${useYolo ? 'ON' : 'OFF'}`}
                        >
                            🚀
                        </button>

                        {/* Clear Cache */}
                        <button
                            className="action-btn clear-btn"
                            onClick={() => {
                                if (confirm('Are you sure you want to clear all cache and reset?')) {
                                    if (projectPath) {
                                        sendTerminalReset(projectPath);
                                    }
                                    localStorage.clear();
                                    chrome.storage.local.clear();
                                    window.location.reload();
                                }
                            }}
                            title="Clear All Cache & Reset"
                        >
                            🧹
                        </button>

                        {/* Separator */}
                        <div className="action-separator"></div>

                        {/* Inspect */}
                        <button
                            className={`action-btn inspect-btn ${isInspecting ? 'active' : ''}`}
                            onClick={toggleInspect}
                            title="Select Page Element"
                        >
                            {isInspecting ? '🎯' : '🔍'}
                        </button>

                        {/* Settings */}
                        <button
                            className="action-btn settings-btn"
                            onClick={() => setShowSettings(true)}
                            title="Settings"
                        >
                            ⚙️
                        </button>
                    </div>
                </header>

                {/* Selection info */}
                {projectPath && projectSelections.get(projectPath)?.length ? (
                    <SourceInfo
                        selectedElements={projectSelections.get(projectPath) || []}
                        onRemove={removeFromSelection}
                        onClear={clearSelection}
                    />
                ) : null}

                {/* Terminal Section - Render MULTIPLE ProjectTerminals */}
                {activeProjects.size > 0 ? (
                    <div className="terminal-section flex-grow" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {Array.from(activeProjects).map((path) => (
                            <ProjectTerminal
                                key={path}
                                projectPath={path}
                                isActive={path === projectPath}
                                useYolo={useYolo}
                                agentCommand={agentCommand}
                                globalStatus={status} // Pass global status for sync
                            />
                        ))}
                    </div>
                ) : (
                    // Fallback if no projects active yet, or just show empty state
                    <div className="empty-state">
                        <p>Please click ⚙️ Settings to set project path and start terminal</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default App;
