import { describe, it, expect } from 'vitest';
import { layoutPart } from './Pattern2DViewport';
import { FlatPartSvg } from '@/geometry/patterns2d';

/**
 * Regression coverage for a real orientation bug: the fuselage and pylon
 * flat-pattern parts are defined with Y increasing *upward* (belly at 0,
 * spine highest) — same convention as physics and the 3D view — but SVG's
 * Y axis increases *downward*. Without the `flip` transform, these parts
 * rendered spine-down / belly-up in both the laser-cut pattern export and
 * the interactive custom-shape editor. See FuselageProfileEditor.tsx for
 * the analogous fix applied there.
 */

function makePart(minX: number, minY: number, maxX: number, maxY: number): FlatPartSvg {
  return {
    id: 'test-part',
    name: 'Test Part',
    outlinePath: '',
    slotCutouts: [],
    scoreLines: [],
    dimensions: { widthMm: maxX - minX, heightMm: maxY - minY },
    boundingBox: { minX, minY, maxX, maxY },
  };
}

/** Applies an SVG "translate(a,b) [scale(1,-1)]" transform string to a point, matching how the browser would. */
function applyTransform(transform: string, x: number, y: number): { x: number; y: number } {
  const translateMatch = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
  if (!translateMatch) throw new Error('no translate found');
  const tx = parseFloat(translateMatch[1]);
  const ty = parseFloat(translateMatch[2]);
  const flipped = transform.includes('scale(1,-1)');
  const localY = flipped ? -y : y;
  return { x: x + tx, y: localY + ty };
}

describe('Pattern2DViewport layoutPart orientation', () => {
  it('without flip, places a part\'s bounding box top-left at (targetX, targetY) verbatim', () => {
    const part = makePart(0, 0, 200, 40);
    const laid = layoutPart(part, 10, 20, false, false);
    const topLeft = applyTransform(laid.transform, 0, 0);
    const bottomRight = applyTransform(laid.transform, 200, 40);
    expect(topLeft).toEqual({ x: 10, y: 20 });
    expect(bottomRight).toEqual({ x: 210, y: 60 });
  });

  it('with flip, the physically-highest model point (maxY) lands at the TOP of the allocated row (smallest screen Y)', () => {
    // Fuselage-like part: belly at y=0, spine peak at y=45.
    const part = makePart(0, 0, 250, 45);
    const targetX = 16;
    const targetY = 40;
    const laid = layoutPart(part, targetX, targetY, false, true);

    const spineOnScreen = applyTransform(laid.transform, 100, 45); // a point at the spine (max Y)
    const bellyOnScreen = applyTransform(laid.transform, 100, 0); // a point at the belly (Y = 0)

    // Smaller SVG Y = higher on screen. Spine (physically highest) must be
    // above belly (physically lowest) — the opposite of what happens
    // without the flip.
    expect(spineOnScreen.y).toBeLessThan(bellyOnScreen.y);
    // And the whole part still occupies exactly the row it was assigned —
    // the flip must not push it outside its allocated (targetY..targetY+height) band.
    expect(spineOnScreen.y).toBeCloseTo(targetY);
    expect(bellyOnScreen.y).toBeCloseTo(targetY + 45);
  });

  it('flip does not change the X placement or footprint width', () => {
    const part = makePart(5, 0, 105, 30);
    const unflipped = layoutPart(part, 10, 20, false, false);
    const flipped = layoutPart(part, 10, 20, false, true);

    const unflippedLeft = applyTransform(unflipped.transform, 5, 0);
    const flippedLeft = applyTransform(flipped.transform, 5, 0);
    expect(flippedLeft.x).toBeCloseTo(unflippedLeft.x);

    const unflippedRight = applyTransform(unflipped.transform, 105, 0);
    const flippedRight = applyTransform(flipped.transform, 105, 0);
    expect(flippedRight.x).toBeCloseTo(unflippedRight.x);
  });
});
