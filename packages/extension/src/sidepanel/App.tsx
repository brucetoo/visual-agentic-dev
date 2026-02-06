import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { SourceInfo } from './components/SourceInfo';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
import { useWebSocket } from './hooks/useWebSocket';
import { STORAGE_KEY_PROJECT_PATH } from '../shared/constants';
import type { SourceLocation, ElementInfo, Message } from '../shared/types';

// Storage keys
const STORAGE_KEY_PROJECT_STATES = 'vdevProjectStates';

interface ProjectState {
    messages: Message[];
    selectedSource: SourceLocation | null;
    elementInfo: ElementInfo | null;
}

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
    const [selectedSource, setSelectedSource] = useState<SourceLocation | null>(null);
    const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [projectPath, setProjectPath] = useState<string>('');
    const [showSettings, setShowSettings] = useState(false);
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLocalhost, setIsLocalhost] = useState<boolean | null>(null); // null = loading, true/false = determined

    // Ref for project states to avoid stale closure issues
    const projectStatesRef = useRef<Map<string, ProjectState>>(new Map());
    const currentProjectRef = useRef<string>('');

    // Cache for origin -> projectPath mapping
    const pathCacheRef = useRef<Map<string, string>>(new Map());

    // Message handler for WebSocket
    const handleMessage = useCallback((role: Message['role'], content: string) => {
        const newMessage: Message = { role, content, timestamp: Date.now() };
        setMessages(prev => [...prev, newMessage]);
    }, []);

    const { status, sendTask, connect, disconnect, resolveProjectPath } = useWebSocket({
        onMessage: handleMessage,
    });

    // Flag to skip saving during restore
    const isRestoringRef = useRef(false);

    // Save current project state when messages or selection changes
    useEffect(() => {
        // Don't save if we're currently restoring state
        if (!projectPath || isRestoringRef.current) return;
        // Don't save if projectPath doesn't match current project (just switched)
        if (projectPath !== currentProjectRef.current) return;

        const state: ProjectState = {
            messages,
            selectedSource,
            elementInfo,
        };
        projectStatesRef.current.set(projectPath, state);

        // Persist to chrome.storage (debounced via timeout)
        const timeoutId = setTimeout(() => {
            const allStates: Record<string, ProjectState> = {};
            projectStatesRef.current.forEach((s, key) => {
                allStates[key] = s;
            });
            chrome.storage.local.set({ [STORAGE_KEY_PROJECT_STATES]: allStates });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [projectPath, messages, selectedSource, elementInfo]);

    // Load project states from storage on mount
    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY_PROJECT_STATES).then(result => {
            const states = result[STORAGE_KEY_PROJECT_STATES] as Record<string, ProjectState> | undefined;
            if (states) {
                Object.entries(states).forEach(([key, state]) => {
                    projectStatesRef.current.set(key, state);
                });
            }
        });
    }, []);

    // Restore state when project path changes
    useEffect(() => {
        if (!projectPath || projectPath === currentProjectRef.current) return;

        // Save current project state before switching (if there was a previous project)
        if (currentProjectRef.current) {
            const prevState: ProjectState = {
                messages,
                selectedSource,
                elementInfo,
            };
            projectStatesRef.current.set(currentProjectRef.current, prevState);
        }

        isRestoringRef.current = true;
        currentProjectRef.current = projectPath;
        const savedState = projectStatesRef.current.get(projectPath);

        if (savedState) {
            setMessages(savedState.messages);
            setSelectedSource(savedState.selectedSource);
            setElementInfo(savedState.elementInfo);
            console.log(`[VDev] Restored state for project: ${projectPath}`);
        } else {
            // New project, clear state
            setMessages([]);
            setSelectedSource(null);
            setElementInfo(null);
            console.log(`[VDev] New project, cleared state: ${projectPath}`);
        }

        // Re-enable saving after a short delay
        setTimeout(() => {
            isRestoringRef.current = false;
        }, 100);
    }, [projectPath]);

    // Check current tab and update isLocalhost state
    const checkCurrentTab = useCallback(async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.url) {
                setIsLocalhost(false);
                return;
            }
            const isLocal = isLocalhostUrl(tab.url);
            setIsLocalhost(isLocal);
            console.log(`[VDev] Current tab is localhost: ${isLocal}, URL: ${tab.url}`);
        } catch (error) {
            console.error('[VDev] Error checking current tab:', error);
            setIsLocalhost(false);
        }
    }, []);

    // Auto-detect project path from current tab URL
    const detectProjectPath = useCallback(async () => {
        if (status !== 'connected') return;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.url) return;

            // Update isLocalhost state
            const isLocal = isLocalhostUrl(tab.url);
            setIsLocalhost(isLocal);

            const port = extractPort(tab.url);
            if (!port) {
                // Not a localhost URL, don't try to detect path
                return;
            }

            // Check cache first
            const origin = new URL(tab.url).origin;
            const cachedPath = pathCacheRef.current.get(origin);
            if (cachedPath) {
                setProjectPath(cachedPath);
                setIsAutoDetected(true);
                return;
            }

            // Resolve project path from port
            const resolvedPath = await resolveProjectPath(port);
            if (resolvedPath) {
                setProjectPath(resolvedPath);
                setIsAutoDetected(true);
                pathCacheRef.current.set(origin, resolvedPath);
                console.log(`[VDev] Auto-detected project path: ${resolvedPath}`);
            }
        } catch (error) {
            console.error('[VDev] Error detecting project path:', error);
        }
    }, [status, resolveProjectPath]);

    // Check current tab on mount
    useEffect(() => {
        checkCurrentTab();
    }, [checkCurrentTab]);

    // Auto-connect on mount
    useEffect(() => {
        connect();
    }, [connect]);

    // Auto-detect project path when connected
    useEffect(() => {
        if (status === 'connected') {
            detectProjectPath();
        }
    }, [status, detectProjectPath]);

    // Listen for tab changes to update project path and isLocalhost
    useEffect(() => {
        const handleTabActivated = () => {
            checkCurrentTab();
            if (status === 'connected') {
                detectProjectPath();
            }
        };

        const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (changeInfo.url) {
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
    }, [checkCurrentTab, detectProjectPath, status]);

    // Save project path to storage (only for manual changes)
    const handleProjectPathChange = useCallback((path: string) => {
        setProjectPath(path);
        setIsAutoDetected(false);
        chrome.storage.local.set({ [STORAGE_KEY_PROJECT_PATH]: path });
    }, []);

    // Listen for element selection from page
    useEffect(() => {
        const handler = (message: { type: string; payload?: { source: SourceLocation; elementInfo: ElementInfo; isInspecting?: boolean } }) => {
            if (message.type === 'VDEV_ELEMENT_SELECTED' && message.payload) {
                setSelectedSource(message.payload.source);
                setElementInfo(message.payload.elementInfo);
                setIsInspecting(false);
            } else if (message.type === 'VDEV_SDK_READY') {
                console.log('[VDev SidePanel] SDK ready');
            } else if (message.type === 'VDEV_INSPECT_STATE_CHANGED' && message.payload) {
                // Sync inspect state when SDK toggles via keyboard shortcut
                console.log('[VDev SidePanel] Inspect state changed:', message.payload.isInspecting);
                setIsInspecting(!!message.payload.isInspecting);
            }
        };

        chrome.runtime.onMessage.addListener(handler);
        return () => chrome.runtime.onMessage.removeListener(handler);
    }, []);

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
        setSelectedSource(null);
        setElementInfo(null);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'VDEV_CLEAR_SELECTION' });
            }
        });
    }, []);

    // Clear messages for current project
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    // Send instruction to Claude
    const handleSendInstruction = useCallback(async (instruction: string) => {
        if (!selectedSource || !projectPath) {
            return;
        }

        await sendTask({
            source: selectedSource,
            instruction,
            projectPath,
        });
    }, [selectedSource, projectPath, sendTask]);

    if (showSettings) {
        return (
            <Settings
                projectPath={projectPath}
                onProjectPathChange={handleProjectPathChange}
                onConnect={connect}
                onDisconnect={disconnect}
                status={status}
                onClose={() => setShowSettings(false)}
                isAutoDetected={isAutoDetected}
            />
        );
    }

    // Show loading state while checking tab
    if (isLocalhost === null) {
        return (
            <div className="vdev-sidepanel vdev-not-supported">
                <div className="not-supported-content">
                    <div className="not-supported-icon">⏳</div>
                    <p>检测页面类型中...</p>
                </div>
            </div>
        );
    }

    // Show fallback UI for non-localhost pages
    if (!isLocalhost) {
        return (
            <div className="vdev-sidepanel vdev-not-supported">
                <header className="vdev-header">
                    <h1>🎨 Visual Dev</h1>
                </header>
                <div className="not-supported-content">
                    <div className="not-supported-icon">🚫</div>
                    <h2>不支持线上页面</h2>
                    <p>Visual Dev 仅支持本地开发服务器</p>
                    <p className="hint">请打开 localhost 或 127.0.0.1 页面使用</p>
                </div>
            </div>
        );
    }

    return (
        <div className="vdev-sidepanel">
            <header className="vdev-header">
                <h1>🎨 Visual Dev</h1>
                <div className="header-actions">
                    <button
                        className={`inspect-btn ${isInspecting ? 'active' : ''}`}
                        onClick={toggleInspect}
                        title="选择页面元素"
                    >
                        {isInspecting ? '🎯' : '🔍'}
                    </button>
                    <button
                        className="settings-btn"
                        onClick={() => setShowSettings(true)}
                        title="设置"
                    >
                        ⚙️
                    </button>
                </div>
            </header>

            <StatusBar status={status} onConnect={connect} onDisconnect={disconnect} />

            {selectedSource && (
                <SourceInfo
                    source={selectedSource}
                    elementInfo={elementInfo}
                    onClear={clearSelection}
                />
            )}

            <ChatPanel
                messages={messages}
                onSend={handleSendInstruction}
                onClear={clearMessages}
                disabled={!selectedSource || status !== 'connected' || !projectPath}
                placeholder={
                    !projectPath
                        ? '请先设置项目路径'
                        : !selectedSource
                            ? '请先选择元素'
                            : status !== 'connected'
                                ? '请先连接服务器'
                                : '描述你想要的修改...'
                }
            />
        </div>
    );
};

export default App;


