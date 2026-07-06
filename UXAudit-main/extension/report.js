/**
 * Assembles audit results into a ranked report object and provides export helpers.
 */
window.UXCheckEngine = window.UXCheckEngine || {};

window.UXCheckEngine.generateReport = (issues) => {
  const report = {
    summary: {
      total: issues.length,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0
    },
    byCategory: {},
    bySeverity: {
      Critical: [],
      Major: [],
      Minor: [],
      Info: []
    },
    timestamp: new Date().toISOString(),
    url: window.location.href
  };

  issues.forEach(issue => {
    const severity = issue.severity || 'Info';
    report.summary[severity.toLowerCase()]++;

    if (report.bySeverity[severity]) {
      report.bySeverity[severity].push(issue);
    }

    const category = issue.type || 'General';
    if (!report.byCategory[category]) {
      report.byCategory[category] = [];
    }
    report.byCategory[category].push(issue);
  });

  return report;
};

/**
 * Converts issues to CSV string.
 */
window.UXCheckEngine.convertToCSV = (issues) => {
  const headers = ['Type', 'Severity', 'Message', 'Element', 'Selector', 'WCAG Ref', 'Recommendation'];
  const rows = issues.map(i => [
    i.type,
    i.severity,
    `"${(i.message || '').replace(/"/g, '""')}"`,
    i.element,
    `"${(i.selector || '').replace(/"/g, '""')}"`,
    i.wcagRef || '',
    `"${(i.recommendation || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

/**
 * Generates HTML for a printable report.
 */
window.UXCheckEngine.generatePrintHTML = (report) => {
  const sevColors = {
    Critical: '#ef4444',
    Major: '#f59e0b',
    Minor: '#eab308',
    Info: '#3b82f6'
  };

  let issuesHtml = '';
  ['Critical', 'Major', 'Minor', 'Info'].forEach(sev => {
    const issues = report.bySeverity[sev];
    if (issues.length > 0) {
      issuesHtml += `<h2>${sev} Issues (${issues.length})</h2>`;
      issuesHtml += issues.map(i => `
        <div style="border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 15px; border-left: 5px solid ${sevColors[sev]}">
          <div style="font-weight: bold; margin-bottom: 5px;">${i.type} - ${i.message}</div>
          <div style="font-family: monospace; font-size: 12px; color: #64748b;">Selector: ${i.selector}</div>
          ${i.recommendation ? `<div style="margin-top: 10px; font-style: italic;">Recommendation: ${i.recommendation}</div>` : ''}
          ${i.wcagRef ? `<div style="margin-top: 5px; font-size: 11px;">WCAG Reference: ${i.wcagRef}</div>` : ''}
        </div>
      `).join('');
    }
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>UXCheck Audit Report - ${new URL(report.url).hostname}</title>
      <style>
        body { font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #2563eb; }
        .summary { display: flex; gap: 20px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
        .stat { text-align: center; }
        .stat-val { font-size: 24px; font-weight: bold; }
        .stat-lab { font-size: 12px; color: #64748b; text-transform: uppercase; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()">Print to PDF</button>
      </div>
      <h1>UXCheck Audit Report</h1>
      <p><strong>URL:</strong> ${report.url}</p>
      <p><strong>Date:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
      
      <div class="summary">
        <div class="stat"><div class="stat-val">${report.summary.total}</div><div class="stat-lab">Total</div></div>
        <div class="stat"><div class="stat-val" style="color: ${sevColors.Critical}">${report.summary.critical}</div><div class="stat-lab">Critical</div></div>
        <div class="stat"><div class="stat-val" style="color: ${sevColors.Major}">${report.summary.major}</div><div class="stat-lab">Major</div></div>
        <div class="stat"><div class="stat-val" style="color: ${sevColors.Minor}">${report.summary.minor}</div><div class="stat-lab">Minor</div></div>
      </div>

      ${issuesHtml}
    </body>
    </html>
  `;
};
