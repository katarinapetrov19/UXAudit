/**
 * Layout checks — alignment, z-index, overlaps, card consistency, skip links, sticky elements.
 * Rule: always .slice(N) BEFORE .filter() — never filter before slice.
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

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // ── 1. Z-index chaos ─────────────────────────────────────────────────────
  // Too many distinct z-index values = no layering system
  await y();
  const zEls = Array.from(doc.querySelectorAll('*')).slice(0, 200);
  const zValues = new Set();
  zEls.forEach(el => {
    const z = window.getComputedStyle(el).zIndex;
    if (z && z !== 'auto' && z !== '0') zValues.add(parseInt(z));
  });
  if (zValues.size > 6) {
    const sorted = Array.from(zValues).sort((a,b) => a-b);
    issues.push({
      type: 'Layout', severity: 'Minor',
      message: `${zValues.size} distinct z-index values detected: ${sorted.join(', ')}.`,
      element: 'multiple', selector: 'body',
      recommendation: 'Define a z-index scale with named layers (e.g. base: 0, dropdown: 100, modal: 200, toast: 300). Arbitrary z-index values cause unpredictable stacking and hard-to-debug overlaps.',
      library: 'Tailwind z-index scale: z-0, z-10, z-20, z-30, z-40, z-50. CSS: --z-dropdown: 100; --z-modal: 200; --z-toast: 300.'
    });
  }

  // ── 2. Sticky / fixed elements taking too much vertical space ─────────────
  await y();
  const stickyEls = Array.from(doc.querySelectorAll('header,nav,div,section')).slice(0, 60).filter(el => {
    const pos = window.getComputedStyle(el).position;
    return pos === 'fixed' || pos === 'sticky';
  });
  stickyEls.forEach(el => {
    const h = el.getBoundingClientRect().height;
    if (h > vh * 0.2) {
      issues.push({
        type: 'Layout', severity: 'Major',
        message: `A sticky/fixed element is ${Math.round(h)}px tall — over 20% of the viewport height.`,
        element: el.tagName.toLowerCase(), selector: gs(el),
        recommendation: 'Sticky headers and nav bars should be compact (under 80px ideally). Tall sticky elements eat into content space, especially on mobile.',
        library: 'Consider a collapsing header that shrinks on scroll. Headroom.js or plain CSS scroll-driven animations handle this well.'
      });
    }
  });

  // ── 3. Overlapping elements (bounding box collision) ─────────────────────
  await y();
  const interactiveEls = Array.from(doc.querySelectorAll('a,button,input,select')).slice(0, 60);
  const rects = interactiveEls.map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && r.top >= 0 && r.top < vh);

  const overlapping = [];
  for (let i = 0; i < rects.length && overlapping.length < 5; i++) {
    for (let j = i + 1; j < rects.length && overlapping.length < 5; j++) {
      const a = rects[i].r, b = rects[j].r;
      const overlap = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      if (overlap) {
        overlapping.push(rects[i].el);
        break;
      }
    }
  }
  if (overlapping.length > 0) {
    issues.push({
      type: 'Layout', severity: 'Major',
      message: `${overlapping.length} interactive element(s) overlap with other interactive elements.`,
      element: 'multiple', selector: overlapping.slice(0, 3).map(gs).join(', '),
      recommendation: 'Overlapping interactive elements cause mis-clicks and make the page unusable on touch devices. Check for absolute positioning, negative margins, or incorrect z-index.',
      library: 'Use CSS Grid or Flexbox for layout instead of absolute positioning. They prevent overlaps by design.'
    });
  }

  // ── 4. Inconsistent sibling card heights ──────────────────────────────────
  await y();
  const grids = Array.from(doc.querySelectorAll('ul,ol,[class*="grid"],[class*="cards"],[class*="list"]')).slice(0, 20);
  grids.forEach(grid => {
    const children = Array.from(grid.children).slice(0, 20).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 50 && r.height > 50;
    });
    if (children.length < 3) return;
    const heights = children.map(el => Math.round(el.getBoundingClientRect().height));
    const min = Math.min(...heights), max = Math.max(...heights);
    if (max - min > 80 && max / min > 1.5) {
      issues.push({
        type: 'Layout', severity: 'Minor',
        message: `Card/list items have inconsistent heights (min: ${min}px, max: ${max}px).`,
        element: grid.tagName.toLowerCase(), selector: gs(grid),
        recommendation: 'Uneven card heights break visual rhythm in grids. Use align-items: stretch (CSS Grid/Flex default) so all cards fill the row height.',
        library: 'CSS Grid: grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) with align-items: stretch automatically equalises card heights.'
      });
    }
  });

  // ── 5. Missing skip link ──────────────────────────────────────────────────
  await y();
  const skipLink = Array.from(doc.querySelectorAll('a')).slice(0, 10).find(a => {
    const text = (a.textContent || '').toLowerCase();
    const href = (a.getAttribute('href') || '');
    return (text.includes('skip') || text.includes('jump')) && href.startsWith('#');
  });
  if (!skipLink) {
    issues.push({
      type: 'Layout', severity: 'Minor',
      message: 'No "skip to main content" link found.',
      element: 'body', selector: 'body',
      wcagRef: '2.4.1',
      recommendation: 'Add a visually hidden skip link as the first element in the page: <a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>. This lets keyboard users bypass repeated navigation.',
      library: 'Tailwind: class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-white"'
    });
  }

  // ── 6. Grid/flex alignment — inconsistent left edges among siblings ────────
  await y();
  const flexContainers = Array.from(doc.querySelectorAll('div,section,ul,nav')).slice(0, 40).filter(el => {
    const d = window.getComputedStyle(el).display;
    return d === 'flex' || d === 'grid';
  });

  flexContainers.forEach(container => {
    const children = Array.from(container.children).slice(0, 12).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 20;
    });
    if (children.length < 3) return;

    // Check if items that should be left-aligned have scattered left edges
    const lefts = children.map(el => Math.round(el.getBoundingClientRect().left));
    const uniqueLefts = new Set(lefts);

    // In a single-row flex layout all items should share a row — multiple unique lefts is fine
    // Flag only if items appear to be in a column (stacked) but have inconsistent left edges
    const tops = children.map(el => Math.round(el.getBoundingClientRect().top));
    const uniqueTops = new Set(tops);
    const isColumn = uniqueTops.size > children.length * 0.6;

    if (isColumn && uniqueLefts.size > 3) {
      issues.push({
        type: 'Layout', severity: 'Minor',
        message: `Column layout with ${uniqueLefts.size} different left-edge positions — items may be misaligned.`,
        element: container.tagName.toLowerCase(), selector: gs(container),
        recommendation: 'Items in a vertical flex/grid column should share a consistent left edge. Check for inconsistent margin, padding, or nested wrappers causing drift.',
        library: 'CSS: align-items: flex-start ensures all items align to the same edge. For grids: justify-items: start.'
      });
    }
  });

  // ── 7. Content wider than viewport (horizontal overflow) ──────────────────
  await y();
  const wideEls = Array.from(doc.querySelectorAll('div,section,table,img,pre')).slice(0, 60).filter(el => {
    try {
      return el.getBoundingClientRect().right > vw + 10;
    } catch (e) { return false; }
  });
  if (wideEls.length > 0) {
    issues.push({
      type: 'Layout', severity: 'Major',
      message: `${wideEls.length} element(s) extend beyond the viewport — causing horizontal scroll.`,
      element: 'multiple', selector: wideEls.slice(0, 3).map(gs).join(', '),
      recommendation: 'Find elements wider than 100vw and add max-width: 100% or overflow: hidden. Common culprits: fixed-width containers, unwrapped pre/code blocks, wide tables.',
      library: 'Global fix: * { max-width: 100%; box-sizing: border-box; }. For tables: overflow-x: auto on a wrapper div.'
    });
  }

  return issues;
};
