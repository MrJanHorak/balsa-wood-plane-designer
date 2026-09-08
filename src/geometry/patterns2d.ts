import { GliderDesign } from '@/types/glider';
import { getFuselageProfilePoints } from '@/physics/massBalance';

export interface FlatPartSvg {
  id: string;
  name: string;
  outlinePath: string;
  slotCutouts: string[];
  scoreLines: string[];
  dimensions: { widthMm: number; heightMm: number };
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Generates 2D SVG path data for the Profile Fuselage including wing and tail slot cutouts
 */
export function generateFuselageFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { fuselage } = glider;
  const points = getFuselageProfilePoints(fuselage);

  // Fuselage outline path: M x0 y0 L x1 y1 ... Z
  const outlinePath = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z'
    : '';

  const slotCutouts: string[] = [];

  // Wing slot cutout
  const ws = fuselage.wingSlot;
  const wAngleRad = (ws.angleDeg * Math.PI) / 180;
  const cosW = Math.cos(wAngleRad);
  const sinW = Math.sin(wAngleRad);
  const halfThick = ws.thicknessMm / 2;

  const wp0 = { x: ws.xPositionMm, y: ws.yPositionMm - halfThick };
  const wp1 = { x: ws.xPositionMm + ws.lengthMm * cosW, y: ws.yPositionMm + ws.lengthMm * sinW - halfThick };
  const wp2 = { x: ws.xPositionMm + ws.lengthMm * cosW, y: ws.yPositionMm + ws.lengthMm * sinW + halfThick };
  const wp3 = { x: ws.xPositionMm, y: ws.yPositionMm + halfThick };

  slotCutouts.push(
    `M ${wp0.x.toFixed(2)} ${wp0.y.toFixed(2)} L ${wp1.x.toFixed(2)} ${wp1.y.toFixed(2)} L ${wp2.x.toFixed(2)} ${wp2.y.toFixed(2)} L ${wp3.x.toFixed(2)} ${wp3.y.toFixed(2)} Z`
  );

  // Tail slot cutout
  const ts = fuselage.tailSlot;
  const tAngleRad = (ts.angleDeg * Math.PI) / 180;
  const cosT = Math.cos(tAngleRad);
  const sinT = Math.sin(tAngleRad);
  const halfTailThick = ts.thicknessMm / 2;

  const tp0 = { x: ts.xPositionMm, y: ts.yPositionMm - halfTailThick };
  const tp1 = { x: ts.xPositionMm + ts.lengthMm * cosT, y: ts.yPositionMm + ts.lengthMm * sinT - halfTailThick };
  const tp2 = { x: ts.xPositionMm + ts.lengthMm * cosT, y: ts.yPositionMm + ts.lengthMm * sinT + halfTailThick };
  const tp3 = { x: ts.xPositionMm, y: ts.yPositionMm + halfTailThick };

  slotCutouts.push(
    `M ${tp0.x.toFixed(2)} ${tp0.y.toFixed(2)} L ${tp1.x.toFixed(2)} ${tp1.y.toFixed(2)} L ${tp2.x.toFixed(2)} ${tp2.y.toFixed(2)} L ${tp3.x.toFixed(2)} ${tp3.y.toFixed(2)} Z`
  );

  return {
    id: 'fuselage',
    name: 'Profile Fuselage',
    outlinePath,
    slotCutouts,
    scoreLines: [],
    dimensions: { widthMm: fuselage.lengthMm, heightMm: fuselage.maxHeightMm },
    boundingBox: { minX: 0, minY: 0, maxX: fuselage.lengthMm, maxY: fuselage.maxHeightMm },
  };
}

/**
 * Generates 2D SVG path data for the 1-piece Main Wing (with center dihedral score line and interlocking slot tab)
 */
export function generateWingFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { wing } = glider;
  const halfSpan = wing.spanMm / 2;
  const cr = wing.rootChordMm;
  const ct = wing.tipChordMm;
  const sweepRad = (wing.sweepDeg * Math.PI) / 180;
  const sweepOffset = halfSpan * Math.tan(sweepRad);

  // Full unrolled wing planform centered on X=0 (root chord):
  // Left Tip -> Left Root -> Right Root -> Right Tip
  // Top-down: X is chord (0 to cr), Y is span (-halfSpan to +halfSpan)
  const leftTipLE = { x: sweepOffset, y: -halfSpan };
  const leftTipTE = { x: sweepOffset + ct, y: -halfSpan };
  const rootLE = { x: 0, y: 0 };
  const rootTE = { x: cr, y: 0 };
  const rightTipTE = { x: sweepOffset + ct, y: halfSpan };
  const rightTipLE = { x: sweepOffset, y: halfSpan };

  const outlinePath = `M ${rootLE.x} ${rootLE.y} ` +
    `L ${leftTipLE.x.toFixed(2)} ${leftTipLE.y.toFixed(2)} ` +
    `L ${leftTipTE.x.toFixed(2)} ${leftTipTE.y.toFixed(2)} ` +
    `L ${rootTE.x} ${rootTE.y} ` +
    `L ${rightTipTE.x.toFixed(2)} ${rightTipTE.y.toFixed(2)} ` +
    `L ${rightTipLE.x.toFixed(2)} ${rightTipLE.y.toFixed(2)} Z`;

  // Center Score Line along root chord (for bending dihedral angle)
  const scoreLines = [`M 0 0 L ${cr} 0`];

  return {
    id: 'main_wing',
    name: 'Main Wing Panel',
    outlinePath,
    slotCutouts: [],
    scoreLines,
    dimensions: { widthMm: sweepOffset + Math.max(cr, ct), heightMm: wing.spanMm },
    boundingBox: { minX: 0, minY: -halfSpan, maxX: sweepOffset + Math.max(cr, ct), maxY: halfSpan },
  };
}

/**
 * Generates 2D SVG path data for the Tailplane (Horizontal Stabilizer)
 */
export function generateTailFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { horizontalStabilizer: tail } = glider;
  const halfSpan = tail.spanMm / 2;
  const cr = tail.rootChordMm;
  const ct = tail.tipChordMm;
  const sweepRad = (tail.sweepDeg * Math.PI) / 180;
  const sweepOffset = halfSpan * Math.tan(sweepRad);

  const leftTipLE = { x: sweepOffset, y: -halfSpan };
  const leftTipTE = { x: sweepOffset + ct, y: -halfSpan };
  const rootLE = { x: 0, y: 0 };
  const rootTE = { x: cr, y: 0 };
  const rightTipTE = { x: sweepOffset + ct, y: halfSpan };
  const rightTipLE = { x: sweepOffset, y: halfSpan };

  const outlinePath = `M ${rootLE.x} ${rootLE.y} ` +
    `L ${leftTipLE.x.toFixed(2)} ${leftTipLE.y.toFixed(2)} ` +
    `L ${leftTipTE.x.toFixed(2)} ${leftTipTE.y.toFixed(2)} ` +
    `L ${rootTE.x} ${rootTE.y} ` +
    `L ${rightTipTE.x.toFixed(2)} ${rightTipTE.y.toFixed(2)} ` +
    `L ${rightTipLE.x.toFixed(2)} ${rightTipLE.y.toFixed(2)} Z`;

  return {
    id: 'horizontal_tail',
    name: 'Horizontal Stabilizer',
    outlinePath,
    slotCutouts: [],
    scoreLines: [],
    dimensions: { widthMm: sweepOffset + Math.max(cr, ct), heightMm: tail.spanMm },
    boundingBox: { minX: 0, minY: -halfSpan, maxX: sweepOffset + Math.max(cr, ct), maxY: halfSpan },
  };
}
