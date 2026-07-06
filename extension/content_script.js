console.log('UXCheck content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_StartAudit') runAudit();
  if (message.type === 'UXCheck_Highlight') highlightElement(message.selector);
  if (message.type === 'UXCheck_OpenPDF' && message.report) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(window.UXCheckEngine.generatePrintHTML(message.report));
      win.document.close();
    }
  }
});

// Inject keyframe style once
(function() {
  if (document.getElementById('__uxcheck_style__')) return;
  const s = document.createElement('style');
  s.id = '__uxcheck_style__';
  s.textContent = `
    @keyframes __uxcheck_pulse__ {
      0%   { outline-color: #f97316; box-shadow: 0 0 0 4px rgba(249,115,22,0.4); }
      50%  { outline-color: #fb923c; box-shadow: 0 0 0 8px rgba(249,115,22,0.1); }
      100% { outline-color: #f97316; box-shadow: 0 0 0 4px rgba(249,115,22,0.4); }
    }
    .__uxcheck_highlight__ {
      outline: 3px solid #f97316 !important;
      outline-offset: 3px !important;
      animation: __uxcheck_pulse__ 0.8s ease-in-out 3 !important;
      border-radius: 4px !important;
      transition: none !important;
    }
  `;
  document.documentElement.appendChild(s);
})();

function highlightElement(selector) {
  // Remove previous highlight
  document.querySelectorAll('.__uxcheck_highlight__').forEach(el => el.classList.remove('__uxcheck_highlight__'));

  let el = null;
  try { el = document.querySelector(selector); } catch (e) {}
  if (!el) return;

  // Scroll first, then apply class so element is in view
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Apply highlight class directly on the element — no positioning math needed
  setTimeout(() => {
    el.classList.add('__uxcheck_highlight__');
    setTimeout(() => el.classList.remove('__uxcheck_highlight__'), 2500);
  }, 300); // small delay so scroll settles first
}

const y = () => new Promise(r => setTimeout(r, 0));

function safeRun(name, fn) {
  try { const r = fn(); return Array.isArray(r) ? r : []; }
  catch (e) { console.warn('UXCheck:', name, e.message); return []; }
}

async function safeRunAsync(name, fn) {
  try { const r = await fn(); return Array.isArray(r) ? r : []; }
  catch (e) { console.warn('UXCheck:', name, e.message); return []; }
}

const STAMP_ATTR = 'data-uxcheck-id';

function clearStamps() {
  document.querySelectorAll(`[${STAMP_ATTR}]`).forEach(el => el.removeAttribute(STAMP_ATTR));
}

function stampIssues(issues) {
  clearStamps();
  let counter = 0;
  issues.forEach(issue => {
    // Skip issues that don't point to a specific element
    if (!issue.selector || ['body','head','multiple','title','html',
        'meta[name="viewport"]','a[target="_blank"]'].includes(issue.selector)) return;
    if (issue.element === 'multiple') return;

    try {
      // Try to find the element — skip if selector is ambiguous (matches many)
      const els = document.querySelectorAll(issue.selector);
      if (els.length === 0) return;

      const el = els[0];
      const id = ++counter;
      el.setAttribute(STAMP_ATTR, id);
      issue.selector = `[${STAMP_ATTR}="${id}"]`;
    } catch (e) {
      // Invalid selector — leave as-is
    }
  });

  // Auto-clean stamps after 60s so the page isn't permanently modified
  setTimeout(clearStamps, 60000);
}

function finish(issues) {
  stampIssues(issues);
  const order = { Critical:0, Major:1, Info:2, Minor:3 };
  issues.sort((a,b) => (order[a.severity]??4) - (order[b.severity]??4));
  const report = window.UXCheckEngine.generateReport(issues);
  console.log('UXCheck done:', issues.length, 'issues');
  chrome.runtime.sendMessage({ type:'UXCheck_AuditResults', data:issues, report });
}

async function runAudit() {
  console.log('UXCheck: starting');
  clearStamps(); // remove any stamps from previous audit
  if (!window.UXCheckEngine) { console.error('UXCheck: engine not found'); return; }
  const engine = window.UXCheckEngine;
  let all = [];

  // Structural checks — fast, no getComputedStyle loops
  await y(); all = all.concat(safeRun('headings',              () => engine.checkHeadings(document)));
  await y(); all = all.concat(safeRun('landmarks',             () => engine.checkLandmarks(document)));
  await y(); all = all.concat(await safeRunAsync('aria',       () => engine.checkAria(document)));
  await y(); all = all.concat(await safeRunAsync('keyboard',   () => engine.checkKeyboard(document)));
  await y(); all = all.concat(await safeRunAsync('heuristics', () => engine.checkHeuristics(document)));
  await y(); all = all.concat(await safeRunAsync('typography', () => engine.checkTypography(document)));
  await y(); all = all.concat(await safeRunAsync('hierarchy',  () => engine.checkHierarchy(document)));
  await y(); all = all.concat(await safeRunAsync('responsive', () => engine.checkResponsive(document)));
  await y(); all = all.concat(await safeRunAsync('visual',     () => engine.checkVisual(document)));
  await y(); all = all.concat(await safeRunAsync('layout',     () => engine.checkLayout(document)));
  await y(); all = all.concat(await safeRunAsync('lawsofux',   () => engine.checkLawsOfUX(document)));

  // Contrast — run last, small sample, each element gets its own yield
  await y();
  const contrastEls = Array.from(document.querySelectorAll('h1,h2,h3,p,button'))
    .filter(el => (el.textContent||'').trim().length > 0).slice(0, 15);
  for (const el of contrastEls) {
    await y(); // yield BEFORE every single contrast check — never blocks
    all = all.concat(safeRun('contrast', () => engine.checkContrast(el)));
  }

  finish(all);
}
