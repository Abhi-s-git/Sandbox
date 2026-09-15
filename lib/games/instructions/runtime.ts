export const runtimeInstructions = `
## Runtime Environment

The game runs inside a Daytona sandbox — an isolated Linux container. Here is
what you need to know about the environment when reading and writing files.

### Game directory
- All game files live under \`/home/daytona/game/\`.
- The entry point the browser loads is \`/home/daytona/game/index.html\`.
- You may create additional files (images, scripts, JSON data, audio) under this
  directory, but keep the structure flat unless there is a clear reason to nest further.

### Static file server
- A static file server (\`npx serve\`) runs on port 3000 inside the sandbox,
  serving the \`/home/daytona/game/\` directory.
- The server is started automatically before the preview is shown; you do not
  need to start or restart it.
- File changes are picked up immediately on the next browser refresh — there
  is no hot-reload.

### Writing files
- Use the available sandbox file-writing tools to persist code to disk.
- Always write the full file content, not a patch or partial update.
- File paths must be **relative to the game directory**: \`index.html\`, not \`/home/daytona/game/index.html\`.
  Pass \`"index.html"\` to write the entry point, \`"runtime/engine.js"\` for a subdir file, etc.

### Execution constraints
- The sandbox has internet access for fetching CDN assets (e.g. Three.js from jsDelivr).
- Do not attempt to install npm packages, run build tools, or execute Node.js
  code as part of the game — the game runs in the browser, not in Node.
- Do not write files outside \`/home/daytona/game/\`.

---

## Runtime Primitives

Every new sandbox is seeded with a pre-built runtime library at
\`/home/daytona/game/runtime/\`. These are reusable ES modules you can import
directly in the game's HTML/JS files using the relative path \`./runtime/<module>.js\`.

**Always prefer importing from the runtime instead of reimplementing common functionality.**

### Available modules

| Module | Import path | What it provides |
|--------|-------------|-----------------|
| engine | \`./runtime/engine.js\` | Scene, renderer, camera, game loop, resize |
| lighting | \`./runtime/lighting.js\` | Ambient, directional, point, spot, hemisphere lights |
| cameras | \`./runtime/cameras.js\` | Perspective, orthographic, isometric, follow cameras |
| controls | \`./runtime/controls.js\` | OrbitControls, keyboard, FPS pointer-lock, virtual joystick |
| animations | \`./runtime/animations.js\` | AnimationMixer, GLTF clips, rotate/bob/float/orbit/tween |
| models | \`./runtime/models.js\` | loadGLTF, createBox/Sphere/Plane/Cylinder/Capsule/Torus/Ground |
| materials | \`./runtime/materials.js\` | Standard, physical, toon, flat, wireframe, glow, metallic, glass |
| physics | \`./runtime/physics.js\` | Arcade physics world, gravity, AABB collisions, velocity |
| particles | \`./runtime/particles.js\` | Particle systems, fire/smoke/sparks/snow presets |
| sound | \`./runtime/sound.js\` | AudioManager (load/play/fade), positional audio, procedural SFX |
| hud | \`./runtime/hud.js\` | Text labels, health bars, crosshair, minimap, screen flash |
| environment | \`./runtime/environment.js\` | Fog, gradient sky, starfield, grid, axes, day/night cycle, water |
| effects | \`./runtime/effects.js\` | EffectComposer, bloom, film grain, FXAA, vignette, camera shake |
| interaction | \`./runtime/interaction.js\` | Raycaster, object click/hover, ground targeting, drag controls |
| input | \`./runtime/input.js\` | Unified keyboard/mouse/touch/gamepad manager |
| ui | \`./runtime/ui.js\` | Loading screen, start screen, game-over, pause, toasts, dialogs |
| utilities | \`./runtime/utilities.js\` | Math, easing, timers, object pooling, formatting, Vector3 pool |

### Barrel import (all modules at once)
\`\`\`js
import { createEngine, addAmbientLight, createBox, createHUD,
         createInput, showStartScreen } from './runtime/index.js';
\`\`\`

### Three.js CDN
All runtime modules import Three.js from the jsDelivr CDN at r176:
\`\`\`js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
\`\`\`
Use the same URL in the game code to avoid duplicate module instances.

---

## Minimal game skeleton

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
<script type="module">
import { createEngine } from './runtime/engine.js';
import { addThreePointLighting } from './runtime/lighting.js';
import { createBox } from './runtime/models.js';
import { createOrbitControls } from './runtime/controls.js';
import { createInput } from './runtime/input.js';

const { scene, camera, renderer, start, onTick } = createEngine();

addThreePointLighting(scene);
const cube = createBox({ color: 0xea580c });
scene.add(cube);

const controls = createOrbitControls(camera, renderer.domElement);
const input = createInput();

onTick((delta, elapsed) => {
  cube.rotation.y += delta;
  controls.update();
  input.flush();
});

start();
</script>
</body>
</html>
\`\`\`
`.trim();
