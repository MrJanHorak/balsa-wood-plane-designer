import { GliderDesign, GliderAeroReport, WingSlotConfig, TailSlotConfig } from '@/types/glider';
import { Point2D, isPointInPolygon, calculateBoundingBox } from './core';
import { getFuselageProfilePoints } from '@/physics/massBalance';
import { analyzeGliderStability } from '@/physics/stability';

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory = 'structural' | 'manufacturing' | 'aerodynamic';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  title: string;
  message: string;
  suggestedFix?: string;
  affectedComponent?: 'fuselage' | 'wing' | 'horizontalStabilizer' | 'verticalStabilizer';
}

export interface ValidationReport {
  isValid: boolean;
  hasWarnings: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  issues: ValidationIssue[];
}

/** Standard commercial balsa sheet dimensions (mm) */
const STANDARD_SHEET_WIDTH_3_INCH = 76.2;
const STANDARD_SHEET_WIDTH_4_INCH = 101.6;
const STANDARD_SHEET_LENGTH_36_INCH = 914.4;

/** Minimum solid balsa bridge (web) before warning of fragile joint (mm) */
const MIN_RECOMMENDED_WEB_MM = 2.0;

/**
 * Calculates the 4 corner points of a rotated slot in fuselage coordinate space.
 */
export function calculateSlotCorners(slot: WingSlotConfig | TailSlotConfig): Point2D[] {
  const angleRad = (slot.angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const halfThick = slot.thicknessMm / 2;

  // Longitudinal vector along slot length
  const lx = slot.lengthMm * cosA;
  const ly = slot.lengthMm * sinA;

  // Perpendicular vector across thickness (upward)
  const px = -sinA * halfThick;
  const py = cosA * halfThick;

  const startX = slot.xPositionMm;
  const startY = slot.yPositionMm;

  return [
    { x: startX - px, y: startY - py },           // bottom-leading
    { x: startX + lx - px, y: startY + ly - py }, // bottom-trailing
    { x: startX + lx + px, y: startY + ly + py }, // top-trailing
    { x: startX + px, y: startY + py },           // top-leading
  ];
}

/**
 * Finds vertical bounds (min Y and max Y) of a polygon at a specific X coordinate.
 */
export function getPolygonVerticalBoundsAtX(points: Point2D[], x: number): { minY: number; maxY: number } | null {
  const intersections: number[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    const minEdgeX = Math.min(p1.x, p2.x);
    const maxEdgeX = Math.max(p1.x, p2.x);

    if (x >= minEdgeX && x <= maxEdgeX && p1.x !== p2.x) {
      const t = (x - p1.x) / (p2.x - p1.x);
      const yAtX = p1.y + t * (p2.y - p1.y);
      intersections.push(yAtX);
    }
  }

  if (intersections.length < 2) return null;

  return {
    minY: Math.min(...intersections),
    maxY: Math.max(...intersections),
  };
}

/**
 * Validates a GliderDesign for physical constructibility, material fit, and flight feasibility.
 */
export function validateGliderDesign(
  glider: GliderDesign,
  providedAeroReport?: GliderAeroReport
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const { fuselage, wing } = glider;
  const fuselagePoints = getFuselageProfilePoints(glider);
  const fuselageBBox = calculateBoundingBox(fuselagePoints);
  const aeroReport = providedAeroReport ?? analyzeGliderStability(glider);

  // -------------------------------------------------------------
  // 1. STRUCTURAL ENCLOSURE CHECKS
  // -------------------------------------------------------------

  const ws = fuselage.wingSlot;
  const wingSlotCorners = calculateSlotCorners(ws);
  const wingSlotEndXMm = ws.xPositionMm + ws.lengthMm * Math.cos((ws.angleDeg * Math.PI) / 180);

  // 1A. Wing Slot Checks
  if (fuselage.mountType === 'through_slot') {
    // Nose clearance
    if (ws.xPositionMm < 8.0) {
      issues.push({
        id: 'wing_slot_nose_breach',
        severity: 'error',
        category: 'structural',
        title: 'Wing Slot Breaches Nose',
        message: `Wing slot starts only ${ws.xPositionMm.toFixed(1)}mm from the nose tip. Minimum 8mm solid wood required to prevent nose blowout on landing.`,
        suggestedFix: 'Shift the wing slot further aft (increase Wing Position).',
        affectedComponent: 'fuselage',
      });
    }

    // Rear clearance relative to fuselage length
    if (wingSlotEndXMm > fuselage.lengthMm - 25.0) {
      issues.push({
        id: 'wing_slot_tail_breach',
        severity: 'error',
        category: 'structural',
        title: 'Wing Slot Overlaps Boom',
        message: `Wing slot extends to ${wingSlotEndXMm.toFixed(1)}mm, which is too close to the tail boom of the ${fuselage.lengthMm}mm fuselage.`,
        suggestedFix: 'Shift the wing forward or lengthen the fuselage.',
        affectedComponent: 'fuselage',
      });
    }

    // Corner containment in fuselage polygon
    const outsideCorners = wingSlotCorners.filter((c) => !isPointInPolygon(c, fuselagePoints));
    if (outsideCorners.length > 0) {
      issues.push({
        id: 'wing_slot_polygon_breach',
        severity: 'error',
        category: 'structural',
        title: 'Wing Slot Protrudes Outside Body',
        message: `${outsideCorners.length} corner(s) of the wing slot breach the outer fuselage contour. The slot will cut through the edge of the wood.`,
        suggestedFix: 'Enable "Auto-Reinforce Spine" or lower the wing vertical position.',
        affectedComponent: 'fuselage',
      });
    }

    // Web Thickness Checks (Sample at leading edge, center, trailing edge)
    const testXs = [
      ws.xPositionMm + 1.0,
      ws.xPositionMm + (ws.lengthMm / 2) * Math.cos((ws.angleDeg * Math.PI) / 180),
      wingSlotEndXMm - 1.0,
    ];
    let minUpperWeb = Infinity;
    let minLowerWeb = Infinity;

    testXs.forEach((x) => {
      const bounds = getPolygonVerticalBoundsAtX(fuselagePoints, x);
      if (bounds) {
        const slotYAtX = ws.yPositionMm + (x - ws.xPositionMm) * Math.tan((ws.angleDeg * Math.PI) / 180);
        const slotTopY = slotYAtX + ws.thicknessMm / 2;
        const slotBottomY = slotYAtX - ws.thicknessMm / 2;

        const upperWeb = bounds.maxY - slotTopY;
        const lowerWeb = slotBottomY - bounds.minY;

        if (upperWeb < minUpperWeb) minUpperWeb = upperWeb;
        if (lowerWeb < minLowerWeb) minLowerWeb = lowerWeb;
      }
    });

    if (minUpperWeb < 0) {
      issues.push({
        id: 'wing_slot_upper_breach',
        severity: 'error',
        category: 'structural',
        title: 'Wing Slot Breaches Fuselage Spine',
        message: `Wing slot breaks through the top edge of the fuselage (breach of ${Math.abs(minUpperWeb).toFixed(1)}mm).`,
        suggestedFix: 'Enable "Auto-Reinforce Spine" or lower the wing slot height.',
        affectedComponent: 'fuselage',
      });
    } else if (minUpperWeb < MIN_RECOMMENDED_WEB_MM) {
      issues.push({
        id: 'wing_slot_thin_upper_web',
        severity: 'warning',
        category: 'structural',
        title: 'Fragile Upper Balsa Bridge',
        message: `Only ${minUpperWeb.toFixed(1)}mm of solid wood remains above the wing slot. This fragile bridge easily snaps during laser cutting or assembly.`,
        suggestedFix: 'Enable "Auto-Reinforce Spine" to thicken the canopy pylon or lower the wing slot height.',
        affectedComponent: 'fuselage',
      });
    }

    if (minLowerWeb < 0) {
      issues.push({
        id: 'wing_slot_lower_breach',
        severity: 'error',
        category: 'structural',
        title: 'Wing Slot Breaches Fuselage Belly',
        message: `Wing slot breaks through the bottom edge of the fuselage.`,
        suggestedFix: 'Raise the wing slot height or increase fuselage depth.',
        affectedComponent: 'fuselage',
      });
    } else if (minLowerWeb < MIN_RECOMMENDED_WEB_MM) {
      issues.push({
        id: 'wing_slot_thin_lower_web',
        severity: 'warning',
        category: 'structural',
        title: 'Fragile Lower Balsa Bridge',
        message: `Only ${minLowerWeb.toFixed(1)}mm of wood remains below the wing slot.`,
        suggestedFix: 'Raise the wing slot height or increase fuselage depth.',
        affectedComponent: 'fuselage',
      });
    }
  } else if (fuselage.mountType === 'top_saddle') {
    if (ws.xPositionMm < 10.0 || wingSlotEndXMm > fuselage.lengthMm - 20.0) {
      issues.push({
        id: 'saddle_extent_warning',
        severity: 'warning',
        category: 'structural',
        title: 'Saddle Overhangs Fuselage',
        message: 'The top wing saddle position exceeds safe fuselage mounting bounds.',
        suggestedFix: 'Center the wing position on the fuselage spine.',
        affectedComponent: 'fuselage',
      });
    }
  } else if (fuselage.mountType === 'parasol_pylon') {
    if (fuselage.pylonWidthMm < 12.0) {
      issues.push({
        id: 'pylon_too_thin',
        severity: 'warning',
        category: 'structural',
        title: 'Thin Cabane Pylon',
        message: `Pylon width (${fuselage.pylonWidthMm.toFixed(1)}mm) is narrow. Aerodynamic drag on launch may flex or snap the pylon.`,
        suggestedFix: 'Increase Pylon Width to at least 16mm.',
        affectedComponent: 'fuselage',
      });
    }
  }

  // 1B. Tail Slot Checks
  const ts = fuselage.tailSlot;
  const tailSlotEndXMm = ts.xPositionMm + ts.lengthMm * Math.cos((ts.angleDeg * Math.PI) / 180);

  // Clearance between wing and tail
  if (ts.xPositionMm <= wingSlotEndXMm + 12.0) {
    issues.push({
      id: 'tail_wing_slot_collision',
      severity: 'error',
      category: 'structural',
      title: 'Tail Slot Overlaps Wing',
      message: `Tail slot starts at ${ts.xPositionMm.toFixed(1)}mm, which collides with or sits too close to the wing slot (ends at ${wingSlotEndXMm.toFixed(1)}mm).`,
      suggestedFix: 'Move the tail slot further aft or lengthen the fuselage.',
      affectedComponent: 'fuselage',
    });
  }

  // Check if slot starts completely off the fuselage
  if (ts.xPositionMm >= fuselage.lengthMm) {
    issues.push({
      id: 'tail_slot_detached',
      severity: 'error',
      category: 'structural',
      title: 'Tail Slot Detached from Fuselage',
      message: `Tail slot starts at ${ts.xPositionMm.toFixed(1)}mm, beyond the ${fuselage.lengthMm}mm fuselage end.`,
      suggestedFix: 'Move the tail slot forward onto the tail boom.',
      affectedComponent: 'fuselage',
    });
  }

  // Tail slot overhang check
  if (tailSlotEndXMm > fuselage.lengthMm + 12.0) {
    issues.push({
      id: 'tail_slot_overhang',
      severity: 'error',
      category: 'structural',
      title: 'Tail Slot Extends Too Far Beyond Fuselage',
      message: `Tail slot extends to ${tailSlotEndXMm.toFixed(1)}mm, more than 12mm beyond the ${fuselage.lengthMm}mm fuselage outline.`,
      suggestedFix: 'Move the tail slot forward or lengthen the fuselage.',
      affectedComponent: 'fuselage',
    });
  }

  // Vertical containment check for tail slot root
  const tailBounds = getPolygonVerticalBoundsAtX(fuselagePoints, ts.xPositionMm + 2.0);
  if (tailBounds) {
    const slotTop = ts.yPositionMm + ts.thicknessMm / 2;
    const slotBottom = ts.yPositionMm - ts.thicknessMm / 2;
    if (slotTop > tailBounds.maxY + 1.0 || slotBottom < tailBounds.minY - 1.0) {
      issues.push({
        id: 'tail_slot_vertical_breach',
        severity: 'warning',
        category: 'structural',
        title: 'Tail Slot Breaches Tail Boom Contour',
        message: 'Tail slot root edges protrude vertically outside the tail boom silhouette.',
        suggestedFix: 'Adjust Tail Slot Y-position or increase tail boom height.',
        affectedComponent: 'fuselage',
      });
    }
  }

  // -------------------------------------------------------------
  // 2. MATERIAL & SHEET FIT CHECKS
  // -------------------------------------------------------------

  // Wing Root Chord vs Stock Sheet Width (3" / 4")
  if (wing.rootChordMm > STANDARD_SHEET_WIDTH_4_INCH) {
    issues.push({
      id: 'wing_chord_exceeds_4_inch',
      severity: 'warning',
      category: 'manufacturing',
      title: 'Wing Chord Exceeds 4" Stock Sheet',
      message: `Root chord (${wing.rootChordMm.toFixed(1)}mm) exceeds commercial 4-inch balsa planks (101.6mm). Two sheets must be edge-glued together.`,
      suggestedFix: 'Reduce root chord to ≤ 100mm, or plan for edge-glued balsa plank construction.',
      affectedComponent: 'wing',
    });
  } else if (wing.rootChordMm > STANDARD_SHEET_WIDTH_3_INCH) {
    issues.push({
      id: 'wing_chord_requires_4_inch',
      severity: 'info',
      category: 'manufacturing',
      title: 'Wing Requires 4" Balsa Stock',
      message: `Root chord (${wing.rootChordMm.toFixed(1)}mm) exceeds standard 3-inch (76.2mm) sheet width. Requires 4-inch wide stock.`,
      affectedComponent: 'wing',
    });
  }

  // Wingspan vs Stock Sheet Length (36" = 914.4mm)
  if (wing.spanMm > STANDARD_SHEET_LENGTH_36_INCH) {
    issues.push({
      id: 'wing_span_exceeds_36_inch',
      severity: 'warning',
      category: 'manufacturing',
      title: 'Wingspan Exceeds 36" Sheet Length',
      message: `Wingspan (${wing.spanMm.toFixed(0)}mm) exceeds standard 36-inch (914.4mm) balsa length. Multi-piece jointed wings required.`,
      suggestedFix: 'Reduce wingspan to ≤ 900mm for single-piece cutting.',
      affectedComponent: 'wing',
    });
  }

  // Fuselage Max Depth
  if (fuselage.maxHeightMm > STANDARD_SHEET_WIDTH_4_INCH) {
    issues.push({
      id: 'fuselage_height_exceeds_4_inch',
      severity: 'warning',
      category: 'manufacturing',
      title: 'Fuselage Height Exceeds 4" Stock Sheet',
      message: `Fuselage height (${fuselage.maxHeightMm.toFixed(1)}mm) exceeds standard 4-inch balsa planks.`,
      suggestedFix: 'Reduce max fuselage height to ≤ 100mm.',
      affectedComponent: 'fuselage',
    });
  } else if (fuselage.maxHeightMm > STANDARD_SHEET_WIDTH_3_INCH) {
    issues.push({
      id: 'fuselage_height_requires_4_inch',
      severity: 'info',
      category: 'manufacturing',
      title: 'Fuselage Requires 4" Balsa Stock',
      message: `Fuselage height (${fuselage.maxHeightMm.toFixed(1)}mm) requires 4-inch wide stock.`,
      affectedComponent: 'fuselage',
    });
  }

  // -------------------------------------------------------------
  // 3. AERODYNAMIC FEASIBILITY CHECKS
  // -------------------------------------------------------------

  // Tail Volume Ratio V_h
  if (aeroReport.tailVolumeRatio < 0.28) {
    issues.push({
      id: 'low_tail_volume',
      severity: 'warning',
      category: 'aerodynamic',
      title: 'Low Horizontal Tail Volume',
      message: `Tail volume ratio (Vh = ${aeroReport.tailVolumeRatio.toFixed(3)}) is below the recommended 0.35 threshold. The stabilizer is too small or too close to the wing to prevent pitch instability.`,
      suggestedFix: 'Increase tail span, increase tail chord, or lengthen the fuselage tail boom.',
      affectedComponent: 'horizontalStabilizer',
    });
  }

  // Dihedral angle
  if (wing.dihedralDeg < 2.0) {
    issues.push({
      id: 'low_dihedral_warning',
      severity: 'warning',
      category: 'aerodynamic',
      title: 'Low Roll Dihedral Angle',
      message: `Dihedral (${wing.dihedralDeg.toFixed(1)}°) is very low. Free-flight gliders rely on upward V-dihedral (typically 4°–8°) for lateral self-leveling; low dihedral leads to spiral dives.`,
      suggestedFix: 'Increase Dihedral Angle to at least 4°.',
      affectedComponent: 'wing',
    });
  }

  // Aspect Ratio
  if (aeroReport.aspectRatio > 15.0) {
    issues.push({
      id: 'high_aspect_ratio_flutter',
      severity: 'warning',
      category: 'aerodynamic',
      title: 'High Aspect Ratio Flutter Risk',
      message: `Wing aspect ratio (AR = ${aeroReport.aspectRatio.toFixed(1)}) is very high for thin sheet balsa. Without carbon fiber spars or rib bracing, the wings may twist or flutter.`,
      suggestedFix: 'Increase wing chord or reduce wingspan.',
      affectedComponent: 'wing',
    });
  } else if (aeroReport.aspectRatio < 2.8) {
    issues.push({
      id: 'low_aspect_ratio',
      severity: 'warning',
      category: 'aerodynamic',
      title: 'Low Aspect Ratio (High Induced Drag)',
      message: `Aspect ratio (AR = ${aeroReport.aspectRatio.toFixed(1)}) is very low. High tip vortex drag will reduce glide distance.`,
      suggestedFix: 'Increase wingspan or narrow the chord.',
      affectedComponent: 'wing',
    });
  }

  // Static Margin checks
  if (aeroReport.staticMarginPercent < 0) {
    issues.push({
      id: 'unstable_static_margin',
      severity: 'error',
      category: 'aerodynamic',
      title: 'Unstable Aerodynamic Balance',
      message: `Static margin is negative (${aeroReport.staticMarginPercent.toFixed(1)}%). The Center of Gravity is behind the Neutral Point. The glider will tumble backward into an unrecoverable stall.`,
      suggestedFix: 'Add nose ballast using the Auto-Balance button or shift the wing aft.',
      affectedComponent: 'fuselage',
    });
  } else if (aeroReport.staticMarginPercent > 30.0) {
    issues.push({
      id: 'excessive_static_margin',
      severity: 'warning',
      category: 'aerodynamic',
      title: 'Excessive Nose-Heavy Margin',
      message: `Static margin (${aeroReport.staticMarginPercent.toFixed(1)}%) is high. The glider will lawn-dart into a steep dive.`,
      suggestedFix: 'Reduce nose ballast.',
      affectedComponent: 'fuselage',
    });
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    infos,
    issues,
  };
}
