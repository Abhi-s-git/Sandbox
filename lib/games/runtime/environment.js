/**
 * environment.js — Scene environment: fog, skybox, ground, stars.
 *
 * Usage:
 *   import { addFog, addStarfield, addSkybox, addGrid } from './runtime/environment.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

// ── Fog ───────────────────────────────────────────────────────────────────────

/**
 * Add linear fog to the scene.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 */
export function addLinearFog(scene, {
  color = 0x888888,
  near = 10,
  far = 100,
} = {}) {
  scene.fog = new THREE.Fog(color, near, far);
  return scene.fog;
}

/**
 * Add exponential fog to the scene.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 */
export function addExpFog(scene, {
  color = 0x888888,
  density = 0.02,
} = {}) {
  scene.fog = new THREE.FogExp2(color, density);
  return scene.fog;
}

/** Remove fog. */
export function removeFog(scene) {
  scene.fog = null;
}

// ── Sky background ────────────────────────────────────────────────────────────

/**
 * Set a solid colour background.
 * @param {THREE.Scene} scene
 * @param {number|string} color
 */
export function setSolidBackground(scene, color = 0x111111) {
  scene.background = new THREE.Color(color);
}

/**
 * Create a gradient sky background using a large sphere.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function addGradientSky(scene, {
  topColor = 0x0a1128,
  bottomColor = 0x1a3a5c,
  radius = 450,
} = {}) {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  // Vertex colours for gradient
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const top = new THREE.Color(topColor);
  const bottom = new THREE.Color(bottomColor);
  const pos = geo.attributes.position;
  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    const t = (y / radius + 1) / 2; // 0=bottom 1=top
    const c = bottom.clone().lerp(top, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
  });

  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  scene.add(sky);
  return sky;
}

/**
 * Create a procedural starfield (point cloud sphere).
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.Points}
 */
export function addStarfield(scene, {
  count = 3000,
  radius = 400,
  size = 0.5,
  color = 0xffffff,
} = {}) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Random point on sphere surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.8 + Math.random() * 0.2);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: false });
  const stars = new THREE.Points(geo, mat);
  stars.name = 'starfield';
  scene.add(stars);
  return stars;
}

// ── Helper objects ────────────────────────────────────────────────────────────

/**
 * Add a grid helper to visualise the floor plane.
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.GridHelper}
 */
export function addGrid(scene, {
  size = 20,
  divisions = 20,
  colorCenter = 0x444444,
  colorGrid = 0x222222,
  y = 0,
} = {}) {
  const grid = new THREE.GridHelper(size, divisions, colorCenter, colorGrid);
  grid.position.y = y;
  scene.add(grid);
  return grid;
}

/**
 * Add XYZ axes helper.
 * @param {THREE.Scene} scene
 * @param {number} [size=2]
 * @returns {THREE.AxesHelper}
 */
export function addAxes(scene, size = 2) {
  const axes = new THREE.AxesHelper(size);
  scene.add(axes);
  return axes;
}

/**
 * Create a simple day/night cycle controller.
 * Controls sun position, sky colour, and ambient intensity over time.
 *
 * @param {object} [opts]
 * @returns {{ update: (elapsed: number) => void }}
 */
export function createDayNightCycle({
  sun = null,
  ambient = null,
  sky = null,
  cycleDuration = 120, // seconds per full day/night cycle
  dayAmbient = 0.6,
  nightAmbient = 0.05,
  sunRadius = 80,
} = {}) {
  const _dayColor = new THREE.Color(0xffffcc);
  const _nightColor = new THREE.Color(0x001133);
  const _sunsetColor = new THREE.Color(0xff6622);

  return {
    update(elapsed) {
      const t = (elapsed % cycleDuration) / cycleDuration; // 0–1
      const sunAngle = t * Math.PI * 2 - Math.PI / 2;
      const sunY = Math.sin(sunAngle);

      if (sun) {
        sun.position.x = Math.cos(sunAngle) * sunRadius;
        sun.position.y = sunY * sunRadius;
        // Sunset/sunrise colour
        const horizonT = Math.max(0, 1 - Math.abs(sunY) * 2);
        const dayT = Math.max(0, sunY);
        sun.color.copy(_nightColor).lerp(_sunsetColor, horizonT).lerp(_dayColor, dayT);
        sun.intensity = Math.max(0, sunY) * 1.5;
      }

      if (ambient) {
        ambient.intensity = nightAmbient + (dayAmbient - nightAmbient) * Math.max(0, sunY);
      }

      if (sky) {
        // Crude sky colour shift
        const skyHue = 0.57 * Math.max(0, sunY) + 0.02 * (1 - Math.max(0, sunY));
        sky.material.color?.setHSL(skyHue, 0.6, 0.3 + 0.3 * Math.max(0, sunY));
      }
    },
  };
}

/**
 * Create a simple water plane (flat reflective surface).
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {THREE.Mesh}
 */
export function createWater(scene, {
  width = 100,
  depth = 100,
  color = 0x0066bb,
  opacity = 0.7,
  y = 0,
} = {}) {
  const geo = new THREE.PlaneGeometry(width, depth, 16, 16);
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.1,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(geo, mat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = y;
  water.name = 'water';
  scene.add(water);

  return water;
}
