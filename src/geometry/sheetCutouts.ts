import polygonClipping, { type Polygon } from 'polygon-clipping';
import { Point2D } from './core';

export interface SheetRegion { outline: Point2D[]; holes: Point2D[][] }

/** Subtract cuts before triangulation: a cut crossing an edge is a notch, not a hole. */
export function subtractSheetCutouts(outline: Point2D[], cuts: Point2D[][]): SheetRegion[] {
  if (outline.length < 3) return [];
  const polygon = (ring: Point2D[]): Polygon => [ring.map(p => [p.x, p.y])];
  return polygonClipping.difference(polygon(outline), ...cuts.filter(c => c.length >= 3).map(polygon)).map(rings => {
    const points = rings.map(ring => ring.slice(0, -1).map(([x, y]) => ({ x, y })));
    return { outline: points[0], holes: points.slice(1) };
  });
}
