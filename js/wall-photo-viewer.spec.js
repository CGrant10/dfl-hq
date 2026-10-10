import { describe, expect, it } from 'vitest';
import { fittedPhoto } from './wall-photo-viewer.js';
describe('full photo framing', () => {
  it('fits wide and portrait uploads without cropping or distortion', () => {
    expect(fittedPhoto(1200,600,360,700)).toEqual({ width:360,height:180 });
    expect(fittedPhoto(600,1200,360,700)).toEqual({ width:350,height:700 });
  });
  it('preserves proportions when zooming and on a smaller viewport', () => {
    expect(fittedPhoto(600,1200,360,700,2)).toEqual({ width:700,height:1400 });
    expect(fittedPhoto(600,1200,300,400)).toEqual({ width:200,height:400 });
  });
  it('waits for image and viewport dimensions', () => {
    expect(fittedPhoto(0,0,360,700)).toBeNull();
    expect(fittedPhoto(1200,600,0,700)).toBeNull();
  });
});
