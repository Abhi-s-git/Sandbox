/**
 * physics.js — Simple arcade physics: gravity, velocity, AABB collisions.
 *
 * This is a lightweight, dependency-free physics system for arcade games.
 * For full rigid-body physics, integrate Rapier or Cannon-es separately.
 *
 * Usage:
 *   import { createPhysicsBody, createPhysicsWorld } from './runtime/physics.js';
 *   const world = createPhysicsWorld({ gravity: 9.81 });
 *   const body = world.addBody(mesh, { mass: 1, isStatic: false });
 *   onTick((delta) => world.step(delta));
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/**
 * Create a simple physics world.
 *
 * @param {object} [opts]
 * @param {number} [opts.gravity=9.81]
 * @param {number} [opts.groundY=0]     - Y level that counts as "ground".
 * @returns {PhysicsWorld}
 */
export function createPhysicsWorld({ gravity = 9.81, groundY = 0 } = {}) {
  const _bodies = [];

  /**
   * Add a physics body linked to a Three.js object.
   * @param {THREE.Object3D} object
   * @param {object} [opts]
   * @returns {PhysicsBody}
   */
  function addBody(object, {
    mass = 1,
    isStatic = false,
    bounciness = 0.3,
    friction = 0.8,
    halfExtents = null, // [w/2, h/2, d/2] for AABB; auto-compute if null
  } = {}) {
    // Auto-compute half-extents from bounding box
    let he = halfExtents;
    if (!he) {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      he = [size.x / 2, size.y / 2, size.z / 2];
    }

    const body = {
      object,
      mass,
      isStatic,
      bounciness,
      friction,
      halfExtents: he,
      velocity: new THREE.Vector3(),
      onGround: false,
      /** Apply a force impulse. @param {THREE.Vector3} impulse */
      applyImpulse(impulse) {
        if (!isStatic) this.velocity.add(impulse.clone().divideScalar(mass));
      },
      /** Jump — only if on ground. @param {number} force */
      jump(force = 5) {
        if (this.onGround) this.velocity.y = force;
      },
    };

    _bodies.push(body);
    return body;
  }

  /**
   * Remove a body from the world.
   * @param {PhysicsBody} body
   */
  function removeBody(body) {
    const i = _bodies.indexOf(body);
    if (i !== -1) _bodies.splice(i, 1);
  }

  /**
   * Step the simulation.
   * @param {number} delta - Seconds since last frame.
   */
  function step(delta) {
    for (const body of _bodies) {
      if (body.isStatic) continue;

      // Apply gravity
      body.velocity.y -= gravity * delta;

      // Integrate position
      body.object.position.addScaledVector(body.velocity, delta);

      // Ground collision
      const floorY = groundY + body.halfExtents[1];
      if (body.object.position.y <= floorY) {
        body.object.position.y = floorY;
        body.velocity.y = Math.abs(body.velocity.y) > 0.5
          ? -body.velocity.y * body.bounciness
          : 0;
        body.velocity.x *= body.friction;
        body.velocity.z *= body.friction;
        body.onGround = true;
      } else {
        body.onGround = false;
      }
    }

    // Simple AABB-AABB collision between dynamic bodies
    for (let i = 0; i < _bodies.length; i++) {
      for (let j = i + 1; j < _bodies.length; j++) {
        const a = _bodies[i];
        const b = _bodies[j];
        if (a.isStatic && b.isStatic) continue;
        _resolveAABB(a, b);
      }
    }
  }

  function _resolveAABB(a, b) {
    const ap = a.object.position;
    const bp = b.object.position;
    const dx = bp.x - ap.x;
    const dy = bp.y - ap.y;
    const dz = bp.z - ap.z;
    const overlapX = a.halfExtents[0] + b.halfExtents[0] - Math.abs(dx);
    const overlapY = a.halfExtents[1] + b.halfExtents[1] - Math.abs(dy);
    const overlapZ = a.halfExtents[2] + b.halfExtents[2] - Math.abs(dz);
    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return; // no overlap

    // Push along smallest overlap axis
    if (overlapX < overlapY && overlapX < overlapZ) {
      const sign = dx > 0 ? 1 : -1;
      if (!a.isStatic) ap.x -= sign * overlapX * 0.5;
      if (!b.isStatic) bp.x += sign * overlapX * 0.5;
      if (!a.isStatic) a.velocity.x = 0;
      if (!b.isStatic) b.velocity.x = 0;
    } else if (overlapY < overlapZ) {
      const sign = dy > 0 ? 1 : -1;
      if (!a.isStatic) ap.y -= sign * overlapY * 0.5;
      if (!b.isStatic) bp.y += sign * overlapY * 0.5;
      if (!a.isStatic) a.velocity.y = 0;
      if (!b.isStatic) b.velocity.y = 0;
    } else {
      const sign = dz > 0 ? 1 : -1;
      if (!a.isStatic) ap.z -= sign * overlapZ * 0.5;
      if (!b.isStatic) bp.z += sign * overlapZ * 0.5;
      if (!a.isStatic) a.velocity.z = 0;
      if (!b.isStatic) b.velocity.z = 0;
    }
  }

  /** Get all bodies. */
  function getBodies() { return [..._bodies]; }

  return { addBody, removeBody, step, getBodies };
}

/**
 * Check if two Three.js objects' bounding boxes overlap.
 * @param {THREE.Object3D} a
 * @param {THREE.Object3D} b
 * @returns {boolean}
 */
export function aabbOverlap(a, b) {
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

/**
 * Check overlap between a Box3 and a sphere.
 * @param {THREE.Box3} box
 * @param {THREE.Sphere} sphere
 * @returns {boolean}
 */
export function boxSphereOverlap(box, sphere) {
  return box.intersectsSphere(sphere);
}

/**
 * Project velocity onto a surface normal (for sliding along walls).
 * @param {THREE.Vector3} velocity
 * @param {THREE.Vector3} normal - Surface normal (normalised).
 * @returns {THREE.Vector3}
 */
export function slidingVelocity(velocity, normal) {
  const dot = velocity.dot(normal);
  return velocity.clone().sub(normal.clone().multiplyScalar(dot));
}
