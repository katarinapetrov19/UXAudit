console.log('UXCheck content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_StartAudit') runAudit();
  if (message.type === 'UXCheck_Highlight') highlightElement(message.selector);
});

function highlightElement(selector) {
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
    top: rect.top + 'px', left: rect.left + 'px',
    width: rect.width + 'px', height: rect.height + 'px',
    outline: '3px solid #f97316', outlineOffset: '2px',
    borderRadius: '4px', pointerEvents: 'none',
    zIndex: '2147483647', transition: 'opacity 0.4s', opacity: '1',
    boxShadow: '0 0 0 4px rgba(249,115,22,0.2)',
  });
  document.body.appendChild(overlay);

  setTimeout(() => {
    const r = el.getBoundingClientRect();
    overlay.style.top = r.top + 'px'; overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
  }, 400);
  setTimeout(() => { overlay.style.opacity = '0'; }, 2500);
  setTimeout(() => { overlay.remove(); }, 3000);
}

function y() { return new Promise(r => setTimeout(r, 0)); }

function safeRun(name, fn) {
  try { const r = fn(); return Array.isArray(r) ? r : []; }
  catch (e) { console.warn('UXCheck:', name, e); return []; }
}

async function safeRunAsync(name, fn) {
  try { const r = await fn(); return Array.isArray(r) ? r : []; }
  catch (e) { console.warn('UXCheck:', name, e); return []; }
}

function finish(issues) {
  const order = { Critical: 0, Major: 1, Info: 2, Minor: 3 };
  issues.sort((a, b) => (order[a.severity]??4) - (order[b.severity]??4));
  const report = window.UXCheckEngine.generateReport(issues);
  console.log(`UXCheck done: ${issues.length} issues`);
  chrome.runtime.sendMessage({ type: 'UXCheck_AuditResults', data: issues, report });
}

async function runAudit() {
  console.log('UXCheck starting...');
  if (!window.UXCheckEngine) { console.error('Engine not found'); return; }

  const engine = window.UXCheckEngine;
  let all = [];

  // Hard 10s safety net — always delivers results
  const timer = setTimeout(() => {
    console.warn('UXCheck: timeout — sending partial results');
    finish(all);
  }, 10000);

  try {
    // Contrast — only 25 elements, yield every 5
    const els = Array.from(document.querySelectorAll('h1,h2,h3,p,a,button'))
      .filter(el => (el.textContent||'').trim().length > 0).slice(0, 25);
    for (let i = 0; i < els.length; i++) {
      all = all.concat(safeRun('contrast', () => engine.checkContrast(els[i])));
      if (i % 5 === 4) await y();
    }

    await y(); all = all.concat(safeRun('headings',              () => engine.checkHeadings(document)));
    await y(); all = all.concat(safeRun('landmarks',             () => engine.checkLandmarks(document)));
    await y(); all = all.concat(await safeRunAsync('aria',       () => engine.checkAria(document)));
    await y(); all = all.concat(await safeRunAsync('keyboard',   () => engine.checkKeyboard(document)));
    await y(); all = all.concat(await safeRunAsync('heuristics', () => engine.checkHeuristics(document)));
    await y(); all = all.concat(await safeRunAsync('typography', () => engine.checkTypography(document)));
    await y(); all = all.concat(await safeRunAsync('hierarchy',  () => engine.checkHierarchy(document)));
    await y(); all = all.concat(await safeRunAsync('responsive', () => engine.checkResponsive(document)));
    await y(); all = all.concat(await safeRunAsync('visual',     () => engine.checkVisual(document)));

    clearTimeout(timer);
    finish(all);
  } catch (e) {
    console.error('UXCheck error:', e);
    clearTimeout(timer);
    finish(all);
  }
}
