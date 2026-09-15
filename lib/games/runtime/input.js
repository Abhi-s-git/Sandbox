/**
 * input.js — Unified input manager: keyboard, mouse, gamepad, and touch.
 *
 * Usage:
 *   import { createInput } from './runtime/input.js';
 *   const input = createInput();
 *   onTick(() => {
 *     if (input.keys.isDown('Space')) { jump(); }
 *     if (input.mouse.buttons[0]) { shoot(); }
 *   });
 */

/**
 * Create a unified input manager.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.trackMouse=true]
 * @param {boolean} [opts.trackGamepad=true]
 * @returns {InputManager}
 */
export function createInput({ trackMouse = true, trackGamepad = true } = {}) {
  // ── Keyboard ──────────────────────────────────────────────────────────────
  const _keysDown = new Set();
  const _keysJustPressed = new Set();
  const _keysJustReleased = new Set();

  const _onKeyDown = (e) => {
    if (!_keysDown.has(e.code)) _keysJustPressed.add(e.code);
    _keysDown.add(e.code);
  };
  const _onKeyUp = (e) => {
    _keysDown.delete(e.code);
    _keysJustReleased.add(e.code);
  };

  window.addEventListener('keydown', _onKeyDown);
  window.addEventListener('keyup', _onKeyUp);

  const keys = {
    /** True while key is held. @param {string} code */
    isDown(code) { return _keysDown.has(code); },
    /** True on the frame the key was pressed. @param {string} code */
    wasPressed(code) { return _keysJustPressed.has(code); },
    /** True on the frame the key was released. @param {string} code */
    wasReleased(code) { return _keysJustReleased.has(code); },
    /** WASD / arrow normalised movement vector { x, z }. */
    get movement() {
      let x = 0, z = 0;
      if (_keysDown.has('KeyW') || _keysDown.has('ArrowUp')) z -= 1;
      if (_keysDown.has('KeyS') || _keysDown.has('ArrowDown')) z += 1;
      if (_keysDown.has('KeyA') || _keysDown.has('ArrowLeft')) x -= 1;
      if (_keysDown.has('KeyD') || _keysDown.has('ArrowRight')) x += 1;
      const len = Math.sqrt(x * x + z * z);
      return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
    },
  };

  // ── Mouse ──────────────────────────────────────────────────────────────────
  const _mouseState = {
    x: 0, y: 0,          // normalised NDC (-1 to 1)
    clientX: 0, clientY: 0,
    deltaX: 0, deltaY: 0,
    buttons: [false, false, false], // [left, middle, right]
    wheel: 0,
  };
  const _mouseJustPressed = [false, false, false];
  const _mouseJustReleased = [false, false, false];

  if (trackMouse) {
    window.addEventListener('mousemove', (e) => {
      _mouseState.clientX = e.clientX;
      _mouseState.clientY = e.clientY;
      _mouseState.x = (e.clientX / window.innerWidth) * 2 - 1;
      _mouseState.y = -(e.clientY / window.innerHeight) * 2 + 1;
      _mouseState.deltaX = e.movementX ?? 0;
      _mouseState.deltaY = e.movementY ?? 0;
    });
    window.addEventListener('mousedown', (e) => {
      const b = e.button;
      if (b < 3) { _mouseState.buttons[b] = true; _mouseJustPressed[b] = true; }
    });
    window.addEventListener('mouseup', (e) => {
      const b = e.button;
      if (b < 3) { _mouseState.buttons[b] = false; _mouseJustReleased[b] = true; }
    });
    window.addEventListener('wheel', (e) => {
      _mouseState.wheel += e.deltaY;
    }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const mouse = {
    get x() { return _mouseState.x; },
    get y() { return _mouseState.y; },
    get clientX() { return _mouseState.clientX; },
    get clientY() { return _mouseState.clientY; },
    get deltaX() { return _mouseState.deltaX; },
    get deltaY() { return _mouseState.deltaY; },
    get buttons() { return _mouseState.buttons; },
    get wheel() { return _mouseState.wheel; },
    isDown(button = 0) { return _mouseState.buttons[button]; },
    wasPressed(button = 0) { return _mouseJustPressed[button]; },
    wasReleased(button = 0) { return _mouseJustReleased[button]; },
  };

  // ── Touch ──────────────────────────────────────────────────────────────────
  const _touches = new Map(); // id → { x, y }

  window.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      _touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      _touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) _touches.delete(t.identifier);
  }, { passive: true });

  const touch = {
    get count() { return _touches.size; },
    get all() { return [..._touches.values()]; },
    get first() {
      const it = _touches.values().next();
      return it.done ? null : it.value;
    },
  };

  // ── Gamepad ────────────────────────────────────────────────────────────────
  const gamepad = trackGamepad ? {
    get connected() {
      return navigator.getGamepads
        ? Array.from(navigator.getGamepads()).filter(Boolean)
        : [];
    },
    get first() {
      return navigator.getGamepads
        ? Array.from(navigator.getGamepads()).find(Boolean) ?? null
        : null;
    },
    /** Left stick normalised { x, z }. */
    get leftStick() {
      const gp = this.first;
      if (!gp) return { x: 0, z: 0 };
      return {
        x: Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0,
        z: Math.abs(gp.axes[1]) > 0.1 ? gp.axes[1] : 0,
      };
    },
    /** Right stick normalised { x, y }. */
    get rightStick() {
      const gp = this.first;
      if (!gp) return { x: 0, y: 0 };
      return {
        x: Math.abs(gp.axes[2]) > 0.1 ? gp.axes[2] : 0,
        y: Math.abs(gp.axes[3]) > 0.1 ? gp.axes[3] : 0,
      };
    },
    isPressed(index) {
      return this.first?.buttons[index]?.pressed ?? false;
    },
  } : null;

  // ── Frame cleanup (call once per tick) ────────────────────────────────────
  /**
   * Clear one-frame "just pressed / just released" states.
   * Call at the END of each tick callback.
   */
  function flush() {
    _keysJustPressed.clear();
    _keysJustReleased.clear();
    _mouseJustPressed.fill(false);
    _mouseJustReleased.fill(false);
    _mouseState.deltaX = 0;
    _mouseState.deltaY = 0;
    _mouseState.wheel = 0;
  }

  function dispose() {
    window.removeEventListener('keydown', _onKeyDown);
    window.removeEventListener('keyup', _onKeyUp);
  }

  return { keys, mouse, touch, gamepad, flush, dispose };
}
