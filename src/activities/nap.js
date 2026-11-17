// Petyus kalandjai – activities/nap: 2. csibészség – „A szundikáló apa”.
// After a quiet while on the bench dad dozes off and snores. Petyus sneaks up: „E – Torony apa fejére” → a timing game:
// a marker sways across a bar, press SPACE / E while it is in the green zone to put the next item on dad's head.
// The zone narrows as the tower grows, big snores shake it. A miss → the tower falls, dad wakes: „Ki volt az?!”.
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { noise, sSnore, soundAt, tone } from '../audio.js';
import { dad } from '../dad.js';
import { award } from '../mischief.js';
import { pvel } from '../player.js';
import { scene } from '../scene.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { $, R, V3, clamp, dampAngle, pick, rand } from '../util.js';
import { partMesh } from '../world.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';

export const DOZE_AFTER = 30;   // s of quiet on the bench before dad nods off
const WAKE_AFTER = 80;          // …and he wakes up on his own after this long
const ITEMS = [   // what goes on his head, bottom to top (h = height of the item)
  { name: 'toboz', icon: '🌰', h: 0.13, mk: (b) => { b.bx(0, 0.065, 0, 0.1, 0.13, 0.1, 0x7a4a24, 0, 0.08); b.bx(0, 0.135, 0, 0.05, 0.03, 0.05, 0x5a3418, 0, 0); } },
  { name: 'falevél', icon: '🍂', h: 0.03, mk: (b) => { b.bx(0, 0.015, 0, 0.24, 0.02, 0.14, 0xd2691e, 0, 0.1); b.bx(0.08, 0.025, 0, 0.1, 0.01, 0.02, 0x8b4513, 0, 0); } },
  { name: 'kavics', icon: '🪨', h: 0.08, mk: (b) => b.bx(0, 0.04, 0, 0.16, 0.08, 0.12, 0x9a9a9a, 0, 0.1) },
  { name: 'toboz', icon: '🌰', h: 0.13, mk: (b) => { b.bx(0, 0.065, 0, 0.1, 0.13, 0.1, 0x6e4220, 0, 0.08); } },
  { name: 'virág', icon: '🌼', h: 0.1, mk: (b) => { b.bx(0, 0.04, 0, 0.02, 0.08, 0.02, 0x3a8f3a, 0, 0); b.bx(0, 0.09, 0, 0.1, 0.03, 0.1, 0xffd23f, 0, 0); b.bx(0, 0.1, 0, 0.04, 0.02, 0.04, 0xc2410c, 0, 0); } },
  { name: 'falevél', icon: '🍃', h: 0.03, mk: (b) => b.bx(0, 0.015, 0, 0.22, 0.02, 0.13, 0x6bbf4e, 0, 0.1) },
  { name: 'gesztenye', icon: '🌰', h: 0.09, mk: (b) => { b.bx(0, 0.045, 0, 0.1, 0.09, 0.1, 0x6b3a1e, 0, 0.05); b.bx(0, 0.02, 0, 0.06, 0.03, 0.06, 0xd8b98a, 0, 0); } },
  { name: 'kavics', icon: '🪨', h: 0.07, mk: (b) => b.bx(0, 0.035, 0, 0.13, 0.07, 0.11, 0x7f8790, 0, 0.1) },
  { name: 'pitypang', icon: '🌼', h: 0.12, mk: (b) => { b.bx(0, 0.05, 0, 0.02, 0.1, 0.02, 0x3a8f3a, 0, 0); b.bx(0, 0.11, 0, 0.08, 0.06, 0.08, 0xf2f2f2, 0, 0.05); } },
  { name: 'a labda', icon: '⚽', h: 0.34, mk: null },   // the real ball look-alike on top
];
const nap = { asleep: false, t: 0, snoreT: 2, loud: 0, jolt: 0, game: false, n: 0, phase: 0, tower: null, items: [], fallT: -1, msgT: 0 };

// ---------- dozing (dad.js calls these while petyaMode is 'doze')
export function canDoze() { return G.pstate === 'free' && G.petike.pos.distanceTo(G.petya.pos) > 3; }
export function startDoze() {
  G.petyaMode = 'doze'; nap.asleep = true; nap.t = 0; nap.snoreT = 2.5; nap.loud = 0;
  say(G.petya, pick(['Csak egy percre lehunyom a szemem…', 'Hú, de jó itt az árnyékban…', 'Petyus, apa most… csak pihen…']), 2.6);
}
export function updateDoze(dt) {
  const p = G.petya; nap.t += dt;
  // slumped: leaning back a bit, arms limp, chin up (only when he is actually sitting)
  if (p.sit > 0.95) { const r = p.rig; r.inner.rotation.x = -0.12; r.sh[0].rotation.x = -0.15; r.sh[1].rotation.x = -0.15; p.sync(); }
  nap.snoreT -= dt;
  if (nap.loud > 0) nap.loud -= dt;
  if (nap.snoreT <= 0 && nap.fallT < 0) {   // no more snoring once the tower has come down (he is awake by then)
    // a steady snore every ~3 s, now and then a big, loud snort (horkantás) that makes him jerk
    const big = rand() < 0.35; nap.snoreT = big ? R(3.4, 4.2) : R(2.9, 3.4); nap.loud = big ? 0.9 : 0;
    soundAt(p.pos.x, p.pos.z, () => sSnore(big), big ? 2.6 : 1.7);
    if (big) { say(p, pick(['HRRRK!', 'HRRRR-PFFF!', 'HORRRK!!', 'HRRRRRR!']), 1.2); nap.jolt = 0.35; }
    else if (rand() < 0.6) say(p, pick(['Zzz…', 'Hrrr… zzz…', 'Mmm… gól…', 'Zzz… a térdem…', 'Hrrr… pfff…']), 1.6);
  }
  if (nap.jolt > 0) {   // the snort jerks his head and shoulders up
    nap.jolt -= dt; const k = Math.sin(Math.max(0, nap.jolt) / 0.35 * Math.PI);
    if (p.sit > 0.95) { const r = p.rig; r.inner.rotation.x = -0.12 - 0.22 * k; r.inner.position.y += 0.05 * k; r.sh[0].rotation.x = r.sh[1].rotation.x = -0.15 - 0.35 * k; p.sync(); }
  }
  if (!nap.game && nap.fallT < 0 && nap.t > WAKE_AFTER) wake(pick(['Hm? Nem aludtam! Csak pihentettem a szemem.', 'Mi? Nem horkoltam. Az egy galamb volt.']), false);
}
// called from dad.js every frame: tidy up if something else (e.g. the fountain alarm) took dad away mid-nap
export function napTick(dt) {
  if (nap.fallT >= 0) tickFall(dt);
  else if (nap.tower) placeTower();
  if (nap.asleep && G.petyaMode !== 'doze') { nap.asleep = false; if (nap.game) endGame(false); clearTower(); }
}

// ---------- the tower game
export function canTower() { return G.petyaMode === 'doze' && nap.asleep && !nap.game && nap.fallT < 0 && G.pstate === 'free' && G.petike.pos.distanceTo(G.petya.pos) < 1.9; }
export function startTower() {
  const a = G.petike, p = G.petya;
  G.pstate = 'tower'; nap.game = true; nap.n = 0; nap.phase = rand() * 6; nap.msgT = 0;
  pvel.set(0, 0, 0); G.charging = false; a.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  // Petyus tiptoes round behind the bench (the camera looks from the south-east, so he doesn't hide dad's head)
  a.pos.set(p.pos.x - 0.12, 0, p.pos.z - 0.72); a.heading = a.targetHeading = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z); a.sync();
  nap.tower = new THREE.Group(); scene.add(nap.tower); nap.items = [];
  say(a, pick(['Pszt… Most figyelj, anya!', 'Csitt… építkezünk.']), 2.0);
  runSeq([[1.6, () => { if (nap.game) say(G.angi, 'Petyus! Mit csinálsz?! …Hihi.', 2.0); }]]);
  towerUI(true); nextItem();
}
const zoneW = () => Math.max(0.1, 0.36 - nap.n * 0.026) * (nap.loud > 0 ? 0.65 : 1);
function nextItem() {
  const it = ITEMS[nap.n];
  $('twCount').textContent = `${nap.n} / ${ITEMS.length}`;
  $('twNext').textContent = it ? `${it.icon} következik: ${it.name}` : '';
}
function towerUI(show) { $('tower').style.display = show ? 'block' : 'none'; }
export function updateTower(dt) {
  const a = G.petike;
  const press = G.kickPressed || G.usePressed;
  G.kickPressed = G.kickReleased = false; G.usePressed = false; G.qPressed = false;
  a.heading = dampAngle(a.heading, Math.atan2(G.petya.pos.x - a.pos.x, G.petya.pos.z - a.pos.z), 8, dt); a.animate(dt, false, 0);
  if (nap.msgT > 0) { a.rig.sh[0].rotation.x = a.rig.sh[1].rotation.x = -2.2; a.rig.inner.position.y += 0.06; nap.msgT -= dt; }   // reaching up to place
  a.sync();
  if (!nap.game) return;
  // the marker sways faster as the tower grows; a big snore makes it jitter and the zone shrink
  nap.phase += dt * (2.0 + nap.n * 0.32);
  const m = clamp(Math.sin(nap.phase) + (nap.loud > 0 ? Math.sin(G.clockT * 37) * 0.18 : 0), -1, 1), w = zoneW();
  $('twMark').style.left = ((m + 1) * 50).toFixed(1) + '%';
  $('twZone').style.left = ((1 - w) * 50).toFixed(1) + '%'; $('twZone').style.width = (w * 100).toFixed(1) + '%';
  $('twZone').classList.toggle('shaky', nap.loud > 0);
  if (nap.tower) nap.tower.rotation.z = m * 0.05 * (1 + nap.n * 0.12);   // the tower sways with it
  if (!press) return;
  if (Math.abs(m) <= w) addItem();
  else topple('Leborult!');
}
function addItem() {
  const it = ITEMS[nap.n]; nap.msgT = 0.35;
  let mesh;
  if (it.mk) mesh = partMesh(it.mk);
  else {   // a little football
    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), new THREE.MeshLambertMaterial({ color: 0xf2f2f2, flatShading: true })); mesh.position.y = 0.17;
    const g = new THREE.Group(); g.add(mesh); mesh = g;
  }
  mesh.position.y = nap.items.reduce((s, x) => s + x.h, 0); mesh.rotation.y = R(-0.6, 0.6);
  nap.tower.add(mesh); nap.items.push({ mesh, h: it.h });
  tone('triangle', 520 + nap.n * 60, 760 + nap.n * 60, 0.09, 0.12);
  nap.n++; nextItem();
  if (nap.n === 3) say(G.petike, 'Pszt… még egy…', 1.4);
  if (nap.n === 5) say(G.angi, 'Hihi… Petya, ne mozdulj…', 1.8);
  if (nap.n === 7) say(G.petike, pick(['Csak óvatosan…', 'Ez lesz a világ legmagasabb apa-tornya!']), 1.8);
  if (nap.n === ITEMS.length) {   // finished: Angi takes a photo, then a mighty snore brings it all down anyway
    nap.game = false;
    runSeq([
      [0.4, () => { say(G.angi, 'Kattt! Ezt bekeretezem!', 2.0); flash(); }],
      [1.6, () => { say(G.petya, 'HRRRRRRR!!', 1.2); nap.loud = 1; }],
      [0.5, () => topple(null)],
    ]);
  }
}
function placeTower() {
  const v = G.petya.headWorld(new V3()); nap.tower.position.set(v.x, v.y - 0.27, v.z);
}
function clearTower() { if (nap.tower) { scene.remove(nap.tower); nap.tower = null; nap.items = []; } }
function flash() { const el = $('filmDip'); el.style.background = '#fff'; el.classList.add('on'); setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.style.background = ''; }, 200); }, 90); }
// the tower comes down: the items fly off, dad wakes up
function topple(msg) {
  const n = nap.n; nap.game = false; nap.fallT = 0;
  if (msg) { $('twNext').textContent = msg; }
  noise(0.5, 900, 0.7, 0.2); tone('square', 300, 90, 0.4, 0.05);
  for (const it of nap.items) it.v = new V3(R(-1.6, 1.6), R(1.5, 3), R(-1.6, 1.6));
  runSeq([
    [0.7, () => { say(G.petya, pick(['Mi?! KI VOLT AZ?!', 'Hé! Mi esett a fejemre?!', 'Ki volt az?! …Angi?!']), 2.2); }],
    [1.6, () => say(G.angi, '♪ Fiü-fiü… ♪', 1.8)],
    [1.4, () => say(G.petike, pick(['Én? Semmi! Csak a galambok voltak!', 'Senki! Biztos a szél!']), 2.2)],
    [1.4, () => { endGame(true, n); wake(pick(['Ezek a mai galambok…', 'Na, ennyi volt a szieszta.']), true); }],
  ]);
}
function tickFall(dt) {
  nap.fallT += dt;
  for (const it of nap.items) {
    if (!it.v) continue;
    it.v.y -= 9.8 * dt; it.mesh.position.addScaledVector(it.v, dt); it.mesh.rotation.x += dt * 6;
    const wp = it.mesh.getWorldPosition(new V3());
    if (wp.y < 0.05) { it.v = null; spawnFx(wp, new V3(0, 1, 0), 0xb8a98a, 0.06, 0.4, 2); }
  }
  if (nap.fallT > 4) { clearTower(); nap.fallT = -1; }
}
function endGame(scored, n = nap.n) {
  towerUI(false); nap.game = false;
  if (G.pstate === 'tower') G.pstate = 'free';
  if (scored) award('szundi', n);
}
function wake(line, quick) {
  nap.asleep = false; G.petyaMode = 'bench'; dad.benchT = -20; dad.talkT = 4;
  say(G.petya, line, 2.6);
  if (!quick) clearTower();
}
