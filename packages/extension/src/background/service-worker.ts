// Background Service Worker for Visual Dev Tool

// Track tabs where sidepanel has been opened (by origin)
// Key: origin (e.g., "http://localhost:3000"), Value: true if opened
const openedOrigins = new Map<string, boolean>();

// Check if URL is localhost
function isLocalhostUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

// Get origin from URL
function getOrigin(url: string | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) return;

    if (isLocalhostUrl(tab.url)) {
        try {
            // Localhost: remember this origin and open sidepanel
            const origin = getOrigin(tab.url);
            if (origin) {
                openedOrigins.set(origin, true);
            }
            // Just open it - Chrome handles the panel path from manifest
            await chrome.sidePanel.open({ tabId: tab.id });
            console.log(`[VDev] Opened sidepanel for ${origin}`);
        } catch (error) {
            console.error('[VDev] Error opening sidepanel:', error);
        }
    } else {
        // Non-localhost: show notification badge
        try {
            await chrome.action.setBadgeText({ text: '!', tabId: tab.id });
            await chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId: tab.id });

            // Clear badge after 2 seconds
            setTimeout(async () => {
                try {
                    await chrome.action.setBadgeText({ text: '', tabId: tab.id });
                } catch { }
            }, 2000);
        } catch (error) {
            console.error('[VDev] Error setting badge:', error);
        }
        console.log('[VDev] Cannot open sidepanel on non-localhost page');
    }
});

// Listen for tab activation to auto-restore sidepanel on localhost
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (!tab.url) return;

        const origin = getOrigin(tab.url);
        const isLocalhost = isLocalhostUrl(tab.url);

        if (isLocalhost && origin && openedOrigins.get(origin)) {
            // Localhost with previously opened sidepanel: auto-open
            await chrome.sidePanel.open({ tabId: activeInfo.tabId });
            console.log(`[VDev] Auto-restored sidepanel for ${origin}`);
        }
        // For non-localhost, the sidepanel content will show "not supported" message
        // and the user can close it manually
    } catch (error) {
        console.error('[VDev] Error handling tab activation:', error);
    }
});

// Listen for tab URL updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;

    try {
        const origin = getOrigin(changeInfo.url);
        const isLocalhost = isLocalhostUrl(changeInfo.url);

        if (isLocalhost && origin && openedOrigins.get(origin)) {
            // Navigation to localhost with previously opened sidepanel: auto-open
            await chrome.sidePanel.open({ tabId });
            console.log(`[VDev] Auto-restored sidepanel for ${origin} after navigation`);
        }
    } catch (error) {
        console.error('[VDev] Error handling tab update:', error);
    }
});

// Relay messages between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward messages from content script to side panel
    if (
        message.type === 'VDEV_ELEMENT_SELECTED' ||
        message.type === 'VDEV_SDK_READY' ||
        message.type === 'VDEV_INSPECT_STATE_CHANGED'
    ) {
        chrome.runtime.sendMessage(message);
    }
    return true;
});

// Listen for keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-inspect') {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id || !tab?.url) return;

            if (isLocalhostUrl(tab.url)) {
                // Send message to content script to toggle inspect mode
                await chrome.tabs.sendMessage(tab.id, { type: 'VDEV_TOGGLE_INSPECT' });
                console.log('[VDev] Toggled inspect mode via keyboard shortcut');
            } else {
                console.log('[VDev] Cannot toggle inspect on non-localhost page');
            }
        } catch (error) {
            console.error('[VDev] Error handling keyboard shortcut:', error);
        }
    }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('[VDev Extension] Installed');
});

