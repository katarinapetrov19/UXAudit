/**
 * Visual design checks — spacing, consistency, motion, images.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkVisual = (doc) => {
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

  // 8pt grid steps (4pt half-steps included)
  const GRID = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 120, 160]);
  function isOnGrid(px) {
    const v = Math.round(px);
    return GRID.has(v);
  }

  // ── 1. Spacing off-grid ───────────────────────────────────────────────────
  const spacingEls = Array.from(doc.querySelectorAll('section, article, main, header, footer, div, p'))
    .filter(isVisible).slice(0, 80);

  let offGridCount = 0, totalSpacing = 0;
  spacingEls.forEach(el => {
    const s = window.getComputedStyle(el);
    ['paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom'].forEach(prop => {
      const v = parseFloat(s[prop]);
      if (v > 0) {
        totalSpacing++;
        if (!isOnGrid(v)) offGridCount++;
      }
    });
  });

  if (totalSpacing > 10 && offGridCount / totalSpacing > 0.4) {
    issues.push({
      type: 'Visual',
      severity: 'Minor',
      message: `${Math.round(offGridCount / totalSpacing * 100)}% of spacing values are off the 8pt grid.`,
      element: 'multiple',
      selector: 'body',
      recommendation: 'Snap spacing to a consistent scale (4, 8, 16, 24, 32, 48, 64px). Tailwind, Material, and Bootstrap all use this rhythm. It eliminates arbitrary values and makes layouts feel coherent.',
      library: 'Use Tailwind CSS spacing scale, or define CSS custom properties: --space-1: 4px; --space-2: 8px; --space-4: 16px; etc.'
    });
  }

  // ── 2. Cramped containers (padding < 8px) ────────────────────────────────
  const containers = Array.from(doc.querySelectorAll('section, article, main, aside, [class*="card"], [class*="panel"]'))
    .filter(isVisible).slice(0, 60);

  const cramped = containers.filter(el => {
    const s = window.getComputedStyle(el);
    const pt = parseFloat(s.paddingTop), pb = parseFloat(s.paddingBottom);
    const pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight);
    return (pt > 0 || pb > 0 || pl > 0 || pr > 0) && (pt < 8 || pb < 8 || pl < 8 || pr < 8);
  });

  if (cramped.length > 0) {
    issues.push({
      type: 'Visual',
      severity: 'Minor',
      message: `${cramped.length} container(s) have padding under 8px — content feels cramped.`,
      element: 'multiple',
      selector: cramped.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Give containers at least 16px padding (24px+ for cards). Tight padding makes content hard to read and feels unpolished.',
      library: 'Tailwind: p-4 (16px) is the minimum for cards; p-6 (24px) for sections. Material Design uses 16px as its base content inset.'
    });
  }

  // ── 3. Text containers with no max-width ─────────────────────────────────
  const textBlocks = Array.from(doc.querySelectorAll('p, article, [class*="content"], [class*="body"], [class*="prose"]'))
    .filter(isVisible).slice(0, 50);

  const tooWide = textBlocks.filter(el => {
    const s = window.getComputedStyle(el);
    const width = el.getBoundingClientRect().width;
    const maxWidth = parseFloat(s.maxWidth);
    const fontSize = parseFloat(s.fontSize) || 16;
    const charWidth = fontSize * 0.5;
    const estimatedChars = width / charWidth;
    return estimatedChars > 90 && (isNaN(maxWidth) || maxWidth === 0 || s.maxWidth === 'none');
  });

  if (tooWide.length > 0) {
    issues.push({
      type: 'Visual',
      severity: 'Info',
      message: `${tooWide.length} text block(s) have no max-width and may be too wide to read comfortably.`,
      element: 'p',
      selector: tooWide.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Limit text containers to 60–75ch (roughly 600–750px at 16px). Long lines force the eye to travel too far, tiring the reader.',
      library: 'Tailwind: max-w-prose (65ch). Typographic systems like Radix Themes enforce this automatically on all text components.'
    });
  }

  // ── 4. Too many distinct border-radius values ─────────────────────────────
  const radiusEls = Array.from(doc.querySelectorAll('button, a, input, [class*="card"], [class*="badge"], [class*="chip"], [class*="tag"], img, div'))
    .filter(isVisible).slice(0, 100);

  const radii = new Set();
  radiusEls.forEach(el => {
    const v = window.getComputedStyle(el).borderRadius;
    if (v && v !== '0px' && v !== '0') radii.add(v);
  });

  if (radii.size > 5) {
    issues.push({
      type: 'Visual',
      severity: 'Minor',
      message: `${radii.size} distinct border-radius values detected: ${Array.from(radii).slice(0, 6).join(', ')}.`,
      element: 'multiple',
      selector: 'body',
      recommendation: 'Limit border-radius to 3–4 steps (e.g. sm: 4px, md: 8px, lg: 16px, full: 9999px). Mixing arbitrary radii makes the UI feel inconsistent.',
      library: 'Tailwind defines: rounded-sm (2px), rounded (4px), rounded-md (6px), rounded-lg (8px), rounded-xl (12px), rounded-full. Pick 3–4 and stick to them.'
    });
  }

  // ── 5. Too many font weights ──────────────────────────────────────────────
  const weightEls = Array.from(doc.querySelectorAll('p, span, h1, h2, h3, h4, a, button, label'))
    .filter(isVisible).slice(0, 100);

  const weights = new Set();
  weightEls.forEach(el => {
    const w = window.getComputedStyle(el).fontWeight;
    if (w) weights.add(w);
  });

  if (weights.size > 4) {
    issues.push({
      type: 'Visual',
      severity: 'Minor',
      message: `${weights.size} distinct font weights in use: ${Array.from(weights).join(', ')}.`,
      element: 'multiple',
      selector: 'body',
      recommendation: 'Use 3 weights maximum: regular (400) for body, medium (500) or semibold (600) for UI labels, bold (700) for headings. More than that creates weight noise with no clear hierarchy.',
      library: 'Inter, DM Sans, and most system-UI fonts look best at 400/500/600. Google Fonts lets you load only the weights you need.'
    });
  }

  // ── 6. Too many distinct text colors ─────────────────────────────────────
  const colorEls = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, h5, span, a, li'))
    .filter(isVisible).slice(0, 100);

  const textColors = new Set();
  colorEls.forEach(el => {
    const c = window.getComputedStyle(el).color;
    if (c && c !== 'rgba(0, 0, 0, 0)') textColors.add(c);
  });

  if (textColors.size > 6) {
    issues.push({
      type: 'Visual',
      severity: 'Minor',
      message: `${textColors.size} distinct text colors detected.`,
      element: 'multiple',
      selector: 'body',
      recommendation: 'A text color system needs 3–4 roles: primary (headings/body), secondary (supporting), muted (captions), and one accent (links/actions). More than that signals color drift with no system.',
      library: 'Define CSS custom properties: --color-text-primary, --text-secondary, --text-muted, --text-accent. Tailwind does this with text-slate-900, text-slate-600, text-slate-400.'
    });
  }

  // ── 7. Too many background colors ────────────────────────────────────────
  const bgEls = Array.from(doc.querySelectorAll('section, div, header, footer, aside, nav, article'))
    .filter(isVisible).slice(0, 80);

  const bgColors = new Set();
  bgEls.forEach(el => {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') bgColors.add(bg);
  });

  if (bgColors.size > 7) {
    issues.push({
      type: 'Visual',
      severity: 'Info',
      message: `${bgColors.size} distinct background colors detected.`,
      element: 'multiple',
      selector: 'body',
      recommendation: 'Limit background colors to 4–5 roles: page canvas, surface/card, subtle (tinted), inverse (dark), and overlays. More creates visual fragmentation.',
      library: 'Radix Themes and Shadcn/UI define background as a token system (--background, --card, --muted, --accent) — a consistent pattern worth adopting.'
    });
  }

  // ── 8. Animations without prefers-reduced-motion ─────────────────────────
  const animatedEls = Array.from(doc.querySelectorAll('*'))
    .filter(isVisible).slice(0, 100).filter(el => {
      const s = window.getComputedStyle(el);
      return (s.animationName && s.animationName !== 'none') ||
             (s.transitionDuration && s.transitionDuration !== '0s');
    });

  if (animatedEls.length > 0) {
    // Check if a prefers-reduced-motion rule exists anywhere in stylesheets
    let hasReducedMotion = false;
    try {
      for (const sheet of Array.from(doc.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          if (rules.some(r => r.cssText && r.cssText.includes('prefers-reduced-motion'))) {
            hasReducedMotion = true;
            break;
          }
        } catch (e) { /* cross-origin stylesheet */ }
      }
    } catch (e) {}

    if (!hasReducedMotion) {
      issues.push({
        type: 'Visual',
        severity: 'Major',
        message: `${animatedEls.length} animated element(s) found but no prefers-reduced-motion media query detected.`,
        element: 'multiple',
        selector: animatedEls.slice(0, 3).map(getSelector).join(', '),
        wcagRef: '2.3.3',
        recommendation: 'Add @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } } — this single rule respects OS accessibility settings for users with vestibular disorders.',
        library: 'Tailwind includes motion-reduce: variants out of the box. Framer Motion has a useReducedMotion() hook.'
      });
    }
  }

  // ── 9. Very fast or very slow transitions ────────────────────────────────
  const transitionEls = Array.from(doc.querySelectorAll('a, button, [class*="transition"], [class*="animate"]'))
    .filter(isVisible).slice(0, 60);

  const badTransitions = [];
  transitionEls.forEach(el => {
    const dur = parseFloat(window.getComputedStyle(el).transitionDuration) * 1000;
    if (dur > 0 && (dur < 80 || dur > 800)) {
      badTransitions.push({ el, dur });
    }
  });

  if (badTransitions.length > 0) {
    const fast = badTransitions.filter(t => t.dur < 80).length;
    const slow = badTransitions.filter(t => t.dur > 800).length;
    const desc = [fast && `${fast} too fast (< 80ms)`, slow && `${slow} too slow (> 800ms)`].filter(Boolean).join(', ');
    issues.push({
      type: 'Visual',
      severity: 'Info',
      message: `${badTransitions.length} transition(s) have unusual durations: ${desc}.`,
      element: 'multiple',
      selector: badTransitions.slice(0, 3).map(t => getSelector(t.el)).join(', '),
      recommendation: 'UI transitions feel best between 100ms (micro-interactions) and 400ms (page-level). Under 80ms is imperceptible; over 800ms feels sluggish.',
      library: 'Tailwind defaults: duration-150 (150ms) for hovers, duration-300 (300ms) for panels. These are well-tested defaults.'
    });
  }

  // ── 10. Images missing width/height (causes CLS) ─────────────────────────
  const images = Array.from(doc.querySelectorAll('img')).slice(0, 80);
  const missingDimensions = images.filter(img => !img.getAttribute('width') || !img.getAttribute('height'));

  if (missingDimensions.length > 0) {
    issues.push({
      type: 'Visual',
      severity: 'Major',
      message: `${missingDimensions.length} image(s) are missing width/height attributes — causes layout shift (CLS).`,
      element: 'img',
      selector: missingDimensions.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Always set width and height on <img> so the browser reserves space before the image loads. This eliminates Cumulative Layout Shift, a Core Web Vitals metric.',
      library: 'Next.js <Image>, Nuxt <NuxtImg>, Astro <Image>, and SvelteKit all enforce dimensions automatically. If using plain HTML, add width/height to every img tag.'
    });
  }

  // ── 11. Below-fold images without lazy loading ───────────────────────────
  const viewportH = window.innerHeight;
  const nonLazyBelowFold = images.filter(img => {
    const rect = img.getBoundingClientRect();
    return rect.top > viewportH && img.getAttribute('loading') !== 'lazy' && !img.getAttribute('loading');
  });

  if (nonLazyBelowFold.length > 0) {
    issues.push({
      type: 'Visual',
      severity: 'Minor',
      message: `${nonLazyBelowFold.length} below-fold image(s) are missing loading="lazy".`,
      element: 'img',
      selector: nonLazyBelowFold.slice(0, 3).map(getSelector).join(', '),
      recommendation: 'Add loading="lazy" to images below the fold. This defers their download until the user scrolls near them, improving initial page load speed.',
      library: 'All major framework image components (Next.js, Nuxt, Astro) enable lazy loading by default. For plain HTML it\'s just one attribute: loading="lazy".'
    });
  }

  return issues;
};
