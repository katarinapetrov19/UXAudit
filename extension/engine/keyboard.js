/**
 * Checks for keyboard accessibility issues.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkKeyboard = (doc) => {
  const issues = [];

  // 1. Tabindex > 0
  const positiveTabindex = doc.querySelectorAll('[tabindex]');
  positiveTabindex.forEach(el => {
    const val = parseInt(el.getAttribute('tabindex'));
    if (val > 0) {
      issues.push({
        type: 'Keyboard',
        severity: 'Major',
        message: 'Avoid using tabindex > 0.',
        element: el.tagName.toLowerCase(),
        selector: getSelector(el),
        wcagRef: '2.4.3',
        recommendation: 'Use natural DOM order for tabbing. Use tabindex="0" or "-1" only.'
      });
    }
  });

  // 2. Interactive elements focusability
  const clickables = doc.querySelectorAll('[onclick], [ng-click], [v-on\\:click], .btn, .button');
  clickables.forEach(el => {
    const isFocusable = el.tabIndex >= 0 || ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    if (!isFocusable) {
      issues.push({
        type: 'Keyboard',
        severity: 'Critical',
        message: 'Element is interactive but not keyboard focusable.',
        element: el.tagName.toLowerCase(),
        selector: getSelector(el),
        wcagRef: '2.1.1',
        recommendation: 'Use semantic elements like <button> or add tabindex="0" and keyboard event listeners.'
      });
    }
  });

  // 3. Focus indicators (outline: none)
  const focusables = doc.querySelectorAll('button, a, input, select, textarea, [tabindex="0"]');
  focusables.forEach(el => {
    // This is a bit of a heuristic as we can't easily check :focus state styles via getComputedStyle 
    // without actually focusing. But we can check if the element has outline: none in its base style
    // which often means it was removed globally.
    const style = window.getComputedStyle(el);
    if (style.outlineStyle === 'none' || (parseFloat(style.outlineWidth) === 0)) {
       // We'll mark this as info/minor since we don't know for sure if it's restored on :focus
       issues.push({
         type: 'Keyboard',
         severity: 'Info',
         message: 'Check for visible focus indicators.',
         element: el.tagName.toLowerCase(),
         selector: getSelector(el),
         wcagRef: '2.4.7',
         recommendation: 'Ensure that all focusable elements have a visible focus indicator (e.g., an outline).'
       });
    }
  });

  return issues;
};

function getSelector(el) {
  if (el.id) return '#' + el.id;
  let selector = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    selector += '.' + Array.from(el.classList).join('.');
  }
  return selector;
}
