// Petyus kalandjai – 2. rész, esti csibészség: „A lepedős kísértet” (r2-kiserteet).
// At 21:00 dad takes the rubbish out (the bag in his hand, out through the front door); a little later he comes back in.
// Petyus takes the sheet off his bed (Space at his bed – again: back on the bed): a white ghost with two eye holes. When dad
// comes in, Space next to him: „BÚÚÚ!!”
//   · the hallway's light on → he jumps, then recognises him: „Petyus?! Mit csinálsz te lepedőben?!”          ★
//   · in the dark (the hallway's light off) → „ÁÁÁÁ!! MEGADOM MAGAM! MEGADOM MAGAM!!” (as in the opening film)  ★★
//   · mum comes running and switches the light on: if Petyus is back by his bed by then (the sheet back on it) → she scolds dad
//     for waking the child, nobody believes the ghost                                                            ★★★
import * as THREE from 'three';
import { noise, soundAt, tone } from '../audio.js';
import { award } from '../mischief.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { setPrompt } from '../activities/drinking.js';
import { lerp, pick } from '../util.js';
import { FY, SPOTS, doors, homeRoot, switches, toggleDoor, toggleSwitch } from './home.js';
import { rubbishBag } from './food.js';
import { findPath } from './navgrid.js';

const T_OUT = 21 * 60, OUT_S = 18;                    // when he goes out; how long he is outside (real seconds)
const DOOR_IN = { x: 0.4, z: 3.32 };                  // just inside the front door (the hallway's west wall)
const BED = { x: 12.22, z: 1.95 };                    // Petyus's bed
export const gh = { st: 'off', t: 0, sheet: false, scared: false, dark: false, alibi: false, momGo: false, lineT: 0 };
export const ghostBusy = () => !['off', 'done'].includes(gh.st);
export const momGhostBusy = () => gh.momGo;

const passDoors = () => new Set(doors.filter((d) => d.pivot && d.kind !== 'locked').map((d) => d.col));
function go(a, x, z, speed) { const p = findPath(a.pos.x, a.pos.z, x, z, passDoors()); a.walkTo(p && p.length ? p : [[x, z]], speed); }
const hallSwitch = () => switches.find((s) => s.room === 'eloter');
const near = (a, b, r) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < r;

// ---------------------------------------------------------------- the sheet over Petyus (a white cone with a round top, two eye holes)
let sheet = null, bag = null;
function sheetMesh() {
  const g = new THREE.Group(), white = new THREE.MeshLambertMaterial({ color: 0xf7f7f2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 1.35, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xf7f7f2, side: THREE.DoubleSide })); body.position.y = 0.72; g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), white); top.position.y = 1.39; g.add(top);
  for (const sx of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(sx, 1.3, 0.2); g.add(e); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function sheetOffer() { return G.petike && Math.hypot(G.petike.pos.x - BED.x, G.petike.pos.z - BED.z) < 1.0; }
export function sheetLabel() { return gh.sheet ? 'Szóköz – lepedő vissza az ágyra' : 'Szóköz – lepedő magadra'; }
export function toggleSheet() {
  gh.sheet = !gh.sheet;
  if (!sheet) sheet = sheetMesh();
  // under the sheet only the sheet shows (his arms and legs would poke through it)
  G.petike.rig.root.traverse((o) => { if (o.isMesh && !sheet.children.includes(o)) o.visible = !gh.sheet; });
  if (gh.sheet) { G.petike.rig.root.add(sheet); say(G.petike, 'Húúúú… én vagyok a lakás szelleme…', 2.2); }
  else sheet.removeFromParent();
  noise(0.3, 2500, 0.6, 0.06);
}

// ---------------------------------------------------------------- poses
function handsUp(a, k) { const r = a.rig, w = Math.sin(G.clockT * 16) * 0.12; for (let i = 0; i < 2; i++) { r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -2.9 + w, k); r.sh[i].rotation.z = lerp(r.sh[i].rotation.z, i ? -0.4 : 0.4, k); } r.inner.position.z -= 0.08 * k; a.sync(); }
function carryBag(a) { const h = new THREE.Vector3(); a.rig.handBones[0].getWorldPosition(h); bag.position.set(h.x, h.y - FY - 0.42, h.z); }

// ---------------------------------------------------------------- every frame (the evening – ep2.js)
export function ghostTick(dt, min, dadFree) {
  const d = G.petya, P = G.petike; gh.t += dt;
  if (gh.sheet && (gh.lineT -= dt) <= 0) { gh.lineT = 6 + Math.random() * 5; if (P.path || Math.random() < 0.5) say(P, pick(['Húúúú…', 'Bú-hú-hú…', 'Húúú-húúú…']), 1.4); }
  if (gh.st === 'off') {
    if (min >= T_OUT && min < T_OUT + 45 && dadFree()) {
      gh.st = 'toDoor'; gh.t = 0; d.sitTarget = 0; say(d, pick(['Leviszem a szemetet.', 'Na, kiviszem a szemetet.']), 2.2);
      if (!bag) { bag = rubbishBag(); homeRoot.add(bag); }
      bag.visible = true;
    }
    return;
  }
  if (gh.st === 'done') return;
  if (d.path) for (const dr of doors) if (dr.pivot && !dr.open && dr.kind !== 'locked' && Math.hypot(dr.x - d.pos.x, dr.z - d.pos.z) < 0.9) { toggleDoor(dr); soundAt(dr.x, dr.z, () => noise(0.12, 1200, 1, 0.15)); }
  switch (gh.st) {
    case 'toDoor':
      if (gh.t > 0.8 && !gh.walking) { gh.walking = true; go(d, DOOR_IN.x, DOOR_IN.z, 1.25); }
      carryBag(d);
      if (gh.walking && !d.path) {   // out through the front door
        gh.walking = false; d.rig.root.visible = false; bag.visible = false; gh.st = 'out'; gh.t = 0;
        soundAt(0, 3.3, () => { noise(0.15, 900, 1, 0.25); tone('square', 120, 80, 0.12, 0.1, 0.1); });
      }
      break;
    case 'out':
      if (gh.t > OUT_S) {   // back in
        d.rig.root.visible = true; d.place(DOOR_IN.x, DOOR_IN.z, Math.PI / 2); d.pos.y = FY;
        soundAt(0, 3.3, () => { noise(0.15, 900, 1, 0.25); tone('square', 120, 80, 0.12, 0.1, 0.1); });
        say(d, 'Brrr, hűvös van kint…', 1.8);
        gh.st = 'in'; gh.t = 0; const s = SPOTS.dadChair; go(d, s.x - 0.4, s.z, 1.0);
      }
      break;
    case 'in': {   // walking back through the hallway: the moment for the ghost
      const inHall = d.pos.x < 5.6;
      if (gh.sheet && !gh.scared && inHall && near(P, d, 1.9)) {   // (once: on the walk back after it, nothing more)
        setPrompt('Szóköz – BÚÚÚ!!');
        if (G.kickPressed) {
          const sw = hallSwitch(); gh.dark = !(sw && sw.on); gh.scared = true; gh.st = 'scared'; gh.t = 0; d.path = null;
          d.targetHeading = Math.atan2(P.pos.x - d.pos.x, P.pos.z - d.pos.z);
          say(P, 'BÚÚÚÚ!!', 1.6); soundAt(P.pos.x, P.pos.z, () => { noise(0.5, 300, 0.6, 0.25); tone('sawtooth', 110, 70, 0.5, 0.1); });
          if (gh.dark) setTimeout(() => say(d, 'ÁÁÁÁ!! MEGADOM MAGAM! MEGADOM MAGAM!!', 2.8), 500);
          else { setTimeout(() => say(d, 'ÁÁÁ! …', 1.2), 400); setTimeout(() => say(d, 'Petyus?! Mit csinálsz te lepedőben?!', 2.6), 1800); }
          gh.momGo = true; setTimeout(() => { go(G.angi, 3.6, 3.3, 1.7); say(G.angi, 'Mi történt?!', 1.6); }, 1200);
          break;
        }
      }
      if (!d.path) { const s = SPOTS.dadChair; d.place(s.x, s.z, s.h); d.pos.y = FY; d.seatH = 0.45; d.sitTarget = 1; gh.st = 'done'; }
      break;
    }
    case 'scared': {
      handsUp(d, Math.min(1, gh.t * 4) * (gh.t < 4.5 ? 1 : Math.max(0, 1 - (gh.t - 4.5) * 2)));
      const m = G.angi;
      if (!gh.momThere && gh.t > 1.3 && !m.path) {   // mum is there: the light on, and what does she see?
        gh.momThere = true; gh.t2 = 0;
        const sw = hallSwitch(); if (sw && !sw.on) { toggleSwitch(sw); tone('square', 1200, 900, 0.03, 0.05); }
        gh.alibi = gh.dark && !gh.sheet && Math.hypot(P.pos.x - BED.x, P.pos.z - BED.z) < 1.3;
        if (gh.alibi) {
          say(m, 'Petya! Mit kiabálsz? Felébreszted a gyereket! Már lefeküdt!', 3);
          setTimeout(() => say(d, 'De… de itt volt egy… egy KÍSÉRTET!', 2.6), 3200);
          setTimeout(() => say(m, 'Persze. Egy kísértet. Vidd inkább le rendesen a szemetet.', 3), 6000);
        } else if (gh.sheet) {
          say(m, 'Petyus! Azonnal tedd vissza azt a lepedőt az ágyadra!', 3);
          setTimeout(() => say(d, 'Te kis… kísértet! Na megállj!', 2.4), 3200);
        } else say(m, 'Na, mi volt ez a kiabálás?', 2.4);
        setTimeout(() => award('r2-kiserteet', 1 + (gh.dark ? 1 : 0) + (gh.alibi ? 1 : 0), { dark: gh.dark, alibi: gh.alibi }), 4500);
      }
      if (gh.momThere && (gh.t2 += dt) > 8) {
        gh.st = 'in'; gh.t = 0; gh.momGo = false; const s = SPOTS.dadChair; go(d, s.x - 0.4, s.z, 1.0);
        go(m, SPOTS.momCook.x, SPOTS.momCook.z, 1.2);
      }
      break;
    }
  }
}
