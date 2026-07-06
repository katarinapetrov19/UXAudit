/**
 * Checks for landmark presence and best practices.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkLandmarks = (doc) => {
  const issues = [];
  const landmarks = {
    main: doc.querySelectorAll('main, [role="main"]'),
    nav: doc.querySelectorAll('nav, [role="navigation"]'),
    header: doc.querySelectorAll('header, [role="banner"]'),
    footer: doc.querySelectorAll('footer, [role="contentinfo"]'),
    aside: doc.querySelectorAll('aside, [role="complementary"]')
  };

  // 1. Main check
  if (landmarks.main.length === 0) {
    issues.push({
      type: 'Landmarks',
      severity: 'Major',
      message: 'No <main> landmark found.',
      element: 'document',
      selector: 'body',
      wcagRef: '1.3.1',
      recommendation: 'Wrap the primary content of the page in a <main> element.'
    });
  } else if (landmarks.main.length > 1) {
    issues.push({
      type: 'Landmarks',
      severity: 'Minor',
      message: 'Multiple <main> landmarks found.',
      element: 'multiple',
      selector: 'main',
      recommendation: 'There should only be one <main> landmark per page.'
    });
  }

  // 2. Navigation labels
  if (landmarks.nav.length > 1) {
    landmarks.nav.forEach(nav => {
      const hasLabel = nav.getAttribute('aria-label') || nav.getAttribute('aria-labelledby');
      if (!hasLabel) {
        issues.push({
          type: 'Landmarks',
          severity: 'Minor',
          message: 'Multiple <nav> landmarks found without unique labels.',
          element: 'nav',
          selector: getSelector(nav),
          recommendation: 'Use aria-label or aria-labelledby to distinguish between multiple navigation regions.'
        });
      }
    });
  }

  // 3. Header/Footer usage
  if (landmarks.header.length > 1) {
     issues.push({
      type: 'Landmarks',
      severity: 'Info',
      message: 'Multiple <header> elements found. Ensure only one is the top-level banner.',
      element: 'multiple',
      selector: 'header'
    });
  }

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
