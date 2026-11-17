// Petyus kalandjai – activities/pigeons: 3. csibészség – „Galambraj-vezénylés”.
// Angi gives Petyus a bag of crumbs → SPACE scatters crumbs (instead of kicking): pigeons follow him, more fly in.
// They lose interest if he stops scattering. At dad on the bench: „E – Morzsa apára!” → the whole flock lands on dad.
import { makePigeon, spawnFx } from '../actors.js';
import { sFlap, soundAt, tone } from '../audio.js';
import { dad } from '../dad.js';
import { award } from '../mischief.js';
import { scene } from '../scene.js';
import { G, pigeons } from '../state.js';
import { say, toast } from '../ui.js';
import { $, R, V3, clamp, damp, pick, rand } from '../util.js';
import { groundH } from '../world.js';
import { runSeq } from './fountain.js';

const LIMIT = 90, FAST = 60, MAX_BIRDS = 22, INTEREST = 8;
export const pig = { active: false, t: 0, cool: 0, done: false, landed: 0, hudT: 0 };

export function canAskCrumbs() {
  return !pig.active && G.pstate === 'free' && G.angi.sit > 0.9 && G.petike.pos.distanceTo(G.angi.pos) < 2.0;
}
export function canDump() {
  return pig.active && !pig.done && G.pstate === 'free' && (G.petyaMode === 'bench' || G.petyaMode === 'doze') && G.petya.sit > 0.9 && G.petike.pos.distanceTo(G.petya.pos) < 2.4;
}
export function askCrumbs() {
  pig.active = true; pig.done = false; pig.t = 0; pig.cool = 0; pig.landed = 0;
  say(G.petike, 'Anya, van egy kis morzsád?', 2.0);
  runSeq([
    [1.8, () => say(G.angi, 'Tessék, pogácsamorzsa. De ne etesd túl őket!', 2.6)],
    [2.6, () => { say(G.petike, 'Nem őket akarom etetni…', 2.0); toast('<b>Szóköz</b> – morzsát szórni · vezesd a galambokat <b>apához</b>, ott <b>E</b>!', 5); }],
  ]);
  $('crumbs').style.display = 'block';
}
// SPACE while the bag is out (player.js): crumbs on the ground, nearby pigeons come, more fly in
export function scatterCrumbs() {
  if (pig.cool > 0 || pig.done) return; pig.cool = 0.45;
  const P = G.petike.pos;
  for (let i = 0; i < 10; i++) spawnFx(new V3(P.x + R(-0.4, 0.4), 0.5, P.z + R(-0.4, 0.4)), new V3(R(-0.8, 0.8), R(0.2, 1), R(-0.8, 0.8)), pick([0xe8c98a, 0xd9b26a, 0xf2deb0]), 0.04, 0.9, 6);
  soundAt(P.x, P.z, sCrumb, 1);
  for (const pg of pigeons) {
    const d = pg.pos.distanceTo(P);
    if (pg.state === 'idle' && d < 9) follow(pg);
    if (pg.state === 'follow' && d < 6) pg.interest = INTEREST;
  }
  // the word gets around: more pigeons fly in from the sky
  const n = Math.min(2, MAX_BIRDS - pigeons.length);
  for (let i = 0; i < n; i++) {
    const p = makePigeon(); scene.add(p.root); const a = rand() * Math.PI * 2, home = new V3(Math.cos(a) * R(3.2, 4.6), 0, Math.sin(a) * R(3.2, 4.6));
    const pg = { p, pos: new V3(P.x + Math.cos(a) * 16, 0, P.z + Math.sin(a) * 16), home, heading: 0, state: 'follow', t: 0, vel: new V3(), y: 6, interest: INTEREST, slot: pigeons.length };
    pigeons.push(pg);
  }
  if (rand() < 0.35) say({ headWorld: (v) => v.set(P.x + R(-1, 1), 0.6, P.z + R(-1, 1)) }, pick(['Kurr!', 'Kurrr-kurr!', 'Gru-gru!']), 1.0, '');
}
const sCrumb = () => { tone('sine', 1500, 1900, 0.05, 0.04); tone('sine', 1700, 2100, 0.04, 0.03, 0.06); };
function follow(pg) { pg.state = 'follow'; pg.interest = INTEREST; pg.slot = pigeons.indexOf(pg); }
export const followers = () => pigeons.filter((pg) => pg.state === 'follow');

// called for every pigeon by npcs.js; returns true if it handled (and placed) the bird
export function pigeonHook(pg, dt) {
  if (pg.hook) return pg.hook(pg, dt);   // driven by another mischief (activities/photo.js)
  const p = pg.p, P = G.petike.pos;
  if (pg.state === 'idle' && pig.active && !pig.done && pg.pos.distanceTo(P) < 3.5) follow(pg);   // with a bag of crumbs he is not scary
  if (pg.state === 'follow') {
    pg.interest -= dt;
    if (pg.interest <= 0 || !pig.active) { pg.state = 'return'; if (rand() < 0.3) say({ headWorld: (v) => v.set(pg.pos.x, 0.6, pg.pos.z) }, 'Kurr?', 1, ''); return false; }
    // a loose crowd round Petyus' feet
    const a = pg.slot * 2.39996, r = 0.9 + (pg.slot % 5) * 0.32, tx = P.x + Math.cos(a) * r, tz = P.z + Math.sin(a) * r;
    const dx = tx - pg.pos.x, dz = tz - pg.pos.z, d = Math.hypot(dx, dz), far = d > 5;
    const sp = Math.min(far ? 7 : 3.8, d * 2.6);
    if (d > 0.05) { pg.pos.x += dx / d * sp * dt; pg.pos.z += dz / d * sp * dt; pg.heading = Math.atan2(dx, dz); }
    pg.y = damp(pg.y, far ? 1.2 : (d > 0.3 ? Math.abs(Math.sin(G.clockT * 11 + pg.slot)) * 0.06 : 0), far ? 3 : 8, dt);
    flap(p, far || pg.y > 0.2);
    p.head.rotation.x = d < 0.3 ? Math.max(0, Math.sin(G.clockT * 7 + pg.slot)) * 0.9 : 0;   // pecking
  } else if (pg.state === 'land') {
    // flight to its spot on dad
    pg.t += dt; const k = clamp(pg.t / 0.8, 0, 1);   // t starts below 0: they take off one after another
    pg.pos.lerpVectors(pg.from, pg.to, k); pg.y = pg.from.y + (pg.to.y - pg.from.y) * k + Math.sin(k * Math.PI) * 0.9;
    pg.heading = Math.atan2(G.petike.pos.x - pg.pos.x, G.petike.pos.z - pg.pos.z) + R(-0.4, 0.4) * 0.02;
    flap(p, k < 1);
    if (k >= 1) { pg.state = 'perch'; pg.y = pg.to.y; }
  } else if (pg.state === 'perch') {
    flap(p, false); p.head.rotation.x = Math.max(0, Math.sin(G.clockT * 5 + pg.slot)) * 0.5;
  } else return false;
  p.root.position.set(pg.pos.x, (pg.state === 'land' || pg.state === 'perch' ? 0 : groundH(pg.pos.x, pg.pos.z)) + pg.y, pg.pos.z); p.root.rotation.y = pg.heading;
  return true;
}
function flap(p, on) { for (const w of p.wings) w.rotation.z = on ? Math.sin(G.clockT * 30) * 0.9 * (w.position.x > 0 ? 1 : -1) : 0; }

// spots on dad (relative to him, seated, facing +z): head, shoulders, arms, lap, the bench either side, his feet
const SLOTS = [[0, 1.66, -0.02], [-0.22, 1.42, -0.04], [0.22, 1.42, -0.04], [0.1, 1.74, 0.02], [-0.1, 0.62, 0.22], [0.12, 0.62, 0.3], [0, 0.62, 0.42],
  [-0.62, 0.47, 0], [0.62, 0.47, 0], [-0.8, 0.47, 0.05], [0.84, 0.47, 0.06], [-0.3, 1.0, 0.2], [0.3, 1.0, 0.22], [-0.2, 0.02, 0.75], [0.25, 0.02, 0.7],
  [0, 0.02, 0.9], [-0.5, 0.02, 0.6], [0.55, 0.02, 0.62], [-0.05, 1.85, 0.0], [0.4, 0.02, 0.95], [-0.42, 0.02, 0.95], [0, 0.62, 0.55]];
export function dumpOnDad() {
  const P = G.petike.pos, d0 = G.petya.pos;
  const flock = followers().filter((pg) => pg.pos.distanceTo(P) < 7).slice(0, SLOTS.length);
  pig.done = true; pig.landed = flock.length; $('crumbs').style.display = 'none';
  say(G.petike, 'Morzsa apára! Hajrá, galambok!', 1.8);
  for (let i = 0; i < 12; i++) spawnFx(new V3(d0.x + R(-0.4, 0.4), 1.4, d0.z + R(-0.2, 0.4)), new V3(R(-0.6, 0.6), R(0, 0.8), R(-0.6, 0.6)), pick([0xe8c98a, 0xd9b26a]), 0.04, 1.0, 6);
  flock.forEach((pg, i) => {
    const s = SLOTS[i]; pg.state = 'land'; pg.t = -i * 0.05;
    pg.from = new V3(pg.pos.x, pg.y, pg.pos.z); pg.to = new V3(d0.x + s[0], s[1], d0.z + s[2]);
  });
  sFlap(); setTimeout(sFlap, 200);
  const n = flock.length, fast = pig.t <= FAST, wasAsleep = G.petyaMode === 'doze';
  if (wasAsleep) G.petyaMode = 'bench';   // pigeons on your face wake anyone (nap.js tidies up)
  runSeq([
    [1.2, () => { say(G.petya, n === 0 ? 'Hm? Mit szórsz rám?' : wasAsleep ? 'Mi a…?! LESZÁLLÓPÁLYA LETTEM!' : pick(['Mi a…?! Leszállópálya lettem!', 'Petyus! Ez egy galambtámadás!']), 2.4); dad.talkT = 8; }],
    [2.2, () => { say(G.angi, n >= 8 ? 'Kattt! Ez lesz a karácsonyi képeslap!' : 'Kattt! Hihi!', 2.4); flash(); }],
    [2.2, () => say(G.petike, n >= 15 ? 'Galambapa! Galambapa!' : 'Hihi! Apa, jól áll!', 2.0)],
    [1.8, () => {
      // off they go
      for (const pg of pigeons) if (pg.state === 'perch' || pg.state === 'land') { pg.state = 'fly'; pg.t = 4; const a = rand() * Math.PI * 2; pg.vel.set(Math.cos(a) * 4, 3.2, Math.sin(a) * 4); pg.heading = Math.atan2(pg.vel.x, pg.vel.z); }
      sFlap(); say(G.petya, 'PETYUUUS!', 1.6);
      if (n > 0) award('galamb', n, { t: pig.t }); else say(G.angi, 'Kicsim, a galambokat is oda kell vinni…', 2.4);
      pig.active = false;
    }],
  ]);
}
function flash() { const el = $('filmDip'); el.style.background = '#fff'; el.classList.add('on'); setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.style.background = ''; }, 200); }, 90); }

// HUD + time limit (called from player.js each frame while the bag is out)
export function tickCrumbs(dt) {
  if (!pig.active || pig.done) return;
  pig.t += dt; pig.cool -= dt;
  pig.hudT -= dt;
  if (pig.hudT <= 0) {
    pig.hudT = 0.2;
    $('crTime').textContent = Math.max(0, Math.ceil(LIMIT - pig.t));
    $('crBirds').textContent = followers().length;
    $('crTime').parentElement.classList.toggle('late', pig.t > FAST);
  }
  if (pig.t >= LIMIT) {
    pig.active = false; $('crumbs').style.display = 'none';
    say(G.angi, 'Elfogyott a morzsa, kicsim. Majd legközelebb!', 2.6);
  }
}
