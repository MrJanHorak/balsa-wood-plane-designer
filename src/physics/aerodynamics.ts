import { GliderDesign } from '@/types/glider';

export interface WingAeroGeometry {
  areaMm2: number;
  areaDm2: number;
  aspectRatio: number;
  macMm: number;
  macYOffsetMm: number;
  acXMm: number;
  acYMm: number;
  cLAlphaPerRad: number;
}

/**
 * Computes planform, MAC, and Aerodynamic Center for a trapezoidal surface
 */
export function computeSurfaceAerodynamics(
  rootChordMm: number,
  tipChordMm: number,
  spanMm: number,
  sweepDeg: number,
  slotLeadingEdgeXMm: number,
  slotYMm: number
): WingAeroGeometry {
  const areaMm2 = ((rootChordMm + tipChordMm) / 2) * spanMm;
  const areaDm2 = areaMm2 / 10000;
  const aspectRatio = areaMm2 > 0 ? (spanMm * spanMm) / areaMm2 : 0;

  // Mean Aerodynamic Chord (MAC = 2/3 * (cr + ct - (cr*ct)/(cr+ct)))
  const chordSum = rootChordMm + tipChordMm;
  const macMm = chordSum > 0 ? (2 / 3) * (rootChordMm + tipChordMm - (rootChordMm * tipChordMm) / chordSum) : rootChordMm;

  // Spanwise distance of MAC from root
  const macYOffsetMm = chordSum > 0 ? (spanMm / 6) * ((rootChordMm + 2 * tipChordMm) / chordSum) : spanMm / 4;

  // X offset of leading edge at MAC due to sweep
  const sweepRad = (sweepDeg * Math.PI) / 180;
  const leadingEdgeOffsetAtMacMm = macYOffsetMm * Math.tan(sweepRad);

  // Aerodynamic Center is located at ~25% MAC
  const acXMm = slotLeadingEdgeXMm + leadingEdgeOffsetAtMacMm + 0.25 * macMm;
  const acYMm = slotYMm;

  // Lift curve slope per radian for finite wing: C_L_alpha = 2*pi / (1 + 2/AR)
  const cLAlphaPerRad = (2 * Math.PI) / (1 + 2 / Math.max(1, aspectRatio));

  return {
    areaMm2,
    areaDm2,
    aspectRatio,
    macMm,
    macYOffsetMm,
    acXMm,
    acYMm,
    cLAlphaPerRad,
  };
}

/**
 * Calculates aircraft Neutral Point using 2-surface wing + tail interaction
 */
export function calculateNeutralPoint(
  glider: GliderDesign,
  wingAero: WingAeroGeometry,
  tailAero: WingAeroGeometry
): {
  npXMm: number;
  tailArmMm: number;
  tailVolumeRatio: number;
  downwashGradient: number;
} {
  const tailArmMm = tailAero.acXMm - wingAero.acXMm;

  // Tail volume coefficient: V_h = (S_t * l_t) / (S_w * MAC)
  const tailVolumeRatio =
    wingAero.areaMm2 > 0 && wingAero.macMm > 0
      ? (tailAero.areaMm2 * tailArmMm) / (wingAero.areaMm2 * wingAero.macMm)
      : 0;

  // Downwash gradient: d_epsilon / d_alpha = 2 * C_La_w / (pi * AR_w)
  const downwashGradient = (2 * wingAero.cLAlphaPerRad) / (Math.PI * Math.max(1, wingAero.aspectRatio));

  // Tail efficiency factor eta_t (dynamic pressure loss behind wing)
  const etaTail = 0.92;

  // Neutral point calculation:
  // x_NP = x_AC,w + eta_t * (C_La,t / C_La,w) * (1 - de/da) * (S_t / S_w) * l_t
  const liftSlopeRatio = wingAero.cLAlphaPerRad > 0 ? tailAero.cLAlphaPerRad / wingAero.cLAlphaPerRad : 1;
  const areaRatio = wingAero.areaMm2 > 0 ? tailAero.areaMm2 / wingAero.areaMm2 : 0;
  const tailStabilizingShift = etaTail * liftSlopeRatio * Math.max(0, 1 - downwashGradient) * areaRatio * tailArmMm;

  const npXMm = wingAero.acXMm + tailStabilizingShift;

  return {
    npXMm,
    tailArmMm,
    tailVolumeRatio,
    downwashGradient,
  };
}
