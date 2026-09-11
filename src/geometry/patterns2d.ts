import { GliderDesign, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import { getFuselageProfilePoints } from '@/physics/massBalance';
import { Point2D, calculateWingPlanformPoints, calculateTrapezoidPlanformPoints, calculateBoundingBox } from '@/geometry/core';

export interface FlatPartSvg {
  id: string;
  name: string;
  outlinePath: string;
  slotCutouts: string[];
  scoreLines: string[];
  dimensions: { widthMm: number; heightMm: number };
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Renders a closed point list as an SVG path's `d` attribute. */
function pointsToPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} ` +
    points.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

/**
 * Generates 2D SVG path data for the Profile Fuselage including wing and tail slot cutouts
 */
export function generateFuselageFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { fuselage } = glider;
  const points = getFuselageProfilePoints(glider);

  const outlinePath = pointsToPath(points);

  const slotCutouts: string[] = [];
  const scoreLines: string[] = [];

  // Wing slot cutout — only an enclosed hole for through-slot mounting.
  // Saddle and parasol mounts glue directly to the surface, so we mark a
  // dashed glue-seat guide line instead of cutting through the sheet.
  const ws = fuselage.wingSlot;
  const wAngleRad = (ws.angleDeg * Math.PI) / 180;
  const cosW = Math.cos(wAngleRad);
  const sinW = Math.sin(wAngleRad);
  const halfThick = ws.thicknessMm / 2;

  const wp0 = { x: ws.xPositionMm, y: ws.yPositionMm - halfThick };
  const wp1 = { x: ws.xPositionMm + ws.lengthMm * cosW, y: ws.yPositionMm + ws.lengthMm * sinW - halfThick };
  const wp2 = { x: ws.xPositionMm + ws.lengthMm * cosW, y: ws.yPositionMm + ws.lengthMm * sinW + halfThick };
  const wp3 = { x: ws.xPositionMm, y: ws.yPositionMm + halfThick };

  if (fuselage.mountType === 'through_slot') {
    slotCutouts.push(pointsToPath([wp0, wp1, wp2, wp3]));
  } else if (fuselage.mountType === 'top_saddle' || fuselage.mountType === 'bottom_saddle') {
    // Glue-seat guide: a dashed rectangle showing exactly where the wing root sits
    scoreLines.push(pointsToPath([wp0, wp1, wp2, wp3]));
  }
  // parasol_pylon: no mark on the fuselage itself — the pylon is its own flat part
  // (see generatePylonFlatPattern) and glues to the spine independently.

  // Tail slot cutout (tailplane always mounts via enclosed sliding slot)
  const ts = fuselage.tailSlot;
  const tAngleRad = (ts.angleDeg * Math.PI) / 180;
  const cosT = Math.cos(tAngleRad);
  const sinT = Math.sin(tAngleRad);
  const halfTailThick = ts.thicknessMm / 2;

  const tp0 = { x: ts.xPositionMm, y: ts.yPositionMm - halfTailThick };
  const tp1 = { x: ts.xPositionMm + ts.lengthMm * cosT, y: ts.yPositionMm + ts.lengthMm * sinT - halfTailThick };
  const tp2 = { x: ts.xPositionMm + ts.lengthMm * cosT, y: ts.yPositionMm + ts.lengthMm * sinT + halfTailThick };
  const tp3 = { x: ts.xPositionMm, y: ts.yPositionMm + halfTailThick };

  slotCutouts.push(pointsToPath([tp0, tp1, tp2, tp3]));

  const bbox = calculateBoundingBox(points);

  return {
    id: 'fuselage',
    name: 'Profile Fuselage',
    outlinePath,
    slotCutouts,
    scoreLines,
    dimensions: { widthMm: bbox.maxX - bbox.minX, heightMm: bbox.maxY - bbox.minY },
    boundingBox: bbox,
  };
}

/**
 * Generates 2D SVG path data for the cabane/pylon strut used by 'parasol_pylon' mounting.
 * Only meaningful when fuselage.mountType === 'parasol_pylon'; mirrors the 3D pylon shape
 * generated in geometry/extrusion3d.ts so the 2D cut part matches the 3D preview exactly.
 */
export function generatePylonFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { fuselage } = glider;
  const ws = fuselage.wingSlot;
  const pylonW = fuselage.pylonWidthMm || 24;
  const baseSpineY = Math.min(fuselage.maxHeightMm, ws.yPositionMm);
  const topPylonY = ws.yPositionMm;
  const pylonHeightMm = Math.max(0, topPylonY - (baseSpineY - 4));

  // Drawn root-up in its own local frame: (0,0) at bottom-left of the strut base
  const points: Point2D[] = [
    { x: 0, y: 0 },
    { x: pylonW, y: 0 },
    { x: pylonW * 0.9, y: pylonHeightMm },
    { x: pylonW * 0.1, y: pylonHeightMm },
  ];

  return {
    id: 'parasol_pylon',
    name: 'Parasol Pylon (Cabane Strut)',
    outlinePath: pointsToPath(points),
    slotCutouts: [],
    scoreLines: [],
    dimensions: { widthMm: pylonW, heightMm: pylonHeightMm },
    boundingBox: { minX: 0, minY: 0, maxX: pylonW, maxY: pylonHeightMm },
  };
}

/**
 * Generates 2D SVG path data for the 1-piece Main Wing (with center dihedral score line and interlocking slot tab).
 * Sourced from the canonical planform engine (src/geometry/core.ts) — the same
 * function the 3D renderer and physics engine use for this wing's shape.
 */
export function generateWingFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { wing } = glider;
  const cr = wing.rootChordMm;
  const ct = getEffectiveTipChordMm(wing);

  const points = calculateWingPlanformPoints(getWingPlanformKind(wing.planformType), cr, ct, wing.spanMm, wing.sweepDeg);
  const bbox = calculateBoundingBox(points);

  // Center Score Line along root chord (for bending dihedral angle)
  const scoreLines = [`M 0 0 L ${cr} 0`];

  return {
    id: 'main_wing',
    name: 'Main Wing Panel',
    outlinePath: pointsToPath(points),
    slotCutouts: [],
    scoreLines,
    dimensions: { widthMm: bbox.maxX - bbox.minX, heightMm: bbox.maxY - bbox.minY },
    boundingBox: bbox,
  };
}

/**
 * Generates 2D SVG path data for the Tailplane (Horizontal Stabilizer)
 */
export function generateTailFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { horizontalStabilizer: tail } = glider;
  const points = calculateTrapezoidPlanformPoints(tail.rootChordMm, tail.tipChordMm, tail.spanMm, tail.sweepDeg);
  const bbox = calculateBoundingBox(points);

  return {
    id: 'horizontal_tail',
    name: 'Horizontal Stabilizer',
    outlinePath: pointsToPath(points),
    slotCutouts: [],
    scoreLines: [],
    dimensions: { widthMm: bbox.maxX - bbox.minX, heightMm: bbox.maxY - bbox.minY },
    boundingBox: bbox,
  };
}
