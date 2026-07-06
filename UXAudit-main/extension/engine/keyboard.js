window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkKeyboard = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0,2).join('.');
    return s;
  }

  // 1. tabindex > 0
  await y();
  Array.from(doc.querySelectorAll('[tabindex]')).slice(0,50).forEach(el => {
    if (parseInt(el.getAttribute('tabindex')) > 0) issues.push({
      type:'Keyboard', severity:'Major',
      message:'Avoid tabindex > 0.',
      element:el.tagName.toLowerCase(), selector:gs(el), wcagRef:'2.4.3',
      recommendation:'Use natural DOM order. Use tabindex="0" or "-1" only.'
    });
  });

  // 2. Clickable but not focusable
  await y();
  Array.from(doc.querySelectorAll('[onclick],.btn,.button')).slice(0,50).forEach(el => {
    if (el.tabIndex < 0 && !['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(el.tagName))
      issues.push({ type:'Keyboard', severity:'Critical',
        message:'Interactive element is not keyboard focusable.',
        element:el.tagName.toLowerCase(), selector:gs(el), wcagRef:'2.1.1',
        recommendation:'Use <button> or add tabindex="0".' });
  });

  // 3. Focus indicators — count, report once
  await y();
  let noOutline = 0;
  const noOutlineSels = [];
  Array.from(doc.querySelectorAll('button,a,input,select,textarea')).slice(0,60).forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0) {
      noOutline++;
      if (noOutlineSels.length < 3) noOutlineSels.push(gs(el));
    }
  });
  if (noOutline) issues.push({ type:'Keyboard', severity:'Info',
    message:`${noOutline} focusable element(s) have no visible outline.`,
    element:'multiple', selector:noOutlineSels.join(', '), wcagRef:'2.4.7',
    recommendation:'Ensure all focusable elements have a visible :focus style.' });

  return issues;
};
