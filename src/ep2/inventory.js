// Petyus kalandjai – 2. rész: tárgyak felvétele és lerakása (leltár), a bögre megtöltése.
// Tárgyak: kontroller, WC-papír, bögre, tej, tejszín, tejszínhab, répa, Karcsi. E: a közeli tárgy felvétele; F (telefonon a gomb): a kiválasztott
// tárgy lerakása a közeli helyre, vagy a bögre töltése. 1–6 / Tab / kattintás a sávban: választás.
// Where things may go (a place: its hotspot, its slots – a parent group + a position in it –, what it accepts):
//   kontroller, WC-papír: TV-állvány, Petyus íróasztala, hűtő, mikró, kád (a papír a WC-tartályra is)
//   bögre: mikró, hűtő, étkezőasztal, TV-állvány, íróasztal, konyhapult
//   tej, tejszín, tejszínhab: hűtő (a második polc elejére), étkezőasztal, konyhapult
// A mug holds any of: tea (the teapot on the table), coffee (the coffee maker), milk, cream, whipped cream; F at the sink empties it.
import * as THREE from 'three';
import { noise, tone } from '../audio.js';
import { G } from '../state.js';
import { say, toast } from '../ui.js';
import { $ } from '../util.js';
import { fx, seating } from './appliances.js';
import { FY, homeRoot } from './home.js';
import { carrot as carrotModel, keyRing, toiletRoll } from './food.js';
import { CAGE, cageDoorOpen, cageFront, karcsiState, lureKarcsi, pigObj, putKarcsiBack, releaseKarcsi, setFloorCarrot } from './karcsi.js';
import { walkable } from './navgrid.js';

const ITEMS = [
  { id: 'controller', name: 'kontroller', icon: '🎮' },
  { id: 'paper', name: 'WC-papír', icon: '🧻' },
  { id: 'mug', name: 'bögre', icon: '☕' },
  { id: 'milk', name: 'tej', icon: '🥛' },
  { id: 'cream', name: 'tejszín', icon: '🍶' },
  { id: 'whip', name: 'tejszínhab', icon: '🍦' },
  { id: 'carrot', name: 'répa', icon: '🥕' }, { id: 'carrot2', name: 'répa', icon: '🥕' }, { id: 'carrot3', name: 'répa', icon: '🥕' },
  { id: 'karcsi', name: 'Karcsi', icon: '🐹' },
  { id: 'key', name: 'Angi kulcsa', icon: '🔑' },
];
const ACCEPT = {
  controller: ['tv', 'desk', 'fridge', 'micro', 'tub'],
  paper: ['tv', 'desk', 'fridge', 'micro', 'tub', 'wc'],
  mug: ['dad', 'micro', 'fridge', 'table', 'tv', 'desk', 'counter'],
  milk: ['fridge', 'table', 'counter'], cream: ['fridge', 'table', 'counter'], whip: ['fridge', 'table', 'counter'],
  carrot: ['fridge', 'table', 'counter', 'desk'], carrot2: ['fridge', 'table', 'counter', 'desk'], carrot3: ['fridge', 'table', 'counter', 'desk'], karcsi: [],
  // the key: anywhere – the usual places first, the odd ones (where nobody would look) last (keyhunt.js searches in that order)
  key: ['shoe', 'coat', 'counter', 'table', 'sofa', 'armchair', 'tv', 'desk', 'wc', 'tub', 'micro', 'fridge', 'washer', 'cage'],
};
const PLACE_NAME = { tv: 'a TV-állványra', desk: 'az íróasztalra', fridge: 'a hűtőbe', micro: 'a mikróba', tub: 'a kád szélére', table: 'az asztalra', dad: 'apa elé', shoe: 'a cipősszekrényre', coat: 'a kabátzsebbe', sofa: 'a kanapépárna alá', armchair: 'a fotelba', washer: 'a mosógépbe', cage: 'Karcsi kalitkájába', counter: 'a konyhapultra', wc: 'a WC-tartályra' };
const DRINK = { tea: 'tea', kave: 'kávé', tej: 'tej', tejszin: 'tejszín', hab: 'tejszínhab' };

const places = {};   // id → { hot: (p) => distance, slots: [{ parent, pos, item, only }], open?: () => bool }
const items = {};    // id → { ...ITEMS[i], obj, place, slot }
export const inv = { list: [], sel: -1, mug: {}, foamy: false };   // what Petyus carries (item ids), the selected one, what is in the mug; foamy: whipped cream was in it (until it is washed)
// what the creamy-coffee mischief (coffee.js) listens to: poured(what) – something into the mug; placed(id, place); emptied(); washed()
export const invHooks = {};
export const itemObj = (id) => items[id] && items[id].obj;
export const itemPlace = (id) => items[id] && items[id].place;
// a locked item cannot be picked up (dad holds the mug while he drinks)
export function lockItem(id, on) { if (items[id]) items[id].locked = on; }
// put a thing straight into a place (Angi takes her key back to the shoe cabinet; the key out of Petyus's hands)
export function moveItem(id, placeId) {
  const it = items[id]; if (!it) return;
  if (it.place) { places[it.place].slots[it.slot].item = null; it.place = null; }
  const i = inv.list.indexOf(id); if (i >= 0) { inv.list.splice(i, 1); inv.sel = Math.min(inv.sel, inv.list.length - 1); renderHud(); }
  const si = places[placeId].slots.findIndex((s) => !s.item && (!s.only || s.only === id)); if (si >= 0) put(id, placeId, si);
}
export const carrying = (id) => inv.list.includes(id);
// into Petyus's hands without a place (Karcsi, taken out of his cage or off the floor)
export function invTake(id) { if (!inv.list.includes(id)) { inv.list.push(id); inv.sel = inv.list.length - 1; renderHud(); tone('sine', 520, 780, 0.1, 0.05); } }
function invDrop(id) { const i = inv.list.indexOf(id); if (i >= 0) { inv.list.splice(i, 1); inv.sel = Math.min(inv.sel, inv.list.length - 1); renderHud(); } }
function putFloor(id, x, z) { places.floor.slots.push(slot(homeRoot, x, 0, z, id)); invDrop(id); put(id, 'floor', places.floor.slots.length - 1); }
let holding = false;

// ---------------------------------------------------------------- building
// only: the one thing it takes ('carrot': any carrot); rot: a fixed turn (else a little random one)
function slot(parent, x, y, z, only = null, rot = undefined) { return { parent, pos: new THREE.Vector3(x, y, z), item: null, only, rot }; }
const fits = (s, id) => !s.only || s.only === id || (s.only === 'carrot' && isCarrot(id));
export const isCarrot = (id) => /^carrot/.test(id || '');
const near = (x, z, r) => (p) => Math.hypot(p.x - x, p.z - z) - r;
const nearRect = (x0, z0, x1, z1, pad) => (p) => Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1)) - pad;
export function buildInventory() {
  const H = homeRoot;
  places.tv = { hot: near(8.3, 8.2, 1.0), slots: [slot(fx.tv.grp, -0.52, 0.5, 0.06, 'controller'), slot(fx.tv.grp, -0.25, 0.5, 0.12), slot(fx.tv.grp, 0.25, 0.5, 0.12), slot(fx.tv.grp, 0.35, 0.5, -0.12)] };
  places.desk = { hot: near(14.62, 1.45, 0.85), slots: [slot(fx.desk, -0.38, 0.77, 0.12), slot(fx.desk, -0.25, 0.77, 0.2), slot(fx.desk, 0.5, 0.77, -0.12), slot(fx.desk, 0.5, 0.77, 0.15)] };
  places.fridge = { hot: near(6.46, 1.5, 0.85), open: () => fx.fridge.isOpen(),
    // milk, cream, whipped cream: their own places on the second shelf (in front); the other places take anything
    slots: [slot(fx.fridge.grp, 0.1, 0.925, 0.08, 'milk'), slot(fx.fridge.grp, 0.2, 0.925, 0.08, 'cream'), slot(fx.fridge.grp, 0.31, 0.925, 0.08, 'whip'),
      slot(fx.fridge.grp, 0.3, 0.925, -0.15), slot(fx.fridge.grp, 0.15, 1.325, 0.06), slot(fx.fridge.grp, 0.32, 1.325, -0.14),
      slot(fx.fridge.grp, 0.21, 0.525, -0.03, 'carrot', 0), slot(fx.fridge.grp, 0.21, 0.525, 0.035, 'carrot', 0), slot(fx.fridge.grp, 0.21, 0.525, 0.1, 'carrot', 0)] };
  places.micro = { hot: near(6.45, 0.9, 0.75), open: () => fx.micro.isOpen(), slots: [slot(fx.micro.tt, 0, 0.012, 0)] };
  places.tub = { hot: near(1.1, 1.1, 0.8), slots: [slot(H, 0.73, 0.55, 1.25), slot(H, 0.73, 0.55, 0.85)] };
  places.table = { hot: nearRect(9.8, 1.5, 11.6, 2.4, 0.75), slots: [slot(H, 10.76, 0.77, 1.67), slot(H, 10.99, 0.77, 1.69), slot(H, 11.02, 0.77, 2.12), slot(H, 10.25, 0.77, 1.84)] };
  places.counter = { hot: (p) => Math.min(nearRect(5.42, 0, 10.1, 0.62, 0.75)(p), nearRect(5.42, 0, 6.02, 1.0, 0.75)(p)),
    slots: [slot(fx.micro.grp, 0.4, 0.016, 0.16, 'mug'), slot(H, 9.55, 0.93, 0.48), slot(H, 9.95, 0.93, 0.48), slot(H, 8.2, 0.93, 0.48), slot(H, 5.75, 0.93, 0.35), slot(H, 7.0, 0.93, 0.5)] };
  places.wc = { hot: near(4.5, 0.95, 0.8), slots: [slot(H, 4.38, 0.845, 0.13, 'paper')] };
  // places for Angi's key (only the key goes there): the shoe cabinet (its home), a coat's pocket on the hanger, under the
  // sofa's cushion, in the armchair, in the washing machine's drum, in Karcsi's cage (the door open)
  places.shoe = { hot: near(1.66, 3.6, 0.55), slots: [slot(H, 1.66, 0.9, 4.03, 'key')] };
  places.coat = { hot: near(0.8, 3.6, 0.55), slots: [slot(H, 0.85, 1.22, 4.08, 'key')] };
  places.sofa = { hot: nearRect(11.6, 8.25, 13.6, 9.2, 0.6), slots: [slot(H, 12.15, 0.42, 8.62, 'key')] };
  places.armchair = { hot: near(8.3, 6.8, 0.6), slots: [slot(H, 8.42, 0.43, 7.42, 'key')] };
  places.washer = { hot: near(1.45, 0.95, 0.6), slots: [slot(H, 1.45, 0.42, 0.33, 'key')] };
  places.cage = { hot: (p) => Math.hypot(p.x - cageFront().x, p.z - cageFront().z) - 0.75, open: () => cageDoorOpen(), slots: [slot(H, CAGE.x + 0.3, CAGE.y + 0.125, CAGE.z - 0.05, 'key')] };
  // dad's place at the table (only the mug): in reach it wins over the rest of the table
  places.dad = { hot: (p) => { const d = Math.hypot(p.x - 10.1, p.z - 2.0); return d < 1.0 ? d - 5 : 1; }, slots: [slot(H, 10.18, 0.77, 2.22, 'mug')] };
  // things put on the floor (the carrot for Karcsi): a new place each time
  places.floor = { hot: () => 1, slots: [] };
  // the things and where they start (Karcsi is in his cage – karcsi.js moves him; he is no place's)
  const objs = { controller: fx.tv.controller, paper: toiletRoll(), mug: fx.mug.obj, milk: fx.dairy.milk, cream: fx.dairy.cream, whip: fx.dairy.whip, carrot: carrotModel(), carrot2: carrotModel(), carrot3: carrotModel(), karcsi: pigObj(), key: keyRing() };
  for (const it of ITEMS) items[it.id] = { ...it, obj: objs[it.id], place: null, slot: null };
  put('controller', 'tv', 0, true); put('paper', 'wc', 0); put('mug', 'counter', 0, true);
  put('milk', 'fridge', 0, true); put('cream', 'fridge', 1, true); put('whip', 'fridge', 2, true); put('carrot', 'fridge', 6); put('carrot2', 'fridge', 7); put('carrot3', 'fridge', 8); put('key', 'shoe', 0);
  buildHud(); drawMug();
}
// put an item into a place's slot (keep: it is already there – keep its exact position / turn)
function put(id, placeId, si, keep = false) {
  const it = items[id], sl = places[placeId].slots[si];
  sl.item = id; it.place = placeId; it.slot = si;
  if (!keep || it.obj.parent !== sl.parent) { sl.parent.add(it.obj); it.obj.position.copy(sl.pos); it.obj.rotation.set(0, sl.rot !== undefined ? sl.rot : (Math.random() - 0.5) * 0.6, 0); }
}
const worldXZ = (o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return v; };

// ---------------------------------------------------------------- the HUD bar (top centre)
let hud = null;
function buildHud() {
  hud = document.createElement('div'); hud.id = 'inv';
  hud.style.cssText = 'position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:12;display:flex;gap:6px;pointer-events:auto;font:bold 14px "Patrick Hand",sans-serif;';
  document.body.appendChild(hud); renderHud();
}
function renderHud() {
  if (!hud) return;
  hud.textContent = '';
  hud.style.display = inv.list.length ? 'flex' : 'none';
  inv.list.forEach((id, i) => {
    const it = items[id], b = document.createElement('button');
    const extra = id === 'mug' ? mugText() : '';
    b.textContent = `${i + 1} ${it.icon} ${it.name}${extra}`;
    b.style.cssText = `border:2px solid ${i === inv.sel ? '#ffd166' : '#151515'};border-radius:10px;padding:3px 9px;cursor:pointer;color:#fff;font:inherit;background:${i === inv.sel ? 'rgba(255,122,61,.85)' : 'rgba(43,45,66,.75)'};`;
    b.onclick = (e) => { inv.sel = i; renderHud(); e.currentTarget.blur(); };
    hud.appendChild(b);
  });
}
const mugText = () => { const k = Object.keys(inv.mug).filter((x) => inv.mug[x]); return k.length ? ' (' + k.map((x) => DRINK[x]).join(', ') + ')' : inv.foamy ? ' (üres, habos)' : ' (üres)'; };
export function refreshMug() { drawMug(); renderHud(); }
export function selectItem(i) { if (i >= 0 && i < inv.list.length) { inv.sel = i; renderHud(); } }
export function cycleItem() { if (inv.list.length) { inv.sel = (inv.sel + 1) % inv.list.length; renderHud(); } }

// ---------------------------------------------------------------- the mug's look: drink colour, level, whipped cream on top
function drawMug() {
  const m = inv.mug, d = fx.mug.drink, n = Object.values(m).filter(Boolean).length;
  d.visible = !!(m.tea || m.kave || m.tej || m.tejszin);
  let c = new THREE.Color(m.kave ? 0x4b2e1a : m.tea ? 0xb5651d : 0xf6efe2);
  if ((m.kave || m.tea) && m.tej) c.lerp(new THREE.Color(0xf3e9dc), 0.45);
  if ((m.kave || m.tea) && m.tejszin) c.lerp(new THREE.Color(0xfff6e6), 0.3);
  d.material.color.copy(c);
  d.position.y = 0.04 + Math.min(4, n) * 0.011;
  fx.mug.foam.visible = !!m.hab || (inv.foamy && n === 0); fx.mug.foam.position.y = d.visible ? d.position.y + 0.004 : 0.03;
}

// ---------------------------------------------------------------- picking up (E) – called by ep2.js interactHome
// the nearest item within reach (not in a closed fridge / microwave; not the controller while it is in Petyus's hands)
// every item that can be picked up now, with its world position (the first-person view picks among them by aim)
export function pickables(p) {
  const out = [];
  for (const id in items) {
    const it = items[id]; if (!it.place) continue;
    const pl = places[it.place]; if (pl.open && !pl.open()) continue;
    if ((id === 'controller' && holding) || it.locked) continue;
    const w = worldXZ(it.obj); out.push({ item: it, w, d: Math.hypot(p.x - w.x, p.z - w.z) });
  }
  return out;
}
export function pickCandidate(p) {
  let best = null, bd = 0.75;
  for (const id in items) {
    const it = items[id]; if (!it.place) continue;
    const pl = places[it.place]; if (pl.open && !pl.open()) continue;
    if ((id === 'controller' && holding) || it.locked) continue;
    const w = worldXZ(it.obj), d = Math.hypot(p.x - w.x, p.z - w.z);
    if (d < bd) { bd = d; best = it; }
  }
  return best ? { item: best, d: bd } : null;
}
export function pickUp(it) {
  const sl = places[it.place].slots[it.slot]; sl.item = null; it.place = null; it.slot = null;
  it.obj.removeFromParent(); inv.list.push(it.id); inv.sel = inv.list.length - 1; renderHud();
  tone('sine', 520, 780, 0.1, 0.05);
}
export const pickLabel = (it) => `E – ${it.name} felvétele`;

// ---------------------------------------------------------------- the F action: pour / fill / empty / put down
const reachOf = (id, p) => { const it = items[id]; if (inv.list.includes(id)) return 0; if (!it.place) return 99; const pl = places[it.place]; if (pl.open && !pl.open()) return 99; const w = worldXZ(it.obj); return Math.hypot(p.x - w.x, p.z - w.z); };
export function invAction(p, look = null) {
  const id = inv.list[inv.sel]; if (!id) return null;
  // a source / spot counts when it is near (top view) – or, in the first-person view, when it is looked at
  const at = (x, y, z, r) => (look ? look(new THREE.Vector3(x, y + FY, z)) : Math.hypot(p.x - x, p.z - z) < r);
  const it = items[id];
  const fill = (what) => () => { if (inv.mug[what]) { toast(`Már van benne ${DRINK[what]}.`, 1.6); return; } inv.mug[what] = true; if (what === 'hab') inv.foamy = true; drawMug(); renderHud(); invHooks.poured?.(what); noise(0.5, 900, 0.8, 0.06); tone('sine', 700, 500, 0.3, 0.02); if (what === 'hab') { noise(0.4, 4000, 0.6, 0.08); say(G.petike, 'Pssszt! Hab!', 1.4); } };
  // the mug: tea from the teapot, coffee from the machine, empty it at the sink
  if (id === 'mug') {
    if (at(11.15, 0.84, 2.25, 0.85)) return { label: 'tea töltése a bögrébe', short: 'TEA', run: fill('tea') };
    if (look ? at(9.75, 1.05, 0.22) : Math.hypot(p.x - 9.75, p.z - 0.85) < 0.7) return { label: 'kávé a bögrébe', short: 'KÁVÉ', run: () => { fill('kave')(); tone('square', 200, 180, 0.6, 0.02); } };
    if (at(8.6, 0.85, 0.31, 0.7) && Object.values(inv.mug).some(Boolean)) return { label: 'bögre kiöntése', short: 'KIÖNT', run: () => { inv.mug = {}; drawMug(); renderHud(); noise(0.6, 600, 0.5, 0.08); invHooks.emptied?.(); } };
    // washing it under the running kitchen tap (an empty mug)
    if (at(8.6, 0.85, 0.31, 0.7) && fx.sinkTap && fx.sinkTap.on) return { label: inv.foamy ? 'bögre kimosása (még habos)' : 'bögre kimosása', short: 'MOSÁS', run: () => { inv.foamy = false; drawMug(); renderHud(); noise(0.9, 1500, 0.6, 0.08); noise(0.5, 3200, 0.8, 0.04, 0.4); toast('Tiszta a bögre.', 1.4); invHooks.washed?.(); } };
  }
  // milk / cream / whipped cream into the mug (the mug carried, or within reach)
  const mugOk = inv.list.includes('mug') ? true : (look ? (items.mug.place && (!places[items.mug.place].open || places[items.mug.place].open()) && look(worldXZ(items.mug.obj))) : reachOf('mug', p) < 0.9);
  if ((id === 'milk' || id === 'cream' || id === 'whip') && mugOk) {
    const what = { milk: 'tej', cream: 'tejszin', whip: 'hab' }[id];
    return { label: `${it.name} a bögrébe`, short: 'TÖLT', run: fill(what) };
  }
  // Karcsi: back into the open cage, or down on the floor (then he runs off – runaway.js)
  const front = (d) => ({ x: p.x + Math.sin(G.petike.heading) * d, z: p.z + Math.cos(G.petike.heading) * d });
  const cf = cageFront(), atCage = look ? look(new THREE.Vector3(CAGE.x, FY + 1.0, CAGE.z), 0.35) : Math.hypot(p.x - cf.x, p.z - cf.z) < 0.9;
  if (id === 'karcsi') {
    if (atCage && !cageDoorOpen()) return { label: 'Karcsi: előbb nyisd ki a kalitkát', short: 'ZÁRVA', run: () => tone('sine', 300, 200, 0.1, 0.04) };
    if (atCage) return { label: 'Karcsi vissza a kalitkába', short: 'KALITKA', run: () => { invDrop('karcsi'); putKarcsiBack(); invHooks.karcsiBack?.('petyus'); } };
    return { label: 'Karcsi letétele a padlóra', short: 'LETESZ', run: () => {
      const f = front(0.35), q = walkable(f.x, f.z) ? f : p; invDrop('karcsi'); releaseKarcsi(q.x, q.z); invHooks.karcsiFree?.();
    } };
  }
  // the carrot: offered at the open cage (Karcsi comes to the door), or put down on the floor when there is nowhere else
  if (isCarrot(id) && atCage && cageDoorOpen() && karcsiState().where === 'cage') return { label: 'répa felkínálása Karcsinak', short: 'RÉPA', run: () => { lureKarcsi(); say(G.petike, 'Gyere, Karcsi! Répa!', 1.8); } };
  // the mug to dad: standing next to him (top view) or looking at him (first person) is enough – it goes to his place
  if (id === 'mug' && G.petya && !places.dad.slots[0].item) {
    const d = G.petya, chest = new THREE.Vector3(d.pos.x, FY + 0.95, d.pos.z);
    if (look ? look(chest, 0.4) : Math.hypot(p.x - d.pos.x, p.z - d.pos.z) < 1.4) return { label: 'bögre odaadása apának', short: 'ODAAD', run: () => {
      inv.list.splice(inv.sel, 1); inv.sel = Math.min(inv.sel, inv.list.length - 1); put('mug', 'dad', 0); renderHud(); tone('sine', 600, 420, 0.1, 0.05); invHooks.placed?.('mug', 'dad');
    } };
  }
  // put it down: the nearest place within reach that takes it and has a free slot
  // (an open place wins over a closed one – a closed fridge / microwave only gives the hint when nothing else is in reach)
  let best = null, bd = 0, bestOpen = true;
  for (const pid of ACCEPT[id]) {
    const pl = places[pid];
    // top view: the place's area; first-person view: one of its slots looked at
    const d = look ? (pl.slots.some((s) => { s.parent.updateMatrixWorld(true); return look(s.parent.localToWorld(s.pos.clone())); }) ? -1 : 1) : pl.hot(p); if (d > 0) continue;
    const si = pl.slots.findIndex((s) => !s.item && fits(s, id));
    const anyFree = si >= 0 ? si : pl.slots.findIndex((s) => !s.item && !s.only);
    if (anyFree < 0) continue;
    const isOpen = !pl.open || pl.open();
    if (!best || (isOpen && !bestOpen) || (isOpen === bestOpen && d < bd)) { bd = d; best = { pid, si: anyFree }; bestOpen = isOpen; }
  }
  if (!best) {
    if (isCarrot(id)) return { label: 'répa letétele a padlóra', short: 'LETESZ', run: () => { const f = front(0.55), q = walkable(f.x, f.z) ? f : front(0.3); putFloor(id, q.x, q.z); tone('sine', 600, 420, 0.1, 0.05); } };
    return null;
  }
  const pl = places[best.pid];
  if (pl.open && !pl.open()) return { label: `${it.name}: előbb nyisd ki ${best.pid === 'fridge' ? 'a hűtőt' : best.pid === 'cage' ? 'a kalitkát' : 'a mikrót'}`, short: 'ZÁRVA', run: () => tone('sine', 300, 200, 0.1, 0.04) };
  // dairy into the fridge: its own place in the door if free
  let si = best.si; if (best.pid === 'fridge') { const own = pl.slots.findIndex((s) => s.only && fits(s, id) && !s.item); if (own >= 0) si = own; else si = pl.slots.findIndex((s) => !s.item && !s.only); }
  return { label: `${it.name} lerakása ${PLACE_NAME[best.pid]}`, short: 'LERAK', run: () => {
    inv.list.splice(inv.sel, 1); inv.sel = Math.min(inv.sel, inv.list.length - 1); put(id, best.pid, si); renderHud(); tone('sine', 600, 420, 0.1, 0.05); invHooks.placed?.(id, best.pid);
  } };
}

// ---------------------------------------------------------------- every frame: the controller in Petyus's hands while he plays
export function holdingController() { return holding; }
export function updateInventory() {
  const c = items.controller; if (!c) return;
  const want = seating.on && fx.tv.xboxOn() && G.petike.sit > 0.8 && (c.place === 'tv' || inv.list.includes('controller'));
  if (want && !holding) {
    holding = true; G.petike.rig.root.add(c.obj); c.obj.position.set(0, 0.68, 0.2); c.obj.rotation.set(-0.55, Math.PI, 0);
  } else if (!want && holding) {
    holding = false;
    if (inv.list.includes('controller')) c.obj.removeFromParent();
    else { const sl = places[c.place].slots[c.slot]; sl.parent.add(c.obj); c.obj.position.copy(sl.pos); c.obj.rotation.set(0, 0.35, 0); }
  }
  if (hud) hud.style.visibility = G.mode === 'play' ? 'visible' : 'hidden';
  // Karcsi smells the carrot on the floor
  // (the nearest of the carrots lying on the floor)
  const kp = karcsiState(); let near = null, nd = 1e9;
  for (const id of ['carrot', 'carrot2', 'carrot3']) { const c = items[id]; if (!c || c.place !== 'floor') continue; const d = Math.hypot(c.obj.position.x - kp.x, c.obj.position.z - kp.z); if (d < nd) { nd = d; near = { x: c.obj.position.x, z: c.obj.position.z }; } }
  setFloorCarrot(near);
}
export { FY };
