import * as THREE from 'three';
import { GliderDesign, getEffectiveTipChordMm, getWingPlanformKind } from '@/types/glider';
import { getFuselageProfilePoints } from '@/physics/massBalance';
import { calculateWingPlanformPoints } from '@/geometry/core';

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
  const rawPoints = getFuselageProfilePoints(glider);

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
 * Computes aerodynamic mean camber line elevation for a normalized chord fraction s in [0, 1].
 * Uses NACA-style camber line with maximum camber at 40% chord (p = 0.4).
 * Returns height in mm.
 */
export function getCamberElevation(s: number, chord: number, camberPercent: number): number {
  if (camberPercent <= 0 || chord <= 0) return 0;
  const clampedS = Math.max(0, Math.min(1, s));
  const h = chord * (camberPercent / 100);
  const p = 0.4;
  if (clampedS <= p) {
    return (h / (p * p)) * (2 * p * clampedS - clampedS * clampedS);
  } else {
    return (h / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * clampedS - clampedS * clampedS);
  }
}

/**
 * Creates a 3D half-wing panel geometry with chordwise camber curvature and edge skirts.
 * When camberPercent is 0, this is an exact flat balsa sheet.
 * When camberPercent > 0, it arches smoothly along the chord line.
 */
export function createHalfWingGeometry(glider: GliderDesign): THREE.BufferGeometry {
  const { wing } = glider;
  const cr = wing.rootChordMm;
  const ct = getEffectiveTipChordMm(wing);
  const halfSpan = wing.spanMm / 2;
  const sweepRad = (wing.sweepDeg * Math.PI) / 180;
  const planformKind = getWingPlanformKind(wing.planformType);
  const thickness = wing.thicknessMm;
  const camberPercent = wing.camberPercent;

  const N = 24; // Chordwise segments
  const M = 24; // Spanwise segments

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

  // Get leading edge X and chord at span fraction t in [0, 1]
  function getStationGeometry(t: number): { xLE: number; chord: number } {
    if (planformKind === 'elliptical') {
      const ellipseFactor = Math.sqrt(Math.max(0, 1 - t * t));
      const chord = Math.max(ct * 0.4, cr * ellipseFactor);
      const sweepAtT = t * halfSpan * Math.tan(sweepRad);
      const xLE = sweepAtT + 0.25 * (cr - chord);
      return { xLE, chord };
    }
    const sweepAtT = t * halfSpan * Math.tan(sweepRad);
    const chord = cr + t * (ct - cr);
    return { xLE: sweepAtT, chord };
  }

  // Build Upper and Lower grids
  const upperGrid: number[][] = [];
  const lowerGrid: number[][] = [];

  for (let j = 0; j <= M; j++) {
    const t = j / M;
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
    const t = j / M;
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
    const t = j / M;
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

/**
 * Generates the center tab mesh passing through the fuselage wing slot.
 * Follows the camber curve at the root chord so it connects seamlessly to the wings.
 */
export function createCenterTabGeometry(glider: GliderDesign): THREE.BufferGeometry {
  const { wing, fuselage } = glider;
  const cr = wing.rootChordMm;
  const tabWidth = wing.slotTabWidthMm || cr * 0.9;
  const tabOffset = (cr - tabWidth) / 2;
  const halfSlotSpan = Math.max(fuselage.thicknessMm / 2 + 1, 3);
  const thickness = wing.thicknessMm;
  const camberPercent = wing.camberPercent;

  const N = 16;
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

  const upperZneg: number[] = [];
  const upperZpos: number[] = [];
  const lowerZneg: number[] = [];
  const lowerZpos: number[] = [];

  for (let i = 0; i <= N; i++) {
    const s = (tabOffset + (i / N) * tabWidth) / cr;
    const x = tabOffset + (i / N) * tabWidth;
    const camb = getCamberElevation(s, cr, camberPercent);
    const yUpper = camb + thickness / 2;
    const yLower = camb - thickness / 2;

    upperZneg.push(addVertex(x, yUpper, -halfSlotSpan, x / 100, 0));
    upperZpos.push(addVertex(x, yUpper, halfSlotSpan, x / 100, 0.05));
    lowerZneg.push(addVertex(x, yLower, -halfSlotSpan, x / 100, 0));
    lowerZpos.push(addVertex(x, yLower, halfSlotSpan, x / 100, 0.05));
  }

  // Top and bottom faces
  for (let i = 0; i < N; i++) {
    // Upper face (normal +Y)
    addQuad(upperZpos[i], upperZpos[i + 1], upperZneg[i + 1], upperZneg[i]);
    // Lower face (normal -Y)
    addQuad(lowerZneg[i], lowerZneg[i + 1], lowerZpos[i + 1], lowerZpos[i]);
  }

  // Front (LE) and back (TE) end caps
  // Front cap at i = 0
  addQuad(lowerZneg[0], upperZneg[0], upperZpos[0], lowerZpos[0]);
  // Back cap at i = N
  addQuad(lowerZpos[N], upperZpos[N], upperZneg[N], lowerZneg[N]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Generates Three.js meshes for the Main Wing (Left and Right panels with dihedral angle)
 */
export function createWingMesh(glider: GliderDesign, balsaMaterial: THREE.Material): THREE.Group {
  const wingGroup = new THREE.Group();
  wingGroup.name = 'wing_assembly';

  const { wing, fuselage } = glider;

  const leftGeom = createHalfWingGeometry(glider);
  const rightGeom = createHalfWingGeometry(glider);

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
  const tabGeom = createCenterTabGeometry(glider);
  const tabMesh = new THREE.Mesh(tabGeom, balsaMaterial);
  tabMesh.castShadow = true;
  tabMesh.receiveShadow = true;

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
