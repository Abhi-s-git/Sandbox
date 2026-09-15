/**
 * lighting.js — Scene lighting helpers.
 *
 * Usage:
 *   import { addAmbientLight, addDirectionalLight, addPointLight,
 *            addSpotLight, addHemisphereLight, addThreePointLighting,
 *            addDaylightLighting } from './runtime/lighting.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/**
 * Add an ambient (uniform fill) light.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @param {number|string} [opts.color=0xffffff]
 * @param {number} [opts.intensity=0.5]
 * @returns {THREE.AmbientLight}
 */
export function addAmbientLight(scene, { color = 0xffffff, intensity = 0.5 } = {}) {
  const light = new THREE.AmbientLight(color, intensity);
  scene.add(light);
  return light;
}

/**
 * Add a hemisphere (sky/ground) light.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.HemisphereLight}
 */
export function addHemisphereLight(scene, {
  skyColor = 0x87ceeb,
  groundColor = 0x444444,
  intensity = 0.6,
  position = [0, 50, 0],
} = {}) {
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  light.position.set(...position);
  scene.add(light);
  return light;
}

/**
 * Add a directional (sun-like) light.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.DirectionalLight}
 */
export function addDirectionalLight(scene, {
  color = 0xffffff,
  intensity = 1.0,
  position = [5, 10, 5],
  castShadow = false,
  shadowMapSize = 2048,
  shadowCameraBounds = 10,
} = {}) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);

  if (castShadow) {
    light.castShadow = true;
    light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    light.shadow.camera.left = -shadowCameraBounds;
    light.shadow.camera.right = shadowCameraBounds;
    light.shadow.camera.top = shadowCameraBounds;
    light.shadow.camera.bottom = -shadowCameraBounds;
    light.shadow.bias = -0.0001;
    light.shadow.normalBias = 0.02;
  }

  scene.add(light);
  return light;
}

/**
 * Add a point light (omni-directional bulb).
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.PointLight}
 */
export function addPointLight(scene, {
  color = 0xffffff,
  intensity = 1.0,
  distance = 100,
  decay = 2,
  position = [0, 5, 0],
  castShadow = false,
} = {}) {
  const light = new THREE.PointLight(color, intensity, distance, decay);
  light.position.set(...position);
  if (castShadow) light.castShadow = true;
  scene.add(light);
  return light;
}

/**
 * Add a spot light (cone-shaped).
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.SpotLight}
 */
export function addSpotLight(scene, {
  color = 0xffffff,
  intensity = 1.0,
  distance = 100,
  angle = Math.PI / 6,
  penumbra = 0.3,
  decay = 2,
  position = [0, 10, 0],
  target = [0, 0, 0],
  castShadow = false,
} = {}) {
  const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
  light.position.set(...position);
  light.target.position.set(...target);
  scene.add(light.target);
  if (castShadow) light.castShadow = true;
  scene.add(light);
  return light;
}

/**
 * Classic three-point lighting setup (key + fill + rim + ambient).
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {{ key, fill, rim, ambient }}
 */
export function addThreePointLighting(scene, {
  keyIntensity = 1.0,
  fillIntensity = 0.4,
  rimIntensity = 0.3,
  ambientIntensity = 0.2,
} = {}) {
  const key = addDirectionalLight(scene, { position: [5, 5, 5], intensity: keyIntensity });
  const fill = addDirectionalLight(scene, { position: [-5, 3, 5], intensity: fillIntensity });
  const rim = addDirectionalLight(scene, { position: [0, 5, -5], intensity: rimIntensity });
  const ambient = addAmbientLight(scene, { color: 0x404040, intensity: ambientIntensity });
  return { key, fill, rim, ambient };
}

/**
 * Outdoor daylight: directional sun + hemisphere sky.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {{ sun, sky }}
 */
export function addDaylightLighting(scene, {
  sunIntensity = 1.5,
  skyIntensity = 0.6,
  castShadow = false,
} = {}) {
  const sun = addDirectionalLight(scene, {
    color: 0xffffcc,
    intensity: sunIntensity,
    position: [50, 100, 50],
    castShadow,
  });
  const sky = addHemisphereLight(scene, { intensity: skyIntensity });
  return { sun, sky };
}
