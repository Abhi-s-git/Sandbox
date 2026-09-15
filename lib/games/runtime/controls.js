/**
 * controls.js — Camera and character controls.
 *
 * Usage:
 *   import { createOrbitControls, createKeyboardControls,
 *            createPointerLockControls, createFPSControls } from './runtime/controls.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js';

/**
 * Create orbit controls (mouse drag to orbit, scroll to zoom).
 * Call `controls.update()` each frame.
 *
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @param {object} [opts]
 * @returns {OrbitControls}
 */
export function createOrbitControls(camera, domElement, {
  enableDamping = true,
  dampingFactor = 0.05,
  minDistance = 1,
  maxDistance = 500,
  enablePan = true,
  autoRotate = false,
  autoRotateSpeed = 2.0,
} = {}) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = enableDamping;
  controls.dampingFactor = dampingFactor;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.enablePan = enablePan;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = autoRotateSpeed;
  return controls;
}

/**
 * Create a simple keyboard state tracker.
 *
 * @returns {{ isDown: (key: string) => boolean, dispose: () => void }}
 *
 * @example
 * const kb = createKeyboardControls();
 * onTick(() => {
 *   if (kb.isDown('KeyW')) player.position.z -= 0.1;
 * });
 */
export function createKeyboardControls() {
  const _keys = new Set();

  const _onKeyDown = (e) => _keys.add(e.code);
  const _onKeyUp = (e) => _keys.delete(e.code);

  window.addEventListener('keydown', _onKeyDown);
  window.addEventListener('keyup', _onKeyUp);

  return {
    /** Returns true while `key` (e.code) is held down. */
    isDown(key) { return _keys.has(key); },
    /** Returns current set of pressed keys. */
    getKeys() { return new Set(_keys); },
    dispose() {
      window.removeEventListener('keydown', _onKeyDown);
      window.removeEventListener('keyup', _onKeyUp);
    },
  };
}

/**
 * Derive a normalised direction vector from WASD/arrow keyboard state.
 * Returns a 2D vector: { x: left/right, z: forward/back } — normalised.
 *
 * @param {{ isDown: (key: string) => boolean }} kb - keyboard controls instance
 * @returns {{ x: number, z: number }}
 */
export function getMovementVector(kb) {
  let x = 0;
  let z = 0;
  if (kb.isDown('KeyW') || kb.isDown('ArrowUp')) z -= 1;
  if (kb.isDown('KeyS') || kb.isDown('ArrowDown')) z += 1;
  if (kb.isDown('KeyA') || kb.isDown('ArrowLeft')) x -= 1;
  if (kb.isDown('KeyD') || kb.isDown('ArrowRight')) x += 1;

  // Normalise diagonal movement
  const len = Math.sqrt(x * x + z * z);
  if (len > 0) { x /= len; z /= len; }
  return { x, z };
}

/**
 * Basic FPS-style first-person controls using pointer lock.
 * Click the canvas to activate. Press Escape to release.
 *
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement - Canvas element.
 * @param {object} [opts]
 * @returns {{ isLocked: () => boolean, dispose: () => void }}
 */
export function createFPSControls(camera, domElement, {
  moveSpeed = 5,
  lookSensitivity = 0.002,
} = {}) {
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const direction = new THREE.Vector3();
  let locked = false;

  // Pointer lock
  domElement.addEventListener('click', () => {
    if (!locked) domElement.requestPointerLock();
  });

  const _onLockChange = () => {
    locked = document.pointerLockElement === domElement;
  };
  document.addEventListener('pointerlockchange', _onLockChange);

  const _onMouseMove = (e) => {
    if (!locked) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * lookSensitivity;
    euler.x -= e.movementY * lookSensitivity;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    camera.quaternion.setFromEuler(euler);
  };
  document.addEventListener('mousemove', _onMouseMove);

  // Keyboard state
  const _keys = new Set();
  const _onKeyDown = (e) => _keys.add(e.code);
  const _onKeyUp = (e) => _keys.delete(e.code);
  window.addEventListener('keydown', _onKeyDown);
  window.addEventListener('keyup', _onKeyUp);

  /**
   * Call this each frame to apply movement.
   * @param {number} delta
   */
  function update(delta) {
    if (!locked) return;
    direction.set(0, 0, 0);
    if (_keys.has('KeyW') || _keys.has('ArrowUp')) direction.z = -1;
    if (_keys.has('KeyS') || _keys.has('ArrowDown')) direction.z = 1;
    if (_keys.has('KeyA') || _keys.has('ArrowLeft')) direction.x = -1;
    if (_keys.has('KeyD') || _keys.has('ArrowRight')) direction.x = 1;
    direction.normalize().applyQuaternion(camera.quaternion).multiplyScalar(moveSpeed * delta);
    camera.position.add(direction);
  }

  function dispose() {
    document.removeEventListener('pointerlockchange', _onLockChange);
    document.removeEventListener('mousemove', _onMouseMove);
    window.removeEventListener('keydown', _onKeyDown);
    window.removeEventListener('keyup', _onKeyUp);
  }

  return { update, isLocked: () => locked, dispose };
}

/**
 * Touch joystick for mobile movement.
 * Renders a virtual joystick overlay on a given container.
 *
 * @param {HTMLElement} container
 * @returns {{ getVector: () => { x: number, z: number }, dispose: () => void }}
 */
export function createVirtualJoystick(container) {
  const outer = document.createElement('div');
  Object.assign(outer.style, {
    position: 'absolute', bottom: '40px', left: '40px',
    width: '100px', height: '100px', borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.1)',
    touchAction: 'none', userSelect: 'none',
  });
  const inner = document.createElement('div');
  Object.assign(inner.style, {
    position: 'absolute', top: '30px', left: '30px',
    width: '40px', height: '40px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.5)',
    pointerEvents: 'none',
  });
  outer.appendChild(inner);
  container.appendChild(outer);

  let _x = 0, _z = 0;
  let _startX = 0, _startY = 0, _touchId = null;
  const R = 50; // max radius in px

  outer.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    _touchId = t.identifier;
    _startX = t.clientX;
    _startY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  outer.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== _touchId) continue;
      const dx = t.clientX - _startX;
      const dy = t.clientY - _startY;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), R);
      const angle = Math.atan2(dy, dx);
      _x = (dist / R) * Math.cos(angle);
      _z = (dist / R) * Math.sin(angle);
      inner.style.left = `${30 + _x * (R - 20)}px`;
      inner.style.top = `${30 + _z * (R - 20)}px`;
      e.preventDefault();
    }
  }, { passive: false });

  const _endTouch = () => {
    _touchId = null; _x = 0; _z = 0;
    inner.style.left = '30px'; inner.style.top = '30px';
  };
  outer.addEventListener('touchend', _endTouch);
  outer.addEventListener('touchcancel', _endTouch);

  return {
    getVector() { return { x: _x, z: _z }; },
    dispose() { container.removeChild(outer); },
  };
}
