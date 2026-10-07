import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const scope = 'https://example.com/dfl-hq/';
function worker({ offline = false, saved = {} } = {}) {
  const handlers = {};
  const key = request => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const entries = new Map([[`${scope}index.html`, new Response('Cached app shell', { headers: { 'Content-Type': 'text/html' } })],
    ...Object.entries(saved).map(([path, body]) => [new URL(path, scope).href, new Response(body, { headers: { 'Content-Type': 'text/html' } })])]);
  const match = async request => entries.get(key(request))?.clone();
  const fetch = vi.fn(async request => {
    if (offline) throw new Error('Offline');
    const url = key(request);
    const image = url.endsWith('.webp');
    return new Response(url === `${scope}index.html` ? 'Fresh app shell' : image ? 'Image bytes' : 'Design preview', {
      headers: { 'Content-Type': image ? 'image/webp' : 'text/html' },
    });
  });
  runInNewContext(source, {
    URL, Request, Response, fetch, console,
    location: { origin: 'https://example.com' },
    caches: { match, open: async () => ({ put: async (request, response) => entries.set(key(request), response) }) },
    self: { registration: { scope }, addEventListener: (name, callback) => { handlers[name] = callback; } },
  });
  return {
    fetch,
    async navigate(path) {
      let response;
      const pending = [];
      handlers.fetch({
        request: { method: 'GET', url: new URL(path, scope).href, mode: 'navigate', destination: 'document' },
        waitUntil: promise => pending.push(promise), respondWith: promise => { response = promise; },
      });
      const result = await response;
      await Promise.all(pending);
      return result;
    },
  };
}

describe('installed app worker navigation', () => {
  it.each(['./', 'index.html', './#/home', './#/trade'])('keeps the cached app shell at the app entry %s', async path => {
    const sw = worker();
    expect(await (await sw.navigate(path)).text()).toBe('Cached app shell');
    expect(sw.fetch.mock.calls[0][0].url).toBe(`${scope}index.html`);
  });
  it('waits for fresh app HTML when the update button adds its query', async () => {
    const sw = worker();
    expect(await (await sw.navigate('./?u=release')).text()).toBe('Fresh app shell');
  });
  it.each(['design/home-options/', 'design/home-options/index.html', 'design/home-options/?u=preview'])('opens the standalone page itself at %s', async path => {
    const sw = worker();
    expect(await (await sw.navigate(path)).text()).toBe('Design preview');
    expect(sw.fetch.mock.calls[0][0].url).toBe(new URL(path, scope).href);
  });
  it('opens an image with its image response rather than HTML', async () => {
    const sw = worker();
    const response = await sw.navigate('design/home-options/option-1.webp');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(await response.text()).toBe('Image bytes');
  });
  it('keeps the app available offline', async () => {
    expect(await (await worker({ offline: true }).navigate('./')).text()).toBe('Cached app shell');
  });
  it('uses a previously cached standalone page when offline', async () => {
    const sw = worker({ offline: true, saved: { 'design/home-options/': 'Saved design preview' } });
    expect(await (await sw.navigate('design/home-options/')).text()).toBe('Saved design preview');
  });
  it('does not replace an uncached standalone page with the app while offline', async () => {
    const response = await worker({ offline: true }).navigate('design/home-options/');
    expect(response.type).toBe('error');
    expect(response.status).toBe(0);
  });
});
