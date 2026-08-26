import { BoundingBox } from '../core';
import { MAX_SCALE, MIN_SCALE, fitToBounds, pan, toScreen, toWorld, zoomAt } from './viewport';

function boxOf(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  const bounds = new BoundingBox();
  bounds.include(minX, minY);
  bounds.include(maxX, maxY);
  return bounds;
}

describe('viewport', () => {
  it('centres the bounding box in the viewport', () => {
    const view = fitToBounds(boxOf(0, 0, 100, 50), 400, 300, 0);

    const [px, py] = toScreen(view, 50, 25);
    expect(px).toBeCloseTo(200, 6);
    expect(py).toBeCloseTo(150, 6);
  });

  it('fits to the tighter of the two axes and honours padding', () => {
    // 100 x 50 into 400 x 300 with 20px padding: 360/100 = 3.6 wins over 260/50 = 5.2.
    expect(fitToBounds(boxOf(0, 0, 100, 50), 400, 300, 20).scale).toBeCloseTo(3.6, 6);
  });

  it('flips the Y axis so Gerber Y points up the screen', () => {
    const view = fitToBounds(boxOf(0, 0, 100, 100), 200, 200, 0);

    const [, low] = toScreen(view, 50, 0);
    const [, high] = toScreen(view, 50, 100);
    expect(high).toBeLessThan(low);
  });

  it('round-trips between screen and world coordinates', () => {
    const view = fitToBounds(boxOf(-10, -5, 30, 25), 640, 480);

    const [x, y] = toWorld(view, 123, 456);
    const [px, py] = toScreen(view, x, y);
    expect(px).toBeCloseTo(123, 6);
    expect(py).toBeCloseTo(456, 6);
  });

  it('pins the world point under the cursor while zooming', () => {
    const view = fitToBounds(boxOf(0, 0, 100, 50), 400, 300);
    const before = toWorld(view, 310, 90);

    const zoomed = zoomAt(view, 310, 90, 2.5);
    const after = toWorld(zoomed, 310, 90);

    expect(zoomed.scale).toBeCloseTo(view.scale * 2.5, 6);
    expect(after[0]).toBeCloseTo(before[0], 6);
    expect(after[1]).toBeCloseTo(before[1], 6);
  });

  it('clamps the scale at both ends', () => {
    const view = fitToBounds(boxOf(0, 0, 100, 50), 400, 300);

    expect(zoomAt(view, 0, 0, 1e9).scale).toBe(MAX_SCALE);
    expect(zoomAt(view, 0, 0, 1e-9).scale).toBe(MIN_SCALE);
  });

  it('translates without changing the scale', () => {
    const view = fitToBounds(boxOf(0, 0, 100, 50), 400, 300);
    const moved = pan(view, 25, -40);

    expect(moved.scale).toBe(view.scale);
    expect(moved.tx).toBeCloseTo(view.tx + 25, 6);
    expect(moved.ty).toBeCloseTo(view.ty - 40, 6);
  });

  it('falls back to a centred identity view for an empty drawing', () => {
    const view = fitToBounds(new BoundingBox(), 400, 300);

    expect(view.scale).toBe(1);
    expect(view.tx).toBe(200);
    expect(view.ty).toBe(150);
  });
});
