import { describe, it, expect } from 'vitest';
import {
  polygonArea,
  polygonCentroid,
  calculateBoundingBox,
  calculateMAC,
  calculateTrapezoidPlanformPoints,
  calculateEllipticalPlanformPoints,
  calculateWingPlanformPoints,
} from './core';

describe('polygonArea', () => {
  it('computes the area of a unit square', () => {
    const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(polygonArea(square)).toBeCloseTo(1);
  });

  it('computes the area of a right triangle', () => {
    const triangle = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }];
    expect(polygonArea(triangle)).toBeCloseTo(6);
  });

  it('is winding-order independent', () => {
    const cw = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }];
    const ccw = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(polygonArea(cw)).toBeCloseTo(polygonArea(ccw));
  });
});

describe('polygonCentroid', () => {
  it('finds the center of a square centered on the origin', () => {
    const square = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
    const c = polygonCentroid(square);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(0);
  });

  it('finds the centroid of a right triangle at (base/3, height/3) from the right angle', () => {
    const triangle = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 6 }];
    const c = polygonCentroid(triangle);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(2);
  });

  it('returns the origin for a degenerate (zero-area) polygon', () => {
    const degenerate = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    const c = polygonCentroid(degenerate);
    expect(c).toEqual({ x: 0, y: 0 });
  });
});

describe('calculateBoundingBox', () => {
  it('finds the min/max extents of a point set', () => {
    const points = [{ x: -5, y: 2 }, { x: 10, y: -3 }, { x: 0, y: 7 }];
    expect(calculateBoundingBox(points)).toEqual({ minX: -5, minY: -3, maxX: 10, maxY: 7 });
  });
});

describe('calculateMAC', () => {
  it('returns the root chord for a rectangular (root=tip) wing', () => {
    const { macMm } = calculateMAC(60, 60);
    expect(macMm).toBeCloseTo(60);
  });

  it('returns a value between tip and root chord for a tapered wing', () => {
    const { macMm } = calculateMAC(60, 30);
    expect(macMm).toBeGreaterThan(30);
    expect(macMm).toBeLessThan(60);
  });

  it('handles a fully degenerate (zero chord) input without dividing by zero', () => {
    const { macMm } = calculateMAC(0, 0);
    expect(Number.isFinite(macMm)).toBe(true);
  });
});

describe('calculateTrapezoidPlanformPoints', () => {
  it('produces a symmetric planform whose area matches the trapezoid formula', () => {
    const rootChord = 60;
    const tipChord = 30;
    const span = 300;
    const points = calculateTrapezoidPlanformPoints(rootChord, tipChord, span, 0);
    const expectedArea = ((rootChord + tipChord) / 2) * span;
    expect(polygonArea(points)).toBeCloseTo(expectedArea, 1);
  });

  it('produces a full-span rectangle area when root equals tip', () => {
    const points = calculateTrapezoidPlanformPoints(50, 50, 200, 0);
    expect(polygonArea(points)).toBeCloseTo(50 * 200, 1);
  });

  it('is unaffected by sweep angle (sweep shears but does not change area)', () => {
    const flat = calculateTrapezoidPlanformPoints(60, 30, 300, 0);
    const swept = calculateTrapezoidPlanformPoints(60, 30, 300, 20);
    expect(polygonArea(swept)).toBeCloseTo(polygonArea(flat), 1);
  });
});

describe('calculateEllipticalPlanformPoints', () => {
  it('has less area than the bounding rectangle (root chord × span)', () => {
    const rootChord = 60;
    const tipChord = 24;
    const span = 300;
    const points = calculateEllipticalPlanformPoints(rootChord, tipChord, span, 0);
    // An ellipse always fits strictly inside its bounding rectangle.
    expect(polygonArea(points)).toBeLessThan(rootChord * span);
  });

  it('produces a valid (non-degenerate) polygon', () => {
    const points = calculateEllipticalPlanformPoints(60, 24, 300, 0);
    expect(polygonArea(points)).toBeGreaterThan(0);
  });
});

describe('calculateWingPlanformPoints (dispatcher)', () => {
  it('routes "straight" to the trapezoid generator', () => {
    const dispatched = calculateWingPlanformPoints('straight', 60, 30, 300, 5);
    const direct = calculateTrapezoidPlanformPoints(60, 30, 300, 5);
    expect(polygonArea(dispatched)).toBeCloseTo(polygonArea(direct));
  });

  it('routes "elliptical" to the elliptical generator', () => {
    const dispatched = calculateWingPlanformPoints('elliptical', 60, 30, 300, 5);
    const direct = calculateEllipticalPlanformPoints(60, 30, 300, 5);
    expect(polygonArea(dispatched)).toBeCloseTo(polygonArea(direct));
  });
});
