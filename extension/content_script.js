console.log('UXCheck content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_Ping') { sendResponse({ ok: true }); return; }
  if (message.type === 'UXCheck_StartAudit') runAudit();
  if (message.type === 'UXCheck_GetPageStructure') {
    sendResponse(extractPageStructure());
    return;
  }
  if (message.type === 'UXCheck_Highlight') highlightElement(message.selector);
  if (message.type === 'UXCheck_OpenPDF' && message.report) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(window.UXCheckEngine.generatePrintHTML(message.report));
      win.document.close();
    }
  }
});

// Inject keyframe style once — used by the overlay div
(function() {
  if (document.getElementById('__uxcheck_style__')) return;
  const s = document.createElement('style');
  s.id = '__uxcheck_style__';
  s.textContent = `
    @keyframes __uxcheck_pulse__ {
      0%   { box-shadow: 0 0 0 0px rgba(249,115,22,0.6); }
      50%  { box-shadow: 0 0 0 8px rgba(249,115,22,0.0); }
      100% { box-shadow: 0 0 0 0px rgba(249,115,22,0.0); }
    }
    #__uxcheck_overlay__ {
      position: fixed !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      border: 3px solid #f97316 !important;
      border-radius: 6px !important;
      background: rgba(249,115,22,0.06) !important;
      animation: __uxcheck_pulse__ 0.7s ease-out 3 !important;
      transition: top 0.1s, left 0.1s, width 0.1s, height 0.1s !important;
      box-sizing: border-box !important;
    }
  `;
  document.documentElement.appendChild(s);
})();

function highlightElement(selector) {
  // Remove any previous overlay
  const prev = document.getElementById('__uxcheck_overlay__');
  if (prev) prev.remove();

  let el = null;
  try { el = document.querySelector(selector); } catch (e) {}
  if (!el) return;

  function drawOverlay() {
    const existing = document.getElementById('__uxcheck_overlay__');
    if (existing) existing.remove();

    const r = el.getBoundingClientRect();
    // Only draw if element is actually in the viewport
    if (r.width === 0 || r.height === 0) return;

    const overlay = document.createElement('div');
    overlay.id = '__uxcheck_overlay__';
    Object.assign(overlay.style, {
      top:    (r.top    - 4) + 'px',
      left:   (r.left   - 4) + 'px',
      width:  (r.width  + 8) + 'px',
      height: (r.height + 8) + 'px',
    });
    document.documentElement.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3000);
  }

  // Use IntersectionObserver to draw the overlay only after the element
  // is actually visible — eliminates all scroll-timing issues
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      // Small rAF delay so the browser has painted the new scroll position
      requestAnimationFrame(() => requestAnimationFrame(drawOverlay));
    }
  }, { threshold: 0.1 });

  observer.observe(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Fallback: if element never intersects (e.g. hidden), draw after 1s anyway
  setTimeout(() => { observer.disconnect(); drawOverlay(); }, 1000);
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

function extractPageStructure() {
  const getText = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);

  return {
    url: location.href,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    headings: Array.from(document.querySelectorAll('h1,h2,h3,h4')).slice(0, 20).map(h => ({
      level: h.tagName.toLowerCase(), text: getText(h)
    })),
    navigation: Array.from(document.querySelectorAll('nav a, [role="navigation"] a')).slice(0, 20).map(a => getText(a)).filter(Boolean),
    ctas: Array.from(document.querySelectorAll('button, input[type="submit"], a[class*="btn"], a[class*="button"]'))
      .slice(0, 20).map(el => getText(el)).filter(Boolean),
    forms: Array.from(document.querySelectorAll('form')).slice(0, 5).map(form => ({
      fields: Array.from(form.querySelectorAll('label, input:not([type="hidden"]), select, textarea')).slice(0, 15).map(el => getText(el)).filter(Boolean)
    })),
    paragraphs: Array.from(document.querySelectorAll('p')).slice(0, 10).map(p => getText(p)).filter(t => t.length > 30),
    images: Array.from(document.querySelectorAll('img[alt]')).slice(0, 10).map(img => img.getAttribute('alt')).filter(Boolean),
  };
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
