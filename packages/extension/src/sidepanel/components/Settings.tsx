import React, { useState, useEffect } from 'react';
import { STORAGE_KEY_PROJECT_PATH } from '../../shared/constants';
import type { ConnectionStatus } from '../../shared/types';

interface SettingsProps {
    projectPath: string;
    onProjectPathChange: (path: string) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    status: ConnectionStatus;
    onClose: () => void;
    isAutoDetected?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
    projectPath,
    onProjectPathChange,
    onConnect,
    onDisconnect,
    status,
    onClose,
    isAutoDetected = false,
}) => {
    const [localPath, setLocalPath] = useState(projectPath);

    // Sync with projectPath when it changes (e.g., from auto-detection)
    useEffect(() => {
        setLocalPath(projectPath);
    }, [projectPath]);

    const handleSavePath = () => {
        onProjectPathChange(localPath);
    };

    return (
        <div className="settings-panel">
            <header className="vdev-header">
                <h1>⚙️ Settings</h1>
                <button className="action-btn" onClick={onClose} title="Close">
                    ✕
                </button>
            </header>

            <div className="settings-content">
                <div className="setting-group">
                    <label>
                        <span className="setting-label">
                            Project Path
                            {isAutoDetected && (
                                <span className="auto-badge" title="Auto-detect from localhost port">
                                    🎯 Auto-detected
                                </span>
                            )}
                        </span>
                        <span className="setting-hint">Absolute path to React project</span>
                    </label>
                    <div className="setting-input-row">
                        <input
                            type="text"
                            value={localPath}
                            onChange={(e) => setLocalPath(e.target.value)}
                            placeholder="/path/to/your/react-project"
                        />
                        <button onClick={handleSavePath}>Save</button>
                    </div>
                </div>

                <div className="setting-group">
                    <label>
                        <span className="setting-label">Server Connection</span>
                        <span className="setting-hint">Bridge Server (ws://localhost:9527)</span>
                    </label>
                    <div className="setting-actions">
                        {status === 'connected' ? (
                            <button onClick={onDisconnect} className="disconnect-btn">
                                Disconnect
                            </button>
                        ) : (
                            <button onClick={onConnect} className="connect-btn">
                                Connect to Server
                            </button>
                        )}
                        <span className={`status-dot ${status}`} />
                    </div>
                </div>

                <div className="setting-group help">
                    <h3>Instructions</h3>
                    <ol>
                        <li>Run <code>vdev-server</code> in terminal to start service</li>
                        <li>Open localhost project, path will be auto-detected</li>
                        <li>Return to main interface, select page elements</li>
                        <li>Describe desired modifications</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

