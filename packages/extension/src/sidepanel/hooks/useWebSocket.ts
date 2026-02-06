import { useState, useCallback, useRef, useEffect } from 'react';
import { WS_URL } from '../../shared/constants';
import type { Message, ConnectionStatus, TaskPayload } from '../../shared/types';

interface StreamMessage {
    type: string;
    message?: {
        content: Array<{
            type: string;
            text?: string;
        }>;
    };
}

export function useWebSocket() {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [messages, setMessages] = useState<Message[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    const addMessage = useCallback((role: Message['role'], content: string) => {
        setMessages(prev => [...prev, {
            role,
            content,
            timestamp: Date.now(),
        }]);
    }, []);

    const connect = useCallback(() => {
        setStatus('connecting');

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            addMessage('system', '✅ 已连接到 Bridge Server');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'TASK_STARTED':
                    addMessage('system', '📤 已发送到 iTerm Claude Code终端, 请查看...');
                    break;

                case 'TASK_PROGRESS':
                    // Extract text from stream message
                    const streamMsg = data.payload as StreamMessage;
                    if (streamMsg.message?.content) {
                        for (const block of streamMsg.message.content) {
                            if (block.type === 'text' && block.text) {
                                addMessage('assistant', block.text);
                            }
                        }
                    }
                    break;

                case 'TASK_COMPLETED':
                    addMessage('system', '✅ 指令已发送到 iTerm, 打开移步操作');
                    break;

                case 'TASK_ERROR':
                    addMessage('system', `❌ 错误: ${data.payload.error}`);
                    break;
            }
        };

        ws.onerror = () => {
            setStatus('error');
            addMessage('system', '❌ 连接错误');
        };

        ws.onclose = () => {
            setStatus('disconnected');
            wsRef.current = null;
        };
    }, [addMessage]);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        setStatus('disconnected');
        addMessage('system', '已断开连接');
    }, [addMessage]);

    const sendTask = useCallback(async (payload: TaskPayload) => {
        if (!wsRef.current || status !== 'connected') {
            throw new Error('Not connected');
        }

        addMessage('user', `📍 ${payload.source.fileName.split('/').pop()}:${payload.source.lineNumber}\n\n${payload.instruction}`);

        wsRef.current.send(JSON.stringify({
            type: 'EXECUTE_TASK',
            id: crypto.randomUUID(),
            payload,
        }));
    }, [status, addMessage]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close();
        };
    }, []);

    return {
        status,
        messages,
        connect,
        disconnect,
        sendTask,
        clearMessages,
    };
}
