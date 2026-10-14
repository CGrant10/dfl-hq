import { describe, it, expect, vi } from 'vitest';
import { dialogViewportBounds,fitDialogToViewport } from './dialog-viewport.js';
describe('visible dialog bounds', () => {
  it('refits after phone resume and removes its viewport listeners on close',()=>{
    const viewport=new EventTarget();Object.assign(viewport,{height:400,offsetTop:80});
    const win=new EventTarget();win.visualViewport=viewport;vi.stubGlobal('window',win);vi.stubGlobal('innerHeight',844);
    const dialog=new EventTarget();dialog.isConnected=true;dialog.style={setProperty:vi.fn()};
    try{
      fitDialogToViewport(dialog);expect(dialog.style.setProperty).toHaveBeenCalledWith('--dialog-viewport-bottom','364px');
      viewport.height=844;viewport.offsetTop=0;win.dispatchEvent(new Event('pageshow'));
      expect(dialog.style.setProperty).toHaveBeenLastCalledWith('--dialog-viewport-height','820px');
      dialog.dispatchEvent(new Event('close'));dialog.style.setProperty.mockClear();viewport.dispatchEvent(new Event('resize'));win.dispatchEvent(new Event('pageshow'));
      expect(dialog.style.setProperty).not.toHaveBeenCalled();
    }finally{vi.unstubAllGlobals();}
  });
  it('keeps a gutter inside the normal phone viewport', () => {
    expect(dialogViewportBounds(844, 844)).toEqual({ top:0, bottom:0, height:820 });
  });
  it('moves the lower edge above a keyboard without relying on layout resize', () => {
    expect(dialogViewportBounds(844, 400)).toEqual({ top:0, bottom:444, height:376 });
  });
  it('accounts for the visual viewport panning around a focused input', () => {
    expect(dialogViewportBounds(844, 400, 80)).toEqual({ top:80, bottom:364, height:376 });
  });
});
