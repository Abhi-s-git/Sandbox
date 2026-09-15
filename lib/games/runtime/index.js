/**
 * index.js — Barrel export for all runtime primitives.
 *
 * Generated games can import from this single entry point:
 *   import { createEngine, addAmbientLight, createBox } from './index.js';
 *
 * Or import individual modules for tree-shaking / clarity:
 *   import { createEngine } from './engine.js';
 *   import { addAmbientLight } from './lighting.js';
 */

export * from './engine.js';
export * from './lighting.js';
export * from './cameras.js';
export * from './controls.js';
export * from './animations.js';
export * from './models.js';
export * from './materials.js';
export * from './physics.js';
export * from './particles.js';
export * from './sound.js';
export * from './hud.js';
export * from './environment.js';
export * from './effects.js';
export * from './interaction.js';
export * from './input.js';
export * from './ui.js';
export * from './utilities.js';
