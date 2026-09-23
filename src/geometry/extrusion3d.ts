import * as THREE from 'three';
import { getPylonGeometry } from './pylon';
import { getFinProfilePoints } from './customFin';
import { getTailPlanformPoints } from './customWing';
import { getFuselageCuts, subtractSheetCutouts } from './sheetCutouts';
import { GliderDesign } from '@/types/glider';
import { createAssembledHalfWingGeometry } from './wingSurface';
export { createHalfWingGeometry } from './wingSurface';
import { getFuselageContourPoints } from '@/physics/massBalance';

export { getCamberElevation } from '@/geometry/core';

/**
 * Creates procedural balsa wood grain texture using HTML Canvas
 */
export function createBalsaWoodTexture(): THREE.CanvasTexture {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base warm balsa wood tone
  ctx.fillStyle = '#e8d3b0';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wood fiber streaks along the grain (horizontal)
  for (let i = 0; i < 600; i++) {
    const y = Math.random() * 512;
    const h = 0.5 + Math.random() * 2;
    const alpha = 0.04 + Math.random() * 0.12;
    const isDarker = Math.random() > 0.4;
    ctx.fillStyle = isDarker
      ? `rgba(180, 140, 95, ${alpha})`
      : `rgba(255, 245, 220, ${alpha * 0.8})`;

    ctx.fillRect(0, y, 512, h);
  }

  // Soft growth ring / wave variation
  for (let y = 0; y < 512; y += 40) {
    const gradient = ctx.createLinearGradient(0, y, 0, y + 40);
    gradient.addColorStop(0, 'rgba(195, 155, 110, 0)');
    gradient.addColorStop(0.5, 'rgba(195, 155, 110, 0.06)');
    gradient.addColorStop(1, 'rgba(195, 155, 110, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, 512, 40);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Generates Three.js mesh for the Profile Fuselage with wing and tail slot cutouts.
 * Uses the canonical smoothed Catmull-Rom curve matching the 2D cut pattern and editor.
 */
export function createFuselageMesh(glider: GliderDesign, balsaMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fuselage_group';

  const { fuselage } = glider;
  const contourPoints = getFuselageContourPoints(glider);

  const cuts = getFuselageCuts(glider);
  const shapes = subtractSheetCutouts(contourPoints, cuts).map(region => {
    const shape = new THREE.Shape(region.outline.map(p => new THREE.Vector2(p.x, p.y)));
    shape.holes = region.holes.map(hole => new THREE.Path(hole.map(p => new THREE.Vector2(p.x, p.y))));
    return shape;
  });

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: fuselage.thicknessMm,
    bevelEnabled: false,
    steps: 1,
  };

  const geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
  // Center extrusion around Z = 0
  geometry.translate(0, 0, -fuselage.thicknessMm / 2);

  const mesh = new THREE.Mesh(geometry, balsaMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add Parasol Cabane Pylon if wing is elevated
  if (fuselage.mountType === 'parasol_pylon') {
    const { points, origin } = getPylonGeometry(glider);
    const pylonShape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x + origin.x, p.y + origin.y)));
    pylonShape.closePath();

    const pylonGeom = new THREE.ExtrudeGeometry(pylonShape, {
      depth: fuselage.thicknessMm,
      bevelEnabled: false,
    });
    pylonGeom.translate(0, 0, -fuselage.thicknessMm / 2);
    const pylonMesh = new THREE.Mesh(pylonGeom, balsaMaterial);
    pylonMesh.castShadow = true;
    group.add(pylonMesh);
  }

  return group;
}


/**
 * Generates Three.js meshes for the Main Wing (Left and Right panels with dihedral angle)
 */
export function createWingMesh(glider: GliderDesign, balsaMaterial: THREE.Material): THREE.Group {
  const wingGroup = new THREE.Group();
  wingGroup.name = 'wing_assembly';

  const { fuselage } = glider;

  const leftGeom = createAssembledHalfWingGeometry(glider);
  const rightGeom = createAssembledHalfWingGeometry(glider);

  // Create Left and Right meshes
  const leftWingMesh = new THREE.Mesh(leftGeom, balsaMaterial);
  leftWingMesh.castShadow = true;
  leftWingMesh.receiveShadow = true;

  const rightWingMesh = new THREE.Mesh(rightGeom, balsaMaterial);
  rightWingMesh.castShadow = true;
  rightWingMesh.receiveShadow = true;

  // Mirror right wing across Z = 0
  rightWingMesh.scale.set(1, 1, -1);

  // Dihedral is already applied around the root camber line in the shared geometry.

  // These two full panels meet at the center score line. Adding another tab
  // here duplicates material that does not exist in the one-piece cut pattern.
  wingGroup.add(leftWingMesh);
  wingGroup.add(rightWingMesh);

  // Position wing assembly at fuselage wing slot location & apply incidence angle
  const incidenceRad = (fuselage.wingSlot.angleDeg * Math.PI) / 180;
  wingGroup.position.set(fuselage.wingSlot.xPositionMm, fuselage.wingSlot.yPositionMm, 0);
  wingGroup.rotation.z = incidenceRad;

  return wingGroup;
}

/**
 * Generates Three.js mesh for Horizontal Stabilizer (Tailplane)
 */
export function createTailMesh(glider: GliderDesign, balsaMaterial: THREE.Material): THREE.Group {
  const tailGroup = new THREE.Group();
  tailGroup.name = 'tail_assembly';

  const { horizontalStabilizer: tail, fuselage } = glider;
  const points = getTailPlanformPoints(tail);
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) shape.lineTo(point.x, point.y);
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: tail.thicknessMm,
    bevelEnabled: false,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, -tail.thicknessMm / 2, 0);

  const mesh = new THREE.Mesh(geom, balsaMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  tailGroup.add(mesh);

  // Position tail assembly at fuselage tail slot
  const tailIncidenceRad = (fuselage.tailSlot.angleDeg * Math.PI) / 180;
  tailGroup.position.set(fuselage.tailSlot.xPositionMm, fuselage.tailSlot.yPositionMm, 0);
  tailGroup.rotation.z = tailIncidenceRad;

  return tailGroup;
}

/**
 * Generates Three.js mesh for Vertical Fin (if not integral with fuselage)
 */
export function createFinMesh(glider: GliderDesign, balsaMaterial: THREE.Material): THREE.Group {
  const finGroup = new THREE.Group();
  finGroup.name = 'fin_assembly';

  const { verticalStabilizer: fin, fuselage } = glider;
  if (fin.isIntegralWithFuselage) {
    return finGroup; // Already part of fuselage silhouette
  }

  const points = getFinProfilePoints(fin);
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x, p.y)));
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: fin.thicknessMm,
    bevelEnabled: false,
  });
  geom.translate(0, 0, -fin.thicknessMm / 2);

  const mesh = new THREE.Mesh(geom, balsaMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  finGroup.add(mesh);

  finGroup.position.set(fuselage.tailSlot.xPositionMm, fuselage.tailSlot.yPositionMm + fuselage.tailSlot.thicknessMm, 0);

  return finGroup;
}

/**
 * Creates 3D Ballast representation (Nose Clay / Weight)
 */
export function createBallastMesh(glider: GliderDesign): THREE.Mesh {
  const grams = Math.max(0, glider.fuselage.noseBallastGrams);
  // Radius scales with cube root of mass: r = (mass * 3 / (4*pi*density))^1/3
  // Clay density ~ 1.7 g/cm³ -> 1700 kg/m³
  const radius = grams > 0 ? Math.max(2.5, Math.pow(grams * 120, 1 / 3)) : 0.01;

  const geom = new THREE.SphereGeometry(radius, 16, 16);
  // Slightly squashed like modeled modeling clay
  geom.scale(1.2, 0.9, 0.7);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x3d3935, // Dark gray modeling clay
    roughness: 0.9,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'nose_ballast';
  mesh.position.set(glider.fuselage.ballastPositionXMm, glider.fuselage.noseHeightMm * 0.5, 0);
  mesh.visible = grams > 0;
  mesh.castShadow = true;

  return mesh;
}
