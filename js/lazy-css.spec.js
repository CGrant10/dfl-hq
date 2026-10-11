import {afterEach,describe,it,expect,vi} from 'vitest';

afterEach(()=>vi.unstubAllGlobals());
async function setup(initial=[]) {
  vi.resetModules();
  const links=initial.map(href=>({href}));
  const events=new Map();
  const marker={parentNode:{insertBefore:vi.fn(link=>links.push(link))}};
  const head={appendChild:vi.fn(link=>links.push(link))};
  vi.stubGlobal('document',{
    baseURI:'https://example.com/dfl-hq/',head,
    querySelectorAll:()=>links,querySelector:()=>marker,
    createElement:()=>({addEventListener:vi.fn((event,callback)=>events.set(event,callback))})
  });
  const {ensureStylesheet}=await import('./lazy-css.js');
  return {ensureStylesheet,links,events,marker,head};
}

describe('lazy stylesheet reuse',()=>{
  it('reuses source sheets supplied by the shared shell bundle',async()=>{
    const {ensureStylesheet,links,marker}=await setup();
    links.push({href:'https://example.com/dfl-hq/css/app-shared.css?v=1.376.0',dataset:{dflStylesheets:'css/player-watchlist.css css/page-system.css'}});
    await ensureStylesheet('./css/player-watchlist.css');
    expect(links).toHaveLength(1);expect(marker.parentNode.insertBefore).not.toHaveBeenCalled();
  });
  it('reuses a release-versioned shell stylesheet without inserting a second copy',async()=>{
    const {ensureStylesheet,links,marker,head}=await setup(['https://example.com/dfl-hq/css/player-watchlist.css?v=1.375.0']);
    await ensureStylesheet('css/player-watchlist.css');
    await ensureStylesheet('./css/player-watchlist.css?v=1.375.0');
    expect(links).toHaveLength(1);expect(marker.parentNode.insertBefore).not.toHaveBeenCalled();expect(head.appendChild).not.toHaveBeenCalled();
  });
  it('shares the pending load across path and version variants without resolving early',async()=>{
    const {ensureStylesheet,events,links,marker}=await setup();
    let applied=false;
    const first=ensureStylesheet('css/weekly-outlook.css');first.then(()=>{applied=true});
    const second=ensureStylesheet('./css/weekly-outlook.css?v=1.375.0');
    expect(second).toBe(first);await Promise.resolve();expect(applied).toBe(false);
    expect(links).toHaveLength(1);expect(marker.parentNode.insertBefore).toHaveBeenCalledOnce();
    events.get('load')();await second;expect(applied).toBe(true);
  });
  it('keeps different origins and meaningful query parameters separate and tolerates load errors',async()=>{
    const {ensureStylesheet,events,links}=await setup(['https://cdn.example.com/dfl-hq/css/report.css','https://example.com/dfl-hq/css/report.css?theme=dark']);
    const ready=ensureStylesheet('css/report.css?theme=light');
    expect(links).toHaveLength(3);events.get('error')();await expect(ready).resolves.toBeUndefined();
    const local=ensureStylesheet('css/report.css');
    expect(links).toHaveLength(4);events.get('load')();await local;
  });
});
