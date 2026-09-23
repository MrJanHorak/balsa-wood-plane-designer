import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { exportPatternSvg } from './exportSvg';
import { createFuselageMesh, createWingMesh } from './extrusion3d';
import { generatePylonFlatPattern, generateWingFlatPattern } from './patterns2d';
import { getPylonGeometry } from './pylon';
import { calculateGliderMassAndCG } from '@/physics/massBalance';
import { validateGliderDesign } from './validation';

describe('manufacturing exports and assembly', () => {
  it('exports physical millimetres and toolpath groups without preview decoration', () => {
    const svg = exportPatternSvg(DEFAULT_GLIDER);
    const dimensions = svg.match(/width="([\d.]+)mm" height="([\d.]+)mm" viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
    expect(dimensions).not.toBeNull();
    expect(dimensions[1]).toBe(dimensions[3]);
    expect(dimensions[2]).toBe(dimensions[4]);
    expect(Number(dimensions[1])).toBeGreaterThanOrEqual(DEFAULT_GLIDER.wing.spanMm + 20);
    expect(svg).toContain('id="cut" fill="none"');
    expect(svg).toContain('id="score-guides" fill="none"');
    expect(svg).not.toMatch(/<rect|<text|stroke-dasharray|class=/);
    expect(svg).toContain('data-thickness-mm="3.175"');
    expect(svg).toContain('data-thickness-mm="1.5875"');
  });
  it('escapes design names rather than inserting markup', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.name = '<script>alert("cut")</script> & glider';
    const svg = exportPatternSvg(g);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;alert(&quot;cut&quot;)');
  });
  it('includes only the physical parts for the selected construction', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    expect(exportPatternSvg(g)).not.toMatch(/id="cut-(vertical_fin|parasol_pylon)"/);
    g.fuselage.mountType = 'parasol_pylon';
    g.verticalStabilizer.isIntegralWithFuselage = false;
    const svg = exportPatternSvg(g);
    expect(svg).toContain('id="cut-parasol_pylon"');
    expect(svg).toContain('id="cut-vertical_fin"');
  });
  it('does not score a wing that has no dihedral', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.wing.dihedralDeg = 0;
    expect(generateWingFlatPattern(g).scoreLines).toEqual([]);
    const material = new THREE.MeshBasicMaterial();
    const wing = createWingMesh(g, material);
    expect(wing.children).toHaveLength(2); // No duplicate center-tab solid.
    for (const child of wing.children) (child as THREE.Mesh).geometry.dispose();
    material.dispose();
  });
  it('uses exact pylon dimensions in the mesh, cutting pattern and mass', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.mountType = 'parasol_pylon';
    g.fuselage.wingSlot.yPositionMm = g.fuselage.maxHeightMm + 20;
    const pylon = getPylonGeometry(g);
    expect(pylon.height).toBe(24);
    const expectedMass = 0.9 * g.fuselage.pylonWidthMm * 24 * g.fuselage.thicknessMm * g.material.densityKgM3 / 1e6;
    expect(calculateGliderMassAndCG(g).breakdown.pylonGrams).toBeCloseTo(expectedMass, 2);
    const pattern = generatePylonFlatPattern(g);
    expect(pattern.dimensions).toEqual({ widthMm: pylon.width, heightMm: 24 });
    const material = new THREE.MeshBasicMaterial();
    const group = createFuselageMesh(g, material);
    const mesh = group.children[1] as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    expect(box.max.z - box.min.z).toBeCloseTo(g.fuselage.thicknessMm, 5);
    expect(box.min.x).toBeCloseTo(pylon.origin.x, 5);
    expect(box.max.y - box.min.y).toBeCloseTo(24, 5);
    for (const child of group.children) (child as THREE.Mesh).geometry.dispose();
    material.dispose();
    g.fuselage.mountType = 'through_slot';
    expect(calculateGliderMassAndCG(g).breakdown.pylonGrams).toBe(0);
  });
  it('accounts for pylon first moments when its width changes', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.mountType = 'parasol_pylon';
    g.fuselage.wingSlot.yPositionMm = g.fuselage.maxHeightMm + 20;
    g.fuselage.noseBallastGrams = 0;
    g.fuselage.pylonWidthMm = 20;
    const before = calculateGliderMassAndCG(g);
    g.fuselage.pylonWidthMm = 40;
    const after = calculateGliderMassAndCG(g);
    const added = 0.9 * 20 * 24 * g.fuselage.thicknessMm * g.material.densityKgM3 / 1e6;
    const cx = g.fuselage.wingSlot.xPositionMm + g.fuselage.wingSlot.lengthMm / 2;
    // Each displayed total is rounded to 0.01 g, so their difference can lose 0.01 g.
    expect(Math.abs(after.unballastedMassGrams - before.unballastedMassGrams - added)).toBeLessThan(0.01);
    expect(after.cgXMm).toBeCloseTo((before.unballastedCgXMm * before.unballastedMassGrams + cx * added) / (before.unballastedMassGrams + added), 1);
  });
  it('detects a tight slot, a short root opening, and unsupported camber flattening', () => {
    const g = structuredClone(DEFAULT_GLIDER);
    g.fuselage.wingSlot.thicknessMm = 1;
    g.fuselage.wingSlot.lengthMm = g.wing.rootChordMm - 2;
    const report = validateGliderDesign(g);
    expect(report.errors.map(e => e.id)).toEqual(expect.arrayContaining(['wing_slot_too_tight', 'wing_slot_short']));
    expect(report.warnings.some(e => e.id === 'wing_pattern_camber')).toBe(true);
    g.fuselage.mountType = 'parasol_pylon';
    expect(validateGliderDesign(g).errors.map(e => e.id)).not.toEqual(expect.arrayContaining(['wing_slot_too_tight']));
  });
});
