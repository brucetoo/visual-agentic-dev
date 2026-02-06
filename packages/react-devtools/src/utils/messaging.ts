import type { VDevMessage } from '../types';

const MESSAGE_SOURCE = 'vdev-react-sdk';

/**
 * Send a message to the Chrome extension via window.postMessage
 */
export function sendToExtension(message: VDevMessage): void {
    window.postMessage(
        { ...message, source: MESSAGE_SOURCE },
        '*'
    );
}

/**
 * Notify extension that SDK is ready
 */
export function notifyReady(): void {
    sendToExtension({ type: 'VDEV_SDK_READY' });
}

/**
 * Create a message handler that only processes messages from the extension
 */
export function createMessageHandler(
    handler: (message: VDevMessage) => void
): (event: MessageEvent) => void {
    return (event: MessageEvent) => {
        // Only process messages from the same window
        if (event.source !== window) return;

        // Only process messages from extension (not from SDK itself)
        if (event.data?.source === MESSAGE_SOURCE) return;

        // Process VDEV messages
        if (event.data?.type?.startsWith('VDEV_')) {
            handler(event.data as VDevMessage);
        }
    };
}
