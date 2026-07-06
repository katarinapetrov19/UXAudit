/**
 * Calculates the relative luminance of an RGB color.
 * WCAG 2.x formula.
 */
function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two relative luminances.
 */
function getContrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parses an 'rgb(r, g, b)' or 'rgba(r, g, b, a)' string.
 */
function parseRGB(rgbString) {
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

/**
 * Gets background color from the element only — no DOM traversal.
 * Traversal was causing thread-blocking on complex pages.
 */
function getActualBackgroundColor(element) {
  const bg = parseRGB(window.getComputedStyle(element).backgroundColor);
  if (bg && bg.a > 0) return bg;
  return { r: 255, g: 255, b: 255, a: 1 }; // Default white
}

window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkContrast = (element) => {
  const style = window.getComputedStyle(element);
  
  // Skip if element is not visible
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return [];
  }

  const fg = parseRGB(style.color);
  const bg = getActualBackgroundColor(element);

  if (!fg || !bg) return [];

  const l1 = getRelativeLuminance(fg.r, fg.g, fg.b);
  const l2 = getRelativeLuminance(bg.r, bg.g, bg.b);
  const ratio = getContrastRatio(l1, l2);

  const fontSize = parseFloat(style.fontSize);
  const fontWeight = style.fontWeight;
  const isBold = parseInt(fontWeight) >= 700 || fontWeight === 'bold';
  const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && isBold);

  const targetRatio = isLargeText ? 3.0 : 4.5;

  if (ratio < targetRatio) {
    let severity;
    if (ratio < 2.5) {
      severity = 'Critical'; // Clearly unreadable
    } else if (ratio < 3.5) {
      severity = 'Major';    // Noticeably poor
    } else {
      severity = 'Minor';    // Close miss — worth noting but not alarming
    }

    return [{
      type: 'Contrast',
      severity,
      element: element.tagName.toLowerCase(),
      selector: getSelector(element),
      message: `Contrast ratio ${ratio.toFixed(2)}:1 — target is ${targetRatio}:1 for ${isLargeText ? 'large' : 'normal'} text.`,
      wcagRef: '1.4.3',
      recommendation: 'Increase the contrast between text and background. Use a tool like https://webaim.org/resources/contrastchecker/ to find a passing colour.'
    }];
  }

  return [];
};

function getSelector(el) {
  if (el.id) return '#' + el.id;
  let selector = el.tagName.toLowerCase();
  if (el.className) {
    selector += '.' + Array.from(el.classList).join('.');
  }
  return selector;
}
