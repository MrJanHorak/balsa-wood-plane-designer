import { describe, it, expect } from 'vitest';
import { GLIDER_PRESETS } from '@/constants/presets';
import { validateGliderDesign, calculateSlotCorners } from './validation';
import { GliderDesign } from '@/types/glider';

describe('calculateSlotCorners', () => {
  it('computes 4 corners of an unrotated slot', () => {
    const slot = {
      xPositionMm: 10,
      yPositionMm: 20,
      angleDeg: 0,
      lengthMm: 50,
      thicknessMm: 2,
    };
    const corners = calculateSlotCorners(slot);
    expect(corners).toHaveLength(4);
    // bottom-leading
    expect(corners[0]).toEqual({ x: 10, y: 19 });
    // bottom-trailing
    expect(corners[1]).toEqual({ x: 60, y: 19 });
    // top-trailing
    expect(corners[2]).toEqual({ x: 60, y: 21 });
    // top-leading
    expect(corners[3]).toEqual({ x: 10, y: 21 });
  });
});

describe('validateGliderDesign', () => {
  it('validates standard presets without structural errors', () => {
    for (const preset of Object.values(GLIDER_PRESETS)) {
      const report = validateGliderDesign(preset);
      expect(report.isValid, `Preset ${preset.name} should be valid`).toBe(true);
      expect(report.errors).toHaveLength(0);
    }
  });

  it('detects wing slot breach at the nose', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    design.fuselage.wingSlot.xPositionMm = 3.0; // too close to nose

    const report = validateGliderDesign(design);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.id === 'wing_slot_nose_breach')).toBe(true);
  });

  it('detects collision between wing slot and tail slot', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    // Wing ends at xPositionMm(72) + lengthMm(60) ≈ 132mm
    // Force tail slot to start at 120mm (colliding)
    design.fuselage.tailSlot.xPositionMm = 120;

    const report = validateGliderDesign(design);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.id === 'tail_wing_slot_collision')).toBe(true);
  });

  it('detects tail slot overhang past fuselage end', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    // Fuselage length is 250mm; tail slot length is 32mm -> ends at 272mm (> 250 + 12 = 262mm)
    design.fuselage.tailSlot.xPositionMm = 240;

    const report = validateGliderDesign(design);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.id === 'tail_slot_overhang')).toBe(true);
  });

  it('detects thin upper balsa bridge when auto-reinforce is off', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    design.fuselage.autoReinforceSpine = false;
    design.fuselage.maxHeightMm = 32;
    // Wing slot top edge at 28 + 1.7/2 = 28.85mm -> upper web is ~1.15mm (< 2.0mm)
    design.fuselage.wingSlot.yPositionMm = 28;

    const report = validateGliderDesign(design);
    expect(report.warnings.some((w) => w.id === 'wing_slot_thin_upper_web')).toBe(true);
  });

  it('flags oversized wing chord exceeding standard 4-inch sheet', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    design.wing.rootChordMm = 120; // > 101.6mm

    const report = validateGliderDesign(design);
    expect(report.warnings.some((w) => w.id === 'wing_chord_exceeds_4_inch')).toBe(true);
  });

  it('flags low tail volume ratio', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    // Drastically shrink tail
    design.horizontalStabilizer.spanMm = 40;
    design.horizontalStabilizer.rootChordMm = 15;

    const report = validateGliderDesign(design);
    expect(report.warnings.some((w) => w.id === 'low_tail_volume')).toBe(true);
  });

  it('flags low dihedral angle for roll stability', () => {
    const design: GliderDesign = structuredClone(GLIDER_PRESETS.TRAINER);
    design.wing.dihedralDeg = 0.5;

    const report = validateGliderDesign(design);
    expect(report.warnings.some((w) => w.id === 'low_dihedral_warning')).toBe(true);
  });
});
