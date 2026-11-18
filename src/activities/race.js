// Petyus kalandjai – activities/race: 8. csibészség – „Rollerverseny a nyugdíjassal”.
// The old man with the hat on the bench by the north path has a mint-green moped parked next to him. Ride up to him on the
// scooter: „E – Verseny a bácsival!” → one lap of the park path (the walkers' loop), 3-2-1-RAJT. Right behind him you are in
// his slipstream (faster); he slows down in the corners. On the home straight he switches on the turbo and wins –
// „Az én időmben is így volt!” – unless Petyus is already ahead: then the turbo coughs and dies.
// Stars: ★ finished · ★★ ahead at half distance · ★★★ won.
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { noise, sThunk, tone } from '../audio.js';
import { dad, dadReturn } from '../dad.js';
import { award } from '../mischief.js';
import { LOOP_LEN, loopPoint } from '../npcs.js';
import { poseRider } from '../roller.js';
import { scene } from '../scene.js';
import { G, npcs, roller } from '../state.js';
import { bigText, say } from '../ui.js';
import { $, R, V3, clamp, damp, dampAngle, pick, rand } from '../util.js';
import { L, benchSpots, groundH } from '../world.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';
import { rideStep } from './scooter.js';

const SPEED = 6.0, CORNER_SPEED = 4.0, TURBO_SPEED = 7.8, DRAFT = 1.25, SLING = 1.6, TIMEOUT = 90;   // Petyus: 5.6 m/s flat out – faster than him only in his slipstream (and for SLING s after pulling out of it)
const CORNERS = [36, 48, 84, 96];   // loop distance of the corners (LOOP in npcs.js: 36 + 12 + 36 + 12 m)
export const rc = { on: false, phase: '', t: 0, oldie: null, moped: null, park: null, gs: 0, ps: 0, s0: 0, gsp: 0, half: null, turbo: '', winner: '', back: '', backT: 0,
  draftT: 0, lineT: 0, offT: 0, hudT: 0, said: new Set() };
const LANE_G = -0.4, LANE_P = 0.5;   // + = the inner side of the loop (lamps by the fountain beds are close to it)

// ---------- the moped (built once, parked next to his bench)
function buildMoped() {
  const g = new THREE.Group(), m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, x, y, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  box(0.36, 0.22, 1.0, 0, 0.36, 0, 0x7fd1b9);            // body
  box(0.38, 0.3, 0.5, 0, 0.55, -0.2, 0x7fd1b9);           // rear cowl
  box(0.32, 0.08, 0.42, 0, 0.73, -0.2, 0x5a3a24);         // seat
  box(0.4, 0.55, 0.1, 0, 0.62, 0.42, 0x7fd1b9);           // leg shield
  box(0.06, 0.45, 0.06, 0, 0.9, 0.48, 0xbdbdbd);          // steering column
  box(0.62, 0.05, 0.05, 0, 1.12, 0.48, 0x333333);         // handlebar
  box(0.14, 0.12, 0.06, 0, 1.0, 0.53, 0xfff2a8);          // headlight
  box(0.18, 0.06, 0.12, 0, 0.42, -0.56, 0x555555);        // exhaust
  for (const z of [-0.38, 0.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 14), m(0x222222)); w.rotation.z = Math.PI / 2; w.position.set(0, 0.19, z); w.castShadow = true; g.add(w); }
  return g;
}
function ensureMoped() {
  if (rc.moped || !rc.oldie && !findOldie()) return;
  rc.oldie = findOldie(); const b = rc.oldie.b;
  const [x, z] = L(b.x, b.z, b.rot, -1.75, 0.55);   // left of the bench, a step in front of it
  rc.park = { x, z, h: b.rot + Math.PI / 2 };
  rc.moped = buildMoped(); rc.moped.position.set(x, 0, z); rc.moped.rotation.y = rc.park.h; scene.add(rc.moped);
}
const findOldie = () => npcs.find((n) => n.type === 'sit' && n.b === benchSpots[0]);
const seatOf = (b) => L(b.x, b.z, b.rot, -0.45, -0.05);
// called every frame from player.js: the parked moped, the old man going back to his bench
export function raceTick(dt) {
  if (G.mode !== 'play') return;
  ensureMoped();
  if (rc.back) tickBack(dt);
}
// on the scooter right next to him (and he is sitting on his bench)
export function raceOldie() {
  if (G.pstate !== 'riding' || rc.on || rc.back) return null;
  const n = findOldie(); if (!n || n.type !== 'sit' || n.actor.sit < 0.9) return null;
  return n.actor.pos.distanceTo(G.petike.pos) < 2.6 ? n : null;
}

export function startRace(n) {
  const a = G.petike, ro = roller, act = n.actor;
  ensureMoped();
  rc.on = true; rc.phase = 'intro'; rc.t = 0; rc.gsp = 0; rc.half = null; rc.turbo = ''; rc.winner = ''; rc.draftT = 0; rc.lineT = 4; rc.offT = 0; rc.said.clear();
  n.type = 'race';   // npcs.js leaves him alone
  G.pstate = 'race'; ro.speed = 0; ro.scripted = true; setPrompt('');   // scripted: the main loop's rollerRide() must not move the scooter (rideStep does)
  // dad stays on the bench this time (he would never keep up)
  if (['follow', 'standing', 'leaving'].includes(G.petyaMode)) dadReturn();
  // the start line: the loop point nearest to his bench
  let best = 0, bd = 1e9; for (let s = 0; s < LOOP_LEN; s += 0.25) { const p = loopPoint(s); const d = Math.hypot(p.x - act.pos.x, p.z - act.pos.z); if (d < bd) { bd = d; best = s; } }
  rc.s0 = best; rc.gs = best + 1.6; rc.ps = best;
  say(act, pick(['Fiatalember! Szép kis roller… de az én mopedem gyorsabb!', 'Na, kölyök! Egy kör a sétányon?']), 2.6, 'Bácsi');
  runSeq([
    [2.4, () => say(a, 'Ezt meglátjuk!', 1.6)],
    [1.4, () => { say(act, 'Egy kör a sétányon. Aki veszít… az veszít!', 2.4, 'Bácsi'); act.sitTarget = 0; }],
    [1.2, () => { mount(act); rc.phase = 'grid'; }],
    [1.2, () => { if (G.petyaMode === 'return' || G.petyaMode === 'bench' || G.petyaMode === 'seat') say(G.petya, 'Verseny?! Petyus, ÓVATOSAN!!', 2.0); dad.talkT = 20; }],
    [0.8, () => { rc.phase = 'count'; count('3'); }],
    [0.8, () => count('2')],
    [0.8, () => count('1')],
    [0.8, () => { bigText('RAJT!', 0.9); tone('sine', 1320, 1320, 0.3, 0.1); rc.phase = 'run'; rc.t = 0; noise(0.5, 300, 0.5, 0.15); }],
  ]);
  $('mini').style.display = 'block'; hud();
}
function count(n) { bigText(n, 0.6); tone('sine', 880, 880, 0.14, 0.08); }
// the old man gets onto his moped at the start line; Petyus rolls up beside him
function mount(act) {
  const p0 = loopPoint(rc.gs), pp = loopPoint(rc.ps), ro = roller;
  act.sit = 1; act.sitTarget = 1; act.seatH = 0.72; act.riding = false;
  placeMoped(p0, LANE_G);
  ro.pos.set(pp.x - pp.dz * LANE_P, 0, pp.z + pp.dx * LANE_P); ro.heading = Math.atan2(pp.dx, pp.dz); ro.lean = 0; ro.speed = 0;
  ro.group.position.set(ro.pos.x, groundH(ro.pos.x, ro.pos.z), ro.pos.z); ro.group.rotation.set(0, ro.heading, 0, 'YXZ');
  G.petike.pos.copy(ro.pos); G.petike.heading = ro.heading; poseRider(ro);
  tone('sawtooth', 70, 90, 0.6, 0.05);
}
function placeMoped(p, lane, h) {
  const x = p.x - p.dz * lane, z = p.z + p.dx * lane, head = h ?? Math.atan2(p.dx, p.dz);
  rc.moped.position.set(x, groundH(x, z), z); const ry = dampAngle(rc.moped.rotation.y, head, 10, 1 / 30); rc.moped.rotation.y = Math.atan2(Math.sin(ry), Math.cos(ry));
  rc.gpos = new V3(x, 0, z);
  // the old man sits on it, hands on the handlebar
  const act = rc.oldie.actor, fx = Math.sin(rc.moped.rotation.y), fz = Math.cos(rc.moped.rotation.y);
  act.pos.set(x - fx * 0.2, 0, z - fz * 0.2); act.heading = act.targetHeading = rc.moped.rotation.y;
  act.animate(1 / 60, false, 0);
  const r = act.rig; r.sh[0].rotation.x = r.sh[1].rotation.x = -1.2; r.sh[0].rotation.z = -0.15; r.sh[1].rotation.z = 0.15;
  act.sync();
}
const hud = () => {
  const pos = rc.phase === 'run' || rc.phase === 'finish' ? (rc.ps >= rc.gs ? '🥇 Vezetsz!' : '🥈 Második') : '🏁';
  const prog = Math.round(clamp((rc.ps - rc.s0) / LOOP_LEN, 0, 1) * 100);
  $('mini').innerHTML = `🛴 ${prog}% · ${pos}` + (rc.draftT > 0 ? ' · 💨 Szélárnyék!' : '') + (rc.turbo === 'on' ? ' · 🔥 TURBÓ' : '');
};

export function updateRace(dt) {
  const ro = roller, a = G.petike, act = rc.oldie.actor;
  rc.t += dt;
  G.usePressed = false;
  if (rc.phase === 'intro' || rc.phase === 'grid' || rc.phase === 'count') {
    G.kickPressed = G.kickReleased = false;
    ro.speed = 0; poseRider(ro); a.pos.copy(ro.pos); a.heading = ro.heading;
    if (rc.phase !== 'intro') placeMoped(loopPoint(rc.gs), LANE_G);
    else { act.heading = dampAngle(act.heading, Math.atan2(a.pos.x - act.pos.x, a.pos.z - act.pos.z), 4, dt); }
    G.viewSizeTarget = 9;
    return;
  }
  // --- Petyus: the normal scooter, faster in the slipstream
  const gp = loopPoint(rc.gs), gfx = gp.dx, gfz = gp.dz;
  const rx = ro.pos.x - rc.gpos.x, rz = ro.pos.z - rc.gpos.z, behind = -(rx * gfx + rz * gfz), side = Math.abs(rx * -gfz + rz * gfx);
  const drafting = rc.phase === 'run' && behind > 0.4 && behind < 5.0 && side < 0.7 && rc.turbo !== 'on';
  rc.draftT = drafting ? SLING : Math.max(0, rc.draftT - dt);   // the slipstream's push lasts a moment after pulling out: slingshot past him
  if (drafting && !rc.said.has('draft')) { rc.said.add('draft'); say(a, 'Szélárnyék! Hehe…', 1.4); }
  rideStep(dt, rc.draftT > 0 ? DRAFT : 1);
  G.viewSizeTarget = 11;
  if (drafting && Math.random() < 0.3) spawnFx(new V3(rc.gpos.x - gfx * 0.7, 0.4, rc.gpos.z - gfz * 0.7), new V3(-gfx * 2 + R(-0.4, 0.4), R(0.1, 0.5), -gfz * 2 + R(-0.4, 0.4)), 0xdddddd, 0.05, 0.5, 0);
  // bumping into the moped
  const d = Math.hypot(rx, rz);
  if (d < 0.75 && d > 1e-4) { ro.pos.x = rc.gpos.x + rx / d * 0.75; ro.pos.z = rc.gpos.z + rz / d * 0.75; if (ro.speed > 2) { sThunk(6); say(act, pick(['Hé! Vigyázz a fényezésre!', 'Ejnye, kölyök!']), 1.4, 'Bácsi'); } ro.speed *= 0.7; }
  // Petyus' progress along the path (only while he is on it – no shortcuts across the park)
  let bs = rc.ps, bdist = 1e9;
  for (let s = rc.ps - 2; s <= rc.ps + 6; s += 0.2) { const p = loopPoint(s); const dd = Math.hypot(p.x - ro.pos.x, p.z - ro.pos.z); if (dd < bdist) { bdist = dd; bs = s; } }
  if (bdist < 3.2) rc.ps = Math.max(rc.ps, bs);
  else if ((rc.offT -= dt) <= 0) { rc.offT = 4; say(act, 'Hé! A sétányon kell menni!', 1.8, 'Bácsi'); }
  if (rc.phase === 'run') {
    // --- the old man: steady on the straights, slow in the corners, the turbo on the home straight
    const lap = rc.gs - rc.s0;
    let want = SPEED;
    const ls = ((rc.gs % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
    for (const c of CORNERS) { const toC = ((c - ls) + LOOP_LEN) % LOOP_LEN; if (toC < 3.0 || toC > LOOP_LEN - 1.5) want = CORNER_SPEED; }
    if (rc.turbo === 'on') want = TURBO_SPEED;
    if (rc.turbo === 'dead') want = 2.2;
    if (lap < 4) want = Math.min(want, 1.2 + rc.t * 1.6);   // pulling away (the old moped takes its time)
    rc.gsp = damp(rc.gsp, want, rc.turbo === 'on' ? 3 : 2, dt);
    rc.gs += rc.gsp * dt;
    // half distance: who is ahead?
    if (rc.half === null && Math.max(rc.gs, rc.ps) - rc.s0 >= LOOP_LEN / 2) {
      rc.half = rc.ps > rc.gs;
      say(rc.half ? a : act, rc.half ? 'Félúton én vezetek!' : pick(['Hehe! Látod a hátsómat, kölyök?', 'Lassú vagy, mint a csiga!']), 1.8, rc.half ? undefined : 'Bácsi');
    }
    // the turbo, right after the last corner
    if (!rc.turbo && lap >= LOOP_LEN - 16) {
      if (rc.ps > rc.gs) { rc.turbo = 'dead'; say(act, 'TURBÓ! …Na ne! Pont most?!', 2.0, 'Bácsi'); noise(0.6, 200, 0.6, 0.25); tone('sawtooth', 120, 40, 0.8, 0.06); }
      else { rc.turbo = 'on'; say(act, 'Most jön a TURBÓ!!', 1.6, 'Bácsi'); tone('sawtooth', 90, 220, 0.9, 0.07); }
    }
    if (rc.turbo === 'on' && Math.random() < 0.6) spawnFx(new V3(rc.gpos.x - gfx * 0.7, 0.42, rc.gpos.z - gfz * 0.7), new V3(-gfx * 1.5 + R(-0.3, 0.3), R(0.2, 0.7), -gfz * 1.5 + R(-0.3, 0.3)), pick([0xff9f1c, 0xffd166, 0x777777]), 0.07, 0.5, -1);
    if (rc.turbo === 'dead' && Math.random() < 0.3) spawnFx(new V3(rc.gpos.x - gfx * 0.7, 0.42, rc.gpos.z - gfz * 0.7), new V3(R(-0.2, 0.2), R(0.4, 0.9), R(-0.2, 0.2)), 0x444444, 0.08, 0.9, -0.5);
    // the finish line
    const end = rc.s0 + LOOP_LEN;
    if (!rc.winner && (rc.ps >= end || rc.gs >= end)) {
      rc.winner = rc.ps >= end ? 'kid' : 'oldie';
      if (rc.winner === 'oldie') { say(act, 'Az én időmben is így volt!', 2.4, 'Bácsi'); runSeq([[1.6, () => say(a, 'Ez nem ér! Neked turbód van!', 2.0)]]); }
      else { bigText('GYŐZTÉL!', 1.4); say(act, pick(['Ügyes vagy, kölyök. Holnap visszavágó!', 'Na ne… legyőzött egy roller!']), 2.4, 'Bácsi'); }
    }
    if (rc.gs >= end) rc.gs = Math.min(rc.gs, end + 2.5);   // he stops just past the line
    if (rc.winner && rc.ps >= end) finish(true);
    else if (rc.t > TIMEOUT) finish(false);
    // chatter
    if ((rc.lineT -= dt) <= 0 && !rc.winner) {
      rc.lineT = R(4.5, 7);
      if (rc.ps < rc.gs) say(act, pick(['Hehe! Ezt nézd!', 'A mopedem 1974 óta veretlen!', 'Gyerünk, gyerünk, öregem!']), 1.6, 'Bácsi');
      else say(act, pick(['Hé! Nem ér előzni a kanyarban!', 'Na várj csak…', 'Még nincs vége!']), 1.6, 'Bácsi');
    }
  }
  placeMoped(loopPoint(Math.min(rc.gs, rc.s0 + LOOP_LEN + 2.5)), LANE_G);
  rc.hudT -= dt; if (rc.hudT <= 0) { rc.hudT = 0.2; hud(); }
}
function finish(done) {
  rc.on = false; rc.phase = ''; G.pstate = 'riding'; roller.scripted = false; $('mini').style.display = 'none'; G.viewSizeTarget = 10;
  const v = !done ? 0 : rc.winner === 'kid' ? 3 : rc.half ? 2 : 1;
  if (v > 0) runSeq([[1.0, () => award('rollerverseny', v)]]);
  else say(G.petike, 'Elfáradtam… majd legközelebb!', 2.0);
  if (G.petyaMode === 'bench' && v > 0) runSeq([[2.4, () => say(G.petya, v === 3 ? 'Legyőzted a bácsit?! …Ezt ne mondd el anyának.' : 'Na tessék. Megmondtam, hogy a moped gyorsabb.', 2.4)]]);
  // the old man rides back to his bench, parks and sits down
  rc.back = 'ride'; rc.backT = 0;
}
function tickBack(dt) {
  const n = rc.oldie, act = n.actor, p = rc.park;
  if (rc.back === 'ride') {
    const dx = p.x - rc.moped.position.x, dz = p.z - rc.moped.position.z, d = Math.hypot(dx, dz);
    if (d > 0.08) {
      const st = Math.min(d, 1.8 * dt); const nx = rc.moped.position.x + dx / d * st, nz = rc.moped.position.z + dz / d * st;
      rc.moped.position.set(nx, groundH(nx, nz), nz); rc.moped.rotation.y = dampAngle(rc.moped.rotation.y, Math.atan2(dx, dz), 5, dt);
      const fx = Math.sin(rc.moped.rotation.y), fz = Math.cos(rc.moped.rotation.y);
      act.pos.set(nx - fx * 0.2, 0, nz - fz * 0.2); act.heading = rc.moped.rotation.y; act.animate(dt, false, 0);
      act.rig.sh[0].rotation.x = act.rig.sh[1].rotation.x = -1.2; act.sync();
    } else {
      rc.moped.rotation.y = dampAngle(rc.moped.rotation.y, p.h, 6, dt);
      if (Math.abs(rc.moped.rotation.y - p.h) < 0.05 || (rc.backT += dt) > 2) {
        rc.back = 'walk'; act.sitTarget = 0; act.seatH = 0.45;
        const [sx, sz] = seatOf(n.b); const [fx, fz] = L(n.b.x, n.b.z, n.b.rot, -0.45, 0.7);
        act.pos.set(p.x + Math.cos(p.h) * 0.6, 0, p.z - Math.sin(p.h) * 0.6);
        act.walkTo([[fx, fz], [sx, sz]], 0.8); rc.seat = [sx, sz];
      }
    }
  } else if (rc.back === 'walk') {
    act.update(dt);
    if (!act.path) { act.heading = act.targetHeading = n.b.rot; act.sitTarget = 1; rc.back = 'sit'; }
  } else if (rc.back === 'sit') {
    act.update(dt);
    if (act.sit >= 0.99) { n.type = 'sit'; rc.back = ''; act.place(rc.seat[0], rc.seat[1], n.b.rot); }
  }
}
