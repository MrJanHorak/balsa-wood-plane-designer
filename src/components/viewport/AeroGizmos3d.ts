import * as THREE from 'three';
import { GliderAeroReport } from '@/types/glider';

/**
 * Creates the classic aeronautical checkered Center of Gravity (CG) texture.
 * Black & Yellow alternating 4 quadrants.
 */
function createCgCheckeredTexture(): THREE.CanvasTexture {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const half = 128;
    // Top-Left: Black
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, half, half);
    // Bottom-Right: Black
    ctx.fillRect(half, half, half, half);

    // Top-Right: Yellow
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(half, 0, half, half);
    // Bottom-Left: Yellow
    ctx.fillRect(0, half, half, half);

    // Fine white border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class AeroGizmos3D {
  public rootGroup: THREE.Group;
  private cgGroup: THREE.Group;
  private npGroup: THREE.Group;
  private staticMarginLine: THREE.Line;
  private wingAcMarker: THREE.Group;
  private tailAcMarker: THREE.Group;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'aero_gizmos_root';

    // 1. Center of Gravity (CG) Gizmo
    this.cgGroup = new THREE.Group();
    this.cgGroup.name = 'cg_gizmo';

    const cgTex = createCgCheckeredTexture();
    const cgSphereGeom = new THREE.SphereGeometry(4.5, 32, 16);
    const cgMat = new THREE.MeshBasicMaterial({
      map: cgTex,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const cgSphere = new THREE.Mesh(cgSphereGeom, cgMat);
    this.cgGroup.add(cgSphere);

    // CG Plumb line downward
    const plumbGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -35, 0),
    ]);
    const plumbMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 3,
      gapSize: 2,
      linewidth: 1.5,
    });
    const plumbLine = new THREE.Line(plumbGeom, plumbMat);
    plumbLine.computeLineDistances();
    this.cgGroup.add(plumbLine);

    // CG Outer glowing ring
    const ringGeom = new THREE.RingGeometry(5.2, 6.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    this.cgGroup.add(ring);

    this.rootGroup.add(this.cgGroup);

    // 2. Neutral Point (NP) Gizmo
    this.npGroup = new THREE.Group();
    this.npGroup.name = 'np_gizmo';

    const npRingGeom = new THREE.RingGeometry(4.0, 5.5, 32);
    const npMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan
      side: THREE.DoubleSide,
    });
    const npRing = new THREE.Mesh(npRingGeom, npMat);
    this.npGroup.add(npRing);

    // Inner crosshair
    const crossGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-7, 0, 0),
      new THREE.Vector3(7, 0, 0),
      new THREE.Vector3(0, -7, 0),
      new THREE.Vector3(0, 7, 0),
    ]);
    const crossMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2 });
    const crossLines = new THREE.LineSegments(crossGeom, crossMat);
    this.npGroup.add(crossLines);

    // Upward aerodynamic lift arrow
    const arrowGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 30, 0),
    ]);
    const arrowMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 3,
      gapSize: 2,
      linewidth: 2,
    });
    const arrowLine = new THREE.Line(arrowGeom, arrowMat);
    arrowLine.computeLineDistances();
    this.npGroup.add(arrowLine);

    this.rootGroup.add(this.npGroup);

    // 3. Static Margin Vector between CG and NP
    const smGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    const smMat = new THREE.LineBasicMaterial({
      color: 0x10b981, // Green default
      linewidth: 3,
    });
    this.staticMarginLine = new THREE.Line(smGeom, smMat);
    this.rootGroup.add(this.staticMarginLine);

    // 4. Aerodynamic Centers (Wing AC & Tail AC)
    this.wingAcMarker = this.createAcMarker(0x3b82f6);
    this.tailAcMarker = this.createAcMarker(0x8b5cf6);
    this.rootGroup.add(this.wingAcMarker);
    this.rootGroup.add(this.tailAcMarker);
  }

  private createAcMarker(color: number): THREE.Group {
    const grp = new THREE.Group();
    const geom = new THREE.SphereGeometry(2.0, 16, 8);
    const mat = new THREE.MeshBasicMaterial({ color });
    grp.add(new THREE.Mesh(geom, mat));
    return grp;
  }

  public update(report: GliderAeroReport, showAeroCenters = true) {
    // 1. Position CG Marker
    this.cgGroup.position.set(report.cgXMm, report.cgYMm, report.cgZMm);

    // 2. Position NP Marker (aligned at wing aerodynamic center Y for clear visual)
    this.npGroup.position.set(report.npXMm, report.wingAcYMm, 0);

    // 3. Update Static Margin connection line
    const smPositions = new Float32Array([
      report.cgXMm, report.cgYMm, 0,
      report.npXMm, report.cgYMm, 0,
    ]);
    this.staticMarginLine.geometry.setAttribute('position', new THREE.BufferAttribute(smPositions, 3));
    this.staticMarginLine.geometry.computeBoundingSphere();

    // Color static margin according to stability
    const mat = this.staticMarginLine.material as THREE.LineBasicMaterial;
    if (report.stabilityStatus === 'optimal') {
      mat.color.setHex(0x10b981); // Emerald Green
    } else if (report.stabilityStatus === 'critically_tail_heavy') {
      mat.color.setHex(0xef4444); // Bright Red
    } else if (report.stabilityStatus === 'tail_heavy') {
      mat.color.setHex(0xf59e0b); // Amber
    } else if (report.stabilityStatus === 'nose_heavy') {
      mat.color.setHex(0x3b82f6); // Blue
    } else {
      mat.color.setHex(0x6366f1); // Indigo
    }

    // 4. Update Wing and Tail AC markers
    this.wingAcMarker.visible = showAeroCenters;
    this.wingAcMarker.position.set(report.wingAcXMm, report.wingAcYMm, 0);

    this.tailAcMarker.visible = showAeroCenters;
    this.tailAcMarker.position.set(report.tailAcXMm, report.tailAcXMm ? report.cgYMm : 0, 0);
  }
}
