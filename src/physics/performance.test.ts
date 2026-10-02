import { describe, expect, it } from 'vitest';
import { GLIDER_PRESETS } from '@/constants/presets';
import { analyzeGliderStability } from './stability';
import {
  calculateDesignPerformance, DEFAULT_AERO_ASSUMPTIONS,
  estimateWingCoefficients, speedForLiftCoefficient, zeroLiftAngleRad,
} from './performance';

describe('design-based aerodynamic exploration', () => {
  it('uses the selected design geometry and material mass for every preset', () => {
    for (const glider of Object.values(GLIDER_PRESETS)) {
      const report = analyzeGliderStability(glider);
      const analysis = calculateDesignPerformance({
        massGrams: report.massBreakdown.totalGrams,
        wingAreaMm2: report.wingAreaMm2,
        aspectRatio: report.aspectRatio,
        meanAerodynamicChordMm: report.meanAerodynamicChordMm,
        camberPercent: glider.wing.camberPercent,
        angleOfAttackDeg: 3,
        speedMs: 4.5,
      });
      expect(analysis.wingLoadingGDm2).toBeCloseTo(report.massBreakdown.totalGrams / report.wingAreaDm2, 1);
      expect(analysis.reynoldsNumber).toBeGreaterThan(0);
      expect(analysis.requiredLiftCoefficient).toBeGreaterThan(0);
    }
  });

  it('carries a balsa density change through mass, loading and support speed', () => {
    const base = GLIDER_PRESETS.TRAINER;
    const denser = structuredClone(base);
    denser.material.densityKgM3 *= 1.5;
    const lightReport = analyzeGliderStability(base);
    const heavyReport = analyzeGliderStability(denser);
    expect(heavyReport.massBreakdown.totalGrams).toBeGreaterThan(lightReport.massBreakdown.totalGrams);
    expect(speedForLiftCoefficient(heavyReport.massBreakdown.totalGrams, heavyReport.wingAreaMm2, 0.9))
      .toBeGreaterThan(speedForLiftCoefficient(lightReport.massBreakdown.totalGrams, lightReport.wingAreaMm2, 0.9));
  });

  it('makes loading and required lift respond to mass, area, and speed', () => {
    const base = calculateDesignPerformance({ massGrams: 9, wingAreaMm2: 12000,
      aspectRatio: 6, meanAerodynamicChordMm: 45, camberPercent: 0, angleOfAttackDeg: 3, speedMs: 4 });
    const heavy = calculateDesignPerformance({ massGrams: 12, wingAreaMm2: 12000,
      aspectRatio: 6, meanAerodynamicChordMm: 45, camberPercent: 0, angleOfAttackDeg: 3, speedMs: 4 });
    const fast = calculateDesignPerformance({ massGrams: 9, wingAreaMm2: 12000,
      aspectRatio: 6, meanAerodynamicChordMm: 45, camberPercent: 0, angleOfAttackDeg: 3, speedMs: 8 });
    expect(heavy.wingLoadingGDm2 / base.wingLoadingGDm2).toBeCloseTo(12 / 9);
    expect(heavy.supportSpeedMs / base.supportSpeedMs).toBeCloseTo(Math.sqrt(12 / 9));
    expect(fast.requiredLiftCoefficient).toBeCloseTo(base.requiredLiftCoefficient / 4);
    expect(fast.reynoldsNumber).toBeCloseTo(base.reynoldsNumber * 2);
  });

  it('uses the design camber line and explicit drag assumptions', () => {
    expect(zeroLiftAngleRad(0)).toBe(0);
    expect(zeroLiftAngleRad(4)).toBeLessThan(0);
    expect(zeroLiftAngleRad(2) * 180 / Math.PI).toBeCloseTo(-2.08, 1);
    const flat = estimateWingCoefficients(6, 0, 2);
    const formed = estimateWingCoefficients(6, 4, 2);
    expect(formed.liftCoefficient).toBeGreaterThan(flat.liftCoefficient);
    const draggier = estimateWingCoefficients(6, 0, 2,
      { ...DEFAULT_AERO_ASSUMPTIONS, profileDragCoefficient: 0.15 });
    expect(draggier.dragCoefficient - flat.dragCoefficient).toBeCloseTo(0.06);
  });

  it('rejects impossible inputs instead of displaying misleading results', () => {
    expect(() => speedForLiftCoefficient(0, 12000, 0.8)).toThrow();
    expect(() => estimateWingCoefficients(6, 0, 2,
      { ...DEFAULT_AERO_ASSUMPTIONS, spanEfficiency: 0 })).toThrow();
  });
});
