import React from 'react';
import type { ConnectionStatus } from '../../shared/types';

interface StatusBarProps {
    status: ConnectionStatus;
    onConnect: () => void;
    onDisconnect: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, onConnect, onDisconnect }) => {
    const statusText = {
        disconnected: '未连接',
        connecting: '连接中...',
        connected: '已连接',
        error: '连接失败',
    };

    return (
        <div className="status-bar">
            <div className="status-indicator">
                <span className={`status-dot ${status}`} />
                <span className="status-text">{statusText[status]}</span>
            </div>

            {status === 'disconnected' || status === 'error' ? (
                <button onClick={onConnect} className="connect-btn">
                    连接
                </button>
            ) : status === 'connected' ? (
                <button onClick={onDisconnect} className="disconnect-btn">
                    断开
                </button>
            ) : null}
        </div>
    );
};
