// Petyus kalandjai – scene: Renderer, jelenet, ortografikus kamera, fények.
import * as THREE from 'three';
import { G } from './state.js';
import { $, V3 } from './util.js';
import { Q, onQualityChange } from './quality.js';

// ---------------------------------------------------------------- renderer / scene
export const renderer = new THREE.WebGLRenderer({ antialias: Q.antialias, powerPreference: 'high-performance' });   // quality.js: no antialias on phones
renderer.setPixelRatio(Q.pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('app').appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd6f0);

export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
export const CAM_OFF = new V3(40, 34, 40);
export const camTarget = new V3(0, 0, -6);
export function updateProjection() {
  const a = window.innerWidth / window.innerHeight;
  camera.left = -G.viewSize * a; camera.right = G.viewSize * a; camera.top = G.viewSize; camera.bottom = -G.viewSize;
  camera.updateProjectionMatrix();
}
updateProjection();
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); updateProjection(); });

const hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6f8f4a, 1.35);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
export const SUN_OFF = new V3(-18, 34, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 120 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
// the quality level (quality.js) sets the resolution and the shadow map; it may step down while playing
onQualityChange((q) => {
  renderer.setPixelRatio(q.pixelRatio); renderer.setSize(window.innerWidth, window.innerHeight);
  sun.castShadow = q.shadowSize > 0;
  if (q.shadowSize && sun.shadow.mapSize.x !== q.shadowSize) { sun.shadow.mapSize.set(q.shadowSize, q.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
});

