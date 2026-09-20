import { describe, it, expect } from 'vitest';
import {
  polygonArea,
  polygonCentroid,
  calculateBoundingBox,
  calculateMAC,
  calculateTrapezoidPlanformPoints,
  calculateEllipticalPlanformPoints,
  calculateWingPlanformPoints,
  getWingStationAt,
  isPointInPolygon,
  pointsToSmoothClosedPath,
  scalePointsAboutOrigin,
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

describe('isPointInPolygon', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('correctly identifies interior points', () => {
    expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(isPointInPolygon({ x: 1, y: 1 }, square)).toBe(true);
  });

  it('correctly identifies exterior points', () => {
    expect(isPointInPolygon({ x: -1, y: 5 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 5, y: 15 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 5, y: -5 }, square)).toBe(false);
  });
});

describe('getCamberElevation', () => {
  it('returns zero for 0% camber (flat sheet)', async () => {
    const { getCamberElevation } = await import('./extrusion3d');
    expect(getCamberElevation(0, 60, 0)).toBe(0);
    expect(getCamberElevation(0.4, 60, 0)).toBe(0);
    expect(getCamberElevation(1, 60, 0)).toBe(0);
  });

  it('peaks at 40% chord with exact max camber height', async () => {
    const { getCamberElevation } = await import('./extrusion3d');
    const chord = 100;
    const camberPercent = 5; // 5% of 100mm = 5mm
    expect(getCamberElevation(0, chord, camberPercent)).toBeCloseTo(0);
    expect(getCamberElevation(0.4, chord, camberPercent)).toBeCloseTo(5.0);
    expect(getCamberElevation(1, chord, camberPercent)).toBeCloseTo(0);
  });

  it('produces smooth positive camber arch along chord', async () => {
    const { getCamberElevation } = await import('./extrusion3d');
    const chord = 80;
    const camberPercent = 4;
    const y20 = getCamberElevation(0.2, chord, camberPercent);
    const y40 = getCamberElevation(0.4, chord, camberPercent);
    const y70 = getCamberElevation(0.7, chord, camberPercent);

    expect(y20).toBeGreaterThan(0);
    expect(y40).toBeGreaterThan(y20);
    expect(y40).toBeGreaterThan(y70);
    expect(y70).toBeGreaterThan(0);
  });
});

describe('getWingStationAt', () => {
  it('matches calculateTrapezoidPlanformPoints at the root and tip for a straight taper', () => {
    const [rootLE, leftTipLE, , rootTE] = calculateTrapezoidPlanformPoints(80, 40, 300, 10);
    const root = getWingStationAt('straight', 80, 40, 300, 10, 0);
    const tip = getWingStationAt('straight', 80, 40, 300, 10, 1);

    expect(root.xLE).toBeCloseTo(rootLE.x);
    expect(root.chord).toBeCloseTo(rootTE.x - rootLE.x);
    expect(tip.xLE).toBeCloseTo(leftTipLE.x);
    expect(tip.chord).toBeCloseTo(40);
  });

  it('interpolates chord linearly between root and tip for a straight taper', () => {
    const mid = getWingStationAt('straight', 80, 40, 300, 0, 0.5);
    expect(mid.chord).toBeCloseTo(60); // halfway between 80 and 40
  });

  it('matches the leading-edge and chord the elliptical polygon builder uses at each sampled station', () => {
    // calculateEllipticalPlanformPoints now sources every station from
    // getWingStationAt — this pins that invariant so a future edit can't
    // silently let the two drift apart again (see extrusion3d.ts's
    // getStationGeometry, which also calls getWingStationAt directly).
    const segments = 16;
    const points = calculateEllipticalPlanformPoints(90, 30, 280, 5, segments);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const station = getWingStationAt('elliptical', 90, 30, 280, 5, t);
      // The leading-edge points are the first `segments + 1` entries.
      expect(points[i].x).toBeCloseTo(station.xLE);
    }
  });
});

describe('3D wing mesh camber (extrusion3d.ts, via the canonical station lookup)', () => {
  it('produces a flat sheet (Y range == thickness) at 0% camber', async () => {
    const { createHalfWingGeometry } = await import('./extrusion3d');
    const { GLIDER_PRESETS } = await import('@/constants/presets');
    const flat = { ...GLIDER_PRESETS.TRAINER, wing: { ...GLIDER_PRESETS.TRAINER.wing, camberPercent: 0 } };
    const geom = createHalfWingGeometry(flat);
    geom.computeBoundingBox();
    const bbox = geom.boundingBox!;
    expect(bbox.max.y - bbox.min.y).toBeCloseTo(flat.wing.thicknessMm, 1);
  });

  it('arches upward (Y range grows beyond thickness) once camber is applied', async () => {
    const { createHalfWingGeometry } = await import('./extrusion3d');
    const { GLIDER_PRESETS } = await import('@/constants/presets');
    const cambered = { ...GLIDER_PRESETS.TRAINER, wing: { ...GLIDER_PRESETS.TRAINER.wing, camberPercent: 6 } };
    const geom = createHalfWingGeometry(cambered);
    geom.computeBoundingBox();
    const bbox = geom.boundingBox!;
    expect(bbox.max.y - bbox.min.y).toBeGreaterThan(cambered.wing.thicknessMm + 1);
  });

  it('produces valid, finite geometry for every planform kind', async () => {
    const { createHalfWingGeometry } = await import('./extrusion3d');
    const { GLIDER_PRESETS } = await import('@/constants/presets');
    for (const preset of Object.values(GLIDER_PRESETS)) {
      const geom = createHalfWingGeometry(preset);
      const positions = geom.getAttribute('position').array;
      for (let i = 0; i < positions.length; i++) {
        expect(Number.isFinite(positions[i])).toBe(true);
      }
    }
  });
});


describe('pointsToSmoothClosedPath', () => {
  it('returns an empty string for fewer than 3 points', () => {
    expect(pointsToSmoothClosedPath([])).toBe('');
    expect(pointsToSmoothClosedPath([{ x: 0, y: 0 }])).toBe('');
    expect(pointsToSmoothClosedPath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe('');
  });

  it('starts with an M at the first point and ends with a closing Z', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 10, y: 0 }, { x: 5, y: -3 }];
    const path = pointsToSmoothClosedPath(points);
    expect(path.startsWith('M 0 0')).toBe(true);
    expect(path.trim().endsWith('Z')).toBe(true);
  });

  it('the curve actually passes through every input point (each appears as a C command endpoint)', () => {
    const points = [{ x: 0, y: 0 }, { x: 20, y: 15 }, { x: 40, y: 0 }, { x: 20, y: -10 }];
    const path = pointsToSmoothClosedPath(points);
    // Each point after the first should appear as the final (endpoint) triplet of a "C x1 y1, x2 y2, x y" command.
    for (const p of points.slice(1)) {
      expect(path).toContain(`${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
  });

  it('produces one C command per point (a full closed loop, not an open curve)', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 10, y: -10 }, { x: 5, y: 0 }];
    const path = pointsToSmoothClosedPath(points);
    const curveCommandCount = (path.match(/C /g) || []).length;
    expect(curveCommandCount).toBe(points.length);
  });
});

describe('scalePointsAboutOrigin', () => {
  it('scales X and Y independently, anchored at the origin', () => {
    const points = [{ x: 10, y: 4 }, { x: 20, y: 8 }];
    const scaled = scalePointsAboutOrigin(points, 2, 0.5);
    expect(scaled).toEqual([{ x: 20, y: 2 }, { x: 40, y: 4 }]);
  });

  it('a scale factor of 1 leaves points unchanged', () => {
    const points = [{ x: 5, y: -3 }, { x: -2, y: 7 }];
    expect(scalePointsAboutOrigin(points, 1, 1)).toEqual(points);
  });

  it('handles negative Y values correctly (e.g. a bottom-saddle dip below the belly line)', () => {
    const points = [{ x: 10, y: -14 }];
    const scaled = scalePointsAboutOrigin(points, 1, 2);
    expect(scaled[0].y).toBe(-28);
  });

  it('does not mutate the input array', () => {
    const points = [{ x: 10, y: 4 }];
    const before = JSON.stringify(points);
    scalePointsAboutOrigin(points, 3, 3);
    expect(JSON.stringify(points)).toBe(before);
  });
});

describe('pointsToPath', () => {
  it('returns an empty string for empty input', async () => {
    const { pointsToPath } = await import('./core');
    expect(pointsToPath([])).toBe('');
  });

  it('formats points as a closed SVG path with M, L, and Z', async () => {
    const { pointsToPath } = await import('./core');
    const pts = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 20 }];
    const d = pointsToPath(pts);
    expect(d).toBe('M 10.00 20.00 L 30.00 40.00 L 50.00 20.00 Z');
  });
});

describe('sampleSmoothClosedCurve', () => {
  it('returns original points if fewer than 3 points provided', async () => {
    const { sampleSmoothClosedCurve } = await import('./core');
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    expect(sampleSmoothClosedCurve(pts)).toEqual(pts);
  });

  it('samples a dense closed polygon through all input points', async () => {
    const { sampleSmoothClosedCurve } = await import('./core');
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 30 },
      { x: 100, y: 10 },
      { x: 80, y: 0 },
    ];
    const sampled = sampleSmoothClosedCurve(pts, 8);
    expect(sampled.length).toBe(pts.length * 8);

    // The sample at step=0 of each segment must equal the input control point
    for (let i = 0; i < pts.length; i++) {
      const sampledPt = sampled[i * 8];
      expect(sampledPt.x).toBeCloseTo(pts[i].x);
      expect(sampledPt.y).toBeCloseTo(pts[i].y);
    }
  });
});

describe('calculateSlotPoints', () => {
  const flatSlot = {
    xPositionMm: 50,
    yPositionMm: 20,
    lengthMm: 60,
    thicknessMm: 2,
    angleDeg: 0,
  };

  it('generates a 4-point rectangle when camber is 0', async () => {
    const { calculateSlotPoints } = await import('./core');
    const pts = calculateSlotPoints(flatSlot, 60, 0);
    expect(pts).toHaveLength(4);
    // CCW order: bottom-left, bottom-right, top-right, top-left
    expect(pts[0]).toEqual({ x: 50, y: 19 });
    expect(pts[1]).toEqual({ x: 110, y: 19 });
    expect(pts[2]).toEqual({ x: 110, y: 21 });
    expect(pts[3]).toEqual({ x: 50, y: 21 });
  });

  it('arches upward when camber is positive', async () => {
    const { calculateSlotPoints } = await import('./core');
    const camberPercent = 5; // 5% of 60mm = 3.0mm rise
    const pts = calculateSlotPoints(flatSlot, 60, camberPercent, 16);
    expect(pts.length).toBeGreaterThan(4);

    // LE and TE edges should be at un-cambered baseline (y = 19 and 21)
    const lowerLE = pts[0];
    const upperLE = pts[pts.length - 1];
    expect(lowerLE.y).toBeCloseTo(19, 1);
    expect(upperLE.y).toBeCloseTo(21, 1);

    // Find the maximum Y of the upper edge (around 40% chord = x ≈ 74)
    const maxY = Math.max(...pts.map((p) => p.y));
    // Max Y should be baseline (21) + camber rise (3.0) ≈ 24.0
    expect(maxY).toBeCloseTo(24.0, 0.5);

    // Verify uniform vertical slot thickness across all sample pairs
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const lower = pts[i];
      const upper = pts[pts.length - 1 - i];
      expect(upper.x).toBeCloseTo(lower.x, 1);
      expect(upper.y - lower.y).toBeCloseTo(flatSlot.thicknessMm, 1);
    }
  });

  it('respects slot incidence angle rotation', async () => {
    const { calculateSlotPoints } = await import('./core');
    const rotatedSlot = {
      ...flatSlot,
      angleDeg: 5, // 5 degree upward pitch
    };
    const pts = calculateSlotPoints(rotatedSlot, 60, 0);
    expect(pts).toHaveLength(4);
    // Trailing edge Y should be higher than leading edge Y due to positive incidence
    expect(pts[1].y).toBeGreaterThan(pts[0].y);
    expect(pts[2].y).toBeGreaterThan(pts[3].y);
  });
});

