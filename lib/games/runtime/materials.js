/**
 * materials.js — Material factory helpers.
 *
 * Usage:
 *   import { createStandardMaterial, createToonMaterial,
 *            createWireframeMaterial, createGlowMaterial } from './runtime/materials.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

/**
 * Create a PBR standard material.
 * @param {object} [opts]
 * @returns {THREE.MeshStandardMaterial}
 */
export function createStandardMaterial({
  color = 0xffffff,
  roughness = 0.5,
  metalness = 0.0,
  emissive = 0x000000,
  emissiveIntensity = 1,
  map = null,
  normalMap = null,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
  wireframe = false,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, emissive, emissiveIntensity,
    map, normalMap, transparent, opacity, side, wireframe,
  });
}

/**
 * Create a physically-based material with advanced properties.
 * @param {object} [opts]
 * @returns {THREE.MeshPhysicalMaterial}
 */
export function createPhysicalMaterial({
  color = 0xffffff,
  roughness = 0.0,
  metalness = 0.0,
  transmission = 0,
  thickness = 0.5,
  ior = 1.5,
  clearcoat = 0,
  clearcoatRoughness = 0.1,
  transparent = false,
  opacity = 1,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, metalness, transmission, thickness, ior,
    clearcoat, clearcoatRoughness, transparent, opacity,
  });
}

/**
 * Create a toon (cel-shaded) material.
 * @param {object} [opts]
 * @returns {THREE.MeshToonMaterial}
 */
export function createToonMaterial({
  color = 0xff8800,
  gradientMap = null,
} = {}) {
  const mat = new THREE.MeshToonMaterial({ color });
  if (gradientMap) mat.gradientMap = gradientMap;
  return mat;
}

/**
 * Create a flat unlit material (ignores lights).
 * @param {object} [opts]
 * @returns {THREE.MeshBasicMaterial}
 */
export function createFlatMaterial({
  color = 0xffffff,
  map = null,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
} = {}) {
  return new THREE.MeshBasicMaterial({ color, map, transparent, opacity, side });
}

/**
 * Create a wireframe material.
 * @param {object} [opts]
 * @returns {THREE.MeshBasicMaterial}
 */
export function createWireframeMaterial({ color = 0x00ff00 } = {}) {
  return new THREE.MeshBasicMaterial({ color, wireframe: true });
}

/**
 * Create an emissive glow material (self-illuminated).
 * @param {object} [opts]
 * @returns {THREE.MeshStandardMaterial}
 */
export function createGlowMaterial({
  color = 0x00ffff,
  emissiveIntensity = 2.0,
  roughness = 1.0,
  metalness = 0.0,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity,
    roughness,
    metalness,
  });
}

/**
 * Create a metallic material.
 * @param {object} [opts]
 * @returns {THREE.MeshStandardMaterial}
 */
export function createMetallicMaterial({
  color = 0xaaaaaa,
  roughness = 0.1,
  metalness = 1.0,
  envMapIntensity = 1.0,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  mat.envMapIntensity = envMapIntensity;
  return mat;
}

/**
 * Create a glass/transparent material.
 * @param {object} [opts]
 * @returns {THREE.MeshPhysicalMaterial}
 */
export function createGlassMaterial({
  color = 0xffffff,
  transmission = 0.95,
  roughness = 0.0,
  ior = 1.5,
  thickness = 0.5,
} = {}) {
  return createPhysicalMaterial({ color, transmission, roughness, ior, thickness, transparent: true });
}

/**
 * Create a lava / magma material using vertex color displacement simulation.
 * Uses emissive to create hot-glow effect.
 * @param {object} [opts]
 * @returns {THREE.MeshStandardMaterial}
 */
export function createLavaMaterial({
  color = 0xff3300,
  emissiveIntensity = 1.5,
  roughness = 0.8,
} = {}) {
  return createStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness,
    metalness: 0,
  });
}

/**
 * Create a sprite material for billboarded sprites.
 * @param {THREE.Texture} [map]
 * @param {object} [opts]
 * @returns {THREE.SpriteMaterial}
 */
export function createSpriteMaterial(map = null, {
  color = 0xffffff,
  transparent = true,
  opacity = 1,
  sizeAttenuation = true,
} = {}) {
  return new THREE.SpriteMaterial({ map, color, transparent, opacity, sizeAttenuation });
}

/**
 * Create a line material.
 * @param {object} [opts]
 * @returns {THREE.LineBasicMaterial}
 */
export function createLineMaterial({
  color = 0xffffff,
  linewidth = 1,
} = {}) {
  return new THREE.LineBasicMaterial({ color, linewidth });
}
