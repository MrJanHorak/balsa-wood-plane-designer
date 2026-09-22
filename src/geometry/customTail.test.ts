import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { getTailPlanformPoints, tailAsWing, wingAsTail, seedWingNodes, resizeWing } from './customWing';
import { polygonArea } from './core';
import { computeCustomSurfaceAerodynamics, computeSurfaceAerodynamics } from '@/physics/aerodynamics';
import { analyzeGliderStability } from '@/physics/stability';
import { calculateGliderMassAndCG } from '@/physics/massBalance';
import { generateTailFlatPattern } from './patterns2d';
import { createTailMesh } from './extrusion3d';
import { createPlaneDesignDocument, serializePlaneDesign, deserializePlaneDesign } from '@/design/document';

function customDesign() {
  const g = structuredClone(DEFAULT_GLIDER);
  const tail = tailAsWing(g.horizontalStabilizer);
  g.horizontalStabilizer = wingAsTail({ ...tail, planformType: 'custom', customNodes: seedWingNodes(tail) });
  return g;
}

describe('horizontal tail shape integration', () => {
  it('preserves legacy tapered-tail geometry and aerodynamics', () => {
    const g = customDesign(), t = g.horizontalStabilizer, slot = g.fuselage.tailSlot;
    const integrated = computeCustomSurfaceAerodynamics(tailAsWing(t), slot.xPositionMm, slot.yPositionMm);
    const analytic = computeSurfaceAerodynamics(t.rootChordMm, t.tipChordMm, t.spanMm, t.sweepDeg, slot.xPositionMm, slot.yPositionMm);
    for (const key of Object.keys(analytic) as (keyof typeof analytic)[]) expect(integrated[key]).toBeCloseTo(analytic[key], 8);
    expect(analyzeGliderStability(g)).toEqual(analyzeGliderStability(DEFAULT_GLIDER));
  });
  it.each(['tapered', 'rectangular', 'elliptical', 'delta'] as const)('uses the same %s outline for mass, patterns, and aerodynamics', planformType => {
    const g = customDesign();
    g.horizontalStabilizer = { ...g.horizontalStabilizer, planformType, customNodes: undefined };
    const t = tailAsWing(g.horizontalStabilizer);
    const points = getTailPlanformPoints(g.horizontalStabilizer);
    const area = polygonArea(points);
    const aero = computeCustomSurfaceAerodynamics({ ...t, customNodes: seedWingNodes(t) }, 0, 0);
    expect(aero.areaMm2).toBeCloseTo(area, 7);
    const mass = calculateGliderMassAndCG(g).breakdown.tailGrams;
    expect(mass).toBeCloseTo(area * t.thicknessMm * g.material.densityKgM3 / 1e6, 2);
    const pattern = generateTailFlatPattern(g);
    expect(pattern.dimensions.heightMm).toBeCloseTo(t.spanMm);
  });
  it('moves the tail aerodynamic center and neutral point when tips move aft', () => {
    const g = customDesign();
    const initial = analyzeGliderStability(g);
    g.horizontalStabilizer.customNodes = g.horizontalStabilizer.customNodes!.map(n => n.yMm === 0 ? n : { ...n, xMm: n.xMm + 30 });
    const changed = analyzeGliderStability(g);
    expect(changed.tailAreaMm2).toEqual(initial.tailAreaMm2);
    expect(changed.tailAcXMm).toBeGreaterThan(initial.tailAcXMm);
    expect(changed.npXMm).toBeGreaterThan(initial.npXMm);
    expect(changed.cgXMm).toBeGreaterThan(initial.cgXMm);
    expect(g.wing).toEqual(DEFAULT_GLIDER.wing);
  });
  it('preserves a custom tail in save/load and rejects malformed nodes', () => {
    const g = customDesign();
    expect(deserializePlaneDesign(serializePlaneDesign(createPlaneDesignDocument(g))).geometry).toEqual(g);
    g.horizontalStabilizer.customNodes![0].yMm = 10;
    expect(() => deserializePlaneDesign(serializePlaneDesign(createPlaneDesignDocument(g)))).toThrow(/invalid/);
  });
  it('resizes the custom tail and includes its corners in 3D and the SVG outline', () => {
    const g = customDesign();
    const t = tailAsWing(g.horizontalStabilizer);
    t.customNodes!.splice(1, 0, { id: 'tail-crank', label: 'Crank', xMm: -10, yMm: 20 });
    g.horizontalStabilizer = wingAsTail(resizeWing(t, { spanMm: t.spanMm * 2, rootChordMm: t.rootChordMm * 2 }));
    expect(generateTailFlatPattern(g).outlinePath).toContain('-20.00 40.00');
    const material = new THREE.MeshBasicMaterial();
    const group = createTailMesh(g, material);
    const mesh = group.children[0] as THREE.Mesh;
    const positions = mesh.geometry.getAttribute('position');
    let found = false;
    for (let i = 0; i < positions.count; i++) if (Math.abs(positions.getX(i) + 20) < 0.001 && Math.abs(Math.abs(positions.getZ(i)) - 40) < 0.001) found = true;
    expect(found).toBe(true);
    mesh.geometry.dispose(); material.dispose();
  });
});
