// Petyus kalandjai – util: Segédfüggvények: véletlen (seedelt), interpoláció, szögek, DOM-elérés.
import * as THREE from 'three';

export const V3 = THREE.Vector3;
export const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- utils
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const rand = mulberry32(20261115);
export const R = (a, b) => a + (b - a) * rand();
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
export const smooth = (t) => t * t * (3 - 2 * t);
export function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
export const dampAngle = (a, b, l, dt) => a + angDiff(a, b) * (1 - Math.exp(-l * dt));
export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz;
  let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

