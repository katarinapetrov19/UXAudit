window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkResponsive = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));
  const vw = window.innerWidth;

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0,2).join('.');
    return s;
  }

  // 1. Viewport meta
  await y();
  const vp = doc.querySelector('meta[name="viewport"]');
  if (!vp) {
    issues.push({ type:'Responsive', severity:'Critical',
      message:'Missing <meta name="viewport"> tag.',
      element:'head', selector:'head',
      recommendation:'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
  } else {
    const c = vp.getAttribute('content')||'';
    if (!c.includes('width=device-width')) issues.push({ type:'Responsive', severity:'Major',
      message:'Viewport meta missing "width=device-width".',
      element:'meta', selector:'meta[name="viewport"]',
      recommendation:'Set content="width=device-width, initial-scale=1".' });
    if (c.includes('user-scalable=no')||c.includes('maximum-scale=1')) issues.push({ type:'Responsive', severity:'Major',
      message:'Viewport meta disables user zoom.',
      element:'meta', selector:'meta[name="viewport"]', wcagRef:'1.4.4',
      recommendation:'Remove user-scalable=no — users with low vision need zoom.' });
  }

  // 2. Horizontal overflow
  await y();
  if (doc.body && doc.body.scrollWidth > vw + 5) issues.push({ type:'Responsive', severity:'Major',
    message:`Page content is wider than viewport (${doc.body.scrollWidth}px vs ${vw}px).`,
    element:'body', selector:'body',
    recommendation:'Find elements with fixed widths wider than the viewport and make them fluid.' });

  // 3. Touch targets < 24px — cap 60
  await y();
  const touchEls = Array.from(doc.querySelectorAll('a,button,input,select,textarea')).slice(0,60);
  const small = touchEls.filter(el => { const r=el.getBoundingClientRect(); return r.width>0&&(r.width<24||r.height<24); });
  if (small.length) issues.push({ type:'Responsive', severity:'Major',
    message:`${small.length} interactive element(s) smaller than 24×24px.`,
    element:'multiple', selector:small.slice(0,3).map(gs).join(', '), wcagRef:'2.5.8',
    recommendation:'Make touch targets at least 44×44px. Increase padding, not just icon size.' });

  // 4. Images without max-width — cap 30
  await y();
  Array.from(doc.querySelectorAll('img')).slice(0,30).forEach(img => {
    const w = img.getAttribute('width');
    if (w && parseInt(w)>600 && !(img.getAttribute('style')||'').includes('max-width'))
      issues.push({ type:'Responsive', severity:'Minor',
        message:`Image has fixed width="${w}" with no max-width.`,
        element:'img', selector:gs(img),
        recommendation:'Add max-width:100%;height:auto to images so they scale on small screens.' });
  });

  // 5. Wrong input types for mobile — cap 30
  await y();
  Array.from(doc.querySelectorAll('input[type="text"]')).slice(0,30).forEach(input => {
    const hint = (input.name||input.placeholder||input.id||'').toLowerCase();
    if (/email|mail/.test(hint)) issues.push({ type:'Responsive', severity:'Info',
      message:'Text input for email — use type="email" for better mobile keyboard.',
      element:'input', selector:gs(input),
      recommendation:'type="email" triggers the email keyboard on mobile.' });
    else if (/phone|tel|mobile/.test(hint)) issues.push({ type:'Responsive', severity:'Info',
      message:'Text input for phone — use type="tel" for better mobile keyboard.',
      element:'input', selector:gs(input),
      recommendation:'type="tel" triggers the numeric keyboard on mobile.' });
  });

  return issues;
};
