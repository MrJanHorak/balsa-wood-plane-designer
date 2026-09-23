import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { camberArcLength, getWingBlank } from './wingBlank';
import { getCamberElevation, polygonArea } from './core';
import { generateWingFlatPattern } from './patterns2d';
import { analyzeGliderStability } from '@/physics/stability';
import { calculateGliderMassAndCG } from '@/physics/massBalance';
import { seedWingNodes } from './customWing';

describe('cambered sheet blanks', () => {
  it.each([0, 3.5, 8])('matches a finely sampled camber curve at %s percent', camber => {
    const chord = 60;
    let distance = 0;
    for (let i = 1; i <= 10000; i++) {
      distance += Math.hypot(chord / 10000,
        getCamberElevation(i / 10000, chord, camber) - getCamberElevation((i - 1) / 10000, chord, camber));
    }
    expect(camberArcLength(1, camber) * chord).toBeCloseTo(distance, 6);
    expect(camberArcLength(0, camber)).toBe(0);
  });
  it('preserves flat geometry and grows only the sheet chord for a cylindrical wing', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    Object.assign(g.wing, { planformType: 'rectangular', sweepDeg: 0, dihedralDeg: 0, camberPercent: 0 });
    const flat = getWingBlank(g.wing);
    expect(flat.rootLengthMm).toBe(g.wing.rootChordMm);
    const aeroArea = analyzeGliderStability(g).wingAreaMm2;
    const flatMass = calculateGliderMassAndCG(g).breakdown.wingGrams;
    g.wing.camberPercent = 8;
    const curved = getWingBlank(g.wing);
    expect(curved.approximate).toBe(false);
    expect(curved.rootLengthMm).toBeGreaterThan(flat.rootLengthMm);
    expect(polygonArea(curved.points)).toBeCloseTo(g.wing.spanMm * curved.rootLengthMm);
    expect(analyzeGliderStability(g).wingAreaMm2).toBe(aeroArea);
    expect(calculateGliderMassAndCG(g).breakdown.wingGrams).toBeGreaterThan(flatMass);
  });
  it.each(['tapered', 'elliptical', 'delta', 'custom'] as const)('retains span and extends the fold guide for %s wings', planformType => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.wing.customNodes = seedWingNodes(g.wing);
    g.wing.planformType = planformType;
    const blank = getWingBlank(g.wing);
    expect(blank.approximate).toBe(true);
    expect(Math.max(...blank.points.map(p => p.y)) - Math.min(...blank.points.map(p => p.y))).toBe(g.wing.spanMm);
    expect(generateWingFlatPattern(g).scoreLines[0]).toBe(`M 0 0 L ${blank.rootLengthMm} 0`);
    expect(blank.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
  it('retains the approximation warning for swept or folded constant-chord wings', () => {
    const wing = { ...DEFAULT_GLIDER.wing, planformType: 'rectangular' as const, dihedralDeg: 0, sweepDeg: 10 };
    expect(getWingBlank(wing).approximate).toBe(true);
    wing.sweepDeg = 0;
    wing.dihedralDeg = 6;
    expect(getWingBlank(wing).approximate).toBe(true);
  });
});
