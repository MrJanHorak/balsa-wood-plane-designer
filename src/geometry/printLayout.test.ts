import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { getPrintParts, getPartTiles, getRegistrationMarks, printPoint, readPatternPath, PRINT_OVERLAP } from './printLayout';
import { createPatternPdf } from './exportPdf';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

describe('full-size print templates', () => {
  it('repeats at least two registration marks on both sides of a narrow-part seam', () => {
    const item = getPrintParts(DEFAULT_GLIDER)[0];
    item.part.boundingBox = { minX: 0, minY: 0, maxX: 400, maxY: 2 };
    const layout = getPartTiles(item, 'a4');
    const shared = getRegistrationMarks(layout).filter(p => p.x >= layout.tiles[1].x && p.x <= layout.width);
    expect(shared.length).toBeGreaterThanOrEqual(2);
    for (const p of shared) expect(p.y).toBeLessThanOrEqual(layout.height);
  });
  it.each(['a4', 'letter'] as const)('covers every part without scaling or tile gaps on %s', paper => {
    for (const item of getPrintParts(DEFAULT_GLIDER)) {
      const layout = getPartTiles(item, paper);
      for (const segment of readPatternPath(item.part.outlinePath)) {
        for (const point of segment.points) {
          const p = printPoint(point, item);
          expect(layout.tiles.some(t => p.x >= t.x && p.x <= t.x + layout.width && p.y >= t.y && p.y <= t.y + layout.height)).toBe(true);
        }
      }
      if (layout.columns > 1) expect(layout.tiles[0].x + layout.width - layout.tiles[1].x).toBeCloseTo(PRINT_OVERLAP);
      const p = printPoint({ x: 10, y: 10 }, item), q = printPoint({ x: 40, y: 50 }, item);
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(50); // Rotation/reflection never rescales.
    }
  });
  it('tiles both axes and includes the extreme corners of large custom parts', () => {
    const item = getPrintParts(DEFAULT_GLIDER)[0];
    item.part.boundingBox = { minX: -40, minY: -30, maxX: 700, maxY: 420 };
    const layout = getPartTiles(item, 'letter');
    expect(layout.rows).toBeGreaterThan(1); expect(layout.columns).toBeGreaterThan(1);
    const last = layout.tiles.at(-1)!;
    expect(last.x + layout.width).toBeGreaterThanOrEqual(layout.partWidth);
    expect(last.y + layout.height).toBeGreaterThanOrEqual(layout.partHeight);
  });
  it('rejects excessively large output instead of allocating unbounded pages', () => {
    const item = getPrintParts(DEFAULT_GLIDER)[0];
    item.part.boundingBox.maxX = 1e9;
    expect(() => getPartTiles(item, 'a4')).toThrow(/100 pages/);
  });
  it('keeps holes separate and rejects unsupported path commands', () => {
    expect(readPatternPath('M 0 0 L 20 0 L 20 10 Z M 2 2 L 5 2 L 5 5 Z')).toHaveLength(2);
    expect(() => readPatternPath('M 0 0 Q 2 3 4 5')).toThrow();
    expect(() => readPatternPath('M 0 0 X Z')).toThrow();
  });
  it.each(['a4', 'letter'] as const)('creates a vector PDF on %s with instructions and all tiles', paper => {
    const doc = createPatternPdf(DEFAULT_GLIDER, paper);
    const tiles = getPrintParts(DEFAULT_GLIDER).reduce((n, p) => n + getPartTiles(p, paper).tiles.length, 0);
    expect(doc.getNumberOfPages()).toBeGreaterThan(tiles);
    expect(doc.output().startsWith('%PDF-')).toBe(true);
    // Opt-in output used for visual QA; normal tests do not write artifacts.
    const output = process.env.BALSA_PDF_QA_DIR;
    if (output) {
      const path = `${output}/trainer-${paper}.pdf`;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, new Uint8Array(doc.output('arraybuffer')));
    }
  });
});
