chrome.runtime.onInstalled.addListener(() => {
  console.log('UXCheck installed');
});

// Toolbar click — inject the floating panel into the active tab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['panel.js'] });
  } catch (e) {
    console.error('UXCheck: could not inject panel', e);
  }
});

// Relay StartAudit from panel to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_StartAudit') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_StartAudit' });
    });
  }

  // Relay Highlight from panel to content script
  if (message.type === 'UXCheck_Highlight') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_Highlight', selector: message.selector });
    });
  }

  // Store results per tab, relay to panel
  if (message.type === 'UXCheck_AuditResults' && sender.tab) {
    const key = `tab_${sender.tab.id}`;
    chrome.storage.session.set({ [key]: { data: message.data, report: message.report } });
    // Relay to all frames in the tab (the panel lives in the page)
    chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {});
  }

  // Panel asking for cached results
  if (message.type === 'UXCheck_GetCached') {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab) { sendResponse(null); return; }
      const stored = await chrome.storage.session.get(`tab_${tab.id}`);
      sendResponse(stored[`tab_${tab.id}`] || null);
    });
    return true; // async response
  }

  // PDF export — open print window from service worker context
  if (message.type === 'UXCheck_ExportPDF') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_OpenPDF', report: message.report });
      }
    });
  }
});

// Clear cached results when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.session.remove(`tab_${tabId}`);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  chrome.storage.session.remove(`tab_${tabId}`);
});
