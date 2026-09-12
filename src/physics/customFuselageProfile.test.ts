import { describe, it, expect } from 'vitest';
import { GLIDER_PRESETS } from '@/constants/presets';
import { GliderDesign, FuselageNode } from '@/types/glider';
import { getFuselageProfilePoints, calculateGliderMassAndCG } from './massBalance';
import { analyzeGliderStability } from './stability';
import { validateGliderDesign } from '@/geometry/validation';
import { polygonArea } from '@/geometry/core';

/**
 * These tests cover the data-flow contract the new interactive
 * FuselageProfileEditor (Phase 8) relies on: once a user drags points into
 * a `customNodes` array, every downstream consumer — physics, validation,
 * the 3D renderer, the 2D pattern exporter — must handle it exactly the
 * way it handles a parametric profile, since they all read through
 * `getFuselageProfilePoints`. The editor component itself isn't tested
 * here (this project doesn't have UI/component tests yet — see
 * docs/ARCHITECTURE_REVIEW.md §8) — this locks down the contract it depends on.
 */

function withCustomProfile(base: GliderDesign, nodes: FuselageNode[]): GliderDesign {
  return {
    ...base,
    fuselage: {
      ...base.fuselage,
      profileStyle: 'custom',
      customNodes: nodes,
    },
  };
}

const simpleCustomShape: FuselageNode[] = [
  { id: 'a', label: 'Nose', xMm: 0, yMm: 10 },
  { id: 'b', label: 'Top', xMm: 100, yMm: 45 },
  { id: 'c', label: 'Tail Top', xMm: 220, yMm: 15 },
  { id: 'd', label: 'Tail Bottom', xMm: 220, yMm: 0 },
  { id: 'e', label: 'Belly', xMm: 0, yMm: 0 },
];

describe('custom fuselage profile: geometry', () => {
  it('uses the custom nodes verbatim instead of the parametric template', () => {
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, simpleCustomShape);
    const points = getFuselageProfilePoints(design);
    expect(points).toHaveLength(simpleCustomShape.length);
    expect(points[0]).toEqual({ x: 0, y: 10 });
  });

  it('produces a non-degenerate (positive-area) polygon', () => {
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, simpleCustomShape);
    const points = getFuselageProfilePoints(design);
    expect(polygonArea(points)).toBeGreaterThan(0);
  });

  it('falls back to the parametric profile when fewer than 3 custom nodes are given', () => {
    const tooFew: FuselageNode[] = [
      { id: 'a', label: 'A', xMm: 0, yMm: 0 },
      { id: 'b', label: 'B', xMm: 10, yMm: 10 },
    ];
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, tooFew);
    const points = getFuselageProfilePoints(design);
    // Should fall back to the trainer's parametric profile (many more points), not the 2 given.
    expect(points.length).toBeGreaterThan(2);
    expect(points).not.toEqual([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
  });
});

describe('custom fuselage profile: physics', () => {
  it('computes finite, positive mass and a CG within the shape\'s X range', () => {
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, simpleCustomShape);
    const { breakdown, cgXMm } = calculateGliderMassAndCG(design);
    expect(Number.isFinite(breakdown.totalGrams)).toBe(true);
    expect(breakdown.totalGrams).toBeGreaterThan(0);
    expect(cgXMm).toBeGreaterThanOrEqual(0);
    expect(cgXMm).toBeLessThanOrEqual(220);
  });

  it('produces a finite static margin (does not blow up on an unconventional shape)', () => {
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, simpleCustomShape);
    const report = analyzeGliderStability(design);
    expect(Number.isFinite(report.staticMarginPercent)).toBe(true);
  });
});

describe('custom fuselage profile: validation', () => {
  it('runs without throwing and returns a well-formed report', () => {
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, simpleCustomShape);
    const report = validateGliderDesign(design);
    expect(report.issues).toEqual([...report.errors, ...report.warnings, ...report.infos]);
  });

  it('flags a wing slot that clearly protrudes outside a deliberately tiny custom body', () => {
    const tinyBody: FuselageNode[] = [
      { id: 'a', label: 'A', xMm: 0, yMm: 5 },
      { id: 'b', label: 'B', xMm: 20, yMm: 5 },
      { id: 'c', label: 'C', xMm: 20, yMm: 0 },
      { id: 'd', label: 'D', xMm: 0, yMm: 0 },
    ];
    const design = withCustomProfile(GLIDER_PRESETS.TRAINER, tinyBody);
    const report = validateGliderDesign(design);
    // The trainer's wing slot (well beyond x=20) cannot possibly fit inside
    // this 20mm-long custom body — validation should catch that as an error.
    expect(report.isValid).toBe(false);
  });
});
