import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { getWingFormingTargets } from './wingForming';

describe('wing forming targets', () => {
  it('turns the saved 9° / 285 mm half-wing target into a measurable tip rise', () => {
    const wing = { ...DEFAULT_GLIDER.wing, spanMm: 285, rootChordMm: 60, dihedralDeg: 9, camberPercent: 8 };
    const targets = getWingFormingTargets(wing);
    expect(targets.tipRiseMm).toBeCloseTo(22.29, 1);
    expect(targets.rootCamberRiseMm).toBeCloseTo(4.8, 5);
  });

  it('does not request shaping for a flat wing', () => {
    expect(getWingFormingTargets({ ...DEFAULT_GLIDER.wing, dihedralDeg: 0, camberPercent: 0 })).toEqual({ tipRiseMm: 0, rootCamberRiseMm: 0 });
  });
});
