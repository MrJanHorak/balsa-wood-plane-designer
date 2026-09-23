import polygonClipping, { type Polygon } from 'polygon-clipping';
import { Point2D, calculateSlotPoints, polygonArea, polygonCentroid } from './core';
import { GliderDesign } from '@/types/glider';

export interface SheetRegion { outline: Point2D[]; holes: Point2D[][] }

/** Physical cuts only: saddle and pylon marks do not remove fuselage material. */
export function getFuselageCuts(glider: GliderDesign): Point2D[][] {
  const cuts = [calculateSlotPoints(glider.fuselage.tailSlot)];
  if (glider.fuselage.mountType === 'through_slot') {
    cuts.push(calculateSlotPoints(glider.fuselage.wingSlot, glider.wing.rootChordMm, glider.wing.camberPercent));
  }
  return cuts;
}

/** Area-weighted first moments, independent of ring winding. */
export function calculateSheetProperties(regions: SheetRegion[]) {
  let areaMm2 = 0, momentX = 0, momentY = 0;
  for (const region of regions) {
    for (const [ring, sign] of [[region.outline, 1], ...region.holes.map(h => [h, -1] as const)] as const) {
      const area = sign * polygonArea(ring);
      if (area === 0) continue;
      const center = polygonCentroid(ring);
      areaMm2 += area;
      momentX += area * center.x;
      momentY += area * center.y;
    }
  }
  return { areaMm2: Math.max(0, areaMm2), centroid: areaMm2 > 1e-9
    ? { x: momentX / areaMm2, y: momentY / areaMm2 } : { x: 0, y: 0 } };
}

/** Subtract cuts before triangulation: a cut crossing an edge is a notch, not a hole. */
export function subtractSheetCutouts(outline: Point2D[], cuts: Point2D[][]): SheetRegion[] {
  if (outline.length < 3) return [];
  const polygon = (ring: Point2D[]): Polygon => [ring.map(p => [p.x, p.y])];
  return polygonClipping.difference(polygon(outline), ...cuts.filter(c => c.length >= 3).map(polygon)).map(rings => {
    const points = rings.map(ring => ring.slice(0, -1).map(([x, y]) => ({ x, y })));
    return { outline: points[0], holes: points.slice(1) };
  });
}
