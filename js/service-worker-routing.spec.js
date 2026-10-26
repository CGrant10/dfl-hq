import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const scope = 'https://example.com/dfl-hq/';
function worker({ offline = false, saved = {}, legacy = {}, bundle=null, release=null, failPath=null, htmlPath=null } = {}) {
  const handlers = {};
  const precached = [];
  const key = request => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const entries = new Map([[`${scope}index.html`, new Response('Cached app shell', { headers: { 'Content-Type': 'text/html' } })],
    ...Object.entries(saved).map(([path, value]) => [new URL(path, scope).href, new Response(typeof value==='string'?value:value.body, { headers: { 'Content-Type': typeof value==='string'?'text/html':value.type } })])]);
  const legacyEntries=new Map(Object.entries(legacy).map(([path,value])=>[new URL(path,scope).href,new Response(value,{headers:{'Content-Type':'application/javascript'}})]));
  const match = async request => (entries.get(key(request))||legacyEntries.get(key(request)))?.clone();
  const currentMatch=async(request,options={})=>{
    const url=key(request),entry=entries.get(url)||(options.ignoreSearch?[...entries].find(([path])=>path.split('?')[0]===url.split('?')[0])?.[1]:null);
    return entry?.clone();
  };
  const fetch = vi.fn(async request => {
    if (offline) throw new Error('Offline');
    const url = key(request);
    if(failPath&&url===new URL(failPath,scope).href)return new Response("Missing",{status:503});
    if(htmlPath&&url===new URL(htmlPath,scope).href)return new Response("Wrong document",{headers:{"Content-Type":"text/html"}});
    const image = url.endsWith('.webp');
    const script=new URL(url).pathname.endsWith('.js');
    return new Response(url === `${scope}index.html` ? 'Fresh app shell' : image ? 'Image bytes' : script?'Fresh module':'Design preview', {
      headers: { 'Content-Type': image ? 'image/webp' : script?'application/javascript':'text/html' },
    });
  });
  const runtime = {
    URL, Request, Response, fetch, console,
    location: { origin: 'https://example.com' },
    caches: { match, open: async () => ({match:currentMatch,add:async request=>precached.push(request),put: async (request, response) => entries.set(key(request), response) }) },
    self: { registration: { scope },skipWaiting:async()=>{},addEventListener: (name, callback) => { handlers[name] = callback; } },
  };
  if(bundle!==null)runtime.importScripts=()=>{
    runtime.self.DFL_BUNDLE_RELEASE=release||JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
    runtime.self.DFL_BUNDLE_SHELL=bundle;
  };
  runInNewContext(source,runtime);
  return {
    fetch,
    releaseMessage(data,port){handlers.message({data,ports:port?[port]:[]});},
    async install(){let pending;handlers.install({waitUntil:promise=>pending=promise});await pending;return precached;},
    async warm(){let pending;handlers.message({data:{type:'DFL_CACHE_EXTRAS'},source:{url:scope},waitUntil:promise=>pending=promise});await pending;return precached;},
    async request(path,options={}) {
      let response;
      const pending = [];
      handlers.fetch({
        request: { method: 'GET', url: new URL(path, scope).href, mode: 'navigate', destination: 'document',...options },
        waitUntil: promise => pending.push(promise), respondWith: promise => { response = promise; },
      });
      const result = await response;
      await Promise.all(pending);
      return result;
    },
    navigate(path){return this.request(path);},
  };
}

describe('installed app worker navigation', () => {
  it('activates without downloading decorative artwork, then warms it after the first route',async()=>{
    const sw=worker({bundle:['./js/bundle/test/app.js']});const initial=[...await sw.install()];
    expect(initial.some(r=>r.url.includes('/assets/'))).toBe(false);
    const warmed=await sw.warm();expect(warmed.some(r=>r.url.endsWith('/assets/dfl-daily-hero.webp'))).toBe(true);
  });
  it('does not re-download an immutable cached bundle during normal navigation',async()=>{
    const path='./js/bundle/test/app.js',sw=worker({bundle:[path],saved:{[path]:{body:'Cached release module',type:'application/javascript'}}});
    expect(await(await sw.request(path,{mode:'cors',destination:'script',cache:'default'})).text()).toBe('Cached release module');expect(sw.fetch).not.toHaveBeenCalled();
  });
  it('installs the compiled graph without fetching a duplicate raw app graph',async()=>{
    const files=['./js/bundle/test/app.js','./js/bundle/test/pages/calendar.js'],sw=worker({bundle:files});
    const other=await sw.install();
    expect(sw.fetch.mock.calls.map(([r])=>r.url)).toEqual(files.map(p=>new URL(p,scope).href));
    expect(other.some(r=>r.url.endsWith('/js/app.js'))).toBe(false);
    expect(other.some(r=>r.url.endsWith('/js/workers/trade-offers.js'))).toBe(true);
  });
  it.each(['missing','html'])('rejects an incomplete bundle instead of activating a broken release: %s',async failure=>{
    const path='./js/bundle/test/app.js',sw=worker({bundle:[path],[failure==='missing'?'failPath':'htmlPath']:path});
    await expect(sw.install()).rejects.toThrow('Application module unavailable');
  });
  it('rejects an empty or mismatched worker bundle manifest',()=>{
    expect(()=>worker({bundle:[]})).toThrow('release mismatch');
    expect(()=>worker({bundle:['./js/bundle/test/app.js'],release:'1.379.0'})).toThrow('release mismatch');
  });
  it('serves a cached compiled page under a fresh Retry URL offline',async()=>{
    const path='js/bundle/test/pages/calendar.js',sw=worker({offline:true,bundle:['./'+path],saved:{[path]:{body:'Current compiled page',type:'application/javascript'}}});
    const response=await sw.request(path+'?recovery=1',{mode:'cors',destination:'script'});
    expect(await response.text()).toBe('Current compiled page');
  });
  it('does not boot an old module from a retired cache recreated by a late request',async()=>{
    const sw=worker({legacy:{'js/team-analyzer.js':'Retired model'}});
    expect(await (await sw.request('js/team-analyzer.js',{mode:'cors',destination:'script'})).text()).toBe('Fresh module');
  });
  it('does not borrow an uncached local module from an older release while offline',async()=>{
    const sw=worker({offline:true,legacy:{'js/pages/uncached-example.js':'Retired page'}});
    expect((await sw.request('js/pages/uncached-example.js',{mode:'cors',destination:'script'})).type).toBe('error');
  });
  it('reports the controlling release without responding to unrelated messages',()=>{
    const sw=worker(),postMessage=vi.fn();
    sw.releaseMessage({type:'DFL_APP_RELEASE'},{postMessage});
    expect(postMessage).toHaveBeenCalledWith({release:JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version});
    sw.releaseMessage({type:'unrelated'},{postMessage});
    sw.releaseMessage({type:'DFL_APP_RELEASE'});
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
  it('revalidates HTTP cache entries when constructing a new release cache',async()=>{
    const requests=await worker().install();
    expect(requests.length).toBeGreaterThan(100);
    expect(requests.every(request=>request.cache==='no-cache')).toBe(true);
    expect(requests.some(request=>request.url===`${scope}js/team-analyzer.js`)).toBe(true);
  });
  it.each(['reload','no-cache','no-store'])('waits for current script code when an update requests %s',async cache=>{
    const sw=worker({saved:{'js/team-analyzer.js':{body:'Old module',type:'application/javascript'}}});
    const response=await sw.request('js/team-analyzer.js',{mode:'cors',destination:'script',cache});
    expect(await response.text()).toBe('Fresh module');
  });
  it('keeps ordinary script requests fast while revalidating their cache',async()=>{
    const sw=worker({saved:{'js/team-analyzer.js':{body:'Cached module',type:'application/javascript'}}});
    expect(await (await sw.request('js/team-analyzer.js',{mode:'cors',destination:'script',cache:'default'})).text()).toBe('Cached module');
  });
  it('retains a valid module for offline update requests without serving HTML as script',async()=>{
    const sw=worker({offline:true,saved:{'js/team-analyzer.js':{body:'Cached module',type:'application/javascript'}}});
    expect(await (await sw.request('js/team-analyzer.js',{mode:'cors',destination:'script',cache:'reload'})).text()).toBe('Cached module');
    const wrong=worker({offline:true,saved:{'js/team-analyzer.js':'Cached HTML'}});
    expect((await wrong.request('js/team-analyzer.js',{mode:'cors',destination:'script',cache:'reload'})).type).toBe('error');
  });
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
