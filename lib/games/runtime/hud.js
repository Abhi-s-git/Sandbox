/**
 * hud.js — 2D HUD overlay using HTML/CSS positioned over the 3D canvas.
 *
 * Usage:
 *   import { createHUD } from './runtime/hud.js';
 *   const hud = createHUD();
 *   const score = hud.addLabel('score', { text: 'Score: 0', top: '16px', left: '16px' });
 *   hud.addHealthBar('hp', { value: 80, max: 100, top: '40px', left: '16px' });
 *   hud.setLabel('score', 'Score: 100');
 */

/**
 * Create a HUD overlay that sits on top of the Three.js canvas.
 *
 * @param {object} [opts]
 * @param {string} [opts.fontFamily='system-ui, sans-serif']
 * @param {string} [opts.color='#ffffff']
 * @param {string} [opts.fontSize='16px']
 * @param {HTMLElement} [opts.container=document.body]
 * @returns {HUD}
 */
export function createHUD({
  fontFamily = 'system-ui, sans-serif',
  color = '#ffffff',
  fontSize = '16px',
  container = document.body,
} = {}) {
  // Overlay div — full-screen, pointer events off by default so clicks pass through
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0', right: '0', bottom: '0',
    pointerEvents: 'none',
    fontFamily, color, fontSize,
    zIndex: '100',
  });
  container.appendChild(overlay);

  const _elements = new Map();

  // ── Labels ──────────────────────────────────────────────────────────────────

  /**
   * Add a text label to the HUD.
   * @param {string} id
   * @param {object} [opts]
   * @returns {HTMLElement}
   */
  function addLabel(id, {
    text = '',
    top = '16px',
    left = '16px',
    right = null,
    bottom = null,
    fontSize: fs = fontSize,
    color: c = color,
    fontWeight = 'normal',
    textShadow = '1px 1px 2px rgba(0,0,0,0.8)',
    align = 'left',
  } = {}) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      top, left,
      fontSize: fs, color: c, fontWeight, textShadow,
      textAlign: align,
      whiteSpace: 'nowrap',
    });
    if (right !== null) { el.style.left = 'auto'; el.style.right = right; }
    if (bottom !== null) { el.style.top = 'auto'; el.style.bottom = bottom; }
    el.textContent = text;
    overlay.appendChild(el);
    _elements.set(id, { el, type: 'label' });
    return el;
  }

  /**
   * Update a label's text content.
   * @param {string} id
   * @param {string} text
   */
  function setLabel(id, text) {
    const entry = _elements.get(id);
    if (entry?.type === 'label') entry.el.textContent = text;
  }

  // ── Progress bars ───────────────────────────────────────────────────────────

  /**
   * Add a progress bar (e.g., health, stamina, XP).
   * @param {string} id
   * @param {object} [opts]
   * @returns {{ el: HTMLElement, setBar: (v: number, max: number) => void }}
   */
  function addBar(id, {
    value = 100,
    max = 100,
    top = '16px',
    left = '16px',
    width = '150px',
    height = '12px',
    fillColor = '#22cc44',
    bgColor = 'rgba(0,0,0,0.5)',
    borderRadius = '4px',
    label = null,
  } = {}) {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'absolute',
      top, left,
      width, pointerEvents: 'none',
    });

    if (label) {
      const lbl = document.createElement('div');
      lbl.textContent = label;
      Object.assign(lbl.style, { fontSize: '12px', marginBottom: '2px', color });
      wrapper.appendChild(lbl);
    }

    const bg = document.createElement('div');
    Object.assign(bg.style, {
      width: '100%', height,
      background: bgColor, borderRadius, overflow: 'hidden',
    });

    const fill = document.createElement('div');
    Object.assign(fill.style, {
      height: '100%',
      width: `${(value / max) * 100}%`,
      background: fillColor,
      borderRadius,
      transition: 'width 0.15s ease',
    });

    bg.appendChild(fill);
    wrapper.appendChild(bg);
    overlay.appendChild(wrapper);

    function setBar(v, m = max) {
      const pct = Math.max(0, Math.min(1, v / m)) * 100;
      fill.style.width = `${pct}%`;
      // Colour shift: green → yellow → red
      if (fillColor === '#22cc44') {
        const hue = pct * 1.2; // 0 = red, 120 = green
        fill.style.background = `hsl(${hue}, 80%, 45%)`;
      }
    }

    _elements.set(id, { el: wrapper, fill, type: 'bar', setBar });
    return { el: wrapper, setBar };
  }

  // ── Crosshair ───────────────────────────────────────────────────────────────

  /**
   * Add a crosshair to the centre of the screen.
   * @param {object} [opts]
   * @returns {HTMLElement}
   */
  function addCrosshair({
    size = 20,
    thickness = 2,
    color: c = 'rgba(255,255,255,0.8)',
    gap = 5,
  } = {}) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${size}px`, height: `${size}px`,
      pointerEvents: 'none',
    });
    // Horizontal line
    const h = document.createElement('div');
    Object.assign(h.style, {
      position: 'absolute',
      top: '50%', left: '0', right: '0',
      height: `${thickness}px`,
      marginTop: `-${thickness / 2}px`,
      background: c,
      maskImage: `linear-gradient(to right, transparent ${gap}px, black ${gap}px, black calc(50% - ${gap}px), transparent calc(50% - ${gap}px), transparent calc(50% + ${gap}px), black calc(50% + ${gap}px))`,
      webkitMaskImage: `linear-gradient(to right, transparent ${gap}px, black ${gap}px, black calc(50% - ${gap}px), transparent calc(50% - ${gap}px), transparent calc(50% + ${gap}px), black calc(50% + ${gap}px))`,
    });
    // Vertical line
    const v = document.createElement('div');
    Object.assign(v.style, {
      position: 'absolute',
      top: '0', bottom: '0', left: '50%',
      width: `${thickness}px`,
      marginLeft: `-${thickness / 2}px`,
      background: c,
    });
    el.appendChild(h);
    el.appendChild(v);
    overlay.appendChild(el);
    _elements.set('crosshair', { el, type: 'crosshair' });
    return el;
  }

  // ── Minimap ─────────────────────────────────────────────────────────────────

  /**
   * Add a minimap canvas in a corner.
   * @param {object} [opts]
   * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
   */
  function addMinimap({
    size = 120,
    bottom = '16px',
    right = '16px',
    bgColor = 'rgba(0,0,0,0.6)',
    borderColor = 'rgba(255,255,255,0.3)',
  } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    Object.assign(canvas.style, {
      position: 'absolute', bottom, right,
      width: `${size}px`, height: `${size}px`,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '4px',
      pointerEvents: 'none',
    });
    overlay.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    _elements.set('minimap', { el: canvas, type: 'minimap' });
    return { canvas, ctx };
  }

  // ── Show/Hide ───────────────────────────────────────────────────────────────

  function show(id) {
    const entry = _elements.get(id);
    if (entry) entry.el.style.display = '';
  }

  function hide(id) {
    const entry = _elements.get(id);
    if (entry) entry.el.style.display = 'none';
  }

  function showAll() { overlay.style.display = ''; }
  function hideAll() { overlay.style.display = 'none'; }

  // ── Screen flash (damage indicator etc.) ───────────────────────────────────

  /**
   * Flash the screen with a colour (e.g. red for damage).
   * @param {string} [color='rgba(255,0,0,0.4)']
   * @param {number} [duration=0.3]
   */
  function flash(color = 'rgba(255,0,0,0.4)', duration = 0.3) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', inset: '0',
      background: color,
      pointerEvents: 'none',
      transition: `opacity ${duration}s ease`,
      opacity: '1',
      zIndex: '999',
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      setTimeout(() => document.body.removeChild(el), duration * 1000 + 50);
    });
  }

  function dispose() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    _elements.clear();
  }

  return {
    overlay, addLabel, setLabel, addBar, addCrosshair, addMinimap,
    show, hide, showAll, hideAll, flash, dispose,
    getElement: (id) => _elements.get(id)?.el ?? null,
  };
}
