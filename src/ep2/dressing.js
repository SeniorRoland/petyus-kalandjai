// Petyus kalandjai – 2. rész: öltözködés reggel. Petyus szobájában a szekrény kinyitható (E), benne három póló: fehér (az 1. rész
// focimeze), fekete és kék (a pizsama sötétebb kékje) – E: ruhaválasztó (1 / 2 / 3, érintőn gombok). Ha Petyus már fel van öltözve
// és ideje indulni (7:30, vagy megvolt mindhárom reggeli csibészség), a szülők berohannak a szobájukba, a szekrénynél átöltöznek,
// majd a bejárati ajtóhoz mennek, és onnan sürgetik Petyust. Az indulás feltétele: Petyus felöltözött, a szülők az ajtónál.
import * as THREE from 'three';
import { noise, soundAt, tone } from '../audio.js';
import { G, rigs } from '../state.js';
import { say } from '../ui.js';
import { R, damp, dampAngle, pick } from '../util.js';
import { homeRoot } from './home.js';
import { TOPS, dressClothes, setPantsDown } from './pajama.js';

// Petyus's wardrobe: put('wardrobe', 14.3, 3.88, P) – its doors face north, the front at z 3.58
const WR = { x: 14.3, z: 3.58, stand: { x: 14.3, z: 3.12 } };
// the parents change at the cupboards along their room's west wall; then they wait by the front door
const SPOT = { dadChange: [7.85, 6.0], momChange: [7.85, 7.35], dadDoor: [1.05, 3.95], momDoor: [1.05, 2.72] };
const NAMES = { white: 'fehér', black: 'fekete', blue: 'kék' };
export const dress = { top: null, open: false, doorT: 0, leaves: [], inside: null, choosing: false, changeT: -1, pending: null,
  parents: 'home', pT: 0, urgeT: 6, readyT: 0 };

// ---------------------------------------------------------------- the wardrobe: two door leaves that swing open, the shirts inside
export function buildWardrobe() {
  const mat = new THREE.MeshLambertMaterial({ color: 0xf2efe8 }), knob = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });
  for (const s of [-1, 1]) {   // the hinges at the outer edges
    const pivot = new THREE.Group(); pivot.position.set(WR.x + s * 0.5, 0.08, WR.z - 0.015); homeRoot.add(pivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.49, 2.0, 0.03), mat); leaf.position.set(-s * 0.245, 1.0, 0); leaf.castShadow = true; pivot.add(leaf);
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), knob); k.position.set(-s * 0.44, 1.0, -0.03); pivot.add(k);
    dress.leaves.push({ pivot, s });
  }
  // inside (seen when open): the dark back, a rail, three shirts on hangers, a pair of shorts folded on a shelf
  const ins = new THREE.Group(); homeRoot.add(ins); dress.inside = ins; ins.visible = false;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 2.0), new THREE.MeshLambertMaterial({ color: 0x5b4a3a, side: THREE.DoubleSide })); back.position.set(WR.x, 1.08, WR.z - 0.004); back.rotation.y = Math.PI; ins.add(back);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.025), knob); rail.position.set(WR.x, 1.82, WR.z - 0.12); ins.add(rail);
  dress.shirts = {};
  [['white', 0xf1f2f3], ['black', TOPS.black], ['blue', TOPS.blue]].forEach(([k, c], n) => {
    const g = new THREE.Group(); g.position.set(WR.x - 0.28 + n * 0.28, 1.8, WR.z - 0.12); ins.add(g);
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.02), knob); hanger.position.y = -0.04; g.add(hanger);
    const m = new THREE.MeshLambertMaterial({ color: c });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.05), m); body.position.y = -0.27; g.add(body);
    for (const s of [-1, 1]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), m); sl.position.set(s * 0.15, -0.12, 0); sl.rotation.z = s * 0.5; g.add(sl); }
    dress.shirts[k] = g;
  });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.3), new THREE.MeshLambertMaterial({ color: 0xd8c6a2 })); shelf.position.set(WR.x, 0.6, WR.z - 0.15); ins.add(shelf);
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.2), new THREE.MeshLambertMaterial({ color: 0x1d1d22 })); shorts.position.set(WR.x - 0.2, 0.65, WR.z - 0.15); ins.add(shorts);
}
function setOpen(v) { if (dress.open === v) return; dress.open = v; tone('sine', v ? 300 : 220, v ? 200 : 140, 0.12, 0.08); noise(0.15, 500, 1, 0.06); }

// the interaction (ep2.js interactHome): a candidate in front of the wardrobe
export function wardrobeCand(p) { return { o: { wardrobe: true }, r: Math.hypot(p.x - WR.stand.x, p.z - WR.stand.z), reach: 0.75, aim: new THREE.Vector3(WR.x, 1.2, WR.z), size: 0.45 }; }
export const wardrobeLabel = () => (!dress.open ? 'E – szekrény kinyitása' : dress.top ? 'E – átöltözés (másik ruha)' : 'E – felöltözés (ruha választása)');
export function wardrobeUse() { if (!dress.open) setOpen(true); else openChooser(); }

// ---------------------------------------------------------------- choosing the clothes: 1 / 2 / 3 or the buttons, Esc: cancel
let panel = null;
function openChooser() {
  if (dress.choosing) return; dress.choosing = true;
  panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:40;background:rgba(20,24,36,.92);border:3px solid #000;border-radius:14px;padding:12px 16px;color:#fff;text-align:center;box-shadow:4px 4px 0 #000;font-family:"Patrick Hand",sans-serif;';
  panel.innerHTML = '<div style="font-family:Bangers,sans-serif;font-size:26px;letter-spacing:1px;color:#ffd166;margin-bottom:8px">Mit veszel fel?</div><div style="display:flex;gap:10px;justify-content:center"></div><div style="opacity:.7;margin-top:6px;font-size:15px">1 · 2 · 3 – választás · Esc – mégse</div>';
  const row = panel.children[1];
  [['white', 'Fehér', '#f1f2f3'], ['black', 'Fekete', '#26272b'], ['blue', 'Kék', '#2f5f9e']].forEach(([k, name, c], n) => {
    const b = document.createElement('button'); b.className = 'btn';
    b.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 12px;font-size:18px';
    b.innerHTML = `<span style="display:block;width:44px;height:44px;border-radius:8px;border:2px solid #000;background:${c}"></span>${n + 1}. ${name}` + (dress.top === k ? ' ✓' : '');
    b.onclick = (e) => { e.stopPropagation(); choose(k); };
    row.appendChild(b);
  });
  document.body.appendChild(panel);
}
function closeChooser() { dress.choosing = false; if (panel) panel.remove(); panel = null; }
window.addEventListener('keydown', (e) => {
  if (!dress.choosing) return;
  const k = { Digit1: 'white', Digit2: 'black', Digit3: 'blue', Numpad1: 'white', Numpad2: 'black', Numpad3: 'blue' }[e.code];
  if (k) choose(k); else if (e.code === 'Escape') closeChooser();
  e.stopImmediatePropagation(); e.preventDefault();
}, true);
function choose(k) {
  closeChooser();
  dress.pending = k; dress.changeT = 0;   // the change itself: dressTick (a quick spin behind the open doors)
  soundAt(G.petike.pos.x, G.petike.pos.z, () => { noise(0.5, 1400, 0.5, 0.08); noise(0.4, 700, 0.7, 0.06, 0.35); }, 1);
}

// ---------------------------------------------------------------- every frame (ep2.js): Petyus changing, the doors, the parents
// ready: may they set off (it is 7:30, or the morning's mischiefs are done); busy: is a mischief holding one of the parents
// returns true while the parents are getting ready (their usual morning is off then)
export function dressTick(dt, ready, busy) {
  const a = G.petike;
  // the doors swing; they close by themselves when Petyus walks off
  dress.doorT = damp(dress.doorT, dress.open ? 1 : 0, 6, dt);
  for (const l of dress.leaves) l.pivot.rotation.y = -l.s * dress.doorT * 1.9;
  dress.inside.visible = dress.doorT > 0.02;
  if (dress.open && !dress.choosing && dress.changeT < 0 && Math.hypot(a.pos.x - WR.stand.x, a.pos.z - WR.stand.z) > 1.6) setOpen(false);
  for (const [k, g] of Object.entries(dress.shirts)) g.visible = dress.top !== k;   // the one he wears is not on its hanger
  // changing: facing the wardrobe, a quick turn, then the new clothes
  if (dress.changeT >= 0) {
    dress.changeT += dt; a.heading = a.targetHeading = Math.PI * 2 * Math.min(1, dress.changeT / 0.9);
    if (dress.changeT >= 0.9) {
      const first = !dress.top; dress.top = dress.pending; dress.changeT = -1; a.heading = a.targetHeading = 0;
      dressClothes(rigs.foci, TOPS[dress.top]);
      say(a, first ? pick(['Kész is vagyok!', `A ${NAMES[dress.top]} pólóm, a kedvencem!`, 'Na, így már mehetünk!']) : `Inkább a ${NAMES[dress.top]}!`, 2.0);
      if (first && !ready) setTimeout(() => say(G.angi, 'Ügyes vagy, már fel is öltöztél! Mi még ráérünk egy kicsit.', 3.0), 1600);
      setTimeout(() => setOpen(false), 900);
    }
  }
  // the parents
  const P = G.petya, M = G.angi;
  dress.readyT -= dt;
  if (dress.parents === 'home') {
    if (dress.top && ready && !busy && dress.readyT <= 0) {   // off they go: up, into their room, to the cupboard
      dress.parents = 'go'; dress.pT = 0; dress.dadGo = false;
      P.sitTarget = 0; M.sit = M.sitTarget = 0;
      say(M, pick(['Jaj, mennyi az idő? Gyorsan öltözzünk!', 'Petya! Fél nyolc! Öltözés, futás!']), 2.6);
      setTimeout(() => say(P, 'Futás!', 1.4), 1200);
      M.walkTo([[8.2, 3.3], [9.85, 3.55], [9.85, 5.0], SPOT.momChange], 2.4);
    } else if (!dress.top && ready && (dress.urgeT -= dt) <= 0) {   // time to go, but he is still in his pajamas
      dress.urgeT = R(7, 11);
      say(pick([M, P]), pick(['Petyus, öltözz már fel! Elkésünk!', 'Pizsamában akarsz iskolába menni?! A ruhád a szekrényben van!', 'Petyus! Öltözés! Most!']), 2.8);
    }
    return false;
  }
  dress.pT += dt;
  if (dress.parents === 'go') {
    if (!dress.dadGo && P.sit < 0.1) { dress.dadGo = true; P.walkTo([[9.85, 3.4], [9.85, 5.0], SPOT.dadChange], 2.4); }   // (up from his chair first)
    if (!dress.dadGo || P.path || M.path || dress.pT < 1) return true;
    dress.parents = 'change'; dress.pT = 0;
    soundAt(7.9, 6.6, () => { noise(1.6, 1200, 0.5, 0.07); noise(1.2, 600, 0.6, 0.05, 0.6); }, 1.2);
  } else if (dress.parents === 'change') {   // rummaging in the cupboard, pulling things on
    for (const a2 of [P, M]) {
      a2.heading = dampAngle(a2.heading, -Math.PI / 2, 8, dt); a2.animate(dt, false, 0);
      const w = Math.sin(dress.pT * 9 + (a2 === M ? 1 : 0));
      a2.rig.sh[0].rotation.x = -1.3 + w * 0.5; a2.rig.sh[1].rotation.x = -1.0 - w * 0.5; a2.sync();
    }
    if (dress.pT > 2.6) {
      dressClothes(rigs.petya); dressClothes(rigs.angi); setPantsDown('petya', false);
      dress.parents = 'toDoor'; dress.pT = 0;
      say(P, pick(['Kész! Hol a kocsikulcs?', 'Megvagyok! Indulás!']), 2.2);
      P.walkTo([[9.85, 5.0], [9.85, 3.6], [5.0, 3.5], SPOT.dadDoor], 2.2);
      M.walkTo([[9.6, 5.2], [9.6, 3.4], [5.0, 3.1], SPOT.momDoor], 2.2);
    }
  } else if (dress.parents === 'toDoor') {
    if (!P.path && !M.path) { dress.parents = 'door'; dress.urgeT = 1.5; }
  } else if (dress.parents === 'door') {   // waiting at the front door, hurrying him
    for (const a2 of [P, M]) { a2.targetHeading = Math.atan2(a.pos.x - a2.pos.x, a.pos.z - a2.pos.z); }
    if ((dress.urgeT -= dt) <= 0) {
      dress.urgeT = R(6, 9);
      const near = Math.hypot(a.pos.x - 1, a.pos.z - 3.3) < 2;
      say(pick([P, M]), near ? pick(['Na végre! Gyerünk, indulás!', 'Nyisd az ajtót, Petyus!']) : pick(['Petyus, gyere már! Elkésünk!', 'Cipő, táska, indulás!', 'Petyus! Várunk az ajtóban!', 'Gyere már, Petyus, mindjárt nyolc óra!']), 2.6);
      if (Math.random() < 0.5) P.point = 1.2;
    }
  }
  return true;
}
// the front door (ep2.js leaveMorning): what still keeps them in
export const leaveBlock = () => (!dress.top ? 'dress' : dress.parents !== 'door' ? 'parents' : null);
export function hurryParents() { if (dress.parents === 'home') dress.readyT = 0; }

// ---------------------------------------------------------------- saving (ep2.js saveEp2 / loadEp2)
export const dressSave = () => ({ top: dress.top, parents: dress.parents === 'home' ? 'home' : 'door' });
export function dressLoad(st) {
  if (!st) return;
  if (st.top && TOPS[st.top] !== undefined) { dress.top = st.top; dressClothes(rigs.foci, TOPS[st.top]); }
  if (st.parents === 'door') {
    dressClothes(rigs.petya); dressClothes(rigs.angi); dress.parents = 'door'; dress.urgeT = 3;
    G.petya.sit = G.petya.sitTarget = 0; G.petya.place(SPOT.dadDoor[0], SPOT.dadDoor[1], -Math.PI / 2); G.angi.place(SPOT.momDoor[0], SPOT.momDoor[1], -Math.PI / 2);
  }
}
