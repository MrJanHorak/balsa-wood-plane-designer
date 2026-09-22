import { FinConfig, WingConfig } from '@/types/glider';
import { seedWingNodes, validateCustomWing } from './customWing';

export function finAsWing(fin: FinConfig): WingConfig {
  return { ...fin, spanMm: fin.heightMm * 2, planformType: fin.profileType === 'custom' ? 'custom' : 'tapered',
    camberPercent: 0, dihedralDeg: 0, slotTabWidthMm: 0, hasLeadingEdgeTaper: false };
}

export function wingAsFin(wing: WingConfig, original: FinConfig): FinConfig {
  // Reset shapes become editable single-panel profiles, except the standard taper.
  return { ...original, heightMm: wing.spanMm / 2, rootChordMm: wing.rootChordMm,
    tipChordMm: wing.tipChordMm, sweepDeg: wing.sweepDeg,
    profileType: wing.planformType === 'tapered' ? 'standard' : 'custom',
    customNodes: wing.planformType === 'tapered' ? undefined : seedWingNodes(wing) };
}

export function getFinProfilePoints(fin: FinConfig) {
  return seedWingNodes(finAsWing(fin)).map(n => ({ x: n.xMm, y: n.yMm }));
}

export function validateCustomFin(fin: FinConfig) {
  return validateCustomWing(finAsWing(fin))?.replace(/wing/gi, 'fin').replace(/half the wingspan/g, 'the fin height') ?? null;
}
