import { describe, it, expect } from 'vitest';
import { dialogViewportBounds } from './dialog-viewport.js';
describe('visible dialog bounds', () => {
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
