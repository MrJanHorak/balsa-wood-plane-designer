import { GliderDesign } from '@/types/glider';
import { BALSA_MATERIALS } from './materials';

export const GLIDER_PRESETS: Record<string, GliderDesign> = {
  TRAINER: {
    id: 'trainer',
    name: 'Sky Scout Trainer',
    description: 'Classic classroom balsa glider. High dihedral and generous tail area make this very stable and self-recovering.',
    mode: 'simple',
    material: BALSA_MATERIALS.MEDIUM_STANDARD,
    fuselage: {
      lengthMm: 250,
      maxHeightMm: 38,
      noseLengthMm: 60,
      noseHeightMm: 22,
      tailBoomHeightMm: 10,
      thicknessMm: 3.175, // 1/8" fuselage
      mountType: 'through_slot',
      autoReinforceSpine: true,
      pylonWidthMm: 24,
      wingSlot: {
        xPositionMm: 72,
        yPositionMm: 28,
        angleDeg: 2.2,
        lengthMm: 60,
        thicknessMm: 1.7, // Wing thickness + kerf
      },
      tailSlot: {
        xPositionMm: 225,
        yPositionMm: 14,
        angleDeg: 0.0,
        lengthMm: 32,
        thicknessMm: 1.7,
      },
      noseBallastGrams: 2.6,
      ballastPositionXMm: 12,
      profileStyle: 'trainer',
    },
    wing: {
      planformType: 'tapered',
      spanMm: 340,
      rootChordMm: 60,
      tipChordMm: 45,
      sweepDeg: 4,
      dihedralDeg: 6.5,
      camberPercent: 3.5,
      thicknessMm: 1.5875, // 1/16" wing
      slotTabWidthMm: 58,
      hasLeadingEdgeTaper: true,
    },
    horizontalStabilizer: {
      spanMm: 125,
      rootChordMm: 36,
      tipChordMm: 28,
      sweepDeg: 6,
      thicknessMm: 1.5875,
    },
    verticalStabilizer: {
      heightMm: 42,
      rootChordMm: 38,
      tipChordMm: 22,
      sweepDeg: 20,
      thicknessMm: 1.5875,
      isIntegralWithFuselage: true,
    },
  },

  THERMAL_SOARER: {
    id: 'thermal_soarer',
    name: 'Thermal Floater',
    description: 'High-aspect-ratio wings with low wing loading. Designed for extended, graceful glides in still classroom air or gyms.',
    mode: 'advanced',
    material: BALSA_MATERIALS.LIGHT_CONTEST,
    fuselage: {
      lengthMm: 280,
      maxHeightMm: 34,
      noseLengthMm: 70,
      noseHeightMm: 18,
      tailBoomHeightMm: 8,
      thicknessMm: 2.38,
      mountType: 'parasol_pylon',
      autoReinforceSpine: true,
      pylonWidthMm: 20,
      wingSlot: {
        xPositionMm: 80,
        yPositionMm: 38, // slightly elevated parasol
        angleDeg: 2.5,
        lengthMm: 52,
        thicknessMm: 1.7,
      },
      tailSlot: {
        xPositionMm: 255,
        yPositionMm: 12,
        angleDeg: 0.0,
        lengthMm: 30,
        thicknessMm: 1.7,
      },
      noseBallastGrams: 1.9,
      ballastPositionXMm: 10,
      profileStyle: 'sky_streak',
    },
    wing: {
      planformType: 'rectangular',
      spanMm: 440,
      rootChordMm: 52,
      // Rectangular planform: tip chord equals root chord — the geometry engine
      // enforces this visually, so this value must match to keep the physics
      // (wing area, mass, CG) consistent with what actually gets rendered/cut.
      tipChordMm: 52,
      sweepDeg: 2,
      dihedralDeg: 7.5,
      camberPercent: 4.5,
      thicknessMm: 1.5875,
      slotTabWidthMm: 50,
      hasLeadingEdgeTaper: true,
    },
    horizontalStabilizer: {
      spanMm: 135,
      rootChordMm: 32,
      tipChordMm: 24,
      sweepDeg: 5,
      thicknessMm: 1.5875,
    },
    verticalStabilizer: {
      heightMm: 48,
      rootChordMm: 34,
      tipChordMm: 20,
      sweepDeg: 18,
      thicknessMm: 1.5875,
      isIntegralWithFuselage: true,
    },
  },

  SPEED_DART: {
    id: 'speed_dart',
    name: 'Aero Dart / Jet Profile',
    description: 'Swept wings, sleek canopy profile, and lower dihedral. Built for high-speed catapult or outdoor spear launches.',
    mode: 'advanced',
    material: BALSA_MATERIALS.MEDIUM_STANDARD,
    fuselage: {
      lengthMm: 230,
      maxHeightMm: 42,
      noseLengthMm: 65,
      noseHeightMm: 16,
      tailBoomHeightMm: 12,
      thicknessMm: 3.175,
      mountType: 'through_slot',
      autoReinforceSpine: true,
      pylonWidthMm: 22,
      wingSlot: {
        xPositionMm: 75,
        yPositionMm: 25,
        angleDeg: 1.5,
        lengthMm: 70,
        thicknessMm: 1.7,
      },
      tailSlot: {
        xPositionMm: 205,
        yPositionMm: 16,
        angleDeg: -0.5,
        lengthMm: 34,
        thicknessMm: 1.7,
      },
      noseBallastGrams: 0.85,
      ballastPositionXMm: 8,
      profileStyle: 'sport_jet',
    },
    wing: {
      planformType: 'delta',
      spanMm: 280,
      rootChordMm: 72,
      // Delta wings converge to a near-point tip (see getEffectiveTipChordMm) —
      // stored here just to keep the data self-consistent; the slider for this
      // is hidden in delta mode since it has no effect on the rendered shape.
      tipChordMm: 6,
      sweepDeg: 16,
      dihedralDeg: 4.0,
      camberPercent: 1.5,
      thicknessMm: 1.5875,
      slotTabWidthMm: 68,
      hasLeadingEdgeTaper: true,
    },
    horizontalStabilizer: {
      spanMm: 110,
      rootChordMm: 36,
      tipChordMm: 22,
      sweepDeg: 14,
      thicknessMm: 1.5875,
    },
    verticalStabilizer: {
      heightMm: 45,
      rootChordMm: 42,
      tipChordMm: 22,
      sweepDeg: 28,
      thicknessMm: 1.5875,
      isIntegralWithFuselage: false,
    },
  },
};

export const DEFAULT_GLIDER = GLIDER_PRESETS.TRAINER;
