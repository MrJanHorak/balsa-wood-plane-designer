import { WingConfig } from '@/types/glider';

/** Nominal targets for the formed wing, not a claim that the cut blank takes shape itself. */
export function getWingFormingTargets(wing: WingConfig): { tipRiseMm: number; rootCamberRiseMm: number } {
  return {
    tipRiseMm: Math.sin(wing.dihedralDeg * Math.PI / 180) * wing.spanMm / 2,
    rootCamberRiseMm: wing.rootChordMm * wing.camberPercent / 100,
  };
}
