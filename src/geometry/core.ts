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

export type WingPlanformKind = 'straight' | 'elliptical' | 'custom';

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

/** Renders a closed point list as an SVG path's `d` attribute: M x0 y0 L x1 y1 ... Z */
export function pointsToPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} ` +
    points.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

/**
 * Samples the smooth Catmull-Rom closed curve through `points` into a dense polygon.
 * Each segment between control points is sampled into `samplesPerSegment` steps along
 * the cubic Bezier curve.
 *
 * This provides the canonical point representation of the smoothed fuselage for:
 * 1. 3D extrusion (so the 3D model is silky smooth, matching the 2D curve)
 * 2. Accurate physical area, centroid, and mass calculations
 * 3. Exact structural enclosure validation
 */
export function sampleSmoothClosedCurve(points: Point2D[], samplesPerSegment: number = 8): Point2D[] {
  const n = points.length;
  if (n < 3) return points;

  const at = (i: number): Point2D => points[((i % n) + n) % n];
  const result: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };

    for (let step = 0; step < samplesPerSegment; step++) {
      const u = step / samplesPerSegment;
      const u2 = u * u;
      const u3 = u2 * u;
      const oneMinusU = 1 - u;
      const oneMinusU2 = oneMinusU * oneMinusU;
      const oneMinusU3 = oneMinusU2 * oneMinusU;

      const x = oneMinusU3 * p1.x + 3 * oneMinusU2 * u * c1.x + 3 * oneMinusU * u2 * c2.x + u3 * p2.x;
      const y = oneMinusU3 * p1.y + 3 * oneMinusU2 * u * c1.y + 3 * oneMinusU * u2 * c2.y + u3 * p2.y;

      result.push({ x, y });
    }
  }

  return result;
}

/**
 * Computes aerodynamic mean camber line elevation for a normalized chord fraction s in [0, 1].
 * Uses NACA-style camber line with maximum camber at 40% chord (p = 0.4).
 * Returns height in mm.
 */
export function getCamberElevation(s: number, chord: number, camberPercent: number): number {
  if (camberPercent <= 0 || chord <= 0) return 0;
  const clampedS = Math.max(0, Math.min(1, s));
  const h = chord * (camberPercent / 100);
  const p = 0.4;
  if (clampedS <= p) {
    return (h / (p * p)) * (2 * p * clampedS - clampedS * clampedS);
  } else {
    return (h / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * clampedS - clampedS * clampedS);
  }
}

export interface SlotGeometryInput {
  xPositionMm: number;
  yPositionMm: number;
  lengthMm: number;
  thicknessMm: number;
  angleDeg: number;
}

/**
 * Generates the 2D polygon outline (in fuselage coordinate space) for a wing or tail slot.
 *
 * When camberPercent is 0 (or unspecified), forms a straight rectangle rotated by `angleDeg`.
 * When camberPercent > 0, the slot arches upward with the wing's true mean camber line,
 * ensuring that a cambered balsa wing slides cleanly through the fuselage sheet with
 * uniform slot width and kerf.
 *
 * Vertex order: Counter-Clockwise (lower edge from LE to TE, then upper edge from TE to LE, closed).
 */
export function calculateSlotPoints(
  slot: SlotGeometryInput,
  wingRootChordMm?: number,
  camberPercent: number = 0,
  segments: number = 16
): Point2D[] {
  const angleRad = (slot.angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const halfThick = slot.thicknessMm / 2;
  const chord = wingRootChordMm || slot.lengthMm;

  if (camberPercent <= 0) {
    // Exact straight 4-corner rectangle (CCW: bottom-left -> bottom-right -> top-right -> top-left)
    return [
      {
        x: slot.xPositionMm + halfThick * sinA,
        y: slot.yPositionMm - halfThick * cosA,
      },
      {
        x: slot.xPositionMm + slot.lengthMm * cosA + halfThick * sinA,
        y: slot.yPositionMm + slot.lengthMm * sinA - halfThick * cosA,
      },
      {
        x: slot.xPositionMm + slot.lengthMm * cosA - halfThick * sinA,
        y: slot.yPositionMm + slot.lengthMm * sinA + halfThick * cosA,
      },
      {
        x: slot.xPositionMm - halfThick * sinA,
        y: slot.yPositionMm + halfThick * cosA,
      },
    ];
  }

  // Cambered arch: Lower edge (LE -> TE) then Upper edge (TE -> LE)
  const lowerPoints: Point2D[] = [];
  const upperPoints: Point2D[] = [];

  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const xLocal = s * slot.lengthMm;
    const sChord = Math.min(1, Math.max(0, xLocal / chord));
    const camb = getCamberElevation(sChord, chord, camberPercent);

    const yLowerLocal = camb - halfThick;
    const yUpperLocal = camb + halfThick;

    // Transform local (xLocal, yLocal) to global fuselage coordinates
    lowerPoints.push({
      x: slot.xPositionMm + xLocal * cosA - yLowerLocal * sinA,
      y: slot.yPositionMm + xLocal * sinA + yLowerLocal * cosA,
    });

    upperPoints.push({
      x: slot.xPositionMm + xLocal * cosA - yUpperLocal * sinA,
      y: slot.yPositionMm + xLocal * sinA + yUpperLocal * cosA,
    });
  }

  // CCW loop: lower edge from LE to TE, then upper edge from TE to LE
  return [...lowerPoints, ...upperPoints.reverse()];
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
    x: cx / (3 * signedArea),
    y: cy / (3 * signedArea),
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
/**
 * Linearly interpolates the X position along a piecewise-linear path of 2D points at given Y coordinate.
 */
function interpolateXAtY(points: Point2D[], targetY: number, defaultX: number): number {
  if (points.length === 0) return defaultX;
  if (points.length === 1) return points[0].x;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    if (targetY >= minY - 1e-8 && targetY <= maxY + 1e-8) {
      if (Math.abs(p2.y - p1.y) < 0.0001) {
        return p1.x;
      }
      const frac = (targetY - p1.y) / (p2.y - p1.y);
      return p1.x + frac * (p2.x - p1.x);
    }
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(targetY - first.y) < Math.abs(targetY - last.y)) {
    return first.x;
  }
  return last.x;
}

/**
 * Generates the full symmetric planform outline from half-wing control nodes.
 * The input `halfNodes` specifies the right half-wing points in order:
 * root LE (0,0) -> leading edge points -> tip LE -> tip TE -> trailing edge points -> root TE (cr,0).
 *
 * Symmetrically mirrors across the centerline (Y = 0) to produce the complete
 * 2D wing outline.
 */
export function calculateCustomWingPlanformPoints(halfNodes: Point2D[]): Point2D[] {
  if (halfNodes.length < 3) return halfNodes;

  // Right wing panel (y >= 0)
  const rightHalf = halfNodes.map((p) => ({ x: p.x, y: Math.max(0, p.y) }));
  // Left wing panel (y <= 0), mirrored across Y=0 in reverse order
  const leftHalf = [...rightHalf]
    .reverse()
    .slice(1, -1)
    .map((p) => ({ x: p.x, y: -p.y }));

  return [...rightHalf, ...leftHalf];
}

/**
 * Returns the leading edge X position and chord at span fraction `t` in [0, 1]
 * (where 0 = root, 1 = tip). Any consumer that needs the shape of a wing
 * planform at an arbitrary span fraction (e.g. a subdivided 3D mesh)
 * should call this rather than re-deriving it.
 */
export function getWingStationAt(
  kind: WingPlanformKind,
  rootChordMm: number,
  effectiveTipChordMm: number,
  spanMm: number,
  sweepDeg: number,
  t: number,
  customNodes?: Point2D[]
): { xLE: number; chord: number } {
  const halfSpan = spanMm / 2;
  const sweepRad = (sweepDeg * Math.PI) / 180;
  const clampedT = Math.max(0, Math.min(1, t));

  if (kind === 'custom' && customNodes && customNodes.length >= 3) {
    const maxSpan = Math.max(...customNodes.map((p) => p.y));
    if (maxSpan > 1) {
      // Find wingtip index
      let tipLEIndex = 0;
      let tipTEIndex = customNodes.length - 1;
      for (let i = 0; i < customNodes.length; i++) {
        if (customNodes[i].y >= maxSpan - 1e-7) {
          tipLEIndex = i;
          break;
        }
      }
      for (let i = customNodes.length - 1; i >= 0; i--) {
        if (customNodes[i].y >= maxSpan - 1e-7) {
          tipTEIndex = i;
          break;
        }
      }

      const lePoints = customNodes.slice(0, tipLEIndex + 1);
      const tePoints = customNodes.slice(tipTEIndex);
      const targetY = clampedT * maxSpan;

      const xLE = interpolateXAtY(lePoints, targetY, 0);
      const xTE = interpolateXAtY(tePoints, targetY, rootChordMm);
      const chord = xTE - xLE;
      return { xLE, chord };
    }
  }

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
 * closed polygon.
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
 * call to get "the shape of this surface."
 */
export function calculateWingPlanformPoints(
  kind: WingPlanformKind,
  rootChordMm: number,
  effectiveTipChordMm: number,
  spanMm: number,
  sweepDeg: number,
  customNodes?: Point2D[]
): Point2D[] {
  if (kind === 'custom' && customNodes && customNodes.length >= 3) {
    return calculateCustomWingPlanformPoints(customNodes);
  }
  return kind === 'elliptical'
    ? calculateEllipticalPlanformPoints(rootChordMm, effectiveTipChordMm, spanMm, sweepDeg)
    : calculateTrapezoidPlanformPoints(rootChordMm, effectiveTipChordMm, spanMm, sweepDeg);
}
