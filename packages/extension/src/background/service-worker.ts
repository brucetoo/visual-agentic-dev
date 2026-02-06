// Background Service Worker for Visual Dev Tool

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Relay messages between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward element selection from content script to side panel
    if (message.type === 'VDEV_ELEMENT_SELECTED' || message.type === 'VDEV_SDK_READY') {
        chrome.runtime.sendMessage(message);
    }
    return true;
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('[VDev Extension] Installed');
});
