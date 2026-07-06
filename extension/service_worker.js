chrome.runtime.onInstalled.addListener(() => {
  console.log('UXCheck installed');
});

// Store audit results per tab so popup can restore them on reopen
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'UXCheck_AuditResults' && sender.tab) {
    chrome.storage.session.set({ [`tab_${sender.tab.id}`]: { data: message.data, report: message.report } });
  }
});

// Clear stored results when tab navigates away
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.session.remove(`tab_${tabId}`);
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  chrome.storage.session.remove(`tab_${tabId}`);
});
