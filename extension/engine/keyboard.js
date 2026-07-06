window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkKeyboard = (doc) => {
  const issues = [];

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    return s;
  }

  // 1. Tabindex > 0 — naturally small set
  Array.from(doc.querySelectorAll('[tabindex]')).slice(0, 50).forEach(el => {
    if (parseInt(el.getAttribute('tabindex')) > 0) issues.push({
      type: 'Keyboard', severity: 'Major',
      message: 'Avoid tabindex > 0.',
      element: el.tagName.toLowerCase(), selector: getSelector(el),
      wcagRef: '2.4.3',
      recommendation: 'Use natural DOM order. Use tabindex="0" or "-1" only.'
    });
  });

  // 2. Clickable but not focusable — cap 50
  Array.from(doc.querySelectorAll('[onclick], .btn, .button')).slice(0, 50).forEach(el => {
    const focusable = el.tabIndex >= 0 || ['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(el.tagName);
    if (!focusable) issues.push({
      type: 'Keyboard', severity: 'Critical',
      message: 'Interactive element is not keyboard focusable.',
      element: el.tagName.toLowerCase(), selector: getSelector(el),
      wcagRef: '2.1.1',
      recommendation: 'Use <button> or add tabindex="0" with keyboard event listeners.'
    });
  });

  // 3. Focus indicators — count across capped 80 elements, report once
  const focusables = Array.from(doc.querySelectorAll('button, a, input, select, textarea')).slice(0, 80);
  let noOutlineCount = 0;
  const noOutlineSelectors = [];
  focusables.forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0) {
      noOutlineCount++;
      if (noOutlineSelectors.length < 3) noOutlineSelectors.push(getSelector(el));
    }
  });
  if (noOutlineCount > 0) issues.push({
    type: 'Keyboard', severity: 'Info',
    message: `${noOutlineCount} focusable element(s) have no visible outline — focus indicators may be missing.`,
    element: 'multiple', selector: noOutlineSelectors.join(', '),
    wcagRef: '2.4.7',
    recommendation: 'Ensure all focusable elements have a visible :focus style. Never use outline:none without a CSS replacement.'
  });

  return issues;
};
