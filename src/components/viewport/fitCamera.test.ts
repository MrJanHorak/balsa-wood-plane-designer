import { expect, it } from 'vitest';
import * as THREE from 'three';
import { fitCameraToModel } from './fitCamera';

it.each([0.3, 1, 2])('fits all model corners at viewport aspect %s', aspect => {
  const geometry = new THREE.BoxGeometry(320, 70, 550);
  const material = new THREE.MeshBasicMaterial();
  const model = new THREE.Mesh(geometry, material);
  model.position.x = 120;
  const camera = new THREE.PerspectiveCamera(45, aspect, 1, 3000);
  const target = new THREE.Vector3();
  for (const direction of [new THREE.Vector3(0, 0, 1), new THREE.Vector3(-0.7, 0.5, 0.8), new THREE.Vector3(0, 1, 0.0001)]) {
    fitCameraToModel(camera, model, target, direction);
    camera.updateMatrixWorld();
    for (const x of [-40, 280]) for (const y of [-35, 35]) for (const z of [-275, 275]) {
      const projected = new THREE.Vector3(x, y, z).project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);
      expect(Math.abs(projected.y)).toBeLessThan(1);
      expect(projected.z).toBeGreaterThan(-1);
      expect(projected.z).toBeLessThan(1);
    }
  }
  geometry.dispose(); material.dispose();
});
