// Petyus kalandjai – occlude: ami a kamera és Petyus közé kerül (fa, lámpa, bokor …), az áttetsző lesz, hogy látsszon mögötte.
// The props are instanced meshes (one mesh per kind), so one instance can't be faded on its own: the occluding instance is
// hidden (zero-scale matrix) and a see-through copy (its own mesh, transparent material) takes its place; when it no longer
// covers him, the copy fades back to solid and the instance returns.
// Test: three rays from Petyus (feet, chest, head) towards the camera (CAM_OFF); a prop covers him if a ray passes through
// its bounding cylinder (radius × 0.8 – crowns are rounder than their box) at a height inside it.
import * as THREE from 'three';
import { CAM_OFF, scene } from './scene.js';
import { G } from './state.js';
import { V3, damp } from './util.js';
import { INSTANCES, vcMat } from './world.js';

const DIR = CAM_OFF.clone().normalize(), HL = Math.hypot(DIR.x, DIR.z), DH = [DIR.x / HL, DIR.z / HL];
const MIN_H = 1.1, NEAR = 16, FADE = 0.32;
const ghosts = new Map();   // instance → { mesh, op, on }
const zero = new THREE.Matrix4().makeScale(0, 0, 0);
let ghostMat = null, scanT = 0, candidates = [];

function covers(it, P) {
  for (const py of [0.35, 0.9, 1.45]) {
    // horizontal: the ray from P along DIR passes the prop's axis at distance t (along the ground)
    const ox = it.x - P.x, oz = it.z - P.z, t = ox * DH[0] + oz * DH[1];
    if (t <= 0.2) return false;                                   // behind him (or level with him)
    const ex = ox - DH[0] * t, ez = oz - DH[1] * t;
    if (Math.hypot(ex, ez) > it.r * 0.8) continue;
    const y = py + t * DIR.y / HL;                                // height of the ray there
    if (y > it.y && y < it.y + it.h) return true;
  }
  return false;
}
function ghostOf(it) {
  let g = ghosts.get(it);
  if (!g) {
    if (!ghostMat) { ghostMat = vcMat.clone(); ghostMat.transparent = true; ghostMat.depthWrite = false; }
    const mat = ghostMat.clone();
    const mesh = new THREE.Mesh(it.mesh.geometry, mat); mesh.matrixAutoUpdate = false; mesh.matrix.copy(it.matrix); mesh.castShadow = it.mesh.castShadow; mesh.renderOrder = 2;
    scene.add(mesh);
    g = { mesh, op: 1, on: false }; ghosts.set(it, g);
    it.mesh.setMatrixAt(it.n, zero); it.mesh.instanceMatrix.needsUpdate = true;
  }
  return g;
}
function release(it, g) {
  scene.remove(g.mesh); g.mesh.material.dispose(); ghosts.delete(it);
  it.mesh.setMatrixAt(it.n, it.matrix); it.mesh.instanceMatrix.needsUpdate = true;
}
// every frame (main.js), in play
export function updateOcclusion(dt) {
  const P = G.petike && G.petike.pos;
  const active = P && G.mode === 'play';
  if (active) {
    // the nearby tall props in front of him: re-listed a few times a second (cheap), tested every frame
    if ((scanT -= dt) <= 0) { scanT = 0.25; candidates = INSTANCES.filter((it) => it.h >= MIN_H && Math.abs(it.x - P.x) < NEAR && Math.abs(it.z - P.z) < NEAR); }
    const py = G.petike.flyY || 0, PP = py ? new V3(P.x, P.y + py, P.z) : P;
    for (const it of candidates) if (covers(it, PP)) ghostOf(it).on = true;
  }
  for (const [it, g] of ghosts) {
    g.op = damp(g.op, g.on && active ? FADE : 1, 8, dt);
    g.mesh.material.opacity = g.op;
    if (!g.on && g.op > 0.98) release(it, g);
    g.on = false;   // set again next frame while it still covers him
  }
}
