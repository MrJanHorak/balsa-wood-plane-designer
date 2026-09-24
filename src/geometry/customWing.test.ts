import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { seedWingNodes, resizeWing, validateCustomWing, nudgeSurfaceNode, tailAsWing } from './customWing';
import { calculateCustomWingPlanformPoints, polygonArea, polygonCentroid } from './core';
import { computeCustomWingAerodynamics, computeSurfaceAerodynamics } from '@/physics/aerodynamics';
import { createPlaneDesignDocument, deserializePlaneDesign, serializePlaneDesign } from '@/design/document';
import { createHalfWingGeometry } from './extrusion3d';
import { generateWingFlatPattern } from './patterns2d';
import { analyzeGliderStability } from '@/physics/stability';

function design() {
  const glider = structuredClone(DEFAULT_GLIDER);
  glider.wing = { ...glider.wing, planformType: 'tapered', spanMm: 400, rootChordMm: 60, tipChordMm: 30, sweepDeg: 12 };
  glider.wing.customNodes = seedWingNodes(glider.wing);
  glider.wing.planformType = 'custom';
  return glider;
}

describe('custom wing workflow', () => {
  it('nudges wing and tail points in screen directions while keeping roots and tips constrained', () => {
    const wing = design().wing;
    const nodes = wing.customNodes!;
    const tip = nodes[1];
    const moved = nudgeSurfaceNode(wing, nodes, tip.id, 'ArrowDown', 1, false)!;
    expect(moved[1].xMm).toBe(tip.xMm + 1);
    expect(validateCustomWing({ ...wing, customNodes: moved })).toBeNull();
    expect(nudgeSurfaceNode(wing, nodes, tip.id, 'ArrowRight', 1, false)).toBeNull();
    expect(nudgeSurfaceNode(wing, nodes, nodes[0].id, 'ArrowDown', 1, false)).toBeNull();

    const tail = tailAsWing(DEFAULT_GLIDER.horizontalStabilizer);
    const tailNodes = seedWingNodes(tail);
    const shifted = nudgeSurfaceNode(tail, tailNodes, tailNodes[1].id, 'ArrowUp', 5, false)!;
    expect(shifted[1].xMm).toBe(tailNodes[1].xMm - 5);
    expect(validateCustomWing({ ...tail, planformType: 'custom', customNodes: shifted })).toBeNull();
  });
  it('uses the rotated screen directions for the vertical fin', () => {
    const wing = design().wing;
    const nodes = wing.customNodes!;
    const moved = nudgeSurfaceNode(wing, nodes, nodes[1].id, 'ArrowRight', 1, true)!;
    expect(moved[1].xMm).toBe(nodes[1].xMm + 1);
    expect(nudgeSurfaceNode(wing, nodes, nodes[1].id, 'ArrowUp', 1, true)).toBeNull();
  });
  it.each(['rectangular', 'tapered', 'elliptical', 'delta'] as const)('seeds a valid symmetric %s outline', planformType => {
    const wing = { ...design().wing, planformType };
    const nodes = seedWingNodes(wing);
    expect(validateCustomWing({ ...wing, planformType: 'custom', customNodes: nodes })).toBeNull();
    const points = calculateCustomWingPlanformPoints(nodes.map(n => ({ x: n.xMm, y: n.yMm })));
    for (const p of points) expect(points.some(q => q.x === p.x && q.y === -p.y)).toBe(true);
    expect(polygonCentroid(points).y).toBeCloseTo(0);
    expect(polygonArea(points)).toBeGreaterThan(0);
  });
  it('matches analytic tapered wing aerodynamics', () => {
    const g = design();
    const actual = computeCustomWingAerodynamics(g);
    const expected = computeSurfaceAerodynamics(60, 30, 400, 12, g.fuselage.wingSlot.xPositionMm, g.fuselage.wingSlot.yPositionMm);
    for (const key of ['areaMm2', 'macMm', 'acXMm', 'macYOffsetMm', 'cLAlphaPerRad'] as const) expect(actual[key]).toBeCloseTo(expected[key], 8);
  });
  it('rescales coordinates and aerodynamic area without mutating the original', () => {
    const g = design();
    const scaled = resizeWing(g.wing, { spanMm: 800, rootChordMm: 120 });
    expect(validateCustomWing(scaled)).toBeNull();
    expect(computeCustomWingAerodynamics({ ...g, wing: scaled }).areaMm2).toBeCloseTo(computeCustomWingAerodynamics(g).areaMm2 * 4);
    expect(g.wing.customNodes![1].yMm).toBe(200);
    expect(scaled.customNodes![1].yMm).toBe(400);
  });
  it('rejects crossing edges, folded edges, incorrect roots, and malformed imports', () => {
    const g = design();
    g.wing.customNodes![2].xMm = g.wing.customNodes![1].xMm - 5;
    expect(validateCustomWing(g.wing)).toMatch(/apart/);
    expect(() => deserializePlaneDesign(serializePlaneDesign(createPlaneDesignDocument(g)))).toThrow();
    const malformed = createPlaneDesignDocument(design()) as unknown as { geometry: { wing: { customNodes: unknown } } };
    malformed.geometry.wing.customNodes = {};
    expect(() => deserializePlaneDesign(JSON.stringify(malformed))).toThrow(/invalid/);
    const root = design().wing; root.customNodes![0].xMm = 1;
    expect(validateCustomWing(root)).toMatch(/Root/);
    const folded = design().wing;
    folded.customNodes!.splice(1, 0, { id: 'fold', label: 'Fold', xMm: 0, yMm: 210 });
    expect(validateCustomWing(folded)).toMatch(/folding/);
  });
  it('preserves custom nodes and balance through JSON save/load', () => {
    const g = design();
    const restored = deserializePlaneDesign(serializePlaneDesign(createPlaneDesignDocument(g)));
    expect(restored.geometry.wing).toEqual(g.wing);
    expect(analyzeGliderStability(restored.geometry)).toEqual(analyzeGliderStability(g));
  });
  it('keeps negative centroid coordinates for forward-swept wings in either winding', () => {
    const points = [{ x: -20, y: -10 }, { x: -10, y: -10 }, { x: -10, y: 0 }, { x: -20, y: 0 }];
    expect(polygonCentroid(points)).toEqual({ x: -15, y: -5 });
    expect(polygonCentroid([...points].reverse())).toEqual({ x: -15, y: -5 });
  });
  it('includes a sweep crank in the mesh and exact cutting outline', () => {
    const g = design();
    g.wing.customNodes!.splice(1, 0, { id: 'crank', label: 'Crank', xMm: -20, yMm: 73 });
    expect(validateCustomWing(g.wing)).toBeNull();
    const geometry = createHalfWingGeometry(g);
    const positions = geometry.getAttribute('position');
    let found = false;
    for (let i = 0; i < positions.count; i++) {
      expect(Number.isFinite(positions.getY(i))).toBe(true);
      if (positions.getX(i) === -20 && positions.getZ(i) === -73) found = true;
    }
    expect(found).toBe(true);
    expect(generateWingFlatPattern(g).outlinePath).toContain('-20.00 73.00');
    const points = calculateCustomWingPlanformPoints(g.wing.customNodes!.map(n => ({ x: n.xMm, y: n.yMm })));
    expect(computeCustomWingAerodynamics(g).areaMm2).toBeCloseTo(polygonArea(points));
    geometry.dispose();
  });
});
