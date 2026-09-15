/**
 * effects.js — Post-processing effects via Three.js EffectComposer.
 *
 * Usage:
 *   import { createComposer, addBloom, addFilmGrain } from './runtime/effects.js';
 *   const composer = createComposer(renderer, scene, camera);
 *   addBloom(composer, { strength: 1.5 });
 *   // In tick: composer.render() instead of renderer.render()
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/FilmPass.js';
import { FXAAShader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { VignetteShader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/shaders/VignetteShader.js';

// ── Composer setup ────────────────────────────────────────────────────────────

/**
 * Create an EffectComposer with a base RenderPass.
 * Use `composer.render()` instead of `renderer.render(scene, camera)` in your tick.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @returns {EffectComposer}
 */
export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  return composer;
}

// ── Pass adders ───────────────────────────────────────────────────────────────

/**
 * Add Unreal Bloom post-processing.
 * @param {EffectComposer} composer
 * @param {object} [opts]
 * @returns {UnrealBloomPass}
 */
export function addBloom(composer, {
  strength = 1.0,
  radius = 0.4,
  threshold = 0.85,
} = {}) {
  const pass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    strength, radius, threshold,
  );
  composer.addPass(pass);
  return pass;
}

/**
 * Add film grain / scanlines.
 * @param {EffectComposer} composer
 * @param {object} [opts]
 * @returns {FilmPass}
 */
export function addFilmGrain(composer, {
  noiseIntensity = 0.35,
  scanlinesIntensity = 0.05,
  scanlinesCount = 2048,
  grayscale = false,
} = {}) {
  const pass = new FilmPass(noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale);
  composer.addPass(pass);
  return pass;
}

/**
 * Add FXAA anti-aliasing (useful when renderer antialias is off, e.g. with bloom).
 * @param {EffectComposer} composer
 * @returns {ShaderPass}
 */
export function addFXAA(composer) {
  const pass = new ShaderPass(FXAAShader);
  pass.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
  composer.addPass(pass);
  return pass;
}

/**
 * Add gamma correction (required if renderer.outputColorSpace is not set to sRGB).
 * @param {EffectComposer} composer
 * @returns {ShaderPass}
 */
export function addGammaCorrection(composer) {
  const pass = new ShaderPass(GammaCorrectionShader);
  composer.addPass(pass);
  return pass;
}

/**
 * Add a vignette effect (darkened corners).
 * @param {EffectComposer} composer
 * @param {object} [opts]
 * @returns {ShaderPass}
 */
export function addVignette(composer, {
  offset = 0.95,
  darkness = 0.9,
} = {}) {
  const pass = new ShaderPass(VignetteShader);
  pass.uniforms.offset.value = offset;
  pass.uniforms.darkness.value = darkness;
  composer.addPass(pass);
  return pass;
}

// ── Simple CSS / DOM screen effects (no composer needed) ─────────────────────

/**
 * Add a persistent vignette overlay via CSS.
 * @param {object} [opts]
 * @returns {HTMLElement}
 */
export function addCSSVignette({
  opacity = 0.5,
  color = 'black',
} = {}) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0',
    pointerEvents: 'none',
    zIndex: '50',
    background: `radial-gradient(ellipse at center, transparent 55%, ${color} 100%)`,
    opacity: String(opacity),
  });
  document.body.appendChild(el);
  return el;
}

/**
 * Screen shake by temporarily translating the canvas.
 * @param {THREE.Camera} camera
 * @param {object} [opts]
 */
export function cameraShake(camera, { duration = 0.3, magnitude = 0.1 } = {}) {
  const origin = camera.position.clone();
  const start = performance.now();

  function tick() {
    const t = (performance.now() - start) / (duration * 1000);
    if (t >= 1) {
      camera.position.copy(origin);
      return;
    }
    const decay = 1 - t;
    camera.position.set(
      origin.x + (Math.random() * 2 - 1) * magnitude * decay,
      origin.y + (Math.random() * 2 - 1) * magnitude * decay,
      origin.z + (Math.random() * 2 - 1) * magnitude * decay,
    );
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/**
 * Motion blur approximation via CSS filter on canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [blur=2] - px
 */
export function applyMotionBlur(canvas, blur = 2) {
  canvas.style.filter = `blur(${blur}px)`;
  setTimeout(() => { canvas.style.filter = ''; }, 50);
}

/**
 * Create a simple lens-flare sprite.
 * Add to scene and update position to the light source each frame.
 *
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {{ sprite: THREE.Sprite, setVisible: (v: boolean) => void }}
 */
export function createLensFlare(scene, {
  size = 2,
  color = 0xffffff,
  opacity = 0.6,
} = {}) {
  const mat = new THREE.SpriteMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(size);
  scene.add(sprite);

  return {
    sprite,
    setVisible(v) { sprite.visible = v; },
  };
}
