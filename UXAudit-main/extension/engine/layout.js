/**
 * Layout checks — z-index, sticky, overlaps, card heights, skip link, alignment, overflow.
 * Rule: ALWAYS .slice(N) BEFORE .filter() — never call getComputedStyle on unbounded sets.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkLayout = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    return s;
  }

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // ── 1. Z-index chaos — only query elements likely to have z-index set ─────
  // Use targeted selector instead of * to avoid touching every element
  await y();
  const zEls = Array.from(doc.querySelectorAll(
    '[style*="z-index"],[class*="modal"],[class*="dropdown"],[class*="overlay"],[class*="popup"],[class*="toast"],[class*="sticky"],[class*="fixed"],header,nav,aside'
  )).slice(0, 60);
  const zValues = new Set();
  zEls.forEach(el => {
    const z = window.getComputedStyle(el).zIndex;
    if (z && z !== 'auto' && z !== '0') zValues.add(parseInt(z));
  });
  if (zValues.size > 6) issues.push({
    type: 'Layout', severity: 'Minor',
    message: `${zValues.size} distinct z-index values: ${Array.from(zValues).sort((a,b)=>a-b).join(', ')}.`,
    element: 'multiple', selector: 'body',
    recommendation: 'Use a named z-index scale: base 0, dropdown 100, modal 200, toast 300. Arbitrary values cause unpredictable stacking.',
    library: 'Tailwind: z-0/z-10/z-20/z-30/z-40/z-50. CSS: --z-modal: 200; --z-toast: 300.'
  });

  // ── 2. Sticky/fixed elements > 20% viewport — slice FIRST ────────────────
  await y();
  Array.from(doc.querySelectorAll('header,nav,div,section')).slice(0, 30).forEach(el => {
    const pos = window.getComputedStyle(el).position;
    if (pos !== 'fixed' && pos !== 'sticky') return;
    const h = el.getBoundingClientRect().height;
    if (h > vh * 0.2) issues.push({
      type: 'Layout', severity: 'Major',
      message: `A sticky/fixed element is ${Math.round(h)}px tall — over 20% of the viewport.`,
      element: el.tagName.toLowerCase(), selector: gs(el),
      recommendation: 'Sticky headers should be compact (under 80px). Tall sticky elements steal content space, especially on mobile.',
      library: 'Use a collapsing header that shrinks on scroll. Headroom.js or CSS scroll-driven animations handle this cleanly.'
    });
  });

  // ── 3. Overlapping interactive elements — small capped set ────────────────
  await y();
  const iEls = Array.from(doc.querySelectorAll('a,button,input')).slice(0, 30);
  const rects = iEls.map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && r.top >= 0 && r.top < vh);
  const overlapping = [];
  outer: for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r, b = rects[j].r;
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
        overlapping.push(rects[i].el);
        if (overlapping.length >= 3) break outer;
      }
    }
  }
  if (overlapping.length) issues.push({
    type: 'Layout', severity: 'Major',
    message: `${overlapping.length} interactive element(s) overlap with other interactive elements.`,
    element: 'multiple', selector: overlapping.map(gs).join(', '),
    recommendation: 'Overlapping interactive elements cause mis-clicks on touch. Check absolute positioning, negative margins, or incorrect z-index.',
    library: 'Use CSS Grid or Flexbox instead of absolute positioning — they prevent overlaps by design.'
  });

  // ── 4. Inconsistent sibling card heights — slice FIRST ───────────────────
  await y();
  Array.from(doc.querySelectorAll('ul,ol,[class*="grid"],[class*="cards"]')).slice(0, 15).forEach(grid => {
    const children = Array.from(grid.children).slice(0, 12).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 50 && r.height > 50;
    });
    if (children.length < 3) return;
    const heights = children.map(el => Math.round(el.getBoundingClientRect().height));
    const min = Math.min(...heights), max = Math.max(...heights);
    if (max - min > 80 && max / min > 1.5) issues.push({
      type: 'Layout', severity: 'Minor',
      message: `Card/list items have inconsistent heights (min: ${min}px, max: ${max}px).`,
      element: grid.tagName.toLowerCase(), selector: gs(grid),
      recommendation: 'Use align-items: stretch so all cards in a row share the same height.',
      library: 'CSS Grid with align-items: stretch (default) equalises card heights automatically.'
    });
  });

  // ── 5. Missing skip link ──────────────────────────────────────────────────
  await y();
  const hasSkip = Array.from(doc.querySelectorAll('a')).slice(0, 5).some(a => {
    const t = (a.textContent||'').toLowerCase();
    return (t.includes('skip') || t.includes('jump')) && (a.getAttribute('href')||'').startsWith('#');
  });
  if (!hasSkip) issues.push({
    type: 'Layout', severity: 'Minor',
    message: 'No "skip to main content" link found.',
    element: 'body', selector: 'body', wcagRef: '2.4.1',
    recommendation: 'Add a visually hidden skip link as the first element: <a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>.',
    library: 'Tailwind: class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-white"'
  });

  // ── 6. Horizontal overflow — elements wider than viewport ─────────────────
  await y();
  const wideEls = Array.from(doc.querySelectorAll('div,section,table,img,pre')).slice(0, 40).filter(el => {
    try { return el.getBoundingClientRect().right > vw + 10; } catch { return false; }
  });
  if (wideEls.length) issues.push({
    type: 'Layout', severity: 'Major',
    message: `${wideEls.length} element(s) extend beyond the viewport — causing horizontal scroll.`,
    element: 'multiple', selector: wideEls.slice(0, 3).map(gs).join(', '),
    recommendation: 'Add max-width: 100% or overflow: hidden. Common causes: fixed-width containers, pre/code blocks, wide tables.',
    library: 'Global fix: * { max-width: 100%; box-sizing: border-box; }. Tables: wrap in div with overflow-x: auto.'
  });

  return issues;
};
