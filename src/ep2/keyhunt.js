// Petyus kalandjai – 2. rész, csibészség: „Hol a kulcs, Angi?” (r2-kulcs).
// Angi's keys lie on the shoe cabinet in the hallway (inventory.js: the 'key' on the 'shoe' place). Petyus picks them up (E)
// and hides them (F) – anywhere a thing can go, plus a coat's pocket, under the sofa's cushion, in the armchair, in the washing
// machine, in Karcsi's cage. 20 seconds after the keys are gone, mum starts looking: she goes round the „sensible” places
// first (shoe cabinet → coat → counter → table → sofa → armchair → TV → desk …) and the odd ones last (WC, bath, microwave,
// fridge, washing machine, cage), rummaging at each, more and more upset. Petyus may tip her off (E next to her) – she goes
// straight there, but she smells a rat. Found in an odd place: „A kulcsom… a HŰTŐBEN?! … PETYA!!” – she blames dad.
// The search makes them late: 5 … 20 minutes, by its length.
// Stars: ★ she starts looking · ★★ for more than 2 minutes · ★★★ the keys were somewhere odd and nobody gave them away.
import { noise, soundAt, tone } from '../audio.js';
import { award } from '../mischief.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { clamp, pick } from '../util.js';
import { FY, SPOTS, doors, toggleDoor } from './home.js';
import { carrying, itemPlace, moveItem } from './inventory.js';
import { findPath } from './navgrid.js';
import { addLate } from './ep2.js';
import { momBusy } from './runaway.js';

// where mum stands to look (and what the place is called „in” it)
const PLACES = {
  shoe: { x: 1.62, z: 3.5, in: 'a cipősszekrényen' }, coat: { x: 0.85, z: 3.55, in: 'a kabátzsebben' }, counter: { x: 8.2, z: 0.95, in: 'a konyhapulton' },
  table: { x: 10.4, z: 2.95, in: 'az asztalon' }, sofa: { x: 12.4, z: 7.95, in: 'a kanapén' }, armchair: { x: 8.3, z: 6.7, in: 'a fotelben' },
  tv: { x: 8.3, z: 8.2, in: 'a tévéállványon' }, desk: { x: 14.6, z: 1.6, in: 'az íróasztalon' }, wc: { x: 4.5, z: 1.15, in: 'a WC-tartályon' },
  tub: { x: 1.15, z: 1.45, in: 'a kádban' }, micro: { x: 6.5, z: 1.0, in: 'a MIKRÓBAN' }, fridge: { x: 6.6, z: 1.6, in: 'a HŰTŐBEN' },
  washer: { x: 1.45, z: 0.95, in: 'a MOSÓGÉPBEN' }, cage: { x: 14.45, z: 0.85, in: 'KARCSI KALITKÁJÁBAN' },
};
const ORDER = ['shoe', 'coat', 'counter', 'table', 'sofa', 'armchair', 'tv', 'desk', 'wc', 'tub', 'micro', 'fridge', 'washer', 'cage'];
const ODD = new Set(['wc', 'tub', 'micro', 'fridge', 'washer', 'cage']);
const WAIT = 20, RUMMAGE = 3.2;
const LINES = ['Itt volt! Itt volt a kezemben!', 'Petya, te tetted el?!', 'Ez a ház megeszi a kulcsaimat!', 'Mindjárt elkésünk…', 'Nem igaz, hogy nincs sehol!', 'Mindig ide teszem!'];
const NOT_HERE = ['Itt sincs…', 'Ez nem az.', 'Hm. Nem.', 'Itt se!'];

export const kh = { phase: 'off', waitT: 0, t: 0, i: 0, at: null, rumT: 0, lineT: 6, hint: false };
export const keyBusy = () => kh.phase === 'search' || kh.phase === 'found';

const passDoors = () => new Set(doors.filter((d) => d.pivot && d.kind !== 'locked').map((d) => d.col));
function walkTo(x, z) { const m = G.angi, p = findPath(m.pos.x, m.pos.z, x, z, passDoors()); m.walkTo(p && p.length ? p : [[x, z]], 1.05); }
function goNext() {
  if (kh.i >= ORDER.length) {   // everywhere looked: is it in Petyus's pocket?
    if (carrying('key')) { kh.at = 'petyus'; walkTo(G.petike.pos.x, G.petike.pos.z + 0.6); return; }
    kh.i = 0;
  }
  kh.at = ORDER[kh.i++]; const s = PLACES[kh.at]; walkTo(s.x, s.z); kh.rumT = 0;
}
// E next to mum while she is looking (ep2.js): „Anya, nem … van?” – she goes straight there (and wonders how he knew)
export function keyHintLabel() {
  if (kh.phase !== 'search' || kh.hint) return null;
  const pl = itemPlace('key'); if (!pl || !PLACES[pl]) return null;
  const d = Math.hypot(G.petike.pos.x - G.angi.pos.x, G.petike.pos.z - G.angi.pos.z); if (d > 1.4) return null;
  return `E – Anya, nem ${PLACES[pl].in.toLowerCase()} van?`;
}
export function giveKeyHint() {
  const pl = itemPlace('key'); if (!pl || !PLACES[pl]) return;
  kh.hint = true; say(G.petike, `Anya, nem ${PLACES[pl].in.toLowerCase()} van?`, 2.2);
  setTimeout(() => say(G.angi, 'Hm? Megnézem…', 1.6), 1500);
  kh.i = ORDER.indexOf(pl); goNext();
}

function rummagePose(k) {   // bent over, the hands busy in front of her
  const r = G.angi.rig, w = Math.sin(G.clockT * 9);
  r.inner.rotation.x = 0.45 * k;
  r.sh[0].rotation.x = -1.0 * k + w * 0.25 * k; r.sh[1].rotation.x = -1.0 * k - w * 0.25 * k;
  G.angi.sync();
}
function found(where) {
  kh.phase = 'found'; kh.t2 = 0;
  const odd = ODD.has(where), m = G.angi, d = G.petya;
  moveItem('key', 'shoe');   // back where it belongs (she puts them in her pocket – they turn up there again)
  soundAt(m.pos.x, m.pos.z, () => { noise(0.25, 3500, 0.8, 0.12); tone('sine', 1200, 1600, 0.12, 0.05, 0.1); });
  if (where === 'petyus') { say(m, 'Petyus! Nálad van a kulcsom?!', 2.4); setTimeout(() => say(G.petike, '…Csak vigyáztam rá.', 2), 2000); }
  else if (odd) {
    say(m, `A kulcsom… ${PLACES[where].in}?! … PETYA!!`, 3);
    if (!kh.hint) {
      setTimeout(() => say(m, 'Megint te pakoltad el a bevásárlással együtt!', 2.8), 3000);
      setTimeout(() => say(d, 'Én?! Hozzá se nyúltam!', 2.2), 5600);
      setTimeout(() => { say({ headWorld: (o) => o.set(G.petike.pos.x, FY + 1.45, G.petike.pos.z) }, '♪ fütyül ♪', 2); [784, 880, 988, 880, 784].forEach((f, i) => tone('sine', f, f, 0.16, 0.04, i * 0.18)); }, 7600);
    }
  } else say(m, 'Na végre! Itt van!', 2);
  if (kh.hint) setTimeout(() => say(m, '…Honnan tudtad, Petyus?', 2.4), odd ? 3200 : 2000);
  const t = Math.round(kh.t);
  addLate(clamp(Math.round(5 + kh.t / 10), 5, 20));
  setTimeout(() => award('r2-kulcs', t, { odd: odd && where !== 'petyus', hint: kh.hint || where === 'petyus', where }), odd && !kh.hint ? 9000 : 4000);
}

// every frame (after the parents' update – ep2.js)
export function keyTick(dt) {
  const m = G.angi, pl = itemPlace('key'), gone = pl !== 'shoe';
  if (kh.phase === 'off' || kh.phase === 'done') { if (gone && !momBusy()) { kh.phase = 'wait'; kh.waitT = WAIT; } return; }
  if (kh.phase === 'wait') {
    if (!gone) { kh.phase = 'off'; return; }
    if ((kh.waitT -= dt) <= 0 && !momBusy()) {
      kh.phase = 'search'; kh.t = 0; kh.i = 0; kh.hint = false; kh.lineT = 5; G.angiSearching = true;
      say(m, 'Petya, nem láttad a kulcsomat? Mindjárt indulnunk kell!', 3);
      setTimeout(() => say(G.petya, 'Ott szokott lenni a cipősszekrényen.', 2.4), 2600);
      goNext();
    }
    return;
  }
  if (kh.phase === 'search') {
    kh.t += dt;
    // open the doors on her way (the path counts them passable)
    for (const d of doors) if (d.pivot && !d.open && d.kind !== 'locked' && Math.hypot(d.x - m.pos.x, d.z - m.pos.z) < 0.9) { toggleDoor(d); soundAt(d.x, d.z, () => noise(0.12, 1200, 1, 0.15)); }
    if ((kh.lineT -= dt) <= 0) { kh.lineT = 7 + Math.random() * 4; say(m, pick(LINES), 2.4); if (Math.random() < 0.3) setTimeout(() => say(G.petya, pick(['Nem én voltam!', 'Nézd meg a táskádban!', 'Nyugi, előkerül.']), 2), 2200); }
    if (!m.path) {
      if (kh.at === 'petyus') { found('petyus'); return; }
      kh.rumT += dt; rummagePose(Math.min(1, kh.rumT * 3));
      if (kh.rumT > 0.6 && Math.floor(kh.rumT * 2) !== Math.floor((kh.rumT - dt) * 2)) soundAt(m.pos.x, m.pos.z, () => noise(0.18, 1800 + Math.random() * 1500, 1, 0.05));
      if (kh.rumT > RUMMAGE) {
        if (itemPlace('key') === kh.at) { found(kh.at); return; }
        if (Math.random() < 0.5) say(m, pick(NOT_HERE), 1.4);
        goNext();
      }
    }
    return;
  }
  if (kh.phase === 'found') {   // back to the cooktop
    kh.t2 += dt;
    if (kh.t2 > 3 && !kh.back) { kh.back = true; walkTo(SPOTS.momCook.x, SPOTS.momCook.z); }
    if (kh.back && !m.path) { kh.phase = 'done'; kh.back = false; G.angiSearching = false; }
  }
}
