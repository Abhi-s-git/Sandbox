/**
 * models.js — 3D model loading and procedural shape creation.
 *
 * Usage:
 *   import { loadGLTF, loadFBX, createBox, createSphere, createPlane,
 *            createCylinder, createCapsule, createCone } from './runtime/models.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

// Shared loader instances
const _gltfLoader = new GLTFLoader();

// ── GLTF loading ──────────────────────────────────────────────────────────────

/**
 * Load a GLTF/GLB model. Returns the full GLTF result.
 *
 * @param {string} url - URL to the .gltf / .glb file.
 * @param {object} [opts]
 * @param {boolean} [opts.shadows=false] - Enable cast/receiveShadow on all meshes.
 * @param {number[]} [opts.position=[0,0,0]]
 * @param {number[]} [opts.scale=[1,1,1]]
 * @param {number[]} [opts.rotation=[0,0,0]] - Euler angles in radians.
 * @returns {Promise<import('three/examples/jsm/loaders/GLTFLoader').GLTF>}
 *
 * @example
 * const gltf = await loadGLTF('/models/player.glb', { shadows: true });
 * scene.add(gltf.scene);
 */
export function loadGLTF(url, {
  shadows = false,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
} = {}) {
  return new Promise((resolve, reject) => {
    _gltfLoader.load(
      url,
      (gltf) => {
        gltf.scene.position.set(...position);
        gltf.scene.scale.set(...scale);
        gltf.scene.rotation.set(...rotation);

        if (shadows) {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
        }

        resolve(gltf);
      },
      undefined,
      reject,
    );
  });
}

/**
 * Load multiple models in parallel.
 *
 * @param {Array<{ url: string, opts?: object }>} entries
 * @returns {Promise<Array>}
 */
export function loadModels(entries) {
  return Promise.all(entries.map(({ url, opts = {} }) => loadGLTF(url, opts)));
}

// ── Procedural shapes ─────────────────────────────────────────────────────────

/**
 * Create a box mesh.
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createBox({
  width = 1,
  height = 1,
  depth = 1,
  color = 0xffffff,
  material = null,
  position = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
  wireframe = false,
} = {}) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = material ?? new THREE.MeshStandardMaterial({ color, wireframe });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/**
 * Create a sphere mesh.
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createSphere({
  radius = 0.5,
  widthSegments = 32,
  heightSegments = 32,
  color = 0xffffff,
  material = null,
  position = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
} = {}) {
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const mat = material ?? new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/**
 * Create a flat plane mesh.
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createPlane({
  width = 10,
  height = 10,
  color = 0x888888,
  material = null,
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  receiveShadow = false,
} = {}) {
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = material ?? new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/**
 * Create a cylinder mesh.
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createCylinder({
  radiusTop = 0.5,
  radiusBottom = 0.5,
  height = 1,
  segments = 16,
  color = 0xffffff,
  material = null,
  position = [0, 0, 0],
  castShadow = false,
} = {}) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  const mat = material ?? new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  return mesh;
}

/**
 * Create a capsule mesh.
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createCapsule({
  radius = 0.5,
  length = 1,
  capSegments = 8,
  radialSegments = 16,
  color = 0xffffff,
  material = null,
  position = [0, 0, 0],
  castShadow = false,
} = {}) {
  const geo = new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
  const mat = material ?? new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  return mesh;
}

/**
 * Create a cone mesh.
 * @param {object} [opts]
 * @param {number} [opts.radius=0.5] - Radius of the cone base.
 * @param {number} [opts.height=1] - Height of the cone.
 * @param {number} [opts.radialSegments=16] - Number of segmented faces around the circumference.
 * @param {number} [opts.color=0xffffff] - Hex color used when no material is provided.
 * @param {THREE.Material|null} [opts.material=null] - Custom material; overrides color when set.
 * @param {number[]} [opts.position=[0,0,0]] - World position as [x, y, z].
 * @param {boolean} [opts.castShadow=false] - Whether the mesh casts shadows.
 * @returns {THREE.Mesh}
 */
export function createCone({
  radius = 0.5,
  height = 1,
  radialSegments = 16,
  color = 0xffffff,
  material = null,
  position = [0, 0, 0],
  castShadow = false,
} = {}) {
  const geo = new THREE.ConeGeometry(radius, height, radialSegments);
  const mat = material ?? new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  return mesh;
}

/**
 * Create a torus (donut) mesh.
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createTorus({
  radius = 1,
  tube = 0.3,
  radialSegments = 16,
  tubularSegments = 100,
  color = 0xffffff,
  material = null,
  position = [0, 0, 0],
  castShadow = false,
} = {}) {
  const geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
  const mat = material ?? new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  return mesh;
}

/**
 * Create a ground plane (large flat surface for games).
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createGround({
  size = 100,
  color = 0x228822,
  material = null,
  receiveShadow = true,
  y = 0,
} = {}) {
  return createPlane({
    width: size,
    height: size,
    color,
    material,
    position: [0, y, 0],
    rotation: [-Math.PI / 2, 0, 0],
    receiveShadow,
  });
}

/**
 * Add shadows (cast + receive) to all meshes in an object hierarchy.
 * @param {THREE.Object3D} obj
 * @param {object} [opts]
 */
export function applyShadows(obj, { cast = true, receive = true } = {}) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}
