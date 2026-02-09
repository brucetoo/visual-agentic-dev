// Content Script - bridges page SDK and extension

// Prevent multiple injections
if ((window as any).__VDEV_CONTENT_SCRIPT_LOADED__) {
    // console.log('[VDev Extension] Content script already loaded');
} else {
    (window as any).__VDEV_CONTENT_SCRIPT_LOADED__ = true;

    // Forward messages from page SDK to extension
    window.addEventListener('message', (event) => {
        // Only accept messages from the same window
        if (event.source !== window) return;

        // Only forward messages from our SDK
        if (event.data?.source !== 'vdev-react-sdk') return;

        // Forward to background/side panel
        chrome.runtime.sendMessage(event.data);
    });

    // Forward messages from extension to page SDK
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Forward inspect commands to page
        if (
            message.type === 'VDEV_START_INSPECT' ||
            message.type === 'VDEV_STOP_INSPECT' ||
            message.type === 'VDEV_CLEAR_SELECTION' ||
            message.type === 'VDEV_TOGGLE_INSPECT'
        ) {
            window.postMessage(message, '*');
        }
        return true;
    });

    console.log('[VDev Extension] Content script loaded');
}
