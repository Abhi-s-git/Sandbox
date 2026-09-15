/**
 * engine.js — Core game engine: scene, renderer, clock, and game loop.
 *
 * Usage:
 *   import { createEngine } from './runtime/engine.js';
 *   const { scene, camera, renderer, clock, start, stop, onTick } = createEngine();
 *   onTick((delta, elapsed) => { ... });
 *   start();
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/**
 * Creates a fully configured Three.js game engine instance.
 *
 * @param {object} [options]
 * @param {HTMLElement} [options.container=document.body] - DOM element to append the canvas to.
 * @param {number}  [options.fov=75]           - Camera field of view.
 * @param {number}  [options.near=0.1]         - Camera near clip.
 * @param {number}  [options.far=1000]         - Camera far clip.
 * @param {boolean} [options.antialias=true]   - Renderer antialiasing.
 * @param {boolean} [options.shadows=false]    - Enable shadow maps.
 * @param {number|string} [options.background=0x111111] - Scene background colour.
 * @param {boolean} [options.alpha=false]      - Transparent renderer background.
 * @returns {EngineInstance}
 */
export function createEngine({
  container = document.body,
  fov = 75,
  near = 0.1,
  far = 1000,
  antialias = true,
  shadows = false,
  background = 0x111111,
  alpha = false,
} = {}) {
  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  if (background !== null && background !== undefined) {
    scene.background = new THREE.Color(background);
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    fov,
    container.clientWidth / container.clientHeight,
    near,
    far,
  );
  camera.position.set(0, 0, 5);

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  container.appendChild(renderer.domElement);

  // ── Clock & loop state ─────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let _running = false;
  let _rafId = null;
  const _tickCallbacks = [];

  // ── Resize handler ─────────────────────────────────────────────────────────
  function _onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  window.addEventListener('resize', _onResize);

  // ── Game loop ──────────────────────────────────────────────────────────────
  function _loop() {
    if (!_running) return;
    _rafId = requestAnimationFrame(_loop);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    for (const cb of _tickCallbacks) cb(delta, elapsed);
    renderer.render(scene, camera);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function start() {
    if (_running) return;
    _running = true;
    clock.start();
    _loop();
  }

  function stop() {
    _running = false;
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  /**
   * Register a per-frame callback.
   * @param {(delta: number, elapsed: number) => void} fn
   */
  function onTick(fn) {
    _tickCallbacks.push(fn);
  }

  /**
   * Remove a previously registered tick callback.
   * @param {Function} fn
   */
  function offTick(fn) {
    const i = _tickCallbacks.indexOf(fn);
    if (i !== -1) _tickCallbacks.splice(i, 1);
  }

  /** Dispose all engine resources. */
  function dispose() {
    stop();
    window.removeEventListener('resize', _onResize);
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return { scene, camera, renderer, clock, start, stop, onTick, offTick, dispose };
}
