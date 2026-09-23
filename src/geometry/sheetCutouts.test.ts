import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getFuselageCuts, subtractSheetCutouts } from './sheetCutouts';
import { polygonArea, sampleSmoothClosedCurve, calculateWingPlanformPoints, calculateCustomWingPlanformPoints } from './core';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { createFuselageMesh, createHalfWingGeometry, createTailMesh } from './extrusion3d';
import { getFuselageProfilePoints } from '@/physics/massBalance';
import { seedWingNodes } from './customWing';
import { computeCustomSurfaceAerodynamics } from '@/physics/aerodynamics';
import { analyzeGliderStability } from '@/physics/stability';
import { validateGliderDesign } from './validation';

const rectangle = (x: number, y: number, w: number, h: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
describe('sheet cut boundaries', () => {
  it('keeps enclosed cuts as holes', () => {
    const result = subtractSheetCutouts(rectangle(0, 0, 100, 30), [rectangle(40, 10, 20, 2)]);
    expect(result).toHaveLength(1);
    expect(result[0].holes).toHaveLength(1);
    expect(polygonArea(result[0].outline) - polygonArea(result[0].holes[0])).toBe(2960);
  });
  it('turns a rear-exiting slot into a notch with no invalid outside hole', () => {
    const result = subtractSheetCutouts(rectangle(0, 0, 100, 30), [rectangle(80, 10, 40, 2)]);
    expect(result).toHaveLength(1);
    expect(result[0].holes).toHaveLength(0);
    expect(polygonArea(result[0].outline)).toBe(2960);
  });
  it('represents disconnected pieces instead of joining them with spurious triangles', () => {
    const result = subtractSheetCutouts(rectangle(0, 0, 100, 30), [rectangle(-10, 10, 120, 2)]);
    expect(result).toHaveLength(2);
    expect(result.reduce((a, r) => a + polygonArea(r.outline), 0)).toBe(2800);
  });
  it('warns when a slot physically separates the body into pieces', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.profileStyle = 'custom';
    g.fuselage.customNodes = rectangle(0, 0, 250, 40).map((p, i) => ({ id: String(i), label: String(i), xMm: p.x, yMm: p.y }));
    g.fuselage.tailSlot = { ...g.fuselage.tailSlot, xPositionMm: -100, lengthMm: 500, yPositionMm: 20 };
    expect(validateGliderDesign(g).errors.some(e => e.id === 'fuselage_cut_disconnect')).toBe(true);
  });
  it.each([20, 36, 55, 90])('triangulates the full remaining fuselage after a %s mm tail-slot edit', lengthMm => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.tailSlot.lengthMm = lengthMm;
    const contour = sampleSmoothClosedCurve(getFuselageProfilePoints(g), 8);
    const regions = subtractSheetCutouts(contour, getFuselageCuts(g));
    const expected = regions.reduce((a, r) => a + polygonArea(r.outline) - r.holes.reduce((b, h) => b + polygonArea(h), 0), 0);
    const material = new THREE.MeshBasicMaterial();
    const mesh = createFuselageMesh(g, material).children[0] as THREE.Mesh;
    const p = mesh.geometry.getAttribute('position');
    let area = 0;
    for (let i = 0; i < p.count; i += 3) {
      if ([0, 1, 2].every(j => Math.abs(p.getZ(i + j) - g.fuselage.thicknessMm / 2) < 1e-5)) {
        area += Math.abs((p.getX(i + 1) - p.getX(i)) * (p.getY(i + 2) - p.getY(i)) - (p.getX(i + 2) - p.getX(i)) * (p.getY(i + 1) - p.getY(i))) / 2;
      }
    }
    expect(area).toBeCloseTo(expected, 2);
    mesh.geometry.dispose(); material.dispose();
  });
  it('keeps the tail at its specified sheet thickness without bevel overlap', () => {
    const material = new THREE.MeshBasicMaterial();
    const mesh = createTailMesh(DEFAULT_GLIDER, material).children[0] as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox!.max.y - mesh.geometry.boundingBox!.min.y).toBeCloseTo(DEFAULT_GLIDER.horizontalStabilizer.thicknessMm, 5);
    mesh.geometry.dispose(); material.dispose();
  });
});

describe('elliptical wing canonical outline', () => {
  it('has identical geometry and aerodynamic results before and after entering custom mode', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.wing.planformType = 'elliptical';
    const nodes = seedWingNodes(g.wing);
    const expected = calculateCustomWingPlanformPoints(nodes.map(n => ({ x: n.xMm, y: n.yMm })));
    const actual = calculateWingPlanformPoints('elliptical', g.wing.rootChordMm, g.wing.tipChordMm, g.wing.spanMm, g.wing.sweepDeg);
    expect(actual).toEqual(expected);
    const before = analyzeGliderStability(g);
    const mesh = createHalfWingGeometry(g);
    g.wing = { ...g.wing, planformType: 'custom', customNodes: nodes };
    expect(analyzeGliderStability(g)).toEqual(before);
    const customMesh = createHalfWingGeometry(g);
    expect(customMesh.getAttribute('position').array).toEqual(mesh.getAttribute('position').array);
    const aero = computeCustomSurfaceAerodynamics(g.wing, 0, 0);
    expect(aero.areaMm2).toBeCloseTo(polygonArea(expected), 8);
    mesh.dispose(); customMesh.dispose();
  });
});
