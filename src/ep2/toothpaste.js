// Petyus kalandjai – 2. rész, esti csibészség: „A fogkrémcsere” (r2-fogkrem).
// In the bathroom, by the basin: on one side Angi's cabinet (it opens: her creams – the heel cream looks just like the
// toothpaste, the face mask is a pink jar), on the other a shelf with four toothbrush cups and the toothpaste. In the fridge:
// a chili cream. Petyus swaps the toothpaste for something else (inventory.js: the 'paste' place). In the evening mum brushes
// her teeth at 20:45, dad at 21:30 – each uses what lies in the toothpaste's place:
//   mum + heel cream → she gags, runs round the kitchen, drinks from the kitchen tap (twice), blames dad        (a victim)
//   dad + chili cream → his face goes red, steam from his ears, he runs to the kitchen tap, curses Petyus      (a victim)
//   the face mask → noticed at once: Petyus gets a scolding (★★★ lost) · mum + chili: noticed, back into the fridge
//   dad + heel cream: „lábszagú…” – nothing more · no toothpaste at all: „Hol a fogkrém?!”
// ★ one victim · ★★ both in one evening · ★★★ and nobody caught Petyus (not seen at the shelf, no scolding).
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { noise, soundAt, tone } from '../audio.js';
import { award } from '../mischief.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { V3, clamp, damp, lerp, pick } from '../util.js';
import { devices, fx } from './appliances.js';
import { FY, SPOTS, doors, homeRoot, switches, toggleDoor, toggleSwitch } from './home.js';
import { brushCup, cosmeticBottle, perfume, smallJar } from './food.js';
import { carrying, itemPlace, lockItem, moveItem } from './inventory.js';
import { findPath } from './navgrid.js';
import { mergeStatic } from '../world.js';
import { PAJAMAS } from './pajama.js';

const T_MOM = 20 * 60 + 45, T_DAD = 21 * 60 + 30;   // when they brush their teeth (ep2.min)
const SINK = { x: 2.85, z: 1.05, h: Math.PI / 2 };   // in front of the basin (it is on the bathroom's east wall)
const TAP = { x: 8.6, z: 0.95, h: Math.PI };         // in front of the kitchen sink
const LAP = [[7.0, 3.1], [8.8, 3.25], [8.85, 1.35], [6.85, 1.45]];   // round the kitchen (between the fridge and the table)

export const tp = { cur: null, st: '', t: 0, momDone: false, dadDone: false, victims: 0, caught: false, seenT: 0, lineT: 0, legs: [], drinks: 0, red: 0, lit: false, what: null };
export const brushBusy = (who) => tp.cur === who;

// ---------------------------------------------------------------- the bathroom wall: Angi's cabinet, the shelf (built before the inventory)
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
export const bath = { cabinet: null, shelf: null, cabinetOpen: () => false };
export function buildBath() {
  // both hang on the east wall (x 3.6): the group's local +z points into the room (west), local +x along the wall (south)
  const W = -Math.PI / 2, WOOD = 0xf3f1ec, EDGE = 0xd8d4cc;
  // Angi's cabinet: 0.4 × 0.5 m, 14 cm deep, a shelf inside, the door hinged on its north edge
  const cab = new THREE.Group(); cab.position.set(3.6, 1.12, 0.42); cab.rotation.y = W; homeRoot.add(cab);
  cab.add(box(0.4, 0.5, 0.01, EDGE, 0, 0.25, 0.005), box(0.012, 0.5, 0.14, WOOD, -0.194, 0.25, 0.07), box(0.012, 0.5, 0.14, WOOD, 0.194, 0.25, 0.07),
    box(0.4, 0.012, 0.14, WOOD, 0, 0.006, 0.07), box(0.4, 0.012, 0.14, WOOD, 0, 0.494, 0.07), box(0.376, 0.01, 0.13, WOOD, 0, 0.25, 0.07));
  // her things (not to be picked up): bottles, jars, a perfume, cotton pads
  const put = (o, x, y, z) => { o.position.set(x, y, z); cab.add(o); };
  put(cosmeticBottle(0xc9e4f0, 0.12, 0.017), -0.15, 0.012, 0.06); put(cosmeticBottle(0xf2d0a4, 0.1, 0.015), -0.1, 0.012, 0.08); put(smallJar(0xffffff, 0x9b5de5), -0.03, 0.012, 0.07);
  put(perfume(), -0.13, 0.255, 0.07); put(smallJar(0xfde2e4, 0xc0c0c0), 0.02, 0.255, 0.06); put(cosmeticBottle(0x90be6d, 0.09, 0.014), 0.165, 0.255, 0.05);
  put(box(0.06, 0.03, 0.06, 0xfafafa, 0, 0, 0), 0.16, 0.027, 0.06);
  const pv = new THREE.Group(); pv.position.set(-0.2, 0, 0.14); cab.add(pv);
  pv.add(box(0.4, 0.5, 0.016, WOOD, 0.2, 0.25, 0.008), box(0.016, 0.07, 0.02, 0xb8c0c8, 0.37, 0.25, 0.026));   // the door, its handle (south edge)
  bath.cabinet = cab;
  const st = { open: false, t: 0 };
  bath.cabinetOpen = () => st.open && st.t > 0.6;
  devices.push({ aim: new V3(3.5, 1.37, 0.42), size: 0.25, x: 3.2, z: 0.42, r: 0.5, label: () => (st.open ? 'E – anya szekrényének becsukása' : 'E – anya szekrényének kinyitása'),
    use: () => { st.open = !st.open; tone('sine', st.open ? 520 : 380, st.open ? 420 : 300, 0.08, 0.05); if (!st.open) noise(0.06, 900, 1, 0.1); },
    update: (dt) => { st.t = damp(st.t, st.open ? 1 : 0, 7, dt); pv.rotation.y = -st.t * 1.8; } });
  // the shelf: a board on two brackets, four cups with brushes (dad blue, mum pink, Petyus green, the sister purple) and the toothpaste
  const sh = new THREE.Group(); sh.position.set(3.6, 1.15, 1.68); sh.rotation.y = W; homeRoot.add(sh);
  sh.add(box(0.42, 0.02, 0.13, WOOD, 0, 0.01, 0.065), box(0.015, 0.08, 0.1, EDGE, -0.17, -0.04, 0.05), box(0.015, 0.08, 0.1, EDGE, 0.17, -0.04, 0.05));
  [[0x3a86ff, 0x1d5fbf], [0xf4a6c6, 0xd6336c], [0x8ac926, 0x2d6a4f], [0xc77dff, 0x7b2cbf]].forEach(([c, b], i) => { const o = brushCup(c, b); o.position.set(-0.165 + i * 0.075, 0.02, 0.06); sh.add(o); });
  bath.shelf = sh;
  // Petyus brushes his teeth too (E at the basin): with whatever lies in the toothpaste's place
  const kid = { on: false, t: 0, what: null, x: 0, z: 0 };
  devices.push({ aim: new V3(3.3, 1.0, 1.05), size: 0.3, x: SINK.x, z: SINK.z, r: 0.55,
    label: () => (kid.on ? 'E – fogmosás abbahagyása' : tp.cur ? 'Foglalt a mosdó' : 'E – fogmosás'),
    use: () => {
      if (tp.cur) return;
      if (kid.on) { kid.on = false; return; }
      kid.what = ['toothpaste', 'heelcream', 'facemask', 'chili'].find((id) => itemPlace(id) === 'paste') || null;
      if (!kid.what) { say(G.petike, 'Hol a fogkrém?', 1.6); return; }
      if (kid.what === 'facemask') { say(G.petike, 'Ez anya arcmaszkja… ezzel nem mosok fogat.', 2.2); return; }
      kid.on = true; kid.t = 0; kid.x = G.petike.pos.x; kid.z = G.petike.pos.z;
      G.petike.targetHeading = SINK.h; G.petike.heading = SINK.h;
      say(G.petike, kid.what === 'toothpaste' ? pick(['Fogmosás… három percig, ahogy anya mondja.', 'Mentás!']) : 'Na, lássuk…', 1.8);
    },
    update: (dt) => {
      if (!kid.on) return;
      const P = G.petike;
      if (Math.hypot(P.pos.x - kid.x, P.pos.z - kid.z) > 0.15) { kid.on = false; return; }   // he walked away: stops
      kid.t += dt; brushPose(P, Math.min(1, kid.t * 3));
      if (Math.random() < dt * 4) soundAt(P.pos.x, P.pos.z, () => noise(0.12, 3500, 1.5, 0.04));
      if (kid.what === 'chili' && kid.t > 2.5 && kid.t - dt <= 2.5) say(P, 'ÁÁÁ! Ez CSÍP!! Vizet!!', 2);
      if (kid.what === 'heelcream' && kid.t > 2.5 && kid.t - dt <= 2.5) say(P, 'Fúúúj! Ez sarokkrém!', 2);
      if (kid.what !== 'toothpaste' && kid.t > 3) { kid.on = false; soundAt(P.pos.x, P.pos.z, () => noise(0.25, 900, 0.8, 0.12)); return; }
      if (kid.t > 1.2 && kid.t - dt <= 1.2) say(head(P), '♪ hmm-hmm ♪', 1.4);
      if (kid.t > 6) { kid.on = false; soundAt(P.pos.x, P.pos.z, () => noise(0.25, 900, 0.8, 0.12)); say(P, pick(['Kész! Ragyog!', 'Tiszta fogak!']), 1.6); }
    } });
  // (performance: the fixed parts – the cabinet's body and its things, the shelf with the cups – one draw call each, no shadows)
  for (const g of [cab, sh]) g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  mergeStatic(cab, new Set([pv])); mergeStatic(sh);
}

// ---------------------------------------------------------------- helpers
const passDoors = () => new Set(doors.filter((d) => d.pivot && d.kind !== 'locked').map((d) => d.col));
function go(a, x, z, speed) { const p = findPath(a.pos.x, a.pos.z, x, z, passDoors()); a.walkTo(p && p.length ? p : [[x, z]], speed); }
const head = (a) => ({ headWorld: (o) => a.headWorld(o) });
const bathSwitch = () => switches.find((s) => s.room === 'furdo');
function sees(a, p, far, cone) {
  const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz); if (d > far) return false;
  let da = Math.atan2(dx, dz) - a.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
  return Math.abs(da) < cone;
}
// the face (skin-coloured vertices above the neck) turned red: k 0 … 1 (dad and the chili)
const faces = new Map();
function redFace(a, who, k) {
  let list = faces.get(a);
  if (!list) {
    list = []; const neck = PAJAMAS[who].neck;
    a.rig.root.traverse((o) => {
      if (!o.isMesh || !o.geometry.attributes.color) return;
      const pos = o.geometry.attributes.position, col = o.geometry.attributes.color, idx = [];
      for (let i = 0; i < pos.count; i++) {
        const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
        if (pos.getY(i) > neck && r > 0.5 && r > g + 0.06 && g > b) idx.push(i, r, g, b);
      }
      if (idx.length) list.push({ col, idx });
    });
    faces.set(a, list);
  }
  for (const { col, idx } of list) {
    for (let n = 0; n < idx.length; n += 4) col.setXYZ(idx[n], lerp(idx[n + 1], 0.92, k), lerp(idx[n + 2], 0.12, k), lerp(idx[n + 3], 0.1, k));
    col.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- poses
function brushPose(a, k) {   // the right hand at the mouth, brushing
  const r = a.rig, w = Math.sin(G.clockT * 22) * 0.12;
  r.sh[0].rotation.x = lerp(r.sh[0].rotation.x, -1.45 + w, k); r.sh[0].rotation.z = lerp(r.sh[0].rotation.z, 0.5, k); r.elbow[0] = lerp(r.elbow[0], 2.0, k);
  a.sync();
}
function drinkPose(a, k) {   // bent over the sink, the mouth under the tap
  const r = a.rig; r.inner.rotation.x = 0.75 * k; r.inner.position.z -= 0.2 * k;
  for (let i = 0; i < 2; i++) { r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -1.1, k); r.elbow[i] = lerp(r.elbow[i], 0.6, k); }
  a.sync();
}
function gagPose(a) {   // a hand at the mouth, the other on the belly, bent
  const r = a.rig; r.sh[0].rotation.x = -1.5; r.sh[0].rotation.z = 0.45; r.elbow[0] = 2.1; r.sh[1].rotation.x = -0.6; r.elbow[1] = 1.3; r.inner.rotation.x += 0.18; a.sync();
}

// ---------------------------------------------------------------- the lines
const GAG = ['ŐŐŐKH!!', 'BLEHH!!', 'Fúúúj!!', 'ŐKH-ŐKH!', 'VIZEEET!!', 'Jaj, a számban…!'];
const HOT = ['PETYUUUS!! #@&%!', 'ÉG A SZÁM!!', 'VIZET!! #@&%!', 'Hol vagy, Petyus?! #@&%!', 'TŰZ VAN A SZÁMBAN!!', '#@&%! #@&%!!'];

// ---------------------------------------------------------------- starting / ending a turn at the basin
function begin(who) {
  const a = who === 'angi' ? G.angi : G.petya;
  tp.cur = who; tp.st = 'stand'; tp.t = 0; tp.lit = false; tp.drinks = 0; tp.red = 0; tp.seated = false;
  if (who === 'angi') { if (fx.fridge && fx.fridge.open()) fx.fridge.setOpen(false); say(a, pick(['Megyek, fogat mosok.', 'Na, fogmosás, aztán pihenés.']), 2.4); }
  else { a.sitTarget = 0; say(a, pick(['Na, fogmosás, aztán alvás…', 'Megyek fogat mosni. Petyus, te is jössz?']), 2.6); }
}
function finish() {
  const who = tp.cur, a = who === 'angi' ? G.angi : G.petya;
  if (tp.what) lockItem(tp.what, false);
  tp.st = 'back'; tp.t = 0;
  if (who === 'angi') go(a, SPOTS.momCook.x, SPOTS.momCook.z, 1.2);
  else { const s = SPOTS.dadChair; go(a, s.x - 0.4, s.z, 1.1); a.path && a.path.push(new V3(s.x, 0, s.z)); }
}
function lightOff() { const sw = bathSwitch(); if (tp.lit && sw && sw.on) toggleSwitch(sw); tp.lit = false; }
function victim(who) {
  tp.victims++; if (who === 'angi') tp.momHit = true; else tp.dadHit = true;
  const n = tp.victims;
  setTimeout(() => award('r2-fogkrem', n, { caught: tp.caught, mom: tp.momHit, dad: tp.dadHit }), 4500);
}
// the run to the kitchen tap: a lap (or straight there), drink, another lap, drink again
function runPlan(lap) { tp.legs = [...(lap ? LAP : []), 'tap', ...LAP.slice(1, 3), 'tap', 'end']; nextLeg(); }
function nextLeg() {
  const a = tp.cur === 'angi' ? G.angi : G.petya, l = tp.legs.shift();
  if (l === 'tap') { tp.st = 'toTap'; go(a, TAP.x, TAP.z, 3.0); }
  else if (l === 'end') { tp.st = tp.cur === 'angi' ? 'gagEnd' : 'hotEnd'; tp.t = 0; }
  else { tp.st = 'run'; go(a, l[0], l[1], 3.2); }
}

// ---------------------------------------------------------------- every frame (the evening – ep2.js, after the parents' update)
export function toothTick(dt, min, busy = () => false) {
  // somebody saw Petyus fiddling at the shelf / in the cabinet
  const P = G.petike.pos;
  tp.seenT -= dt;
  if (tp.seenT <= 0 && (Math.hypot(P.x - 3.25, P.z - 1.68) < 0.75 || Math.hypot(P.x - 3.25, P.z - 0.42) < 0.75)) {
    for (const a of [G.angi, G.petya]) if (a && sees(a, P, 3.0, 1.0) && Math.hypot(a.pos.x - 2.2, a.pos.z - 1.2) < 2.6) {
      tp.caught = true; tp.seenT = 15; say(a, pick(['Mit keresel ott, Petyus?', 'Petyus! Ne turkálj anya szekrényében!', 'Mit csinálsz a fogkrémmel, Petyus?']), 2.4); break;
    }
  }
  if (!tp.cur) {
    if (!tp.momDone && min >= T_MOM && min < T_MOM + 40 && !busy('angi')) { tp.momDone = true; begin('angi'); }
    else if (!tp.dadDone && min >= T_DAD && min < T_DAD + 40 && !busy('petya')) { tp.dadDone = true; begin('petya'); }
    return;
  }
  const who = tp.cur, a = who === 'angi' ? G.angi : G.petya, mom = who === 'angi';
  tp.t += dt;
  // doors open before them on the way (the path counts them passable)
  if (a.path) for (const d of doors) if (d.pivot && !d.open && d.kind !== 'locked' && Math.hypot(d.x - a.pos.x, d.z - a.pos.z) < 0.9) { toggleDoor(d); soundAt(d.x, d.z, () => noise(0.12, 1200, 1, 0.15)); }
  if (tp.red > 0) { tp.red = clamp(tp.red, 0, 1); redFace(a, 'petya', tp.red); if (tp.red > 0.5 && Math.random() < dt * 9) { const h = a.headWorld(new V3()); for (const s of [-1, 1]) spawnFx(new V3(h.x + s * 0.16, h.y - 0.35, h.z), new V3(s * 0.3, 0.6, 0), 0xf1f1f1, 0.05, 0.9, -0.2); } }
  switch (tp.st) {
    case 'stand':
      if (tp.t > (mom ? 0.3 : 0.9)) { tp.st = 'go'; go(a, SINK.x, SINK.z, 1.15); }
      break;
    case 'go':
      if (!a.path) {
        a.targetHeading = SINK.h; tp.st = 'reach'; tp.t = 0;
        const sw = bathSwitch(); if (sw && !sw.on) { toggleSwitch(sw); tp.lit = true; tone('square', 1200, 900, 0.03, 0.05); }
        tp.what = ['toothpaste', 'heelcream', 'facemask', 'chili'].find((id) => itemPlace(id) === 'paste') || null;
        if (tp.what) lockItem(tp.what, true);
      }
      break;
    case 'reach': {   // picks up the tube: what is it?
      if (tp.t < 1.0) break;
      const w = tp.what;
      if (!w) { say(a, 'Hol a fogkrém?!', 2); setTimeout(() => say(a, mom ? 'Petyus! Hová lett a fogkrém?!' : 'Valaki elvitte a fogkrémet… PETYUS!', 2.6), 2200); tp.st = 'wait'; tp.t = 0; tp.after = 4.5; }
      else if (w === 'facemask') {
        say(a, mom ? 'Mit keres az arcmaszkom a fogkrém helyén?!' : 'Mi ez a rózsaszín izé a fogkrém helyén?', 2.6);
        tp.st = 'toScold'; tp.t = 0; setTimeout(() => { if (tp.st === 'toScold') go(a, G.petike.pos.x, G.petike.pos.z, 1.6); }, 1500);
      } else if (w === 'chili' && mom) {
        say(a, 'Ez meg mi? Chili?! Petya, ez a tiéd?', 2.6); setTimeout(() => say(G.petya, 'Mi? Hol? Nem!', 1.8), 2400);
        lockItem('chili', false); moveItem('chili', 'fridge'); if (!carrying('toothpaste')) { moveItem('toothpaste', 'paste'); tp.what = 'toothpaste'; } else tp.what = null;
        tp.st = 'brush'; tp.t = 0;
      } else if (w === 'heelcream' && mom) { tp.st = 'brushGag'; tp.t = 0; }
      else if (w === 'chili') { tp.st = 'brushHot'; tp.t = 0; }
      else { tp.st = 'brush'; tp.t = 0; if (w === 'heelcream') setTimeout(() => say(a, 'Hmm… ez valahogy… lábszagú.', 2.2), 3200); }
      break;
    }
    case 'brush':   // an ordinary brushing: ≈ 6 s, humming, then spitting
      brushPose(a, Math.min(1, tp.t * 3));
      if (Math.random() < dt * 4) soundAt(a.pos.x, a.pos.z, () => noise(0.12, 3500, 1.5, 0.04));
      if (tp.t > 1 && tp.t - dt <= 1) say(head(a), '♪ hmm-hmm ♪', 1.6);
      if (tp.t > 6.5) { soundAt(a.pos.x, a.pos.z, () => noise(0.25, 900, 0.8, 0.12)); lightOff(); finish(); }
      break;
    case 'wait':
      if (tp.t > tp.after) { lightOff(); finish(); }
      break;
    case 'toScold': {   // to Petyus, a good telling-off, the jar back in the cabinet, the toothpaste back in its place
      const d = Math.hypot(G.petike.pos.x - a.pos.x, G.petike.pos.z - a.pos.z);
      if (tp.t > 1.5 && (d < 1.3 || tp.t > 14)) {
        a.path = null; a.targetHeading = Math.atan2(G.petike.pos.x - a.pos.x, G.petike.pos.z - a.pos.z); a.point = 3;
        say(a, mom ? 'Petyus! A kozmetikumaimhoz nem nyúlunk! Hányszor mondjam?!' : 'Petyus! Anya krémjeivel nem játszunk! Megértetted?!', 3.2);
        setTimeout(() => say(G.petike, 'Jó, jó… bocsánat…', 2), 3000);
        tp.caught = true; lockItem('facemask', false); moveItem('facemask', 'cabinet'); moveItem('toothpaste', 'paste'); tp.what = null;
        tp.st = 'wait'; tp.t = 0; tp.after = 3.5;
      } else if (tp.t > 1.5 && !a.path) go(a, G.petike.pos.x, G.petike.pos.z, 1.6);
      break;
    }
    // ------------------------------------------------ mum and the heel cream
    case 'brushGag':
      if (tp.t < 4) brushPose(a, Math.min(1, tp.t * 3)); else gagPose(a);
      if (tp.t < 4 && Math.random() < dt * 4) soundAt(a.pos.x, a.pos.z, () => noise(0.12, 3500, 1.5, 0.04));
      if (tp.t > 1 && tp.t - dt <= 1) say(head(a), '♪ hmm-hmm-hmm ♪', 1.6);
      if (tp.t > 3 && tp.t - dt <= 3) say(a, 'Hmm… ez valahogy…', 1.6);
      if (tp.t > 4.6) { say(a, 'ŐŐŐKH!!', 1.6); soundAt(a.pos.x, a.pos.z, () => { noise(0.4, 300, 0.7, 0.3); tone('sawtooth', 160, 90, 0.35, 0.08); }); lightOff(); tp.lineT = 1.4; runPlan(true); }
      break;
    // ------------------------------------------------ dad and the chili cream
    case 'brushHot':
      brushPose(a, Math.min(1, tp.t * 3) * (tp.t < 4.5 ? 1 : 0.3));
      if (tp.t < 4 && Math.random() < dt * 5) soundAt(a.pos.x, a.pos.z, () => noise(0.12, 3000, 1.5, 0.05));
      if (tp.t > 1.2 && tp.t - dt <= 1.2) say(a, 'Brrr, de friss…', 1.8);
      if (tp.t > 4) tp.red = Math.min(1, (tp.t - 4) / 2.2);
      if (tp.t > 4.2 && tp.t - dt <= 4.2) say(a, 'Hmm…?', 1.2);
      if (tp.t > 5.6 && tp.t - dt <= 5.6) say(a, 'MI EZ?! ÉÉÉG!!', 1.6);
      if (tp.t > 6.6) { soundAt(a.pos.x, a.pos.z, () => tone('sawtooth', 300, 700, 0.4, 0.1)); lightOff(); tp.lineT = 0.8; runPlan(false); }
      break;
    case 'run': case 'toTap':
      if (mom) gagPose(a);
      if ((tp.lineT -= dt) <= 0) { tp.lineT = 1.3 + Math.random() * 0.6; say(a, pick(mom ? GAG : HOT), 1.2); if (mom) soundAt(a.pos.x, a.pos.z, () => noise(0.3, 350, 0.7, 0.2)); }
      if (!a.path) {
        if (tp.st === 'toTap') { tp.st = 'drink'; tp.t = 0; a.targetHeading = TAP.h; if (fx.sinkTap) fx.sinkTap.on = true; }
        else nextLeg();
      }
      break;
    case 'drink':   // ≈ 3 s at the tap, gulping
      drinkPose(a, Math.min(1, tp.t * 3));
      if (Math.floor(tp.t * 2.2) !== Math.floor((tp.t - dt) * 2.2)) soundAt(a.pos.x, a.pos.z, () => tone('sine', 320, 160, 0.14, 0.06));
      if (tp.t > 3.2) {
        tp.drinks++; if (fx.sinkTap) fx.sinkTap.on = false;
        say(a, mom ? pick(['PFUJ!! Még mindig érzem!', 'Bleh… pfuj…']) : pick(['Még mindig ÉG!! #@&%!', 'Ez nem elég!! VIZET!!']), 1.8);
        soundAt(a.pos.x, a.pos.z, () => noise(0.25, 900, 0.8, 0.12));
        nextLeg();
      }
      break;
    case 'gagEnd':
      if (tp.t > 0.2 && tp.t - dt <= 0.2) { a.targetHeading = Math.PI / 2; say(a, 'Ez nem fogkrém!! Ez a SAROKKRÉMEM!!', 2.8); }
      if (tp.t > 3 && tp.t - dt <= 3) say(a, 'PETYA!! Te tetted a fogkrém helyére?!', 2.6);
      if (tp.t > 5.6 && tp.t - dt <= 5.6) say(G.petya, 'Én?! Hozzá se nyúltam!', 2.2);
      if (tp.t > 7.8) {
        say({ headWorld: (o) => o.set(G.petike.pos.x, FY + 1.45, G.petike.pos.z) }, '♪ fütyül ♪', 2); [784, 880, 988, 880, 784].forEach((f, i) => tone('sine', f, f, 0.16, 0.04, i * 0.18));
        lockItem('heelcream', false); moveItem('heelcream', 'cabinet'); tp.what = null; victim('angi'); finish();
      }
      break;
    case 'hotEnd':
      if (tp.t > 0.2 && tp.t - dt <= 0.2) { say(a, 'Chilikrém… a fogkrém helyén… PETYUUUS!! #@&%!!', 3); a.point = 2.5; }
      if (tp.t > 3.2 && tp.t - dt <= 3.2) say(G.angi, 'Petya! Ne káromkodj a gyerek előtt!', 2.4);
      if (tp.t > 5.6 && tp.t - dt <= 5.6) say(a, 'De hát… ÉG a szám, Angi!', 2.2);
      if (tp.t > 7.5) { lockItem('chili', false); moveItem('chili', 'fridge'); tp.what = null; victim('petya'); finish(); tp.cool = true; }
      break;
    case 'back':
      if (tp.cool) { tp.red = Math.max(0, tp.red - dt / 8); if (tp.red === 0) { redFace(a, 'petya', 0); tp.cool = false; } }
      if (!a.path) {
        if (!mom && !tp.seated) { tp.seated = true; const s = SPOTS.dadChair; a.place(s.x, s.z, s.h); a.pos.y = FY; a.seatH = 0.45; a.sitTarget = 1; }
        if (!tp.cool) { tp.cur = null; tp.st = ''; }
      }
      break;
  }
}
// for testing (window.__ep2?.tooth)
export function toothDebug() { return tp; }
