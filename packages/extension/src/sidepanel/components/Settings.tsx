import React, { useState } from 'react';
import { STORAGE_KEY_PROJECT_PATH } from '../../shared/constants';
import type { ConnectionStatus } from '../../shared/types';

interface SettingsProps {
    projectPath: string;
    onProjectPathChange: (path: string) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    status: ConnectionStatus;
    onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
    projectPath,
    onProjectPathChange,
    onConnect,
    onDisconnect,
    status,
    onClose,
}) => {
    const [localPath, setLocalPath] = useState(projectPath);

    const handleSavePath = () => {
        onProjectPathChange(localPath);
    };

    return (
        <div className="vdev-sidepanel settings-panel">
            <header className="vdev-header">
                <h1>⚙️ 设置</h1>
                <button className="close-btn" onClick={onClose}>
                    ✕
                </button>
            </header>

            <div className="settings-content">
                <div className="setting-group">
                    <label>
                        <span className="setting-label">项目路径</span>
                        <span className="setting-hint">React 项目的绝对路径</span>
                    </label>
                    <div className="setting-input-row">
                        <input
                            type="text"
                            value={localPath}
                            onChange={(e) => setLocalPath(e.target.value)}
                            placeholder="/path/to/your/react-project"
                        />
                        <button onClick={handleSavePath}>保存</button>
                    </div>
                </div>

                <div className="setting-group">
                    <label>
                        <span className="setting-label">服务器连接</span>
                        <span className="setting-hint">Bridge Server (ws://localhost:9527)</span>
                    </label>
                    <div className="setting-actions">
                        {status === 'connected' ? (
                            <button onClick={onDisconnect} className="disconnect-btn">
                                断开连接
                            </button>
                        ) : (
                            <button onClick={onConnect} className="connect-btn">
                                连接服务器
                            </button>
                        )}
                        <span className={`status-dot ${status}`} />
                    </div>
                </div>

                <div className="setting-group help">
                    <h3>使用说明</h3>
                    <ol>
                        <li>在终端运行 <code>vdev-server</code> 启动服务</li>
                        <li>设置你的 React 项目路径</li>
                        <li>连接服务器</li>
                        <li>回到主界面，选择页面元素</li>
                        <li>描述想要的修改</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};
