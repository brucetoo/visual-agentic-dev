import { VDevWebSocketServer } from './server/WebSocketServer';
import { TokenAuth } from './auth/TokenAuth';

export interface ServerOptions {
    port?: number;
}

/**
 * Start the Visual Dev Bridge Server
 */
export function startServer(options: ServerOptions = {}): VDevWebSocketServer {
    const port = options.port || 9527;

    console.log('[VDev Bridge] Starting server...');

    const server = new VDevWebSocketServer(port);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[VDev Bridge] Shutting down...');
        server.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        server.close();
        process.exit(0);
    });

    return server;
}

// Re-export types and classes
export { VDevWebSocketServer } from './server/WebSocketServer';
export { ClaudeCodeRunner } from './claude/ClaudeCodeRunner';
export { PromptBuilder } from './claude/PromptBuilder';
export * from './types';
