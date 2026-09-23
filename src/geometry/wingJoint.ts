import polygonClipping, { Polygon } from 'polygon-clipping';
import { GliderDesign } from '@/types/glider';
import { calculateSlotPoints, Point2D, polygonArea } from './core';
import { createAssembledHalfWingGeometry } from './wingSurface';

type V = { x: number; y: number; z: number };
function clip(vertices: V[], limit: number, sign: number): V[] {
  const result: V[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const insideA = sign * a.z <= sign * limit;
    const insideB = sign * b.z <= sign * limit;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = (limit - a.z) / (b.z - a.z);
      result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: limit });
    }
  }
  return result;
}
function hull(points: Point2D[]): Point2D[] {
  const sorted = points.toSorted((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Point2D, b: Point2D, c: Point2D) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (list: Point2D[]) => {
    const out: Point2D[] = [];
    for (const p of list) {
      while (out.length > 1 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}
let cachedKey = '';
let cachedCuts: Point2D[][] = [];

/** Project triangles clipped to the fuselage slab, retaining the requested slot
 * and adding only relief needed by the assembled wing. Symmetry means one half
 * provides the complete X/Y envelope. Clearance is applied in local slot Y. */
export function getWingJointCuts(g: GliderDesign): Point2D[][] {
  const key = JSON.stringify([g.wing, g.fuselage.thicknessMm, g.fuselage.wingSlot]);
  if (key === cachedKey) return cachedCuts;
  const slot = g.fuselage.wingSlot;
  const nominal = calculateSlotPoints(slot, g.wing.rootChordMm, g.wing.camberPercent);
  const polygons: Polygon[] = [[nominal.map(p => [p.x, p.y])]];
  const geometry = createAssembledHalfWingGeometry(g);
  const p = geometry.getAttribute('position'), indices = geometry.getIndex()!;
  const h = g.fuselage.thicknessMm / 2;
  const clearance = Math.max(0, slot.thicknessMm - g.wing.thicknessMm) / 2;
  const a = slot.angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  for (let i = 0; i < indices.count; i += 3) {
    const vertices = [0, 1, 2].map(j => {
      const k = indices.getX(i + j);
      return { x: p.getX(k), y: p.getY(k), z: p.getZ(k) };
    });
    const section = clip(clip(vertices, h, 1), -h, -1);
    if (section.length < 3) continue;
    const expanded = hull(section.flatMap(v => [{ x: v.x, y: v.y - clearance }, { x: v.x, y: v.y + clearance }]));
    if (expanded.length < 3 || polygonArea(expanded) < 1e-9) continue;
    polygons.push([expanded.map(v => [
      Math.round((slot.xPositionMm + v.x * c - v.y * s) * 1e6) / 1e6,
      Math.round((slot.yPositionMm + v.x * s + v.y * c) * 1e6) / 1e6,
    ])]);
  }
  geometry.dispose();
  const result = polygonClipping.union(polygons[0], ...polygons.slice(1));
  cachedKey = key;
  // Relief is a through-cut, so enclosed pockets within the envelope are removed.
  cachedCuts = result.map(r => r[0].slice(0, -1).map(([x, y]) => ({ x, y })));
  return cachedCuts;
}
