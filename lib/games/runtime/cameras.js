/**
 * cameras.js — Camera factory helpers for common game camera setups.
 *
 * Usage:
 *   import { createPerspectiveCamera, createIsometricCamera,
 *            createFollowCamera, createOrthographicCamera } from './runtime/cameras.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

/**
 * Create a standard perspective camera.
 * @param {object} [opts]
 * @returns {THREE.PerspectiveCamera}
 */
export function createPerspectiveCamera({
  fov = 75,
  near = 0.1,
  far = 1000,
  position = [0, 0, 5],
  lookAt = [0, 0, 0],
} = {}) {
  const aspect = window.innerWidth / window.innerHeight;
  const cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
  cam.position.set(...position);
  cam.lookAt(new THREE.Vector3(...lookAt));
  return cam;
}

/**
 * Create an orthographic (2D / isometric) camera.
 * @param {object} [opts]
 * @returns {THREE.OrthographicCamera}
 */
export function createOrthographicCamera({
  frustumSize = 10,
  near = 0.1,
  far = 1000,
  position = [0, 0, 5],
  lookAt = [0, 0, 0],
} = {}) {
  const aspect = window.innerWidth / window.innerHeight;
  const cam = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    near,
    far,
  );
  cam.position.set(...position);
  cam.lookAt(new THREE.Vector3(...lookAt));
  return cam;
}

/**
 * Create a fixed isometric camera (30° elevation, 45° yaw).
 * @param {object} [opts]
 * @returns {THREE.OrthographicCamera}
 */
export function createIsometricCamera({ frustumSize = 10, distance = 20 } = {}) {
  const cam = createOrthographicCamera({ frustumSize });
  cam.position.set(distance, distance, distance);
  cam.lookAt(0, 0, 0);
  return cam;
}

/**
 * Create a top-down camera.
 * @param {object} [opts]
 * @returns {THREE.OrthographicCamera}
 */
export function createTopDownCamera({ frustumSize = 20, height = 30 } = {}) {
  const cam = createOrthographicCamera({ frustumSize });
  cam.position.set(0, height, 0);
  cam.lookAt(0, 0, 0);
  return cam;
}

/**
 * Creates a follow-camera controller that smoothly trails a target object.
 *
 * Call `followCamera.update(delta)` each frame inside your tick.
 *
 * @param {THREE.Camera} camera
 * @param {object} [opts]
 * @returns {{ update: (delta: number) => void, setTarget: (obj: THREE.Object3D) => void }}
 */
export function createFollowCamera(camera, {
  offset = [0, 4, -8],
  lookAheadOffset = [0, 1, 0],
  damping = 5.0,
} = {}) {
  let target = null;
  const _offsetVec = new THREE.Vector3(...offset);
  const _lookAheadVec = new THREE.Vector3(...lookAheadOffset);
  const _desiredPos = new THREE.Vector3();
  const _lookAtPos = new THREE.Vector3();

  return {
    setTarget(obj) { target = obj; },
    update(delta) {
      if (!target) return;
      const worldPos = new THREE.Vector3();
      target.getWorldPosition(worldPos);

      // Compute desired camera position in target's local space
      _desiredPos.copy(_offsetVec).applyQuaternion(target.quaternion).add(worldPos);
      _lookAtPos.copy(_lookAheadVec).add(worldPos);

      // Smooth damp toward desired position
      camera.position.lerp(_desiredPos, delta * damping);
      camera.lookAt(_lookAtPos);
    },
  };
}

/**
 * Update a camera's aspect ratio and projection when the window resizes.
 * Called automatically if you use createEngine(); useful if managing cameras manually.
 * @param {THREE.PerspectiveCamera|THREE.OrthographicCamera} camera
 * @param {number} [frustumSize] - Required for orthographic cameras.
 */
export function updateCameraAspect(camera, frustumSize) {
  const aspect = window.innerWidth / window.innerHeight;
  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect;
  } else if (camera.isOrthographicCamera && frustumSize !== undefined) {
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
  }
  camera.updateProjectionMatrix();
}
