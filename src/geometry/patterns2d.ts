import { GliderDesign, getEffectiveTipChordMm } from '@/types/glider';
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
    slotCutouts.push(
      `M ${wp0.x.toFixed(2)} ${wp0.y.toFixed(2)} L ${wp1.x.toFixed(2)} ${wp1.y.toFixed(2)} L ${wp2.x.toFixed(2)} ${wp2.y.toFixed(2)} L ${wp3.x.toFixed(2)} ${wp3.y.toFixed(2)} Z`
    );
  } else if (fuselage.mountType === 'top_saddle' || fuselage.mountType === 'bottom_saddle') {
    // Glue-seat guide: a dashed rectangle showing exactly where the wing root sits
    scoreLines.push(
      `M ${wp0.x.toFixed(2)} ${wp0.y.toFixed(2)} L ${wp1.x.toFixed(2)} ${wp1.y.toFixed(2)} L ${wp2.x.toFixed(2)} ${wp2.y.toFixed(2)} L ${wp3.x.toFixed(2)} ${wp3.y.toFixed(2)} Z`
    );
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

  slotCutouts.push(
    `M ${tp0.x.toFixed(2)} ${tp0.y.toFixed(2)} L ${tp1.x.toFixed(2)} ${tp1.y.toFixed(2)} L ${tp2.x.toFixed(2)} ${tp2.y.toFixed(2)} L ${tp3.x.toFixed(2)} ${tp3.y.toFixed(2)} Z`
  );

  return {
    id: 'fuselage',
    name: 'Profile Fuselage',
    outlinePath,
    slotCutouts,
    scoreLines,
    dimensions: { widthMm: fuselage.lengthMm, heightMm: fuselage.maxHeightMm },
    boundingBox: { minX: 0, minY: 0, maxX: fuselage.lengthMm, maxY: fuselage.maxHeightMm },
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
  const p0 = { x: 0, y: 0 };
  const p1 = { x: pylonW, y: 0 };
  const p2 = { x: pylonW * 0.9, y: pylonHeightMm };
  const p3 = { x: pylonW * 0.1, y: pylonHeightMm };

  const outlinePath = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} Z`;

  return {
    id: 'parasol_pylon',
    name: 'Parasol Pylon (Cabane Strut)',
    outlinePath,
    slotCutouts: [],
    scoreLines: [],
    dimensions: { widthMm: pylonW, heightMm: pylonHeightMm },
    boundingBox: { minX: 0, minY: 0, maxX: pylonW, maxY: pylonHeightMm },
  };
}

/**
 * Generates 2D SVG path data for the 1-piece Main Wing (with center dihedral score line and interlocking slot tab)
 */
export function generateWingFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { wing } = glider;
  const halfSpan = wing.spanMm / 2;
  const cr = wing.rootChordMm;
  const ct = getEffectiveTipChordMm(wing);
  const sweepRad = (wing.sweepDeg * Math.PI) / 180;
  const sweepOffset = halfSpan * Math.tan(sweepRad);

  let outlinePath: string;
  let maxChordExtent = Math.max(cr, ct) + sweepOffset;

  if (wing.planformType === 'elliptical') {
    // Mirror the same elliptical sampling used for the 3D mesh so the flat
    // pattern matches the rendered preview exactly.
    const segments = 16;
    const lePoints: { x: number; y: number }[] = [];
    const tePoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 at root, 1 at tip
      const ellipseFactor = Math.sqrt(Math.max(0, 1 - t * t));
      const chordAtT = Math.max(ct * 0.4, cr * ellipseFactor);
      const sweepAtT = t * halfSpan * Math.tan(sweepRad);
      const leX = sweepAtT + 0.25 * (cr - chordAtT);
      const teX = leX + chordAtT;
      lePoints.push({ x: leX, y: t * halfSpan });
      tePoints.push({ x: teX, y: t * halfSpan });
    }

    // Build the closed outline by walking the leading edge root→tip, across the
    // tip, back down the trailing edge tip→root, mirrored to the other half-span.
    const pts: { x: number; y: number }[] = [
      ...lePoints.map(p => ({ x: p.x, y: p.y })),
      ...[...tePoints].reverse().map(p => ({ x: p.x, y: p.y })),
      ...[...lePoints].reverse().slice(1).map(p => ({ x: p.x, y: -p.y })),
      ...tePoints.slice(1).map(p => ({ x: p.x, y: -p.y })),
    ];
    outlinePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} ` +
      pts.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
    maxChordExtent = Math.max(...pts.map(p => p.x));
  } else {
    // Tapered, Rectangular, or Delta: straight-edged trapezoid planform
    // Full unrolled wing planform centered on X=0 (root chord):
    // Left Tip -> Left Root -> Right Root -> Right Tip
    // Top-down: X is chord (0 to cr), Y is span (-halfSpan to +halfSpan)
    const leftTipLE = { x: sweepOffset, y: -halfSpan };
    const leftTipTE = { x: sweepOffset + ct, y: -halfSpan };
    const rootLE = { x: 0, y: 0 };
    const rootTE = { x: cr, y: 0 };
    const rightTipTE = { x: sweepOffset + ct, y: halfSpan };
    const rightTipLE = { x: sweepOffset, y: halfSpan };

    outlinePath = `M ${rootLE.x} ${rootLE.y} ` +
      `L ${leftTipLE.x.toFixed(2)} ${leftTipLE.y.toFixed(2)} ` +
      `L ${leftTipTE.x.toFixed(2)} ${leftTipTE.y.toFixed(2)} ` +
      `L ${rootTE.x} ${rootTE.y} ` +
      `L ${rightTipTE.x.toFixed(2)} ${rightTipTE.y.toFixed(2)} ` +
      `L ${rightTipLE.x.toFixed(2)} ${rightTipLE.y.toFixed(2)} Z`;
  }

  // Center Score Line along root chord (for bending dihedral angle)
  const scoreLines = [`M 0 0 L ${cr} 0`];

  return {
    id: 'main_wing',
    name: 'Main Wing Panel',
    outlinePath,
    slotCutouts: [],
    scoreLines,
    dimensions: { widthMm: maxChordExtent, heightMm: wing.spanMm },
    boundingBox: { minX: 0, minY: -halfSpan, maxX: maxChordExtent, maxY: halfSpan },
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
