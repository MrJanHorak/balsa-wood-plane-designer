import { GliderDesign, GliderMassBreakdown, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import {
  Point2D,
  polygonArea,
  polygonCentroid,
  calculateWingPlanformPoints,
  calculateTrapezoidPlanformPoints,
} from '@/geometry/core';

/**
 * Approximate points for a stylized profile fuselage.
 * Returns normalized vertices (X: 0->length, Y: 0->height)
 */
export function getFuselageProfilePoints(glider: GliderDesign): Point2D[] {
  const { fuselage, verticalStabilizer: fin } = glider;

  // 1. Custom Draggable Nodes Mode
  if (fuselage.profileStyle === 'custom' && fuselage.customNodes && fuselage.customNodes.length >= 3) {
    return fuselage.customNodes.map((n) => ({ x: n.xMm, y: n.yMm }));
  }

  const { lengthMm, maxHeightMm, noseLengthMm, noseHeightMm, tailBoomHeightMm, profileStyle, wingSlot, mountType, autoReinforceSpine } = fuselage;

  // Calculate required spine height so the wing is never left floating above the fuselage.
  const slotTopY = wingSlot.yPositionMm + wingSlot.thicknessMm / 2 + 2;
  let minRequiredSpineY = maxHeightMm;
  if (mountType === 'through_slot' && autoReinforceSpine) {
    // Enclosed slot needs a solid balsa bridge above the wing
    minRequiredSpineY = slotTopY + 6.0;
  } else if (mountType === 'top_saddle') {
    // Open saddle: the spine must rise to meet the underside of the wing exactly
    minRequiredSpineY = Math.max(maxHeightMm, wingSlot.yPositionMm - wingSlot.thicknessMm / 2);
  }
  // parasol_pylon intentionally leaves the spine at its normal height — the pylon
  // mesh (built separately) bridges the gap up to the elevated wing.

  const effectiveMaxHeight = Math.max(maxHeightMm, minRequiredSpineY);
  const nosePeakX = noseLengthMm;
  const wingX = wingSlot.xPositionMm;
  const wingLen = wingSlot.lengthMm;

  let points: Point2D[];

  if (profileStyle === 'sport_jet') {
    points = [
      { x: 0, y: noseHeightMm * 0.4 },
      { x: nosePeakX * 0.4, y: effectiveMaxHeight * 0.8 },
      { x: nosePeakX, y: effectiveMaxHeight },
      { x: wingX + wingLen * 0.5, y: Math.max(effectiveMaxHeight, slotTopY + 5) },
      { x: lengthMm * 0.6, y: effectiveMaxHeight * 0.7 },
      { x: lengthMm * 0.85, y: tailBoomHeightMm * 1.5 },
      { x: lengthMm, y: tailBoomHeightMm },
      { x: lengthMm, y: 0 },
      { x: lengthMm * 0.5, y: 0 },
      { x: nosePeakX * 0.5, y: 0 },
      { x: 0, y: 0 },
    ];
  } else if (profileStyle === 'sky_streak') {
    points = [
      { x: 0, y: noseHeightMm * 0.5 },
      { x: nosePeakX * 0.5, y: effectiveMaxHeight * 0.9 },
      { x: nosePeakX, y: effectiveMaxHeight },
      { x: wingX + wingLen * 0.5, y: Math.max(effectiveMaxHeight, slotTopY + 5) },
      { x: Math.min(lengthMm * 0.6, wingX + wingLen + 30), y: effectiveMaxHeight * 0.6 },
      { x: lengthMm * 0.75, y: tailBoomHeightMm * 1.2 },
      { x: lengthMm, y: tailBoomHeightMm },
      { x: lengthMm, y: 0 },
      { x: 0, y: 0 },
    ];
  } else {
    // Default 'trainer' / 'curved_classic' with intelligent adaptive wing saddle/pylon
    const pylonPeakY = effectiveMaxHeight;
    points = [
      { x: 0, y: noseHeightMm * 0.5 },
      { x: nosePeakX * 0.3, y: noseHeightMm * 0.9 },
      { x: nosePeakX * 0.7, y: pylonPeakY * 0.95 },
      { x: Math.min(nosePeakX, wingX - 5), y: pylonPeakY },
      { x: wingX + wingLen * 0.5, y: pylonPeakY },
      { x: wingX + wingLen + 15, y: Math.max(wingSlot.yPositionMm + 4, pylonPeakY * 0.8) },
      { x: lengthMm * 0.65, y: tailBoomHeightMm * 1.6 },
      { x: lengthMm * 0.9, y: tailBoomHeightMm * 1.1 },
      { x: lengthMm, y: tailBoomHeightMm },
      { x: lengthMm, y: 0 },
      { x: lengthMm * 0.6, y: 0 },
      { x: 0, y: 0 },
    ];
  }

  // Bottom-saddle mount: when the wing sits below the belly line, dip the
  // fuselage's flat underside down to meet it (mirror of the top-saddle
  // spine reinforcement above) so the wing is never left floating.
  if (mountType === 'bottom_saddle') {
    const wingBottomY = wingSlot.yPositionMm - wingSlot.thicknessMm / 2;
    if (wingBottomY < -0.5) {
      points = insertBellyDip(points, wingX, wingLen, wingBottomY - 2);
    }
  }

  // Integral vertical fin: when the fin is "cut from the same sheet" as the
  // fuselage rather than built as a separate slotted piece, it must actually
  // appear in the fuselage's own silhouette — otherwise it's invisible in
  // the 3D view AND its mass silently vanishes from physics (neither the
  // renderer nor calculateGliderMassAndCG ever draws/weighs it elsewhere).
  if (fin.isIntegralWithFuselage && fin.heightMm > 0) {
    points = insertIntegralFinBump(points, fuselage.tailSlot.xPositionMm, fin);
  }

  return points;
}

/**
 * Inserts two new vertices into the flat belly segment of a fuselage profile
 * so it dips down to meet a wing mounted below the baseline. Works generically
 * across any profile style by locating the (nearly) flat, y≈0 segment whose
 * X range contains the wing's slot — rather than hardcoding indices per style.
 */
function insertBellyDip(points: Point2D[], wingX: number, wingLen: number, dipY: number): Point2D[] {
  const result = [...points];
  for (let i = 0; i < result.length; i++) {
    const p1 = result[i];
    const p2 = result[(i + 1) % result.length];
    if (Math.abs(p1.y) < 0.5 && Math.abs(p2.y) < 0.5) {
      const xMin = Math.min(p1.x, p2.x);
      const xMax = Math.max(p1.x, p2.x);
      if (wingX >= xMin - 1 && wingX + wingLen <= xMax + 1) {
        const goingRightToLeft = p1.x > p2.x;
        const leftDip = { x: wingX, y: dipY };
        const rightDip = { x: wingX + wingLen, y: dipY };
        const insertion = goingRightToLeft ? [rightDip, leftDip] : [leftDip, rightDip];
        result.splice(i + 1, 0, ...insertion);
        return result;
      }
    }
  }
  return result;
}

/**
 * Inserts a fin-shaped bump into the fuselage's top-edge silhouette near the
 * tail, at the point where the fuselage top meets its highest point after
 * the tail boom taper. Locates the topmost point at or after the tail slot's
 * X position generically, so it works across all profile styles.
 */
function insertIntegralFinBump(
  points: Point2D[],
  tailSlotX: number,
  fin: GliderDesign['verticalStabilizer']
): Point2D[] {
  // Find the vertex closest to (but not past) the tail slot along the top edge
  let insertAfterIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.y > 0.5 && Math.abs(p.x - tailSlotX) < bestDist) {
      bestDist = Math.abs(p.x - tailSlotX);
      insertAfterIdx = i;
    }
  }
  if (insertAfterIdx === -1) return points;

  const base = points[insertAfterIdx];
  const sweepRad = (fin.sweepDeg * Math.PI) / 180;
  const tipOffset = fin.heightMm * Math.tan(sweepRad);

  const bumpPoints: Point2D[] = [
    { x: base.x, y: base.y },
    { x: base.x + tipOffset, y: base.y + fin.heightMm },
    { x: base.x + tipOffset + fin.tipChordMm, y: base.y + fin.heightMm },
    { x: base.x + fin.rootChordMm, y: base.y },
  ];

  const result = [...points];
  result.splice(insertAfterIdx, 1, ...bumpPoints);
  return result;
}

/**
 * Calculates masses and mass centers for all glider components
 */
export function calculateGliderMassAndCG(glider: GliderDesign): {
  breakdown: GliderMassBreakdown;
  cgXMm: number;
  cgYMm: number;
  cgZMm: number;
  unballastedMassGrams: number;
  unballastedCgXMm: number;
} {
  const balsaDensityKgM3 = glider.material.densityKgM3;
  // Convert density: 1 kg/m³ = 1e-6 g/mm³
  const densityGPerMm3 = balsaDensityKgM3 * 1e-6;

  // 1. Fuselage
  const fusePoly = getFuselageProfilePoints(glider);
  const fuseAreaMm2 = polygonArea(fusePoly);
  const { x: fuseCx, y: fuseCy } = polygonCentroid(fusePoly);
  const fuseVolumeMm3 = fuseAreaMm2 * glider.fuselage.thicknessMm;
  const fuselageGrams = fuseVolumeMm3 * densityGPerMm3;

  // 2. Wing — canonical planform points (correct for the actual shape,
  // including elliptical wings, instead of always assuming a trapezoid)
  const effectiveTipChordMm = getEffectiveTipChordMm(glider.wing);
  const wingPlanformKind = getWingPlanformKind(glider.wing.planformType);
  const wingPoints = calculateWingPlanformPoints(
    wingPlanformKind,
    glider.wing.rootChordMm,
    effectiveTipChordMm,
    glider.wing.spanMm,
    glider.wing.sweepDeg
  );
  const wingAreaMm2 = polygonArea(wingPoints);
  const wingLocalCentroid = polygonCentroid(wingPoints);
  const wingVolumeMm3 = wingAreaMm2 * glider.wing.thicknessMm;
  const wingGrams = wingVolumeMm3 * densityGPerMm3;

  // Wing planform points are root-centered at local (0,0); translate the
  // local centroid to the fuselage's wing slot location.
  const wingCx = glider.fuselage.wingSlot.xPositionMm + wingLocalCentroid.x;
  const wingCy = glider.fuselage.wingSlot.yPositionMm;

  // 3. Tail (Horizontal Stabilizer) — always a straight taper
  const tailPoints = calculateTrapezoidPlanformPoints(
    glider.horizontalStabilizer.rootChordMm,
    glider.horizontalStabilizer.tipChordMm,
    glider.horizontalStabilizer.spanMm,
    glider.horizontalStabilizer.sweepDeg
  );
  const tailAreaMm2 = polygonArea(tailPoints);
  const tailLocalCentroid = polygonCentroid(tailPoints);
  const tailVolumeMm3 = tailAreaMm2 * glider.horizontalStabilizer.thicknessMm;
  const tailGrams = tailVolumeMm3 * densityGPerMm3;

  const tailCx = glider.fuselage.tailSlot.xPositionMm + tailLocalCentroid.x;
  const tailCy = glider.fuselage.tailSlot.yPositionMm;

  // 4. Fin (Vertical Stabilizer). When integral with the fuselage, its shape
  // is folded into the fuselage's own silhouette (see insertIntegralFinBump
  // in getFuselageProfilePoints above) and its mass/area is already counted
  // in fuselageGrams above — attributing it again here would double-count it.
  let finGrams = 0;
  let finCx = tailCx;
  let finCy = tailCy + glider.verticalStabilizer.heightMm * 0.4;

  if (!glider.verticalStabilizer.isIntegralWithFuselage) {
    const finPoints = calculateTrapezoidPlanformPoints(
      glider.verticalStabilizer.rootChordMm,
      glider.verticalStabilizer.tipChordMm,
      glider.verticalStabilizer.heightMm * 2, // trapezoid helper is span-symmetric; fin is one half
      glider.verticalStabilizer.sweepDeg
    );
    // Fin is a one-sided (non-symmetric) surface — the y>=0 half of the
    // symmetric helper's output is already the complete fin polygon
    // (root chord at y=0, tip chord at y=heightMm), not half of it.
    const finHalfPoints = finPoints.filter((p) => p.y >= 0);
    const finAreaMm2 = polygonArea(finHalfPoints);
    const finLocalCentroid = polygonCentroid(finHalfPoints);
    finGrams = finAreaMm2 * glider.verticalStabilizer.thicknessMm * densityGPerMm3;
    finCx = glider.fuselage.tailSlot.xPositionMm + finLocalCentroid.x;
    finCy = glider.fuselage.tailSlot.yPositionMm + finLocalCentroid.y;
  }

  // 5. Unballasted Airframe totals
  const unballastedMassGrams = fuselageGrams + wingGrams + tailGrams + finGrams;
  const unballastedMomentX =
    fuselageGrams * fuseCx +
    wingGrams * wingCx +
    tailGrams * tailCx +
    finGrams * finCx;
  const unballastedMomentY =
    fuselageGrams * fuseCy +
    wingGrams * wingCy +
    tailGrams * tailCy +
    finGrams * finCy;

  const unballastedCgXMm = unballastedMassGrams > 0 ? unballastedMomentX / unballastedMassGrams : 0;
  const unballastedCgYMm = unballastedMassGrams > 0 ? unballastedMomentY / unballastedMassGrams : 0;

  // 6. Nose Ballast
  const ballastGrams = Math.max(0, glider.fuselage.noseBallastGrams);
  const ballastCx = glider.fuselage.ballastPositionXMm;
  const ballastCy = glider.fuselage.noseHeightMm * 0.5;

  const totalGrams = unballastedMassGrams + ballastGrams;
  const totalMomentX = unballastedMomentX + ballastGrams * ballastCx;
  const totalMomentY = unballastedMomentY + ballastGrams * ballastCy;

  const cgXMm = totalGrams > 0 ? totalMomentX / totalGrams : 0;
  const cgYMm = totalGrams > 0 ? totalMomentY / totalGrams : 0;

  return {
    breakdown: {
      fuselageGrams: Number(fuselageGrams.toFixed(2)),
      wingGrams: Number(wingGrams.toFixed(2)),
      tailGrams: Number(tailGrams.toFixed(2)),
      finGrams: Number(finGrams.toFixed(2)),
      ballastGrams: Number(ballastGrams.toFixed(2)),
      totalGrams: Number(totalGrams.toFixed(2)),
    },
    cgXMm: Number(cgXMm.toFixed(2)),
    cgYMm: Number(cgYMm.toFixed(2)),
    cgZMm: 0,
    unballastedMassGrams: Number(unballastedMassGrams.toFixed(2)),
    unballastedCgXMm: Number(unballastedCgXMm.toFixed(2)),
  };
}
