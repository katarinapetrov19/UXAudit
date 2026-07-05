const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JSDOM } = require('jsdom');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSelector(el) {
  if (el.id) return '#' + el.id;
  let s = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).slice(0, 2).join('.');
  if (classes) s += '.' + classes;
  return s;
}

function getText(el) {
  return (el.textContent || '').trim();
}

// ─── Individual checks ────────────────────────────────────────────────────────

function checkHeadings(doc) {
  const issues = [];
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));

  if (headings.length === 0) {
    return [{ type: 'Headings', severity: 'Major', message: 'No headings found on the page.', element: 'body', selector: 'body', recommendation: 'Use heading elements (h1–h6) to give the page structure.' }];
  }

  let lastLevel = 0, h1Count = 0;
  headings.forEach((h, i) => {
    const level = parseInt(h.tagName[1]);
    if (level === 1) h1Count++;
    if (i === 0 && level !== 1) issues.push({ type: 'Headings', severity: 'Info', message: 'First heading is not an h1.', element: h.tagName.toLowerCase(), selector: getSelector(h), recommendation: 'Start the page with an h1 as the primary title.' });
    if (lastLevel > 0 && level > lastLevel + 1) issues.push({ type: 'Headings', severity: 'Minor', message: `Skipped heading level: <${h.tagName.toLowerCase()}> follows <h${lastLevel}>.`, element: h.tagName.toLowerCase(), selector: getSelector(h), wcagRef: '1.3.1', recommendation: 'Headings should follow a logical nested order without skipping levels.' });
    lastLevel = level;
  });

  if (h1Count > 1) issues.push({ type: 'Headings', severity: 'Info', message: `Found ${h1Count} <h1> elements — ideally a page has one.`, element: 'h1', selector: 'h1', recommendation: 'Use a single h1 as the unique page title.' });

  const pseudoHeadings = doc.querySelectorAll('div[class*="h1"],div[class*="h2"],span[class*="h1"],span[class*="h2"]');
  pseudoHeadings.forEach(el => issues.push({ type: 'Headings', severity: 'Minor', message: 'Heading role implied by class name instead of semantic tag.', element: el.tagName.toLowerCase(), selector: getSelector(el), recommendation: 'Use real heading tags (h1–h6) for better accessibility.' }));

  return issues;
}

function checkAria(doc) {
  const issues = [];

  doc.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('alt')) issues.push({ type: 'ARIA', severity: 'Critical', message: 'Image missing alt attribute.', element: 'img', selector: getSelector(img), wcagRef: '1.1.1', recommendation: 'Add alt="" (decorative) or a descriptive alt text.' });
  });

  doc.querySelectorAll('input,select,textarea').forEach(input => {
    if (['hidden','submit','button'].includes(input.type)) return;
    const id = input.id;
    const hasLabel = id ? !!doc.querySelector(`label[for="${id}"]`) : false;
    const hasAria = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
    const inLabel = !!input.closest('label');
    if (!hasLabel && !hasAria && !inLabel) issues.push({ type: 'ARIA', severity: 'Major', message: 'Form input missing accessible label.', element: input.tagName.toLowerCase(), selector: getSelector(input), wcagRef: '1.3.1', recommendation: 'Add a <label for="..."> or aria-label to the input.' });
  });

  const ids = new Set();
  doc.querySelectorAll('[id]').forEach(el => {
    if (ids.has(el.id)) issues.push({ type: 'ARIA', severity: 'Major', message: `Duplicate id: "${el.id}".`, element: el.tagName.toLowerCase(), selector: '#' + el.id, wcagRef: '4.1.1', recommendation: 'All id attributes must be unique on the page.' });
    ids.add(el.id);
  });

  return issues;
}

function checkLandmarks(doc) {
  const issues = [];
  if (!doc.querySelector('main, [role="main"]')) issues.push({ type: 'Landmarks', severity: 'Major', message: 'No <main> landmark found.', element: 'body', selector: 'body', wcagRef: '1.3.6', recommendation: 'Wrap the primary content in a <main> element.' });
  if (!doc.querySelector('header, [role="banner"]')) issues.push({ type: 'Landmarks', severity: 'Minor', message: 'No <header> landmark found.', element: 'body', selector: 'body', recommendation: 'Add a <header> element for the site header.' });
  if (!doc.querySelector('nav, [role="navigation"]')) issues.push({ type: 'Landmarks', severity: 'Info', message: 'No <nav> landmark found.', element: 'body', selector: 'body', recommendation: 'Add a <nav> element wrapping your navigation links.' });
  return issues;
}

function checkHeuristics(doc) {
  const issues = [];

  const vagueTerms = ['click here', 'read more', 'learn more', 'more', 'here', 'link'];
  doc.querySelectorAll('a').forEach(a => {
    const text = getText(a).toLowerCase();
    if (vagueTerms.includes(text)) issues.push({ type: 'Heuristics', severity: 'Major', message: `Vague link text: "${getText(a)}".`, element: 'a', selector: getSelector(a), wcagRef: '2.4.4', recommendation: 'Use descriptive link text that makes sense out of context.' });
    const href = a.getAttribute('href');
    if (!href || href === '#' || href === '') issues.push({ type: 'Heuristics', severity: 'Minor', message: 'Empty or placeholder link.', element: 'a', selector: getSelector(a), recommendation: 'All links should have a valid destination URL.' });
  });

  if (!doc.title || !doc.title.trim()) issues.push({ type: 'Heuristics', severity: 'Major', message: 'Page is missing a <title>.', element: 'head', selector: 'title', wcagRef: '2.4.2', recommendation: 'Add a descriptive <title> tag.' });

  const newWindowLinks = doc.querySelectorAll('a[target="_blank"]');
  if (newWindowLinks.length > 0) issues.push({ type: 'Heuristics', severity: 'Info', message: `${newWindowLinks.length} link(s) open in a new window.`, element: 'a', selector: 'a[target="_blank"]', recommendation: 'Inform users when links open in a new window.' });

  const fontFamilies = new Set();
  doc.querySelectorAll('p,h1,h2,h3').forEach(el => {
    const style = el.getAttribute('style') || '';
    const match = style.match(/font-family\s*:\s*([^;]+)/i);
    if (match) fontFamilies.add(match[1].split(',')[0].trim().replace(/['"]/g, '').toLowerCase());
  });
  if (fontFamilies.size > 3) issues.push({ type: 'Heuristics', severity: 'Minor', message: `${fontFamilies.size} inline font families detected.`, element: 'body', selector: 'body', recommendation: 'Limit font families to 2–3 for visual consistency.' });

  return issues;
}

function checkTypography(doc) {
  const issues = [];

  doc.querySelectorAll('p').forEach(el => {
    const style = el.getAttribute('style') || '';
    const ttMatch = style.match(/text-transform\s*:\s*uppercase/i);
    if (ttMatch && getText(el).length > 30) issues.push({ type: 'Typography', severity: 'Minor', message: 'Paragraph uses all-caps text.', element: 'p', selector: getSelector(el), recommendation: 'Reserve uppercase for short labels only — all-caps paragraphs are hard to read.' });
    const taMatch = style.match(/text-align\s*:\s*justify/i);
    if (taMatch && getText(el).length > 40) issues.push({ type: 'Typography', severity: 'Info', message: 'Paragraph uses justified text.', element: 'p', selector: getSelector(el), recommendation: 'Left-aligned text is easier to read on screen than justified.' });
  });

  const longParagraphs = Array.from(doc.querySelectorAll('p')).filter(p => getText(p).length > 500);
  if (longParagraphs.length > 0) issues.push({ type: 'Typography', severity: 'Info', message: `${longParagraphs.length} paragraph(s) are very long (500+ characters with no break).`, element: 'p', selector: getSelector(longParagraphs[0]), recommendation: 'Break long paragraphs up to improve scanability.' });

  return issues;
}

function checkHierarchy(doc) {
  const issues = [];

  const buttons = doc.querySelectorAll('button,[role="button"],input[type="submit"]');
  const iconOnly = Array.from(buttons).filter(btn => {
    const text = getText(btn);
    return text.length === 0 && !btn.hasAttribute('aria-label') && !btn.hasAttribute('title');
  });
  if (iconOnly.length > 0) issues.push({ type: 'Hierarchy', severity: 'Major', message: `${iconOnly.length} button(s) have no text and no accessible label.`, element: 'button', selector: iconOnly.slice(0,3).map(getSelector).join(', '), wcagRef: '4.1.2', recommendation: 'Add aria-label to all icon-only buttons.' });

  doc.querySelectorAll('form').forEach(form => {
    const hasSubmit = form.querySelector('button[type="submit"],button:not([type]),input[type="submit"]');
    if (!hasSubmit) issues.push({ type: 'Hierarchy', severity: 'Major', message: 'A form has no submit button.', element: 'form', selector: getSelector(form), recommendation: 'Every form needs a clearly visible submit action.' });
  });

  const dialogs = doc.querySelectorAll('[role="dialog"],dialog');
  dialogs.forEach(d => {
    const inputs = d.querySelectorAll('input,select,textarea');
    if (inputs.length > 4) issues.push({ type: 'Hierarchy', severity: 'Minor', message: `A modal contains ${inputs.length} inputs — may be too complex.`, element: 'dialog', selector: getSelector(d), recommendation: 'Dialogs work best for 1–2 step decisions. Consider a full page for complex forms.' });
  });

  const clickableDivs = Array.from(doc.querySelectorAll('div[onclick],span[onclick]'));
  const missingRole = clickableDivs.filter(el => !el.hasAttribute('role'));
  if (missingRole.length > 0) issues.push({ type: 'Hierarchy', severity: 'Minor', message: `${missingRole.length} clickable div/span element(s) lack a role.`, element: 'div', selector: missingRole.slice(0,3).map(getSelector).join(', '), wcagRef: '4.1.2', recommendation: 'Add role="button" (or appropriate role) to interactive divs and spans.' });

  return issues;
}

function checkResponsive(doc) {
  const issues = [];

  const viewportMeta = doc.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    issues.push({ type: 'Responsive', severity: 'Critical', message: 'Missing <meta name="viewport"> tag.', element: 'head', selector: 'head', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
  } else {
    const content = viewportMeta.getAttribute('content') || '';
    if (!content.includes('width=device-width')) issues.push({ type: 'Responsive', severity: 'Major', message: 'Viewport meta missing "width=device-width".', element: 'meta', selector: 'meta[name="viewport"]', recommendation: 'Set content="width=device-width, initial-scale=1".' });
    if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) issues.push({ type: 'Responsive', severity: 'Major', message: 'Viewport meta disables user zoom.', element: 'meta', selector: 'meta[name="viewport"]', wcagRef: '1.4.4', recommendation: 'Remove user-scalable=no and maximum-scale=1 — users with low vision need zoom.' });
  }

  doc.querySelectorAll('img').forEach(img => {
    const w = img.getAttribute('width');
    const style = img.getAttribute('style') || '';
    if (w && parseInt(w) > 600 && !style.includes('max-width')) issues.push({ type: 'Responsive', severity: 'Minor', message: `Image has fixed width="${w}" with no max-width style.`, element: 'img', selector: getSelector(img), recommendation: 'Add max-width:100%;height:auto to images so they scale on small screens.' });
  });

  doc.querySelectorAll('input[type="text"]').forEach(input => {
    const hint = (input.name || input.placeholder || input.id || '').toLowerCase();
    if (/email|mail/.test(hint)) issues.push({ type: 'Responsive', severity: 'Info', message: 'Text input for email — use type="email" for better mobile keyboard.', element: 'input', selector: getSelector(input), recommendation: 'type="email" triggers the email keyboard on mobile.' });
    if (/phone|tel|mobile/.test(hint)) issues.push({ type: 'Responsive', severity: 'Info', message: 'Text input for phone — use type="tel" for better mobile keyboard.', element: 'input', selector: getSelector(input), recommendation: 'type="tel" triggers the numeric keyboard on mobile.' });
  });

  return issues;
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  let html;
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'UXCheck-Audit-Bot/1.0 (+https://uxaudit-mu.vercel.app)' }
    });
    html = response.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 403 || status === 401) return res.status(422).json({ error: `The server blocked our request (${status}). Try the Chrome extension for this site.` });
    if (status === 404) return res.status(422).json({ error: 'Page not found (404).' });
    return res.status(422).json({ error: `Could not fetch "${url}": ${err.message}` });
  }

  let doc;
  try {
    const dom = new JSDOM(html, { url });
    doc = dom.window.document;
  } catch (err) {
    return res.status(422).json({ error: 'Could not parse the page HTML.' });
  }

  const issues = [
    ...checkHeadings(doc),
    ...checkAria(doc),
    ...checkLandmarks(doc),
    ...checkHeuristics(doc),
    ...checkTypography(doc),
    ...checkHierarchy(doc),
    ...checkResponsive(doc),
  ];

  const severityOrder = { Critical: 0, Major: 1, Minor: 2, Info: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary = { total: issues.length, critical: 0, major: 0, minor: 0, info: 0 };
  issues.forEach(i => { summary[i.severity.toLowerCase()]++; });

  const note = 'Computed-style checks (color contrast, font sizes, touch targets) require the browser extension.';

  res.json({ url, summary, issues, note });
});

module.exports = router;
