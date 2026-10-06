// Browser evidence: measure actual visible text against composited CSS surfaces.
// Raster illustration contrast still requires the accompanying visual review.
export function reviewTextContrast() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = color => {
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  };
  const over = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] / 255 + back[i] * (1 - front[3] / 255));
  const luminance = rgb => rgb.slice(0, 3).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const checks = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, e = node.parentElement, text = node.textContent.trim();
    if (!text || !e.closest('#home-wrap,.topbar,#tabbar,#more') || e.closest('.sr-only,[aria-hidden="true"],.bx-leaving,[disabled]')) continue;
    const ancestors = [];
    for (let a = e; a; a = a.parentElement) ancestors.push(a);
    if (ancestors.some(a => { const s = getComputedStyle(a); return s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < .1 || s.clipPath === 'inset(50%)'; })) continue;
    const range = document.createRange(); range.selectNode(node);
    const r = range.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) continue;
    let bg = [255, 255, 255];
    for (const a of ancestors.reverse()) bg = over(rgba(getComputedStyle(a).backgroundColor), bg);
    const style = getComputedStyle(e), fg = over(rgba(style.color), bg);
    const l1 = luminance(fg), l2 = luminance(bg), ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
    checks.push({ text: text.slice(0, 90), class: e.className, color: style.color, background: bg.map(Math.round), ratio: Number(ratio.toFixed(2)), required: large ? 3 : 4.5 });
  }
  return { checked: checks.length, minimum: Math.min(...checks.map(c => c.ratio)), failures: checks.filter(c => c.ratio + .01 < c.required), checks };
}
