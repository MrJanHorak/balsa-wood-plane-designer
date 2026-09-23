import { GliderDesign } from '@/types/glider';
import { getWingBlank } from './wingBlank';
import { getFuselageContourPoints } from '@/physics/massBalance';
import { getTailPlanformPoints } from './customWing';
import { getFuselageCuts, subtractSheetCutouts } from './sheetCutouts';
import { getFinProfilePoints } from './customFin';
import { getPylonGeometry } from './pylon';
import {
  calculateBoundingBox,
  calculateSlotPoints,
  pointsToPath,
} from '@/geometry/core';

export interface FlatPartSvg {
  id: string;
  name: string;
  outlinePath: string;
  slotCutouts: string[];
  scoreLines: string[];
  dimensions: { widthMm: number; heightMm: number };
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

export function generateFinFlatPattern(glider: GliderDesign): FlatPartSvg {
  const points = getFinProfilePoints(glider.verticalStabilizer);
  const bbox = calculateBoundingBox(points);
  return { id: 'vertical_fin', name: 'Vertical Fin', outlinePath: pointsToPath(points), slotCutouts: [], scoreLines: [],
    dimensions: { widthMm: bbox.maxX - bbox.minX, heightMm: bbox.maxY - bbox.minY }, boundingBox: bbox };
}

/**
 * Generates 2D SVG path data for the Profile Fuselage including wing and tail slot cutouts
 */
export function generateFuselageFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { fuselage } = glider;
  const contour = getFuselageContourPoints(glider);

  const scoreLines: string[] = [];

  // Wing slot cutout — only an enclosed hole for through-slot mounting.
  // When wing has camber, arches upward with the wing's true mean camber line.
  // Saddle and parasol mounts glue directly to the surface, so we mark a
  // dashed glue-seat guide line instead of cutting through the sheet.
  const ws = fuselage.wingSlot;
  const wingSlotPoints = calculateSlotPoints(ws, glider.wing.rootChordMm, glider.wing.camberPercent);

  if (fuselage.mountType === 'top_saddle' || fuselage.mountType === 'bottom_saddle') {
    // Glue-seat guide: a dashed line showing exactly where the wing root sits
    scoreLines.push(pointsToPath(wingSlotPoints));
  }
  // parasol_pylon: no mark on the fuselage itself — the pylon is its own flat part
  // (see generatePylonFlatPattern) and glues to the spine independently.

  // Tail slot may exit the outline as an open-ended sliding notch.
  const cuts = getFuselageCuts(glider);
  const regions = subtractSheetCutouts(contour, cuts);
  const outlinePath = regions.map(r => pointsToPath(r.outline)).join(' ');
  const enclosedCuts = regions.flatMap(r => r.holes.map(pointsToPath));

  const bbox = calculateBoundingBox(contour);

  return {
    id: 'fuselage',
    name: 'Profile Fuselage',
    outlinePath,
    slotCutouts: enclosedCuts,
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
  const { points, width: pylonW, height: pylonHeightMm } = getPylonGeometry(glider);

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
 * Generates a sheet blank with chordwise camber allowance and a center guide.
 * General swept/tapered cambered blanks remain approximate forming templates.
 */
export function generateWingFlatPattern(glider: GliderDesign): FlatPartSvg {
  const { wing } = glider;
  const { points, rootLengthMm } = getWingBlank(wing);
  const bbox = calculateBoundingBox(points);

  // Center Score Line along root chord (for bending dihedral angle)
  const scoreLines = wing.dihedralDeg !== 0 ? [`M 0 0 L ${rootLengthMm} 0`] : [];

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
  const points = getTailPlanformPoints(tail);
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
