window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkHeuristics = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0,2).join('.');
    return s;
  }

  // 1. Small fonts — cap 60
  await y();
  const smallFonts = new Set();
  Array.from(doc.querySelectorAll('p,li,td')).slice(0,60).forEach(el => {
    if (el.children.length===0 && (el.textContent||'').trim().length>10 &&
        parseFloat(window.getComputedStyle(el).fontSize) < 12)
      smallFonts.add(gs(el));
  });
  if (smallFonts.size) issues.push({ type:'Heuristics', severity:'Major',
    message:'Small font size detected (< 12px).',
    element:'multiple', selector:Array.from(smallFonts).slice(0,3).join(', '),
    recommendation:'Use at least 12px (preferably 16px) for readable body text.' });

  // 2. Vague link text — cap 80
  await y();
  const vague = ['click here','read more','learn more','more','here','link'];
  Array.from(doc.querySelectorAll('a')).slice(0,80).forEach(a => {
    const t = (a.textContent||'').trim().toLowerCase();
    if (vague.includes(t)) issues.push({ type:'Heuristics', severity:'Major',
      message:`Vague link text: "${(a.textContent||'').trim()}".`,
      element:'a', selector:gs(a), wcagRef:'2.4.4',
      recommendation:'Use descriptive link text that makes sense out of context.' });
  });

  // 3. Placeholder/empty links — cap 80
  await y();
  Array.from(doc.querySelectorAll('a')).slice(0,80).forEach(a => {
    const href = a.getAttribute('href');
    if (!href||href==='#'||href==='') issues.push({ type:'Heuristics', severity:'Minor',
      message:'Empty or placeholder link.',
      element:'a', selector:gs(a),
      recommendation:'All links should have a valid destination URL.' });
  });

  // 4. Missing page title
  await y();
  if (!doc.title||!doc.title.trim()) issues.push({ type:'Heuristics', severity:'Major',
    message:'Page is missing a <title>.',
    element:'head', selector:'title', wcagRef:'2.4.2',
    recommendation:'Add a descriptive <title> tag.' });

  // 5. Links opening in new window — count
  await y();
  const newTab = doc.querySelectorAll('a[target="_blank"]');
  if (newTab.length) issues.push({ type:'Heuristics', severity:'Info',
    message:`${newTab.length} link(s) open in a new window.`,
    element:'a', selector:'a[target="_blank"]',
    recommendation:'Inform users when links open in a new window.' });

  // 6. Too many font families — cap 30
  await y();
  const families = new Set();
  Array.from(doc.querySelectorAll('p,h1,h2,h3')).slice(0,30).forEach(el => {
    const f = (window.getComputedStyle(el).fontFamily||'').split(',')[0].trim().replace(/['"]/g,'').toLowerCase();
    if (f) families.add(f);
  });
  if (families.size > 3) issues.push({ type:'Heuristics', severity:'Minor',
    message:`${families.size} inline font families detected.`,
    element:'body', selector:'body',
    recommendation:'Limit font families to 2–3 for visual consistency.' });

  return issues;
};
