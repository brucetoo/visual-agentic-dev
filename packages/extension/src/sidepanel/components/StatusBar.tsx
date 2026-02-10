import React from 'react';
import type { ConnectionStatus } from '../../shared/types';

interface StatusBarProps {
    status: ConnectionStatus;
    onConnect: () => void;
    onDisconnect: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, onConnect, onDisconnect }) => {
    const statusText = {
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        connected: 'Connected',
        error: 'Connection Failed',
    };

    return (
        <div className="status-bar">
            <div className="status-indicator">
                <span className={`status-dot ${status}`} />
                <span className="status-text">{statusText[status]}</span>
            </div>

            {status === 'disconnected' || status === 'error' ? (
                <button onClick={onConnect} className="connect-btn">
                    Connect
                </button>
            ) : status === 'connected' ? (
                <button onClick={onDisconnect} className="disconnect-btn">
                    Disconnect
                </button>
            ) : null}
        </div>
    );
};
