/** A deliberately small, deterministic point-mass model for exploring a hand launch.
 * Pitch dynamics, wind, turn, and trim are outside this model. */
import {
  AeroAssumptions, AIR_DENSITY_KG_M3, DEFAULT_AERO_ASSUMPTIONS,
  estimateWingCoefficients, GRAVITY_M_S2, speedForLiftCoefficient,
} from './performance';

export interface Flight2DInput {
  massGrams: number;
  wingAreaMm2: number;
  aspectRatio: number;
  camberPercent: number;
  releaseHeightM: number;
  launchSpeedMs: number;
  launchAngleDeg: number;
  angleOfAttackDeg: number;
  assumptions?: AeroAssumptions;
}

export interface Flight2DPoint { timeS: number; xM: number; heightM: number; speedMs: number }
export interface Flight2DResult {
  points: Flight2DPoint[];
  rangeM: number;
  durationS: number;
  minimumSupportSpeedMs: number;
  reachedLowSpeed: boolean;
  endedAtGround: boolean;
}

const DT = 0.01;

export function simulateFlight2D(input: Flight2DInput): Flight2DResult {
  const { massGrams, wingAreaMm2, aspectRatio, camberPercent, releaseHeightM,
    launchSpeedMs, launchAngleDeg, angleOfAttackDeg } = input;
  if (![massGrams, wingAreaMm2, aspectRatio, camberPercent, releaseHeightM,
    launchSpeedMs, launchAngleDeg, angleOfAttackDeg].every(Number.isFinite) ||
    massGrams <= 0 || wingAreaMm2 <= 0 || aspectRatio <= 0 ||
    releaseHeightM <= 0 || launchSpeedMs <= 0 ||
    launchAngleDeg < -30 || launchAngleDeg > 30 ||
    angleOfAttackDeg < -5 || angleOfAttackDeg > 15) {
    throw new Error('Flight inputs are outside the supported range.');
  }

  const massKg = massGrams / 1000;
  const areaM2 = wingAreaMm2 / 1e6;
  const assumptions = input.assumptions ?? DEFAULT_AERO_ASSUMPTIONS;
  const { liftCoefficient: cl, dragCoefficient: cd } = estimateWingCoefficients(
    aspectRatio, camberPercent, angleOfAttackDeg, assumptions);
  const minimumSupportSpeedMs = speedForLiftCoefficient(massGrams, wingAreaMm2, assumptions.maximumLiftCoefficient);
  const launchAngleRad = launchAngleDeg * Math.PI / 180;
  let x = 0, y = releaseHeightM;
  let vx = launchSpeedMs * Math.cos(launchAngleRad);
  let vy = launchSpeedMs * Math.sin(launchAngleRad);
  let reachedLowSpeed = false;
  const points: Flight2DPoint[] = [{ timeS: 0, xM: x, heightM: y, speedMs: launchSpeedMs }];
  for (let step = 1; step <= 2000; step++) {
    const speed = Math.max(0.1, Math.hypot(vx, vy));
    if (speed < minimumSupportSpeedMs) reachedLowSpeed = true;
    const dynamicForce = 0.5 * AIR_DENSITY_KG_M3 * speed * speed * areaM2;
    const lift = dynamicForce * cl;
    const drag = dynamicForce * cd;
    const ax = (-drag * vx / speed - lift * vy / speed) / massKg;
    const ay = (-drag * vy / speed + lift * vx / speed) / massKg - GRAVITY_M_S2;
    vx += ax * DT;
    vy += ay * DT;
    x += vx * DT;
    y += vy * DT;
    const point = { timeS: step * DT, xM: x, heightM: Math.max(0, y), speedMs: Math.hypot(vx, vy) };
    if (step % 5 === 0 || y <= 0) points.push(point);
    if (y <= 0 || x > 100) {
      // Interpolate the final crossing to avoid a step-size dependent range.
      if (y <= 0 && points.length > 1) {
        const previous = points[points.length - 2];
        const fraction = previous.heightM / (previous.heightM - y);
        point.xM = previous.xM + (x - previous.xM) * fraction;
        point.timeS = previous.timeS + (step * DT - previous.timeS) * fraction;
      }
      return { points, rangeM: point.xM, durationS: point.timeS,
        minimumSupportSpeedMs, reachedLowSpeed, endedAtGround: y <= 0 };
    }
  }
  const last = points[points.length - 1];
  return { points, rangeM: last.xM, durationS: last.timeS,
    minimumSupportSpeedMs, reachedLowSpeed, endedAtGround: false };
}
