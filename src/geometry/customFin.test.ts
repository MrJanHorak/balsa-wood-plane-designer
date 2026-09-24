import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { finAsWing, wingAsFin, getFinProfilePoints, validateCustomFin } from './customFin';
import { seedWingNodes, resizeWing } from './customWing';
import { polygonArea } from './core';
import { getFuselageContourPoints, getFuselageProfilePoints, calculateGliderMassAndCG } from '@/physics/massBalance';
import { generateFinFlatPattern, generateFuselageFlatPattern } from './patterns2d';
import { createFinMesh, createFuselageMesh } from './extrusion3d';
import { createPlaneDesignDocument, serializePlaneDesign, deserializePlaneDesign } from '@/design/document';

function design(integral: boolean) {
  const g = structuredClone(DEFAULT_GLIDER);
  const wing = finAsWing(g.verticalStabilizer);
  g.verticalStabilizer = wingAsFin({ ...wing, planformType: 'custom', customNodes: seedWingNodes(wing) }, { ...g.verticalStabilizer, isIntegralWithFuselage: integral });
  return g;
}

describe('vertical fin editing', () => {
  it('keeps a single profile with the correct area, not a mirrored wing', () => {
    const g = design(false), fin = g.verticalStabilizer;
    expect(validateCustomFin(fin)).toBeNull();
    expect(polygonArea(getFinProfilePoints(fin))).toBeCloseTo((fin.rootChordMm + fin.tipChordMm) * fin.heightMm / 2);
    const pattern = generateFinFlatPattern(g);
    expect(pattern.dimensions.heightMm).toBe(fin.heightMm);
    const mass = calculateGliderMassAndCG(g).breakdown.finGrams;
    expect(mass).toBeCloseTo(polygonArea(getFinProfilePoints(fin)) * fin.thicknessMm * g.material.densityKgM3 / 1e6, 2);
  });
  it.each([false, true])('updates geometry and mass for an edited fin (integral=%s)', integral => {
    const g = design(integral);
    const before = calculateGliderMassAndCG(g).breakdown.totalGrams;
    g.verticalStabilizer.customNodes!.splice(1, 0, { id: 'crank', label: 'Edge', xMm: -20, yMm: g.verticalStabilizer.heightMm / 2 });
    expect(validateCustomFin(g.verticalStabilizer)).toBeNull();
    expect(calculateGliderMassAndCG(g).breakdown.totalGrams).toBeGreaterThan(before);
    const material = new THREE.MeshBasicMaterial();
    const mesh = (integral ? createFuselageMesh(g, material) : createFinMesh(g, material)).children[0] as THREE.Mesh;
    const p = mesh.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) expect(Number.isFinite(p.getX(i)) && Number.isFinite(p.getY(i))).toBe(true);
    if (integral) {
      expect(calculateGliderMassAndCG(g).breakdown.finGrams).toBe(0);
      expect(createFinMesh(g, material).children).toHaveLength(0);
      const outline = getFuselageContourPoints(g);
      expect(generateFuselageFlatPattern(g).boundingBox.maxY).toBe(Math.max(...outline.map(p => p.y)));
    } else expect(generateFinFlatPattern(g).outlinePath).toContain('-20.00');
    mesh.geometry.dispose(); material.dispose();
  });
  it('keeps a custom integral fin when the body also has custom nodes', () => {
    const g = design(true);
    g.fuselage.profileStyle = 'custom';
    g.fuselage.customNodes = [{ xMm: 0, yMm: 0 }, { xMm: 0, yMm: 20 }, { xMm: 260, yMm: 20 }, { xMm: 260, yMm: 0 }].map((n, i) => ({ ...n, id: String(i), label: String(i) }));
    expect(Math.max(...getFuselageContourPoints(g).map(p => p.y))).toBeGreaterThan(40);
  });
  it('keeps new custom body nodes separate from the integral fin controls', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    const bodyOnly = getFuselageProfilePoints({
      ...g, verticalStabilizer: { ...g.verticalStabilizer, isIntegralWithFuselage: false },
    });
    g.fuselage.profileStyle = 'custom';
    g.fuselage.customNodes = bodyOnly.map((p, i) => ({ id: `body-${i}`, label: `Body ${i}`, xMm: p.x, yMm: p.y }));
    g.fuselage.integralFinInCustomNodes = false;
    const initial = getFuselageContourPoints(g);
    const initialTop = Math.max(...initial.map(p => p.y));
    const initialMass = calculateGliderMassAndCG(g).breakdown.fuselageGrams;
    g.verticalStabilizer.heightMm += 15;
    const taller = getFuselageContourPoints(g);
    expect(Math.max(...taller.map(p => p.y))).toBeGreaterThan(initialTop + 10);
    expect(calculateGliderMassAndCG(g).breakdown.fuselageGrams).toBeGreaterThan(initialMass);
    expect(generateFuselageFlatPattern(g).boundingBox.maxY).toBe(Math.max(...taller.map(p => p.y)));
    g.verticalStabilizer.isIntegralWithFuselage = false;
    expect(Math.max(...getFuselageContourPoints(g).map(p => p.y))).toBeLessThan(initialTop);
  });
  it('preserves an older custom fuselage outline with a baked standard fin', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    const oldOutline = getFuselageProfilePoints(g);
    oldOutline.splice(8, 0,
      { x: 225, y: 12 }, { x: 240, y: 54 }, { x: 260, y: 54 }, { x: 263, y: 12 });
    g.fuselage.profileStyle = 'custom';
    g.fuselage.customNodes = oldOutline.map((p, i) => ({ id: `old-${i}`, label: `Point ${i}`, xMm: p.x, yMm: p.y }));
    const before = getFuselageContourPoints(g);
    g.verticalStabilizer.heightMm += 20;
    expect(getFuselageContourPoints(g)).toEqual(before);
  });
  it('moves the integral fin when the tail position slider changes', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    const before = getFuselageContourPoints(g).filter(p => p.y > 45);
    g.fuselage.tailSlot.xPositionMm -= 12;
    const moved = getFuselageContourPoints(g).filter(p => p.y > 45);
    expect(Math.min(...moved.map(p => p.x))).toBeLessThan(Math.min(...before.map(p => p.x)) - 8);
  });
  it('rescales fin nodes and preserves attachment mode', () => {
    const fin = design(true).verticalStabilizer;
    const resized = wingAsFin(resizeWing(finAsWing(fin), { spanMm: fin.heightMm * 4, rootChordMm: fin.rootChordMm * 2 }), fin);
    expect(validateCustomFin(resized)).toBeNull();
    expect(resized.isIntegralWithFuselage).toBe(true);
    expect(polygonArea(getFinProfilePoints(resized))).toBeCloseTo(polygonArea(getFinProfilePoints(fin)) * 4);
  });
  it('round-trips custom fins and rejects malformed fin imports', () => {
    const g = design(true);
    expect(deserializePlaneDesign(serializePlaneDesign(createPlaneDesignDocument(g))).geometry.verticalStabilizer).toEqual(g.verticalStabilizer);
    g.verticalStabilizer.customNodes![0].xMm = 5;
    expect(() => deserializePlaneDesign(serializePlaneDesign(createPlaneDesignDocument(g)))).toThrow(/invalid/);
  });
});
