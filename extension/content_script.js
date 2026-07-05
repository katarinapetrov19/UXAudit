console.log('UXCheck content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UXCheck_StartAudit') {
    runAudit();
  }
});

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
