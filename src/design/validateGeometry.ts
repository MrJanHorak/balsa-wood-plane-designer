import { GliderDesign } from '@/types/glider';
import { tailAsWing, validateCustomWing } from '@/geometry/customWing';
import { validateCustomFin } from '@/geometry/customFin';

type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const positive = (v: unknown) => finite(v) && v > 0;
const nonnegative = (v: unknown) => finite(v) && v >= 0;
const choice = (v: unknown, values: string[]) => typeof v === 'string' && values.includes(v);
const fields = (v: RecordValue, names: string[], check: (x: unknown) => boolean) => names.every(n => check(v[n]));
const planforms = ['tapered', 'rectangular', 'elliptical', 'delta', 'custom'];

function nodes(value: unknown, flag: string): boolean {
  if (!Array.isArray(value) || value.length < 3 || value.length > 128) return false;
  return value.every(n => object(n) && typeof n.id === 'string' && typeof n.label === 'string'
    && finite(n.xMm) && finite(n.yMm) && (n[flag] === undefined || typeof n[flag] === 'boolean'))
    && new Set(value.map(n => n.id)).size === value.length;
}

function slot(v: unknown): boolean {
  return object(v) && fields(v, ['xPositionMm', 'yPositionMm', 'angleDeg'], finite)
    && fields(v, ['lengthMm', 'thicknessMm'], positive);
}

function surface(v: RecordValue): boolean {
  return fields(v, ['rootChordMm', 'thicknessMm'], positive) && nonnegative(v.tipChordMm)
    && finite(v.sweepDeg) && Math.abs(v.sweepDeg) < 89
    && (v.customNodes === undefined || nodes(v.customNodes, 'isFixedRoot'));
}

/** Validate storage data before passing it to geometry or UI code. Geometric
 * buildability (e.g. a slot outside the body) remains an editable design warning. */
export function isGliderGeometry(v: unknown): v is GliderDesign {
  if (!object(v) || !fields(v, ['id', 'name', 'description'], x => typeof x === 'string')
    || !choice(v.mode, ['simple', 'advanced'])) return false;
  const { material: m, fuselage: f, wing: w, horizontalStabilizer: t, verticalStabilizer: fin } = v;
  if (!object(m) || !object(f) || !object(w) || !object(t) || !object(fin)) return false;
  if (!fields(m, ['id', 'name'], x => typeof x === 'string')
    || !fields(m, ['densityKgM3', 'sheetThicknessMm'], positive) || !nonnegative(m.laserKerfMm)
    || !choice(m.grainOrientation, ['spanwise', 'chordwise'])) return false;
  if (!fields(f, ['lengthMm', 'maxHeightMm', 'noseLengthMm', 'noseHeightMm', 'tailBoomHeightMm', 'thicknessMm', 'pylonWidthMm'], positive)
    || !nonnegative(f.noseBallastGrams) || !finite(f.ballastPositionXMm)
    || typeof f.autoReinforceSpine !== 'boolean' || !slot(f.wingSlot) || !slot(f.tailSlot)
    || !choice(f.mountType, ['through_slot', 'top_saddle', 'bottom_saddle', 'parasol_pylon'])
    || !choice(f.profileStyle, ['trainer', 'sport_jet', 'curved_classic', 'sky_streak', 'custom'])
    || (f.integralFinInCustomNodes !== undefined && typeof f.integralFinInCustomNodes !== 'boolean')
    || (f.customNodes !== undefined && !nodes(f.customNodes, 'isFixed'))
    || (f.profileStyle === 'custom' && !nodes(f.customNodes, 'isFixed'))) return false;
  if (!surface(w) || !positive(w.spanMm) || !choice(w.planformType, planforms)
    || !finite(w.dihedralDeg) || Math.abs(w.dihedralDeg) >= 89 || !nonnegative(w.camberPercent)
    || !nonnegative(w.slotTabWidthMm) || typeof w.hasLeadingEdgeTaper !== 'boolean') return false;
  if (!surface(t) || !positive(t.spanMm) || (t.planformType !== undefined && !choice(t.planformType, planforms))) return false;
  if (!surface(fin) || !positive(fin.heightMm) || typeof fin.isIntegralWithFuselage !== 'boolean'
    || (fin.profileType !== undefined && !choice(fin.profileType, ['standard', 'custom']))) return false;
  const g = v as unknown as GliderDesign;
  return !(w.planformType === 'custom' && validateCustomWing(g.wing))
    && !(t.planformType === 'custom' && validateCustomWing(tailAsWing(g.horizontalStabilizer)))
    && !(fin.profileType === 'custom' && validateCustomFin(g.verticalStabilizer));
}
