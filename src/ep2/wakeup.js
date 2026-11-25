// Petyus kalandjai – 2. rész: filmes nyitány (új játék elején). Felirat: Tököl + a nap dátuma. Sötét hálószoba, apa hatalmasat
// horkol; 6:00-kor megszólal az ébresztőóra, apa felriad: „Megadom magam!”, anya leszidja, és Petyus felébresztésére küldi.
// Apa beoson Petyus szobájába, óvatosan ébresztgeti – hiába; végül egy lufit fúj fel és kidurrantja Petyus feje mellett.
// Enter / Kihagyás: azonnal a végállapot (finish). Utána indul az otthoni reggel.
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { noise, sSnore, sSting, soundAt, tone } from '../audio.js';
import { atHeight, cine, cineEnd, cineFocus, cineStart, shake } from '../cine.js';
import { camTarget, scene, sun } from '../scene.js';
import { EPISODES, G, SERIES, rigs } from '../state.js';
import { bigText, say } from '../ui.js';
import { $, R, V3, dampAngle, pick } from '../util.js';
import { FY, doors, homeRoot, toggleDoor } from './home.js';
import { getUp, layDown, makeBed, makeBlanket, removeBed, updateBed } from './sleep.js';

const SKIP = { skip: true };
export const wk = { occ: new V3(), on: false, skip: false, waits: [], beds: [], focus: new V3(12.6, 0, 5.4), snoreT: 0, snoring: false, alarm: 0, clock: null, balloon: null, saved: null, done: null, tasks: [] };

// ---------- a tiny timeline (like intro.js, but for part 2): W(seconds), until(fn); a skip rejects every wait
const W = (t) => new Promise((res, rej) => wk.waits.push({ t, res, rej }));
const until = (fn) => new Promise((res, rej) => wk.waits.push({ fn, res, rej }));
function tickWaits(dt) {
  for (let i = wk.waits.length - 1; i >= 0; i--) {
    const w = wk.waits[i];
    if (wk.skip) { wk.waits.splice(i, 1); w.rej(SKIP); continue; }
    if (w.fn ? w.fn(dt) : (w.t -= dt) <= 0) { wk.waits.splice(i, 1); w.res(); }
  }
}
async function titleCard(big, small, dur) {
  const el = $('filmTitle'); el.querySelector('.big').textContent = big; el.querySelector('.small').textContent = small;
  el.classList.add('show'); await W(dur); el.classList.remove('show');
}
async function dip(fn) { $('filmDip').classList.add('on'); await W(0.35); fn(); const f = cine.focus && cine.focus(); if (f) { camTarget.x = f.x; camTarget.z = f.z; } await W(0.1); $('filmDip').classList.remove('on'); }
// the camera aims at a point this high above the floor (not the floor itself), so heads and bubbles stay inside the letterbox
// (wk.focus: the subject itself – the walls between it and the camera go see-through)
const at = (x, z, h = 1.0, ox = x, oz = z) => () => { wk.focus.set(x, 0, z); wk.occ.set(ox, FY, oz); return atHeight(x, h, z); };   // (ox, oz: what must not be hidden)
const focusOn = (a, dx = 0, dz = 0, h = 1.3) => () => { wk.focus.set(a.pos.x + dx, 0, a.pos.z + dz); wk.occ.set(a.pos.x + dx, FY, a.pos.z + dz); return atHeight(a.pos.x + dx, h, a.pos.z + dz); };

// ---------- night: dark, a little blue moonlight
function night(on) {
  const hemi = []; scene.traverse((o) => { if (o.isHemisphereLight) hemi.push(o); });
  if (on) {
    wk.saved = { bg: scene.background.getHex(), sun: sun.intensity, sunC: sun.color.getHex(), hemi: hemi.map((h) => [h, h.intensity, h.color.getHex()]) };
    scene.background.set(0x0a0f1e); sun.intensity = 0.12; sun.color.set(0x8fa6ff);
    for (const h of hemi) { h.intensity = 0.32; h.color.set(0x5a6a9a); }
  } else if (wk.saved) {
    scene.background.set(wk.saved.bg); sun.intensity = wk.saved.sun; sun.color.set(wk.saved.sunC);
    for (const [h, i, c] of wk.saved.hemi) { h.intensity = i; h.color.set(c); }
    wk.saved = null;
  }
}
// dawn: halfway between the night and the morning (when dad goes to wake Petyus)
function dawn() { if (!wk.saved) return; sun.intensity = wk.saved.sun * 0.35; for (const [h, i] of wk.saved.hemi) h.intensity = i * 0.5; scene.background.set(0x5d6f96); }

// ---------- the alarm clock on dad's bedside table: a red 6:00 that blinks while it rings
function buildClock() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = '#120808'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff2a2a'; c.font = 'bold 46px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('6:00', 64, 34);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(); g.position.set(13.86, 0.5, 4.64);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.07), new THREE.MeshLambertMaterial({ color: 0x2b2d33 })); body.position.y = 0.045; g.add(body);
  for (const x of [-0.05, 0.05]) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xc9a227 })); bell.position.set(x, 0.09, 0); g.add(bell); }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.065), new THREE.MeshBasicMaterial({ map: tex })); face.position.set(0, 0.045, 0.036); g.add(face);
  const glow = new THREE.PointLight(0xff3030, 0, 1.6); glow.position.set(0, 0.06, 0.12); g.add(glow);
  homeRoot.add(g); wk.clock = { g, face, glow };
}
function ringTick(dt) {
  if (!wk.clock) return;
  if (wk.alarm <= 0) { wk.clock.face.visible = true; wk.clock.glow.intensity = 0.4; wk.clock.g.rotation.z = 0; return; }
  wk.alarm += dt;
  const on = Math.floor(wk.alarm * 4) % 2 === 0;
  wk.clock.face.visible = on; wk.clock.glow.intensity = on ? 1.2 : 0.2; wk.clock.g.rotation.z = Math.sin(wk.alarm * 60) * 0.06;   // it rattles
  if (Math.floor(wk.alarm * 8) !== Math.floor((wk.alarm - dt) * 8)) soundAt(13.86, 4.64, () => { tone('square', 2350, 2350, 0.08, 0.16); tone('square', 1760, 1760, 0.08, 0.1); }, 2.2);
}

// ---------- the balloon in dad's hand
function balloonTick() {
  const b = wk.balloon; if (!b) return;
  const hb = G.petya.rig.handBones && G.petya.rig.handBones[b.hand || 0], p = new V3();
  if (hb) { G.petya.rig.root.updateMatrixWorld(true); hb.getWorldPosition(p); } else p.set(G.petya.pos.x, FY + 1, G.petya.pos.z);
  b.mesh.position.set(p.x, p.y + 0.06 + b.size * 0.9, p.z); b.mesh.scale.set(b.size, b.size * 1.18, b.size);
  b.knot.position.set(p.x, p.y + 0.03, p.z);
}

// ---------- start (a new game only)
export function startWakeup(done) {
  wk.on = true; wk.skip = false; wk.done = done; G.mode = 'intro'; G.occludeAt = wk.occ;   // tall things in front of the subject fade (occlude.js)
  G.skipHook = () => { wk.skip = true; };
  $('skipBtn').style.display = 'block';
  document.body.classList.add('film');
  night(true); buildClock();
  // the beds: mum and dad in theirs (bed_double 12.6 / 5.4, head to the north), Petyus in his (bed_single 12.22 / 1.95)
  const pb = makeBed({ x: 12.6, z: 4.42, rotY: -Math.PI / 2, len: 2.04, width: 1.62, top: 0.46 });
  wk.dad = layDown(pb, G.petya.rig, -0.4); wk.mom = layDown(pb, G.angi.rig, 0.38); wk.mom.rollTo = wk.mom.roll = 1.2;
  makeBlanket(pb, 0xd8c3a5, 0xf4ece0);
  const kb = makeBed({ x: 12.22, z: 0.93, rotY: -Math.PI / 2, len: 2.0, width: 0.94, top: 0.44 });
  wk.kid = layDown(kb, G.petike.rig, 0); wk.kid.rollTo = wk.kid.roll = -1.1;
  makeBlanket(kb, 0x3a86ff, 0xffbe0b);
  wk.beds = [pb, kb]; wk.pb = pb; wk.kb = kb;
  wk.focus.set(12.6, 0, 5.4);
  run().catch((e) => { if (e !== SKIP) console.error(e); finish(); });
}

async function run() {
  const P = G.petya, A = G.angi, K = G.petike;
  cineStart(at(12.9, 5.2), 3.6); { const f = cine.focus(); camTarget.x = f.x; camTarget.z = f.z; }
  // 1. dark bedroom, dad snores; the title
  wk.snoring = true; wk.snoreT = 0.6;
  sSting(true);
  await titleCard('Tököl', datePart(), 3.6);
  await W(2.6);
  // 2. 6:00 – the alarm clock goes off, very loud
  cineFocus(at(13.4, 4.9, 0.9), 2.6);
  wk.alarm = 0.001; shake(0.12);
  say({ headWorld: (v) => v.set(13.86, FY + 0.85, 4.64) }, 'BÍP-BÍP-BÍP-BÍP!!', 1.6, '');
  await W(1.3);
  // 3. dad starts up: sitting bolt upright, hands up
  wk.snoring = false; wk.dad.sitSpd = 10; wk.dad.sitTo = 1; wk.dad.rollTo = 0;
  wk.dad.arms = (r) => { r.sh[0].rotation.set(-2.9, 0, 0.35); r.sh[1].rotation.set(-2.9, 0, -0.35); };
  shake(0.2); cineFocus(at(13.0, 5.0, 1.2), 2.8);
  say(P, 'MEGADOM MAGAM! MEGADOM MAGAM!!', 2.6);
  await W(1.6);
  // 4. mum wakes up too, slaps the alarm off and tells him off
  wk.mom.rollTo = 0; wk.mom.sitSpd = 4; wk.mom.sitTo = 1;
  await W(0.7);
  wk.alarm = 0; wk.mom.arms = (r) => { r.sh[0].rotation.set(-1.4, 0, 0); };
  tone('square', 300, 200, 0.06, 0.1); await W(0.4); wk.mom.arms = null;
  say(A, 'Petya! Mit kiabálsz itt hajnalban?!', 2.4);
  await W(1.2); wk.dad.arms = null;
  await W(1.3);
  say(A, 'Ha már fent vagy, menj, ébreszd fel Petyust!', 2.6);
  await W(2.8);
  say(P, 'Jó, jó… megyek már…', 2.0);
  await W(2.0);
  // 5. dad gets up and tiptoes to Petyus's room (mum turns over and sleeps on)
  await dip(() => {
    getUp(wk.pb, wk.dad, scene); P.place(13.72, 5.3, Math.PI); P.pos.y = FY; P.sit = P.sitTarget = 0; P.sync();
    wk.mom.sitTo = 0; wk.mom.rollTo = 1.2;
    dawn();
    for (const d of doors) if (d.pivot && !d.open && ((Math.abs(d.x - 11.66) < 0.3 && Math.abs(d.z - 3.5) < 0.6) || (Math.abs(d.x - 9.85) < 0.6 && Math.abs(d.z - 4.26) < 0.3))) toggleDoor(d);
    cineFocus(focusOn(P), 3.4);
  });
  P.walkTo([[13.72, 6.85], [10.6, 6.6], [9.85, 4.9], [9.85, 3.7]], 1.0);
  say(P, 'Pszt…', 1.2);
  await until(() => !P.path || P.pos.z < 4.6);
  await dip(() => { P.path = null; P.place(11.0, 3.5, Math.PI / 2); P.pos.y = FY; P.sync(); cineFocus(focusOn(P, 0.3, 0), 3.2); });
  P.walkTo([[12.1, 3.45], [12.95, 2.3], [12.95, 1.45]], 0.85);
  await until(() => !P.path);
  // 6. gently: it does not work
  wk.lean = 0.35; cineFocus(at(12.6, 1.5, 1.1, 12.3, 1.95), 2.8);   // the wardrobe in front of the bed fades
  say(P, 'Petyus… kisfiam… ébresztő…', 2.4);
  await W(1.4); wk.kid.rollTo = -0.6; await W(0.6); wk.kid.rollTo = -1.1;
  await W(0.8);
  say(K, 'Mmmm… még öt percet…', 2.2);
  await W(2.4);
  say(P, 'Petyus, hat óra van. Iskola…', 2.2);
  await W(1.2); wk.kid.rollTo = 1.25;   // turns away
  await W(1.2);
  say(K, 'Hrrr… zzz…', 1.6);
  await W(1.8);
  // 7. the balloon
  wk.lean = 0;
  say(P, 'Na jó. Akkor másképp.', 2.0);
  await W(1.4);
  makeBalloon();
  wk.armUp = 0.7;
  for (let i = 0; i < 3; i++) { soundAt(P.pos.x, P.pos.z, () => noise(0.45, 500, 0.6, 0.12), 1.2); say({ headWorld: (v) => P.headWorld(v) }, 'pfff…', 0.6, ''); await W(0.6); wk.balloon.size = 0.07 + (i + 1) * 0.055; }
  await W(0.6);
  say(P, 'Hehe…', 1.2);
  wk.lean = 0.6; wk.armUp = 1.15; wk.balloon.hand = 1;   // leaning over the bed: the balloon right by Petyus's head
  await W(1.4);
  // 8. PUKK!
  pop();
  wk.kid.rollTo = 0; wk.kid.sitSpd = 12; wk.kid.sitTo = 1;
  wk.kid.arms = (r) => { r.sh[0].rotation.set(-2.6, 0, 0.5); r.sh[1].rotation.set(-2.6, 0, -0.5); };
  say(K, 'ÁÁÁÁ!! MI VOLT EZ?!', 2.0);
  await W(1.0); wk.lean = 0; wk.armUp = 0;
  await W(1.2); wk.kid.arms = null;
  say(P, 'Jó reggelt, bajnok! Hat óra van!', 2.4);
  await W(2.6);
  say(K, 'Apaaa… ez nem volt vicces…', 2.2);
  await W(2.2);
  // 9. the title, then the morning
  await dip(() => {});
  $('filmDip').classList.add('on');
  sSting(); await titleCard(SERIES, `${EPISODES[1].n}. rész · ${EPISODES[1].month}`, 3.0);
  finish();
}
const datePart = () => { const t = $('e2Date') ? $('e2Date').textContent : ''; return t.replace(/,\s*/, ' · '); };

function makeBalloon() {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshLambertMaterial({ color: 0xe63946 }));
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 6), new THREE.MeshLambertMaterial({ color: 0xb02030 }));
  scene.add(mesh, knot); wk.balloon = { mesh, knot, size: 0.06, hand: 0 };
}
function pop() {
  const b = wk.balloon; if (!b) return;
  const p = b.mesh.position.clone();
  scene.remove(b.mesh, b.knot); wk.balloon = null;
  for (let i = 0; i < 18; i++) spawnFx(p.clone(), new V3(R(-2, 2), R(0.5, 2.5), R(-2, 2)), pick([0xe63946, 0xb02030]), 0.035, 0.7, 9.8);
  noise(0.3, 1800, 0.4, 0.9); noise(0.15, 300, 0.8, 0.6); tone('square', 160, 60, 0.15, 0.2);
  bigText('PUKK!!', 1.2); shake(0.3);
}

// every frame while the film runs (stepEp2)
export function wakeTick(dt) {
  if (!wk.on) return;
  tickWaits(dt);
  if (!wk.on) return;
  for (const b of wk.beds) updateBed(b, dt);
  ringTick(dt);
  // dad's snoring in the dark
  if (wk.snoring && (wk.snoreT -= dt) <= 0) {
    const big = Math.random() < 0.4; wk.snoreT = big ? 3.6 : 3.1;
    soundAt(13.0, 5.0, () => sSnore(big), big ? 2.6 : 2.0);
    say(G.petya, big ? pick(['HRRRRRK!!', 'HORRRRRK!', 'HRRR-PFFFF!!']) : pick(['Hrrrr… pfff…', 'Hrrrrrr… pszhhh…']), 1.6);
  }
  // dad walking / leaning over Petyus's bed, the hand with the balloon
  const P = G.petya;
  if (P.rig.root.parent === scene) {
    P.update(dt);
    if (!P.path) {
      const kidHead = { x: 12.22, z: 1.25 };
      P.heading = dampAngle(P.heading, Math.atan2(kidHead.x - P.pos.x, kidHead.z - P.pos.z), 6, dt);
      P.animate(dt, false, 0);
      if (wk.lean) P.bow(wk.lean);
      if (wk.armUp) { P.rig.sh[1].rotation.x = -wk.armUp; P.rig.sh[0].rotation.x = -wk.armUp * 0.5; }
      P.sync();
    }
  }
  balloonTick();
}

// the end state (also when skipped): everyone up, the light back, the film look off – then the game's own start (wk.done)
export function finish() {
  if (!wk.on) return; wk.on = false;
  for (const w of wk.waits) w.rej(SKIP); wk.waits.length = 0;
  for (const b of wk.beds) { for (const s of [...b.sleepers]) getUp(b, s, scene); removeBed(b); }
  wk.beds = [];
  if (wk.balloon) { scene.remove(wk.balloon.mesh, wk.balloon.knot); wk.balloon = null; }
  wk.alarm = 0; wk.snoring = false; ringTick(0);
  if (wk.clock) wk.clock.glow.intensity = 0.4;
  night(false);
  document.body.classList.remove('film'); $('filmTitle').classList.remove('show'); $('filmDip').classList.remove('on'); $('big').classList.remove('show');
  if (cine.on) cineEnd(8);
  $('skipBtn').style.display = 'none'; G.skipHook = null; G.occludeAt = null;
  for (const a of [G.petya, G.angi, G.petike]) { a.path = null; a.rig.inner.rotation.set(0, 0, 0); a.rig.inner.position.set(0, 0, 0); }
  G.mode = 'play';
  if (wk.done) wk.done();
}
export const wakeupFocus = () => wk.focus;
