// Petyus kalandjai – activities/squirt: 4. csibészség – „Vízipisztoly az ivókútból”.
// At the drinking fountain SPACE: Petyus puts his thumb on the tap and squirts an arc of water for 25 s.
// WASD/arrows move the landing spot (a blue ring) in screen directions, like walking; hold SPACE to spray. Passers-by on the path
// by the pitch, Angi and dad on the bench are the targets: dad: „Ez nem vízipisztoly! Ez ivókút! IVÓ-KÚT!”, Angi fires back.
import * as THREE from 'three';
import { Actor, actors, spawnFx } from '../actors.js';
import { noise, soundAt } from '../audio.js';
import { dad } from '../dad.js';
import { keys, kickHeld, touch } from '../input.js';
import { award } from '../mischief.js';
import { CAM_FWD, CAM_RIGHT, pvel } from '../player.js';
import { makePerson } from '../rigs.js';
import { scene } from '../scene.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { $, R, V3, clamp, dampAngle, pick } from '../util.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';

const SPOUT = new V3(28.3, 1.13, -12.93), STAND = [28.3, -12.36];
const TIME = 25, RMIN = 1.8, RMAX = 7.2, HIT_R = 0.8;
export const sq = { on: false, t: 0, yaw: Math.PI / 2, r: 4.5, hits: 0, dad: false, dadHits: 0, tick: 0, fxT: 0, ring: null, walkers: [], leaving: [], leaveT: 0, cd: new Map(), angiBack: false };
const WALKER_LINES = ['Hé!', 'Áh, vizes lettem!', 'Ki volt ez?!', 'Fiatalember!', 'Jaj, a frizurám!', 'Pont most mostam hajat!', 'Ez esik? Nem esik!'];
const DAD_LINES = ['Ez nem vízipisztoly! Ez ivókút! IVÓ-KÚT!', 'Petyus! Az újságom!', 'Hé! Ez hideg!', 'Most öntözöl, vagy mi?!'];

export function startSquirt() {
  const a = G.petike;
  G.pstate = 'squirt'; sq.on = true; sq.t = 0; sq.hits = 0; sq.dad = false; sq.dadHits = 0; sq.yaw = Math.PI / 2; sq.r = 4.5; sq.cd.clear(); sq.angiBack = false;
  pvel.set(0, 0, 0); G.charging = false; a.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  a.pos.set(STAND[0], 0, STAND[1]); a.sync();
  // the landing ring
  sq.ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 28), new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  sq.ring.rotation.x = -Math.PI / 2; scene.add(sq.ring);
  // a few passers-by stroll along the path by the pitch for the length of the game
  sq.walkers = [];
  for (let i = 0; i < 5; i++) {
    const w = new Actor(makePerson({}), ''); w.solid = false;
    const z = -11.0 + (i % 2 ? 0.45 : -0.35), x0 = 22.5 + i * 3.2, east = i % 2 === 0;
    w.place(x0, z, east ? Math.PI / 2 : -Math.PI / 2);
    const pts = []; for (let k = 0; k < 6; k++) pts.push([k % 2 === (east ? 0 : 1) ? 38 : 22.8, z]);
    w.walkTo(pts, 0.9 + i * 0.1); w.fleeT = 0;
    sq.walkers.push(w);
  }
  say(a, pick(['Hehe… hüvelykujj a csapra!', 'Ivókút? Nem. Vízipisztoly!']), 2.0);
  $('mini').style.display = 'block'; hud();
}
function hud() { $('mini').innerHTML = `💦 Találat: <b>${sq.hits}</b> · ⏱ ${Math.max(0, Math.ceil(TIME - sq.t))}`; }
const landing = (out) => out.set(SPOUT.x + Math.sin(sq.yaw) * sq.r, 0, SPOUT.z + Math.cos(sq.yaw) * sq.r);

export function updateSquirt(dt) {
  const a = G.petike, L = landing(new V3());
  sq.t += dt;
  // aim: WASD / arrows (joystick on touch) move the ring in screen directions; SPACE (or the kick button) held = spray, E = stop
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  const mx = (CAM_RIGHT.x * ix + CAM_FWD.x * iy) * 4.2 * dt, mz = (CAM_RIGHT.z * ix + CAM_FWD.z * iy) * 4.2 * dt;
  let ox = Math.sin(sq.yaw) * sq.r + mx, oz = Math.cos(sq.yaw) * sq.r + mz;
  sq.yaw = Math.atan2(ox, oz); sq.r = clamp(Math.hypot(ox, oz), RMIN, RMAX);   // the jet can't reach too near or too far
  const spray = keys.Space || kickHeld;
  G.kickPressed = G.kickReleased = false; G.qPressed = false;
  const stop = G.usePressed; G.usePressed = false;
  // Petyus leans over the tap, thumb on it
  a.heading = dampAngle(a.heading, Math.PI, 10, dt); a.animate(dt, false, 0);
  const r = a.rig; r.inner.rotation.x = 0.35; r.sh[1].rotation.x = -1.1; r.sh[0].rotation.x = spray ? -0.6 : -0.3; a.sync();
  sq.ring.position.set(L.x, 0.06, L.z); sq.ring.material.opacity = spray ? 0.9 : 0.55;
  if (spray) {
    // the jet: droplets on a parabola from the tap to the ring
    sq.fxT -= dt;
    if (sq.fxT <= 0) {
      sq.fxT = 0.025; const T = 0.5 + sq.r * 0.05;
      const vx = (L.x - SPOUT.x) / T, vz = (L.z - SPOUT.z) / T, vy = (0.05 - SPOUT.y + 0.5 * 9.8 * T * T) / T;
      spawnFx(new V3(SPOUT.x + R(-0.03, 0.03), SPOUT.y, SPOUT.z + R(-0.03, 0.03)), new V3(vx * R(0.95, 1.05), vy * R(0.95, 1.05), vz * R(0.95, 1.05)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2]), 0.045, T + 0.05, 9.8);
      if (Math.random() < 0.4) spawnFx(new V3(L.x, 0.08, L.z), new V3(R(-1, 1), R(0.8, 1.8), R(-1, 1)), 0xc9efff, 0.04, 0.4, 9.8);
    }
    sq.tick -= dt;
    if (sq.tick <= 0) { sq.tick = 0.15; soundAt(SPOUT.x, SPOUT.z, () => noise(0.18, 2600, 0.6, 0.05), 1.2); checkHits(L); }
  }
  // passers-by: walk, or run off when hit
  for (const w of sq.walkers) {
    if (w.fleeT > 0) { w.fleeT -= dt; if (w.fleeT <= 0 && !w.path) w.walkTo([[w.pos.x < 30 ? 22.8 : 38, w.pos.z]], 1); }
    w.update(dt);
  }
  for (const [k, v] of sq.cd) sq.cd.set(k, v - dt);
  if (Math.floor(sq.t * 5) !== Math.floor((sq.t - dt) * 5)) hud();
  if (sq.t >= TIME || stop) endSquirt();
}
function checkHits(L) {
  const targets = [...sq.walkers.map((w) => [w, 'walker']), [G.petya, 'dad'], [G.angi, 'angi']];
  for (const [t, kind] of targets) {
    if (Math.hypot(t.pos.x - L.x, t.pos.z - L.z) > HIT_R || (sq.cd.get(t) || 0) > 0) continue;
    sq.cd.set(t, 1.0); sq.hits++; hud();
    for (let i = 0; i < 8; i++) spawnFx(new V3(t.pos.x, 1.3, t.pos.z), new V3(R(-1.2, 1.2), R(0.5, 2), R(-1.2, 1.2)), 0x8fd8ff, 0.05, 0.6, 9.8);
    if (kind === 'walker') {
      say(t, pick(WALKER_LINES), 1.6, ''); t.cheer = 0.5; t.fleeT = 2.5;
      const away = t.pos.x < SPOUT.x + 4 ? 18 : 45; t.walkTo([[away, t.pos.z + R(-0.4, 0.4)]], 3.2);
    } else if (kind === 'dad') {
      sq.dad = true; sq.dadHits++;
      say(G.petya, sq.dadHits === 1 ? DAD_LINES[0] : pick(DAD_LINES.slice(1)), 2.4); G.petya.point = 2; dad.talkT = 6;   // the first time always his classic
    } else if (!sq.angiBack) {
      // Angi fires back: a handful of water from her bottle
      sq.angiBack = true; say(G.angi, 'Na megállj, te kis csibész!', 2.0);
      runSeq([[0.9, () => {
        const A = G.angi.pos, P = G.petike.pos;
        for (let i = 0; i < 26; i++) spawnFx(new V3(A.x, 1.2, A.z), new V3((P.x - A.x) / 0.7 + R(-0.6, 0.6), 3.5 + R(-0.5, 0.5), (P.z - A.z) / 0.7 + R(-0.6, 0.6)), 0x8fd8ff, 0.05, 0.75, 9.8);
        noise(0.4, 1800, 0.7, 0.18);
      }], [0.7, () => say(G.petike, 'Áááá! Hideg! Anya!', 1.8)]]);
    } else say(G.angi, pick(['Petyus!', 'Na! Elég volt!']), 1.4);
  }
}
function endSquirt() {
  sq.on = false; G.pstate = 'free'; $('mini').style.display = 'none';
  scene.remove(sq.ring); sq.ring.geometry.dispose(); sq.ring = null;
  // the passers-by leave the park and are removed
  sq.leaving = sq.walkers; sq.walkers = []; sq.leaveT = 9;
  for (const w of sq.leaving) w.walkTo([[w.pos.x < 30 ? 14 : 50, w.pos.z]], 1.4);
  if (sq.hits > 0) {
    award('vizipisztoly', sq.hits, { dad: sq.dad });
    if (sq.dad) runSeq([[1.0, () => { say(G.petya, pick(['Petyus! Ezért még beszélünk!', 'Szárazon hagytam otthon a jókedvem…']), 2.4); G.petya.point = 1.6; }]]);
  } else say(G.petike, 'Hmm… a víz nem talált el senkit. Majd legközelebb!', 2.2);
}
// every frame (player.js): the passers-by walk out of the park after the game, then they are removed
export function squirtTick(dt) {
  if (!sq.leaving.length) return;
  for (const w of sq.leaving) w.update(dt);
  if ((sq.leaveT -= dt) <= 0) { for (const w of sq.leaving) { scene.remove(w.rig.root); const i = actors.indexOf(w); if (i >= 0) actors.splice(i, 1); } sq.leaving = []; }
}
