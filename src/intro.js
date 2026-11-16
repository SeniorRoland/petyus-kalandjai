// Petyus kalandjai – intro: A nyitójelenet (async cutscene) és eszközei.
import { poof } from './actors.js';
import { spawnBall } from './ball.js';
import { isTouch } from './input.js';
import { resetPose } from './rigs.js';
import { scene } from './scene.js';
import { G, ball, rigs, roller } from './state.js';
import { endPrologue, runPrologue } from './prologue.js';
import { say, toast } from './ui.js';
import { $, V3, angDiff, lerp, smooth } from './util.js';
import { FAMILY_BENCH, L, addCircleCol, colliders } from './world.js';

// ---------------------------------------------------------------- cutscene system
export const SKIP = { skip: true };
const waiters = [], tweens = [];
const cs = { skip: false, done: false };
export function W(t) { return new Promise((res, rej) => waiters.push({ t, res, rej })); }
export function until(fn) { return new Promise((res, rej) => waiters.push({ fn, res, rej })); }
export function tween(dur, fn) { return new Promise((res, rej) => tweens.push({ t: 0, dur, fn, res, rej })); }
export function tickCutscene(dt) {
  for (let i = waiters.length - 1; i >= 0; i--) {
    const w = waiters[i];
    if (cs.skip) { waiters.splice(i, 1); w.rej(SKIP); continue; }
    if (w.fn ? w.fn() : (w.t -= dt) <= 0) { waiters.splice(i, 1); w.res(); }
  }
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (cs.skip) { tweens.splice(i, 1); tw.rej(SKIP); continue; }
    tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
export function skipIntro() { if (G.mode === 'intro' && !cs.done) { cs.skip = true; } }
export function offsetPath(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    return [p[0] - dz * d, p[1] + dx * d];
  });
}
export const SEAT = { angi: L(FAMILY_BENCH.x, FAMILY_BENCH.z, 0, -0.45, -0.05), petya: L(FAMILY_BENCH.x, FAMILY_BENCH.z, 0, 0.45, -0.05) };
const LEAN = { x: 34.55, z: -12.55, heading: Math.PI, lean: -0.24 };
const PLAY_START = [31, -6.6];
// where the family walk of the intro starts (the prologue ends exactly here)
export const INTRO_ROUTE = [[-4, -6], [18, -6], [22.5, -11], [33, -11]];
export const ROLLER_START = [-8.6, -6];

export function mountRider() {
  roller.rider = G.petike; G.petike.riding = true;
  scene.remove(G.petike.rig.root); roller.group.add(G.petike.rig.root); G.petike.rig.root.rotation.set(0, 0, 0);
}
export function dismount(x, z) {
  if (!roller.rider) return;
  const r = G.petike.rig; roller.group.remove(r.root); scene.add(r.root); resetPose(r);
  roller.rider = null; G.petike.riding = false; G.petike.place(x, z, roller.heading);
}

async function introDialog() {
  try {
    await W(1.0); say(G.petya, 'Milyen szép idő van ma a parkban!', 3);
    await W(3.4); say(G.angi, 'Petyus, ne rollerezz olyan gyorsan!', 3);
    await W(3.3); say(G.petike, 'Jó, anya! De siessünk, focizni akarok!', 3.2);
    await W(5.0); say(G.petya, 'Nézd, ott van már a focipálya!', 3);
    await W(4.6); say(G.angi, 'Ott egy pad, leülünk mellé.', 2.8);
  } catch (e) { /* skipped */ }
}
export async function runIntro() {
  G.mode = 'intro'; $('skipBtn').style.display = 'block';
  toast('Nyomj <b>Entert</b> vagy a <b>Kihagyás</b> gombot a jelenet átugrásához', 4);
  // the cinematic prologue first: Petyus races from home to the park, dad calls him back behind them
  try { await runPrologue(); } catch (e) { if (e !== SKIP) console.error(e); return finishIntro(); }
  const route = INTRO_ROUTE;
  const pR = offsetPath(route, 0.42), aR = offsetPath(route, -0.42);
  G.petya.place(pR[0][0], pR[0][1], Math.PI / 2); G.angi.place(aR[0][0], aR[0][1], Math.PI / 2);
  G.petya.walkTo(pR.slice(1), 1.55); G.angi.walkTo(aR.slice(1), 1.55);
  roller.base = new V3(ROLLER_START[0], 0, ROLLER_START[1]); roller.pos.copy(roller.base); roller.dir = new V3(1, 0, 0); roller.heading = Math.PI / 2; roller.t = 0;
  roller.path = [...route.slice(1), [35.4, -11.1]].map((p) => new V3(p[0], 0, p[1])); roller.speed = 1.55;
  mountRider();
  introDialog();
  try {
    await until(() => !G.petya.path && !G.angi.path);
    G.angi.walkTo([[SEAT.angi[0], -11.85]], 1.1); G.petya.walkTo([[SEAT.petya[0], -11.85]], 1.1);
    await until(() => !G.petya.path && !G.angi.path);
    G.angi.targetHeading = 0; G.petya.targetHeading = 0; await W(0.6);
    G.angi.walkTo([SEAT.angi], 0.7, true); G.petya.walkTo([SEAT.petya], 0.7, true);
    await until(() => !G.petya.path && !G.angi.path);
    G.angi.sitTarget = 1; G.petya.sitTarget = 1;
    await W(0.8); say(G.angi, 'Végre egy kis pihenő!', 2.4);
    await until(() => !roller.path);
    await W(0.4);
    // Petyus steps off and leans the roller against the bench
    dismount(35.4, -11.65);
    say(G.petike, 'Leteszem a rollert a padhoz!', 2.6);
    G.petike.walkTo([[35.75, -11.75]], 0.8);
    const r0 = { x: roller.pos.x, z: roller.pos.z, h: roller.heading };
    await tween(1.3, (k) => {
      const s = smooth(k);
      roller.pos.set(lerp(r0.x, LEAN.x, s), 0, lerp(r0.z, LEAN.z, s));
      roller.heading = r0.h + angDiff(r0.h, LEAN.heading) * s; roller.lean = LEAN.lean * s;
      roller.group.position.set(roller.pos.x, 0.03 * s, roller.pos.z); roller.group.rotation.set(0, roller.heading, roller.lean, 'YXZ');
    });
    G.petike.targetHeading = 0.5; await W(0.7);
    say(G.petike, 'Most átöltözöm focistának!', 2.2); await W(1.4);
    poof(G.petike.pos); await W(0.3);
    G.petike.setRig(rigs.foci); G.petike.stride = 6.5; G.petike.swing = 0.7;
    await W(1.0);
    say(G.petya, 'Nahát, igazi focista lett belőled!', 2.6); G.petya.cheer = 0.8;
    await W(1.6);
    G.petike.walkTo([[33.2, -11.1], [30, -10.6], [30, -8.4], PLAY_START], 2.2);
    await until(() => !G.petike.path);
    G.petike.targetHeading = Math.PI / 2 + 0.3; await W(0.4);
    say(G.petike, 'Hol is a labdám?… Megvan!', 2.2);
    await W(0.6);
    const f = new V3(Math.sin(G.petike.heading), 0, Math.cos(G.petike.heading));
    spawnBall(G.petike.pos.x + f.x * 0.35, 1.0, G.petike.pos.z + f.z * 0.35, f.x * 0.9, 2.4, f.z * 0.9);
    await W(1.4);
  } catch (e) { if (e !== SKIP) console.error(e); }
  finishIntro();
}
function finishIntro() {
  cs.done = true; waiters.length = 0; tweens.length = 0;
  endPrologue();   // film look off, borrowed pedestrians back to walking (also when skipped mid-prologue)
  // final, deterministic state (also used when skipping)
  G.petya.path = G.angi.path = null; G.petya.place(SEAT.petya[0], SEAT.petya[1], 0); G.angi.place(SEAT.angi[0], SEAT.angi[1], 0);
  G.petya.sit = G.petya.sitTarget = 1; G.angi.sit = G.angi.sitTarget = 1;
  if (roller.rider) dismount(PLAY_START[0], PLAY_START[1]);
  roller.path = null; roller.pos.set(LEAN.x, 0, LEAN.z); roller.heading = LEAN.heading; roller.lean = LEAN.lean;
  roller.group.position.set(LEAN.x, 0.03, LEAN.z); roller.group.rotation.set(0, LEAN.heading, LEAN.lean, 'YXZ');
  addCircleCol(LEAN.x, LEAN.z, 0.3, 1.0); G.rollerCol = colliders[colliders.length - 1]; roller.speed = 0;
  if (G.petike.rig !== rigs.foci) { G.petike.setRig(rigs.foci); G.petike.stride = 6.5; G.petike.swing = 0.7; }
  if (cs.skip) { G.petike.path = null; G.petike.place(PLAY_START[0], PLAY_START[1], Math.PI / 2 + 0.3); }
  G.petike.path = null; G.petike.solid = false;
  if (!ball.active) { const f = new V3(Math.sin(G.petike.heading), 0, Math.cos(G.petike.heading)); spawnBall(G.petike.pos.x + f.x * 0.9, 0.6, G.petike.pos.z + f.z * 0.9); }
  G.mode = 'play'; G.viewSizeTarget = 8.5;
  $('skipBtn').style.display = 'none'; $('hud').style.display = 'block'; $('help').style.display = 'block';
  if (isTouch) { $('touch').style.display = 'block'; $('help').style.display = 'none'; }
  toast('<b>Irányítsd Petyust!</b> Rúgj gólt a kapukba ⚽', 4.5);
}

