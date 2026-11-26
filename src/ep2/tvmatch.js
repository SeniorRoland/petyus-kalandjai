// Petyus kalandjai – 2. rész, esti csibészség: „Meccs vagy sorozat?” (r2-meccs).
// At 20:00 dad sits down in the armchair in front of the TV (the parents' room) to watch the match; mum waits for her soap at
// half past eight. The remote lies on the TV stand (inventory.js: 'remote'). Petyus takes it; F switches the channel
// (inventory.js invHooks.action) while it is in his hands near the TV.
//   · dad is watching → he sees it: „Add ide azt a távirányítót!” – back to the match (caught: no stars)
//   · dad is away (twice he goes for a glass of water) → when he is back: „Hol a meccs?!” – he looks for the remote: in
//     Petyus's hands → Petyus is blamed; otherwise mum („Te kapcsoltál át?!”) – she is glad: her soap        ★
//   · at the penalty (20:20, dad on his feet: „Na… NA… NAAA…”) → he sees the soap's kiss instead, drops to his knees
//     („NEEEE!!”), the neighbours' „GÓÓÓL!” through the wall; then he looks round: the remote in Petyus's hands →
//     „PETYUUUS!!”; not → „ANGIII!!”                                                                         ★★ / ★★★
// At 20:42 the match is over: the TV goes off, dad goes back to his chair at the table.
import { noise, soundAt, tone } from '../audio.js';
import { award } from '../mischief.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { lerp, pick } from '../util.js';
import { fx, seating } from './appliances.js';
import { FY, SPOTS, doors, roomAt, toggleDoor } from './home.js';
import { carrying, invHooks, moveItem } from './inventory.js';

const T0 = 20 * 60, T_WATER = [20 * 60 + 9, 20 * 60 + 29], T_PEN = 20 * 60 + 19, T_END = 20 * 60 + 42;
const TAP = { x: 8.6, z: 0.95, h: Math.PI };
export const tm = { st: 'off', t: 0, water: 0, penDone: false, switched: false, caught: false, lineT: 8, standing: false, gagged: false, blamed: null };
export const tvBusy = () => !['off', 'done'].includes(tm.st);

function go(a, x, z, speed) { a.walkTo([[x, z]], speed); }   // (the way: round the walls, down the middle – ep2.js / navgrid.js navRoute)
const tvSay = (txt, d = 1.8) => say({ headWorld: (o) => o.set(8.3, FY + 1.75, 8.95) }, txt, d);
const wallSay = (txt, d = 1.8) => say({ headWorld: (o) => o.set(9.6, FY + 2.0, 9.4) }, txt, d);
const petyusNear = (r) => Math.hypot(G.petike.pos.x - G.petya.pos.x, G.petike.pos.z - G.petya.pos.z) < r;

// ---------------------------------------------------------------- F with the remote in his hands, near the TV: switch over
invHooks.action = ((prev) => (id, p, look) => {
  if (id !== 'remote') return prev ? prev(id, p, look) : null;
  if (!fx.tv || !fx.tv.isOn() || fx.tv.xboxOn()) return null;
  const r = roomAt(p.x, p.z); if (!r || r.id !== 'szulok') return null;
  const to = fx.tv.channel() === 'match' ? 'series' : 'match';
  return { label: to === 'series' ? 'átkapcsolás a sorozatra' : 'átkapcsolás a meccsre', short: 'KAPCSOL', run: () => { fx.tv.setChannel(to); tone('square', 1500, 1500, 0.04, 0.04); switched(to); } };
})(invHooks.action);

function switched(to) {
  if (to === 'match') { tm.switched = false; return; }   // (switched back before dad saw it)
  if (tm.st === 'off' || tm.st === 'done' || tm.st === 'home') return;
  if (tm.st === 'penalty') { penaltyGag(); return; }
  if (tm.st === 'watch' || tm.st === 'react') {   // he is right there: back to the match, the remote taken away
    const d = G.petya; say(d, pick(['Hé! Petyus! Add ide azt a távirányítót!', 'Petyus! Meccs van! Kapcsold vissza!']), 2.4); d.point = 1.6;
    setTimeout(() => { moveItem('remote', 'tv'); fx.tv.setChannel('match'); }, 1400);
    tm.caught = true; return;
  }
  tm.switched = true;   // he is away: he will see it when he is back
}

// ---------------------------------------------------------------- dad's poses
function kneel(a, k) { const r = a.rig; r.inner.position.y -= 0.45 * k; for (let i = 0; i < 2; i++) { r.knee[i].rotation.x = lerp(r.knee[i].rotation.x, 1.6, k); r.hip[i].rotation.x = lerp(r.hip[i].rotation.x, -0.2, k); r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -2.6, k); } a.sync(); }
function tense(a) { const r = a.rig, w = Math.sin(G.clockT * 6) * 0.1; for (let i = 0; i < 2; i++) { r.sh[i].rotation.x = -1.1 + w; r.elbow[i] = 1.6; } r.inner.rotation.x = 0.15; a.sync(); }
function sitInChair(a) {
  if (seating.on) { a.place(seating.x, seating.z - 0.85, 0); a.sitTarget = 0; tm.standing = true; return; }   // Petyus is in it: dad stands behind
  seating.taken = true; tm.standing = false;
  a.place(seating.x, seating.z, seating.h); a.pos.y = FY; a.seatH = seating.seatH; a.sitTarget = 1;
}
function leaveChair(a) { a.sitTarget = 0; seating.taken = false; }

// ---------------------------------------------------------------- the penalty with the soap on
function penaltyGag() {
  tm.st = 'gag'; tm.t = 0; fx.tv.setPenalty(false);
  const d = G.petya; say(d, 'NEEEEEE!!', 2); soundAt(d.pos.x, d.pos.z, () => tone('sawtooth', 320, 120, 0.8, 0.12));
  setTimeout(() => { wallSay('GÓÓÓÓL!', 2); noise(1.4, 700, 0.4, 0.05); }, 1300);
}
function finishAward(v) {
  // (every success counts: the journal keeps the best – the switch while he was away, then the penalty)
  const x = { penalty: tm.gagged, angi: tm.blamed === 'angi' };
  setTimeout(() => award('r2-meccs', v, x), 3500);
}

// ---------------------------------------------------------------- every frame (the evening – ep2.js)
export function tvTick(dt, min, dadFree) {
  const d = G.petya; tm.t += dt;
  if (tm.st === 'off') {
    if (min >= T0 && min < T_END - 5 && dadFree()) {
      tm.st = 'toChair'; tm.t = 0; d.sitTarget = 0;
      say(d, 'Na, kezdődik a meccs! Real–Barca!', 2.6);
      setTimeout(() => say(G.angi, 'Petya, fél kilenckor átkapcsolsz, ugye? A sorozatom!', 3), 2800);
      setTimeout(() => say(d, 'Persze, persze…', 1.8), 6200);
    }
    return;
  }
  if (tm.st === 'done') return;
  // the match is over
  if (min >= T_END && ['watch', 'toWater', 'drink', 'back'].includes(tm.st)) {
    leaveChair(d); fx.tv.setOn(false); fx.tv.setChannel('match'); fx.tv.setPenalty(false);
    say(d, tm.gagged ? 'Ez a meccs… ezt sosem bocsátom meg.' : 'Na, vége. Megyek vissza.', 2.4);
    tm.st = 'home'; tm.t = 0; const s = SPOTS.dadChair; go(d, s.x - 0.4, s.z, 1.1); return;
  }
  switch (tm.st) {
    case 'toChair':
      if (tm.t > 0.8 && !d.path && !tm.walking) { tm.walking = true; go(d, seating.x + 0.65, seating.z, 1.2); }
      if (tm.walking && !d.path) {
        tm.walking = false; sitInChair(d); fx.tv.setOn(true); fx.tv.setChannel('match');
        tvSay('Real Madrid – Barcelona, élőben!', 2.2); tm.st = 'watch'; tm.t = 0;
      }
      break;
    case 'watch':
      if (tm.standing) d.targetHeading = 0;
      if ((tm.lineT -= dt) <= 0) { tm.lineT = 9 + Math.random() * 7; say(d, pick(['Gyerünk, Madrid!', 'Ezt nem hiszem el… lesen volt!', 'Passzold már!', 'Bíró! Hol a sárga?!', 'Na, ez az!']), 2); }
      if (!tm.penDone && min >= T_PEN && fx.tv.channel() === 'match') {
        tm.penDone = true; tm.st = 'penalty'; tm.t = 0; fx.tv.setPenalty(true); leaveChair(d);
        tvSay('TIZENEGYES!', 2); say(d, 'TIZENEGYES! Na… NA…', 2.2);
        break;
      }
      if (tm.water < T_WATER.length && min >= T_WATER[tm.water]) {
        tm.water++; leaveChair(d); say(d, pick(['Hozok egy pohár vizet.', 'Kiszáradtam ettől a meccstől…']), 2);
        tm.st = 'toWater'; tm.t = 0; tm.walking = false;
      }
      break;
    case 'penalty':   // ≈ 12 s on his feet, tense
      if (tm.t > 0.5) tense(d);
      if (tm.t > 4 && tm.t - dt <= 4) say(d, 'NAAAA…', 1.8);
      if (tm.t > 12) {
        fx.tv.setPenalty(false); tvSay('GÓÓÓL!', 1.8); noise(2.0, 800, 0.3, 0.1);
        d.cheer = 2; say(d, 'GÓÓÓL!! IGEEEN!!', 2); sitInChair(d); tm.st = 'watch'; tm.t = 0;
      }
      break;
    case 'gag':   // on his knees, then he looks round
      kneel(d, Math.min(1, tm.t * 3) * (tm.t < 6 ? 1 : Math.max(0, 1 - (tm.t - 6) * 2)));
      if (tm.t > 3.6 && tm.t - dt <= 3.6) {
        d.targetHeading = Math.atan2(G.petike.pos.x - d.pos.x, G.petike.pos.z - d.pos.z);
        tm.gagged = true;
        if (carrying('remote') && petyusNear(4.5)) { tm.blamed = 'petyus'; say(d, 'PETYUUUS!!! A TIZENEGYESNÉL?!', 2.8); d.point = 2.5; }
        else {
          tm.blamed = 'angi'; say(d, 'ANGIII!! Te kapcsoltál át?! A TIZENEGYESNÉL?!', 3);
          setTimeout(() => say(G.angi, 'Én? …Jaj, de jó, kezdődik a sorozatom!', 2.6), 3200);
          setTimeout(() => say({ headWorld: (o) => o.set(G.petike.pos.x, FY + 1.45, G.petike.pos.z) }, '♪ fütyül ♪', 2), 5800);
        }
        finishAward(2 + (tm.blamed === 'angi' ? 1 : 0));
      }
      if (tm.t > 8) { moveItem('remote', 'tv'); fx.tv.setChannel('match'); sitInChair(d); tm.st = 'watch'; tm.t = 0; tm.lineT = 12; }
      break;
    case 'toWater':
      if (tm.t > 0.8 && !tm.walking) { tm.walking = true; go(d, TAP.x, TAP.z, 1.3); }
      if (tm.walking && !d.path) { tm.walking = false; tm.st = 'drink'; tm.t = 0; d.targetHeading = TAP.h; if (fx.sinkTap) fx.sinkTap.on = true; }
      break;
    case 'drink':
      if (tm.t > 3.5) { if (fx.sinkTap) fx.sinkTap.on = false; say(d, 'Ahh.', 1.2); tm.st = 'back'; tm.t = 0; go(d, seating.x + 0.65, seating.z, 1.3); }
      break;
    case 'back':
      if (!d.path) {
        sitInChair(d);
        if (fx.tv.channel() === 'series' && fx.tv.isOn()) {   // somebody switched over while he was away
          tm.st = 'react'; tm.t = 0; say(d, 'MI EZ?! Hol a meccs?!', 2.4);
        } else { tm.st = 'watch'; tm.t = 0; }
      }
      break;
    case 'react':
      if (tm.t > 2.6 && tm.t - dt <= 2.6) {
        if (carrying('remote') && petyusNear(5)) { tm.blamed = 'petyus'; say(d, 'Petyus! Nálad van a távirányító?! Add csak ide!', 2.8); }
        else { tm.blamed = 'angi'; say(d, 'Angi! Te kapcsoltál át?!', 2.4); setTimeout(() => say(G.angi, 'Én? …De jó! Kezdődik a sorozatom!', 2.6), 2600); }
        if (tm.switched) finishAward(1);
      }
      if (tm.t > 6) { moveItem('remote', 'tv'); fx.tv.setChannel('match'); tm.switched = false; tm.st = 'watch'; tm.t = 0; tm.lineT = 10; }
      break;
    case 'home':
      if (!d.path) { const s = SPOTS.dadChair; d.place(s.x, s.z, s.h); d.pos.y = FY; d.seatH = 0.45; d.sitTarget = 1; tm.st = 'done'; }
      break;
  }
}
