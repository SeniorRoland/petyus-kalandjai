// Petyus kalandjai – ball: Labda: fizika, gól.
import * as THREE from 'three';
import { actors, confetti } from './actors.js';
import { sBounce, sCheer, sPop, sThunk, sWhistle } from './audio.js';
import { GOAL_GRUMBLE, dad } from './dad.js';
import { scene } from './scene.js';
import { G, ball, npcs, roller } from './state.js';
import { bigText, say } from './ui.js';
import { $, R, V3, pick, rand, smooth } from './util.js';
import { GOALS, GOAL_D, GOAL_H, GOAL_HW, GX0, GX1, GZ0, GZ1, PITCH, collide, groundH } from './world.js';

// ---------------------------------------------------------------- ball
export function makeBall() {
  const g = new THREE.IcosahedronGeometry(1, 1); const pos = g.attributes.position; const cols = [];
  const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position; const verts = [];
  for (let i = 0; i < ico.count; i++) { const v = new V3().fromBufferAttribute(ico, i).normalize(); if (!verts.some((u) => u.distanceTo(v) < 0.01)) verts.push(v); }
  const c = new V3(), a = new V3(), b = new V3(), d = new V3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); d.fromBufferAttribute(pos, i + 2); c.copy(a).add(b).add(d).normalize();
    const black = verts.some((v) => v.dot(c) > 0.93); const col = black ? [0.03, 0.03, 0.04] : [0.95, 0.95, 0.95];
    for (let k = 0; k < 3; k++) cols.push(...col);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.scale.setScalar(ball.r); m.castShadow = true; m.visible = false; scene.add(m); ball.mesh = m;
}
export function spawnBall(x, y, z, vx = 0, vy = 0, vz = 0) {
  ball.pos.set(x, y, z); ball.vel.set(vx, vy, vz); ball.active = true; ball.mesh.visible = true; ball.scale = 0.01; sPop();
}
export function resetBallToPlayer() {
  if (G.mode !== 'play') return;
  const f = new V3(Math.sin(G.petike.heading), 0, Math.cos(G.petike.heading));
  spawnBall(G.petike.pos.x + f.x * 0.7, 0.9, G.petike.pos.z + f.z * 0.7, f.x * 0.5, 1.5, f.z * 0.5);
}
const axis = new V3(), q = new THREE.Quaternion();
export function updateBall(dt) {
  if (!ball.active) return;
  ball.scale = Math.min(1, ball.scale + dt * 5); ball.mesh.scale.setScalar(ball.r * (0.4 + 0.6 * smooth(ball.scale)));
  if (ball.juggle) {   // kinematic while juggling (updateJuggle moves it); just spin
    axis.set(1, 0, 0); q.setFromAxisAngle(axis, -9 * dt); ball.mesh.quaternion.premultiply(q); ball.mesh.position.copy(ball.pos); return;
  }
  ball.hitCd -= dt;
  const steps = 3, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    ball.vel.y -= 9.81 * h;
    ball.pos.addScaledVector(ball.vel, h);
    const g = groundH(ball.pos.x, ball.pos.z);
    let onGround = false;
    if (ball.pos.y < g + ball.r) {
      ball.pos.y = g + ball.r;
      if (ball.vel.y < -1.0) { sBounce(-ball.vel.y); ball.vel.y = -ball.vel.y * 0.55; ball.vel.x *= 0.92; ball.vel.z *= 0.92; }
      else { ball.vel.y = 0; onGround = true; }
    }
    const fr = Math.exp(-(onGround ? 0.9 : 0.08) * h); ball.vel.x *= fr; ball.vel.z *= fr;
    if (onGround && Math.hypot(ball.vel.x, ball.vel.z) < 0.06) { ball.vel.x = 0; ball.vel.z = 0; }
    collide(ball.pos, ball.r, ball.pos.y - ball.r, (nx, nz, c) => {
      const vn = ball.vel.x * nx + ball.vel.z * nz;
      if (vn < 0) { const k = 1 + c.e; ball.vel.x -= k * vn * nx; ball.vel.z -= k * vn * nz; if (c.e < 0.3) { ball.vel.x *= 0.5; ball.vel.z *= 0.5; ball.vel.y *= 0.5; } else if (-vn > 1.5) sThunk(-vn); }
    });
    // bounce off people (not Petyus)
    if (ball.pos.y < 1.7) for (const a of actors) {
      if (a === G.petike || !a.solid) continue; const p = a.riding ? roller.pos : a.pos;
      const dx = ball.pos.x - p.x, dz = ball.pos.z - p.z; const d = Math.hypot(dx, dz); const m = 0.3 + ball.r;
      if (d < m && d > 1e-4) {
        const nx = dx / d, nz = dz / d; ball.pos.x = p.x + nx * m; ball.pos.z = p.z + nz * m;
        const vn = ball.vel.x * nx + ball.vel.z * nz;
        if (vn < 0) { ball.vel.x -= 1.5 * vn * nx; ball.vel.z -= 1.5 * vn * nz; if (-vn > 2.5 && ball.hitCd <= 0 && a.sit < 0.5) { ball.hitCd = 2; say(a, pick(['Hé, vigyázz!', 'Hoppá!', 'Jó lövés volt, csak nem felém!', 'Au!']), 2); } }
      }
    }
  }
  // world bounds
  if (ball.pos.x < GX0 + 1 || ball.pos.x > GX1 - 1 || ball.pos.z < GZ0 + 1 || ball.pos.z > GZ1 - 1) { ball.vel.set(0, 0, 0); resetBallToPlayer(); }
  // rolling rotation
  const sp = Math.hypot(ball.vel.x, ball.vel.z);
  if (sp > 0.01) { axis.set(ball.vel.z, 0, -ball.vel.x).normalize(); q.setFromAxisAngle(axis, sp * dt / ball.r); ball.mesh.quaternion.premultiply(q); }
  ball.mesh.position.copy(ball.pos);
  checkGoal(dt);
}
function checkGoal(dt) {
  if (G.goalLock > 0) {
    G.goalLock -= dt;
    if (G.goalLock <= 0) { spawnBall(PITCH.cx, 2.2, PITCH.cz, 0, 0, 0); }
    return;
  }
  if (G.mode !== 'play') return;
  for (const g of GOALS) {
    const beyond = g.dir < 0 ? ball.pos.x < g.x - ball.r * 0.5 : ball.pos.x > g.x + ball.r * 0.5;
    const inside = g.dir < 0 ? ball.pos.x > g.x - GOAL_D - 0.2 : ball.pos.x < g.x + GOAL_D + 0.2;
    if (beyond && inside && Math.abs(ball.pos.z) < GOAL_HW && ball.pos.y < GOAL_H) { goal(g); break; }
  }
}
function goal(g) {
  G.score++; $('score').textContent = G.score; G.goalLock = 3.2;
  bigText(pick(['GÓÓÓL!', 'GÓÓÓL!', 'BOMBA!', 'GÓL! GÓL!']), 2.2);
  sWhistle(); setTimeout(sCheer, 300);
  confetti(g.x + g.dir * 0.5, 0);
  G.angi.cheer = 2.6; G.petike.cheer = 1.6;
  if (G.petyaMode === 'bench') { G.petya.point = 1.6; say(G.petya, pick(GOAL_GRUMBLE), 2.8); dad.talkT = 4.5; }
  setTimeout(() => say(G.angi, pick(['Ügyes vagy, kicsim!', 'Bravó, Petyus!', 'Gyönyörű volt!', 'Juhééé!']), 2.5), 1300);
  for (const n of npcs) if (n.actor.pos.distanceTo(G.petike.pos) < 18 && rand() < 0.5) setTimeout(() => say(n.actor, pick(['Szép gól!', 'Bravó!', 'Hű!']), 1.8, ''), R(300, 1200));
}

