console.log('UXCheck content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_StartAudit') {
    runAudit();
  }
  if (message.type === 'UXCheck_Highlight') {
    highlightElement(message.selector);
  }
});

function highlightElement(selector) {
  // Remove any existing highlight
  const prev = document.getElementById('__uxcheck_highlight__');
  if (prev) prev.remove();

  let el = null;
  try { el = document.querySelector(selector); } catch (e) {}
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const overlay = document.createElement('div');
  overlay.id = '__uxcheck_highlight__';

  const rect = el.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: 'fixed',
    top: rect.top + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
    outline: '3px solid #f97316',
    outlineOffset: '2px',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '2147483647',
    transition: 'opacity 0.4s',
    opacity: '1',
    boxShadow: '0 0 0 4px rgba(249,115,22,0.2)',
  });

  document.body.appendChild(overlay);

  // Reposition after scroll settles
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    overlay.style.top  = r.top  + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width  = r.width  + 'px';
    overlay.style.height = r.height + 'px';
  }, 400);

  // Fade out after 2.5s
  setTimeout(() => { overlay.style.opacity = '0'; }, 2500);
  setTimeout(() => { overlay.remove(); }, 3000);
}

// Yield to browser between tasks so the page never freezes
function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function safeRun(name, fn) {
  try {
    const result = fn();
    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.warn(`UXCheck: ${name} failed —`, e);
    return [];
  }
}

async function runAudit() {
  console.log('Starting UXCheck Audit...');

  if (!window.UXCheckEngine) {
    console.error('UXCheck Engine not found!');
    return;
  }

  const engine = window.UXCheckEngine;
  let allIssues = [];

  // 1. Contrast — sample up to 100 visible leaf-text elements, yield between batches
  const textElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button, label'))
    .filter(el => {
      const t = (el.textContent || '').trim();
      if (t.length === 0) return false;
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    })
    .slice(0, 100);

  for (let i = 0; i < textElements.length; i++) {
    allIssues = allIssues.concat(safeRun('contrast', () => engine.checkContrast(textElements[i])));
    if (i % 20 === 19) await yieldToMain(); // yield every 20 elements
  }

  // 2–9. Each module runs then yields before the next
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('headings',   () => engine.checkHeadings(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('landmarks',  () => engine.checkLandmarks(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('aria',       () => engine.checkAria(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('keyboard',   () => engine.checkKeyboard(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('heuristics', () => engine.checkHeuristics(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('typography', () => engine.checkTypography(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('hierarchy',  () => engine.checkHierarchy(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('responsive', () => engine.checkResponsive(document)));
  await yieldToMain();
  allIssues = allIssues.concat(safeRun('visual',     () => engine.checkVisual(document)));

  // Sort by severity
  const severityOrder = { Critical: 0, Major: 1, Info: 2, Minor: 3 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const report = engine.generateReport(allIssues);
  console.log(`Audit complete. Found ${allIssues.length} issues.`, report);

  chrome.runtime.sendMessage({
    type: 'UXCheck_AuditResults',
    data: allIssues,
    report: report
  });
}
