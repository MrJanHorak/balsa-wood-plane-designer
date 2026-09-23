import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { getWingJointCuts } from './wingJoint';
import { createWingMesh } from './extrusion3d';
import { calculateBoundingBox, polygonArea, getCamberElevation, isPointInPolygon } from './core';
import { seedWingNodes } from './customWing';

describe('center wing joint', () => {
  it('preserves the nominal slot for a straight flat wing with no dihedral', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    Object.assign(g.wing, { planformType: 'rectangular', camberPercent: 0, dihedralDeg: 0, sweepDeg: 0 });
    g.fuselage.wingSlot.angleDeg = 0;
    const cuts = getWingJointCuts(g);
    expect(cuts).toHaveLength(1);
    expect(polygonArea(cuts[0])).toBeCloseTo(g.fuselage.wingSlot.lengthMm * g.fuselage.wingSlot.thicknessMm, 4);
  });
  it.each([2, 6])('adds the analytically required dihedral relief through a %s mm fuselage', thicknessMm => {
    const g = structuredClone(DEFAULT_GLIDER);
    Object.assign(g.wing, { planformType: 'rectangular', camberPercent: 0, dihedralDeg: 12, sweepDeg: 0 });
    g.fuselage.thicknessMm = thicknessMm;
    g.fuselage.wingSlot.angleDeg = 0;
    const a = g.wing.dihedralDeg * Math.PI / 180;
    const expectedUpper = g.fuselage.wingSlot.yPositionMm + thicknessMm / 2 * Math.tan(a)
      + g.wing.thicknessMm / (2 * Math.cos(a))
      + (g.fuselage.wingSlot.thicknessMm - g.wing.thicknessMm) / 2;
    expect(calculateBoundingBox(getWingJointCuts(g).flat()).maxY).toBeCloseTo(expectedUpper, 4);
  });
  it('keeps a cambered root mean line on the center seam after folding', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.wingSlot.angleDeg = 0;
    const material = new THREE.MeshBasicMaterial();
    const wing = createWingMesh(g, material);
    const p = (wing.children[0] as THREE.Mesh).geometry.getAttribute('position');
    // Upper/lower grid vertices are interleaved; first row is the root section.
    for (let i = 0; i < 25; i++) {
      expect((p.getZ(i * 2) + p.getZ(i * 2 + 1)) / 2).toBeCloseTo(0, 6);
      expect((p.getY(i * 2) + p.getY(i * 2 + 1)) / 2).toBeCloseTo(getCamberElevation(i / 24, g.wing.rootChordMm, g.wing.camberPercent), 5);
    }
    for (const child of wing.children) (child as THREE.Mesh).geometry.dispose();
    material.dispose();
  });
  it.each(['rectangular', 'tapered', 'elliptical', 'custom'] as const)('contains assembled interior surface samples for a %s wing', planformType => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.wing.customNodes = seedWingNodes(g.wing);
    g.wing.planformType = planformType;
    g.fuselage.thicknessMm = 8;
    const cuts = getWingJointCuts(g);
    const material = new THREE.MeshBasicMaterial();
    const group = createWingMesh(g, material);
    group.updateMatrixWorld(true);
    let checked = 0;
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      const p = mesh.geometry.getAttribute('position');
      const indices = mesh.geometry.getIndex()!;
      for (let i = 0; i < indices.count; i += 3) {
        const triangle = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, indices.getX(i + j)).applyMatrix4(mesh.matrixWorld));
        // Independent barycentric samples near the root, not just mesh vertices.
        for (const weight of [0.01, 0.1, 0.5]) {
          const point = triangle[0].clone().multiplyScalar(1 - weight).addScaledVector(triangle[1], weight / 2).addScaledVector(triangle[2], weight / 2);
          if (Math.abs(point.z) >= 4 || point.x <= g.fuselage.wingSlot.xPositionMm + 1 || point.x >= g.fuselage.wingSlot.xPositionMm + g.wing.rootChordMm - 1) continue;
          // Clearance puts upper/lower surface interiors strictly inside the cut.
          expect(cuts.some(cut => isPointInPolygon({ x: point.x, y: point.y }, cut))).toBe(true);
          checked++;
        }
      }
      mesh.geometry.dispose();
    }
    material.dispose();
    expect(checked).toBeGreaterThan(100);
  });
});
