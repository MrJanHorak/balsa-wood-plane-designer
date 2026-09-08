export interface BalsaMaterial {
  id: string;
  name: string;
  densityKgM3: number;        // Typical: 100-160 kg/m³ (6.2 - 10 lb/cu.ft)
  sheetThicknessMm: number;    // Standard: 1.5875mm (1/16"), 2.38mm (3/32"), 3.175mm (1/8")
  laserKerfMm: number;        // Kerf allowance for snug friction slot fitting (~0.12mm)
  grainOrientation: 'spanwise' | 'chordwise';
}

export type WingMountType = 'through_slot' | 'top_saddle' | 'parasol_pylon' | 'bottom_saddle';

export interface FuselageNode {
  id: string;
  label: string;
  xMm: number;
  yMm: number;
  isFixed?: boolean;
}

export interface WingSlotConfig {
  xPositionMm: number;        // Distance from nose tip to wing leading edge slot (mm)
  yPositionMm: number;        // Height from fuselage bottom reference (mm)
  angleDeg: number;           // Wing incidence angle (typically 1.5° - 3.0°)
  lengthMm: number;           // Slot cut length along fuselage
  thicknessMm: number;        // Slot cut thickness (includes kerf compensation)
}

export interface TailSlotConfig {
  xPositionMm: number;        // Distance from nose tip to tail slot
  yPositionMm: number;        // Height from fuselage bottom reference
  angleDeg: number;           // Tail incidence / elevator trim angle (typically 0.0°)
  lengthMm: number;
  thicknessMm: number;
}

export interface FuselageConfig {
  lengthMm: number;           // Total nose-to-tail length
  maxHeightMm: number;        // Peak height (wing pylon/cabin)
  noseLengthMm: number;       // Distance from nose to pylon peak
  noseHeightMm: number;       // Height at nose tip
  tailBoomHeightMm: number;   // Height at tail end
  thicknessMm: number;        // Fuselage sheet balsa thickness
  mountType: WingMountType;   // 'through_slot' | 'top_saddle' | 'parasol_pylon' | 'bottom_saddle'
  autoReinforceSpine: boolean;// Automatically maintain minimum solid wood over/under wing slot
  pylonWidthMm: number;       // Width of cabane strut if parasol_pylon
  wingSlot: WingSlotConfig;
  tailSlot: TailSlotConfig;
  noseBallastGrams: number;   // Added nose trim weight (clay or ballast clip)
  ballastPositionXMm: number; // Center of ballast from nose (e.g. 10mm)
  profileStyle: 'trainer' | 'sport_jet' | 'curved_classic' | 'sky_streak' | 'custom';
  customNodes?: FuselageNode[]; // Draggable control nodes for custom profile
}

export type WingPlanformType = 'tapered' | 'rectangular' | 'elliptical' | 'delta';

export interface WingConfig {
  planformType: WingPlanformType;
  spanMm: number;             // Total wingspan tip-to-tip
  rootChordMm: number;        // Center chord
  tipChordMm: number;         // Wingtip chord
  sweepDeg: number;           // Leading edge sweep angle (0° - 25°)
  dihedralDeg: number;        // Dihedral angle per wing half (0° - 15°)
  camberPercent: number;      // Wood pre-curvature / camber (0% = flat, 4-6% = cambered)
  incidenceDeg: number;       // Angle of incidence relative to fuselage
  thicknessMm: number;        // Wing sheet thickness
  slotTabWidthMm: number;     // Width of center interlocking tab
  hasLeadingEdgeTaper: boolean;
}

export interface TailConfig {
  spanMm: number;             // Horizontal stabilizer span
  rootChordMm: number;        // Root chord
  tipChordMm: number;         // Tip chord
  sweepDeg: number;           // Sweep angle
  incidenceDeg: number;       // Elevator trim incidence (relative to fuselage)
  thicknessMm: number;
}

export interface FinConfig {
  heightMm: number;           // Vertical stabilizer height
  rootChordMm: number;        // Base chord
  tipChordMm: number;         // Top chord
  sweepDeg: number;           // Fin leading edge sweep
  thicknessMm: number;
  isIntegralWithFuselage: boolean; // Integrated into fuselage cut or separate slot piece
}

export type UIMode = 'simple' | 'advanced';

export interface GliderDesign {
  id: string;
  name: string;
  description: string;
  mode: UIMode;
  material: BalsaMaterial;
  fuselage: FuselageConfig;
  wing: WingConfig;
  horizontalStabilizer: TailConfig;
  verticalStabilizer: FinConfig;
}

export type StabilityStatus =
  | 'critically_tail_heavy'
  | 'tail_heavy'
  | 'optimal'
  | 'nose_heavy'
  | 'extremely_nose_heavy';

export interface GliderMassBreakdown {
  fuselageGrams: number;
  wingGrams: number;
  tailGrams: number;
  finGrams: number;
  ballastGrams: number;
  totalGrams: number;
}

export interface GliderAeroReport {
  massBreakdown: GliderMassBreakdown;
  
  // Center of Gravity
  cgXMm: number;              // Distance from nose tip along X (mm)
  cgYMm: number;              // Distance above reference baseline (mm)
  cgZMm: number;              // Lateral offset (0 for symmetric)
  
  // Wing Geometry
  wingAreaDm2: number;        // Wing planform area in dm²
  wingAreaMm2: number;
  aspectRatio: number;        // b² / S
  meanAerodynamicChordMm: number; // MAC (c̄)
  wingAcXMm: number;          // Wing Aerodynamic Center (X from nose)
  wingAcYMm: number;
  
  // Horizontal Tail Geometry & Volume
  tailAreaDm2: number;
  tailAreaMm2: number;
  tailAcXMm: number;          // Tail Aerodynamic Center (X from nose)
  tailArmMm: number;          // Distance between Wing AC and Tail AC (l_t)
  tailVolumeRatio: number;    // V_h = (S_t * l_t) / (S_w * MAC)
  
  // Neutral Point & Static Stability
  npXMm: number;              // Aircraft Neutral Point (X from nose)
  staticMarginMm: number;     // NP - CG
  staticMarginPercent: number;// (NP - CG) / MAC * 100%
  
  // Educational & Engineering Status
  stabilityStatus: StabilityStatus;
  statusBadgeText: string;
  educationalFeedback: string;
  pitchTendencyDescription: string;
  
  // Balance Advice
  recommendedBallastGrams: number; // Grams needed at ballast location to hit 10% static margin
  
  // Flight Envelope Estimates
  wingLoadingGDm2: number;    // Total mass / Wing Area (g/dm²)
  wingLoadingOzSqFt: number;  // Standard imperial aeromodeling unit
  estimatedStallSpeedMs: number; // Rough stall velocity (m/s)
  estimatedGlideRatio: number;// Best Lift-to-Drag ratio (L/D)
}
