// Petyus kalandjai – felhők az égen a szabadtéri pályákon (1. rész: a park; 2. rész: az iskola).
// A few fluffy voxel clouds (merged boxes, white, a little shaded underneath) 17–23 m up, drifting slowly with the wind and
// coming round again. The view is isometric from above, so a cloud is seen over the ground: it fades out as it drifts over
// the middle of the picture (where the play is), and back in towards the edges. No shadows (they would flicker).
import * as THREE from 'three';
import { scene, view } from './scene.js';
import { G } from './state.js';
import { rand } from './util.js';

const clouds = [];
let area = null;
const mat0 = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85, emissive: 0xa9b6c0 });   // (lit a little from within: seen from below – first person – they are not dark)   // (depth written: no inner faces seen through)
const ndc = new THREE.Vector3();

function cloudGeometry(size) {   // a cluster of boxes: one long flat base, puffs on top
  const geos = [], top = new THREE.Color(0xffffff), under = new THREE.Color(0xd9e2ea);
  const n = 5 + Math.floor(rand() * 5);
  for (let k = 0; k < n; k++) {
    // a wide flat base, narrower puffs piled on it (towards the middle as they go up)
    const up = k === 0 ? 0 : 0.35 + rand() * 0.65, sh = 1 - up * 0.55;
    const w = (k === 0 ? 5.5 : (1.6 + rand() * 2.2) * sh) * size, d = (k === 0 ? 3 : (1.4 + rand() * 1.6) * sh) * size, h = (k === 0 ? 0.7 : 0.6 + rand() * 0.6) * size;
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    const x = k === 0 ? 0 : (rand() - 0.5) * 4.2 * size * sh, z = k === 0 ? 0 : (rand() - 0.5) * 2 * size * sh, y = up * 1.3 * size;
    g.translate(x, y + h / 2, z);
    const pos = g.attributes.position, c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) <= y + 0.01 ? under : top; c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); geos.push(g);
  }
  // merge by hand (same attributes: position, normal, uv, color)
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const parts = geos.map((g) => g.attributes[name].array), len = parts.reduce((s, a) => s + a.length, 0), arr = new Float32Array(len);
    let o = 0; for (const a of parts) { arr.set(a, o); o += a.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  out.computeBoundingSphere(); geos.forEach((g) => g.dispose());
  return out;
}

// a: the sky's area { x0, z0, x1, z1 } (the clouds drift over it and a little beyond); n: how many
export function buildClouds(a, n = 9, hy = [17, 23]) {
  clearClouds(); area = a;
  const wind = { x: 0.9, z: 0.25 };
  for (let k = 0; k < n; k++) {
    const size = 0.6 + rand() * 0.5, m = new THREE.Mesh(cloudGeometry(size), mat0.clone());
    m.position.set(a.x0 + rand() * (a.x1 - a.x0), hy[0] + rand() * (hy[1] - hy[0]), a.z0 + rand() * (a.z1 - a.z0));
    m.rotation.y = (rand() - 0.5) * 0.6; m.renderOrder = 5; scene.add(m);
    const v = 0.5 + rand() * 0.6;
    clouds.push({ m, vx: wind.x * v, vz: wind.z * v, op: 0.85 });
  }
}
export function clearClouds() { for (const c of clouds) { scene.remove(c.m); c.m.geometry.dispose(); c.m.material.dispose(); } clouds.length = 0; }

export function updateClouds(dt) {
  if (!clouds.length) return;
  const cam = view.cam; cam.updateMatrixWorld();
  const W = area.x1 - area.x0 + 30, D = area.z1 - area.z0 + 30;
  for (const c of clouds) {
    const p = c.m.position;
    p.x += c.vx * dt; p.z += c.vz * dt;
    if (p.x > area.x1 + 15) p.x -= W; if (p.z > area.z1 + 15) p.z -= D;   // round again from the other side
    // seen from above the clouds are over the ground: full at the edges of the picture, fading towards its middle (where the
    // play is) – in first person they are up in the sky: full
    let want = 0.9;
    if (!G.fps) { ndc.copy(p).project(cam); const r = Math.hypot(ndc.x, ndc.y), u = Math.min(1, Math.max(0, (r - 0.3) / 0.65)); want = 0.12 + 0.78 * u * u * (3 - 2 * u); }
    c.op += (want - c.op) * Math.min(1, dt * 3); c.m.material.opacity = c.op; c.m.visible = c.op > 0.02;
  }
}
