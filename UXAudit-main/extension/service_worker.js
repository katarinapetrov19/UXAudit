chrome.runtime.onInstalled.addListener(() => {
  console.log('UXCheck installed');
});

const ENGINE_FILES = [
  'report.js',
  'engine/contrast.js',
  'engine/headings.js',
  'engine/landmarks.js',
  'engine/aria.js',
  'engine/keyboard.js',
  'engine/heuristics.js',
  'engine/typography.js',
  'engine/hierarchy.js',
  'engine/responsive.js',
  'engine/visual.js',
  'engine/layout.js',
  'engine/lawsofux.js',
  'content_script.js',
];

async function ensureContentScript(tabId) {
  // Ping the content script — if it responds, it's already running
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'UXCheck_Ping' });
    return; // already loaded
  } catch (e) {
    // Not loaded — inject everything
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ENGINE_FILES });
}

// Toolbar click — ensure content scripts are loaded, then inject panel
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
  try {
    await ensureContentScript(tab.id);
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['panel.js'] });
  } catch (e) {
    console.error('UXCheck: injection failed', e);
  }
});

// Relay StartAudit — also ensure content script is loaded before sending
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_Ping') {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'UXCheck_StartAudit') {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab) return;
      try {
        await ensureContentScript(tab.id);
        chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_StartAudit' });
      } catch (e) {
        console.error('UXCheck: could not start audit', e);
      }
    });
  }

  if (message.type === 'UXCheck_Highlight') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_Highlight', selector: message.selector }).catch(() => {});
    });
  }

  if (message.type === 'UXCheck_AuditResults' && sender.tab) {
    const key = `tab_${sender.tab.id}`;
    chrome.storage.session.set({ [key]: { data: message.data, report: message.report } });
    chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {});
  }

  if (message.type === 'UXCheck_GetCached') {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab) { sendResponse(null); return; }
      const stored = await chrome.storage.session.get(`tab_${tab.id}`);
      sendResponse(stored[`tab_${tab.id}`] || null);
    });
    return true;
  }

  if (message.type === 'UXCheck_ExportPDF') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_OpenPDF', report: message.report }).catch(() => {});
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
