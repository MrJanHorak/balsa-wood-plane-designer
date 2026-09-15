/**
 * Canonical 2D geometry engine.
 *
 * Pure, app-agnostic geometry primitives — no physics, no rendering, no
 * app-specific assumptions. This is the single source of truth for shapes
 * that were previously computed independently by the 3D renderer, the 2D
 * pattern exporter, and the physics engine (which could silently disagree —
 * see docs/ARCHITECTURE_REVIEW.md for the specific bugs this fixed).
 *
 * Every consumer that needs a wing/tail planform outline, its area, or its
 * centroid should go through this module rather than re-deriving the shape.
 */

export interface Point2D {
  x: number;
  y: number;
}

export type WingPlanformKind = 'straight' | 'elliptical';

/**
 * Builds a smooth, closed SVG path through a sequence of points using a
 * uniform Catmull-Rom spline, converted to cubic Beziers (the standard
 * technique — each segment's control points are derived from its
 * neighbors so the curve passes through every input point with continuous
 * tangents, rather than the sharp corners a plain polygon has at each
 * vertex).
 *
 * This is display/manufacturing-only: physics, validation, and the 3D mesh
 * all still use the straight-line polygon from getFuselageProfilePoints —
 * same precedent as the trapezoid MAC approximation for elliptical wings
 * (see docs/ARCHITECTURE_REVIEW.md §5). A fuselage's area/mass/CG from the
 * polygon approximation and its true smoothed-curve area differ by a
 * second-order amount that doesn't matter for a hobby balsa glider, and
 * smoothing lets the actual cut edge — and the shape a person drags in the
 * custom editor — read as a body contour instead of a faceted polygon.
 *
 * Requires at least 3 points; returns an empty string otherwise (nothing
 * sensible to draw).
 */
export function pointsToSmoothClosedPath(points: Point2D[]): string {
  const n = points.length;
  if (n < 3) return '';

  const at = (i: number): Point2D => points[((i % n) + n) % n];

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };

    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + ' Z';
}

/**
 * Scales a set of points independently along each axis, anchored at the
 * origin. Used so a user's custom freeform fuselage/wing shape can still
 * respond to "length" / "max height" style sliders after they've switched
 * to a custom shape — those sliders would otherwise do nothing once a
 * shape is absolute node coordinates rather than formula parameters.
 */
export function scalePointsAboutOrigin(points: Point2D[], scaleX: number, scaleY: number): Point2D[] {
  return points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
}

/**
 * Polygon area via the Shoelace formula. Works for any simple
 * (non-self-intersecting) polygon; the last point is implicitly connected
 * back to the first.
 */
export function polygonArea(points: Point2D[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

/** Polygon centroid (area-weighted). Returns {x:0,y:0} for a degenerate (zero-area) polygon. */
export function polygonCentroid(points: Point2D[]): Point2D {
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const cross = p1.x * p2.y - p2.x * p1.y;
    signedArea += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  const area = Math.abs(signedArea) / 2;
  if (area === 0) return { x: 0, y: 0 };

  return {
    x: Math.abs(cx) / (6 * area),
    y: Math.abs(cy) / (6 * area),
  };
}

/** Convenience wrapper returning both area and centroid in one pass-friendly call. */
export function computePolygonProperties(points: Point2D[]): {
  areaMm2: number;
  centroidX: number;
  centroidY: number;
} {
  const areaMm2 = polygonArea(points);
  const centroid = polygonCentroid(points);
  return { areaMm2, centroidX: centroid.x, centroidY: centroid.y };
}

/** Axis-aligned bounding box of a point set. */
export function calculateBoundingBox(points: Point2D[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

/**
 * Point-in-polygon test using ray-casting (even-odd rule).
 * Returns true if the test point lies strictly inside the polygon.
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Semantic alias for a planform's area — same math as polygonArea, but named
 * for callers reasoning about wing/tail/fin planforms rather than generic shapes.
 */
export function calculatePlanformArea(points: Point2D[]): number {
  return polygonArea(points);
}

/**
 * Mean Aerodynamic Chord for a straight-tapered (trapezoidal) surface, and
 * the spanwise fraction (0..1, from root) at which it occurs.
 *
 * Note: this is the standard closed-form trapezoid MAC formula. It is an
 * approximation when applied to non-trapezoidal planforms (elliptical,
 * delta) — see docs/ARCHITECTURE_REVIEW.md for why a closed-form
 * "true" MAC for arbitrary planforms is out of scope for now.
 */
export function calculateMAC(rootChordMm: number, tipChordMm: number): { macMm: number; macSpanFraction: number } {
  const chordSum = rootChordMm + tipChordMm;
  if (chordSum <= 0) return { macMm: rootChordMm, macSpanFraction: 0.5 };

  const macMm = (2 / 3) * (rootChordMm + tipChordMm - (rootChordMm * tipChordMm) / chordSum);
  // Fraction of the half-span (from root) at which MAC occurs
  const macSpanFraction = (1 / 3) * ((rootChordMm + 2 * tipChordMm) / chordSum);

  return { macMm, macSpanFraction };
}

/**
 * Full symmetric planform outline (both halves, root-centered on Y=0) for a
 * straight-tapered (trapezoidal) wing/tail/fin surface.
 * Vertex order: root LE -> left tip LE -> left tip TE -> root TE -> right tip TE -> right tip LE.
 */
export function calculateTrapezoidPlanformPoints(
  rootChordMm: number,
  tipChordMm: number,
  spanMm: number,
  sweepDeg: number
): Point2D[] {
  const halfSpan = spanMm / 2;
  const sweepRad = (sweepDeg * Math.PI) / 180;
  const sweepOffset = halfSpan * Math.tan(sweepRad);

  return [
    { x: 0, y: 0 },
    { x: sweepOffset, y: -halfSpan },
    { x: sweepOffset + tipChordMm, y: -halfSpan },
    { x: rootChordMm, y: 0 },
    { x: sweepOffset + tipChordMm, y: halfSpan },
    { x: sweepOffset, y: halfSpan },
  ];
}

/**
 * Chord and leading-edge X position at a continuous spanwise station
 * (t = 0 at root, 1 at tip) for a wing/tail/fin surface. This is the
 * single place that formula lives — anything that needs to sample a
 * planform at an arbitrary span fraction (e.g. a subdivided 3D mesh)
 * should call this rather than re-deriving it, for the same reason
 * `calculateWingPlanformPoints` exists for the discrete polygon outline:
 * see docs/ARCHITECTURE_REVIEW.md.
 *
 * For a straight taper this is exact (chord and sweep both vary linearly
 * between root and tip, matching `calculateTrapezoidPlanformPoints`'s
 * straight edges). For an elliptical planform it uses the same sampling
 * formula as `calculateEllipticalPlanformPoints`, which that function now
 * calls this to compute, so the two can never drift apart.
 */
export function getWingStationAt(
  kind: WingPlanformKind,
  rootChordMm: number,
  effectiveTipChordMm: number,
  spanMm: number,
  sweepDeg: number,
  t: number
): { xLE: number; chord: number } {
  const halfSpan = spanMm / 2;
  const sweepRad = (sweepDeg * Math.PI) / 180;
  const clampedT = Math.max(0, Math.min(1, t));

  if (kind === 'elliptical') {
    const ellipseFactor = Math.sqrt(Math.max(0, 1 - clampedT * clampedT));
    const chord = Math.max(effectiveTipChordMm * 0.4, rootChordMm * ellipseFactor);
    const sweepAtT = clampedT * halfSpan * Math.tan(sweepRad);
    const xLE = sweepAtT + 0.25 * (rootChordMm - chord);
    return { xLE, chord };
  }

  const sweepAtT = clampedT * halfSpan * Math.tan(sweepRad);
  const chord = rootChordMm + clampedT * (effectiveTipChordMm - rootChordMm);
  return { xLE: sweepAtT, chord };
}

/**
 * Full symmetric planform outline for an elliptical wing, sampled as a
 * closed polygon. `tipChordMm` sets a minimum chord floor at the very tip
 * (a true ellipse tapers to zero, which isn't manufacturable/renderable as
 * a solid sheet edge) rather than shaping the curve.
 */
export function calculateEllipticalPlanformPoints(
  rootChordMm: number,
  tipChordMm: number,
  spanMm: number,
  sweepDeg: number,
  segments: number = 16
): Point2D[] {
  const halfSpan = spanMm / 2;

  const lePoints: Point2D[] = [];
  const tePoints: Point2D[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0 at root, 1 at tip
    const { xLE, chord } = getWingStationAt('elliptical', rootChordMm, tipChordMm, spanMm, sweepDeg, t);
    lePoints.push({ x: xLE, y: t * halfSpan });
    tePoints.push({ x: xLE + chord, y: t * halfSpan });
  }

  return [
    ...lePoints,
    ...[...tePoints].reverse(),
    ...[...lePoints].reverse().slice(1).map((p) => ({ x: p.x, y: -p.y })),
    ...tePoints.slice(1).map((p) => ({ x: p.x, y: -p.y })),
  ];
}

/**
 * Canonical wing/tail/fin planform outline dispatcher — the single function
 * every consumer (3D renderer, 2D pattern exporter, physics engine) should
 * call to get "the shape of this surface." Takes already-resolved numeric
 * chords (callers resolve app-specific rules like a rectangular wing's tip
 * chord equaling its root chord, or a delta wing's point-tip, before calling
 * this — see `getEffectiveTipChordMm` in types/glider.ts) so this module
 * stays free of app-specific policy.
 */
export function calculateWingPlanformPoints(
  kind: WingPlanformKind,
  rootChordMm: number,
  effectiveTipChordMm: number,
  spanMm: number,
  sweepDeg: number
): Point2D[] {
  return kind === 'elliptical'
    ? calculateEllipticalPlanformPoints(rootChordMm, effectiveTipChordMm, spanMm, sweepDeg)
    : calculateTrapezoidPlanformPoints(rootChordMm, effectiveTipChordMm, spanMm, sweepDeg);
}
