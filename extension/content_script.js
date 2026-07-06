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

async function runAudit() {
  console.log('Starting UXCheck Audit...');
  
  if (!window.UXCheckEngine) {
    console.error('UXCheck Engine not found!');
    return;
  }

  const engine = window.UXCheckEngine;
  let allIssues = [];

  // Run all checks
  // 1. Contrast
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, a, button');
  textElements.forEach(el => {
    if ((el.textContent || '').trim().length > 0) {
      allIssues = allIssues.concat(engine.checkContrast(el));
    }
  });

  // 2. Headings
  allIssues = allIssues.concat(engine.checkHeadings(document));

  // 3. Landmarks
  allIssues = allIssues.concat(engine.checkLandmarks(document));

  // 4. ARIA
  allIssues = allIssues.concat(engine.checkAria(document));

  // 5. Keyboard
  allIssues = allIssues.concat(engine.checkKeyboard(document));

  // 6. Heuristics
  allIssues = allIssues.concat(engine.checkHeuristics(document));

  // 7. Typography
  allIssues = allIssues.concat(engine.checkTypography(document));

  // 8. Visual Hierarchy
  allIssues = allIssues.concat(engine.checkHierarchy(document));

  // 9. Responsive Design
  allIssues = allIssues.concat(engine.checkResponsive(document));

  // Sort by severity: Critical > Major > Minor > Info
  const severityOrder = { 'Critical': 0, 'Major': 1, 'Minor': 2, 'Info': 3 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Generate Report
  const report = engine.generateReport(allIssues);

  console.log(`Audit complete. Found ${allIssues.length} issues.`, report);

  chrome.runtime.sendMessage({
    type: 'UXCheck_AuditResults',
    data: allIssues,
    report: report
  });
}
