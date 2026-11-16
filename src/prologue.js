// Petyus kalandjai – prologue: Drámai nyitány: Petyus rollerrel száguld otthonról a park felé, szlalomozik a
// járókelők között, farolva fékez, majd Petya mérgesen visszahívja maguk mögé. Utána indul a családi séta (intro.js).
import * as THREE from 'three';
import { Actor, spawnFx } from './actors.js';
import { noise, sScreech, sSting, startHum } from './audio.js';
import { atHeight, cine, cineCap, cineCut, cineEnd, cineFocus, cineStart, shake, slowMo } from './cine.js';
import { ROLLER_START, W, mountRider, offsetPath, until } from './intro.js';
import { loopPoint } from './npcs.js';
import { makePerson } from './rigs.js';
import { poseRider } from './roller.js';
import { scene } from './scene.js';
import { EPISODE, G, SERIES, npcs, roller } from './state.js';
import { say } from './ui.js';
import { $, R, V3, clamp, dampAngle, lerp, pick, smooth } from './util.js';
import { groundH } from './world.js';

const pro = { on: false, t: 0, peds: [], held: [], hum: null, marks: [] };

// ---------- helpers
function polyline(pts) {
  const P = pts.map((p) => ({ x: p[0], z: p[1], s: 0 }));
  for (let i = 1; i < P.length; i++) P[i].s = P[i - 1].s + Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z);
  return {
    len: P[P.length - 1].s,
    at(s) {
      s = clamp(s, 0, this.len); let i = 1; while (i < P.length - 1 && P[i].s < s) i++;
      const a = P[i - 1], b = P[i], k = (s - a.s) / ((b.s - a.s) || 1); return { x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k) };
    },
  };
}
// per-frame callback inside the async timeline: fn(dt) until it returns true (rejects when the intro is skipped)
function each(fn) { let last = G.clockT; return until(() => { const dt = G.clockT - last; last = G.clockT; return fn(dt); }); }
function placeRoller(x, z, heading, lean, speed, dt, crouch = 0) {
  roller.pos.set(x, 0, z); roller.heading = heading; roller.lean = lean; roller.speed = speed; roller.t += dt;
  roller.group.position.set(x, groundH(x, z), z); roller.group.rotation.set(0, heading, lean, 'YXZ');
  poseRider(roller);
  const r = G.petike.rig; r.inner.rotation.x += crouch; if (r.apply) r.apply();
  G.petike.pos.set(x, 0, z); G.petike.heading = heading;    // so cats and pigeons notice him
}
// framed at chest height (not at the feet), so heads and speech bubbles stay inside the letterbox
const lead = (d, y = 0.85) => () => atHeight(roller.pos.x + Math.sin(roller.heading) * d, y, roller.pos.z + Math.cos(roller.heading) * d);
async function titleCard(big, small, dur) {
  const el = $('filmTitle'); el.querySelector('.big').textContent = big; el.querySelector('.small').textContent = small;
  el.classList.add('show'); await W(dur); el.classList.remove('show');
}
async function cut(focus, zoom) { $('filmDip').classList.add('on'); await W(0.12); cineCut(focus, zoom); $('filmDip').classList.remove('on'); }

// ---------- the route: out of the front door, down the diagonal path, then a slalom along the park's north path
const DOOR = [-31, -18.7];
const SLALOM = [[-17.2, -6.0], [-13, -5.45], [-8.5, -6.55], [-3, -6.0], [3, -5.4], [7.5, -6.6], [11.5, -6.2]];
function slalomZ(x) {
  for (let i = 1; i < SLALOM.length; i++) {
    const [x0, z0] = SLALOM[i - 1], [x1, z1] = SLALOM[i];
    if (x <= x1) { const u = clamp((x - x0) / (x1 - x0), 0, 1); return z0 + (z1 - z0) * (1 - Math.cos(Math.PI * u)) / 2; }
  }
  return SLALOM[SLALOM.length - 1][1];
}
function raceLine() {
  const pts = [DOOR, [-31, -17.6], [-30.4, -16.8]];
  for (let k = 1; k <= 14; k++) pts.push([lerp(-30.4, -19.4, k / 14), lerp(-16.8, -7.3, k / 14)]);
  pts.push([-18.6, -6.6], [-17.8, -6.15]);
  for (let x = -17.2; x <= 11.5 + 1e-6; x += 0.25) pts.push([x, slalomZ(x)]);
  return polyline(pts);
}
// the sulky way back: a U-turn, then past the parents (on their north side) to the spot behind them
const returnLine = (x, z) => polyline([[x, z], [x - 0.6, z + 1.2], [x - 2.3, z + 0.9], [12, -6.4], [8, -6.6], [3, -7.15], [-6, -7.25], [-9.6, -6.9], [-9.4, -6.25], ROLLER_START]);
// the family walks out of the door to their starting spots of the intro walk
const FAMILY_ROUTE = [[-31, -18.4], [-31, -17.2], [-18, -6], [-4, -6]];

// ---------- the pedestrians Petyus slaloms between (afterwards they join the park's walkers)
const PEDS = [
  { x: -13, z: -6.55, h: -Math.PI / 2, o: { hat: true }, line: 'Hoppá!' },
  { x: -8.5, z: -5.5, h: Math.PI / 2, o: { dress: false }, line: 'Ejnye, fiatalember!' },
  { x: -3, z: -6.65, h: 0, o: { dress: true, longHair: true }, line: 'Jézusmária!' },
  { x: -3, z: -5.35, h: Math.PI, o: { dress: true, hair: 0xd8d8d8, glasses: true }, line: 'Majdnem elütött!' },
  { x: 3, z: -6.4, h: -Math.PI / 2, o: { hair: 0xb0b0b0, glasses: true, hat: true }, line: 'A mai fiatalok…!' },
  { x: 7.5, z: -5.6, h: Math.PI / 2, o: {}, line: 'Hé! Itt gyalogosok vannak!' },
];
function spawnPeds() {
  pro.peds = PEDS.map((d) => { const a = new Actor(makePerson(d.o), ''); a.solid = true; a.place(d.x, d.z, d.h); return { a, d, hit: -1, side: 0 }; });
}
function updatePeds(dt) {
  const P = G.petike.pos;
  for (const p of pro.peds) {
    const a = p.a;
    if (p.hit < 0 && Math.hypot(P.x - a.pos.x, P.z - a.pos.z) < 1.5) {
      p.hit = 0; p.side = Math.sign(a.pos.z - P.z) || 1; a.cheer = 0.8;
      say(a, p.d.line, 1.9, ''); noise(0.35, 700, 0.6, 0.12);   // whoosh
    }
    if (p.hit >= 0) {
      p.hit += dt; a.pos.z = p.d.z + p.side * 0.5 * smooth(Math.min(1, p.hit / 0.25));   // jump aside
      a.targetHeading = Math.atan2(P.x - a.pos.x, P.z - a.pos.z);                   // stare after him
      a.heading = dampAngle(a.heading, a.targetHeading, 6, dt);
    }
    a.animate(dt, false, 0); a.sync();
  }
}
// park walkers wait on the far (south) side while the scene plays out, so nobody stands in the way
function holdWalkers() {
  let k = 0; pro.held = [];
  for (const n of npcs) {
    if (n.type !== 'loop') continue;
    n.s = 50 + k * 3.4; k++; const p = loopPoint(n.s);
    n.actor.pos.set(p.x - p.dz * n.lane, 0, p.z + p.dx * n.lane); n.actor.sync(); n.pause = 999; pro.held.push(n);
  }
}
function skidMark(x, z, h) {
  const m = new THREE.Mesh(skidGeo, skidMat); m.position.set(x, groundH(x, z) + 0.006, z); m.rotation.y = h; scene.add(m); pro.marks.push(m);
}
const skidGeo = new THREE.BoxGeometry(0.06, 0.004, 0.16), skidMat = new THREE.MeshBasicMaterial({ color: 0x2a2622, transparent: true, opacity: 0.6 });

// ---------- the scene
export async function runPrologue() {
  pro.on = true; pro.t = 0;
  holdWalkers(); spawnPeds();
  const fam = { p: offsetPath(FAMILY_ROUTE, 0.42), a: offsetPath(FAMILY_ROUTE, -0.42) };
  G.petya.place(fam.p[0][0], fam.p[0][1], 0); G.angi.place(fam.a[0][0], fam.a[0][1], 0);
  roller.scripted = true; roller.path = null; mountRider();
  const line = raceLine(); let s = 0, v = 0, h = 0;
  placeRoller(DOOR[0], DOOR[1], 0, 0, 0, 0);

  // 1. establishing shot: the apartment block, title card
  document.body.classList.add('film');
  cineStart(() => ({ x: -30.2, z: -15.4 }), 7.5); cineCut(() => ({ x: -30.2, z: -15.4 }), 7.5);
  sSting(); await titleCard('Vasárnap délután', 'egy kisváros · egy park · egy roller', 2.8);

  // 2. the race: out of the door, down the diagonal, slalom along the north path
  pro.hum = startHum(); say(G.petike, 'Indulááás!', 1.6);
  cineFocus(lead(1.4), 5.6); cineCap('Petyus egész héten erre a pillanatra várt.', 3.4);
  let famGo = false, slow = 0, benchSaid = false, cornerCap = false;
  await each((dt) => {
    pro.t += dt;
    if (!famGo && pro.t > 1.3) {
      famGo = true; G.petya.walkTo(fam.p.slice(1), 1.8); G.angi.walkTo(fam.a.slice(1), 1.8);
      say(G.angi, 'Petyus! A sisak!', 2.0);
    }
    const vt = s > 17 && s < 22 ? 5.0 : 6.8;                      // eases off for the corner onto the north path
    v = v < vt ? Math.min(vt, v + 6 * dt) : Math.max(vt, v - 9 * dt);
    s = Math.min(line.len, s + v * dt);
    const p = line.at(s), q = line.at(s + 0.7), hh = Math.atan2(q.x - p.x, q.z - p.z);
    const turn = Math.atan2(Math.sin(hh - h), Math.cos(hh - h)); h = dampAngle(h, hh, 10, dt);
    placeRoller(p.x, p.z, h, clamp(-turn * 1.6, -0.32, 0.32), v, dt, 0.12 * v / 6.8);
    pro.hum.set(v); updatePeds(dt);
    if (!cornerCap && s > 21) { cornerCap = true; cineCap('A szomszédok szerint „csak egy kicsit gyors”.', 3.0); }
    if (!benchSaid && p.x > -12.5) {
      benchSaid = true; const old = npcs.find((n) => n.type === 'sit' && Math.hypot(n.actor.pos.x + 12, n.actor.pos.z + 7.75) < 2);
      if (old) say(old.actor, 'Az én időmben gyalog jártunk!', 2.2, '');
    }
    // between the two chatting ladies – slow motion, tight on him
    if (slow === 0 && p.x > -4.4) { slow = 1; slowMo(0.28, 1.6); cineFocus(lead(0.4), 3.6); cineCap('Centiken múlt.', 2.2); }
    if (slow === 1 && p.x > -0.8) { slow = 2; cineFocus(lead(1.4), 5.6); }
    return s >= line.len;
  });

  // 3. the drifting skid stop ("farolva fékez")
  const dir = { x: Math.sin(h), z: Math.cos(h) }, h0 = h; let st = 0, markD = 0;
  sScreech(); shake(0.28); slowMo(0.5, 0.7); cineFocus(() => atHeight(roller.pos.x + dir.x * 0.8, 0.85, roller.pos.z + dir.z * 0.8), 4.4);
  say(G.petike, 'Íííí-ha!', 1.4);
  await each((dt) => {
    st += dt; const v0 = v; v = Math.max(0, v - 5.2 * dt);
    const x = roller.pos.x + dir.x * v * dt, z = roller.pos.z + dir.z * v * dt;
    const k = smooth(Math.min(1, st / 0.5)), hd = h0 + 1.3 * k;                 // the rear swings out
    placeRoller(x, z, hd, -0.3 * k * (v / 6.8), v, dt, -0.12 * k);
    pro.hum.set(v * 0.6);
    const rx = x - Math.sin(hd) * 0.32, rz = z - Math.cos(hd) * 0.32;            // rear wheel
    if (v > 0.4) for (let i = 0; i < 2; i++) spawnFx(new V3(rx + R(-0.1, 0.1), 0.08, rz + R(-0.1, 0.1)), new V3(R(-0.7, 0.7) - dir.x * 0.6, R(0.3, 1.0), R(-0.7, 0.7) - dir.z * 0.6), pick([0xcfc1a3, 0xb8a98a, 0xe0d6c0]), 0.1, 0.8, 0.6);
    markD += (v0 + v) / 2 * dt; if (markD > 0.11 && v > 0.3) { markD = 0; skidMark(rx, rz, hd); }
    return v <= 0;
  });
  pro.hum.set(0);

  // 4. the proud winner
  say(G.petike, 'Első vagyok!', 2.0);
  let pt = 0;
  await each((dt) => {
    pt += dt; placeRoller(roller.pos.x, roller.pos.z, roller.heading, 0, 0, dt);
    const r = G.petike.rig, k = Math.min(1, pt * 4); r.sh[1].rotation.x = -2.9 * k; r.sh[1].rotation.z = 0.2 * k; if (r.apply) r.apply();   // fist in the air
    updatePeds(dt); return pt > 1.7;
  });
  placeRoller(roller.pos.x, roller.pos.z, roller.heading, 0, 0, 0);

  // 5. cut: the angry father
  for (const a of [G.petya, G.angi]) { a.path = null; a.targetHeading = Math.atan2(roller.pos.x - a.pos.x, roller.pos.z - a.pos.z); }
  await cut(() => atHeight((G.petya.pos.x + G.angi.pos.x) / 2, 1.25, (G.petya.pos.z + G.angi.pos.z) / 2), 3.4);
  sSting(true); shake(0.2);
  say(G.petya, 'PETYUUUUS!!!', 2.0); G.petya.point = 2.2;
  await W(2.0); say(G.petya, 'Azonnal gyere vissza! Ide, mögénk!', 2.6); G.petya.point = 2.6;
  await W(2.7); say(G.angi, 'Petya, a szomszédok is hallják…', 2.2);
  await W(2.2); say(G.petya, 'Hadd hallják! Elektromos rollerrel nem száguldozunk a parkban!', 3.0); G.petya.point = 3; shake(0.1);
  await W(3.1);

  // 6. cut back: the sulky return behind the parents; the parents walk on to the start of the family walk
  await cut(lead(0.2), 4.4);
  say(G.petike, 'Jó-jó… megyek már.', 2.2);
  await W(1.6);
  for (const [a, lane] of [[G.petya, fam.p], [G.angi, fam.a]]) {
    const rest = a.pos.x < -18.3 ? lane.slice(2) : lane.slice(3);           // still on the diagonal → via the corner
    a.walkTo(rest, 1.8);
  }
  cineFocus(() => atHeight((roller.pos.x + G.petya.pos.x) / 2, 1.0, (roller.pos.z + G.petya.pos.z) / 2 - 0.5), 8.5);
  const back = returnLine(roller.pos.x, roller.pos.z); s = 0; v = 0; h = roller.heading; let mutter = false;
  await each((dt) => {
    v = Math.min(2.6, v + 2.5 * dt); s = Math.min(back.len, s + v * dt);
    const p = back.at(s), q = back.at(s + 0.5), hh = Math.atan2(q.x - p.x, q.z - p.z);
    h = dampAngle(h, hh, 6, dt);
    placeRoller(p.x, p.z, h, 0, v, dt, -0.05);                                    // upright, sulky
    pro.hum.set(v * 0.5); updatePeds(dt);
    if (!mutter && s > back.len * 0.45) { mutter = true; say(G.petike, 'Pedig csak egy kicsit gyorsítottam…', 2.4); }
    return s >= back.len;
  });
  pro.hum.set(0);
  await each((dt) => { h = dampAngle(h, Math.PI / 2, 5, dt); placeRoller(roller.pos.x, roller.pos.z, h, 0, 0, dt); updatePeds(dt); return !G.petya.path && !G.angi.path; });
  G.petya.targetHeading = G.angi.targetHeading = Math.PI / 2;

  // 7. title, then the film look fades into the normal intro
  sSting(); await titleCard(SERIES, `${EPISODE.n}. rész · ${EPISODE.month}`, 3.4);
  endPrologue();
  await W(0.8);
}

// cleanup – also called by finishIntro() when the whole intro is skipped
export function endPrologue() {
  if (!pro.on) return; pro.on = false;
  roller.scripted = false; if (pro.hum) pro.hum.stop(); pro.hum = null;
  document.body.classList.remove('film'); $('filmTitle').classList.remove('show'); $('filmDip').classList.remove('on');
  if (cine.on) cineEnd(7.5);
  for (const n of pro.held) n.pause = R(0.3, 2.5);
  // the slalom pedestrians become ordinary park walkers (north edge of the loop: s = x + 18, lane = z + 6)
  for (const p of pro.peds) npcs.push({ actor: p.a, type: 'loop', s: p.a.pos.x + 18, dir: pick([1, -1]), speed: R(0.9, 1.3), lane: clamp(p.a.pos.z + 6, -0.6, 0.6), pause: R(0.5, 3) });
  pro.peds = [];
}
