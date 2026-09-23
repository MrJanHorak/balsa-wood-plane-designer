import { GliderDesign } from '@/types/glider';
import { Point2D } from './core';
import { FlatPartSvg, generateFinFlatPattern, generateFuselageFlatPattern, generatePylonFlatPattern, generateTailFlatPattern, generateWingFlatPattern } from './patterns2d';

export type PrintPaper = 'a4' | 'letter';
export const PRINT_PAPER = { a4: { width: 297, height: 210 }, letter: { width: 279.4, height: 215.9 } };
export const PRINT_MARGIN = 12;
export const PRINT_TOP = 32;
export const PRINT_OVERLAP = 10;
export const PART_PADDING = 5;
export interface PrintPart { part: FlatPartSvg; rotate: boolean; thickness: number }
export function getPrintParts(g: GliderDesign): PrintPart[] {
  return [
    { part: generateFuselageFlatPattern(g), rotate: false, thickness: g.fuselage.thicknessMm },
    { part: generateWingFlatPattern(g), rotate: true, thickness: g.wing.thicknessMm },
    { part: generateTailFlatPattern(g), rotate: true, thickness: g.horizontalStabilizer.thicknessMm },
    ...(g.fuselage.mountType === 'parasol_pylon' ? [{ part: generatePylonFlatPattern(g), rotate: false, thickness: g.fuselage.thicknessMm }] : []),
    ...(!g.verticalStabilizer.isIntegralWithFuselage ? [{ part: generateFinFlatPattern(g), rotate: false, thickness: g.verticalStabilizer.thicknessMm }] : []),
  ];
}
export function printPoint(p: Point2D, item: PrintPart): Point2D {
  const b = item.part.boundingBox;
  return item.rotate ? { x: b.maxY - p.y + PART_PADDING, y: p.x - b.minX + PART_PADDING }
    : { x: p.x - b.minX + PART_PADDING, y: b.maxY - p.y + PART_PADDING };
}
export function getPartTiles(item: PrintPart, paper: PrintPaper) {
  const page = PRINT_PAPER[paper];
  const width = page.width - PRINT_MARGIN * 2;
  const height = page.height - PRINT_TOP - 26;
  const b = item.part.boundingBox;
  const partWidth = (item.rotate ? b.maxY - b.minY : b.maxX - b.minX) + PART_PADDING * 2;
  const partHeight = (item.rotate ? b.maxX - b.minX : b.maxY - b.minY) + PART_PADDING * 2;
  if (![partWidth, partHeight].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid part dimensions for printing.');
  const columns = Math.max(1, Math.ceil((partWidth - PRINT_OVERLAP) / (width - PRINT_OVERLAP)));
  const rows = Math.max(1, Math.ceil((partHeight - PRINT_OVERLAP) / (height - PRINT_OVERLAP)));
  if (columns * rows > 100) throw new Error('This part needs more than 100 pages. Reduce its dimensions before printing.');
  const tiles = Array.from({ length: columns * rows }, (_, i) => ({
    column: i % columns, row: Math.floor(i / columns),
    x: (i % columns) * (width - PRINT_OVERLAP), y: Math.floor(i / columns) * (height - PRINT_OVERLAP),
  }));
  return { tiles, columns, rows, width, height, partWidth, partHeight };
}

/** Shared part-space marks ensure each seam has at least two matching crosses,
 * even on a long, very narrow part. */
export function getRegistrationMarks(layout: ReturnType<typeof getPartTiles>): Point2D[] {
  const anchors = (length: number) => [...new Set([2, length - 2,
    ...Array.from({ length: Math.max(0, Math.ceil((length - 20) / 40)) }, (_, i) => 20 + i * 40)])];
  const points: Point2D[] = [];
  for (let col = 1; col < layout.columns; col++) {
    const x = col * (layout.width - PRINT_OVERLAP) + PRINT_OVERLAP / 2;
    for (const y of anchors(layout.partHeight)) points.push({ x, y });
  }
  for (let row = 1; row < layout.rows; row++) {
    const y = row * (layout.height - PRINT_OVERLAP) + PRINT_OVERLAP / 2;
    for (const x of anchors(layout.partWidth)) points.push({ x, y });
  }
  return points;
}

/** Current pattern paths intentionally contain only absolute M/L/Z segments. */
export function readPatternPath(path: string): { points: Point2D[]; closed: boolean }[] {
  const tokens = path.match(/[MLZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? [];
  if (tokens.join('') !== path.replace(/\s+/g, '')) throw new Error('Unsupported pattern command.');
  const result: { points: Point2D[]; closed: boolean }[] = [];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    if (command === 'Z') {
      if (!result.length) throw new Error('Invalid pattern path.');
      result[result.length - 1].closed = true;
    } else if (command === 'M' || command === 'L') {
      const x = Number(tokens[i++]), y = Number(tokens[i++]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid pattern coordinates.');
      if (command === 'M') result.push({ points: [], closed: false });
      if (!result.length) throw new Error('Invalid pattern path.');
      result[result.length - 1].points.push({ x, y });
    } else throw new Error('Unsupported pattern command.');
  }
  return result;
}
