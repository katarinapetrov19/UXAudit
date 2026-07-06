/**
 * Checks for heading hierarchy issues.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkHeadings = (doc) => {
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const issues = [];
  let lastLevel = 0;
  let h1Count = 0;

  if (headings.length === 0) {
    issues.push({
      type: 'Headings',
      severity: 'Major',
      message: 'No headings found on the page.',
      element: 'body',
      selector: 'body',
      recommendation: 'Use heading elements (h1-h6) to provide structure to your content.'
    });
  }

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    
    if (level === 1) h1Count++;

    // 1. Check for skipped heading levels
    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push({
        type: 'Headings',
        severity: 'Minor',
        message: `Skipped heading level: <${heading.tagName.toLowerCase()}> follows <h${lastLevel}>`,
        element: heading.tagName.toLowerCase(),
        selector: getSelector(heading),
        wcagRef: '1.3.1',
        recommendation: 'Ensure headings follow a logical nested order.'
      });
    }

    // 2. Check if page starts with something other than h1
    if (index === 0 && level !== 1) {
      issues.push({
        type: 'Headings',
        severity: 'Info',
        message: 'The first heading on the page is not an <h1>.',
        element: heading.tagName.toLowerCase(),
        selector: getSelector(heading),
        recommendation: 'Start the page with an <h1> as the primary title.'
      });
    }
    
    lastLevel = level;
  });

  // 3. Check for multiple h1s
  if (h1Count > 1) {
    issues.push({
      type: 'Headings',
      severity: 'Info',
      message: `Found ${h1Count} <h1> elements.`,
      element: 'multiple',
      selector: 'h1',
      recommendation: 'Ideally, a page should have only one primary <h1>.'
    });
  }

  // 4. Check for div/span with heading-like classes
  const pseudoHeadings = doc.querySelectorAll('div[class*="h1"], div[class*="h2"], span[class*="h1"], span[class*="h2"]');
  pseudoHeadings.forEach(el => {
    issues.push({
      type: 'Headings',
      severity: 'Minor',
      message: 'Semantic heading used via class name instead of tag.',
      element: el.tagName.toLowerCase(),
      selector: getSelector(el),
      recommendation: 'Use real heading tags (h1-h6) for better accessibility.'
    });
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
