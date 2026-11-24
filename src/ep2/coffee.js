// Petyus kalandjai – 2. rész, csibészség: „A tejszínes kávé” (r2-tejszin).
// Dad asks for coffee. Petyus fills the mug at the coffee maker, adds milk / cream / whipped cream from the fridge, and puts it
// on dad's place at the table (inventory.js: the 'dad' place). Milk is fine. Whipped cream he notices: back it goes – pour it
// out at the sink, wash the mug under the running tap, make a new one. Cream he does not notice: he drinks it, his stomach
// growls (5×), then he runs to the WC (the chair falls over), sits there with his pajama pants down, farts, wails, a green
// cloud of stink rolls out – and in the end he comes out: they will be late (+15 minutes).
// Dad's states (cf.st): wait → asked → look → drink → growl → rush → wc → back → done (look can send him back to asked).
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { sFart, sGrowl, soundAt, tone, noise } from '../audio.js';
import { award } from '../mischief.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { V3, clamp, lerp, pick } from '../util.js';
import { scene } from '../scene.js';
import { collide } from '../world.js';
import { FY, SOLO, SPOTS, doors, flushToilet, roomAt, toggleDoor, toiletSeat } from './home.js';
import { inv, invHooks, itemObj, itemPlace, lockItem, refreshMug } from './inventory.js';
import { setPantsDown } from './pajama.js';
import { addLate } from './ep2.js';

export const cf = { st: 'wait', t: 0, askT: 12, nagT: 0, rejected: false, witnessed: false, dadSaw: false, growls: 0, growlT: 0, holdT: 0,
  paperAsked: false, paperT: 0, shoved: false, puffT: 0, fartT: 0, wailT: 0, wailI: 0, doorOpened: false, chairA: 0, mugHome: null };

const ASK = ['Petyus, hoznál egy kávét? A bögre a pulton van.', 'Fiam, egy kávét kérnék!', 'Na, és az a kávé, Petyus?'];
const GROWL = ['GRRRRRR…', 'KORRR-KORRR!', 'BRUGGGGG…', 'GRRRUUUMMM…', 'KORRRRR!'];
const FARTS = [['PRRRT!', 0.45, 1.1], ['PFFFFRRR!', 1.1, 0.95], ['BRÖTTYH!', 0.35, 0.7], ['PRRRRRRRT!', 1.5, 1.0], ['PUFF!', 0.25, 1.3]];
const WAILS = ['Jajjj, a hasam!', 'Ki tett tejszínt a kávémba?!', 'Soha többé tejszín…', 'Jaj, jaj, jaj…', 'Angiii, hozz még papírt!', 'Ez a reggel… ez a reggel…'];
// dad's way to the WC: round the table, through the kitchen and the hallway, through the WC door (x 4.1 … 4.9), to the bowl
const TO_WC = [[8.8, 2.5], [7.2, 3.3], [4.5, 3.3], [4.5, 2.36], [4.5, 1.2]];
const WC_SIT = { x: 4.5, z: 0.66 };

// a sound effect's caption at a point (not an Actor: a coloured caption, no tail)
const at = (x, y, z) => ({ headWorld: (o) => o.set(x, y, z) });
const belly = () => at(G.petya.pos.x, FY + 1.1, G.petya.pos.z);
const busy = () => !['wait', 'asked', 'done'].includes(cf.st);
export const dadBusy = () => busy() || cf.st === 'look' || cf.st === 'drink';

// ---------------------------------------------------------------- what the inventory tells us
function sees(a, p, far, cone) {   // a (an Actor) sees point p: near enough, in front of him / her
  const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz); if (d > far) return false;
  let da = Math.atan2(dx, dz) - a.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
  return Math.abs(da) < cone;
}
invHooks.poured = (what) => {
  if (what === 'kave' && (cf.st === 'asked' || cf.st === 'wait')) say(G.petya, 'Hmm, kávéillat! Hozod, fiam?', 2.4);
  if (what !== 'tejszin') return;
  const p = G.petike.pos, r = roomAt(p.x, p.z), inKitchen = r && (r.id === 'konyha' || r.id === 'eloter');
  // who saw it: mum (in the kitchen, facing him), dad (at the table, facing it)
  if (inKitchen && sees(G.petya, p, 3.2, 1.1) && !busy()) {
    cf.dadSaw = true; cf.witnessed = true;
    say(G.petya, 'Hé! Az tejszín volt?', 2.2);
  } else if (inKitchen && sees(G.angi, p, 6, 0.95)) {
    cf.witnessed = true;
    say(G.angi, 'Petyus! Mit művelsz azzal a tejszínnel?', 2.6);
    setTimeout(() => say(G.petike, 'Semmit, anya!', 1.8), 1700);
  }
};
const clean = () => { cf.dadSaw = false; cf.witnessed = false; };
invHooks.emptied = clean;
invHooks.washed = clean;
invHooks.placed = (id, pid) => {
  if (id !== 'mug' || pid !== 'dad') return;
  if (cf.st === 'done') { say(G.petya, 'Köszönöm, fiam, de ma már… nem kérek kávét.', 2.8); return; }
  if (busy()) return;
  if (G.petya.sit < 0.5) { say(G.petya, 'Most nem érek rá, Petyus!', 2); return; }   // (chasing Karcsi on all fours …)
  cf.st = 'look'; cf.t = 0;
};

// ---------------------------------------------------------------- dad looks into the mug: drinks it or sends it back
function judge() {
  const m = inv.mug, any = Object.values(m).some(Boolean), dad = G.petya;
  const back = (line, more = null, rej = false) => {
    say(dad, line, 2.8); dad.point = 1.6; if (more) setTimeout(() => say(dad, more, 3), 2600);
    if (rej) cf.rejected = true;
    cf.st = 'asked'; cf.nagT = 30;
  };
  if (!any && inv.foamy) return back('Ez még habos! Mosd ki rendesen a bögrét!', null, true);
  if (!any) return back('Üres bögrét hozol, Petyus? Kávét kértem!');
  if (m.hab) return back('Ez tejszínhab! Tudod, hogy nem bírom!', 'Öntsd ki, mosd ki a bögrét, és csinálj egy újat!', true);
  if (inv.foamy) return back('Ez még habos! Mosd ki rendesen a bögrét!', 'És csinálj egy újat!', true);
  if (!m.kave) return back(m.tea ? 'Teát? Kávét kértem, fiam!' : 'Ez nem kávé, Petyus…');
  if (cf.dadSaw && m.tejszin) return back('Láttam ám, hogy tejszínt öntöttél bele! Nem iszom meg.', 'Öntsd ki, és csinálj egy rendeset!', true);
  // he drinks it
  cf.st = 'drink'; cf.t = 0; cf.cream = !!m.tejszin;
  lockItem('mug', true);
  const mug = itemObj('mug'); cf.mugHome = mug.position.clone();
  say(dad, m.tej || m.tejszin ? 'Ó, tejjel! Köszönöm, fiam!' : 'Köszönöm, fiam!', 2.2);
}

// ---------------------------------------------------------------- the knocked-over chair
function chairTo(a) {   // tip over backwards (west) round its back-bottom edge
  const c = SOLO.dadChair; if (!c) return;
  c.pivot.rotation.z = a; c.pivot.position.x = c.x - 0.22 + 0.22 * Math.cos(a); c.pivot.position.y = FY + 0.22 * Math.sin(a);
}

// ---------------------------------------------------------------- the pants round the knees (two crumpled rings)
let rings = null;
function pantsRings(on) {
  if (!rings) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4c607e, flatShading: true });
    rings = [0, 1].map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.12, 9), mat), new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), mat));
      g.children[1].rotation.x = Math.PI / 2; g.children[1].position.y = 0.03; g.visible = false; scene.add(g); return g; });
  }
  rings.forEach((g) => { g.visible = on; });
  setPantsDown('petya', on);
}
const _k = new V3(), _f = new V3(), _up = new V3(0, 1, 0);
function placeRings() {
  const r = G.petya.rig;
  for (let i = 0; i < 2; i++) {
    r.knee[i].getWorldPosition(_k); r.foot[i].getWorldPosition(_f);
    const dir = _f.sub(_k).normalize();
    rings[i].position.copy(_k).addScaledVector(dir, 0.1);
    rings[i].quaternion.setFromUnitVectors(_up, dir.negate());
  }
}

// ---------------------------------------------------------------- poses (after Actor.update, then sync again)
function poseBelly(k, hunch) {
  const a = G.petya, r = a.rig;
  for (let i = 0; i < 2; i++) { r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -0.55, k); r.sh[i].rotation.z = lerp(r.sh[i].rotation.z, i === 0 ? 0.32 : -0.32, k); r.elbow[i] = lerp(r.elbow[i], 1.25, k); }
  if (hunch) { const h = r.hipH * 0 + 0.45; r.inner.rotation.x = hunch; r.inner.position.z -= h * Math.sin(hunch); r.inner.position.y += h * (1 - Math.cos(hunch)); }
}
function poseDrink(k) {
  const r = G.petya.rig;
  r.sh[0].rotation.x = lerp(r.sh[0].rotation.x, -1.25, k); r.sh[0].rotation.z = lerp(r.sh[0].rotation.z, 0.42, k); r.elbow[0] = lerp(r.elbow[0], 1.75, k);
}
const _h = new V3();
function mugInHand() {
  const mug = itemObj('mug'); G.petya.rig.handBones[0].getWorldPosition(_h);
  mug.position.set(_h.x, _h.y - FY - 0.06, _h.z);
}

// ---------------------------------------------------------------- the WC door: dad shuts it behind him, opens it when he is done
const wcDoor = () => doors.find((d) => d.pivot && Math.abs(d.x - 4.5) < 0.3 && Math.abs(d.z - 2.36) < 0.3);
function setWcDoor(open, slam = false) {
  const d = wcDoor(); if (!d || d.open === open) return;
  toggleDoor(d);
  soundAt(4.5, 2.4, () => { if (slam) { noise(0.12, 300, 1, 0.45); tone('square', 90, 50, 0.12, 0.12); } else noise(0.15, 1200, 1, 0.2); });
  if (slam) say(at(4.5, FY + 2.2, 2.5), 'BUMM!', 1.1);
}
// ---------------------------------------------------------------- the stink: green puffs drifting out of the WC
const STINK = [0x8fbf3a, 0x9ccc4a, 0x7aa83a, 0xa8c85a];
function puff(n = 1, strong = 1) {
  const d = wcDoor(), shut = d && !d.open;
  for (let i = 0; i < n; i++) {
    if (shut) {   // the door is shut: it seeps out under it and over it, thinner
      const p = new V3(4.5 + (Math.random() - 0.5) * 0.7, FY + (Math.random() < 0.6 ? 0.04 : 2.12), 2.47);
      spawnFx(p, new V3((Math.random() - 0.5) * 0.3, 0.06 + Math.random() * 0.1, 0.2 + Math.random() * 0.25), pick(STINK), 0.1 + Math.random() * 0.1 * strong, 4 + Math.random() * 2, 0, true);
      continue;
    }
    const p = new V3(4.5 + (Math.random() - 0.5) * 0.5, FY + 0.5 + Math.random() * 0.5, 0.75 + (Math.random() - 0.5) * 0.4);
    // out through the door (+z) and up; some spread into the hallway
    const v = new V3((Math.random() - 0.5) * 0.35, 0.12 + Math.random() * 0.12, 0.25 + Math.random() * 0.35 * strong);
    spawnFx(p, v, pick(STINK), 0.16 + Math.random() * 0.18 * strong, 5 + Math.random() * 3, 0, true);
  }
}

// ---------------------------------------------------------------- every frame (after dad's update)
export function coffeeTick(dt) {
  const dad = G.petya; cf.t += dt;
  switch (cf.st) {
    case 'wait':
      if (dad.sit > 0.9 && (cf.askT -= dt) <= 0) { say(dad, ASK[0], 3.2); dad.point = 1.4; cf.st = 'asked'; cf.nagT = 32; }
      break;
    case 'asked':
      if (dad.sit > 0.9 && (cf.nagT -= dt) <= 0) { say(dad, pick(ASK.slice(1)), 2.8); cf.nagT = 35 + Math.random() * 10; }
      break;
    case 'look':
      if (cf.t > 0.9) judge();
      break;
    case 'drink': {   // three sips (≈ 4 s): the mug in his right hand
      const k = clamp(Math.min(cf.t * 2, (4.2 - cf.t) * 2), 0, 1);
      poseDrink(k); dad.sync(); mugInHand();
      if (cf.t > 0.9 && cf.t < 3.6 && Math.floor(cf.t * 1.25) !== Math.floor((cf.t - dt) * 1.25)) { soundAt(dad.pos.x, dad.pos.z, () => { noise(0.35, 700, 1.2, 0.08); tone('sine', 300, 180, 0.2, 0.03, 0.2); }); }
      if (cf.t > 4.2) {
        const mug = itemObj('mug'); mug.position.copy(cf.mugHome); lockItem('mug', false);
        inv.mug = {}; refreshMug();
        if (cf.cream) { say(dad, 'Hmm… finom volt. Kicsit más, mint szokott…', 2.8); cf.st = 'growl'; cf.growls = 0; cf.growlT = 7; }
        else { setTimeout(() => say(dad, 'Ez jólesett!', 2), 400); cf.st = 'wait'; cf.askT = 80; clean(); }
      }
      break;
    }
    case 'growl': {   // every 7–11 s his stomach growls; on the 5th he runs
      cf.holdT -= dt;
      const k = clamp(cf.holdT, 0, 1);
      if (k > 0) { poseBelly(k, 0); dad.rig.inner.position.x = Math.sin(G.clockT * 14) * 0.02 * k; dad.sync(); }
      if ((cf.growlT -= dt) <= 0) {
        cf.growls++; cf.growlT = 7 + Math.random() * 4; cf.holdT = 2.4;
        soundAt(dad.pos.x, dad.pos.z, () => sGrowl(0.7 + cf.growls * 0.15));
        say(belly(), GROWL[(cf.growls - 1) % GROWL.length], 1.6);
        if (cf.growls === 2) { setTimeout(() => say(G.angi, 'Jól vagy, Petya?', 2.2), 1500); setTimeout(() => say(dad, 'Persze… persze…', 2), 3300); }
        if (cf.growls === 3) setTimeout(() => say(dad, 'Hmm…', 1.6), 1500);
        if (cf.growls === 4) setTimeout(() => say(dad, 'Ajjaj…', 1.8), 1400);
        if (cf.growls >= 5) {
          cf.st = 'rush'; cf.t = 0; cf.shoved = false; cf.inWc = false; cf.outT = 0;
          setTimeout(() => say(dad, 'JAJ! Most azonnal!!', 2), 500);
        }
      }
      break;
    }
    case 'rush': {
      if (cf.t < 0.6) { dad.sitTarget = 0; cf.chairA = 0; cf.walking = false; }
      else if (!cf.walking && dad.sit < 0.15) {
        cf.walking = true; dad.walkTo(TO_WC, 3.4);
        soundAt(10, 2, () => { tone('square', 120, 60, 0.15, 0.1); noise(0.2, 500, 1, 0.25); });
      }
      if (cf.t > 0.6) { cf.chairA = Math.min(1.38, cf.chairA + dt * 4); chairTo(cf.chairA); }
      if (dad.path || !cf.walking) { poseBelly(0.8, 0.15); dad.sync(); }
      // the WC door opens before him (and slams shut behind him), the lid flies up
      const wd = wcDoor();
      if (wd && !cf.inWc && Math.hypot(dad.pos.x - wd.x, dad.pos.z - wd.z) < 1.3) setWcDoor(true);
      if (wd && !cf.inWc && dad.pos.z < 1.3 && Math.abs(dad.pos.x - 4.5) < 0.7) { cf.inWc = true; setWcDoor(false, true); }
      if (Math.hypot(dad.pos.x - 4.5, dad.pos.z - 1.2) < 0.8 && toiletSeat.state !== 1) { toiletSeat.state = 1; soundAt(4.5, 0.5, () => tone('square', 700, 300, 0.06, 0.08)); }
      // Petyus in the way: pushed aside
      const p = G.petike.pos, dx = p.x - dad.pos.x, dz = p.z - dad.pos.z, d = Math.hypot(dx, dz);
      if (dad.path && d < 0.75 && d > 1e-3) {
        const s = Math.sin(dad.heading), c = Math.cos(dad.heading), side = (dx * c - dz * s) >= 0 ? 1 : -1;
        p.x += c * side * 0.55; p.z -= s * side * 0.55; collide(p, 0.22, 0, null);
        if (!cf.shoved) { cf.shoved = true; say(dad, 'Félre!', 1.4); soundAt(p.x, p.z, () => noise(0.12, 400, 1, 0.2)); }
      }
      if (cf.walking && !dad.path) {   // there: turn round, sit down, pants down
        dad.walkTo([[WC_SIT.x, WC_SIT.z]], 1.2);
        cf.st = 'sitdown'; cf.t = 0;
      }
      break;
    }
    case 'sitdown':
      if (!dad.path) {
        dad.targetHeading = 0; dad.seatH = 0.42; dad.sitTarget = 1;
        if (cf.t > 0.5 && !rings?.[0].visible) pantsRings(true);
      }
      if (dad.sit > 0.95) { cf.st = 'wc'; cf.t = 0; cf.fartT = 0.8; cf.wailT = 3; cf.wailI = 0; cf.paperAsked = false; cf.paperT = 0; cf.puffT = 0; cf.angiT = 9; }
      if (rings && rings[0].visible) placeRings();
      break;
    case 'wc': {   // ≈ 46 s on the WC
      poseBelly(1, 0.26 + Math.sin(G.clockT * 2.3) * 0.04); dad.sync(); placeRings();
      if ((cf.puffT -= dt) <= 0) { cf.puffT = 0.13; puff(1); }
      if ((cf.fartT -= dt) <= 0) {
        cf.fartT = 2.2 + Math.random() * 3; const [txt, len, pitch] = pick(FARTS);
        soundAt(4.5, 0.6, () => sFart(len, pitch));
        say(at(4.5, FY + 0.9, 0.75), txt, 1.3); puff(10, 1.6);
      }
      if ((cf.wailT -= dt) <= 0) { cf.wailT = 6 + Math.random() * 2; say(dad, WAILS[cf.wailI++ % WAILS.length], 2.6); }
      if ((cf.angiT -= dt) <= 0 && cf.angiT > -50) { cf.angiT = -99; say(G.angi, 'Petya, az ég szerelmére, nyiss ablakot!', 3); }
      // the toilet paper: if Petyus took it away, dad shouts for it
      const hasPaper = itemPlace('paper') === 'wc';
      if (cf.t > 15 && !hasPaper && (cf.paperT -= dt) <= 0) { cf.paperT = 7; cf.paperAsked = true; say(dad, 'PAPÍRT!!', 2); }
      if (cf.paperAsked && hasPaper && !cf.paperThanks) { cf.paperThanks = true; say(dad, 'Köszönöm… végre…', 2.2); }
      if (cf.t > 46) {
        if (flushToilet()) soundAt(4.5, 0.5, () => { noise(1.7, 700, 0.5, 0.3, 0.1); tone('sine', 260, 110, 1.3, 0.05, 0.2); });
        say(at(4.5, FY + 1.1, 0.6), 'HÚÚÚSSS!', 1.5);
        if (!hasPaper) setTimeout(() => say(dad, 'Megoldottam… ne kérdezzétek, hogyan.', 2.6), 1600);
        pantsRings(false); dad.sitTarget = 0; cf.st = 'back'; cf.t = 0;
      }
      break;
    }
    case 'back': {   // slow, bent, back to his chair: he opens the door (the cloud rolls out), comes out and shuts it again
      if (cf.t > 1.5 && !dad.path && !cf.backWalk) { cf.backWalk = true; dad.walkTo([[4.5, 1.2], ...TO_WC.slice(0, -1).reverse(), [SPOTS.dadChair.x - 0.4, SPOTS.dadChair.z], [SPOTS.dadChair.x, SPOTS.dadChair.z]], 0.85); }
      if (cf.backWalk && cf.inWc && dad.pos.z > 0.85) { cf.inWc = false; setWcDoor(true); puff(24, 1.8); }
      if (cf.backWalk && !cf.inWc && !cf.outT && dad.pos.z > 3.0) { cf.outT = 1; setWcDoor(false); say(G.petya, 'Most egy darabig ne menjen be senki…', 2.6); }
      if (dad.path) { poseBelly(0.5, 0.22); dad.sync(); if (Math.random() < dt * 0.7) puff(1, 0.5); }
      // the chair stands up again before he sits
      if (cf.backWalk && Math.hypot(dad.pos.x - SPOTS.dadChair.x, dad.pos.z - SPOTS.dadChair.z) < 1.4) { cf.chairA = Math.max(0, cf.chairA - dt * 3); chairTo(cf.chairA); }
      if (cf.backWalk && !dad.path) {
        cf.chairA = 0; chairTo(0);
        dad.place(SPOTS.dadChair.x, SPOTS.dadChair.z, SPOTS.dadChair.h); dad.pos.y = FY; dad.seatH = 0.45; dad.sitTarget = 1;
        say(dad, 'Ma kések a munkából. És te is az iskolából.', 3.4);
        setTimeout(() => say(G.angi, 'Tejszín? Petyus…', 2.2), 3600);
        addLate(15);
        const stars = 1 + (cf.rejected ? 0 : 1) + (!cf.rejected && !cf.witnessed ? 1 : 0);
        setTimeout(() => award('r2-tejszin', stars, { paper: cf.paperAsked }), 2200);
        cf.st = 'done'; cf.backWalk = false;
      }
      break;
    }
  }
}
// for testing (window.__ep2.coffee)
export function coffeeDebug() { return cf; }
