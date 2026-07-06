/**
 * Visual hierarchy audit checks.
 * Tests for CTA discipline, title duplication, icon-only elements,
 * color overuse, empty states, and interaction affordances.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkHierarchy = (doc) => {
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

  function getTextContent(el) {
    return (el.textContent || el.innerText || '').trim();
  }

  // ── 1. Multiple primary / filled buttons on the same surface ─────────────
  // Primary CTA = a button with a saturated background color (not white/grey/transparent)
  function isSaturated(color) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return false;
    const [r, g, b] = [+match[1], +match[2], +match[3]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;
    const saturation = max === min ? 0 : (max - min) / 255 / (1 - Math.abs(2 * lightness - 1));
    return saturation > 0.35 && lightness > 0.2 && lightness < 0.85;
  }

  const buttons = Array.from(doc.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button'))
    .filter(isVisible).slice(0, 150);

  const primaryButtons = buttons.filter(btn => {
    const bg = window.getComputedStyle(btn).backgroundColor;
    return isSaturated(bg);
  });

  if (primaryButtons.length > 3) {
    issues.push({
      type: 'Hierarchy',
      severity: 'Minor',
      message: `${primaryButtons.length} filled/primary buttons detected on the page.`,
      element: 'button',
      selector: primaryButtons.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Limit primary (filled) buttons — too many competing CTAs dilute visual priority. Use one primary action per section, with secondary/ghost styles for the rest.'
    });
  }

  // ── 2. Buttons without visible text or accessible label ──────────────────
  const iconOnlyButtons = buttons.filter(btn => {
    const text = getTextContent(btn);
    const hasAriaLabel = btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby') || btn.hasAttribute('title');
    return text.length === 0 && !hasAriaLabel;
  });

  if (iconOnlyButtons.length > 0) {
    issues.push({
      type: 'Hierarchy',
      severity: 'Major',
      message: `${iconOnlyButtons.length} button(s) have no visible text and no accessible label.`,
      element: 'button',
      selector: iconOnlyButtons.slice(0, 3).map(getSelector).join(', '),
      wcagRef: '4.1.2',
      recommendation: 'Add aria-label or visible text to all icon-only buttons so users and screen readers understand their purpose.'
    });
  }

  // ── 3. Forms with no visible submit / action button ───────────────────────
  const forms = doc.querySelectorAll('form');
  forms.forEach(form => {
    if (!isVisible(form)) return;
    const hasSubmit = form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
    if (!hasSubmit) {
      issues.push({
        type: 'Hierarchy',
        severity: 'Major',
        message: 'A form has no visible submit button.',
        element: 'form',
        selector: getSelector(form),
        recommendation: 'Every form needs a clearly visible submit action so users know how to complete it.'
      });
    }
  });

  // ── 4. Empty table / list with no empty state message ────────────────────
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    if (!isVisible(table)) return;
    const rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) {
      issues.push({
        type: 'Hierarchy',
        severity: 'Info',
        message: 'A table has no rows — consider adding an empty state message.',
        element: 'table',
        selector: getSelector(table),
        recommendation: 'When a table is empty, show a message explaining why (e.g. "No results found") so users are not confused by a blank space.'
      });
    }
  });

  const lists = doc.querySelectorAll('ul, ol');
  lists.forEach(list => {
    if (!isVisible(list)) return;
    if (list.children.length === 0) {
      issues.push({
        type: 'Hierarchy',
        severity: 'Info',
        message: 'An empty list element has no items.',
        element: list.tagName.toLowerCase(),
        selector: getSelector(list),
        recommendation: 'Remove empty list elements or replace with an empty state message.'
      });
    }
  });

  // ── 5. Modals / dialogs used for heavy content ────────────────────────────
  // Flag dialogs that contain forms with many inputs (complex flows shouldn't live in a modal)
  const dialogs = doc.querySelectorAll('[role="dialog"], dialog');
  dialogs.forEach(dialog => {
    if (!isVisible(dialog)) return;
    const inputs = dialog.querySelectorAll('input, select, textarea');
    if (inputs.length > 4) {
      issues.push({
        type: 'Hierarchy',
        severity: 'Minor',
        message: `A modal dialog contains ${inputs.length} form inputs — this may be too complex for a dialog.`,
        element: 'dialog',
        selector: getSelector(dialog),
        recommendation: 'Dialogs work best for 1–2 step decisions. For forms with 5+ fields, consider a full page or side panel so users have more space and context.'
      });
    }
  });

  // ── 6. Duplicate page title in content ───────────────────────────────────
  // The <title> text should not be repeated verbatim as an h1 AND in header/nav
  const pageTitle = (doc.title || '').toLowerCase().trim();
  if (pageTitle.length > 5) {
    const h1s = Array.from(doc.querySelectorAll('h1'));
    const matchingH1s = h1s.filter(h => (getTextContent(h)).toLowerCase().includes(pageTitle.substring(0, 20)));
    const headerEls = Array.from(doc.querySelectorAll('header, [role="banner"]'));
    const titleInHeader = headerEls.some(h => (getTextContent(h)).toLowerCase().includes(pageTitle.substring(0, 20)));

    if (matchingH1s.length > 0 && titleInHeader) {
      issues.push({
        type: 'Hierarchy',
        severity: 'Info',
        message: 'The page title text appears both in the header and as an h1.',
        element: 'multiple',
        selector: 'header, h1',
        recommendation: 'The header should show the product/site name; the h1 should be the specific page title. Avoid repeating the same text in both.'
      });
    }
  }

  // ── 7. Interactive elements with no hover/focus affordance ───────────────
  // Clickable divs / spans with no cursor:pointer or role
  const clickableNonButtons = Array.from(doc.querySelectorAll('div[onclick], span[onclick], div[tabindex], span[tabindex]'))
    .filter(isVisible);

  const missingRole = clickableNonButtons.filter(el => {
    const hasRole = el.hasAttribute('role');
    const cursor = window.getComputedStyle(el).cursor;
    return !hasRole && cursor !== 'pointer';
  });

  if (missingRole.length > 0) {
    issues.push({
      type: 'Hierarchy',
      severity: 'Minor',
      message: `${missingRole.length} clickable div/span element(s) lack a role and pointer cursor.`,
      element: 'div/span',
      selector: missingRole.slice(0, 3).map(getSelector).join(', '),
      wcagRef: '4.1.2',
      recommendation: 'Interactive divs and spans need role="button" (or similar) and cursor:pointer so users understand they are clickable.'
    });
  }

  // ── 8. Destructive actions not visually separated ─────────────────────────
  // Delete/remove buttons placed immediately next to primary CTAs
  const destructiveTerms = /\b(delete|remove|destroy|clear all|reset|discard|cancel)\b/i;
  const destructiveBtns = Array.from(doc.querySelectorAll('button, [role="button"]'))
    .filter(btn => isVisible(btn) && destructiveTerms.test(getTextContent(btn)));

  destructiveBtns.forEach(btn => {
    const siblings = Array.from(btn.parentElement ? btn.parentElement.children : []);
    const adjacentPrimary = siblings.some(sib => {
      if (sib === btn) return false;
      const bg = window.getComputedStyle(sib).backgroundColor;
      return isSaturated(bg) && (sib.tagName === 'BUTTON' || sib.getAttribute('role') === 'button');
    });

    if (adjacentPrimary) {
      issues.push({
        type: 'Hierarchy',
        severity: 'Minor',
        message: `Destructive action ("${getTextContent(btn).slice(0, 30)}") is adjacent to a primary button.`,
        element: btn.tagName.toLowerCase(),
        selector: getSelector(btn),
        recommendation: 'Separate destructive actions from primary CTAs visually. Place them further apart or use a different style (outlined, red) to prevent accidental clicks.'
      });
    }
  });

  return issues;
};
