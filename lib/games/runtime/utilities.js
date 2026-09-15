/**
 * utilities.js — Math helpers, easing functions, timers, object pooling, and misc utils.
 *
 * Usage:
 *   import { lerp, clamp, randomRange, delay, createTimer,
 *            createObjectPool, formatTime } from './runtime/utilities.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

// ── Math ──────────────────────────────────────────────────────────────────────

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Clamp value between min and max. */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Map a value from one range to another. */
export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;

/** Wrap a value within [0, max). */
export const wrap = (v, max) => ((v % max) + max) % max;

/** Generate a random float between min and max. */
export const randomRange = (min, max) => min + Math.random() * (max - min);

/** Generate a random integer between min (inclusive) and max (inclusive). */
export const randomInt = (min, max) => Math.floor(randomRange(min, max + 1));

/** Pick a random element from an array. */
export const randomPick = (arr) => arr[randomInt(0, arr.length - 1)];

/** Shuffle an array in-place (Fisher-Yates). */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Convert degrees to radians. */
export const degToRad = (deg) => deg * (Math.PI / 180);

/** Convert radians to degrees. */
export const radToDeg = (rad) => rad * (180 / Math.PI);

/** Distance between two 2D points. */
export const dist2D = (ax, ay, bx, by) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);

/** Distance between two THREE.Vector3 instances. */
export const dist3D = (a, b) => a.distanceTo(b);

/** Smooth step (Hermite interpolation). */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Approximately equal (floating point safe). */
export const approxEqual = (a, b, eps = 0.0001) => Math.abs(a - b) < eps;

// ── Easing functions ──────────────────────────────────────────────────────────

/** t in 0–1 → eased 0–1 */
export const Easing = {
  linear: (t) => t,
  easeIn:     (t) => t * t,
  easeOut:    (t) => t * (2 - t),
  easeInOut:  (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic:  (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart:  (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
};

// ── Timing ────────────────────────────────────────────────────────────────────

/**
 * Return a promise that resolves after `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Create a repeating / one-shot timer.
 *
 * @param {number} interval  - Seconds between callbacks.
 * @param {() => void} callback
 * @param {object} [opts]
 * @param {boolean} [opts.loop=true]
 * @param {number}  [opts.maxTicks=Infinity]
 * @returns {{ update: (delta: number) => void, reset: () => void, dispose: () => void }}
 */
export function createTimer(interval, callback, { loop = true, maxTicks = Infinity } = {}) {
  let _accum = 0;
  let _ticks = 0;
  let _active = true;

  return {
    update(delta) {
      if (!_active) return;
      _accum += delta;
      while (_accum >= interval && _active) {
        _accum -= interval;
        _ticks++;
        callback(_ticks);
        if (!loop || _ticks >= maxTicks) { _active = false; break; }
      }
    },
    reset() { _accum = 0; _ticks = 0; _active = true; },
    dispose() { _active = false; },
    get active() { return _active; },
    get ticks() { return _ticks; },
  };
}

// ── Object pooling ────────────────────────────────────────────────────────────

/**
 * Create an object pool to reuse objects (bullets, particles, enemies).
 *
 * @param {() => T} factory   - Creates a new object.
 * @param {(obj: T) => void} reset   - Resets an object for reuse.
 * @param {number} [initialSize=0]
 * @returns {ObjectPool<T>}
 *
 * @example
 * const bulletPool = createObjectPool(
 *   () => createBox({ width: 0.1, height: 0.1, depth: 0.3, color: 0xffff00 }),
 *   (b) => { b.visible = false; b.position.set(0, -100, 0); }
 * );
 * const bullet = bulletPool.get();
 * // ... later:
 * bulletPool.release(bullet);
 */
export function createObjectPool(factory, reset, initialSize = 0) {
  const _pool = [];
  const _active = new Set();

  for (let i = 0; i < initialSize; i++) {
    _pool.push(factory());
  }

  return {
    /** Get an object from the pool (or create one). */
    get() {
      const obj = _pool.length > 0 ? _pool.pop() : factory();
      _active.add(obj);
      return obj;
    },
    /** Return an object to the pool. */
    release(obj) {
      if (!_active.has(obj)) return;
      _active.delete(obj);
      reset(obj);
      _pool.push(obj);
    },
    /** Release all active objects. */
    releaseAll() {
      for (const obj of [..._active]) this.release(obj);
    },
    get activeCount() { return _active.size; },
    get poolSize() { return _pool.length; },
    get active() { return [..._active]; },
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Format seconds as MM:SS.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a large number with commas (e.g. 12345 → "12,345").
 * @param {number} n
 * @returns {string}
 */
export const formatScore = (n) => Math.floor(n).toLocaleString();

// ── Three.js helpers ──────────────────────────────────────────────────────────

/**
 * Create a reusable Vector3 pool to reduce GC pressure in hot loops.
 * @param {number} [size=16]
 * @returns {{ get: () => THREE.Vector3, release: (v) => void }}
 */
export function createVectorPool(size = 16) {
  const pool = Array.from({ length: size }, () => new THREE.Vector3());
  const free = [...pool];
  return {
    get() { return free.pop() ?? new THREE.Vector3(); },
    release(v) { v.set(0, 0, 0); free.push(v); },
  };
}

/**
 * Compute the midpoint between two Vector3s.
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @returns {THREE.Vector3}
 */
export const midpoint = (a, b) => new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

/**
 * Return a random point on the surface of a sphere.
 * @param {number} radius
 * @returns {THREE.Vector3}
 */
export function randomOnSphere(radius = 1) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

/**
 * Return a random point inside a box.
 * @param {number} hw - Half-width
 * @param {number} hh - Half-height
 * @param {number} hd - Half-depth
 * @returns {THREE.Vector3}
 */
export const randomInBox = (hw = 1, hh = 1, hd = 1) => new THREE.Vector3(
  randomRange(-hw, hw), randomRange(-hh, hh), randomRange(-hd, hd),
);

/**
 * Dispose a Three.js object recursively (geometry + materials + textures).
 * @param {THREE.Object3D} obj
 */
export function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        for (const key of Object.keys(mat)) {
          if (mat[key] && mat[key].isTexture) mat[key].dispose();
        }
        mat.dispose();
      }
    }
  });
}
