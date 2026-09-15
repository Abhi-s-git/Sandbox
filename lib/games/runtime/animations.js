/**
 * animations.js — Animation helpers: mixers, keyframe clips, procedural motion.
 *
 * Usage:
 *   import { createMixer, playClip, crossfade,
 *            bobObject, rotateObject, floatObject } from './runtime/animations.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// ── Mixer management ──────────────────────────────────────────────────────────

/**
 * Create an AnimationMixer for a model. Register it with `onTick` to update.
 *
 * @param {THREE.Object3D} root
 * @returns {THREE.AnimationMixer}
 *
 * @example
 * const mixer = createMixer(model);
 * onTick((delta) => mixer.update(delta));
 */
export function createMixer(root) {
  return new THREE.AnimationMixer(root);
}

/**
 * Play a named animation clip from a GLTF animation array.
 *
 * @param {THREE.AnimationMixer} mixer
 * @param {THREE.AnimationClip[]} clips
 * @param {string} name - Clip name (partial match supported).
 * @param {object} [opts]
 * @param {number} [opts.fadeIn=0.3]
 * @param {boolean} [opts.loop=true]
 * @param {boolean} [opts.clamp=false]
 * @returns {THREE.AnimationAction|null}
 */
export function playClip(mixer, clips, name, {
  fadeIn = 0.3,
  loop = true,
  clamp = false,
} = {}) {
  const clip = clips.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
  if (!clip) {
    console.warn(`[animations] Clip "${name}" not found.`);
    return null;
  }
  const action = mixer.clipAction(clip);
  action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
  action.clampWhenFinished = clamp;
  action.reset().fadeIn(fadeIn).play();
  return action;
}

/**
 * Crossfade from the currently playing action to a new clip.
 *
 * @param {THREE.AnimationMixer} mixer
 * @param {THREE.AnimationClip[]} clips
 * @param {THREE.AnimationAction|null} current - Currently playing action (may be null).
 * @param {string} name - Target clip name.
 * @param {number} [duration=0.3]
 * @returns {THREE.AnimationAction|null}
 */
export function crossfade(mixer, clips, current, name, duration = 0.3) {
  const clip = clips.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
  if (!clip) return current;

  const next = mixer.clipAction(clip);
  next.reset().play();

  if (current && current !== next) {
    current.crossFadeTo(next, duration, true);
  }

  return next;
}

/**
 * Stop all actions on a mixer.
 * @param {THREE.AnimationMixer} mixer
 */
export function stopAll(mixer) {
  mixer.stopAllAction();
}

// ── Procedural animations ─────────────────────────────────────────────────────

/**
 * Continuously rotate an object on one or more axes.
 * Returns a tick function — register with `onTick`.
 *
 * @param {THREE.Object3D} obj
 * @param {object} [speed] - Speed in rad/s per axis.
 * @returns {(delta: number) => void}
 *
 * @example
 * onTick(rotateObject(cube, { y: 0.5 }));
 */
export function rotateObject(obj, { x = 0, y = 1, z = 0 } = {}) {
  return (delta) => {
    obj.rotation.x += x * delta;
    obj.rotation.y += y * delta;
    obj.rotation.z += z * delta;
  };
}

/**
 * Bob an object up and down (sine wave).
 * Returns a tick function — register with `onTick`.
 *
 * @param {THREE.Object3D} obj
 * @param {object} [opts]
 * @returns {(delta: number, elapsed: number) => void}
 */
export function bobObject(obj, {
  amplitude = 0.2,
  frequency = 1.0,
  axis = 'y',
  basePosition = null,
} = {}) {
  const base = basePosition !== null ? basePosition : obj.position[axis];
  return (_delta, elapsed) => {
    obj.position[axis] = base + Math.sin(elapsed * frequency * Math.PI * 2) * amplitude;
  };
}

/**
 * Float an object (slow vertical drift with optional sway).
 * Returns a tick function.
 *
 * @param {THREE.Object3D} obj
 * @param {object} [opts]
 * @returns {(delta: number, elapsed: number) => void}
 */
export function floatObject(obj, {
  amplitude = 0.3,
  speed = 0.5,
  swayAmplitude = 0.1,
  swaySpeed = 0.3,
} = {}) {
  const baseY = obj.position.y;
  const baseX = obj.position.x;
  return (_delta, elapsed) => {
    obj.position.y = baseY + Math.sin(elapsed * speed * Math.PI * 2) * amplitude;
    obj.position.x = baseX + Math.sin(elapsed * swaySpeed * Math.PI * 2) * swayAmplitude;
  };
}

/**
 * Orbit one object around a point in world space.
 * Returns a tick function.
 *
 * @param {THREE.Object3D} obj
 * @param {object} [opts]
 * @returns {(delta: number, elapsed: number) => void}
 */
export function orbitObject(obj, {
  radius = 3,
  speed = 1,
  axis = 'xz',
  center = [0, 0, 0],
  yOffset = 0,
} = {}) {
  return (_delta, elapsed) => {
    const angle = elapsed * speed;
    const [cx, cy, cz] = center;
    if (axis === 'xz') {
      obj.position.x = cx + Math.cos(angle) * radius;
      obj.position.z = cz + Math.sin(angle) * radius;
      obj.position.y = cy + yOffset;
    } else if (axis === 'xy') {
      obj.position.x = cx + Math.cos(angle) * radius;
      obj.position.y = cy + Math.sin(angle) * radius;
      obj.position.z = cz;
    }
  };
}

/**
 * Pulse an object's scale (breathe in/out).
 * Returns a tick function.
 *
 * @param {THREE.Object3D} obj
 * @param {object} [opts]
 * @returns {(delta: number, elapsed: number) => void}
 */
export function pulseObject(obj, {
  minScale = 0.9,
  maxScale = 1.1,
  speed = 2,
} = {}) {
  return (_delta, elapsed) => {
    const t = (Math.sin(elapsed * speed * Math.PI * 2) + 1) / 2;
    const s = minScale + (maxScale - minScale) * t;
    obj.scale.setScalar(s);
  };
}

/**
 * Shake an object (random offset, useful for damage feedback).
 * Call once to trigger; pass `duration` in seconds.
 *
 * @param {THREE.Object3D} obj
 * @param {object} [opts]
 */
export function shakeObject(obj, { duration = 0.3, magnitude = 0.1 } = {}) {
  const origin = obj.position.clone();
  const start = performance.now() / 1000;

  function tick() {
    const now = performance.now() / 1000;
    const t = now - start;
    if (t >= duration) {
      obj.position.copy(origin);
      return;
    }
    const decay = 1 - t / duration;
    obj.position.set(
      origin.x + (Math.random() * 2 - 1) * magnitude * decay,
      origin.y + (Math.random() * 2 - 1) * magnitude * decay,
      origin.z + (Math.random() * 2 - 1) * magnitude * decay,
    );
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/**
 * Tween an object's position from current to target over `duration` seconds.
 * Returns a Promise that resolves when complete.
 *
 * @param {THREE.Object3D} obj
 * @param {number[]} to - [x, y, z]
 * @param {number} [duration=1]
 * @param {(t: number) => number} [easing] - Easing function, default linear.
 * @returns {Promise<void>}
 */
export function tweenPosition(obj, to, duration = 1, easing = (t) => t) {
  return new Promise((resolve) => {
    const from = obj.position.clone();
    const target = new THREE.Vector3(...to);
    const start = performance.now();

    function tick() {
      const t = Math.min((performance.now() - start) / (duration * 1000), 1);
      obj.position.lerpVectors(from, target, easing(t));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }

    requestAnimationFrame(tick);
  });
}
