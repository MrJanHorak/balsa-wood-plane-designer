import * as THREE from 'three';
import { GliderDesign } from '@/types/glider';
import { getFuselageProfilePoints } from '@/physics/massBalance';

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
 * Generates Three.js mesh for the Profile Fuselage with wing and tail slot cutouts
 */
export function createFuselageMesh(glider: GliderDesign, balsaMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fuselage_group';

  const { fuselage } = glider;
  const rawPoints = getFuselageProfilePoints(fuselage);

  const shape = new THREE.Shape();
  if (rawPoints.length > 0) {
    shape.moveTo(rawPoints[0].x, rawPoints[0].y);
    for (let i = 1; i < rawPoints.length; i++) {
      shape.lineTo(rawPoints[i].x, rawPoints[i].y);
    }
    shape.closePath();
  }

  // Only add wing slot hole if mountType is through_slot
  if (fuselage.mountType === 'through_slot') {
    const ws = fuselage.wingSlot;
    const wingSlotHole = new THREE.Path();
    const wAngleRad = (ws.angleDeg * Math.PI) / 180;
    const cosW = Math.cos(wAngleRad);
    const sinW = Math.sin(wAngleRad);
    const halfThick = ws.thicknessMm / 2;

    // 4 corners of slot rotated by angle
    const p0 = { x: ws.xPositionMm, y: ws.yPositionMm - halfThick };
    const p1 = { x: ws.xPositionMm + ws.lengthMm * cosW, y: ws.yPositionMm + ws.lengthMm * sinW - halfThick };
    const p2 = { x: ws.xPositionMm + ws.lengthMm * cosW, y: ws.yPositionMm + ws.lengthMm * sinW + halfThick };
    const p3 = { x: ws.xPositionMm, y: ws.yPositionMm + halfThick };

    wingSlotHole.moveTo(p0.x, p0.y);
    wingSlotHole.lineTo(p1.x, p1.y);
    wingSlotHole.lineTo(p2.x, p2.y);
    wingSlotHole.lineTo(p3.x, p3.y);
    wingSlotHole.closePath();
    shape.holes.push(wingSlotHole);
  }

  // Create Tail Slot Hole
  const ts = fuselage.tailSlot;
  const tailSlotHole = new THREE.Path();
  const tAngleRad = (ts.angleDeg * Math.PI) / 180;
  const cosT = Math.cos(tAngleRad);
  const sinT = Math.sin(tAngleRad);
  const halfTailThick = ts.thicknessMm / 2;

  const tp0 = { x: ts.xPositionMm, y: ts.yPositionMm - halfTailThick };
  const tp1 = { x: ts.xPositionMm + ts.lengthMm * cosT, y: ts.yPositionMm + ts.lengthMm * sinT - halfTailThick };
  const tp2 = { x: ts.xPositionMm + ts.lengthMm * cosT, y: ts.yPositionMm + ts.lengthMm * sinT + halfTailThick };
  const tp3 = { x: ts.xPositionMm, y: ts.yPositionMm + halfTailThick };

  tailSlotHole.moveTo(tp0.x, tp0.y);
  tailSlotHole.lineTo(tp1.x, tp1.y);
  tailSlotHole.lineTo(tp2.x, tp2.y);
  tailSlotHole.lineTo(tp3.x, tp3.y);
  tailSlotHole.closePath();
  shape.holes.push(tailSlotHole);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: fuselage.thicknessMm,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.3,
    bevelThickness: 0.3,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Center extrusion around Z = 0
  geometry.translate(0, 0, -fuselage.thicknessMm / 2);

  const mesh = new THREE.Mesh(geometry, balsaMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add Parasol Cabane Pylon if wing is elevated
  if (fuselage.mountType === 'parasol_pylon') {
    const ws = fuselage.wingSlot;
    const pylonShape = new THREE.Shape();
    const pylonW = fuselage.pylonWidthMm || 24;
    const startX = ws.xPositionMm + (ws.lengthMm - pylonW) / 2;
    const baseSpineY = Math.min(fuselage.maxHeightMm, ws.yPositionMm);
    const topPylonY = ws.yPositionMm;

    pylonShape.moveTo(startX, baseSpineY - 4);
    pylonShape.lineTo(startX + pylonW, baseSpineY - 4);
    pylonShape.lineTo(startX + pylonW * 0.9, topPylonY);
    pylonShape.lineTo(startX + pylonW * 0.1, topPylonY);
    pylonShape.closePath();

    const pylonGeom = new THREE.ExtrudeGeometry(pylonShape, {
      depth: fuselage.thicknessMm,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.2,
      bevelThickness: 0.2,
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

  const { wing, fuselage } = glider;
  const halfSpan = wing.spanMm / 2;
  const cr = wing.rootChordMm;
  const ct = wing.planformType === 'rectangular' ? cr : wing.tipChordMm;
  const sweepRad = (wing.sweepDeg * Math.PI) / 180;
  const sweepOffsetAtTip = halfSpan * Math.tan(sweepRad);

  // Wing Panel 2D Shape in X-Z plane
  function createHalfWingGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();

    if (wing.planformType === 'elliptical') {
      // Sample elliptical planform
      const segments = 16;
      const tePoints: { x: number; z: number }[] = [];
      const lePoints: { x: number; z: number }[] = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments; // 0 at root, 1 at tip
        const z = t * halfSpan;
        const ellipseFactor = Math.sqrt(Math.max(0, 1 - t * t));
        const chordAtZ = Math.max(ct * 0.4, cr * ellipseFactor);
        const sweepZ = z * Math.tan(sweepRad);

        // Standard aerodynamic quarter-chord locus
        const leX = sweepZ + 0.25 * (cr - chordAtZ);
        const teX = leX + chordAtZ;

        lePoints.push({ x: leX, z });
        tePoints.push({ x: teX, z });
      }

      shape.moveTo(lePoints[0].x, lePoints[0].z);
      for (let i = 1; i <= segments; i++) {
        shape.lineTo(lePoints[i].x, lePoints[i].z);
      }
      for (let i = segments; i >= 0; i--) {
        shape.lineTo(tePoints[i].x, tePoints[i].z);
      }
      shape.closePath();
    } else {
      // Tapered, Rectangular, or Delta
      shape.moveTo(0, 0);
      shape.lineTo(cr, 0);
      shape.lineTo(ct + sweepOffsetAtTip, halfSpan);
      shape.lineTo(sweepOffsetAtTip, halfSpan);
      shape.closePath();
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: wing.thicknessMm,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.2,
      bevelThickness: 0.2,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: wing.thicknessMm,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.2,
      bevelThickness: 0.2,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate so shape lies in X-Z plane, thickness in Y
    geom.rotateX(-Math.PI / 2);
    return geom;
  }

  const leftGeom = createHalfWingGeometry();
  const rightGeom = createHalfWingGeometry();

  // Create Left and Right meshes
  const leftWingMesh = new THREE.Mesh(leftGeom, balsaMaterial);
  leftWingMesh.castShadow = true;
  leftWingMesh.receiveShadow = true;

  const rightWingMesh = new THREE.Mesh(rightGeom, balsaMaterial);
  rightWingMesh.castShadow = true;
  rightWingMesh.receiveShadow = true;

  // Mirror right wing across Z = 0
  rightWingMesh.scale.set(1, 1, -1);

  // Apply Dihedral angle (rotation around X axis)
  const dihedralRad = (wing.dihedralDeg * Math.PI) / 180;
  leftWingMesh.rotation.x = dihedralRad;
  rightWingMesh.rotation.x = -dihedralRad;

  // Center Tab mesh that slides directly through the fuselage slot
  const tabShape = new THREE.Shape();
  const tabWidth = wing.slotTabWidthMm || cr * 0.9;
  const tabOffset = (cr - tabWidth) / 2;
  tabShape.moveTo(tabOffset, -fuselage.thicknessMm);
  tabShape.lineTo(tabOffset + tabWidth, -fuselage.thicknessMm);
  tabShape.lineTo(tabOffset + tabWidth, fuselage.thicknessMm);
  tabShape.lineTo(tabOffset, fuselage.thicknessMm);
  tabShape.closePath();

  const tabGeom = new THREE.ExtrudeGeometry(tabShape, {
    depth: wing.thicknessMm,
    bevelEnabled: false,
  });
  tabGeom.rotateX(-Math.PI / 2);
  const tabMesh = new THREE.Mesh(tabGeom, balsaMaterial);
  tabMesh.position.y = -wing.thicknessMm / 2;

  wingGroup.add(leftWingMesh);
  wingGroup.add(rightWingMesh);
  wingGroup.add(tabMesh);

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
  const halfSpan = tail.spanMm / 2;
  const cr = tail.rootChordMm;
  const ct = tail.tipChordMm;
  const sweepRad = (tail.sweepDeg * Math.PI) / 180;
  const tipSweepOffset = halfSpan * Math.tan(sweepRad);

  const shape = new THREE.Shape();
  // Symmetric planform (left tip -> root -> right tip)
  shape.moveTo(tipSweepOffset, -halfSpan);
  shape.lineTo(tipSweepOffset + ct, -halfSpan);
  shape.lineTo(cr, 0);
  shape.lineTo(tipSweepOffset + ct, halfSpan);
  shape.lineTo(tipSweepOffset, halfSpan);
  shape.lineTo(0, 0);
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: tail.thicknessMm,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.2,
    bevelThickness: 0.2,
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

  const cr = fin.rootChordMm;
  const ct = fin.tipChordMm;
  const h = fin.heightMm;
  const sweepRad = (fin.sweepDeg * Math.PI) / 180;
  const tipOffset = h * Math.tan(sweepRad);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(cr, 0);
  shape.lineTo(tipOffset + ct, h);
  shape.lineTo(tipOffset, h);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: fin.thicknessMm,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.2,
    bevelThickness: 0.2,
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
