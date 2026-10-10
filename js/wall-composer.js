import { animateUi } from './ui-motion.js';

export function mountWallComposer(form, signal) {
  if (!form) return;
  const area = form.querySelector('[data-wall-body]');
  const toggle = form.querySelector('[data-wall-photo-toggle]');
  const tools = form.querySelector('[data-wall-photo-tools]');
  const image = form.querySelector('[data-imgf-value][name="image"]');
  if (!area || !toggle || !tools) return;
  const sync = () => {
    const writing = !!area.value.trim() || form.contains(document.activeElement) || !tools.hidden;
    form.classList.toggle('is-writing', writing);
    toggle.classList.toggle('has-photo', !!image?.value);
    toggle.setAttribute('aria-label', image?.value ? 'Photo attached; toggle photo controls' : 'Add a photo');
    area.style.height = 'auto';
    area.style.height = `${Math.min(160, Math.max(writing ? 72 : 44, area.scrollHeight))}px`;
  };
  toggle.addEventListener('click', () => {
    tools.hidden = !tools.hidden;
    toggle.setAttribute('aria-expanded', String(!tools.hidden));
    sync();
    if (!tools.hidden) animateUi(tools, [{opacity:0, transform:'translateY(-4px)'}, {opacity:1, transform:'translateY(0)'}], {duration:180});
  }, { signal });
  form.addEventListener('input', sync, { signal });
  form.addEventListener('change', sync, { signal });
  form.addEventListener('focusin', sync, { signal });
  form.addEventListener('focusout', () => requestAnimationFrame(() => { if (!signal?.aborted) sync(); }), { signal });
  sync();
}
