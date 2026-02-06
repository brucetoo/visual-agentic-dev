import React, { useState, useEffect, useCallback } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { SourceInfo } from './components/SourceInfo';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
import { useWebSocket } from './hooks/useWebSocket';
import { STORAGE_KEY_PROJECT_PATH } from '../shared/constants';
import type { SourceLocation, ElementInfo } from '../shared/types';

const App: React.FC = () => {
    const [selectedSource, setSelectedSource] = useState<SourceLocation | null>(null);
    const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [projectPath, setProjectPath] = useState<string>('');
    const [showSettings, setShowSettings] = useState(false);

    const { status, messages, sendTask, connect, disconnect, clearMessages } = useWebSocket();

    // Load project path from storage
    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY_PROJECT_PATH).then(result => {
            if (result[STORAGE_KEY_PROJECT_PATH]) {
                setProjectPath(result[STORAGE_KEY_PROJECT_PATH]);
            }
        });
    }, []);

    // Save project path to storage
    const handleProjectPathChange = useCallback((path: string) => {
        setProjectPath(path);
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
