/**
 * interaction.js — Raycasting, object picking, hover, and click detection.
 *
 * Usage:
 *   import { createRaycaster, onObjectClick, onObjectHover } from './runtime/interaction.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

/**
 * Create a raycaster helper that tracks mouse position automatically.
 *
 * @param {THREE.Camera} camera
 * @param {HTMLElement} [domElement=window]
 * @returns {{ cast: (objects, recursive?) => Intersection[], mouse: Vector2, raycaster: Raycaster, dispose: () => void }}
 */
export function createRaycaster(camera, domElement = window) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const _el = domElement === window ? window : domElement;

  function _updateMouse(event) {
    const rect = domElement === window
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : domElement.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  _el.addEventListener('mousemove', _updateMouse);
  _el.addEventListener('touchmove', _updateMouse, { passive: true });

  function cast(objects, recursive = true) {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(objects, recursive);
  }

  function dispose() {
    _el.removeEventListener('mousemove', _updateMouse);
    _el.removeEventListener('touchmove', _updateMouse);
  }

  return { cast, mouse, raycaster, dispose };
}

/**
 * Register a click handler on a set of objects.
 *
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D[]} objects
 * @param {(intersect: THREE.Intersection, event: MouseEvent) => void} callback
 * @param {object} [opts]
 * @param {HTMLElement} [opts.domElement=window]
 * @param {boolean} [opts.recursive=true]
 * @returns {{ dispose: () => void }}
 */
export function onObjectClick(camera, objects, callback, {
  domElement = window,
  recursive = true,
} = {}) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function _onClick(event) {
    const rect = domElement === window
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(objects, recursive);
    if (hits.length > 0) callback(hits[0], event);
  }

  domElement.addEventListener('click', _onClick);
  return { dispose: () => domElement.removeEventListener('click', _onClick) };
}

/**
 * Register hover enter/leave callbacks on a set of objects.
 *
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D[]} objects
 * @param {object} handlers
 * @param {(intersect) => void} [handlers.onEnter]
 * @param {(object) => void} [handlers.onLeave]
 * @param {HTMLElement} [opts.domElement=window]
 * @returns {{ dispose: () => void }}
 */
export function onObjectHover(camera, objects, { onEnter, onLeave } = {}, {
  domElement = window,
  recursive = true,
} = {}) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let _hovered = null;

  function _onMove(event) {
    const rect = domElement === window
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(objects, recursive);

    if (hits.length > 0) {
      const obj = hits[0].object;
      if (obj !== _hovered) {
        if (_hovered && onLeave) onLeave(_hovered);
        _hovered = obj;
        if (onEnter) onEnter(hits[0]);
      }
    } else if (_hovered) {
      if (onLeave) onLeave(_hovered);
      _hovered = null;
    }
  }

  domElement.addEventListener('mousemove', _onMove);
  return {
    dispose() {
      domElement.removeEventListener('mousemove', _onMove);
      _hovered = null;
    },
  };
}

/**
 * Get the point on a plane (e.g. the ground) under the mouse.
 * Useful for RTS / top-down game targeting.
 *
 * @param {THREE.Camera} camera
 * @param {MouseEvent} event
 * @param {THREE.Plane} [plane] - Default: y=0 plane.
 * @returns {THREE.Vector3|null}
 */
export function getGroundPoint(camera, event, plane = new THREE.Plane(new THREE.Vector3(0, 1, 0))) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(mouse, camera);
  const target = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, target);
  return hit ? target : null;
}

/**
 * Drag an object along a plane (e.g. drag-and-drop in 3D).
 *
 * @param {THREE.Object3D} object
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @param {THREE.Plane} [plane]
 * @returns {{ dispose: () => void }}
 */
export function createDragControl(object, camera, domElement, plane = new THREE.Plane(new THREE.Vector3(0, 1, 0))) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let _dragging = false;

  function _getPos(event) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, target);
  }

  const _onDown = () => { _dragging = true; };
  const _onUp = () => { _dragging = false; };
  const _onMove = (e) => {
    if (!_dragging) return;
    const p = _getPos(e);
    if (p) { object.position.x = p.x; object.position.z = p.z; }
  };

  domElement.addEventListener('mousedown', _onDown);
  window.addEventListener('mouseup', _onUp);
  window.addEventListener('mousemove', _onMove);

  return {
    dispose() {
      domElement.removeEventListener('mousedown', _onDown);
      window.removeEventListener('mouseup', _onUp);
      window.removeEventListener('mousemove', _onMove);
    },
  };
}
