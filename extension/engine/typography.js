/**
 * Typography audit checks.
 * Tests for hierarchy, size discipline, and readability.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkTypography = (doc) => {
  const issues = [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    }
    return s;
  }

  function isVisible(el) {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  // ── 1. Too many distinct font sizes ──────────────────────────────────────
  // More than 5 distinct computed font sizes signals no clear type scale.
  const sizeElements = doc.querySelectorAll('p, li, span, div, h1, h2, h3, h4, h5, h6, a, button, label, td, th');
  const fontSizes = new Set();
  sizeElements.forEach(el => {
    if (el.children.length === 0 && (el.textContent || '').trim().length > 3 && isVisible(el)) {
      const fs = Math.round(parseFloat(window.getComputedStyle(el).fontSize));
      if (fs > 0) fontSizes.add(fs);
    }
  });

  if (fontSizes.size > 6) {
    issues.push({
      type: 'Typography',
      severity: 'Minor',
      message: `${fontSizes.size} distinct font sizes detected: ${Array.from(fontSizes).sort((a,b)=>a-b).join('px, ')}px.`,
      element: 'multiple',
      selector: 'body',
      recommendation: 'Limit font sizes to a clear scale (typically 3–5 steps). Too many sizes create visual noise and break hierarchy.'
    });
  }

  // ── 2. Body / content text below 14px ────────────────────────────────────
  const contentEls = doc.querySelectorAll('p, li, td, dd, blockquote');
  const tooSmall = new Set();
  contentEls.forEach(el => {
    if ((el.textContent || '').trim().length > 20 && isVisible(el)) {
      const fs = parseFloat(window.getComputedStyle(el).fontSize);
      if (fs < 14) tooSmall.add(getSelector(el));
    }
  });
  if (tooSmall.size > 0) {
    issues.push({
      type: 'Typography',
      severity: 'Major',
      message: `${tooSmall.size} body text element(s) are smaller than 14px.`,
      element: 'multiple',
      selector: Array.from(tooSmall).slice(0, 3).join(', '),
      recommendation: 'Body content should be at least 14px (16px preferred) for comfortable reading.'
    });
  }

  // ── 3. Line height too tight on body text ────────────────────────────────
  const lineHeightEls = doc.querySelectorAll('p, li');
  const tightLineHeight = new Set();
  lineHeightEls.forEach(el => {
    if ((el.textContent || '').trim().length > 40 && isVisible(el)) {
      const style = window.getComputedStyle(el);
      const lh = parseFloat(style.lineHeight);
      const fs = parseFloat(style.fontSize);
      if (fs > 0 && lh / fs < 1.3) {
        tightLineHeight.add(getSelector(el));
      }
    }
  });
  if (tightLineHeight.size > 0) {
    issues.push({
      type: 'Typography',
      severity: 'Minor',
      message: `${tightLineHeight.size} paragraph(s) have tight line height (< 1.3).`,
      element: 'multiple',
      selector: Array.from(tightLineHeight).slice(0, 3).join(', '),
      recommendation: 'Set line-height to at least 1.4–1.6 for body text. Tight spacing hurts readability, especially for longer passages.'
    });
  }

  // ── 4. Too many font families ─────────────────────────────────────────────
  const fontFamilies = new Set();
  doc.querySelectorAll('p, h1, h2, h3, span, button, a').forEach(el => {
    if (isVisible(el)) {
      const family = (window.getComputedStyle(el).fontFamily || '').split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
      if (family) fontFamilies.add(family);
    }
  });
  if (fontFamilies.size > 3) {
    issues.push({
      type: 'Typography',
      severity: 'Minor',
      message: `${fontFamilies.size} different font families in use: ${Array.from(fontFamilies).join(', ')}.`,
      element: 'body',
      selector: 'body',
      recommendation: 'Stick to 1–2 font families (one for headings, one for body). More than 2 undermines visual consistency.'
    });
  }

  // ── 5. All-caps body text ─────────────────────────────────────────────────
  // Acceptable for labels/nav; bad for paragraphs
  const paragraphs = doc.querySelectorAll('p');
  const capsAbuse = [];
  paragraphs.forEach(el => {
    if ((el.textContent || '').trim().length > 30 && isVisible(el)) {
      const tt = window.getComputedStyle(el).textTransform;
      if (tt === 'uppercase') capsAbuse.push(getSelector(el));
    }
  });
  if (capsAbuse.length > 0) {
    issues.push({
      type: 'Typography',
      severity: 'Minor',
      message: `${capsAbuse.length} paragraph(s) use all-caps text.`,
      element: 'p',
      selector: capsAbuse.slice(0, 3).join(', '),
      recommendation: 'Avoid all-caps for body text. It reduces reading speed and feels aggressive. Reserve uppercase for labels and short tags only.'
    });
  }

  // ── 6. Justified text ─────────────────────────────────────────────────────
  const justifiedEls = [];
  doc.querySelectorAll('p, div, li').forEach(el => {
    if ((el.textContent || '').trim().length > 40 && isVisible(el)) {
      if (window.getComputedStyle(el).textAlign === 'justify') {
        justifiedEls.push(getSelector(el));
      }
    }
  });
  if (justifiedEls.length > 0) {
    issues.push({
      type: 'Typography',
      severity: 'Info',
      message: `${justifiedEls.length} element(s) use justified text alignment.`,
      element: 'multiple',
      selector: justifiedEls.slice(0, 3).join(', '),
      recommendation: 'Justified text creates uneven word spacing ("rivers of white"). Use left-aligned text for better readability on screen.'
    });
  }

  // ── 7. Very long line length ──────────────────────────────────────────────
  // Ideal max is ~75–80ch. Check wide paragraph containers.
  const paragraphEls = doc.querySelectorAll('p');
  const longLine = [];
  paragraphEls.forEach(el => {
    if ((el.textContent || '').trim().length > 60 && isVisible(el)) {
      const width = el.getBoundingClientRect().width;
      const fs = parseFloat(window.getComputedStyle(el).fontSize) || 16;
      const charWidth = fs * 0.5; // rough average char width
      const estimatedChars = width / charWidth;
      if (estimatedChars > 90) {
        longLine.push(getSelector(el));
      }
    }
  });
  if (longLine.length > 0) {
    issues.push({
      type: 'Typography',
      severity: 'Info',
      message: `${longLine.length} paragraph(s) may have very long line lengths (> ~90 characters).`,
      element: 'p',
      selector: longLine.slice(0, 3).join(', '),
      recommendation: 'Limit line length to 60–80 characters for comfortable reading. Use max-width on text containers.'
    });
  }

  return issues;
};
