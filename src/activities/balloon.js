// Petyus kalandjai – activities/balloon: 10. csibészség – „Lufis bácsi”.
// A balloon seller stands by the path north-west of the pitch. „E – Kérek egy lufit!” → he sells Petyus five, and
// Petyus becomes very light: SPACE = a huge jump, he floats down slowly, the wind pushes him about (WASD steers in the air).
// Up in the tree where the cat sits (the one dad threw up there – or another cat climbs up now) an old ball is stuck:
// reach it with your hand. Too close to the cat: „Psssz!” – PUKK, one balloon less (fewer balloons = smaller jumps).
// With the ball: a gust lifts him off – dad catches his ankle at the very last moment, and the balloons fly away.
// Stars: ★ flew with the balloons · ★★ reached the ball · ★★★ … with not a single balloon popped.
import * as THREE from 'three';
import { Actor, spawnFx } from '../actors.js';
import { sFlap, sMeow, sPop, soundAt, tone } from '../audio.js';
import { CAM_FWD, CAM_RIGHT, pvel } from '../player.js';
import { dad, dadReturn, navTarget } from '../dad.js';
import { isTouch, keys, touch } from '../input.js';
import { award } from '../mischief.js';
import { makePerson } from '../rigs.js';
import { scene } from '../scene.js';
import { G, animals } from '../state.js';
import { bigText, say, toast } from '../ui.js';
import { $, R, V3, clamp, damp, dampAngle, pick, rand } from '../util.js';
import { FENCE, GX0, GX1, GZ0, GZ1, TREES, collide, groundH, treeTop } from '../world.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';

const SELLER = [23.6, -12.2], N0 = 5, LIFT = 1.6, JUMP = 5.0, FALL = 2.2, TIME = 50, REACH = 0.8, POP_R = 1.3;
const COLORS = [0xe63946, 0xffd166, 0x4dabf7, 0x6bbf4e, 0xf28cb1];
export const bl = { on: false, phase: '', t: 0, y: 0, vy: 0, n: 0, pops: 0, flew: false, got: false, seller: null, sellerBunch: null, bunch: null, balls: [], ball: null,
  tree: null, cat: null, popCd: 0, windT: 0, end: '', liftT: 0, hudT: 0 };

// ---------- the balloon seller (created when the game starts)
function makeBunch(n, spread = 1) {
  const g = new THREE.Group(), items = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, off = new V3(Math.cos(a) * 0.28 * spread, 1.35 + (i % 2) * 0.28, Math.sin(a) * 0.28 * spread);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshLambertMaterial({ color: COLORS[i % COLORS.length] })); m.scale.y = 1.2; m.castShadow = true;
    m.position.copy(off); g.add(m);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), off.clone().setY(off.y - 0.24)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
    g.add(line); items.push({ m, line, off, ph: rand() * 6 });
  }
  scene.add(g); return { g, items };
}
function ensureSeller() {
  if (bl.seller) return;
  bl.seller = new Actor(makePerson({ shirt: 0xf4a261, pants: 0x3d405b, hat: true, hatColor: 0xe63946, hair: 0xd8d8d8, glasses: false, dress: false }), 'Lufis bácsi');
  bl.seller.place(SELLER[0], SELLER[1], Math.PI * 0.75); bl.seller.solid = true;
  bl.sellerBunch = makeBunch(7, 1.2);
}
const handPos = (actor, i, out) => {
  const hb = actor.rig.handBones;
  if (hb) { actor.rig.root.updateMatrixWorld(true); return hb[i].getWorldPosition(out); }
  actor.rig.root.updateMatrixWorld(true); return out.set(actor.pos.x, (actor.rig.root.position.y || 0) + 0.9, actor.pos.z);
};
function bob(b, base) {
  for (const it of b.items) { it.m.position.set(it.off.x + Math.sin(G.clockT * 1.3 + it.ph) * 0.05, it.off.y + Math.sin(G.clockT * 1.7 + it.ph) * 0.04, it.off.z); }
  b.g.position.copy(base);
}
// every frame (player.js): the seller, his balloons, background bits
export function balloonTick(dt) {
  if (G.mode !== 'play') return;
  ensureSeller();
  const s = bl.seller; s.animate(dt, false, 0);
  const r = s.rig; r.sh[1].rotation.x = -2.5; s.sync();
  bob(bl.sellerBunch, new V3(s.pos.x + 0.3, 0.6, s.pos.z));
  if (bl.flyAway) { bl.flyAway.g.position.y += dt * 1.6; bl.flyAway.g.position.x += dt * 0.6; if (bl.flyAway.g.position.y > 30) { scene.remove(bl.flyAway.g); bl.flyAway = null; } }
}
export function canBalloon() { return G.pstate === 'free' && !bl.on && bl.seller && G.petike.pos.distanceTo(bl.seller.pos) < 1.9; }

// ---------- start: five balloons, the stuck ball, the cat on the tree
export function startBalloon() {
  const a = G.petike;
  G.pstate = 'balloon'; bl.on = true; bl.phase = 'talk'; bl.t = 0; bl.y = 0; bl.vy = 0; bl.n = N0; bl.pops = 0; bl.flew = false; bl.got = false; bl.end = ''; bl.popCd = 0;
  pvel.set(0, 0, 0); G.charging = false; a.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  setupTarget();
  say(a, 'Bácsi, kérek egy lufit!', 1.8);
  runSeq([
    [1.6, () => say(bl.seller, 'Egyet? Minek egyet! Vegyél ötöt!', 2.2, 'Lufis bácsi')],
    [2.2, () => say(a, 'Ötöt!!', 1.2)],
    [1.2, () => { giveBalloons(); say(bl.seller, 'Kapaszkodj, kisfiam! Ezek nagyon erősek!', 2.4, 'Lufis bácsi'); }],
    [2.4, () => { say(bl.seller, 'Látod ott fent, a fán? Valakinek fennakadt a labdája…', 2.6, 'Lufis bácsi'); bl.phase = 'fly'; bl.t = 0;
      toast(isTouch ? '<b>RÚGÁS</b> – nagy ugrás · joystick – irányítás a levegőben · szedd le a <b>labdát</b> a fáról!' : '<b>Szóköz</b> – nagy ugrás · <b>WASD</b> – irányítás a levegőben · szedd le a <b>labdát</b> a fáról!', 5); }],
  ]);
  $('mini').style.display = 'block'; hud();
}
function setupTarget() {
  // the tree with a cat on it – or the oak nearest to the seller (and a cat climbs up)
  bl.cat = animals.find((an) => an.type === 'cat' && an.evt === 'tree');
  if (bl.cat) bl.tree = TREES.reduce((b, t) => (!b || Math.hypot(t.x - bl.cat.pos.x, t.z - bl.cat.pos.z) < Math.hypot(b.x - bl.cat.pos.x, b.z - bl.cat.pos.z) ? t : b), null);
  else {
    let best = null, bd = 1e9;
    for (const t of TREES) {
      if (t.z > FENCE.z0 - 2 || t.z < FENCE.z0 - 9 || t.x < FENCE.x0 - 4 || t.x > FENCE.x1) continue;
      const d = Math.hypot(t.x - (SELLER[0] + 6), t.z - SELLER[1]) + (t.id === 'oak' ? 0 : 5);
      if (d < bd) { bd = d; best = t; }
    }
    bl.tree = best || TREES[0];
    bl.cat = animals.find((an) => an.type === 'cat' && !an.evt);
    if (bl.cat) { bl.cat.evt = 'tree'; bl.cat.wait = 2; bl.cat.pos.set(bl.tree.x, 0, bl.tree.z); bl.cat.y = treeTop(bl.tree) - 0.12; }
  }
  // the old ball, stuck at the edge of the crown on the side facing the camera (the cat sits in the middle)
  const top = treeTop(bl.tree);
  if (!bl.ball) {
    bl.ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshLambertMaterial({ color: 0xd62828 })); bl.ball.castShadow = true; scene.add(bl.ball);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 18), new THREE.MeshLambertMaterial({ color: 0xffffff })); band.rotation.x = Math.PI / 2; bl.ball.add(band);
  }
  bl.ball.visible = true;
  bl.ballPos = new V3(bl.tree.x + 1.0, Math.max(2.6, top - 0.75), bl.tree.z + 1.0);   // ~1.4 m from the cat: reachable without a pop, if you are careful
  bl.ball.position.copy(bl.ballPos);
}
function giveBalloons() {
  if (bl.bunch) scene.remove(bl.bunch.g);
  bl.bunch = makeBunch(N0); sFlap(); tone('sine', 520, 780, 0.2, 0.06);
}
function hud() {
  const dist = bl.got ? '✅ labda' : `🎯 ${Math.round(G.petike.pos.distanceTo(new V3(bl.ballPos.x, 0, bl.ballPos.z)))} m`;
  $('mini').innerHTML = `🎈 ×<b>${bl.n}</b> · ${dist} · ⏱ ${Math.max(0, Math.ceil(TIME - (bl.phase === 'fly' ? bl.t : 0)))}` + (bl.y > 0.3 ? ` · ⬆ ${bl.y.toFixed(1)} m` : '');
}

export function updateBalloon(dt) {
  const a = G.petike, P = a.pos;
  bl.t += dt; bl.popCd -= dt;
  // --- input
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const il = Math.hypot(wx, wz); if (il > 1) { wx /= il; wz /= il; }
  const jump = G.kickPressed; G.kickPressed = G.kickReleased = false; G.qPressed = false; G.usePressed = false;
  const free = bl.phase === 'fly' && !bl.end;
  if (!free) wx = wz = 0;
  // --- vertical: balloons make him light (fewer balloons → heavier)
  const ground = bl.y <= 0.001;
  if (bl.phase === 'lift') { bl.vy = damp(bl.vy, bl.liftV, 3, dt); }
  else {
    if (free && ground && jump) { bl.vy = JUMP * (bl.n > 0 ? 1 : 0.6); tone('sine', 300, 600, 0.15, 0.05); }
    bl.vy -= (9.8 - LIFT * bl.n) * dt; bl.vy = Math.max(bl.vy, bl.n > 0 ? -FALL : -9);
  }
  bl.y += bl.vy * dt;
  if (bl.y <= 0) { bl.y = 0; bl.vy = Math.max(0, bl.vy); }
  if (bl.y > 1.0) bl.flew = true;
  // --- horizontal: walking on the ground, steering + wind in the air
  bl.windT += dt;
  const wind = bl.y > 0.3 ? [0.8 * Math.sin(bl.windT * 0.37) + 0.45 * Math.sin(bl.windT * 1.13 + 1), 0.6 * Math.sin(bl.windT * 0.29 + 2) + 0.3 * Math.sin(bl.windT * 0.9)] : [0, 0];
  const air = bl.y > 0.05, sp = air ? 2.4 : 3.0;
  pvel.x = damp(pvel.x, wx * sp + wind[0], air ? 2.5 : 10, dt); pvel.z = damp(pvel.z, wz * sp + wind[1], air ? 2.5 : 10, dt);
  P.x += pvel.x * dt; P.z += pvel.z * dt;
  if (bl.y < 0.8) collide(P, 0.26, bl.y, null);
  P.x = clamp(P.x, GX0 + 1, GX1 - 1); P.z = clamp(P.z, GZ0 + 1, GZ1 - 1);
  if (air && Math.random() < dt * 1.5) spawnFx(new V3(P.x + R(-2, 2), bl.y + R(0, 2), P.z + R(-2, 2)), new V3(wind[0] * 2, R(-0.2, 0.3), wind[1] * 2), pick([0x6bbf4e, 0x9acd32, 0xd9b26a]), 0.05, 1.6, 0);
  // --- pose: one hand holding the strings, legs dangling in the air
  const moving = !air && Math.hypot(pvel.x, pvel.z) > 0.3;
  if (il > 0.1) a.targetHeading = Math.atan2(wx, wz);
  a.heading = dampAngle(a.heading, a.targetHeading, 10, dt); a.animate(dt, moving, Math.hypot(pvel.x, pvel.z));
  const r = a.rig; r.sh[1].rotation.x = -2.9; r.sh[1].rotation.z = 0.1;
  if (air) { const sw = Math.sin(G.clockT * 6); r.hip[0].rotation.x = -0.3 + sw * 0.35; r.hip[1].rotation.x = -0.3 - sw * 0.35; r.knee[0].rotation.x = r.knee[1].rotation.x = 0.6; r.sh[0].rotation.x = -0.9 + sw * 0.3; }
  a.sync(); r.root.position.y = groundH(P.x, P.z) + bl.y; a.flyY = bl.y;
  // the bunch above his left hand
  if (bl.bunch) { const hp = new V3(); handPos(a, 1, hp); bob(bl.bunch, hp.setY(hp.y - 0.15)); }
  // --- the ball: reached with the hand
  if (!bl.got && bl.phase === 'fly') {
    const hand = new V3(P.x, groundH(P.x, P.z) + bl.y + 1.25, P.z);
    if (hand.distanceTo(bl.ballPos) < REACH) gotBall();
  }
  if (bl.got && bl.ball.visible) { const hp = new V3(); handPos(a, 0, hp); bl.ball.position.copy(hp); }
  // --- the cat pops a balloon if he floats too close
  if (bl.cat && bl.cat.evt === 'tree' && bl.n > 0 && bl.popCd <= 0 && !bl.end) {
    const c = new V3(bl.cat.pos.x, bl.cat.y + 0.2, bl.cat.pos.z), top = new V3(P.x, groundH(P.x, P.z) + bl.y + 1.6, P.z);
    if (top.distanceTo(c) < POP_R) popBalloon();
    else if (top.distanceTo(c) < POP_R + 0.9 && !bl.warned) { bl.warned = true; say({ headWorld: (v) => v.set(c.x, c.y + 0.5, c.z) }, 'Psssz!', 1.0, ''); soundAt(c.x, c.z, sMeow, 1); }
  }
  // --- dad, worried
  if (bl.flew && !bl.dadSaid) { bl.dadSaid = true; say(G.petya, pick(['PETYUUUS! Gyere le onnan!!', 'Ki adott neked lufit?!']), 2.2); G.petya.point = 2; dad.talkT = 15; }
  updateDadRun(dt);
  // --- the end
  if (bl.phase === 'fly' && !bl.end && (bl.t > TIME || bl.n === 0) && ground) endNoBall();
  if (bl.phase === 'land' && ground && !bl.end) startLift();
  if (bl.phase === 'lift') tickLift(dt);
  if ((bl.hudT -= dt) <= 0) { bl.hudT = 0.2; hud(); }
}
function popBalloon() {
  bl.popCd = 2.2; bl.warned = false;
  const it = bl.bunch.items.pop(); if (!it) return;
  const wp = new V3(); it.m.getWorldPosition(wp); bl.bunch.g.remove(it.m); bl.bunch.g.remove(it.line);
  for (let i = 0; i < 14; i++) spawnFx(wp.clone(), new V3(R(-2, 2), R(-1, 2), R(-2, 2)), it.m.material.color.getHex(), 0.05, 0.5, 4);
  sPop(); soundAt(wp.x, wp.z, () => tone('square', 900, 120, 0.12, 0.12), 1);
  bl.n--; bl.pops++;
  say({ headWorld: (v) => v.copy(wp).setY(wp.y + 0.3) }, 'PUKK!', 1.0, '');
  runSeq([[0.6, () => say(G.petike, bl.n === 0 ? 'Neee! Az utolsó is!' : pick(['Hé! Rossz cica!', 'Az a kedvencem volt!', 'Jaj, a piros!']), 1.6)]]);
}
function gotBall() {
  bl.got = true; bl.phase = 'land';
  bigText('MEGVAN!', 1.2); tone('triangle', 880, 1320, 0.2, 0.1);
  say(G.petike, 'Megvan a labda!', 1.6);
  // dad comes running to catch him when he lands
  bl.dadRun = true; G.petyaMode = 'balloon'; G.petya.sitTarget = 0;
}
function updateDadRun(dt) {
  if (!bl.dadRun) return;
  const p = G.petya, P = G.petike.pos, d = Math.hypot(p.pos.x - P.x, p.pos.z - P.z);
  if (p.sit > 0.05) return;
  if (d > 0.7) { const t = navTarget(p.pos, [P.x + 0.5, P.z + 0.3]); p.path = [new V3(t[0], 0, t[1])]; p.speed = 5.5; p.keepHeading = false; }
  else { p.path = null; p.targetHeading = Math.atan2(P.x - p.pos.x, P.z - p.pos.z); }
}
// back on the ground with the ball: a gust lifts him – dad catches his ankle at the last moment
function startLift() {
  bl.phase = 'lift'; bl.liftT = 0; bl.liftV = 1.1; bl.caught = false;
  say(G.petike, 'Hűha! Elvisz a szél!! APAAA!', 2.0);
}
function tickLift(dt) {
  bl.liftT += dt;
  const p = G.petya, P = G.petike.pos, near = Math.hypot(p.pos.x - P.x, p.pos.z - P.z) < 1.1;
  if (!bl.caught && near && bl.y > 0.5) {
    bl.caught = true; bl.liftV = -1.4;
    say(p, 'MEGVAN A BOKÁD!!', 1.6); p.point = 0; p.cheer = 0;
  }
  if (bl.caught) { const r = p.rig; r.sh[0].rotation.x = r.sh[1].rotation.x = -2.6; r.inner.rotation.x = -0.15; p.sync(); }   // both hands up, holding the ankle
  if (!bl.caught && bl.y > 2.4) bl.liftV = 0.15;   // hovering – waiting for dad
  if (bl.caught && bl.y <= 0.001) finishBall();
}
function finishBall() {
  bl.phase = 'done';
  // the balloons fly off, the ball is Petyus'
  if (bl.bunch) { bl.flyAway = bl.bunch; bl.bunch = null; }
  sFlap();
  runSeq([
    [0.8, () => say(G.petya, 'Ezeket a lufikat most szépen elengedjük.', 2.2)],
    [2.2, () => say(G.petike, bl.pops === 0 ? 'De megvan a labda! És mind az öt lufi!' : 'De megvan a labda!', 2.0)],
    [2.0, () => say(bl.seller, 'Hé! A lufik ára nem tartalmazza a repülést!', 2.4, 'Lufis bácsi')],
    [1.6, () => { award('lufi', bl.pops === 0 ? 3 : 2); end(); }],
  ]);
}
function endNoBall() {
  bl.end = 'noball';
  if (bl.bunch) { bl.flyAway = bl.bunch; bl.bunch = null; }
  say(G.petike, bl.n === 0 ? 'Ennyi volt a lufi…' : 'Elfáradtam… a labda fent maradt.', 2.0);
  runSeq([[2.0, () => { if (bl.flew) award('lufi', 1); else say(bl.seller, 'Ugrani is kell ám vele, kisfiam!', 2.0, 'Lufis bácsi'); end(); }]]);
}
function end() {
  const a = G.petike;
  bl.on = false; bl.phase = ''; G.pstate = 'free'; bl.y = 0; a.flyY = 0; bl.dadRun = false; bl.dadSaid = false; $('mini').style.display = 'none';
  if (bl.ball) bl.ball.visible = !bl.got;   // the ball he got is gone (taken home); otherwise it stays up there
  if (bl.got) bl.ball.position.copy(bl.ballPos);
  if (G.petyaMode === 'balloon' || G.petyaMode === 'bench') { if (G.petyaMode === 'balloon') dadReturn(); }
}
