import { GliderDesign } from '@/types/glider';
import { Point2D } from './core';

/** One sheet part shared by rendering, cutting and mass calculations. */
export function getPylonGeometry(glider: GliderDesign) {
  const f = glider.fuselage;
  const width = f.pylonWidthMm;
  const y = Math.min(f.maxHeightMm, f.wingSlot.yPositionMm) - 4;
  const height = Math.max(0, f.wingSlot.yPositionMm - y);
  const points: Point2D[] = [
    { x: 0, y: 0 }, { x: width, y: 0 },
    { x: width * 0.9, y: height }, { x: width * 0.1, y: height },
  ];
  return { points, width, height, origin: { x: f.wingSlot.xPositionMm + (f.wingSlot.lengthMm - width) / 2, y } };
}
