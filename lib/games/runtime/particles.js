/**
 * particles.js — Simple CPU-based particle systems for fire, smoke, sparks, etc.
 *
 * Usage:
 *   import { createParticleSystem } from './runtime/particles.js';
 *   const sparks = createParticleSystem(scene, { count: 200, color: 0xffaa00 });
 *   onTick((delta) => sparks.update(delta));
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

/**
 * Create a GPU-friendly particle system using BufferGeometry + Points.
 *
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {ParticleSystem}
 */
export function createParticleSystem(scene, {
  count = 500,
  color = 0xffffff,
  size = 0.1,
  sizeAttenuation = true,
  lifetime = 2.0,
  spread = 1.0,
  speed = 2.0,
  gravity = -2.0,
  origin = [0, 0, 0],
  emitRate = 50,     // particles per second
  texture = null,
  blending = THREE.AdditiveBlending,
  transparent = true,
  opacity = 0.8,
} = {}) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);
  const ages = new Float32Array(count);
  const alive = new Uint8Array(count);

  // Initialise all particles as dead
  for (let i = 0; i < count; i++) {
    lifetimes[i] = lifetime * (0.5 + Math.random() * 0.5);
    ages[i] = lifetimes[i]; // start as "already dead"
    alive[i] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation,
    transparent,
    opacity,
    blending,
    depthWrite: false,
    map: texture,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let _emitAccum = 0;
  const _originVec = new THREE.Vector3(...origin);

  /** Emit `n` new particles from origin. */
  function _emit(n) {
    let emitted = 0;
    for (let i = 0; i < count && emitted < n; i++) {
      if (alive[i]) continue;
      alive[i] = 1;
      ages[i] = 0;
      positions[i * 3] = _originVec.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = _originVec.y + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = _originVec.z + (Math.random() - 0.5) * spread;
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = Math.random() * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;
      emitted++;
    }
  }

  /**
   * Update particles. Call each frame with delta time.
   * @param {number} delta
   */
  function update(delta) {
    // Emit new particles
    _emitAccum += emitRate * delta;
    const toEmit = Math.floor(_emitAccum);
    _emitAccum -= toEmit;
    if (toEmit > 0) _emit(toEmit);

    // Integrate
    for (let i = 0; i < count; i++) {
      if (!alive[i]) {
        positions[i * 3] = 1e9; // hide off-screen
        continue;
      }

      ages[i] += delta;
      if (ages[i] >= lifetimes[i]) {
        alive[i] = 0;
        positions[i * 3] = 1e9;
        continue;
      }

      velocities[i * 3 + 1] += gravity * delta;
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Burst-emit particles (e.g., explosion).
   * @param {number} [n=count/4]
   */
  function burst(n = Math.floor(count / 4)) {
    _emit(n);
  }

  /**
   * Move the emission origin.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  function setOrigin(x, y, z) {
    _originVec.set(x, y, z);
  }

  function dispose() {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  }

  return { update, burst, setOrigin, dispose, points };
}

/**
 * Preset: fire particle system.
 * @param {THREE.Scene} scene
 * @param {number[]} [origin=[0,0,0]]
 * @returns {ParticleSystem}
 */
export function createFire(scene, origin = [0, 0, 0]) {
  return createParticleSystem(scene, {
    count: 300,
    color: 0xff4400,
    size: 0.2,
    lifetime: 1.5,
    spread: 0.3,
    speed: 1.5,
    gravity: -0.5,
    origin,
    emitRate: 80,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Preset: smoke particle system.
 * @param {THREE.Scene} scene
 * @param {number[]} [origin=[0,0,0]]
 * @returns {ParticleSystem}
 */
export function createSmoke(scene, origin = [0, 0, 0]) {
  return createParticleSystem(scene, {
    count: 200,
    color: 0x888888,
    size: 0.5,
    lifetime: 3.0,
    spread: 0.5,
    speed: 0.5,
    gravity: -0.1,
    origin,
    emitRate: 20,
    opacity: 0.3,
    blending: THREE.NormalBlending,
  });
}

/**
 * Preset: sparkle/confetti burst.
 * @param {THREE.Scene} scene
 * @param {number[]} [origin=[0,0,0]]
 * @returns {ParticleSystem}
 */
export function createSparks(scene, origin = [0, 0, 0]) {
  const ps = createParticleSystem(scene, {
    count: 150,
    color: 0xffdd00,
    size: 0.08,
    lifetime: 1.0,
    spread: 0.1,
    speed: 4.0,
    gravity: -6.0,
    origin,
    emitRate: 0, // burst only
    blending: THREE.AdditiveBlending,
  });
  ps.burst(100);
  return ps;
}

/**
 * Preset: snow particle system.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {ParticleSystem}
 */
export function createSnow(scene, {
  count = 600,
  spread = 20,
  height = 15,
} = {}) {
  return createParticleSystem(scene, {
    count,
    color: 0xffffff,
    size: 0.05,
    lifetime: 8,
    spread,
    speed: 0.2,
    gravity: -0.5,
    origin: [0, height, 0],
    emitRate: 30,
    opacity: 0.7,
    blending: THREE.NormalBlending,
  });
}
