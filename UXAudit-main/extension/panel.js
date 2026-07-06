/**
 * Injected floating panel — draggable, shadow DOM isolated.
 * Replaces the popup. Injected by the service worker on toolbar click.
 */
(function () {
  const PANEL_ID = '__uxcheck_panel__';

  // If already open, toggle it off
  const existing = document.getElementById(PANEL_ID);
  if (existing) { existing.remove(); return; }

  // ── Build shadow host ────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = PANEL_ID;
  Object.assign(host.style, {
    position: 'fixed',
    top: '80px',
    right: '20px',
    width: '400px',
    zIndex: '2147483646',
    fontFamily: 'sans-serif',
  });
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }

    :host { all: initial; }

    #panel {
      width: 400px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: #F2F1ED;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      color: #0a0a0a;
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.08);
    }

    .header {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: grab;
      user-select: none;
      background: rgba(242,241,237,0.95);
      backdrop-filter: blur(8px);
      border-radius: 16px 16px 0 0;
      flex-shrink: 0;
    }

    .header:active { cursor: grabbing; }

    .header-left { display: flex; align-items: center; gap: 6px; }

    .drag-handle {
      display: flex; flex-direction: column; gap: 3px; opacity: 0.3;
    }
    .drag-handle span { display: block; width: 14px; height: 1.5px; background: #0a0a0a; border-radius: 2px; }

    .title { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
    .version { font-size: 10px; color: #737373; }

    .close-btn {
      width: 22px; height: 22px; border-radius: 999px;
      border: none; background: rgba(0,0,0,0.06);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #737373; transition: background 0.12s;
      padding: 0; line-height: 1;
    }
    .close-btn:hover { background: rgba(0,0,0,0.12); color: #0a0a0a; }

    .body { padding: 12px; overflow-y: auto; flex: 1; min-height: 0; }

    .btn {
      display: block; width: 100%; padding: 9px 16px;
      background: #0a0a0a; color: white; border: none;
      border-radius: 999px; font-family: 'DM Sans', sans-serif;
      font-weight: 500; font-size: 13px; cursor: pointer;
      transition: background 0.15s; margin-bottom: 12px;
    }
    .btn:hover { background: #262626; }
    .btn:disabled { background: #a3a3a3; cursor: not-allowed; }

    .loader { display: none; text-align: center; font-size: 12px; color: #737373; margin-bottom: 12px; }

    .stats {
      display: grid; grid-template-columns: repeat(4,1fr);
      gap: 6px; margin-bottom: 12px;
    }
    .stat-item {
      text-align: center; padding: 7px 4px;
      background: rgba(255,255,255,0.7);
      border-radius: 12px; border: 1px solid rgba(0,0,0,0.08);
    }
    .stat-value { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
    .stat-label { font-size: 9px; color: #737373; text-transform: uppercase; letter-spacing: 0.04em; }

    .export-row {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 6px; margin-bottom: 12px;
    }
    .export-btn {
      padding: 7px 12px; background: rgba(255,255,255,0.7);
      color: #0a0a0a; border: 1px solid rgba(0,0,0,0.08);
      border-radius: 999px; font-family: 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 500; cursor: pointer;
      transition: background 0.12s;
    }
    .export-btn:hover { background: white; }
    .pro-badge {
      font-size: 8px; background: #0a0a0a; color: white;
      padding: 1px 5px; border-radius: 999px; margin-left: 4px;
      vertical-align: middle; font-weight: 600;
    }

    .filters { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
    .filter-btn {
      padding: 3px 9px; border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.7);
      font-family: 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 500; color: #737373;
      cursor: pointer; transition: all 0.12s;
    }
    .filter-btn:hover { color: #0a0a0a; border-color: rgba(0,0,0,0.2); }
    .filter-btn.active { background: #0a0a0a; color: white; border-color: #0a0a0a; }

    .results { }

    .empty-state { text-align: center; padding: 32px 16px; color: #737373; font-size: 13px; }

    .group-label {
      font-size: 10px; font-weight: 600; color: #737373;
      text-transform: uppercase; letter-spacing: 0.06em;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding-bottom: 5px; margin: 14px 0 7px;
    }

    .issue-card {
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 14px; padding: 10px; margin-bottom: 6px;
      cursor: pointer; transition: background 0.12s;
    }
    .issue-card:hover { background: #fff; }

    .issue-header { display: flex; align-items: center; margin-bottom: 6px; }

    .badge {
      font-size: 9px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.03em; padding: 2px 6px;
      border-radius: 999px; margin-right: 5px; color: white;
    }
    .badge.Critical { background: #dc2626; }
    .badge.Major    { background: #d97706; }
    .badge.Minor    { background: #ca8a04; }
    .badge.Info     { background: #6b7280; }

    .issue-type { font-size: 10px; font-weight: 500; color: #737373; }
    .issue-msg { font-size: 13px; font-weight: 500; line-height: 1.4; }

    .issue-detail {
      display: none; font-size: 11px;
      border-top: 1px solid rgba(0,0,0,0.08);
      padding-top: 7px; margin-top: 7px;
    }
    .issue-card.open .issue-detail { display: block; }

    .detail-row { margin-bottom: 3px; }
    .detail-key { font-weight: 600; color: #737373; }
    .mono {
      font-family: monospace; background: #f1f5f9;
      padding: 1px 4px; border-radius: 3px; color: #475569;
      font-size: 10px;
    }
    .lib-tip {
      margin-top: 5px; padding: 5px 7px;
      background: #f1f5f9; border-radius: 7px;
      font-size: 10px; color: #475569; line-height: 1.4;
    }
    .lib-tip strong { color: #0a0a0a; }

    .show-btn {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 9px; background: #0a0a0a; color: white;
      border: none; border-radius: 999px;
      font-family: 'DM Sans', sans-serif; font-size: 10px;
      font-weight: 500; cursor: pointer; margin-top: 5px;
      transition: background 0.12s;
    }
    .show-btn:hover { background: #333; }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: #d4d2cc; border-radius: 3px; }
  `;
  shadow.appendChild(style);

  // ── Panel HTML ────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <div class="header" id="drag-handle">
      <div class="header-left">
        <div class="drag-handle"><span></span><span></span><span></span></div>
        <span class="title">UXCheck</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="version">v0.5.0</span>
        <button class="close-btn" id="close-btn">✕</button>
      </div>
    </div>
    <div class="body">
      <button class="btn" id="run-btn">Scan Current Page</button>
      <div class="loader" id="loader">Scanning page...</div>
      <div id="stats" style="display:none;" class="stats">
        <div class="stat-item"><div class="stat-value" id="c-count" style="color:#dc2626">0</div><div class="stat-label">Critical</div></div>
        <div class="stat-item"><div class="stat-value" id="m-count" style="color:#d97706">0</div><div class="stat-label">Major</div></div>
        <div class="stat-item"><div class="stat-value" id="mn-count" style="color:#ca8a04">0</div><div class="stat-label">Minor</div></div>
        <div class="stat-item"><div class="stat-value" id="i-count" style="color:#6b7280">0</div><div class="stat-label">Info</div></div>
      </div>
      <div id="export-row" style="display:none;" class="export-row">
        <button class="export-btn" id="export-pdf">Export PDF <span class="pro-badge">PRO</span></button>
        <button class="export-btn" id="export-csv">Export CSV <span class="pro-badge">PRO</span></button>
      </div>
      <div id="filters" style="display:none;" class="filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="accessibility">Accessibility</button>
        <button class="filter-btn" data-filter="typography">Typography</button>
        <button class="filter-btn" data-filter="layout">Layout</button>
        <button class="filter-btn" data-filter="ux">UX</button>
        <button class="filter-btn" data-filter="visual">Visual</button>
      </div>
      <div id="results"><div class="empty-state">Click the button above to start a UX audit on this page.</div></div>
    </div>
  `;
  shadow.appendChild(panel);

  // ── State ─────────────────────────────────────────────────────────────────
  let currentIssues = [];
  let currentReport = null;
  let currentFilter = 'all';

  const FILTER_GROUPS = {
    accessibility: ['ARIA','Contrast','Headings','Landmarks','Keyboard'],
    typography:    ['Typography'],
    layout:        ['Hierarchy','Responsive','Layout'],
    ux:            ['Heuristics', 'LawsOfUX'],
    visual:        ['Visual'],
  };

  // ── Restore saved position ────────────────────────────────────────────────
  chrome.storage.local.get('panelPos', ({ panelPos }) => {
    if (panelPos) {
      host.style.top  = panelPos.top;
      host.style.left = panelPos.left;
      host.style.right = 'auto';
    }
  });

  // ── Dragging ──────────────────────────────────────────────────────────────
  const dragHandle = shadow.getElementById('drag-handle');
  let dragging = false, ox = 0, oy = 0;

  dragHandle.addEventListener('mousedown', e => {
    dragging = true;
    const rect = host.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth  - host.offsetWidth));
    const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - host.offsetHeight));
    host.style.left  = x + 'px';
    host.style.top   = y + 'px';
    host.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    chrome.storage.local.set({ panelPos: { top: host.style.top, left: host.style.left } });
  });

  // ── Close ─────────────────────────────────────────────────────────────────
  shadow.getElementById('close-btn').addEventListener('click', () => host.remove());

  // ── Render helpers ────────────────────────────────────────────────────────
  function matchesFilter(issue) {
    if (currentFilter === 'all') return true;
    return (FILTER_GROUPS[currentFilter] || []).includes(issue.type);
  }

  function renderIssues() {
    const resultsEl = shadow.getElementById('results');
    const filtered = currentIssues.filter(matchesFilter);

    if (!currentIssues.length) {
      resultsEl.innerHTML = '<div class="empty-state">No issues found — page looks great!</div>';
      return;
    }
    if (!filtered.length) {
      resultsEl.innerHTML = '<div class="empty-state">No issues in this category.</div>';
      return;
    }

    const SEV_ORDER = ['Critical','Major','Info','Minor'];
    let html = '';
    SEV_ORDER.forEach(sev => {
      const group = filtered.filter(i => i.severity === sev);
      if (!group.length) return;
      html += `<div class="group-label">${sev} · ${group.length}</div>`;
      group.forEach(issue => {
        const canShow = issue.selector && !['body','head','multiple','title','html'].includes(issue.selector) && issue.element !== 'multiple';
        html += `
          <div class="issue-card">
            <div class="issue-header">
              <span class="badge ${sev}">${sev}</span>
              <span class="issue-type">${issue.type}</span>
            </div>
            <div class="issue-msg">${issue.message}</div>
            <div class="issue-detail">
              <div class="detail-row"><span class="detail-key">Element:</span> ${issue.element}</div>
              <div class="detail-row"><span class="detail-key">Selector:</span> <span class="mono">${issue.selector}</span></div>
              ${issue.wcagRef ? `<div class="detail-row"><span class="detail-key">WCAG:</span> ${issue.wcagRef}</div>` : ''}
              ${issue.recommendation ? `<div class="detail-row" style="margin-top:4px;line-height:1.4;">${issue.recommendation}</div>` : ''}
              ${issue.library ? `<div class="lib-tip"><strong>Library tip:</strong> ${issue.library}</div>` : ''}
              ${issue.law ? `<div class="lib-tip"><strong>Law:</strong> ${issue.law} — <a href="https://lawsofux.com/" target="_blank" rel="noopener" style="color:#2563eb;">lawsofux.com ↗</a></div>` : ''}
              ${canShow ? `<button class="show-btn" data-sel="${issue.selector.replace(/"/g,'&quot;')}">Show on page</button>` : ''}
            </div>
          </div>`;
      });
    });

    resultsEl.innerHTML = html;

    // Expand/collapse
    resultsEl.querySelectorAll('.issue-card').forEach(card => {
      card.addEventListener('click', () => card.classList.toggle('open'));
    });

    // Show on page
    resultsEl.querySelectorAll('.show-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: 'UXCheck_Highlight', selector: btn.dataset.sel });
        btn.textContent = 'Highlighted ✓';
        setTimeout(() => { btn.textContent = 'Show on page'; }, 2800);
      });
    });
  }

  function showResults() {
    if (!currentReport) return;
    shadow.getElementById('stats').style.display = 'grid';
    shadow.getElementById('export-row').style.display = currentIssues.length ? 'grid' : 'none';
    shadow.getElementById('filters').style.display = currentIssues.length ? 'flex' : 'none';
    shadow.getElementById('c-count').textContent  = currentReport.summary.critical;
    shadow.getElementById('m-count').textContent  = currentReport.summary.major;
    shadow.getElementById('mn-count').textContent = currentReport.summary.minor;
    shadow.getElementById('i-count').textContent  = currentReport.summary.info;
    renderIssues();
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  shadow.getElementById('filters').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    shadow.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderIssues();
  });

  // ── Run audit ─────────────────────────────────────────────────────────────
  let scanTimeout = null;

  shadow.getElementById('run-btn').addEventListener('click', () => {
    const runBtn = shadow.getElementById('run-btn');
    const loader = shadow.getElementById('loader');
    runBtn.disabled = true;
    runBtn.textContent = 'Scanning...';
    loader.style.display = 'block';
    shadow.getElementById('results').innerHTML = '';
    shadow.getElementById('stats').style.display = 'none';
    shadow.getElementById('export-row').style.display = 'none';
    shadow.getElementById('filters').style.display = 'none';

    // Timeout — if no results arrive in 15s, show an error
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      runBtn.disabled = false;
      runBtn.textContent = 'Try Again';
      loader.style.display = 'none';
      shadow.getElementById('results').innerHTML = `
        <div class="empty-state" style="color:#dc2626;">
          Could not reach the page script.<br>
          <span style="font-size:11px;color:#737373;display:block;margin-top:6px;">Try reloading the page, then click the icon again.</span>
        </div>`;
    }, 15000);

    chrome.runtime.sendMessage({ type: 'UXCheck_StartAudit' });
  });

  // ── Receive results ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(message => {
    if (message.type !== 'UXCheck_AuditResults') return;
    clearTimeout(scanTimeout);
    currentIssues = message.data;
    currentReport = message.report;
    currentFilter = 'all';
    shadow.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));

    const runBtn = shadow.getElementById('run-btn');
    const loader = shadow.getElementById('loader');
    runBtn.disabled = false;
    runBtn.textContent = 'Run Again';
    loader.style.display = 'none';
    showResults();
  });

  // ── Restore cached results for this tab ───────────────────────────────────
  chrome.runtime.sendMessage({ type: 'UXCheck_GetCached' }, response => {
    if (response && response.data) {
      currentIssues = response.data;
      currentReport = response.report;
      shadow.getElementById('run-btn').textContent = 'Run Again';
      showResults();
    }
  });

  // ── Export CSV ────────────────────────────────────────────────────────────
  shadow.getElementById('export-csv').addEventListener('click', () => {
    if (!currentIssues.length) return;
    const headers = ['Type','Severity','Message','Element','Selector','WCAG','Recommendation'];
    const rows = currentIssues.map(i => [
      i.type, i.severity,
      `"${(i.message||'').replace(/"/g,'""')}"`,
      i.element,
      `"${(i.selector||'').replace(/"/g,'""')}"`,
      i.wcagRef||'',
      `"${(i.recommendation||'').replace(/"/g,'""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = `uxcheck-${location.hostname}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  });

  // ── Export PDF ────────────────────────────────────────────────────────────
  shadow.getElementById('export-pdf').addEventListener('click', () => {
    if (!currentReport) return;
    chrome.runtime.sendMessage({ type: 'UXCheck_ExportPDF', report: currentReport });
  });

})();
