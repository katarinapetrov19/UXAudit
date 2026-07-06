/**
 * Responsive design audit checks.
 * Tests for viewport meta, horizontal overflow, touch targets,
 * fixed widths, and mobile-unfriendly patterns.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkResponsive = (doc) => {
  const issues = [];

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

  const viewportWidth = window.innerWidth;

  // ── 1. Missing or incorrect viewport meta tag ─────────────────────────────
  const viewportMeta = doc.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    issues.push({
      type: 'Responsive',
      severity: 'Critical',
      message: 'Missing <meta name="viewport"> tag.',
      element: 'head',
      selector: 'head',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to make the page scale correctly on mobile devices.'
    });
  } else {
    const content = viewportMeta.getAttribute('content') || '';
    if (!content.includes('width=device-width')) {
      issues.push({
        type: 'Responsive',
        severity: 'Major',
        message: 'Viewport meta tag is missing "width=device-width".',
        element: 'meta',
        selector: 'meta[name="viewport"]',
        recommendation: 'Set content="width=device-width, initial-scale=1" on the viewport meta tag.'
      });
    }
    if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
      issues.push({
        type: 'Responsive',
        severity: 'Major',
        message: 'Viewport meta prevents user scaling (zoom is disabled).',
        element: 'meta',
        selector: 'meta[name="viewport"]',
        wcagRef: '1.4.4',
        recommendation: 'Remove user-scalable=no and maximum-scale=1. Users with low vision depend on browser zoom. This also violates WCAG 1.4.4.'
      });
    }
  }

  // ── 2. Horizontal overflow (content wider than viewport) ──────────────────
  const bodyWidth = doc.body ? doc.body.scrollWidth : 0;
  if (bodyWidth > viewportWidth + 5) {
    issues.push({
      type: 'Responsive',
      severity: 'Major',
      message: `Page content is wider than the viewport (${bodyWidth}px vs ${viewportWidth}px).`,
      element: 'body',
      selector: 'body',
      recommendation: 'The page causes horizontal scrolling. Find elements with fixed widths wider than the viewport and make them fluid (max-width: 100%, overflow: hidden).'
    });
  }

  // ── 3. Elements with fixed pixel widths that may overflow ─────────────────
  const allEls = Array.from(doc.querySelectorAll('section, article, table, img, figure'))
    .filter(isVisible).slice(0, 40);

  const fixedWideEls = allEls.filter(el => {
    const style = window.getComputedStyle(el);
    const width = parseFloat(style.width);
    const hasFixedWidth = el.style.width && el.style.width.endsWith('px');
    return hasFixedWidth && width > viewportWidth * 0.95;
  });

  if (fixedWideEls.length > 0) {
    issues.push({
      type: 'Responsive',
      severity: 'Minor',
      message: `${fixedWideEls.length} element(s) have fixed pixel widths approaching or exceeding viewport width.`,
      element: 'multiple',
      selector: fixedWideEls.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Replace fixed pixel widths with percentage widths, max-width, or CSS Grid/Flexbox to allow content to reflow on smaller screens.'
    });
  }

  // ── 4. Touch target size (buttons, links, inputs) ─────────────────────────
  // WCAG 2.5.5 recommends at least 44×44px; 24×24px is the minimum (WCAG 2.5.8)
  const touchEls = Array.from(doc.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"]'))
    .filter(isVisible).slice(0, 200);

  const smallTargets = touchEls.filter(el => {
    const rect = el.getBoundingClientRect();
    return (rect.width > 0 || rect.height > 0) && (rect.width < 24 || rect.height < 24);
  });

  if (smallTargets.length > 0) {
    issues.push({
      type: 'Responsive',
      severity: 'Major',
      message: `${smallTargets.length} interactive element(s) are smaller than 24×24px.`,
      element: 'multiple',
      selector: smallTargets.slice(0, 3).map(getSelector).join(', '),
      wcagRef: '2.5.8',
      recommendation: 'Make touch targets at least 44×44px for comfortable tapping on mobile. Small targets cause mis-taps and frustration. Increase padding, not just the icon size.'
    });
  }

  // Also flag elements between 24–44px as informational
  const marginalTargets = touchEls.filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width >= 24 && rect.height >= 24 && (rect.width < 44 || rect.height < 44);
  });

  if (marginalTargets.length > 3) {
    issues.push({
      type: 'Responsive',
      severity: 'Info',
      message: `${marginalTargets.length} interactive element(s) are between 24–44px — below the recommended touch target size.`,
      element: 'multiple',
      selector: marginalTargets.slice(0, 3).map(getSelector).join(', '),
      wcagRef: '2.5.5',
      recommendation: 'WCAG recommends 44×44px for touch targets. While these meet the minimum, increasing them will improve usability on mobile.'
    });
  }

  // ── 5. Images without max-width or responsive treatment ───────────────────
  const images = Array.from(doc.querySelectorAll('img')).filter(isVisible).slice(0, 50);
  const rigidImages = images.filter(img => {
    const style = window.getComputedStyle(img);
    const hasFixedWidth = img.getAttribute('width') && !img.style.maxWidth;
    const maxWidth = style.maxWidth;
    const width = parseFloat(style.width);
    // Flag images wider than viewport with no max-width constraint
    return width > viewportWidth * 0.9 && (maxWidth === 'none' || !maxWidth) && !img.closest('picture');
  });

  if (rigidImages.length > 0) {
    issues.push({
      type: 'Responsive',
      severity: 'Minor',
      message: `${rigidImages.length} image(s) are wide with no max-width constraint.`,
      element: 'img',
      selector: rigidImages.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Add max-width: 100% and height: auto to images so they scale down on smaller screens without overflowing.'
    });
  }

  // ── 6. Tables without responsive treatment ────────────────────────────────
  const tables = Array.from(doc.querySelectorAll('table')).filter(isVisible).slice(0, 20);
  const rigidTables = tables.filter(table => {
    const style = window.getComputedStyle(table);
    const width = table.getBoundingClientRect().width;
    const parent = table.parentElement;
    const parentStyle = parent ? window.getComputedStyle(parent) : null;
    const hasOverflowScroll = parentStyle && (parentStyle.overflow === 'auto' || parentStyle.overflow === 'scroll' || parentStyle.overflowX === 'auto' || parentStyle.overflowX === 'scroll');
    return width > viewportWidth * 0.9 && !hasOverflowScroll;
  });

  if (rigidTables.length > 0) {
    issues.push({
      type: 'Responsive',
      severity: 'Minor',
      message: `${rigidTables.length} wide table(s) have no horizontal scroll container.`,
      element: 'table',
      selector: rigidTables.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Wrap wide tables in a div with overflow-x: auto so they scroll horizontally on small screens instead of breaking the layout.'
    });
  }

  // ── 7. Font size defined in px on root/html (prevents user zoom scaling) ──
  const htmlStyle = window.getComputedStyle(doc.documentElement);
  const rootFontSize = htmlStyle.fontSize;
  if (rootFontSize && rootFontSize.endsWith('px')) {
    const size = parseFloat(rootFontSize);
    if (size < 14) {
      issues.push({
        type: 'Responsive',
        severity: 'Minor',
        message: `Root font size is set to ${size}px — below 14px on the html element.`,
        element: 'html',
        selector: 'html',
        recommendation: 'Use rem units for font sizes and set a base of 16px (100%) on the html element. This respects browser and OS font size preferences.'
      });
    }
  }

  // ── 8. Input type="text" used where specific types would help on mobile ───
  // type="email", "tel", "number" trigger better mobile keyboards
  const textInputs = Array.from(doc.querySelectorAll('input[type="text"]')).filter(isVisible);
  const poorInputTypes = textInputs.filter(input => {
    const name = (input.name || input.placeholder || input.id || '').toLowerCase();
    return /email|mail/.test(name) || /phone|tel|mobile/.test(name) || /number|qty|count|amount/.test(name);
  });

  if (poorInputTypes.length > 0) {
    issues.push({
      type: 'Responsive',
      severity: 'Info',
      message: `${poorInputTypes.length} text input(s) could use a more specific type (email, tel, or number).`,
      element: 'input',
      selector: poorInputTypes.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Use input type="email", type="tel", or type="number" where appropriate. These trigger the correct virtual keyboard on mobile, making input faster and less error-prone.'
    });
  }

  return issues;
};
