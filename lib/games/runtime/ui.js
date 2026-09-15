/**
 * ui.js — In-game UI overlays: menus, dialogs, notifications, loading screens.
 *
 * Usage:
 *   import { showStartScreen, showGameOverScreen, showNotification,
 *            showLoadingScreen, createMenu } from './runtime/ui.js';
 */

// ── Shared styles ─────────────────────────────────────────────────────────────

const BASE_STYLE = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;overflow:hidden}
`;

function _injectBaseStyle() {
  if (!document.getElementById('__runtime_style')) {
    const s = document.createElement('style');
    s.id = '__runtime_style';
    s.textContent = BASE_STYLE;
    document.head.appendChild(s);
  }
}

// ── Loading screen ─────────────────────────────────────────────────────────────

/**
 * Show a loading screen with a progress bar.
 * Returns a controller to update progress and hide the screen.
 *
 * @param {object} [opts]
 * @returns {{ setProgress: (pct: number) => void, setMessage: (msg: string) => void, hide: () => void, el: HTMLElement }}
 */
export function showLoadingScreen({
  title = 'Loading…',
  bgColor = '#0a0a0a',
  accentColor = '#ea580c',
  color = '#ffffff',
} = {}) {
  _injectBaseStyle();
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0',
    background: bgColor, color,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '20px',
    zIndex: '1000',
    transition: 'opacity 0.5s ease',
  });
  el.innerHTML = `
    <h1 style="font-size:2rem;font-weight:700;letter-spacing:0.05em">${title}</h1>
    <div id="__lbar_wrap" style="width:240px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
      <div id="__lbar" style="height:100%;width:0%;background:${accentColor};transition:width 0.2s ease;border-radius:3px"></div>
    </div>
    <p id="__lmsg" style="font-size:0.85rem;opacity:0.5"></p>
  `;
  document.body.appendChild(el);

  const bar = el.querySelector('#__lbar');
  const msg = el.querySelector('#__lmsg');

  return {
    el,
    setProgress(pct) { bar.style.width = `${Math.max(0, Math.min(100, pct))}%`; },
    setMessage(text) { msg.textContent = text; },
    hide() {
      el.style.opacity = '0';
      setTimeout(() => el.parentNode?.removeChild(el), 500);
    },
  };
}

// ── Start / title screen ───────────────────────────────────────────────────────

/**
 * Show a full-screen start screen with a play button.
 *
 * @param {object} [opts]
 * @returns {Promise<void>} - Resolves when the player clicks Play.
 */
export function showStartScreen({
  title = 'My Game',
  subtitle = 'Press Play to start',
  buttonText = 'Play',
  bgColor = '#0a0a0a',
  accentColor = '#ea580c',
  color = '#ffffff',
} = {}) {
  _injectBaseStyle();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', inset: '0',
      background: bgColor, color,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '24px',
      zIndex: '1000',
      transition: 'opacity 0.4s ease',
    });
    el.innerHTML = `
      <h1 style="font-size:3rem;font-weight:800;letter-spacing:0.05em;text-shadow:0 2px 20px rgba(0,0,0,0.5)">${title}</h1>
      <p style="font-size:1rem;opacity:0.6">${subtitle}</p>
      <button id="__play_btn" style="
        padding:14px 48px;font-size:1.1rem;font-weight:700;
        background:${accentColor};color:#fff;border:none;border-radius:8px;
        cursor:pointer;letter-spacing:0.05em;
        transition:transform 0.1s,filter 0.1s;
      ">${buttonText}</button>
    `;
    document.body.appendChild(el);

    const btn = el.querySelector('#__play_btn');
    btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.2)'; });
    btn.addEventListener('mouseleave', () => { btn.style.filter = ''; });
    btn.addEventListener('click', () => {
      el.style.opacity = '0';
      setTimeout(() => {
        el.parentNode?.removeChild(el);
        resolve();
      }, 400);
    });
  });
}

// ── Game over screen ───────────────────────────────────────────────────────────

/**
 * Show a game-over screen with a restart button.
 *
 * @param {object} [opts]
 * @returns {Promise<void>} - Resolves when the player clicks Restart.
 */
export function showGameOverScreen({
  title = 'Game Over',
  score = null,
  buttonText = 'Play Again',
  bgColor = 'rgba(0,0,0,0.85)',
  accentColor = '#ea580c',
  color = '#ffffff',
} = {}) {
  _injectBaseStyle();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', inset: '0',
      background: bgColor, color,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
      zIndex: '1000',
      transition: 'opacity 0.4s ease',
    });
    el.innerHTML = `
      <h1 style="font-size:3rem;font-weight:800">${title}</h1>
      ${score !== null ? `<p style="font-size:1.4rem;opacity:0.8">Score: <strong>${score}</strong></p>` : ''}
      <button id="__restart_btn" style="
        padding:12px 40px;font-size:1rem;font-weight:700;
        background:${accentColor};color:#fff;border:none;border-radius:8px;
        cursor:pointer;transition:filter 0.1s;
      ">${buttonText}</button>
    `;
    document.body.appendChild(el);

    const btn = el.querySelector('#__restart_btn');
    btn.addEventListener('click', () => {
      el.style.opacity = '0';
      setTimeout(() => {
        el.parentNode?.removeChild(el);
        resolve();
      }, 400);
    });
  });
}

// ── Pause screen ──────────────────────────────────────────────────────────────

/**
 * Toggle a pause overlay.
 * @param {object} [opts]
 * @returns {{ show: () => void, hide: () => void, el: HTMLElement }}
 */
export function createPauseScreen({
  bgColor = 'rgba(0,0,0,0.7)',
  color = '#ffffff',
} = {}) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0',
    background: bgColor, color,
    display: 'none', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '16px',
    zIndex: '900',
  });
  el.innerHTML = `
    <h2 style="font-size:2.5rem;font-weight:700">Paused</h2>
    <p style="opacity:0.6;font-size:0.9rem">Press Escape to resume</p>
  `;
  document.body.appendChild(el);

  return {
    el,
    show() { el.style.display = 'flex'; },
    hide() { el.style.display = 'none'; },
  };
}

// ── Toast notifications ───────────────────────────────────────────────────────

let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    Object.assign(_toastContainer.style, {
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column-reverse', gap: '8px',
      alignItems: 'center', zIndex: '2000',
      pointerEvents: 'none',
    });
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {object} [opts]
 */
export function showNotification(message, {
  duration = 2500,
  color = '#ffffff',
  bgColor = 'rgba(0,0,0,0.8)',
  accentColor = '#ea580c',
  icon = null,
} = {}) {
  const container = _getToastContainer();
  const el = document.createElement('div');
  Object.assign(el.style, {
    padding: '10px 20px',
    background: bgColor, color,
    borderRadius: '8px',
    borderLeft: `3px solid ${accentColor}`,
    fontSize: '0.9rem',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'opacity 0.3s, transform 0.3s',
    pointerEvents: 'none',
    backdropFilter: 'blur(8px)',
    maxWidth: '300px',
    textAlign: 'center',
  });
  el.textContent = icon ? `${icon} ${message}` : message;
  container.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => container.removeChild(el), 300);
  }, duration);
}

// ── Generic modal dialog ───────────────────────────────────────────────────────

/**
 * Show a simple modal dialog with custom buttons.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {Array<{label: string, value: any, primary?: boolean}>} [opts.buttons]
 * @returns {Promise<any>} - Resolves with the value of the clicked button.
 */
export function showDialog({
  title = 'Dialog',
  message = '',
  buttons = [{ label: 'OK', value: 'ok', primary: true }],
  bgColor = 'rgba(0,0,0,0.85)',
  panelColor = '#1a1a1a',
  accentColor = '#ea580c',
  color = '#ffffff',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      background: bgColor, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '1100',
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: panelColor,
      borderRadius: '12px',
      padding: '32px',
      maxWidth: '380px',
      width: '90%',
      display: 'flex', flexDirection: 'column', gap: '16px',
      textAlign: 'center',
    });

    panel.innerHTML = `
      <h2 style="font-size:1.5rem;font-weight:700">${title}</h2>
      ${message ? `<p style="opacity:0.7;font-size:0.95rem">${message}</p>` : ''}
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" id="__dlg_btns"></div>
    `;

    const btnContainer = panel.querySelector('#__dlg_btns');
    for (const { label, value, primary } of buttons) {
      const btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '10px 28px', border: 'none', borderRadius: '6px',
        cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
        background: primary ? accentColor : 'rgba(255,255,255,0.1)',
        color: '#fff',
        transition: 'filter 0.1s',
      });
      btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.15)'; });
      btn.addEventListener('mouseleave', () => { btn.style.filter = ''; });
      btn.addEventListener('click', () => {
        overlay.parentNode?.removeChild(overlay);
        resolve(value);
      });
      btnContainer.appendChild(btn);
    }

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}
