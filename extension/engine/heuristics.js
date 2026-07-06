/**
 * Checks for general UX heuristic violations.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkHeuristics = (doc) => {
  const issues = [];

  // 1. Font size check
  const allElements = Array.from(doc.querySelectorAll('p, li, td')).slice(0, 100);
  const smallFonts = new Set();
  allElements.forEach(el => {
    if (el.children.length === 0 && (el.textContent || '').trim().length > 10) {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 12) {
        smallFonts.add(getSelector(el));
      }
    }
  });

  if (smallFonts.size > 0) {
    issues.push({
      type: 'Heuristics',
      severity: 'Major',
      message: 'Small font size detected (< 12px).',
      element: 'multiple',
      selector: Array.from(smallFonts).slice(0, 3).join(', ') + '...',
      recommendation: 'Increase font size to at least 12px (preferably 16px) for better readability.'
    });
  }

  // 2. Vague Link Text
  const vagueTerms = ['click here', 'read more', 'learn more', 'more', 'here', 'link'];
  const links = Array.from(doc.querySelectorAll('a')).slice(0, 100);
  links.forEach(link => {
    const text = (link.textContent || '').trim().toLowerCase();
    if (vagueTerms.includes(text)) {
      issues.push({
        type: 'Heuristics',
        severity: 'Major',
        message: `Vague link text: "${(link.textContent || '').trim()}".`,
        element: 'a',
        selector: getSelector(link),
        wcagRef: '2.4.4',
        recommendation: 'Use descriptive link text that makes sense out of context.'
      });
    }
  });

  // 3. Broken Links (basic check for empty href or #)
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href === '') {
      issues.push({
        type: 'Heuristics',
        severity: 'Minor',
        message: 'Empty or placeholder link (#).',
        element: 'a',
        selector: getSelector(link),
        recommendation: 'Ensure all links have a valid destination URL.'
      });
    }
  });

  // 4. Missing Page Title
  if (!doc.title || doc.title.trim() === '') {
    issues.push({
      type: 'Heuristics',
      severity: 'Major',
      message: 'Page is missing a title.',
      element: 'head',
      selector: 'title',
      wcagRef: '2.4.2',
      recommendation: 'Add a descriptive <title> to the page.'
    });
  }

  // 5. Target="_blank" without warning
  const newWindowLinks = doc.querySelectorAll('a[target="_blank"]');
  if (newWindowLinks.length > 0) {
    issues.push({
      type: 'Heuristics',
      severity: 'Info',
      message: `${newWindowLinks.length} links open in a new window.`,
      element: 'multiple',
      selector: 'a[target="_blank"]',
      recommendation: 'Inform users when links open in a new window to avoid confusion.'
    });
  }

  // 6. Inconsistent Styling (Font Families)
  const fontFamilies = new Set();
  const sampleElements = Array.from(doc.querySelectorAll('p, h1, h2, h3')).slice(0, 40);
  sampleElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const family = (style.fontFamily || '').split(',')[0].trim().replace(/['"]/g, '');
    if (family) fontFamilies.add(family);
  });

  if (fontFamilies.size > 3) {
    issues.push({
      type: 'Heuristics',
      severity: 'Minor',
      message: `Found ${fontFamilies.size} different font families.`,
      element: 'body',
      selector: 'body',
      recommendation: 'Limit the number of font families to 2-3 for a more consistent and professional look.'
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
