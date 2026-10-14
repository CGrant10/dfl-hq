"""Export the approved shield SVG through Chromium; never redraw the brand artwork.
Run against the local static server: python tools/build-brand-assets.py
"""
import base64, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'icons/app-update-aligned.svg'
base=os.environ.get('DFL_BRAND_ASSET_BASE','http://127.0.0.1:8765/')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page();page.goto(base+'manifest.json',wait_until='commit')
 result=page.evaluate('''async source=>{
  const image=new Image();image.src=source;await image.decode();
  const original=document.createElement('canvas');original.width=original.height=512;
  const ctx=original.getContext('2d');ctx.drawImage(image,0,0,512,512);
  const pixels=ctx.getImageData(0,0,512,512).data;
  let left=512,top=512,right=0,bottom=0;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>8){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  const bounds={left,top,width:right-left,height:bottom-top};
  const render=(size,coverage,background=false,format='image/png',white=false)=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d');
   if(background){const gradient=c.createLinearGradient(0,0,size,size);gradient.addColorStop(0,'#222222');gradient.addColorStop(1,'#111111');c.fillStyle=gradient;c.fillRect(0,0,size,size);}
   const scale=size*coverage/Math.max(bounds.width,bounds.height),w=bounds.width*scale,h=bounds.height*scale;
   c.drawImage(original,bounds.left,bounds.top,bounds.width,bounds.height,(size-w)/2,(size-h)/2,w,h);
   if(white){c.globalCompositeOperation='source-in';c.fillStyle='#fff';c.fillRect(0,0,size,size);}
   return canvas.toDataURL(format,.96).split(',')[1];
  };
  return {bounds,files:{
   'icons/dfl-logo-512.webp':render(512,.96,false,'image/webp'),
   'icons/dfl-logo-64.webp':render(64,.96,false,'image/webp'),
   'icons/dfl-logo-tile-256.webp':render(256,.86,true,'image/webp'),
   'icons/app-192-1410.png':render(192,.86,true),
   'icons/app-512-1410.png':render(512,.86,true),
   'icons/app-maskable-512-1410.png':render(512,.56,true),
   'icons/apple-touch-icon-1410.png':render(180,.86,true),
   'icons/favicon-64-1410.png':render(64,.86,true),
   'icons/badge-96.png':render(96,.86,false,'image/png',true)
  }};
 }''',base+'icons/app-update-aligned.svg')
 browser.close()
for name,data in result['files'].items():(ROOT/name).write_bytes(base64.b64decode(data))
# Stable paths serve existing notification payloads and old bookmarked install URLs.
for target,source in {'app-192.png':'app-192-1410.png','app-512.png':'app-512-1410.png','app-maskable-512.png':'app-maskable-512-1410.png','apple-touch-icon.png':'apple-touch-icon-1410.png','icon-192.png':'app-192-1410.png'}.items():
 (ROOT/'icons'/target).write_bytes((ROOT/'icons'/source).read_bytes())
b=result['bounds'];w=b['width'];h=b['height'];scale=1024*.86/max(w,h);dw=w*scale;dh=h*scale
svg=SOURCE.read_text();inner=svg[svg.index('>')+1:svg.rindex('</svg>')]
(ROOT/'assets/dfl-app-icon.svg').write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="DFL HQ app icon">
<defs><linearGradient id="launcher-field" x2="1" y2="1"><stop stop-color="#222222"/><stop offset="1" stop-color="#111111"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#launcher-field)"/>
<svg x="{(1024-dw)/2:.6f}" y="{(1024-dh)/2:.6f}" width="{dw:.6f}" height="{dh:.6f}" viewBox="{b['left']} {b['top']} {w} {h}">{inner}</svg>
</svg>\n''')
print(json.dumps({'source':str(SOURCE.relative_to(ROOT)),'bounds':b,'files':list(result['files'])},indent=2))
