import { WingConfig, WingNode, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import { getWingStationAt } from './core';

/** Editable wings have one leading and trailing edge at each span station. */
export function validateCustomWing(wing: WingConfig): string | null {
  const nodes = wing.customNodes;
  if (!Array.isArray(nodes) || nodes.length < 4 || nodes.length > 128) return 'Use 4–128 wing points.';
  if (nodes.some(n => !n || typeof n.id !== 'string' || typeof n.label !== 'string' || !Number.isFinite(n.xMm) || !Number.isFinite(n.yMm))) return 'Wing points must have finite coordinates and labels.';
  if (new Set(nodes.map(n => n.id)).size !== nodes.length) return 'Wing point IDs must be unique.';
  const first = nodes[0], last = nodes[nodes.length - 1];
  const span = wing.spanMm / 2;
  if (!Number.isFinite(span) || span <= 1 || !Number.isFinite(wing.rootChordMm) || wing.rootChordMm < 2) return 'Wing dimensions must be positive.';
  if (Math.abs(first.xMm) > 1e-6 || Math.abs(first.yMm) > 1e-6 || Math.abs(last.yMm) > 1e-6 || Math.abs(last.xMm - wing.rootChordMm) > 1e-6) return 'Root points must match the center chord on the centerline.';
  const tip = nodes.findIndex(n => Math.abs(n.yMm - span) < 1e-6);
  if (tip < 1 || tip + 1 >= nodes.length - 1 || Math.abs(nodes[tip + 1].yMm - span) > 1e-6) return 'Keep two wingtip points at half the wingspan.';
  for (let i = 1; i < nodes.length; i++) {
    if (i === tip + 1) continue;
    const step = i <= tip ? nodes[i].yMm - nodes[i - 1].yMm : nodes[i - 1].yMm - nodes[i].yMm;
    if (step < 0.1 - 1e-7) return 'Edges must run from root to tip without folding back; space points at least 0.1 mm apart along the span.';
  }
  for (const node of nodes) {
    const station = getWingStationAt('custom', wing.rootChordMm, wing.tipChordMm, wing.spanMm, 0, node.yMm / span, nodes.map(n => ({ x: n.xMm, y: n.yMm })));
    if (station.chord < 2 - 1e-6) return 'Leading and trailing edges must stay at least 2 mm apart.';
  }
  return null;
}

export function seedWingNodes(wing: WingConfig): WingNode[] {
  if (wing.planformType === 'custom' && !validateCustomWing(wing)) return structuredClone(wing.customNodes!);
  const count = wing.planformType === 'elliptical' ? 16 : 1;
  const leading: WingNode[] = [], trailing: WingNode[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const { xLE, chord } = getWingStationAt(getWingPlanformKind(wing.planformType), wing.rootChordMm, getEffectiveTipChordMm(wing), wing.spanMm, wing.sweepDeg, t);
    leading.push({ id: `le-${i}`, label: i === 0 ? 'Root leading edge' : i === count ? 'Tip leading edge' : `Leading edge ${i}`, xMm: xLE, yMm: t * wing.spanMm / 2, isFixedRoot: i === 0 });
    trailing.push({ id: `te-${i}`, label: i === 0 ? 'Root trailing edge' : i === count ? 'Tip trailing edge' : `Trailing edge ${i}`, xMm: xLE + chord, yMm: t * wing.spanMm / 2, isFixedRoot: i === 0 });
  }
  return [...leading, ...trailing.reverse()];
}

export function resizeWing(wing: WingConfig, fields: Partial<WingConfig>): WingConfig {
  const next = { ...wing, ...fields };
  if (next.planformType !== 'custom') return { ...next, customNodes: undefined };
  if (!wing.customNodes) return next;
  const sx = next.rootChordMm / wing.rootChordMm, sy = next.spanMm / wing.spanMm;
  return { ...next, tipChordMm: wing.tipChordMm * sx, customNodes: wing.customNodes.map(n => ({ ...n, xMm: n.xMm * sx, yMm: n.yMm * sy })) };
}
