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

    // Save current project state when messages or selection changes
    useEffect(() => {
        if (!projectPath) return;

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
        }
    }, [projectPath]);

    // Auto-detect project path from current tab URL
    const detectProjectPath = useCallback(async () => {
        if (status !== 'connected') return;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.url) return;

            const port = extractPort(tab.url);
            if (!port) {
                // Not a localhost URL, fallback to stored path
                chrome.storage.local.get(STORAGE_KEY_PROJECT_PATH).then(result => {
                    if (result[STORAGE_KEY_PROJECT_PATH]) {
                        setProjectPath(result[STORAGE_KEY_PROJECT_PATH]);
                        setIsAutoDetected(false);
                    }
                });
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

    // Listen for tab changes to update project path
    useEffect(() => {
        const handleTabActivated = () => {
            detectProjectPath();
        };

        const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (changeInfo.url) {
                detectProjectPath();
            }
        };

        chrome.tabs.onActivated.addListener(handleTabActivated);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);

        return () => {
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
        };
    }, [detectProjectPath]);

    // Save project path to storage (only for manual changes)
    const handleProjectPathChange = useCallback((path: string) => {
        setProjectPath(path);
        setIsAutoDetected(false);
        chrome.storage.local.set({ [STORAGE_KEY_PROJECT_PATH]: path });
    }, []);

    // Listen for element selection from page
    useEffect(() => {
        const handler = (message: { type: string; payload?: { source: SourceLocation; elementInfo: ElementInfo } }) => {
            if (message.type === 'VDEV_ELEMENT_SELECTED' && message.payload) {
                setSelectedSource(message.payload.source);
                setElementInfo(message.payload.elementInfo);
                setIsInspecting(false);
            } else if (message.type === 'VDEV_SDK_READY') {
                console.log('[VDev SidePanel] SDK ready');
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


