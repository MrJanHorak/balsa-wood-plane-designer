import { WingConfig } from '@/types/glider';
import { seedWingNodes } from './customWing';
import { calculateCustomWingPlanformPoints, getWingStationAt } from './core';

/** Arc length along the existing piecewise-parabolic mean camber line, in units
 * of projected chord. Thickness is treated as a symmetric sheet about this line. */
export function camberArcLength(fraction: number, camberPercent: number): number {
  const s = Math.max(0, Math.min(1, fraction));
  const m = Math.max(0, camberPercent) / 100;
  if (m < 1e-10) return s;
  const p = 0.4;
  const primitive = (u: number) => (u * Math.hypot(1, u) + Math.asinh(u)) / 2;
  const integrate = (a: number, b: number, k: number) =>
    (primitive(k * (p - a)) - primitive(k * (p - b))) / k;
  return integrate(0, Math.min(s, p), 2 * m / (p * p))
    + (s > p ? integrate(p, s, 2 * m / ((1 - p) ** 2)) : 0);
}

/** Preserve each station's leading edge and span, extending its chord by the
 * mean-line arc length. For varying chord/sweep this is a forming allowance,
 * not an isometric unfolding of the complete surface. */
export function getWingBlank(wing: WingConfig) {
  const nodes = seedWingNodes(wing);
  const profile = nodes.map(n => ({ x: n.xMm, y: n.yMm }));
  const points = calculateCustomWingPlanformPoints(profile);
  const factor = camberArcLength(1, wing.camberPercent);
  const flatPoints = points.map(p => {
    const station = getWingStationAt('custom', wing.rootChordMm, wing.tipChordMm, wing.spanMm, 0, Math.abs(p.y) / (wing.spanMm / 2), profile);
    return { x: station.xLE + (p.x - station.xLE) * factor, y: p.y };
  });
  const constantSection = nodes.every(n => Math.abs(n.xMm) < 1e-6 || Math.abs(n.xMm - wing.rootChordMm) < 1e-6);
  const approximate = wing.camberPercent > 0 && (!constantSection || wing.dihedralDeg !== 0);
  return { points: flatPoints, factor, rootLengthMm: wing.rootChordMm * factor, approximate,
    description: wing.camberPercent <= 0 ? 'Flat-sheet outline; no camber allowance needed.'
      : approximate ? 'Chord arc-length allowance applied. This is an approximate forming blank; sweep, taper and center folds need a prototype fit check.'
        : 'Developed mean-line blank for an unswept constant-chord wing. Form to the projected chord; check springback and stock thickness.' };
}
