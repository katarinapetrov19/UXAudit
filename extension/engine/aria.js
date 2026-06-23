/**
 * Checks for ARIA and basic accessibility issues.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkAria = (doc) => {
  const issues = [];

  // 1. Image alt attributes
  const images = doc.querySelectorAll('img');
  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        type: 'ARIA',
        severity: 'Critical',
        message: 'Image is missing an alt attribute.',
        element: 'img',
        selector: getSelector(img),
        wcagRef: '1.1.1',
        recommendation: 'Add an alt attribute that describes the image, or alt="" if decorative.'
      });
    }
  });

  // 2. Form labels
  const inputs = doc.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const id = input.id;
    const hasLabel = id ? !!doc.querySelector(`label[for="${id}"]`) : false;
    const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
    const isInsideLabel = input.closest('label');

    if (!hasLabel && !hasAriaLabel && !isInsideLabel && input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button') {
      issues.push({
        type: 'ARIA',
        severity: 'Major',
        message: 'Form input missing an accessible label.',
        element: input.tagName.toLowerCase(),
        selector: getSelector(input),
        wcagRef: '1.3.1',
        recommendation: 'Associate a <label> with the input or use aria-label.'
      });
    }
  });

  // 3. Duplicate IDs
  const ids = new Set();
  const allElementsWithId = doc.querySelectorAll('[id]');
  allElementsWithId.forEach(el => {
    if (ids.has(el.id)) {
      issues.push({
        type: 'ARIA',
        severity: 'Major',
        message: `Duplicate ID found: ${el.id}.`,
        element: el.tagName.toLowerCase(),
        selector: getSelector(el),
        wcagRef: '4.1.1',
        recommendation: 'Ensure all ID attributes are unique on the page.'
      });
    }
    ids.add(el.id);
  });

  // 4. Invalid ARIA attributes (basic check)
  const allElements = doc.querySelectorAll('*');
  const validAria = ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-expanded', 'aria-haspopup', 'aria-controls', 'aria-live', 'aria-atomic', 'aria-relevant', 'aria-busy', 'aria-checked', 'aria-disabled', 'aria-grabbed', 'aria-dropeffect', 'aria-invalid', 'aria-selected', 'aria-required', 'aria-autocomplete', 'aria-multiline', 'aria-multiselectable', 'aria-orientation', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext', 'aria-posinset', 'aria-setsize', 'aria-level', 'aria-placeholder', 'aria-modal', 'aria-current', 'aria-details', 'aria-keyshortcuts', 'aria-roledescription'];
  
  allElements.forEach(el => {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i].name;
      if (attr.startsWith('aria-') && !validAria.includes(attr)) {
        issues.push({
          type: 'ARIA',
          severity: 'Minor',
          message: `Possibly invalid ARIA attribute: ${attr}.`,
          element: el.tagName.toLowerCase(),
          selector: getSelector(el),
          recommendation: 'Check the spelling of the ARIA attribute.'
        });
      }
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
