import { useState, useCallback, useRef, useEffect } from 'react';
import { WS_URL } from '../../shared/constants';
import type { Message, ConnectionStatus, TaskPayload, ResolveProjectPathPayload } from '../../shared/types';

interface StreamMessage {
    type: string;
    message?: {
        content: Array<{
            type: string;
            text?: string;
        }>;
    };
}

interface PendingResolve {
    resolve: (path: string | null) => void;
    reject: (error: Error) => void;
}

interface UseWebSocketOptions {
    onMessage?: (role: Message['role'], content: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const { onMessage } = options;
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const pendingResolvesRef = useRef<Map<string, PendingResolve>>(new Map());
    const onMessageRef = useRef(onMessage);

    // Keep ref updated
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const addMessage = useCallback((role: Message['role'], content: string) => {
        onMessageRef.current?.(role, content);
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
                    addMessage('system', '✅ 指令已发送到 iTerm, 请移步查看进度...');
                    break;

                case 'TASK_ERROR':
                    addMessage('system', `❌ 错误: ${data.payload.error}`);
                    break;

                case 'PROJECT_PATH_RESOLVED':
                    // Handle project path resolution response
                    const pending = pendingResolvesRef.current.get(data.id);
                    if (pending) {
                        pending.resolve(data.payload?.projectPath || null);
                        pendingResolvesRef.current.delete(data.id);
                    }
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
            // Reject all pending resolves
            for (const pending of pendingResolvesRef.current.values()) {
                pending.reject(new Error('WebSocket closed'));
            }
            pendingResolvesRef.current.clear();
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

    const resolveProjectPath = useCallback((port: number): Promise<string | null> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || status !== 'connected') {
                resolve(null);
                return;
            }

            const id = crypto.randomUUID();
            pendingResolvesRef.current.set(id, { resolve, reject });

            wsRef.current.send(JSON.stringify({
                type: 'RESOLVE_PROJECT_PATH',
                id,
                payload: { port } as ResolveProjectPathPayload,
            }));

            // Timeout after 5 seconds
            setTimeout(() => {
                if (pendingResolvesRef.current.has(id)) {
                    pendingResolvesRef.current.delete(id);
                    resolve(null);
                }
            }, 5000);
        });
    }, [status]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close();
        };
    }, []);

    return {
        status,
        connect,
        disconnect,
        sendTask,
        resolveProjectPath,
    };
}


