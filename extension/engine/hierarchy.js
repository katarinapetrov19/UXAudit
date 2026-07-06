window.UXCheckEngine = window.UXCheckEngine || {};
window.UXCheckEngine.checkHierarchy = async (doc) => {
  const issues = [];
  const y = () => new Promise(r => setTimeout(r, 0));

  function gs(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + Array.from(el.classList).slice(0,2).join('.');
    return s;
  }

  function getText(el) { return (el.textContent||'').trim(); }

  function isSaturated(color) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [r,g,b] = [+m[1],+m[2],+m[3]];
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    const l=(max+min)/2/255, sat=max===min?0:(max-min)/255/(1-Math.abs(2*l-1));
    return sat>0.35 && l>0.2 && l<0.85;
  }

  // 1. Too many primary buttons
  await y();
  const buttons = Array.from(doc.querySelectorAll('button,[role="button"],input[type="submit"]')).slice(0,80);
  const primary = buttons.filter(b => isSaturated(window.getComputedStyle(b).backgroundColor));
  if (primary.length > 3) issues.push({ type:'Hierarchy', severity:'Minor',
    message:`${primary.length} filled/primary buttons detected.`,
    element:'button', selector:primary.slice(0,3).map(gs).join(', '),
    recommendation:'Use one primary (filled) button per section. Demote others to outlined or ghost styles.' });

  // 2. Icon-only buttons without label
  await y();
  const iconOnly = buttons.filter(b => !getText(b) && !b.hasAttribute('aria-label') && !b.hasAttribute('title'));
  if (iconOnly.length) issues.push({ type:'Hierarchy', severity:'Major',
    message:`${iconOnly.length} button(s) have no text and no accessible label.`,
    element:'button', selector:iconOnly.slice(0,3).map(gs).join(', '), wcagRef:'4.1.2',
    recommendation:'Add aria-label to all icon-only buttons.' });

  // 3. Forms without submit
  await y();
  Array.from(doc.querySelectorAll('form')).slice(0,20).forEach(form => {
    if (!form.querySelector('button[type="submit"],button:not([type]),input[type="submit"]'))
      issues.push({ type:'Hierarchy', severity:'Major',
        message:'A form has no submit button.',
        element:'form', selector:gs(form),
        recommendation:'Every form needs a clearly visible submit action.' });
  });

  // 4. Dialogs with too many inputs
  await y();
  Array.from(doc.querySelectorAll('[role="dialog"],dialog')).slice(0,10).forEach(d => {
    const inputs = d.querySelectorAll('input,select,textarea');
    if (inputs.length > 4) issues.push({ type:'Hierarchy', severity:'Minor',
      message:`A modal contains ${inputs.length} inputs — may be too complex.`,
      element:'dialog', selector:gs(d),
      recommendation:'Dialogs work best for 1–2 step decisions. Consider a full page for complex forms.' });
  });

  // 5. Destructive button next to primary
  await y();
  const destructiveTerms = /\b(delete|remove|destroy|clear all|reset|discard)\b/i;
  Array.from(doc.querySelectorAll('button,[role="button"]')).slice(0,50).filter(b => destructiveTerms.test(getText(b))).forEach(btn => {
    const sibs = Array.from(btn.parentElement?.children||[]);
    const adjPrimary = sibs.some(s => s!==btn && isSaturated(window.getComputedStyle(s).backgroundColor) && (s.tagName==='BUTTON'||s.getAttribute('role')==='button'));
    if (adjPrimary) issues.push({ type:'Hierarchy', severity:'Minor',
      message:`Destructive action ("${getText(btn).slice(0,30)}") is adjacent to a primary button.`,
      element:btn.tagName.toLowerCase(), selector:gs(btn),
      recommendation:'Separate destructive actions from primary CTAs visually.' });
  });

  return issues;
};
