import { describe, it, expect } from 'vitest';
import { GLIDER_PRESETS } from '@/constants/presets';
import { camberArcLength } from '@/geometry/wingBlank';
import { GliderDesign, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import { calculateGliderMassAndCG, getFuselageContourPoints } from './massBalance';
import { analyzeGliderStability } from './stability';
import { generateWingFlatPattern, generateFuselageFlatPattern } from '@/geometry/patterns2d';
import { polygonArea, calculateWingPlanformPoints } from '@/geometry/core';

const presets = Object.values(GLIDER_PRESETS);

/** Parses the simple "M x y L x y L x y ... Z" paths this app emits back into points. */
function parseSvgPath(d: string): { x: number; y: number }[] {
  const tokens = d.replace(/Z/g, '').trim().split(/\s+/);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'M' || tokens[i] === 'L') {
      points.push({ x: parseFloat(tokens[i + 1]), y: parseFloat(tokens[i + 2]) });
      i += 2;
    }
  }
  return points;
}

describe('canonical geometry invariants (cross-system agreement)', () => {
  for (const preset of presets) {
    describe(preset.name, () => {
      it('uses projected area for aerodynamics and camber-allowed blank area for material', () => {
        const canonicalPoints = calculateWingPlanformPoints(
          getWingPlanformKind(preset.wing.planformType),
          preset.wing.rootChordMm,
          getEffectiveTipChordMm(preset.wing),
          preset.wing.spanMm,
          preset.wing.sweepDeg
        );
        const canonicalAreaMm2 = polygonArea(canonicalPoints);

        // What the aerodynamics/stability report says the wing area is
        const aeroReport = analyzeGliderStability(preset);
        expect(aeroReport.wingAreaMm2).toBeCloseTo(canonicalAreaMm2, 0);

        // What the 2D flat-pattern exporter would actually cut — parsed back
        // out of its emitted SVG path, independent of the canonical points,
        // so this is a real cross-check rather than comparing a value to itself.
        const flatPattern = generateWingFlatPattern(preset);
        const exportedPoints = parseSvgPath(flatPattern.outlinePath);
        const exportedAreaMm2 = polygonArea(exportedPoints);
        const blankArea = canonicalAreaMm2 * camberArcLength(1, preset.wing.camberPercent);
        // SVG coordinates are rounded to 0.01 mm; over a long span the area
        // rounding error can exceed 0.5 mm².
        expect(Math.abs(exportedAreaMm2 - blankArea)).toBeLessThan(preset.wing.spanMm * 0.01);
        expect(calculateGliderMassAndCG(preset).breakdown.wingGrams).toBeCloseTo(
          blankArea * preset.wing.thicknessMm * preset.material.densityKgM3 / 1e6, 2);
      });

      it('produces a physically sane total mass and CG within the airframe length', () => {
        const { breakdown, cgXMm } = calculateGliderMassAndCG(preset);
        expect(breakdown.totalGrams).toBeGreaterThan(0);
        expect(breakdown.totalGrams).toBeLessThan(50); // sanity ceiling for a hand-launched balsa glider
        expect(cgXMm).toBeGreaterThan(0);
        expect(cgXMm).toBeLessThan(preset.fuselage.lengthMm);
      });

      it('sizes the cut sheet for the smoothed fuselage rather than its control points', () => {
        const fuselagePoints = getFuselageContourPoints(preset);
        const fuselageBox = generateFuselageFlatPattern(preset).boundingBox;
        // Smoothing can extend beyond the control nodes; those extrema must
        // fit the sheet too, without clipping the exported cut contour.
        const rawMinY = Math.min(...fuselagePoints.map((p) => p.y));
        const rawMaxY = Math.max(...fuselagePoints.map((p) => p.y));
        expect(fuselageBox.minY).toBeCloseTo(rawMinY);
        expect(fuselageBox.maxY).toBeCloseTo(rawMaxY);
      });

      if (preset.verticalStabilizer.isIntegralWithFuselage) {
        it('folds the integral fin into the fuselage silhouette (regression: previously invisible with zero mass)', () => {
          const withFin = getFuselageContourPoints(preset);
          const withoutFin: GliderDesign = {
            ...preset,
            verticalStabilizer: { ...preset.verticalStabilizer, isIntegralWithFuselage: false },
          };
          const withoutFinPoints = getFuselageContourPoints(withoutFin);
          const areaWithFin = polygonArea(withFin);
          const areaWithoutFin = polygonArea(withoutFinPoints);
          // A non-zero-height integral fin must add area (and therefore mass)
          // to the fuselage silhouette — it must not be silently dropped.
          expect(areaWithFin).toBeGreaterThan(areaWithoutFin);
        });
      }
    });
  }

  it('delta and tapered wings of the same nominal chords produce different areas (regression: were identical)', () => {
    const base: GliderDesign = GLIDER_PRESETS.SPEED_DART;
    const tapered: GliderDesign = { ...base, wing: { ...base.wing, planformType: 'tapered', tipChordMm: 34 } };
    const delta: GliderDesign = { ...base, wing: { ...base.wing, planformType: 'delta' } };

    const taperedArea = analyzeGliderStability(tapered).wingAreaMm2;
    const deltaArea = analyzeGliderStability(delta).wingAreaMm2;

    expect(deltaArea).toBeLessThan(taperedArea);
  });

  it('rectangular wing area equals root-chord × span exactly, ignoring stale tipChordMm', () => {
    const base: GliderDesign = GLIDER_PRESETS.TRAINER;
    const rectangular: GliderDesign = {
      ...base,
      wing: { ...base.wing, planformType: 'rectangular', rootChordMm: 60, tipChordMm: 15 /* stale/irrelevant */, sweepDeg: 0 },
    };
    const area = analyzeGliderStability(rectangular).wingAreaMm2;
    expect(area).toBeCloseTo(60 * rectangular.wing.spanMm, 0);
  });
});
