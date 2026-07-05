let currentIssues = [];
let currentReport = null;

document.getElementById('runAudit').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const button = document.getElementById('runAudit');
  const loader = document.getElementById('loader');
  const resultsDiv = document.getElementById('results');
  const statsDiv = document.getElementById('stats');
  const exportActions = document.getElementById('export-actions');

  button.disabled = true;
  button.innerText = 'Scanning...';
  loader.style.display = 'block';
  resultsDiv.innerHTML = '';
  statsDiv.style.display = 'none';
  exportActions.style.display = 'none';

  chrome.tabs.sendMessage(tab.id, { type: 'UXCheck_StartAudit' });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UXCheck_AuditResults') {
    const resultsDiv = document.getElementById('results');
    const statsDiv = document.getElementById('stats');
    const loader = document.getElementById('loader');
    const button = document.getElementById('runAudit');
    const exportActions = document.getElementById('export-actions');

    button.disabled = false;
    button.innerText = 'Run Again';
    loader.style.display = 'none';
    statsDiv.style.display = 'grid';
    exportActions.style.display = 'grid';

    currentIssues = message.data;
    currentReport = message.report;
    
    // Update stats
    document.getElementById('critical-count').innerText = currentReport.summary.critical;
    document.getElementById('major-count').innerText = currentReport.summary.major;
    document.getElementById('minor-count').innerText = currentReport.summary.minor;
    document.getElementById('info-count').innerText = currentReport.summary.info;

    if (currentIssues.length === 0) {
      resultsDiv.innerHTML = '<div class="empty-state">🎉 No issues found! Your page is looking great.</div>';
      exportActions.style.display = 'none';
      return;
    }

    // Group issues by severity for display
    const severities = ['Critical', 'Major', 'Minor', 'Info'];
    let html = '';

    severities.forEach(sev => {
      const sevIssues = currentIssues.filter(i => i.severity === sev);
      if (sevIssues.length > 0) {
        html += `<div style="margin: 16px 0 8px 0; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); padding-bottom: 6px;">${sev} &nbsp;·&nbsp; ${sevIssues.length}</div>`;
        html += sevIssues.map((issue, index) => `
          <div class="issue-card" data-severity="${sev}" data-index="${index}">
            <div class="issue-header">
              <span class="severity-badge ${issue.severity}">${issue.severity}</span>
              <span class="issue-type">${issue.type}</span>
            </div>
            <div class="issue-message">${issue.message}</div>
            <div class="issue-details">
              <div class="detail-item">
                <span class="detail-label">Element:</span> ${issue.element}
              </div>
              <div class="detail-item">
                <span class="detail-label">Selector:</span> <span class="issue-selector">${issue.selector}</span>
              </div>
              ${issue.wcagRef ? `<div class="detail-item"><span class="detail-label">WCAG:</span> ${issue.wcagRef}</div>` : ''}
              ${issue.recommendation ? `<div class="detail-item"><span class="detail-label">Recommendation:</span> ${issue.recommendation}</div>` : ''}
            </div>
          </div>
        `).join('');
      }
    });

    resultsDiv.innerHTML = html;

    // Add click events for expanding
    document.querySelectorAll('.issue-card').forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
    });
  }
});

// CSV Export
document.getElementById('exportCSV').addEventListener('click', () => {
  if (!currentIssues.length) return;
  
  const csv = window.UXCheckEngine.convertToCSV(currentIssues);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const filename = `uxcheck-audit-${new URL(currentReport.url).hostname}-${new Date().toISOString().split('T')[0]}.csv`;
  
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

// PDF Export (Print-based)
document.getElementById('exportPDF').addEventListener('click', () => {
  if (!currentReport) return;
  
  const html = window.UXCheckEngine.generatePrintHTML(currentReport);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  // The print button is inside the HTML for the user to click
});
