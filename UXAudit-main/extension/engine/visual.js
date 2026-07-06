/**
 * Visual design checks — spacing, consistency, motion, images.
 * Rule: ALWAYS .slice(N) FIRST, then .filter() — never filter before slice.
 */
window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkVisual = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    return s;
  }

  const GRID = new Set([0,1,2,4,8,12,16,20,24,28,32,40,48,56,64,80,96,120,160]);

  // ── 1. Spacing off-grid — slice FIRST ────────────────────────────────────
  await y();
  const spacingEls = Array.from(doc.querySelectorAll('section,article,main,header,footer,p')).slice(0, 25);
  let offGrid = 0, total = 0;
  spacingEls.forEach(el => {
    const s = window.getComputedStyle(el);
    ['paddingTop','paddingBottom','paddingLeft','paddingRight'].forEach(p => {
      const v = parseFloat(s[p]);
      if (v > 0) { total++; if (!GRID.has(Math.round(v))) offGrid++; }
    });
  });
  if (total > 8 && offGrid / total > 0.4) issues.push({
    type:'Visual', severity:'Minor',
    message:`${Math.round(offGrid/total*100)}% of spacing values are off the 8pt grid.`,
    element:'multiple', selector:'body',
    recommendation:'Snap spacing to 4/8/16/24/32/48/64px. Consistent rhythm makes layouts feel coherent.',
    library:'Tailwind spacing scale or CSS custom properties: --space-2: 8px; --space-4: 16px; etc.'
  });

  // ── 2. Cramped containers — slice FIRST ──────────────────────────────────
  await y();
  const cramped = Array.from(doc.querySelectorAll('section,article,main,aside')).slice(0, 30).filter(el => {
    const s = window.getComputedStyle(el);
    const vals = [parseFloat(s.paddingTop),parseFloat(s.paddingBottom),parseFloat(s.paddingLeft),parseFloat(s.paddingRight)];
    return vals.some(v => v > 0 && v < 8);
  });
  if (cramped.length) issues.push({
    type:'Visual', severity:'Minor',
    message:`${cramped.length} container(s) have padding under 8px.`,
    element:'multiple', selector:cramped.slice(0,3).map(gs).join(', '),
    recommendation:'Give containers at least 16px padding (24px+ for cards).',
    library:'Tailwind: p-4 (16px) minimum for cards, p-6 (24px) for sections.'
  });

  // ── 3. Border-radius chaos — slice FIRST, no isVisible ───────────────────
  await y();
  const radii = new Set();
  Array.from(doc.querySelectorAll('button,a,input')).slice(0, 40).forEach(el => {
    const v = window.getComputedStyle(el).borderRadius;
    if (v && v !== '0px' && v !== '0') radii.add(v);
  });
  if (radii.size > 5) issues.push({
    type:'Visual', severity:'Minor',
    message:`${radii.size} distinct border-radius values: ${Array.from(radii).slice(0,5).join(', ')}.`,
    element:'multiple', selector:'body',
    recommendation:'Limit to 3–4 radius steps (sm/md/lg/full). Arbitrary radii feel inconsistent.',
    library:'Tailwind: rounded-sm, rounded-md, rounded-lg, rounded-xl, rounded-full. Pick 3–4 and stick.'
  });

  // ── 4. Font weight noise — slice FIRST, no isVisible ─────────────────────
  await y();
  const weights = new Set();
  Array.from(doc.querySelectorAll('p,h1,h2,h3,a,button')).slice(0, 40).forEach(el => {
    const w = window.getComputedStyle(el).fontWeight;
    if (w) weights.add(w);
  });
  if (weights.size > 4) issues.push({
    type:'Visual', severity:'Minor',
    message:`${weights.size} distinct font weights: ${Array.from(weights).join(', ')}.`,
    element:'multiple', selector:'body',
    recommendation:'Use 3 weights max: 400 body, 500/600 labels, 700 headings.',
    library:'Inter and DM Sans look best at 400/500/600. Load only needed weights via Google Fonts.'
  });

  // ── 5. Text color scatter — slice FIRST, no isVisible ────────────────────
  await y();
  const textColors = new Set();
  Array.from(doc.querySelectorAll('p,h1,h2,h3,a,li')).slice(0, 40).forEach(el => {
    const c = window.getComputedStyle(el).color;
    if (c && c !== 'rgba(0, 0, 0, 0)') textColors.add(c);
  });
  if (textColors.size > 6) issues.push({
    type:'Visual', severity:'Minor',
    message:`${textColors.size} distinct text colors detected.`,
    element:'multiple', selector:'body',
    recommendation:'Define 3–4 text color roles: primary, secondary, muted, accent.',
    library:'Tailwind: text-slate-900 / text-slate-600 / text-slate-400. Or CSS: --text-primary, --text-muted.'
  });

  // ── 6. Background color scatter — slice FIRST, no isVisible ──────────────
  await y();
  const bgColors = new Set();
  Array.from(doc.querySelectorAll('section,header,footer,nav,aside')).slice(0, 30).forEach(el => {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') bgColors.add(bg);
  });
  if (bgColors.size > 7) issues.push({
    type:'Visual', severity:'Info',
    message:`${bgColors.size} distinct background colors detected.`,
    element:'multiple', selector:'body',
    recommendation:'Limit backgrounds to 4–5 roles: canvas, surface, subtle, inverse, overlay.',
    library:'Shadcn/UI: --background, --card, --muted, --accent — a simple 4-token system.'
  });

  // ── 7. Missing prefers-reduced-motion — slice FIRST ──────────────────────
  await y();
  const animated = Array.from(doc.querySelectorAll('a,button,[class*="animate"],[class*="fade"]')).slice(0, 30).filter(el => {
    const s = window.getComputedStyle(el);
    return (s.animationName && s.animationName !== 'none') || (s.transitionDuration && s.transitionDuration !== '0s');
  });
  if (animated.length) {
    let hasReducedMotion = false;
    try {
      for (const sheet of Array.from(doc.styleSheets)) {
        try {
          if (Array.from(sheet.cssRules||[]).some(r => r.cssText?.includes('prefers-reduced-motion'))) {
            hasReducedMotion = true; break;
          }
        } catch (e) {}
      }
    } catch (e) {}
    if (!hasReducedMotion) issues.push({
      type:'Visual', severity:'Major',
      message:`${animated.length} animated element(s) — no prefers-reduced-motion query found.`,
      element:'multiple', selector:animated.slice(0,3).map(gs).join(', '), wcagRef:'2.3.3',
      recommendation:'Add @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important } }',
      library:'Tailwind: motion-reduce: variants built in. Framer Motion: useReducedMotion() hook.'
    });
  }

  // ── 8. Images missing width/height — slice FIRST ─────────────────────────
  await y();
  const imgs = Array.from(doc.querySelectorAll('img')).slice(0, 50);
  const missingDims = imgs.filter(img => !img.getAttribute('width') || !img.getAttribute('height'));
  if (missingDims.length) issues.push({
    type:'Visual', severity:'Major',
    message:`${missingDims.length} image(s) missing width/height attributes — causes layout shift (CLS).`,
    element:'img', selector:missingDims.slice(0,3).map(gs).join(', '),
    recommendation:'Set width and height on every <img> so the browser reserves space before loading.',
    library:'Next.js <Image>, Nuxt <NuxtImg>, Astro <Image> all enforce this automatically.'
  });

  // ── 9. Below-fold images without lazy loading ────────────────────────────
  await y();
  const vh = window.innerHeight;
  const noLazy = imgs.filter(img => img.getBoundingClientRect().top > vh && !img.getAttribute('loading'));
  if (noLazy.length) issues.push({
    type:'Visual', severity:'Minor',
    message:`${noLazy.length} below-fold image(s) missing loading="lazy".`,
    element:'img', selector:noLazy.slice(0,3).map(gs).join(', '),
    recommendation:'Add loading="lazy" to below-fold images to improve initial load speed.',
    library:'Framework image components (Next.js, Nuxt, Astro) enable lazy loading by default.'
  });

  return issues;
};
