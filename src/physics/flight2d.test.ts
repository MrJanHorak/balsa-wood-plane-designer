import { describe, expect, it } from 'vitest';
import { simulateFlight2D, Flight2DInput } from './flight2d';
import { DEFAULT_AERO_ASSUMPTIONS } from './performance';

const build: Flight2DInput = {
  massGrams: 9.1, wingAreaMm2: 15000, aspectRatio: 5.5, camberPercent: 0,
  releaseHeightM: 1.77, launchSpeedMs: 4.5, launchAngleDeg: 0, angleOfAttackDeg: 8,
};

describe('bounded 2D flight exploration', () => {
  it('starts at the release and reaches the ground with finite samples', () => {
    const run = simulateFlight2D(build);
    expect(run.points[0]).toMatchObject({ xM: 0, heightM: 1.77, speedMs: 4.5 });
    expect(run.endedAtGround).toBe(true);
    expect(run.points.at(-1)?.heightM).toBe(0);
    expect(run.points.every(p => Object.values(p).every(Number.isFinite))).toBe(true);
    expect(run.rangeM).toBeGreaterThan(0);
  });

  it('responds to launch height and assembled mass', () => {
    const nominal = simulateFlight2D(build);
    expect(simulateFlight2D({ ...build, releaseHeightM: 2.5 }).rangeM).toBeGreaterThan(nominal.rangeM);
    expect(simulateFlight2D({ ...build, massGrams: 12 }).minimumSupportSpeedMs).toBeGreaterThan(nominal.minimumSupportSpeedMs);
  });

  it('uses the same adjustable drag assumptions as the aerodynamic readout', () => {
    const nominal = simulateFlight2D(build);
    const highDrag = simulateFlight2D({ ...build, assumptions: {
      ...DEFAULT_AERO_ASSUMPTIONS, profileDragCoefficient: 0.2,
    } });
    expect(highDrag.rangeM).toBeLessThan(nominal.rangeM);
  });

  it('rejects nonphysical or unsupported inputs', () => {
    expect(() => simulateFlight2D({ ...build, massGrams: 0 })).toThrow();
    expect(() => simulateFlight2D({ ...build, launchAngleDeg: 90 })).toThrow();
    expect(() => simulateFlight2D({ ...build, wingAreaMm2: Infinity })).toThrow();
  });
});
