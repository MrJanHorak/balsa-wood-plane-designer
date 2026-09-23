import * as THREE from 'three';
import { GliderDesign, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import { seedWingNodes } from './customWing';
import { getWingStationAt, getCamberElevation } from './core';

/** Bend around the root mean line rather than the global X axis; rotating a
 * cambered root about Y=0 separates its two halves at the center seam. */
export function createAssembledHalfWingGeometry(glider: GliderDesign) {
  const geometry = createHalfWingGeometry(glider);
  const positions = geometry.getAttribute('position');
  const angle = glider.wing.dihedralDeg * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const hinge = getCamberElevation(x / glider.wing.rootChordMm, glider.wing.rootChordMm, glider.wing.camberPercent);
    positions.setXYZ(i, x, hinge + (y - hinge) * c - z * s, (y - hinge) * s + z * c);
  }
  geometry.computeVertexNormals();
  return geometry;
}
export function createHalfWingGeometry(glider: GliderDesign): THREE.BufferGeometry {
  const { wing } = glider;
  const cr = wing.rootChordMm;
  const ct = getEffectiveTipChordMm(wing);
  const halfSpan = wing.spanMm / 2;
  const planformKind = wing.planformType === 'elliptical' ? 'custom' : getWingPlanformKind(wing.planformType);
  const surfaceNodes = planformKind === 'custom' ? seedWingNodes(wing).map(n => ({ x: n.xMm, y: n.yMm })) : undefined;
  const thickness = wing.thicknessMm;
  const camberPercent = wing.camberPercent;

  const N = 24; // Chordwise segments
  // Include every custom corner so sharp sweep changes match the cutting pattern.
  const spanStations = [...new Set([
    ...Array.from({ length: 25 }, (_, i) => i / 24),
    ...(surfaceNodes ?? []).map(n => n.y / halfSpan),
  ])].sort((a, b) => a - b);
  const M = spanStations.length - 1;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function addVertex(x: number, y: number, z: number, u: number, v: number): number {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, v);
    return idx;
  }

  function addQuad(a: number, b: number, c: number, d: number) {
    indices.push(a, b, c);
    indices.push(a, c, d);
  }

  // Leading edge X and chord at span fraction t in [0, 1] — sourced from the
  // canonical geometry engine so this mesh can never silently diverge from
  // the 2D pattern export or physics area calculations.
  function getStationGeometry(t: number): { xLE: number; chord: number } {
    return getWingStationAt(planformKind, cr, ct, wing.spanMm, wing.sweepDeg, t, surfaceNodes);
  }

  // Build Upper and Lower grids
  const upperGrid: number[][] = [];
  const lowerGrid: number[][] = [];

  for (let j = 0; j <= M; j++) {
    const t = spanStations[j];
    const z = -t * halfSpan; // Along negative Z so dihedral rotates up
    const { xLE, chord } = getStationGeometry(t);
    const upperRow: number[] = [];
    const lowerRow: number[] = [];

    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const x = xLE + s * chord;
      const camb = getCamberElevation(s, chord, camberPercent);
      const yUpper = camb + thickness / 2;
      const yLower = camb - thickness / 2;
      const u = x / 100;
      const v = (t * halfSpan) / 100;

      upperRow.push(addVertex(x, yUpper, z, u, v));
      lowerRow.push(addVertex(x, yLower, z, u, v));
    }
    upperGrid.push(upperRow);
    lowerGrid.push(lowerRow);
  }

  // Upper Surface Quads (Normal pointing OUT / +Y)
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const a = upperGrid[j][i];
      const b = upperGrid[j][i + 1];
      const c = upperGrid[j + 1][i + 1];
      const d = upperGrid[j + 1][i];
      addQuad(a, b, c, d);
    }
  }

  // Lower Surface Quads (Normal pointing OUT / -Y)
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const a = lowerGrid[j][i];
      const b = lowerGrid[j][i + 1];
      const c = lowerGrid[j + 1][i + 1];
      const d = lowerGrid[j + 1][i];
      addQuad(a, d, c, b);
    }
  }

  // Leading Edge Skirt (connecting s = 0 from root to tip, normal pointing forward / -X)
  const leUpper: number[] = [];
  const leLower: number[] = [];
  for (let j = 0; j <= M; j++) {
    const t = spanStations[j];
    const z = -t * halfSpan;
    const { xLE } = getStationGeometry(t);
    const v = (t * halfSpan) / 100;
    leUpper.push(addVertex(xLE, thickness / 2, z, 0, v));
    leLower.push(addVertex(xLE, -thickness / 2, z, 0.05, v));
  }
  for (let j = 0; j < M; j++) {
    const a = leUpper[j];
    const b = leUpper[j + 1];
    const c = leLower[j + 1];
    const d = leLower[j];
    addQuad(d, a, b, c);
  }

  // Trailing Edge Skirt (connecting s = 1 from root to tip, normal pointing aft / +X)
  const teUpper: number[] = [];
  const teLower: number[] = [];
  for (let j = 0; j <= M; j++) {
    const t = spanStations[j];
    const z = -t * halfSpan;
    const { xLE, chord } = getStationGeometry(t);
    const xTE = xLE + chord;
    const v = (t * halfSpan) / 100;
    teUpper.push(addVertex(xTE, thickness / 2, z, 0, v));
    teLower.push(addVertex(xTE, -thickness / 2, z, 0.05, v));
  }
  for (let j = 0; j < M; j++) {
    const a = teUpper[j];
    const b = teUpper[j + 1];
    const c = teLower[j + 1];
    const d = teLower[j];
    addQuad(a, d, c, b);
  }

  // Root Rib Skirt (t = 0, z = 0, normal pointing toward center / +Z)
  const rootUpper: number[] = [];
  const rootLower: number[] = [];
  const { chord: rootChord } = getStationGeometry(0);
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = s * rootChord;
    const camb = getCamberElevation(s, rootChord, camberPercent);
    rootUpper.push(addVertex(x, camb + thickness / 2, 0, x / 100, 0));
    rootLower.push(addVertex(x, camb - thickness / 2, 0, x / 100, 0.05));
  }
  for (let i = 0; i < N; i++) {
    const a = rootUpper[i];
    const b = rootUpper[i + 1];
    const c = rootLower[i + 1];
    const d = rootLower[i];
    addQuad(d, c, b, a);
  }

  // Tip Rib Skirt (t = 1, z = -halfSpan, normal pointing outward / -Z)
  const tipUpper: number[] = [];
  const tipLower: number[] = [];
  const { xLE: tipLE, chord: tipChord } = getStationGeometry(1);
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = tipLE + s * tipChord;
    const camb = getCamberElevation(s, tipChord, camberPercent);
    tipUpper.push(addVertex(x, camb + thickness / 2, -halfSpan, x / 100, 0));
    tipLower.push(addVertex(x, camb - thickness / 2, -halfSpan, x / 100, 0.05));
  }
  for (let i = 0; i < N; i++) {
    const a = tipUpper[i];
    const b = tipUpper[i + 1];
    const c = tipLower[i + 1];
    const d = tipLower[i];
    addQuad(a, b, c, d);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

