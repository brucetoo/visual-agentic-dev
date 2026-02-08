import { useState, useCallback, useRef, useEffect } from 'react';
import { WS_URL } from '../../shared/constants';
import type { Message, ConnectionStatus, TaskPayload, ResolveProjectPathPayload } from '../../shared/types';

interface StreamMessage {
    type: string;
    message?: {
        content: Array<{
            type: 'text' | 'tool_use' | 'tool_result';
            text?: string;
        }>;
    };
}

interface PendingResolve {
    resolve: (path: string | null) => void;
    reject: (error: Error) => void;
}

interface UseWebSocketOptions {
    projectPath?: string | null;
    onMessage?: (role: Message['role'], content: string) => void;
    onTerminalOutput?: (data: string) => void;
    onTerminalReady?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const { onMessage, onTerminalOutput, onTerminalReady, projectPath } = options;
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const pendingResolvesRef = useRef<Map<string, PendingResolve>>(new Map());
    const onMessageRef = useRef(onMessage);
    const onTerminalOutputRef = useRef(onTerminalOutput);
    const onTerminalReadyRef = useRef(onTerminalReady);
    const projectPathRef = useRef(projectPath);

    // Keep refs updated
    useEffect(() => {
        onMessageRef.current = onMessage;
        onTerminalOutputRef.current = onTerminalOutput;
        onTerminalReadyRef.current = onTerminalReady;
        projectPathRef.current = projectPath;
    }, [onMessage, onTerminalOutput, onTerminalReady, projectPath]);

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

            // Filter task messages by projectPath if provided
            if (data.type.startsWith('TASK_') && data.projectPath && projectPathRef.current) {
                if (data.projectPath !== projectPathRef.current) {
                    console.log(`[useWebSocket] Ignoring message for different project: ${data.projectPath} (current: ${projectPathRef.current})`);
                    return;
                }
            }

            switch (data.type) {
                case 'TASK_STARTED':
                    addMessage('system', '📤 已发送指令到终端...');
                    break;

                case 'TASK_COMPLETED':
                    // We don't really have a completion event from terminal easily, 
                    // but the server sends this after writing to pty.
                    break;

                case 'PROJECT_PATH_RESOLVED':
                    const pending = pendingResolvesRef.current.get(data.id);
                    if (pending) {
                        pending.resolve(data.payload?.projectPath || null);
                        pendingResolvesRef.current.delete(data.id);
                    }
                    break;
                case 'TERMINAL_OUTPUT':
                    if (data.payload?.data) {
                        onTerminalOutputRef.current?.(data.payload.data);
                    }
                    break;
                case 'TERMINAL_READY':
                    console.log('[useWebSocket] Received TERMINAL_READY');
                    onTerminalReadyRef.current?.();
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

    const sendTerminalData = useCallback((data: string, projectPath?: string, useYolo?: boolean) => {
        if (!wsRef.current || status !== 'connected') return;

        wsRef.current.send(JSON.stringify({
            type: 'TERMINAL_DATA',
            id: crypto.randomUUID(),
            payload: { data, projectPath, useYolo },
        }));
    }, [status]);

    const sendTerminalInit = useCallback((projectPath: string, useYolo: boolean = false) => {
        if (!wsRef.current || status !== 'connected') return;

        wsRef.current.send(JSON.stringify({
            type: 'TERMINAL_INIT',
            id: crypto.randomUUID(),
            payload: { projectPath, useYolo },
        }));
    }, [status]);

    const sendTerminalResize = useCallback((cols: number, rows: number, projectPath?: string) => {
        if (!wsRef.current || status !== 'connected') return;

        wsRef.current.send(JSON.stringify({
            type: 'TERMINAL_RESIZE',
            id: crypto.randomUUID(),
            payload: { cols, rows, projectPath },
        }));
    }, [status]);

    const sendTerminalReset = useCallback((projectPath: string) => {
        if (!wsRef.current || status !== 'connected') return;

        wsRef.current.send(JSON.stringify({
            type: 'TERMINAL_RESET',
            id: crypto.randomUUID(),
            payload: { projectPath },
        }));
    }, [status]);

    return {
        status,
        connect,
        disconnect,
        sendTask,
        resolveProjectPath,
        sendTerminalData,
        sendTerminalInit,
        sendTerminalResize,
        sendTerminalReset,
    };
}
