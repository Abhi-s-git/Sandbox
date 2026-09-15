/**
 * sound.js — Audio manager using Three.js AudioListener + Web Audio API.
 *
 * Usage:
 *   import { createAudioManager } from './runtime/sound.js';
 *   const audio = createAudioManager(camera);
 *   await audio.load('jump', '/sounds/jump.mp3');
 *   audio.play('jump');
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/**
 * Create an audio manager with 2D (non-positional) and 3D (positional) sound support.
 *
 * @param {THREE.Camera} camera - Attach the AudioListener to this camera.
 * @returns {AudioManager}
 */
export function createAudioManager(camera) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const _sounds = new Map();   // name → { audio, buffer, volume }
  const _loader = new THREE.AudioLoader();

  /** Master volume (0–1). */
  let _masterVolume = 1.0;

  /**
   * Pre-load a sound file.
   * @param {string} name   - Key to reference this sound.
   * @param {string} url    - URL to audio file (.mp3, .ogg, .wav).
   * @param {object} [opts]
   * @param {boolean} [opts.loop=false]
   * @param {number}  [opts.volume=1]
   * @returns {Promise<void>}
   */
  function load(name, url, { loop = false, volume = 1 } = {}) {
    return new Promise((resolve, reject) => {
      _loader.load(
        url,
        (buffer) => {
          const audio = new THREE.Audio(listener);
          audio.setBuffer(buffer);
          audio.setLoop(loop);
          audio.setVolume(volume * _masterVolume);
          _sounds.set(name, { audio, buffer, volume });
          resolve();
        },
        undefined,
        reject,
      );
    });
  }

  /**
   * Pre-load a 3D positional sound.
   * @param {string} name
   * @param {string} url
   * @param {THREE.Object3D} attachTo - Object to attach positional audio to.
   * @param {object} [opts]
   * @returns {Promise<void>}
   */
  function loadPositional(name, url, attachTo, {
    loop = false,
    volume = 1,
    refDistance = 5,
    rolloffFactor = 1,
  } = {}) {
    return new Promise((resolve, reject) => {
      _loader.load(
        url,
        (buffer) => {
          const audio = new THREE.PositionalAudio(listener);
          audio.setBuffer(buffer);
          audio.setLoop(loop);
          audio.setVolume(volume * _masterVolume);
          audio.setRefDistance(refDistance);
          audio.setRolloffFactor(rolloffFactor);
          attachTo.add(audio);
          _sounds.set(name, { audio, buffer, volume });
          resolve();
        },
        undefined,
        reject,
      );
    });
  }

  /**
   * Play a sound by name.
   * @param {string} name
   * @param {object} [opts]
   * @param {number} [opts.volume]   - Override volume for this play.
   * @param {number} [opts.offset=0] - Start offset in seconds.
   */
  function play(name, { volume, offset = 0 } = {}) {
    const entry = _sounds.get(name);
    if (!entry) {
      console.warn(`[sound] Sound "${name}" not loaded.`);
      return;
    }
    const { audio } = entry;
    if (audio.isPlaying) audio.stop();
    if (volume !== undefined) audio.setVolume(volume * _masterVolume);
    audio.offset = offset;
    audio.play();
  }

  /**
   * Stop a sound.
   * @param {string} name
   */
  function stop(name) {
    const entry = _sounds.get(name);
    if (entry?.audio.isPlaying) entry.audio.stop();
  }

  /**
   * Pause a sound.
   * @param {string} name
   */
  function pause(name) {
    const entry = _sounds.get(name);
    if (entry?.audio.isPlaying) entry.audio.pause();
  }

  /**
   * Check if a sound is currently playing.
   * @param {string} name
   * @returns {boolean}
   */
  function isPlaying(name) {
    return _sounds.get(name)?.audio.isPlaying ?? false;
  }

  /**
   * Set master volume (affects all future plays).
   * @param {number} v 0–1
   */
  function setMasterVolume(v) {
    _masterVolume = Math.max(0, Math.min(1, v));
    for (const { audio, volume } of _sounds.values()) {
      audio.setVolume(volume * _masterVolume);
    }
  }

  /**
   * Fade a sound in/out over `duration` seconds.
   * @param {string} name
   * @param {number} targetVolume
   * @param {number} [duration=1]
   */
  function fade(name, targetVolume, duration = 1) {
    const entry = _sounds.get(name);
    if (!entry) return;
    const { audio } = entry;
    const startVol = audio.getVolume();
    const startTime = performance.now();

    function tick() {
      const t = Math.min((performance.now() - startTime) / (duration * 1000), 1);
      audio.setVolume(startVol + (targetVolume - startVol) * t);
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /** Mute all sounds. */
  function muteAll() { listener.setMasterVolume(0); }

  /** Restore volume. */
  function unmuteAll() { listener.setMasterVolume(_masterVolume); }

  /** Clean up. */
  function dispose() {
    for (const { audio } of _sounds.values()) {
      if (audio.isPlaying) audio.stop();
      audio.disconnect();
    }
    _sounds.clear();
    camera.remove(listener);
  }

  return {
    load, loadPositional, play, stop, pause, isPlaying,
    setMasterVolume, fade, muteAll, unmuteAll, dispose,
    listener,
  };
}

/**
 * Create a simple procedural sound effect using the Web Audio API.
 * No file loading required.
 *
 * @param {string} type - 'beep' | 'explosion' | 'powerup' | 'hit'
 * @returns {() => void} - Function to trigger the sound.
 */
export function createProceduralSound(type = 'beep') {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const presets = {
    beep: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    },
    hit: () => {
      const bufferSize = ctx.sampleRate * 0.1;
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const gain = ctx.createGain();
      noise.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      noise.start();
    },
    powerup: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    },
    explosion: () => {
      const bufferSize = ctx.sampleRate * 0.5;
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      noise.start();
    },
  };

  return presets[type] ?? presets.beep;
}
