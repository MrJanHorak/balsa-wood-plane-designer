import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER, GLIDER_PRESETS } from '@/constants/presets';
import { calculateSheetProperties, getFuselageCuts, subtractSheetCutouts } from '@/geometry/sheetCutouts';
import { calculateGliderMassAndCG } from './massBalance';
import { analyzeGliderStability } from './stability';

const rectangle = (x: number, y: number, w: number, h: number) =>
  [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

describe('remaining sheet mass properties', () => {
  it.each(['through_slot', 'top_saddle', 'bottom_saddle', 'parasol_pylon'] as const)('cuts the wing only for through-slot mounting (%s)', mountType => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.mountType = mountType;
    const cuts = getFuselageCuts(g);
    expect(cuts).toHaveLength(mountType === 'through_slot' ? 2 : 1);
  });
  it.each([false, true])('subtracts hole moments independently of winding (reversed=%s)', reversed => {
    const outline = rectangle(0, 0, 100, 40), hole = rectangle(70, 20, 20, 10);
    const result = calculateSheetProperties([{ outline: reversed ? outline.reverse() : outline, holes: [hole] }]);
    expect(result.areaMm2).toBe(3800);
    expect(result.centroid.x).toBeCloseTo((4000 * 50 - 200 * 80) / 3800);
    expect(result.centroid.y).toBeCloseTo((4000 * 20 - 200 * 25) / 3800);
  });
  it('counts overlapping and outside cuts only once', () => {
    const r = calculateSheetProperties(subtractSheetCutouts(rectangle(0, 0, 100, 40),
      [rectangle(80, 10, 40, 10), rectangle(90, 10, 40, 10)]));
    expect(r.areaMm2).toBe(3800);
    expect(r.centroid.x).toBeCloseTo((4000 * 50 - 200 * 90) / 3800);
  });
  it('includes disconnected pieces and handles a completely removed sheet', () => {
    const regions = subtractSheetCutouts(rectangle(0, 0, 100, 40), [rectangle(30, -10, 10, 60)]);
    expect(regions).toHaveLength(2);
    expect(calculateSheetProperties(regions).centroid.x).toBeCloseTo((4000 * 50 - 400 * 35) / 3600);
    expect(calculateSheetProperties([])).toEqual({ areaMm2: 0, centroid: { x: 0, y: 0 } });
  });
  it('removes an enclosed slot mass and its moment from the complete glider', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.autoReinforceSpine = false;
    g.fuselage.mountType = 'top_saddle';
    g.fuselage.noseBallastGrams = 0;
    g.fuselage.tailSlot = { xPositionMm: 30, yPositionMm: 10, lengthMm: 10, thicknessMm: 2, angleDeg: 0 };
    // Keep the tail position fixed: switch only its cut height from outside to inside.
    const outside = structuredClone(g);
    outside.fuselage.tailSlot.yPositionMm = -100;
    const baseline = calculateGliderMassAndCG(outside);
    const after = calculateGliderMassAndCG(g);
    const removed = 20 * g.fuselage.thicknessMm * g.material.densityKgM3 / 1e6;
    expect(baseline.breakdown.fuselageGrams - after.breakdown.fuselageGrams).toBeCloseTo(removed, 2);
    expect(after.unballastedCgXMm).toBeCloseTo(
      (baseline.unballastedMassGrams * baseline.unballastedCgXMm - removed * 35) / (baseline.unballastedMassGrams - removed), 1);
  });
  it.each(Object.values(GLIDER_PRESETS))('keeps $name ballast advice consistent with the target margin', preset => {
    const g = structuredClone(preset);
    const initial = analyzeGliderStability(g);
    g.fuselage.noseBallastGrams = initial.recommendedBallastGrams;
    const balanced = analyzeGliderStability(g);
    expect(Number.isFinite(balanced.staticMarginPercent)).toBe(true);
    if (initial.recommendedBallastGrams > 0) expect(balanced.staticMarginPercent).toBeCloseTo(10, 0);
  });
});
