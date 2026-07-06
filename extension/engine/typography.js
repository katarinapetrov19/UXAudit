window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkTypography = (doc) => {
  const issues = [];

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    return s;
  }

  function isVisible(el) {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  // 1. Too many font sizes — sample 60 leaf text nodes
  const sizeEls = Array.from(doc.querySelectorAll('p, li, h1, h2, h3, h4, a, button, td')).slice(0, 60);
  const fontSizes = new Set();
  sizeEls.forEach(el => {
    if (el.children.length === 0 && (el.textContent || '').trim().length > 3 && isVisible(el))
      fontSizes.add(Math.round(parseFloat(window.getComputedStyle(el).fontSize)));
  });
  if (fontSizes.size > 6) issues.push({
    type: 'Typography', severity: 'Minor',
    message: `${fontSizes.size} distinct font sizes detected: ${Array.from(fontSizes).sort((a,b)=>a-b).join('px, ')}px.`,
    element: 'multiple', selector: 'body',
    recommendation: 'Limit font sizes to 3–5 steps. Too many sizes break hierarchy.'
  });

  // 2. Body text below 14px — cap 60
  const contentEls = Array.from(doc.querySelectorAll('p, li, td')).slice(0, 60);
  const tooSmall = new Set();
  contentEls.forEach(el => {
    if ((el.textContent || '').trim().length > 20 && isVisible(el)) {
      if (parseFloat(window.getComputedStyle(el).fontSize) < 14) tooSmall.add(getSelector(el));
    }
  });
  if (tooSmall.size > 0) issues.push({
    type: 'Typography', severity: 'Major',
    message: `${tooSmall.size} body text element(s) smaller than 14px.`,
    element: 'multiple', selector: Array.from(tooSmall).slice(0, 3).join(', '),
    recommendation: 'Body content should be at least 14px (16px preferred).'
  });

  // 3. Line height too tight — cap 40
  const lineEls = Array.from(doc.querySelectorAll('p')).slice(0, 40);
  const tightLH = new Set();
  lineEls.forEach(el => {
    if ((el.textContent || '').trim().length > 40 && isVisible(el)) {
      const s = window.getComputedStyle(el);
      const lh = parseFloat(s.lineHeight), fs = parseFloat(s.fontSize);
      if (fs > 0 && lh / fs < 1.3) tightLH.add(getSelector(el));
    }
  });
  if (tightLH.size > 0) issues.push({
    type: 'Typography', severity: 'Minor',
    message: `${tightLH.size} paragraph(s) have tight line height (< 1.3).`,
    element: 'multiple', selector: Array.from(tightLH).slice(0, 3).join(', '),
    recommendation: 'Set line-height to at least 1.4–1.6 for body text.'
  });

  // 4. Too many font families — cap 40
  const fontFamilies = new Set();
  Array.from(doc.querySelectorAll('p, h1, h2, h3, button, a')).slice(0, 40).forEach(el => {
    if (isVisible(el)) {
      const f = (window.getComputedStyle(el).fontFamily || '').split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
      if (f) fontFamilies.add(f);
    }
  });
  if (fontFamilies.size > 3) issues.push({
    type: 'Typography', severity: 'Minor',
    message: `${fontFamilies.size} font families in use: ${Array.from(fontFamilies).join(', ')}.`,
    element: 'body', selector: 'body',
    recommendation: 'Stick to 1–2 font families. More undermines visual consistency.'
  });

  // 5. All-caps paragraphs — cap 30
  const capEls = Array.from(doc.querySelectorAll('p')).slice(0, 30);
  const capsAbuse = [];
  capEls.forEach(el => {
    if ((el.textContent || '').trim().length > 30 && isVisible(el) &&
        window.getComputedStyle(el).textTransform === 'uppercase')
      capsAbuse.push(getSelector(el));
  });
  if (capsAbuse.length > 0) issues.push({
    type: 'Typography', severity: 'Minor',
    message: `${capsAbuse.length} paragraph(s) use all-caps text.`,
    element: 'p', selector: capsAbuse.slice(0, 3).join(', '),
    recommendation: 'Reserve uppercase for short labels only — all-caps paragraphs are hard to read.'
  });

  // 6. Justified text — cap 30
  const justEls = Array.from(doc.querySelectorAll('p')).slice(0, 30);
  const justified = [];
  justEls.forEach(el => {
    if ((el.textContent || '').trim().length > 40 && isVisible(el) &&
        window.getComputedStyle(el).textAlign === 'justify')
      justified.push(getSelector(el));
  });
  if (justified.length > 0) issues.push({
    type: 'Typography', severity: 'Info',
    message: `${justified.length} element(s) use justified text.`,
    element: 'p', selector: justified.slice(0, 3).join(', '),
    recommendation: 'Left-aligned text is easier to read on screen than justified.'
  });

  // 7. Very long line length — cap 20 paragraphs
  const longEls = Array.from(doc.querySelectorAll('p')).slice(0, 20);
  const longLine = [];
  longEls.forEach(el => {
    if ((el.textContent || '').trim().length > 60 && isVisible(el)) {
      const width = el.getBoundingClientRect().width;
      const fs = parseFloat(window.getComputedStyle(el).fontSize) || 16;
      if (width / (fs * 0.5) > 90) longLine.push(getSelector(el));
    }
  });
  if (longLine.length > 0) issues.push({
    type: 'Typography', severity: 'Info',
    message: `${longLine.length} paragraph(s) may exceed ~90 characters per line.`,
    element: 'p', selector: longLine.slice(0, 3).join(', '),
    recommendation: 'Limit line length to 60–80 characters. Use max-width on text containers.'
  });

  return issues;
};
