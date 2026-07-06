/**
 * Laws of UX checks.
 * Rule: ALWAYS .slice(N) BEFORE .filter().
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkLawsOfUX = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    return s;
  }

  function getText(el) { return (el.textContent || '').trim(); }

  function isSaturated(color) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    const l = (max+min)/2/255;
    const s = max===min ? 0 : (max-min)/255/(1-Math.abs(2*l-1));
    return s > 0.35 && l > 0.2 && l < 0.85;
  }

  // ── HICK'S LAW — more choices = longer decision time ─────────────────────

  // 1. Nav with > 7 top-level items
  await y();
  Array.from(doc.querySelectorAll('nav,[role="navigation"]')).slice(0, 5).forEach(nav => {
    const topLinks = Array.from(nav.querySelectorAll(':scope > ul > li, :scope > a, :scope > ol > li')).slice(0, 20);
    if (topLinks.length > 7) issues.push({
      type: 'LawsOfUX', severity: 'Minor',
      message: `Navigation has ${topLinks.length} top-level items — Hick's Law: more choices slow decisions.`,
      element: 'nav', selector: gs(nav),
      recommendation: `Reduce top-level nav to 5–7 items. Group secondary items under dropdowns or a "More" menu. Every extra item increases the time users take to find what they need.`,
      law: "Hick's Law"
    });
  });

  // 2. Select with > 7 options
  await y();
  Array.from(doc.querySelectorAll('select')).slice(0, 20).forEach(sel => {
    const opts = sel.querySelectorAll('option');
    if (opts.length > 7) issues.push({
      type: 'LawsOfUX', severity: 'Info',
      message: `<select> has ${opts.length} options — consider grouping or a searchable dropdown.`,
      element: 'select', selector: gs(sel),
      recommendation: 'Group related options with <optgroup> or replace with a searchable combobox for > 7 options. Large flat lists are hard to scan.',
      law: "Hick's Law"
    });
  });

  // 3. Form with > 10 visible fields
  await y();
  Array.from(doc.querySelectorAll('form')).slice(0, 10).forEach(form => {
    const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')).slice(0, 30);
    if (fields.length > 10) issues.push({
      type: 'LawsOfUX', severity: 'Minor',
      message: `Form has ${fields.length} fields — Hick's Law: consider breaking into steps.`,
      element: 'form', selector: gs(form),
      recommendation: 'Long forms increase abandonment. Group related fields into logical sections, or use a multi-step flow. Show only what\'s needed for this step.',
      law: "Hick's Law"
    });
  });

  // 4. More than 3 primary CTAs visible — yield per element
  await y();
  const primaryBtns = [];
  for (const el of Array.from(doc.querySelectorAll('button,input[type="submit"]')).slice(0, 30)) {
    await y();
    if (isSaturated(window.getComputedStyle(el).backgroundColor)) primaryBtns.push(el);
  }
  if (primaryBtns.length > 3) issues.push({
    type: 'LawsOfUX', severity: 'Minor',
    message: `${primaryBtns.length} primary/filled buttons on the page — Hick's Law: too many competing actions.`,
    element: 'multiple', selector: primaryBtns.slice(0, 3).map(gs).join(', '),
    recommendation: 'Each section should have one clear primary action. Demote secondary actions to outlined or ghost buttons so the eye knows where to go first.',
    law: "Hick's Law"
  });

  // ── MILLER'S LAW — working memory holds ~7 items ─────────────────────────

  // 5. Checkbox group with > 9 items
  await y();
  const checkboxGroups = new Map();
  Array.from(doc.querySelectorAll('input[type="checkbox"]')).slice(0, 60).forEach(cb => {
    const parent = cb.closest('fieldset, form, [role="group"], ul, div') || cb.parentElement;
    if (!parent) return;
    checkboxGroups.set(parent, (checkboxGroups.get(parent) || 0) + 1);
  });
  checkboxGroups.forEach((count, parent) => {
    if (count > 9) issues.push({
      type: 'LawsOfUX', severity: 'Minor',
      message: `A checkbox group has ${count} items — Miller's Law: exceeds working memory of ~7 items.`,
      element: parent.tagName.toLowerCase(), selector: gs(parent),
      recommendation: 'Group checkboxes into labelled categories, or replace with a multi-select component. Lists longer than 7–9 items overwhelm working memory.',
      law: "Miller's Law"
    });
  });

  // 6. Radio group with > 7 items
  await y();
  const radioGroups = new Map();
  Array.from(doc.querySelectorAll('input[type="radio"]')).slice(0, 40).forEach(rb => {
    const name = rb.getAttribute('name') || 'unknown';
    radioGroups.set(name, (radioGroups.get(name) || 0) + 1);
  });
  radioGroups.forEach((count, name) => {
    if (count > 7) issues.push({
      type: 'LawsOfUX', severity: 'Minor',
      message: `Radio group "${name}" has ${count} options — Miller's Law: consider a select or segmented control.`,
      element: 'input', selector: `input[name="${name}"]`,
      recommendation: 'Radio buttons work best for 2–7 choices. For more options, use a <select> or custom dropdown to reduce visual load.',
      law: "Miller's Law"
    });
  });

  // ── JAKOB'S LAW — users expect familiar patterns ──────────────────────────

  // 7. Logo not linking to homepage
  await y();
  const logos = Array.from(doc.querySelectorAll('header img, [class*="logo"] img, [id*="logo"] img, header svg, [class*="logo"] svg')).slice(0, 5);
  logos.forEach(logo => {
    const link = logo.closest('a');
    if (!link) {
      issues.push({
        type: 'LawsOfUX', severity: 'Minor',
        message: 'Logo is not wrapped in a link — Jakob\'s Law: users expect the logo to link to the homepage.',
        element: logo.tagName.toLowerCase(), selector: gs(logo),
        recommendation: 'Wrap the logo in <a href="/">. This is one of the most universal web conventions — breaking it confuses users.',
        law: "Jakob's Law"
      });
    }
  });

  // 8. No search input at top of page
  await y();
  const searchInput = doc.querySelector('input[type="search"], input[name*="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
  const hasNav = doc.querySelector('nav, [role="navigation"]');
  if (!searchInput && hasNav) issues.push({
    type: 'LawsOfUX', severity: 'Info',
    message: 'No search input found — Jakob\'s Law: users expect to find search at the top of content-heavy pages.',
    element: 'body', selector: 'body',
    recommendation: 'Add a search field in the header or top of the page for content-heavy sites. Use <input type="search"> for correct semantics and mobile keyboard.',
    law: "Jakob's Law"
  });

  // ── VON RESTORFF EFFECT — the different thing gets remembered ─────────────

  // 9. No visually distinct primary CTA — yield per element
  await y();
  const visibleBtns = Array.from(doc.querySelectorAll('button,input[type="submit"]')).slice(0, 20)
    .filter(el => getText(el).length > 0);
  let hasPrimary = false;
  for (const el of visibleBtns) {
    await y();
    if (isSaturated(window.getComputedStyle(el).backgroundColor)) { hasPrimary = true; break; }
  }

  if (visibleBtns.length >= 2) {
    if (!hasPrimary) issues.push({
      type: 'LawsOfUX', severity: 'Major',
      message: 'No visually distinct primary button found — Von Restorff Effect: one CTA must stand out.',
      element: 'multiple', selector: visibleBtns.slice(0, 3).map(gs).join(', '),
      recommendation: 'At least one button should have a filled, high-contrast background to draw the eye. If all buttons look the same, users don\'t know where to act.',
      law: "Von Restorff Effect"
    });
  }

  // ── SERIAL POSITION EFFECT — first and last items are best recalled ───────

  // 10. Important CTA buried in the middle of a nav (not first or last)
  await y();
  Array.from(doc.querySelectorAll('nav,[role="navigation"]')).slice(0, 3).forEach(nav => {
    const links = Array.from(nav.querySelectorAll('a')).slice(0, 15);
    if (links.length < 4) return;
    const ctaTerms = /sign.?up|register|get.?start|try|free|buy|subscribe|join|contact/i;
    links.forEach((link, i) => {
      const text = getText(link);
      const isMiddle = i > 0 && i < links.length - 1;
      const isCTA = ctaTerms.test(text);
      if (isCTA && isMiddle) issues.push({
        type: 'LawsOfUX', severity: 'Info',
        message: `CTA "${text.slice(0, 30)}" is in the middle of the nav — Serial Position Effect: first and last positions are best recalled.`,
        element: 'a', selector: gs(link),
        recommendation: 'Move calls-to-action (sign up, contact, get started) to the first or last position in the navigation. Middle positions are the least memorable.',
        law: "Serial Position Effect"
      });
    });
  });

  return issues;
};
