export const primitivesInstructions = `
## Runtime Primitives — Detailed Usage Guide

This guide explains how to use each runtime module when generating a Three.js game.
Always import from the seeded runtime at \`./runtime/<module>.js\` (relative to the game directory).
Never re-implement functionality that already exists in the runtime.

---

### engine.js — Core game loop

\`createEngine(opts)\` sets up scene, camera, renderer, clock, and resize handling.
Call \`start()\` to begin the loop. Register per-frame logic with \`onTick\`.

\`\`\`js
import { createEngine } from './runtime/engine.js';

const { scene, camera, renderer, clock, start, onTick, dispose } = createEngine({
  background: 0x0a0a0a,   // Scene background colour
  fov: 75,                 // Camera field of view
  antialias: true,
  shadows: true,           // Enable shadow maps
  alpha: false,            // Transparent background
});

onTick((delta, elapsed) => {
  // delta: seconds since last frame (use for frame-rate-independent motion)
  // elapsed: total seconds since start
  mesh.rotation.y += delta * 0.5;
});

start(); // Begin the render loop
\`\`\`

---

### lighting.js — Lights

\`\`\`js
import { addAmbientLight, addDirectionalLight, addPointLight,
         addSpotLight, addHemisphereLight, addThreePointLighting,
         addDaylightLighting } from './runtime/lighting.js';

addAmbientLight(scene, { color: 0xffffff, intensity: 0.4 });
addDirectionalLight(scene, { position: [5, 10, 5], castShadow: true });
addPointLight(scene, { color: 0xff8800, position: [0, 3, 0], distance: 20 });

// Preset: classic 3-point studio lighting
addThreePointLighting(scene);

// Preset: outdoor sun + sky
addDaylightLighting(scene, { castShadow: true });
\`\`\`

---

### cameras.js — Camera types

\`\`\`js
import { createPerspectiveCamera, createOrthographicCamera,
         createIsometricCamera, createTopDownCamera,
         createFollowCamera } from './runtime/cameras.js';

// Standard FPS / third-person perspective
const cam = createPerspectiveCamera({ fov: 75, position: [0, 2, 8] });

// Top-down / overhead
const topCam = createTopDownCamera({ height: 20 });

// Isometric (RTS-style)
const isoCam = createIsometricCamera({ frustumSize: 12 });

// Smooth follow camera (e.g. for a player character)
const follow = createFollowCamera(camera, { offset: [0, 4, -8] });
follow.setTarget(playerMesh);
onTick((delta) => follow.update(delta));
\`\`\`

---

### controls.js — User controls

\`\`\`js
import { createOrbitControls, createKeyboardControls,
         getMovementVector, createFPSControls,
         createVirtualJoystick } from './runtime/controls.js';

// Mouse orbit (good for exploration, demos)
const orbit = createOrbitControls(camera, renderer.domElement, { autoRotate: true });
onTick(() => orbit.update());

// Keyboard movement
const kb = createKeyboardControls();
onTick((delta) => {
  const { x, z } = getMovementVector(kb);
  player.position.x += x * speed * delta;
  player.position.z += z * speed * delta;
});

// First-person pointer-lock
const fps = createFPSControls(camera, renderer.domElement, { moveSpeed: 6 });
onTick((delta) => fps.update(delta));

// Mobile joystick
const joystick = createVirtualJoystick(document.body);
onTick(() => {
  const { x, z } = joystick.getVector();
  player.position.x += x * speed * delta;
  player.position.z += z * speed * delta;
});
\`\`\`

---

### input.js — Unified input

For games with complex input, createInput() tracks everything in one place.
Call input.flush() at the END of each tick to clear one-frame states.

\`\`\`js
import { createInput } from './runtime/input.js';

const input = createInput();

onTick((delta) => {
  // Keyboard
  if (input.keys.isDown('Space')) jump();
  if (input.keys.wasPressed('KeyR')) reload();
  const { x, z } = input.keys.movement; // WASD normalised vector

  // Mouse
  if (input.mouse.wasPressed(0)) shoot();  // left click
  if (input.mouse.buttons[2]) aim();       // right hold
  camera.rotation.y -= input.mouse.deltaX * 0.002;

  // Touch
  if (input.touch.count > 0) handleTouch(input.touch.first);

  // Gamepad
  const stick = input.gamepad?.leftStick;
  if (stick) { player.position.x += stick.x * speed * delta; }

  input.flush(); // IMPORTANT: call last
});
\`\`\`

---

### models.js — Shapes and GLTF

\`\`\`js
import { createBox, createSphere, createPlane, createCylinder,
         createCapsule, createTorus, createGround, loadGLTF,
         applyShadows } from './runtime/models.js';

// Primitive shapes
const floor = createGround({ size: 50, receiveShadow: true });
scene.add(floor);

const player = createCapsule({ radius: 0.4, length: 1, color: 0x3388ff, castShadow: true });
scene.add(player);

// Load GLTF model
const gltf = await loadGLTF('./models/tree.glb', { shadows: true, position: [2, 0, 0] });
scene.add(gltf.scene);
\`\`\`

---

### materials.js — Surfaces

Pass as the "material" option to any shape factory.

\`\`\`js
import { createStandardMaterial, createGlowMaterial,
         createGlassMaterial, createToonMaterial } from './runtime/materials.js';

const rock  = createStandardMaterial({ color: 0x777777, roughness: 0.9 });
const glow  = createGlowMaterial({ color: 0x00ffcc, emissiveIntensity: 2.5 });
const glass = createGlassMaterial({ transmission: 0.9 });
const toon  = createToonMaterial({ color: 0xff6600 });

const gem = createBox({ material: glow, castShadow: true });
scene.add(gem);
\`\`\`

---

### animations.js — Motion

\`\`\`js
import { createMixer, playClip, crossfade,
         rotateObject, bobObject, floatObject,
         orbitObject, tweenPosition, shakeObject } from './runtime/animations.js';

// GLTF animation
const gltf = await loadGLTF('./player.glb');
scene.add(gltf.scene);
const mixer = createMixer(gltf.scene);
playClip(mixer, gltf.animations, 'walk', { loop: true });
onTick((delta) => mixer.update(delta));

// Procedural rotation — returns a tick function
onTick(rotateObject(cube, { y: 1.2 }));

// Float up and down
onTick(bobObject(gem, { amplitude: 0.3, frequency: 0.8 }));

// Orbit around a point
onTick(orbitObject(planet, { radius: 5, speed: 0.5 }));

// One-shot position tween with easing
await tweenPosition(enemy, [10, 0, 0], 1.5, (t) => t * (2 - t));

// Damage feedback shake
shakeObject(player, { duration: 0.3, magnitude: 0.15 });
\`\`\`

---

### physics.js — Arcade physics

\`\`\`js
import { createPhysicsWorld, aabbOverlap } from './runtime/physics.js';

const world = createPhysicsWorld({ gravity: 9.81, groundY: 0 });

const playerBody = world.addBody(playerMesh, { mass: 1, bounciness: 0.1 });
const platformBody = world.addBody(platform, { isStatic: true });

onTick((delta) => {
  // Apply movement force
  const { x, z } = input.keys.movement;
  playerBody.velocity.x = x * 5;
  playerBody.velocity.z = z * 5;

  // Jump
  if (input.keys.wasPressed('Space')) playerBody.jump(8);

  world.step(delta);
  input.flush();
});

// Simple overlap check (no world needed)
if (aabbOverlap(playerMesh, collectibleMesh)) collectItem();
\`\`\`

---

### particles.js — Particle systems

\`\`\`js
import { createParticleSystem, createFire, createSmoke,
         createSparks, createSnow } from './runtime/particles.js';

// Custom particle system
const trail = createParticleSystem(scene, {
  count: 300,
  color: 0x00aaff,
  size: 0.06,
  lifetime: 1.5,
  spread: 0.2,
  gravity: -1,
  emitRate: 60,
});
onTick((delta) => {
  trail.setOrigin(player.position.x, player.position.y, player.position.z);
  trail.update(delta);
});

// Presets
const fire = createFire(scene, [0, 0, 0]);
onTick((delta) => fire.update(delta));

// One-shot explosion burst
const sparks = createSparks(scene, enemy.position.toArray());
onTick((delta) => sparks.update(delta));

const snow = createSnow(scene);
onTick((delta) => snow.update(delta));
\`\`\`

---

### sound.js — Audio

Requires a user interaction before Web Audio API can play (browser policy).
Use showStartScreen() first, then load and play sounds.

\`\`\`js
import { createAudioManager, createProceduralSound } from './runtime/sound.js';

const audio = createAudioManager(camera);

// Load files
await audio.load('bgm',  './sounds/music.mp3', { loop: true, volume: 0.5 });
await audio.load('jump', './sounds/jump.wav');
await audio.load('hit',  './sounds/hit.wav');

audio.play('bgm');
if (input.keys.wasPressed('Space')) audio.play('jump');

// Fade music out on game over
audio.fade('bgm', 0, 2.0);

// Procedural sounds (no files needed)
const bleep = createProceduralSound('powerup');
bleep(); // call to play
\`\`\`

---

### hud.js — Heads-up display

\`\`\`js
import { createHUD } from './runtime/hud.js';

const hud = createHUD();

// Score label
hud.addLabel('score', {
  text: 'Score: 0', top: '16px', left: '16px',
  fontSize: '20px', fontWeight: '700',
});
hud.setLabel('score', 'Score: ' + score);

// Health bar
const { setBar: setHP } = hud.addBar('hp', {
  value: 100, max: 100, top: '16px', left: '16px',
  label: 'HP', fillColor: '#22cc44',
});
setHP(currentHP, maxHP);

// Crosshair for FPS
hud.addCrosshair();

// Minimap canvas
const { ctx: mapCtx } = hud.addMinimap({ size: 120, bottom: '20px', right: '20px' });

// Screen flash on damage
hud.flash('rgba(255,0,0,0.35)', 0.25);
\`\`\`

---

### environment.js — Scene atmosphere

\`\`\`js
import { addLinearFog, addGradientSky, addStarfield,
         addGrid, createDayNightCycle, createWater } from './runtime/environment.js';

addGradientSky(scene, { topColor: 0x0a1128, bottomColor: 0x1a3a5c });
addStarfield(scene, { count: 2000 });
addLinearFog(scene, { color: 0x0a1128, near: 30, far: 120 });
addGrid(scene, { size: 40, divisions: 40 });

const water = createWater(scene, { width: 200, depth: 200, y: -1 });

const dayNight = createDayNightCycle({
  sun: sunLight, ambient, cycleDuration: 120,
});
onTick((_d, elapsed) => dayNight.update(elapsed));
\`\`\`

---

### effects.js — Post-processing

When using EffectComposer, replace renderer.render(scene, camera) with
composer.render(). The engine module does NOT do this automatically.

\`\`\`js
import { createComposer, addBloom, addVignette, addFXAA,
         addCSSVignette, cameraShake } from './runtime/effects.js';

const composer = createComposer(renderer, scene, camera);
addBloom(composer, { strength: 1.2, radius: 0.4, threshold: 0.8 });
addVignette(composer, { darkness: 0.8 });

// Replace the engine tick render with composer render
const { scene, camera, renderer, start, onTick } = createEngine();
onTick(() => composer.render()); // composer.render() includes scene.render internally

// CSS vignette (simpler, no composer needed)
addCSSVignette({ opacity: 0.4 });

// Camera shake on impact
cameraShake(camera, { duration: 0.3, magnitude: 0.15 });
\`\`\`

---

### interaction.js — Raycasting and clicking

\`\`\`js
import { onObjectClick, onObjectHover, getGroundPoint,
         createRaycaster } from './runtime/interaction.js';

// Click to select
onObjectClick(camera, selectableObjects, (hit) => {
  console.log('Clicked', hit.object.name, 'at', hit.point);
  hit.object.material.emissive.set(0xff8800);
});

// Hover highlight
onObjectHover(
  camera, interactables,
  {
    onEnter: (hit) => { hit.object.scale.setScalar(1.1); },
    onLeave: (obj) => { obj.scale.setScalar(1); },
  },
  { domElement: renderer.domElement },
);

// Get world position under mouse click (RTS targeting)
canvas.addEventListener('click', (e) => {
  const pos = getGroundPoint(camera, e);
  if (pos) moveTo(pos);
});
\`\`\`

---

### ui.js — Menus and screens

\`\`\`js
import { showStartScreen, showGameOverScreen, showLoadingScreen,
         createPauseScreen, showNotification, showDialog } from './runtime/ui.js';

// Loading screen with progress
const loading = showLoadingScreen({ title: 'My Game' });
loading.setProgress(50);
loading.setMessage('Loading assets...');
loading.hide();

// Start screen - waits for player to click Play
await showStartScreen({ title: 'Space Blaster', subtitle: 'Click to launch' });

// Pause on Escape
const pause = createPauseScreen();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') { paused ? pause.hide() : pause.show(); paused = !paused; }
});

// Game over - waits for restart click
await showGameOverScreen({ title: 'Game Over', score: 4200 });
restartGame();

// Toast notification
showNotification('Achievement Unlocked!', { duration: 3000 });

// Confirm dialog
const choice = await showDialog({
  title: 'Quit?',
  message: 'Your progress will be lost.',
  buttons: [{ label: 'Cancel', value: 'cancel' }, { label: 'Quit', value: 'quit', primary: true }],
});
if (choice === 'quit') restartGame();
\`\`\`

---

### utilities.js — Math and helpers

\`\`\`js
import { lerp, clamp, randomRange, randomPick,
         createTimer, createObjectPool, Easing,
         delay, formatTime, formatScore,
         disposeObject } from './runtime/utilities.js';

// Math
const smooth = lerp(current, target, delta * 5);
const health = clamp(hp - damage, 0, 100);
const angle  = randomRange(0, Math.PI * 2);
const dir    = randomPick(['N', 'E', 'S', 'W']);

// Easing
mesh.position.y = lerp(0, 5, Easing.easeOutCubic(t));

// Repeating timer (spawn enemies every 3s)
const spawnTimer = createTimer(3.0, () => spawnEnemy());
onTick((delta) => spawnTimer.update(delta));

// Object pool (bullets)
const bulletPool = createObjectPool(
  () => { const m = createBox({ color: 0xffff00 }); scene.add(m); return m; },
  (b) => { b.visible = false; b.position.set(0, -999, 0); },
  20, // pre-warm
);
const bullet = bulletPool.get();
bullet.visible = true;
// later:
bulletPool.release(bullet);

// Formatting
hud.setLabel('timer', formatTime(elapsed));   // "01:23"
hud.setLabel('score', formatScore(score));    // "12,345"

// Proper cleanup when leaving scene
disposeObject(importedModel);
scene.remove(importedModel);
\`\`\`

---

## Game structure patterns

### Pattern 1 — Single-file game (recommended for simple games)
Keep everything in index.html with an inline script type="module".
Import only the runtime modules you need.

### Pattern 2 — Multi-file game
Create separate JS files for game logic:
- index.html — entry point
- player.js — player class importing from runtime
- enemies.js — enemy logic
- levels.js — level data

### Performance notes
- Use createObjectPool for frequently spawned objects (bullets, particles).
- Call disposeObject when removing large models from the scene.
- Merge static geometry if you have many identical meshes.
- Shadows are expensive: only enable castShadow on key meshes.
- Prefer addThreePointLighting over many point lights.

### Responsive canvas
The engine automatically handles resize events. If you manage the canvas manually,
call renderer.setSize(window.innerWidth, window.innerHeight) and update
camera.aspect on the resize event.
`.trim();
