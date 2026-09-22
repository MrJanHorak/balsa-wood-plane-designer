import * as THREE from 'three';

/** Fit the whole assembled model, including custom tips, in either a wide or narrow viewport. */
export function fitCameraToModel(camera: THREE.PerspectiveCamera, model: THREE.Object3D, target: THREE.Vector3, direction?: THREE.Vector3): number {
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return 0;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const ray = direction?.clone() ?? camera.position.clone().sub(target);
  if (ray.lengthSq() < 1e-8) ray.set(-0.7, 0.5, 0.8);
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = Math.max(1, sphere.radius) / Math.sin(Math.min(vertical, horizontal)) * 1.15;
  target.copy(sphere.center);
  camera.position.copy(target).addScaledVector(ray.normalize(), distance);
  camera.near = Math.max(0.1, distance / 1000);
  camera.far = Math.max(3000, distance + sphere.radius * 4);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  return distance;
}
