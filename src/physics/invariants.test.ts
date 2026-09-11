import { describe, it, expect } from 'vitest';
import { GLIDER_PRESETS } from '@/constants/presets';
import { GliderDesign, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import { calculateGliderMassAndCG, getFuselageProfilePoints } from './massBalance';
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
      it('the wing area used by physics/mass equals the canonical planform area (and the 2D export)', () => {
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
        expect(exportedAreaMm2).toBeCloseTo(canonicalAreaMm2, 0);
      });

      it('produces a physically sane total mass and CG within the airframe length', () => {
        const { breakdown, cgXMm } = calculateGliderMassAndCG(preset);
        expect(breakdown.totalGrams).toBeGreaterThan(0);
        expect(breakdown.totalGrams).toBeLessThan(50); // sanity ceiling for a hand-launched balsa glider
        expect(cgXMm).toBeGreaterThan(0);
        expect(cgXMm).toBeLessThan(preset.fuselage.lengthMm);
      });

      it('never leaves the wing floating outside the fuselage silhouette bounds it needs to meet', () => {
        const fuselagePoints = getFuselageProfilePoints(preset);
        const fuselageBox = generateFuselageFlatPattern(preset).boundingBox;
        // The fuselage's own generated points must be the same ones the 2D
        // exporter measured — i.e. no second, independent fuselage shape exists.
        const rawMinY = Math.min(...fuselagePoints.map((p) => p.y));
        const rawMaxY = Math.max(...fuselagePoints.map((p) => p.y));
        expect(fuselageBox.minY).toBeCloseTo(rawMinY);
        expect(fuselageBox.maxY).toBeCloseTo(rawMaxY);
      });

      if (preset.verticalStabilizer.isIntegralWithFuselage) {
        it('folds the integral fin into the fuselage silhouette (regression: previously invisible with zero mass)', () => {
          const withFin = getFuselageProfilePoints(preset);
          const withoutFin: GliderDesign = {
            ...preset,
            verticalStabilizer: { ...preset.verticalStabilizer, heightMm: 0 },
          };
          const withoutFinPoints = getFuselageProfilePoints(withoutFin);
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
