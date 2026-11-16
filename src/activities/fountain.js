// Petike a parkban – activities/fountain: Ivás a szökőkútból – az apa leszidja és visszakergeti Petikét.
import { spawnFx } from '../actors.js';
import { tone } from '../audio.js';
import { dad, navTarget, petyaFront } from '../dad.js';
import { SEAT } from '../intro.js';
import { pvel } from '../player.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { $, R, V3, clamp, dampAngle, pick, rand } from '../util.js';
import { FOUNTAIN, GX0, GX1, GZ0, GZ1, collide } from '../world.js';
import { setPrompt } from './drinking.js';

// ---------- drinking from the FOUNTAIN (forbidden!) → dad runs over, lectures, chases Petike back to Angi
// pstate: toFountain → ftnDrink → caught → chased → atMom → free;  petyaMode: ftnStand → ftnRun → ftnScold → ftnChase → ftnWait → seat
const FTN_WAY = [22.6, -11.6];                       // round the pitch fence's north-west corner
export const ftnMom = () => [SEAT.angi[0], -11.15];         // in front of Angi on the family bench
export const ftn = { spot: null, t: 0, lineT: 0, count: 0, stuckT: 0, ghostT: 0, lastP: new V3(), path: null };
// tiny sequencer: [[delay, fn, untilFn?], …] – each step waits `delay` seconds (and until `untilFn()` is true), then runs fn.
// Several sequences may run at once (e.g. dad cursing while Petike talks to mom).
const seqs = [];
export function runSeq(steps) { seqs.push({ steps, i: 0, t: 0 }); }
export function tickSeq(dt) {
  for (let k = seqs.length - 1; k >= 0; k--) {
    const s = seqs[k]; s.t += dt; const st = s.steps[s.i];
    if (!st) { seqs.splice(k, 1); continue; }
    if (s.t >= st[0] && (!st[2] || st[2]())) { s.i++; s.t = 0; st[1](); }
  }
}
const FTN_SHOUT = ['PETIKEEE!!! Abból NE igyál!!', 'Állj! Az nem ivókút, az SZÖKŐKÚT!', 'Jaj ne… ne… NEEE! Petike!!'];
const FTN_SHOUT_AGAIN = ['MÁR MEGINT?!', 'Ezt nem hiszem el! MEGINT?!', 'Hányszor mondjam még?!'];
const FTN_RUN = ['A térdem… de most nem érdekel!', 'Köpd ki! KÖPD KI!', 'Tegye le mindenki, aki ezt látja!', 'Mindjárt ott vagyok!!'];
const FTN_SIP = ['Hmm… kicsit galambos íze van.', 'Ez pezsgőbb, mint az ivókút!', 'Glugy… van benne egy pénzérme!', 'Ez a legjobb víz a parkban!', 'Csak egy kortyot… meg még egyet…'];
const FTN_SCOLD = ['Tudod te, hány galamb fürdött ebben ma?!', 'Ebbe a fél város beledobta az aprópénzét!', 'Ez nem ivóvíz! Ez DÍSZVÍZ! DÍSZ-VÍZ!', 'Ha elrontod a gyomrod, ki visz orvoshoz? ÉN!', 'Láttam egy kutyát, aki ebből ivott. Az is megbánta!', 'Az ivókút ott van! Tíz méterre! TÍZ!'];
const FTN_EXCUSE = ['De ez szebb ivókút…', 'De szökőkút-íze van!', 'A galambok is ebből isznak…', 'Csak megkóstoltam!'];
const FTN_CHASE = ['Futás anyához! És ne nézz vissza!', 'Majd otthon megbeszéljük!', 'Ezt elmondom a nagymamának!', 'Kiköpni! … Mindegy, már késő.', 'Az ivókút! Az IVÓKÚT a barátod!', 'Gyerünk, gyerünk, anyához!'];
export function startFountain() {
  G.pstate = 'toFountain'; pvel.set(0, 0, 0); G.charging = false; G.petike.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  const dx = G.petike.pos.x - FOUNTAIN.x, dz = G.petike.pos.z - FOUNTAIN.z, d = Math.hypot(dx, dz) || 1;
  ftn.spot = [FOUNTAIN.x + dx / d * (FOUNTAIN.r + 0.3), FOUNTAIN.z + dz / d * (FOUNTAIN.r + 0.3)];
  ftn.t = 0; ftn.lineT = 1.6; seqs.length = 0; ftn.count++;
  dadFountainAlarm();
}
function dadFountainAlarm() {
  const p = G.petya; p.path = null; p.sitTarget = 0; p.cheer = 0;
  G.petyaMode = 'ftnStand'; dad.talkT = 99; dad.lineT = 2.2;
  say(p, ftn.count > 1 ? pick(FTN_SHOUT_AGAIN) : pick(FTN_SHOUT), 2.4); p.point = 1.5;
  setTimeout(() => { if (G.petyaMode.startsWith('ftn')) say(G.angi, pick(['Jaj, Petya, ne kiabálj…', 'Ó, csak egy kortyot ivott!', 'Petya, a szíved!']), 2.2); }, 1600);
}
// autopilot run for Petike along ftn.path (collides; ghosts through if stuck)
export function autoRun(a, speed, dt) {
  if (!ftn.path || !ftn.path.length) return true;
  const t = ftn.path[0], dx = t[0] - a.pos.x, dz = t[1] - a.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.12) { ftn.path.shift(); return !ftn.path.length; }
  const st = Math.min(d, speed * dt); a.pos.x += dx / d * st; a.pos.z += dz / d * st;
  if (ftn.ghostT > 0) ftn.ghostT -= dt; else collide(a.pos, 0.26, 0, null);
  ftn.stuckT += dt;
  if (ftn.stuckT > 0.8) { if (a.pos.distanceTo(ftn.lastP) < 0.4) ftn.ghostT = 0.7; ftn.lastP.copy(a.pos); ftn.stuckT = 0; }
  a.targetHeading = Math.atan2(dx, dz); a.heading = dampAngle(a.heading, a.targetHeading, 12, dt);
  a.animate(dt, true, speed); return false;
}
export function updateFountainDrink(dt) {
  const a = G.petike, r = a.rig;
  G.kickPressed = G.kickReleased = false; G.usePressed = false;
  ftn.t += dt;
  if (G.pstate === 'toFountain') {
    const dx = ftn.spot[0] - a.pos.x, dz = ftn.spot[1] - a.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { const st = Math.min(d, 2.4 * dt); a.pos.x += dx / d * st; a.pos.z += dz / d * st; a.targetHeading = Math.atan2(dx, dz); a.heading = dampAngle(a.heading, a.targetHeading, 12, dt); a.animate(dt, true, 2.4); }
    else { G.pstate = 'ftnDrink'; G.drinkT = 0; G.gulpT = 0.5; }
  } else if (G.pstate === 'ftnDrink') {
    // leans over the rim and slurps straight from the basin, blissfully unaware
    G.drinkT += dt; a.heading = dampAngle(a.heading, Math.atan2(FOUNTAIN.x - a.pos.x, FOUNTAIN.z - a.pos.z), 10, dt); a.animate(dt, false, 0);
    const k = Math.min(1, G.drinkT * 2.5);
    r.inner.rotation.x = 0.85 * k; r.sh[0].rotation.x = -1.2 * k; r.sh[1].rotation.x = -1.2 * k; r.sh[0].rotation.z = -0.35 * k; r.sh[1].rotation.z = 0.35 * k;
    if (G.drinkT > 0.4) {
      const fx = Math.sin(a.heading), fz = Math.cos(a.heading);
      if (rand() < 0.5) spawnFx(new V3(a.pos.x + fx * 0.55, 0.5, a.pos.z + fz * 0.55), new V3(R(-0.4, 0.4), R(0.6, 1.2), R(-0.4, 0.4)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2]), 0.05, 0.4, 6);
      G.gulpT -= dt; if (G.gulpT <= 0) { G.gulpT = 0.36; tone('sine', 230, 120, 0.09, 0.12); }
      ftn.lineT -= dt; if (ftn.lineT <= 0) { ftn.lineT = R(2.6, 3.4); say(a, pick(FTN_SIP), 2.2); }
    }
  } else if (G.pstate === 'caught') {
    // straightens up, turns to dad – no escape
    a.heading = dampAngle(a.heading, Math.atan2(G.petya.pos.x - a.pos.x, G.petya.pos.z - a.pos.z), 8, dt); a.animate(dt, false, 0);
  } else if (G.pstate === 'chased') {
    if (autoRun(a, 4.0, dt)) {
      G.pstate = 'atMom'; a.targetHeading = Math.PI;
      say(a, pick(['Anyaaa! Apa megint kiabál!', 'Anya, ments meg!', 'Anyaaa! Apa üldöz!']), 2.4);
    }
  } else if (G.pstate === 'atMom') {
    a.heading = dampAngle(a.heading, Math.PI, 8, dt); a.animate(dt, false, 0);
  }
  a.pos.x = clamp(a.pos.x, GX0 + 1, GX1 - 1); a.pos.z = clamp(a.pos.z, GZ0 + 1, GZ1 - 1);
  a.sync();
}
export function updateDadFountain(dt) {
  const p = G.petya, a = G.petike;
  dad.lineT -= dt;
  if (G.petyaMode === 'ftnStand') { if (p.sit < 0.05) G.petyaMode = 'ftnRun'; return; }
  if (G.petyaMode === 'ftnRun') {
    // run to Petike, round the pitch fence if needed (stand on his bench-side)
    const fx = Math.sin(a.heading), fz = Math.cos(a.heading);
    const goal = [a.pos.x - fx * 1.1 + 0.4, a.pos.z - fz * 1.1 - 0.4];
    const t = p.pos.x > FTN_WAY[0] + 0.6 ? FTN_WAY : goal;
    p.path = [new V3(t[0], 0, t[1])]; p.speed = 4.6; p.keepHeading = false;
    if (dad.lineT <= 0) { dad.lineT = R(2.6, 3.4); say(p, pick(FTN_RUN), 2.2); }
    if (Math.hypot(p.pos.x - goal[0], p.pos.z - goal[1]) < 0.3 && G.pstate === 'ftnDrink') {
      p.path = null; G.petyaMode = 'ftnScold'; G.pstate = 'caught'; G.petike.rig.inner.rotation.x = 0;
      const s1 = pick(FTN_SCOLD); let s2 = pick(FTN_SCOLD); while (s2 === s1) s2 = pick(FTN_SCOLD);
      runSeq([
        [0.0, () => { say(a, 'Upsz.', 1.4); }],
        [0.9, () => { say(p, s1, 2.6); p.point = 2.6; }],
        [2.7, () => { say(a, pick(FTN_EXCUSE), 2.0); }],
        [2.1, () => { say(p, s2, 2.6); p.point = 2.6; }],
        [2.7, () => { say(p, 'Indulás vissza anyához! Futás!', 2.2); p.point = 2.2; G.pstate = 'chased'; ftn.path = [FTN_WAY, ftnMom()]; ftn.stuckT = 0; ftn.ghostT = 0; ftn.lastP.copy(a.pos); G.petyaMode = 'ftnChase'; dad.lineT = 2.4; }],
      ]);
    }
    return;
  }
  if (G.petyaMode === 'ftnScold') { p.targetHeading = Math.atan2(a.pos.x - p.pos.x, a.pos.z - p.pos.z); return; }
  if (G.petyaMode === 'ftnChase') {
    // trot after him, lecturing, then stop at his own spot in front of the bench
    const home = petyaFront(), dh = Math.hypot(p.pos.x - home[0], p.pos.z - home[1]);
    if (G.pstate === 'atMom') {
      if (dh < 0.25) {
        p.path = null; G.petyaMode = 'ftnWait'; p.targetHeading = Math.atan2(a.pos.x - p.pos.x, a.pos.z - p.pos.z);
        const v = rand() < 0.5;
        runSeq([
          [0.3, () => { say(p, 'Angi, a szökőkútból ivott! A SZÖKŐKÚTBÓL!', 2.6); p.point = 2.4; }],
          [2.6, () => { say(G.angi, v ? 'Petya, te is ittál belőle kilencvenkettőben. Láttalak.' : 'Kicsim, legközelebb az ivókútból, jó? Apa kedvéért.', 2.8); }],
          [2.8, () => { say(p, v ? 'Az más volt! Akkor még… tisztább volt!' : 'Az ivókútból! Ami OTT van! Látod? OTT!', 2.6); p.point = 2.2; }],
          [2.7, () => { say(a, 'Akkor most ihatok az ivókútból?', 2.2); }],
          [2.2, () => { say(p, 'IGEN!', 1.6); say(G.angi, 'IGEN!', 1.6); p.cheer = 0.5; }],
          [1.6, () => { G.pstate = 'free'; G.petyaMode = 'seat'; dad.seatPhase = 0; dad.seatT = 0.6; dad.talkT = R(5, 7); p.targetHeading = 0; }],
        ]);
        return;
      }
    }
    const t = G.pstate === 'atMom' ? navTarget(p.pos, home) : (() => { const fx = Math.sin(a.heading), fz = Math.cos(a.heading); return [a.pos.x - fx * 1.8, a.pos.z - fz * 1.8]; })();
    const tt = G.pstate !== 'atMom' && p.pos.x < FTN_WAY[0] - 0.3 && a.pos.x > FTN_WAY[0] - 0.3 ? FTN_WAY : t;
    const d = Math.hypot(p.pos.x - tt[0], p.pos.z - tt[1]);
    if (d > 0.15) { p.path = [new V3(tt[0], 0, tt[1])]; p.speed = G.pstate === 'atMom' ? 2.4 : clamp(2.6 + (d - 1) * 1.2, 2.6, 4.4); p.keepHeading = false; }
    else { p.path = null; p.targetHeading = Math.atan2(a.pos.x - p.pos.x, a.pos.z - p.pos.z); }
    if (dad.lineT <= 0 && G.pstate === 'chased') { dad.lineT = R(2.2, 3.0); say(p, pick(FTN_CHASE), 2.2); p.point = 1.2; }
    return;
  }
  if (G.petyaMode === 'ftnWait') p.targetHeading = Math.atan2(a.pos.x - p.pos.x, a.pos.z - p.pos.z);
}

