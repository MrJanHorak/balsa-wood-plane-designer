import { GliderDesign, GliderMassBreakdown, getEffectiveTipChordMm } from '@/types/glider';

/**
 * Approximate points for a stylized profile fuselage.
 * Returns normalized vertices (X: 0->length, Y: 0->height)
 */
export function getFuselageProfilePoints(fuselage: GliderDesign['fuselage']): { x: number; y: number }[] {
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

  let points: { x: number; y: number }[];

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
    const pylonPeakY = Math.max(effectiveMaxHeight, slotTopY + 6);
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

  return points;
}

/**
 * Inserts two new vertices into the flat belly segment of a fuselage profile
 * so it dips down to meet a wing mounted below the baseline. Works generically
 * across any profile style by locating the (nearly) flat, y≈0 segment whose
 * X range contains the wing's slot — rather than hardcoding indices per style.
 */
function insertBellyDip(
  points: { x: number; y: number }[],
  wingX: number,
  wingLen: number,
  dipY: number
): { x: number; y: number }[] {
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
 * Computes polygon area and centroid using Shoelace formula
 */
export function computePolygonProperties(points: { x: number; y: number }[]): {
  areaMm2: number;
  centroidX: number;
  centroidY: number;
} {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  area = Math.abs(area) / 2;
  if (area === 0) return { areaMm2: 0, centroidX: 0, centroidY: 0 };

  cx = Math.abs(cx) / (6 * area);
  cy = Math.abs(cy) / (6 * area);

  return { areaMm2: area, centroidX: cx, centroidY: cy };
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
  const fusePoly = getFuselageProfilePoints(glider.fuselage);
  const { areaMm2: fuseAreaMm2, centroidX: fuseCx, centroidY: fuseCy } = computePolygonProperties(fusePoly);
  const fuseVolumeMm3 = fuseAreaMm2 * glider.fuselage.thicknessMm;
  const fuselageGrams = fuseVolumeMm3 * densityGPerMm3;

  // 2. Wing
  // Trapezoidal planform: S = (c_root + c_tip) / 2 * span
  const effectiveTipChordMm = getEffectiveTipChordMm(glider.wing);
  const wingAreaMm2 = ((glider.wing.rootChordMm + effectiveTipChordMm) / 2) * glider.wing.spanMm;
  const wingVolumeMm3 = wingAreaMm2 * glider.wing.thicknessMm;
  const wingGrams = wingVolumeMm3 * densityGPerMm3;

  // Wing centroid along X:
  // For trapezoid: centroid from root LE = (rootChord + 2 * tipChord) / (3 * (rootChord + tipChord)) * chordLine + sweep offset
  const cr = glider.wing.rootChordMm;
  const ct = effectiveTipChordMm;
  const span = glider.wing.spanMm;
  const sweepRad = (glider.wing.sweepDeg * Math.PI) / 180;
  const sweepOffsetAtMidHalfSpan = (span / 4) * Math.tan(sweepRad);
  const chordCentroidRelToLE = ((cr + 2 * ct) / (3 * (cr + ct))) * ((cr + ct) / 2);
  const wingCx = glider.fuselage.wingSlot.xPositionMm + chordCentroidRelToLE + sweepOffsetAtMidHalfSpan * 0.5;
  const wingCy = glider.fuselage.wingSlot.yPositionMm;

  // 3. Tail (Horizontal Stabilizer)
  const tailCr = glider.horizontalStabilizer.rootChordMm;
  const tailCt = glider.horizontalStabilizer.tipChordMm;
  const tailSpan = glider.horizontalStabilizer.spanMm;
  const tailAreaMm2 = ((tailCr + tailCt) / 2) * tailSpan;
  const tailVolumeMm3 = tailAreaMm2 * glider.horizontalStabilizer.thicknessMm;
  const tailGrams = tailVolumeMm3 * densityGPerMm3;

  const tailSweepRad = (glider.horizontalStabilizer.sweepDeg * Math.PI) / 180;
  const tailSweepOffset = (tailSpan / 4) * Math.tan(tailSweepRad);
  const tailChordCentroid = ((tailCr + 2 * tailCt) / (3 * (tailCr + tailCt))) * ((tailCr + tailCt) / 2);
  const tailCx = glider.fuselage.tailSlot.xPositionMm + tailChordCentroid + tailSweepOffset * 0.5;
  const tailCy = glider.fuselage.tailSlot.yPositionMm;

  // 4. Fin (Vertical Stabilizer)
  let finGrams = 0;
  let finCx = tailCx;
  let finCy = tailCy + glider.verticalStabilizer.heightMm * 0.4;

  if (!glider.verticalStabilizer.isIntegralWithFuselage) {
    const finCr = glider.verticalStabilizer.rootChordMm;
    const finCt = glider.verticalStabilizer.tipChordMm;
    const finH = glider.verticalStabilizer.heightMm;
    const finAreaMm2 = ((finCr + finCt) / 2) * finH;
    finGrams = finAreaMm2 * glider.verticalStabilizer.thicknessMm * densityGPerMm3;
    const finSweepRad = (glider.verticalStabilizer.sweepDeg * Math.PI) / 180;
    finCx = glider.fuselage.tailSlot.xPositionMm + ((finCr + 2 * finCt) / (3 * (finCr + finCt))) * ((finCr + finCt) / 2) + (finH / 2) * Math.tan(finSweepRad);
    finCy = glider.fuselage.tailSlot.yPositionMm + finH * 0.4;
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
