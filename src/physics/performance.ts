/** Design-based, low-order aerodynamic exploration. Coefficient limits and
 * profile drag are explicit assumptions; geometry, loading and Reynolds number
 * come from the selected design and mass. */
export const AIR_DENSITY_KG_M3 = 1.225;
export const AIR_KINEMATIC_VISCOSITY_M2_S = 1.5e-5;
export const GRAVITY_M_S2 = 9.81;

export interface AeroAssumptions {
  profileDragCoefficient: number;
  maximumLiftCoefficient: number;
  spanEfficiency: number;
}

export const DEFAULT_AERO_ASSUMPTIONS: AeroAssumptions = {
  profileDragCoefficient: 0.09,
  maximumLiftCoefficient: 0.9,
  spanEfficiency: 0.7,
};

export interface WingCoefficients {
  liftCoefficient: number;
  dragCoefficient: number;
  inducedDragCoefficient: number;
  zeroLiftAngleDeg: number;
  liftLimited: boolean;
}

export interface PerformanceInput {
  massGrams: number;
  wingAreaMm2: number;
  aspectRatio: number;
  meanAerodynamicChordMm: number;
  camberPercent: number;
  angleOfAttackDeg: number;
  speedMs: number;
  assumptions?: AeroAssumptions;
}

export interface DesignPerformance extends WingCoefficients {
  wingLoadingGDm2: number;
  reynoldsNumber: number;
  requiredLiftCoefficient: number;
  liftNewtons: number;
  dragNewtons: number;
  weightNewtons: number;
  supportSpeedMs: number;
  liftToDragRatio: number;
}

function validateAssumptions(value: AeroAssumptions) {
  if (![value.profileDragCoefficient, value.maximumLiftCoefficient, value.spanEfficiency].every(Number.isFinite) ||
    value.profileDragCoefficient <= 0 || value.maximumLiftCoefficient <= 0 ||
    value.spanEfficiency <= 0 || value.spanEfficiency > 1) {
    throw new Error('Aerodynamic assumptions must be positive and span efficiency cannot exceed 1.');
  }
}

/** Thin-airfoil zero-lift angle for the same 40%-chord camber line used by the 3D wing.
 * This is a small-angle, inviscid estimate; it does not resolve separation. */
export function zeroLiftAngleRad(camberPercent: number): number {
  if (!Number.isFinite(camberPercent) || camberPercent < 0) throw new Error('Camber must be nonnegative.');
  const m = camberPercent / 100;
  if (m === 0) return 0;
  const p = 0.4;
  const segments = 128;
  let integral = 0;
  for (let i = 0; i <= segments; i++) {
    const theta = Math.PI * i / segments;
    const x = (1 - Math.cos(theta)) / 2;
    const slope = x <= p ? 2 * m * (p - x) / (p * p)
      : 2 * m * (p - x) / ((1 - p) * (1 - p));
    const weight = i === 0 || i === segments ? 1 : i % 2 === 0 ? 2 : 4;
    integral += weight * slope * (1 - Math.cos(theta));
  }
  return integral * (Math.PI / segments) / (3 * Math.PI);
}

export function estimateWingCoefficients(
  aspectRatio: number, camberPercent: number, angleOfAttackDeg: number,
  assumptions: AeroAssumptions = DEFAULT_AERO_ASSUMPTIONS
): WingCoefficients {
  validateAssumptions(assumptions);
  if (![aspectRatio, angleOfAttackDeg].every(Number.isFinite) || aspectRatio <= 0) {
    throw new Error('Wing aspect ratio and angle of attack must be finite.');
  }
  const zeroLiftAngle = zeroLiftAngleRad(camberPercent);
  const liftSlope = 2 * Math.PI / (1 + 2 / aspectRatio);
  const linearLift = liftSlope * (angleOfAttackDeg * Math.PI / 180 - zeroLiftAngle);
  const liftCoefficient = Math.max(-assumptions.maximumLiftCoefficient,
    Math.min(assumptions.maximumLiftCoefficient, linearLift));
  const inducedDragCoefficient = liftCoefficient ** 2 / (Math.PI * aspectRatio * assumptions.spanEfficiency);
  return {
    liftCoefficient,
    dragCoefficient: assumptions.profileDragCoefficient + inducedDragCoefficient,
    inducedDragCoefficient,
    zeroLiftAngleDeg: zeroLiftAngle * 180 / Math.PI,
    liftLimited: liftCoefficient !== linearLift,
  };
}

/** Speed at which an assumed lift coefficient would support the weight in level flight.
 * It is not a stall speed unless the supplied coefficient is a measured CLmax. */
export function speedForLiftCoefficient(massGrams: number, wingAreaMm2: number, liftCoefficient: number): number {
  if (![massGrams, wingAreaMm2, liftCoefficient].every(Number.isFinite) ||
    massGrams <= 0 || wingAreaMm2 <= 0 || liftCoefficient <= 0) {
    throw new Error('Mass, area and lift coefficient must be positive.');
  }
  return Math.sqrt(2 * massGrams / 1000 * GRAVITY_M_S2 /
    (AIR_DENSITY_KG_M3 * wingAreaMm2 / 1e6 * liftCoefficient));
}

export function calculateDesignPerformance(input: PerformanceInput): DesignPerformance {
  const { massGrams, wingAreaMm2, aspectRatio, meanAerodynamicChordMm,
    camberPercent, angleOfAttackDeg, speedMs } = input;
  if (![massGrams, wingAreaMm2, meanAerodynamicChordMm, speedMs].every(Number.isFinite) ||
    massGrams <= 0 || wingAreaMm2 <= 0 || meanAerodynamicChordMm <= 0 || speedMs <= 0) {
    throw new Error('Mass, wing area, mean chord and speed must be positive.');
  }
  const coefficients = estimateWingCoefficients(aspectRatio, camberPercent, angleOfAttackDeg, input.assumptions);
  const areaM2 = wingAreaMm2 / 1e6;
  const dynamicPressure = AIR_DENSITY_KG_M3 * speedMs * speedMs / 2;
  const weightNewtons = massGrams / 1000 * GRAVITY_M_S2;
  return {
    ...coefficients,
    wingLoadingGDm2: massGrams / (wingAreaMm2 / 10000),
    reynoldsNumber: speedMs * (meanAerodynamicChordMm / 1000) / AIR_KINEMATIC_VISCOSITY_M2_S,
    requiredLiftCoefficient: weightNewtons / (dynamicPressure * areaM2),
    liftNewtons: dynamicPressure * areaM2 * coefficients.liftCoefficient,
    dragNewtons: dynamicPressure * areaM2 * coefficients.dragCoefficient,
    weightNewtons,
    supportSpeedMs: speedForLiftCoefficient(massGrams, wingAreaMm2,
      input.assumptions?.maximumLiftCoefficient ?? DEFAULT_AERO_ASSUMPTIONS.maximumLiftCoefficient),
    liftToDragRatio: coefficients.liftCoefficient / coefficients.dragCoefficient,
  };
}
