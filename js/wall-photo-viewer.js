import { animateUi, cancelUiExit, cancelUiMotion, exitUi } from './ui-motion.js';

export function fittedPhoto(width, height, availableWidth, availableHeight, zoom = 1) {
  if (!(width > 0 && height > 0 && availableWidth > 0 && availableHeight > 0)) return null;
  const scale = Math.min(availableWidth / width, availableHeight / height) * zoom;
  return { width:width * scale, height:height * scale };
}
let dialog, stage, canvas, image, opener, zoom = 1, observer;
function size() {
  if (!dialog.open || !image?.naturalWidth) return;
  const bounds = fittedPhoto(image.naturalWidth, image.naturalHeight, Math.max(1, stage.clientWidth - 32), Math.max(1, stage.clientHeight - 24), zoom);
  image.style.width = `${bounds.width}px`; image.style.height = `${bounds.height}px`;
  canvas.style.width = `${Math.max(stage.clientWidth, bounds.width + 32)}px`;
  canvas.style.height = `${Math.max(stage.clientHeight, bounds.height + 24)}px`;
  stage.scrollTo({ left:(canvas.offsetWidth - stage.clientWidth) / 2, top:(canvas.offsetHeight - stage.clientHeight) / 2, behavior:'instant' });
}
function setup() {
  if (dialog) return;
  dialog = document.createElement('dialog'); dialog.className = 'wall-photo-viewer';
  dialog.setAttribute('aria-labelledby', 'wall-photo-title');
  dialog.innerHTML = '<header><h2 id="wall-photo-title" tabindex="-1" autofocus>Wall photo</h2><div><button type="button" class="linkbtn" data-photo-zoom aria-pressed="false" disabled>Zoom 2×</button><button type="button" class="linkbtn" data-photo-close>Close</button></div></header><div class="wall-photo-stage"><div class="wall-photo-canvas"></div></div><p role="status" data-photo-status></p>';
  document.body.append(dialog); stage = dialog.querySelector('.wall-photo-stage'); canvas = dialog.querySelector('.wall-photo-canvas');
  const dismiss = options => exitUi(dialog, () => dialog.close(), options);
  dialog.querySelector('[data-photo-close]').onclick = () => dismiss();
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('click', event => { if (event.target === dialog || event.target === canvas || event.target === stage) dismiss(); });
  const changeZoom = () => {
    if (!image?.naturalWidth) return;
    const old = image.getBoundingClientRect(); zoom = zoom === 1 ? 2 : 1; size();
    const next = image.getBoundingClientRect();
    const button = dialog.querySelector('[data-photo-zoom]');
    button.setAttribute('aria-pressed', String(zoom === 2)); button.textContent = zoom === 2 ? 'Fit photo' : 'Zoom 2×';
    animateUi(image, [{ transform:`translate(${old.left + old.width/2 - next.left - next.width/2}px,${old.top + old.height/2 - next.top - next.height/2}px) scale(${old.width/next.width})` }, { transform:'none' }], { duration:240 });
  };
  dialog.querySelector('[data-photo-zoom]').onclick = changeZoom;
  canvas.addEventListener('dblclick', event => { if (event.target === image) changeZoom(); });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    cancelUiExit(dialog); cancelUiMotion(dialog); observer?.disconnect();
    image?.remove(); image = null;
    const post = opener?.closest('[data-wall-post]')?.dataset.wallPost;
    const replacement = post && document.querySelector(`[data-wall-post="${CSS.escape(post)}"] [data-wall-photo-open]`);
    (opener?.isConnected ? opener : replacement)?.focus({ preventScroll:true }); opener = null;
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dismiss({ immediate:true }); });
}
export function openWallPhoto(button) {
  const source = button.querySelector('img');
  if (!source?.getAttribute('src')) return;
  setup(); cancelUiExit(dialog); cancelUiMotion(dialog); observer?.disconnect();
  opener = button; zoom = 1; canvas.replaceChildren();
  image = document.createElement('img'); const current = image;
  image.alt = source.alt || 'Wall photo';
  dialog.querySelector('h2').textContent = source.alt || 'Wall photo';
  const status = dialog.querySelector('[data-photo-status]'); status.textContent = 'Loading photo…';
  const zoomButton = dialog.querySelector('[data-photo-zoom]'); zoomButton.disabled = true; zoomButton.textContent = 'Zoom 2×'; zoomButton.setAttribute('aria-pressed', 'false');
  const from = button.getBoundingClientRect();
  image.onload = () => {
    if (image !== current || !dialog.open) return;
    status.textContent = ''; zoomButton.disabled = false; size();
    const to = image.getBoundingClientRect();
    animateUi(image, [{ opacity:.4, transform:`translate(${from.left + from.width/2 - to.left - to.width/2}px,${from.top + from.height/2 - to.top - to.height/2}px) scale(${Math.min(from.width/to.width,from.height/to.height)})` }, { opacity:1, transform:'none' }], { duration:260 });
  };
  image.onerror = () => { if (image === current && dialog.open) status.textContent = 'Photo unavailable. Close and try again.'; };
  image.src = source.currentSrc || source.src; canvas.append(image);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('h2').focus({ preventScroll:true });
  animateUi(dialog, [{ opacity:0 }, { opacity:1 }], { duration:180 });
  observer = new ResizeObserver(size); observer.observe(stage);
}
export function mountWallPhotoViewer(root, signal) {
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-wall-photo-open]');
    if (button && root.contains(button)) openWallPhoto(button);
  }, { signal });
}
