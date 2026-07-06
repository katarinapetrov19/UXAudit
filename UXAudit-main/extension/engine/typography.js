window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkTypography = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0, 2).join('.');
    return s;
  }

  // 1. Font sizes — 40 elements
  await y();
  const fontSizes = new Set();
  Array.from(doc.querySelectorAll('h1,h2,h3,p,a,button')).slice(0, 40).forEach(el => {
    if (el.children.length === 0 && (el.textContent||'').trim().length > 3)
      fontSizes.add(Math.round(parseFloat(window.getComputedStyle(el).fontSize)));
  });
  if (fontSizes.size > 6) issues.push({ type:'Typography', severity:'Minor',
    message:`${fontSizes.size} distinct font sizes detected: ${Array.from(fontSizes).sort((a,b)=>a-b).join('px, ')}px.`,
    element:'multiple', selector:'body',
    recommendation:'Limit font sizes to 3–5 steps for a clear hierarchy.' });

  // 2. Body text < 14px — 40 elements
  await y();
  const tooSmall = new Set();
  Array.from(doc.querySelectorAll('p,li,td')).slice(0, 40).forEach(el => {
    if ((el.textContent||'').trim().length > 20 && parseFloat(window.getComputedStyle(el).fontSize) < 14)
      tooSmall.add(gs(el));
  });
  if (tooSmall.size) issues.push({ type:'Typography', severity:'Major',
    message:`${tooSmall.size} body text element(s) smaller than 14px.`,
    element:'multiple', selector:Array.from(tooSmall).slice(0,3).join(', '),
    recommendation:'Body content should be at least 14px (16px preferred).' });

  // 3. Tight line height — 30 elements
  await y();
  const tightLH = new Set();
  Array.from(doc.querySelectorAll('p')).slice(0, 30).forEach(el => {
    if ((el.textContent||'').trim().length > 40) {
      const s = window.getComputedStyle(el);
      if (parseFloat(s.fontSize) > 0 && parseFloat(s.lineHeight)/parseFloat(s.fontSize) < 1.3)
        tightLH.add(gs(el));
    }
  });
  if (tightLH.size) issues.push({ type:'Typography', severity:'Minor',
    message:`${tightLH.size} paragraph(s) have tight line height (< 1.3).`,
    element:'p', selector:Array.from(tightLH).slice(0,3).join(', '),
    recommendation:'Set line-height to 1.4–1.6 for body text.' });

  // 4. Too many font families — 30 elements
  await y();
  const families = new Set();
  Array.from(doc.querySelectorAll('p,h1,h2,button,a')).slice(0, 30).forEach(el => {
    const f = (window.getComputedStyle(el).fontFamily||'').split(',')[0].trim().replace(/['"]/g,'').toLowerCase();
    if (f) families.add(f);
  });
  if (families.size > 3) issues.push({ type:'Typography', severity:'Minor',
    message:`${families.size} font families in use: ${Array.from(families).join(', ')}.`,
    element:'body', selector:'body',
    recommendation:'Stick to 1–2 font families for visual consistency.' });

  return issues;
};
