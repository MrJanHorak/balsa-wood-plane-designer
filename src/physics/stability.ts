import { GliderAeroReport, GliderDesign, StabilityStatus } from '@/types/glider';
import { calculateGliderMassAndCG } from './massBalance';
import { calculateNeutralPoint, computeSurfaceAerodynamics } from './aerodynamics';

export function analyzeGliderStability(glider: GliderDesign): GliderAeroReport {
  // 1. Calculate Mass & CG
  const { breakdown, cgXMm, cgYMm, cgZMm, unballastedMassGrams, unballastedCgXMm } =
    calculateGliderMassAndCG(glider);

  // 2. Calculate Wing Aerodynamics
  const wingAero = computeSurfaceAerodynamics(
    glider.wing.rootChordMm,
    glider.wing.tipChordMm,
    glider.wing.spanMm,
    glider.wing.sweepDeg,
    glider.fuselage.wingSlot.xPositionMm,
    glider.fuselage.wingSlot.yPositionMm
  );

  // 3. Calculate Tail Aerodynamics
  const tailAero = computeSurfaceAerodynamics(
    glider.horizontalStabilizer.rootChordMm,
    glider.horizontalStabilizer.tipChordMm,
    glider.horizontalStabilizer.spanMm,
    glider.horizontalStabilizer.sweepDeg,
    glider.fuselage.tailSlot.xPositionMm,
    glider.fuselage.tailSlot.yPositionMm
  );

  // 4. Calculate Neutral Point
  const { npXMm, tailArmMm, tailVolumeRatio } = calculateNeutralPoint(glider, wingAero, tailAero);

  // 5. Static Margin: SM = (NP - CG) / MAC * 100%
  const staticMarginMm = npXMm - cgXMm;
  const staticMarginPercent = wingAero.macMm > 0 ? (staticMarginMm / wingAero.macMm) * 100 : 0;

  // 6. Stability Status & Educational Coaching
  let stabilityStatus: StabilityStatus = 'optimal';
  let statusBadgeText = 'Optimal Glide Balance';
  let educationalFeedback =
    'Your glider has positive longitudinal static stability! When pitched up by a breeze, it will naturally trim back down into a smooth glide.';
  let pitchTendencyDescription = 'Self-righting, gentle floating glide with stable pitch restoration.';

  if (staticMarginPercent < -2.0) {
    stabilityStatus = 'critically_tail_heavy';
    statusBadgeText = 'Severely Tail-Heavy (Stall Danger)';
    educationalFeedback =
      'Center of Gravity is behind the Neutral Point! The glider will violently pitch upward on launch, stall, flip, and crash.';
    pitchTendencyDescription = 'Immediate pitch-up flip and flat spin.';
  } else if (staticMarginPercent < 4.0) {
    stabilityStatus = 'tail_heavy';
    statusBadgeText = 'Marginally Stable / Tail-Heavy';
    educationalFeedback =
      'The glider is slightly tail-heavy. It will tend to porpoise (wave up and down) and stall easily unless tossed with care.';
    pitchTendencyDescription = 'Undamped pitch oscillation (porpoising) and low-speed stall.';
  } else if (staticMarginPercent > 25.0) {
    stabilityStatus = 'extremely_nose_heavy';
    statusBadgeText = 'Severely Nose-Heavy (Lawn Dart)';
    educationalFeedback =
      'Far too much nose weight! The nose will pull straight down into the floor immediately after leaving your hand.';
    pitchTendencyDescription = 'Steep nosedive straight into the ground.';
  } else if (staticMarginPercent > 16.0) {
    stabilityStatus = 'nose_heavy';
    statusBadgeText = 'Slightly Nose-Heavy';
    educationalFeedback =
      'A bit too much nose weight. The glider will fly fast and penetrate wind well, but its glide angle is steep and sink rate is high.';
    pitchTendencyDescription = 'Fast, steep descent with high sink rate.';
  }

  // 7. Calculate Recommended Nose Ballast for Target Static Margin (10% of MAC)
  // Target: x_CG_target = npXMm - 0.10 * MAC
  const targetStaticMargin = 0.10;
  const targetCgXMm = npXMm - targetStaticMargin * wingAero.macMm;
  const ballastX = glider.fuselage.ballastPositionXMm;

  let recommendedBallastGrams = 0;
  if (targetCgXMm > ballastX) {
    // m_b = m_airframe * (x_cg_unballasted - x_cg_target) / (x_cg_target - x_b)
    const neededGrams =
      (unballastedMassGrams * (unballastedCgXMm - targetCgXMm)) / (targetCgXMm - ballastX);
    recommendedBallastGrams = Number(Math.max(0, neededGrams).toFixed(2));
  }

  // 8. Flight Envelope Estimates
  // Wing loading = grams / dm²
  const wingLoadingGDm2 = wingAero.areaDm2 > 0 ? breakdown.totalGrams / wingAero.areaDm2 : 0;
  // 1 g/dm² = 0.3277 oz/ft²
  const wingLoadingOzSqFt = wingLoadingGDm2 * 0.3277;

  // Approximate stall speed: V_s = sqrt( 2 * W / (rho_air * S * C_L_max) )
  // rho_air = 1.225 kg/m³, C_L_max ≈ 0.9 for flat/cambered thin sheet balsa
  const massKg = breakdown.totalGrams * 1e-3;
  const areaM2 = wingAero.areaMm2 * 1e-6;
  const cLMax = 0.85 + (glider.wing.camberPercent / 100) * 2.0;
  const estimatedStallSpeedMs =
    areaM2 > 0 ? Math.sqrt((2 * massKg * 9.81) / (1.225 * areaM2 * cLMax)) : 0;

  // Glide ratio L/D estimate
  // Thin flat plate balsa with aspect ratio AR typically achieves L/D of 6 - 14
  const estimatedGlideRatio = Math.min(16, Math.max(4, 4.5 + wingAero.aspectRatio * 0.8 + glider.wing.camberPercent * 0.5));

  return {
    massBreakdown: breakdown,
    cgXMm,
    cgYMm,
    cgZMm,
    wingAreaDm2: Number(wingAero.areaDm2.toFixed(2)),
    wingAreaMm2: Number(wingAero.areaMm2.toFixed(1)),
    aspectRatio: Number(wingAero.aspectRatio.toFixed(2)),
    meanAerodynamicChordMm: Number(wingAero.macMm.toFixed(1)),
    wingAcXMm: Number(wingAero.acXMm.toFixed(1)),
    wingAcYMm: Number(wingAero.acYMm.toFixed(1)),
    tailAreaDm2: Number(tailAero.areaDm2.toFixed(2)),
    tailAreaMm2: Number(tailAero.areaMm2.toFixed(1)),
    tailAcXMm: Number(tailAero.acXMm.toFixed(1)),
    tailArmMm: Number(tailArmMm.toFixed(1)),
    tailVolumeRatio: Number(tailVolumeRatio.toFixed(3)),
    npXMm: Number(npXMm.toFixed(1)),
    staticMarginMm: Number(staticMarginMm.toFixed(1)),
    staticMarginPercent: Number(staticMarginPercent.toFixed(1)),
    stabilityStatus,
    statusBadgeText,
    educationalFeedback,
    pitchTendencyDescription,
    recommendedBallastGrams,
    wingLoadingGDm2: Number(wingLoadingGDm2.toFixed(2)),
    wingLoadingOzSqFt: Number(wingLoadingOzSqFt.toFixed(2)),
    estimatedStallSpeedMs: Number(estimatedStallSpeedMs.toFixed(2)),
    estimatedGlideRatio: Number(estimatedGlideRatio.toFixed(1)),
  };
}
