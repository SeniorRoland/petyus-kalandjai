// Petyus kalandjai – activities/hide: 9. csibészség – „Bújócska apával”.
// Next to dad on the bench (no ball around): „E – Apa, bújócskázzunk!” → dad stands up, covers his eyes and counts to ten;
// Petyus hides: behind a tree (the trunk between him and dad) or crouching next to a bush (standing still).
// Dad walks from hiding place to hiding place and comments. He sees Petyus if he is in the open (or moving) in front of him;
// close by he hears him breathing – hold your breath with SPACE (the bar runs down; empty = HAPCI!). After GIVE_UP seconds
// dad gives up: „Angi, nem láttad a gyereket?” – „Melyiket?”
// Stars: ★ 20 s hidden · ★★ 40 s · ★★★ dad gives up.
import { spawnFx } from '../actors.js';
import { noise, tone } from '../audio.js';
import { dad, dadReturn, navTarget, petyaFront } from '../dad.js';
import { isTouch, kickHeld, keys, touch } from '../input.js';
import { award } from '../mischief.js';
import { CAM_FWD, CAM_RIGHT, pvel } from '../player.js';
import { G, ball } from '../state.js';
import { bigText, say } from '../ui.js';
import { $, R, V3, clamp, damp, dampAngle, lerp, pick, rand } from '../util.js';
import { BUSHES, FAMILY_BENCH, GX0, GX1, GZ0, GZ1, TREES, collide } from '../world.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';

const COUNT = 10, GIVE_UP = 60, SEE = 11, HEAR = 4.2, CLOSE = 1.5, AIR = 6, AREA = 30;
export const hs = { on: false, phase: '', t: 0, hidden: 0, spots: [], target: null, lookT: 0, lineT: 0, air: 1, noise: 0, cover: null, crouch: 0, end: '', visits: 0 };
const SEEK_LINES = ['Hol lehet ez a gyerek…', 'Petyus! Tudom ám, hogy itt vagy!', 'Ebben a bokorban? …Nem.', 'Gyere elő, megvan a fagyi! …Nem jön.', 'A fa mögött? Hát persze! …Nincs ott.',
  'Ha most előjössz, nem lesz baj!', 'Az én időmben a gyerekek maguktól előjöttek…', 'Petyuuus! A térdem… siess már!', 'Hm. Mintha szuszogást hallanék…'];
const FOUND = ['MEGVAGY!', 'Látlak ám! Megvagy!', 'Na tessék, megvagy!'];

export function canHide() {
  if (G.pstate !== 'free' || hs.on || G.petyaMode !== 'bench' || G.petya.sit < 0.9) return false;
  const P = G.petike.pos, dd = P.distanceTo(G.petya.pos);
  if (dd > 2.2 || dd > P.distanceTo(G.angi.pos)) return false;   // dad is the nearer one (Angi has the crumbs)
  return !(ball.active && ball.pos.distanceTo(P) < 3.5);         // with the ball: „Mutasd te, apa!”
}
export function startHide() {
  const p = G.petya;
  G.pstate = 'hide'; hs.on = true; hs.phase = 'stand'; hs.t = 0; hs.hidden = 0; hs.air = 1; hs.noise = 0; hs.end = ''; hs.visits = 0; hs.target = null; hs.crouch = 0;
  pvel.set(0, 0, 0); G.charging = false; G.petike.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  G.petyaMode = 'hideCount'; p.path = null; p.sitTarget = 0; dad.talkT = 99;
  // hiding places near the bench: trees and bushes
  const B = FAMILY_BENCH;
  hs.spots = [...TREES.map((t) => ({ x: t.x, z: t.z, kind: 'tree' })), ...BUSHES.map((b) => ({ x: b.x, z: b.z, kind: 'bush', r: 0.6 * b.s }))]
    .filter((s) => Math.hypot(s.x - B.x, s.z - B.z) < AREA).map((s) => ({ ...s, seen: false }));
  say(G.petike, 'Apa, bújócskázzunk!', 1.8);
  runSeq([
    [1.6, () => say(p, pick(['Bújócska? Na jó… de csak egy kör!', 'Jó, de ha megtalállak, megyünk haza.']), 2.2)],
    [2.0, () => { say(p, 'Számolok tízig! Egy…', 1.4); hs.phase = 'count'; hs.t = 0; }],
  ]);
  $('mini').style.display = 'block'; hud();
}
const COUNT_WORDS = ['Egy…', 'Kettő…', 'Három…', 'Négy…', 'Öt…', 'Hat…', 'Hét…', 'Nyolc…', 'Kilenc…', 'TÍZ! Aki bújt, aki nem, MEGYEK!!'];
function hud() {
  const bar = '▮'.repeat(Math.round(hs.air * 6)) + '▯'.repeat(6 - Math.round(hs.air * 6));
  $('mini').innerHTML = hs.phase === 'count' || hs.phase === 'stand' ? `🙈 Apa számol: <b>${Math.max(0, Math.ceil(COUNT - hs.t))}</b>` : `🙈 Rejtőzés: <b>${Math.floor(hs.hidden)}</b> mp · 🫁 ${bar}`;
}

// is Petyus covered from dad? behind a tree trunk (the trunk on the line between them) or crouching by a bush
function coverFrom(D) {
  const P = G.petike.pos; hs.cover = null;
  for (const s of hs.spots) {
    const d = Math.hypot(P.x - s.x, P.z - s.z);
    if (s.kind === 'bush' && d < (s.r || 0.6) + 0.95 && hs.crouch > 0.6) { hs.cover = s; return true; }
    if (s.kind === 'tree' && d < 1.2) {
      // the trunk must be between dad and Petyus
      const dx = P.x - D.x, dz = P.z - D.z, L = dx * dx + dz * dz || 1, t = clamp(((s.x - D.x) * dx + (s.z - D.z) * dz) / L, 0, 1);
      if (t > 0.05 && t < 0.98 && Math.hypot(D.x + dx * t - s.x, D.z + dz * t - s.z) < 0.55) { hs.cover = s; return true; }
    }
  }
  return false;
}

export function updateHide(dt) {
  const a = G.petike, p = G.petya;
  hs.t += dt;
  // --- Petyus: walk / run, crouch when standing still
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const il = Math.hypot(wx, wz); if (il > 1) { wx /= il; wz /= il; }
  const hold = (keys.Space || kickHeld) && hs.phase === 'seek';
  G.kickPressed = G.kickReleased = false; G.qPressed = false;
  const stop = G.usePressed; G.usePressed = false;
  if (hs.end) { wx = wz = 0; }
  const sprint = keys.ShiftLeft || keys.ShiftRight || touch.run, sp = hold ? 0 : (sprint ? 5.0 : 3.0);
  pvel.x = damp(pvel.x, wx * sp, 10, dt); pvel.z = damp(pvel.z, wz * sp, 10, dt);
  a.pos.x += pvel.x * dt; a.pos.z += pvel.z * dt; collide(a.pos, 0.26, 0, null);
  a.pos.x = clamp(a.pos.x, GX0 + 1, GX1 - 1); a.pos.z = clamp(a.pos.z, GZ0 + 1, GZ1 - 1);
  const spd = Math.hypot(pvel.x, pvel.z), moving = spd > 0.3;
  if (il > 0.1) a.targetHeading = Math.atan2(wx, wz);
  a.heading = dampAngle(a.heading, a.targetHeading, 14, dt); a.animate(dt, moving, spd);
  hs.crouch = damp(hs.crouch, moving || hs.end ? 0 : 1, 8, dt);
  const r = a.rig, c = hs.crouch;
  if (c > 0.01) { r.inner.position.y -= 0.32 * c; r.hip[0].rotation.x = r.hip[1].rotation.x = -1.1 * c; r.knee[0].rotation.x = r.knee[1].rotation.x = 1.9 * c; r.inner.rotation.x = 0.25 * c; }
  if (hold) { r.sh[0].rotation.x = r.sh[1].rotation.x = -2.2; r.sh[0].rotation.z = 0.5; r.sh[1].rotation.z = -0.5; }   // hands over his mouth
  a.sync();
  // --- dad
  if (hs.phase === 'count') {
    // standing in front of the bench, eyes covered, counting out loud
    p.targetHeading = Math.PI; p.heading = dampAngle(p.heading, p.targetHeading, 4, dt); p.animate(dt, false, 0);
    const pr = p.rig; pr.sh[0].rotation.x = pr.sh[1].rotation.x = -2.5; pr.sh[0].rotation.z = 0.45; pr.sh[1].rotation.z = -0.45; p.sync();
    const n = Math.floor(hs.t);
    if (n !== Math.floor(hs.t - dt) && n >= 1 && n < COUNT) say(p, COUNT_WORDS[n], n === COUNT - 1 ? 2.4 : 0.9);
    if (hs.t >= COUNT) { hs.phase = 'seek'; hs.t = 0; G.petyaMode = 'hideSeek'; hs.lineT = 2.5; nextSpot(); }
  } else if (hs.phase === 'seek' && !hs.end) seek(dt, moving, hold);
  else if (hs.end) endTick(dt);
  if (stop && !hs.end) { say(a, 'Feladom! Itt vagyok!', 1.6); finish('quit'); }
  if (Math.floor(hs.t * 5) !== Math.floor((hs.t - dt) * 5)) hud();
  setPrompt(hs.phase === 'seek' && !hs.end && p.pos.distanceTo(a.pos) < HEAR + 1 ? (isTouch ? 'LEVEGŐ nyomva – tartsd vissza a levegőt!' : 'Szóköz nyomva – tartsd vissza a levegőt!') : '');
}
// dad's next hiding place to check: sometimes the one nearest to Petyus (dads have a nose for it), otherwise a near one
function nextSpot() {
  const p = G.petya.pos, P = G.petike.pos, left = hs.spots.filter((s) => !s.seen);
  if (!left.length) { hs.spots.forEach((s) => { s.seen = false; }); return nextSpot(); }
  const byP = [...left].sort((u, v) => Math.hypot(u.x - P.x, u.z - P.z) - Math.hypot(v.x - P.x, v.z - P.z));
  const byD = [...left].sort((u, v) => Math.hypot(u.x - p.x, u.z - p.z) - Math.hypot(v.x - p.x, v.z - p.z));
  const s = hs.visits > 0 && rand() < 0.3 ? byP[0] : byD[Math.floor(rand() * Math.min(3, byD.length))];
  s.seen = true; hs.target = s; hs.lookT = 0; hs.visits++;
  // stand a step away from it, on the side facing him
  const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz) || 1;
  hs.goal = [s.x + dx / d * 1.3, s.z + dz / d * 1.3];
}
function seek(dt, moving, hold) {
  const p = G.petya, a = G.petike, P = a.pos;
  hs.hidden += dt;
  // walk to the spot / look around there
  const g = hs.goal, dg = Math.hypot(p.pos.x - g[0], p.pos.z - g[1]);
  if (dg > 0.3 && hs.lookT <= 0) { const t = navTarget(p.pos, g); p.path = [new V3(t[0], 0, t[1])]; p.speed = 1.5; p.keepHeading = false; }
  else {
    p.path = null; hs.lookT += dt;
    const base = Math.atan2(hs.target.x - p.pos.x, hs.target.z - p.pos.z);
    p.targetHeading = base + Math.sin(hs.lookT * 2.2) * 1.1;   // looking round
    if (hs.lookT > 1.8) nextSpot();
  }
  // lines
  if ((hs.lineT -= dt) <= 0) { hs.lineT = R(4, 6.5); say(p, pick(SEEK_LINES), 2.2); }
  // can he see Petyus? (in front of him, not too far, no cover – or moving)
  const dx = P.x - p.pos.x, dz = P.z - p.pos.z, d = Math.hypot(dx, dz);
  const facing = Math.cos(Math.atan2(dx, dz) - p.heading) > 0.35;
  const covered = coverFrom(p.pos);
  if (d < CLOSE) return found('close');
  if (d < SEE && facing && (!covered || (moving && d < 6))) return found('seen');
  // close by he hears Petyus breathing: hold your breath (SPACE) – but not for ever
  if (d < HEAR) {
    if (hold) { hs.air -= dt / AIR; hs.noise = Math.max(0, hs.noise - dt); if (hs.air <= 0) return found('sneeze'); }
    else { hs.noise += dt; if (hs.noise > 0.9) return found('heard'); }
  } else { hs.air = Math.min(1, hs.air + dt / 3); hs.noise = Math.max(0, hs.noise - dt * 2); }
  if (hold && Math.random() < dt * 2) spawnFx(new V3(P.x, 1.0, P.z), new V3(R(-0.2, 0.2), 0.4, R(-0.2, 0.2)), 0xffffff, 0.03, 0.4, 0);
  if (hs.hidden >= GIVE_UP) giveUp();
}
function found(how) {
  const p = G.petya, a = G.petike;
  hs.end = 'found'; hs.endT = 0; p.path = null; p.targetHeading = Math.atan2(a.pos.x - p.pos.x, a.pos.z - p.pos.z);
  if (how === 'sneeze') { say(a, 'HAPCI!!', 1.4); noise(0.25, 1800, 0.8, 0.3); tone('sine', 700, 300, 0.2, 0.08); runSeq([[1.0, () => say(p, 'Egészségedre! …MEGVAGY!', 2.0)]]); }
  else if (how === 'heard') { say(a, '*szusz-szusz*', 1.0, ''); runSeq([[0.9, () => say(p, 'Hallom ám, hogy szuszogsz! MEGVAGY!', 2.2)]]); }
  else say(p, pick(FOUND), 1.8);
  p.point = 2; bigText('MEGVAGY!', 1.0);
  runSeq([[2.6, () => say(a, hs.hidden >= 40 ? 'Pedig olyan jó helyen voltam!' : pick(['Ez nem ér, kilestél!', 'Még egyszer! Most jobban elbújok!']), 2.0)]]);
}
function giveUp() {
  const p = G.petya;
  hs.end = 'gaveup'; hs.endT = 0; hs.saidAll = false;
  hs.goBack = true;
  say(p, 'Na jó… feladom.', 1.8);
  runSeq([
    [0.5, () => {}, () => !hs.goBack],
    [0.4, () => { p.path = null; p.targetHeading = Math.atan2(G.angi.pos.x - p.pos.x, G.angi.pos.z - p.pos.z); say(p, 'Angi, nem láttad a gyereket?', 2.2); }],
    [2.2, () => say(G.angi, 'Melyiket?', 1.8)],
    [2.0, () => { say(G.petike, 'ITT VAGYOK!!', 1.6); G.petike.cheer = 1.4; hs.crouch = 0; }],
    [1.8, () => { say(p, 'Na végre! …Nem is kerestelek igazán.', 2.2); hs.saidAll = true; }],
  ]);
}
function endTick(dt) {
  const p = G.petya; hs.endT += dt;
  if (hs.goBack) {   // back to the bench, round the pitch fence if needed
    const f = petyaFront();
    if (Math.hypot(p.pos.x - f[0], p.pos.z - f[1]) > 0.3) { const t = navTarget(p.pos, f); p.path = [new V3(t[0], 0, t[1])]; p.speed = 1.6; p.keepHeading = false; }
    else { p.path = null; hs.goBack = false; }
  }
  if (hs.end === 'found' && hs.endT > 4.8) finish('found');
  if (hs.end === 'gaveup' && !hs.goBack && hs.endT > 9.5 && hs.saidAll) finish('gaveup');
}
function finish(how) {
  hs.on = false; hs.end = ''; hs.phase = ''; G.pstate = 'free'; $('mini').style.display = 'none'; setPrompt('');
  const v = Math.floor(hs.hidden);
  if (how === 'gaveup') award('bujocska', v, { gaveUp: true });
  else if (how === 'found' && v >= 20) award('bujocska', v, { gaveUp: false });
  else if (how === 'found') say(G.petike, 'Túl hamar megtalált… legközelebb jobban elbújok!', 2.2);
  dadReturn();
}
