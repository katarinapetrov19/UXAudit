chrome.runtime.onInstalled.addListener(() => {
  // Allow the side panel on all pages by default
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Also set it on startup in case the service worker restarts
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Auto-rescan when user navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only trigger when the page has fully loaded (not just tab title changes etc.)
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  // Tell the side panel a new page has loaded so it can show the rescan prompt
  chrome.runtime.sendMessage({ type: 'UXCheck_PageNavigated', tabId, url: tab.url }).catch(() => {});
});
