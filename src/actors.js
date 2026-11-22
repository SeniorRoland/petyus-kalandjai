// Petyus kalandjai – actors: Actor (séta, ülés, pózok), állatmodellek, részecske-effektek.
import * as THREE from 'three';
import { sPoof } from './audio.js';
import { animWalk, resetPose, sitKnee } from './rigs.js';
import { scene } from './scene.js';
import { G } from './state.js';
import { R, V3, clamp, damp, dampAngle, lerp, pick, rand, smooth } from './util.js';
import { groundH, partMesh } from './world.js';
import { fxAllowed } from './quality.js';

// ---------------------------------------------------------------- Actor
export const actors = [];
export class Actor {
  constructor(rig, name) {
    this.rig = rig; this.name = name; this.pos = new V3(); this.heading = 0; this.targetHeading = 0;
    this.path = null; this.speed = 1.5; this.phase = rand() * 6; this.amt = 0; this.stride = 4.4; this.swing = 0.6;
    this.sit = 0; this.sitTarget = 0; this.seatH = 0.45; this.cheer = 0; this.keepHeading = false; this.riding = false;
    this.kickT = -1; this.idleT = rand() * 10; this.solid = true; this.point = 0;
    scene.add(rig.root); actors.push(this);
  }
  setRig(r) { scene.remove(this.rig.root); this.rig = r; scene.add(r.root); this.sync(); }
  walkTo(pts, speed = 1.5, keepHeading = false) { this.path = pts.map((p) => new V3(p[0], 0, p[1])); this.speed = speed; this.keepHeading = keepHeading; }
  place(x, z, h) { this.pos.set(x, 0, z); if (h !== undefined) this.heading = this.targetHeading = h; this.sync(); }
  headWorld(out) { this.rig.root.getWorldPosition(out); out.y += this.rig.height + 0.25 - (this.sit > 0.5 ? this.rig.hipH - this.seatH + 0.0 : 0); return out; }
  update(dt) {
    if (this.riding) return;
    let moving = false;
    if (this.path) {
      const t = this.path[0]; const dx = t.x - this.pos.x, dz = t.z - this.pos.z; const d = Math.hypot(dx, dz); const st = this.speed * dt;
      if (d <= st) { this.pos.x = t.x; this.pos.z = t.z; this.path.shift(); if (!this.path.length) this.path = null; }
      else { this.pos.x += dx / d * st; this.pos.z += dz / d * st; if (!this.keepHeading) this.targetHeading = Math.atan2(dx, dz); }
      moving = true;
    }
    this.heading = dampAngle(this.heading, this.targetHeading, 9, dt);
    this.animate(dt, moving, moving ? this.speed : 0);
    this.sync();
  }
  animate(dt, moving, spd) {
    this.amt = damp(this.amt, moving ? 1 : 0, 9, dt);
    this.phase += dt * spd * this.stride;
    const r = this.rig; resetPose(r);
    const sw = this.swing * clamp(0.75 + spd * 0.12, 0.8, 1.45);
    animWalk(r, this.phase, this.amt * (1 - this.sit), sw);
    if (!moving && this.sit < 0.01) { this.idleT += dt; const b = Math.sin(this.idleT * 2) * 0.04; r.sh[0].rotation.z = -0.05 - b * 0.5; r.sh[1].rotation.z = 0.05 + b * 0.5; }
    this.sit = clamp(this.sit + Math.sign(this.sitTarget - this.sit) * dt * 1.8, 0, 1);
    if (r.foot) for (let i = 0; i < 2; i++) r.foot[i].rotation.x = 0;
    if (this.sit > 0) {
      const s = smooth(this.sit), kneeSit = sitKnee(r, this.seatH);
      for (let i = 0; i < 2; i++) {
        r.hip[i].rotation.x = lerp(r.hip[i].rotation.x, -1.5, s); r.knee[i].rotation.x = lerp(r.knee[i].rotation.x, kneeSit, s); r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -0.35, s);
        if (r.foot) r.foot[i].rotation.x = (1.5 - kneeSit) * s;   // keep the sole flat on the ground
      }
      r.inner.position.y = lerp(r.inner.position.y, this.seatH - r.hipH, s);
      r.inner.position.z = lerp(0, -0.05, s);
    }
    if (this.cheer > 0) {
      this.cheer -= dt; const k = Math.min(1, this.cheer * 2); const w = Math.sin(G.clockT * 16);
      r.sh[0].rotation.x = lerp(r.sh[0].rotation.x, -2.9 + w * 0.2, k); r.sh[1].rotation.x = lerp(r.sh[1].rotation.x, -2.9 - w * 0.2, k);
      r.sh[0].rotation.z = -0.35 * k; r.sh[1].rotation.z = 0.35 * k;
      r.inner.position.y += Math.abs(Math.sin(G.clockT * 9)) * 0.1 * k;
    }
    if (this.point > 0) { // instructing: left arm forward, finger-wagging
      this.point -= dt; const k = Math.min(1, this.point * 3); const w = Math.sin(G.clockT * 10) * 0.18;
      r.sh[1].rotation.x = lerp(r.sh[1].rotation.x, -1.6 + w, k); r.sh[1].rotation.z = lerp(r.sh[1].rotation.z, 0.12, k);
    }
  }
  // seatBase: the floor under a seated actor (part 2: the flat is upstairs)
  sync() { if (this.rig.apply) this.rig.apply(); this.rig.root.position.set(this.pos.x, this.riding ? 0 : (this.sit > 0 ? this.seatBase || 0 : groundH(this.pos.x, this.pos.z)), this.pos.z); this.rig.root.rotation.y = this.heading; }
}

// ---------------------------------------------------------------- animals
export function makeDog(colA, colB, s = 1) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0.26 * s, 0, 0.26 * s, 0.24 * s, 0.56 * s, colA, 0, 0);
    b.bx(0, 0.4 * s, 0.32 * s, 0.24 * s, 0.24 * s, 0.24 * s, colA, 0, 0);
    b.bx(0, 0.4 * s, 0.48 * s, 0.14 * s, 0.12 * s, 0.12 * s, colB, 0, 0);
    b.bx(0, 0.45 * s, 0.545 * s, 0.06 * s, 0.05 * s, 0.03 * s, 0x111111, 0, 0);
    b.bx(-0.07 * s, 0.56 * s, 0.445 * s, 0.04 * s, 0.04 * s, 0.02 * s, 0x111111, 0, 0); b.bx(0.07 * s, 0.56 * s, 0.445 * s, 0.04 * s, 0.04 * s, 0.02 * s, 0x111111, 0, 0);
    b.bx(-0.13 * s, 0.48 * s, 0.3 * s, 0.05 * s, 0.18 * s, 0.1 * s, colB, 0, 0); b.bx(0.13 * s, 0.48 * s, 0.3 * s, 0.05 * s, 0.18 * s, 0.1 * s, colB, 0, 0);
    b.bx(0, 0.36 * s, 0.2 * s, 0.27 * s, 0.05 * s, 0.05 * s, 0xe63946, 0, 0);
  }));
  const legs = [];
  for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]]) {
    const p = new THREE.Group(); p.position.set(x * s, 0.28 * s, z * s); body.add(p);
    p.add(partMesh((b) => b.bx(0, -0.28 * s, 0, 0.08 * s, 0.28 * s, 0.08 * s, colA, 0, 0))); legs.push(p);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.36 * s, -0.28 * s); body.add(tail);
  tail.add(partMesh((b) => b.box(0, 0.1 * s, -0.04 * s, 0.06 * s, 0.22 * s, 0.06 * s, colB, 0, 0))); tail.rotation.x = -0.6;
  return { root, body, legs, tail, kind: 'dog', s };
}
export function makeCat(col, col2) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0.14, 0, 0.16, 0.15, 0.38, col, 0, 0);
    b.bx(0, 0.22, 0.22, 0.18, 0.16, 0.15, col, 0, 0);
    b.bx(-0.06, 0.38, 0.22, 0.05, 0.06, 0.05, col2, 0, 0); b.bx(0.06, 0.38, 0.22, 0.05, 0.06, 0.05, col2, 0, 0);
    b.bx(-0.045, 0.31, 0.3, 0.035, 0.035, 0.01, 0x7bd389, 0, 0); b.bx(0.045, 0.31, 0.3, 0.035, 0.035, 0.01, 0x7bd389, 0, 0);
    b.bx(0, 0.26, 0.3, 0.03, 0.02, 0.01, 0xff8fab, 0, 0);
  }));
  const legs = [];
  for (const [x, z] of [[-0.05, 0.13], [0.05, 0.13], [-0.05, -0.13], [0.05, -0.13]]) {
    const p = new THREE.Group(); p.position.set(x, 0.14, z); body.add(p); p.add(partMesh((b) => b.bx(0, -0.14, 0, 0.05, 0.14, 0.05, col, 0, 0))); legs.push(p);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.2, -0.18); body.add(tail);
  tail.add(partMesh((b) => { b.box(0, 0.15, -0.02, 0.04, 0.3, 0.04, col, 0, 0); b.box(0, 0.32, -0.02, 0.045, 0.06, 0.045, col2, 0, 0); })); tail.rotation.x = -0.3;
  return { root, body, legs, tail, kind: 'cat', s: 1 };
}
export function makePigeon() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0.06, 0, 0.12, 0.11, 0.2, 0x9aa0a8, 0, 0); b.bx(0, 0.06, -0.13, 0.08, 0.04, 0.08, 0x6c7178, 0, 0);
    b.bx(0, 0.06, 0, 0.13, 0.04, 0.12, 0x7e8590, 0, 0);
  }));
  const head = new THREE.Group(); head.position.set(0, 0.15, 0.08); body.add(head);
  head.add(partMesh((b) => { b.bx(0, 0, 0, 0.08, 0.08, 0.08, 0x6a6f8a, 0, 0); b.bx(0, 0.02, 0.05, 0.03, 0.02, 0.04, 0xe8a87c, 0, 0); b.bx(-0.041, 0.04, 0.02, 0.01, 0.02, 0.02, 0xff7b00, 0, 0); b.bx(0.041, 0.04, 0.02, 0.01, 0.02, 0.02, 0xff7b00, 0, 0); }));
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.06, 0.12, 0); body.add(w); w.add(partMesh((b) => b.box(s * 0.08, 0, 0, 0.16, 0.02, 0.14, 0x8a919a, 0, 0))); wings.push(w); }
  return { root, body, head, wings };
}
export function animLegs(a, phase, amt) {
  const s = Math.sin(phase) * 0.7 * amt;
  a.legs[0].rotation.x = s; a.legs[3].rotation.x = s; a.legs[1].rotation.x = -s; a.legs[2].rotation.x = -s;
  a.body.position.y = Math.abs(Math.cos(phase)) * 0.025 * amt;
}

// ---------------------------------------------------------------- FX (particles)
const fx = [];
const fxGeo = new THREE.BoxGeometry(1, 1, 1);
export function spawnFx(pos, vel, color, size, life, grav = 0, fade = true) {
  if (!fxAllowed(fx.length)) return;   // quality.js: fewer particles on phones / slow devices
  const m = new THREE.Mesh(fxGeo, new THREE.MeshLambertMaterial({ color, transparent: fade }));
  m.scale.setScalar(size); m.position.copy(pos); m.rotation.set(rand() * 3, rand() * 3, 0); scene.add(m);
  fx.push({ m, vel: vel.clone(), life, max: life, grav, size, fade });
}
export function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.life -= dt;
    if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); fx.splice(i, 1); continue; }
    p.vel.y -= p.grav * dt; p.m.position.addScaledVector(p.vel, dt); p.m.rotation.x += dt * 3; p.m.rotation.y += dt * 2;
    if (p.grav > 0 && p.m.position.y < 0.03) { p.m.position.y = 0.03; p.vel.multiplyScalar(0.5); }
    const k = p.life / p.max; if (p.fade) p.m.material.opacity = Math.min(1, k * 2.5); p.m.scale.setScalar(p.size * (p.fade ? (0.5 + 0.5 * k) : 1));
  }
}
export function poof(pos) {
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2, u = R(0.3, 1.6);
    spawnFx(new V3(pos.x + Math.cos(a) * 0.2, R(0.1, 1.2), pos.z + Math.sin(a) * 0.2), new V3(Math.cos(a) * u, R(0.2, 1.5), Math.sin(a) * u), pick([0xffffff, 0xf3f3f3, 0xffe3ef, 0xfff6c9]), R(0.12, 0.26), R(0.6, 1.1));
  }
  for (let i = 0; i < 10; i++) spawnFx(new V3(pos.x, R(0.4, 1.3), pos.z), new V3(R(-1, 1), R(1, 2.5), R(-1, 1)), pick([0xffd166, 0xff70a6, 0x4cc9f0]), 0.08, 1.0, 2);
  sPoof();
}
export function confetti(x, z) {
  for (let i = 0; i < 90; i++) spawnFx(new V3(x + R(-1, 1), R(0.5, 2), z + R(-1.5, 1.5)), new V3(R(-3, 3), R(3, 7), R(-3, 3)), pick([0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xffffff]), R(0.07, 0.12), R(1.6, 2.6), 6, false);
}

