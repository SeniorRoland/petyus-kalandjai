// Petyus kalandjai – 2. rész: Petyus pisil a WC-be. Felnyitott fedélnél a WC előtt Szóköz (érintőn: PISILÉS): célzás jobbra-balra
// (A / D, nyilak, érintőn a botkormány), a sugár magától is kalandozik, a végén elfogy a nyomás és rövidebbre esik – ami nem a
// csészébe megy, az a padlón tócsa lesz (ha az ülőke lent van, arra is jut). Szóköz / E: vége előbb.
import * as THREE from 'three';
import { noise, soundAt } from '../audio.js';
import { isTouch, keys, touch } from '../input.js';
import { CAM_RIGHT } from '../player.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { R, clamp, damp, dampAngle, pick } from '../util.js';
import { TOILET } from '../voxels-home.js';
import { homeRoot, toiletSeat } from './home.js';

const DUR = 7.5, FADE = 1.6;   // seconds of peeing; the last part loses pressure
export const pee = { on: false, done: false, t: 0, aim: 0, drift: 0, misses: 0, seatHits: 0, hits: 0, sndT: 0, said: false, stream: null, puddles: [] };
// the toilet in use: { x, z (where its catalogue model stands – it faces +z), state() (0 lid down, 1 seat down, 2 seat up), root
// (the group the stream and the puddles go into), scold(text) (who tells him off), wet() } – at home the flat's one (default)
const HOME_WC = { get x() { return toiletSeat.x; }, get z() { return toiletSeat.z; }, state: () => toiletSeat.state, get root() { return homeRoot; },
  scold: (seat) => say(G.angi, seat ? 'PETYUS!! Hányszor mondjam, hogy hajtsd fel az ülőkét?!' : 'Petyus! Már megint mellé ment?! Töröld fel!!', 2.8), wet: () => { toiletSeat.wet = true; } };
let wc = HOME_WC;
export function useToilet(t) { wc = t || HOME_WC; }
const bowl = () => ({ x: wc.x, z: wc.z + TOILET.cz });
const STAND_DZ = 0.55;   // he stands this far in front of the bowl's middle

export const canPee = (t) => { useToilet(t); return wc.state() >= 1 && !pee.done && !pee.on; };
export const peeLabel = () => (isTouch ? '' : 'Szóköz – pisilés');

export function startPee(t) {
  if (t) useToilet(t);
  const b = bowl(), a = G.petike;
  pee.on = true; pee.t = 0; pee.aim = R(-0.05, 0.05); pee.drift = 0; pee.misses = 0; pee.seatHits = 0; pee.hits = 0; pee.said = false; pee.sndT = 0;
  pee.goal = { x: b.x, z: b.z + STAND_DZ };
  if (!pee.stream) {   // the stream: a chain of small yellow blocks along an arc
    const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0xf2d43a, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), mat); g.add(m); }
    pee.stream = g;
  }
  if (pee.stream.parent !== wc.root) wc.root.add(pee.stream);
  pee.stream.visible = false;
  say(a, pick(['Pisi-pisi…', 'Na végre…', 'Célzás…']), 1.4);
}

// true while peeing (the walking is off then)
export function peeTick(dt) {
  if (!pee.on) return false;
  const a = G.petike, r = a.rig, b = bowl();
  pee.t += dt;
  // step up to the bowl, facing it
  a.pos.x = damp(a.pos.x, pee.goal.x, 10, dt); a.pos.z = damp(a.pos.z, pee.goal.z, 10, dt);
  a.heading = a.targetHeading = dampAngle(a.heading, Math.PI, 12, dt);
  a.animate(dt, false, 0);
  r.sh[0].rotation.x = r.sh[1].rotation.x = -0.45; r.sh[0].rotation.z = 0.25; r.sh[1].rotation.z = -0.25;   // hands in front
  r.inner.rotation.x = -0.06;   // hips forward a little
  a.sync();
  const go = pee.t > 0.6;   // a moment to get ready
  // aiming: the player steers left / right on the screen, the stream wanders by itself too
  const lr = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (touch.active ? touch.x : 0);
  const sx = Math.abs(CAM_RIGHT.x) > 0.3 ? Math.sign(CAM_RIGHT.x) : 1;
  pee.drift = clamp(pee.drift * (1 - dt * 0.6) + R(-1, 1) * dt * 1.6, -0.2, 0.2);   // it wanders off by itself – steer it back
  pee.aim = clamp(pee.aim + (clamp(lr, -1, 1) * sx * 0.55 + pee.drift) * dt, -0.4, 0.4);
  // the pressure: full, then fading at the end – the stream falls shorter and shorter (onto the rim, the floor)
  const p = pee.t < DUR - FADE ? 1 : clamp((DUR - pee.t) / FADE, 0, 1);
  const ox = a.pos.x, oz = a.pos.z - 0.12, oy = r.hipH * 0.92 + 0.02;
  const tx = b.x + pee.aim, tz = oz - (0.12 + 0.42 * p);
  // where it lands
  const dx = (tx - b.x) / TOILET.rx, dz = (tz - b.z) / TOILET.rz, inRim = dx * dx + dz * dz < 0.8;
  const inWater = Math.abs(tx - b.x) < TOILET.hx && Math.abs(tz - b.z) < TOILET.hz;
  const seatDown = wc.state() === 1;
  const where = !inRim ? 'floor' : inWater ? 'water' : seatDown ? 'seat' : 'bowl';
  const ty = where === 'floor' ? 0.005 : where === 'seat' ? 0.43 : where === 'water' ? 0.27 : 0.33;
  // the stream: an arc from him to there
  const st = pee.stream; st.visible = go && p > 0.02;
  if (st.visible) {
    const n = st.children.length;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), m = st.children[i];
      m.position.set(ox + (tx - ox) * k + Math.sin(G.clockT * 30 + i) * 0.004, oy + (ty - oy) * k * k + 0.06 * p * Math.sin(k * Math.PI) * (1 - k), oz + (tz - oz) * k);
      m.scale.setScalar(0.6 + p * 0.6);
    }
  }
  if (go && p > 0.02) {
    pee.sndT -= dt;
    if (pee.sndT <= 0) {
      pee.sndT = 0.12;
      soundAt(tx, tz, () => (where === 'water' ? noise(0.16, R(2200, 3000), 2.5, 0.07) : noise(0.16, R(600, 900), 1, 0.06)), 1);
    }
    if (where === 'water' || where === 'bowl') pee.hits += dt;
    else if (where === 'seat') { pee.seatHits += dt; drip(tx, ty, tz); }
    else { pee.misses += dt; puddle(tx, tz, dt); drip(tx, ty, tz); }
    if (!pee.said && (where === 'floor' || where === 'seat') && pee.t < DUR - FADE) { pee.said = true; say(a, pick(['Hupsz!', 'Hoppá… mellé!', 'Jaj, nem oda!']), 1.4); }
  }
  // done (or stopped early with Space / E)
  if (pee.t >= DUR || (pee.t > 1.2 && (G.kickPressed || G.usePressed))) finishPee();
  G.kickPressed = G.usePressed = false;
  return true;
}
function drip(x, y, z) {
  if (Math.random() < 0.5) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.015), new THREE.MeshLambertMaterial({ color: 0xf2d43a }));
  const root = wc.root; m.position.set(x + R(-0.03, 0.03), y + 0.01, z + R(-0.03, 0.03)); root.add(m);
  setTimeout(() => root.remove(m), 400);
}
// a puddle on the floor: grows where it lands (a new one if it lands further away)
function puddle(x, z, dt) {
  let pd = pee.puddles.find((q) => Math.hypot(q.x - x, q.z - z) < q.r + 0.06);
  if (!pd) {
    if (pee.puddles.length > 8) pd = pee.puddles[0];
    else {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshLambertMaterial({ color: 0xe8d25a, transparent: true, opacity: 0.55, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004 + pee.puddles.length * 0.0005, z); m.scale.setScalar(0.02); wc.root.add(m);
      pd = { x, z, r: 0.02, m }; pee.puddles.push(pd);
    }
  }
  pd.r = Math.min(0.28, pd.r + dt * 0.09); pd.m.scale.set(pd.r * R(0.95, 1.05), pd.r, 1);
}
function finishPee() {
  const a = G.petike; pee.on = false; pee.done = true;
  if (pee.stream) pee.stream.visible = false;
  a.rig.inner.rotation.x = 0;
  const miss = pee.misses + pee.seatHits;
  if (miss < 0.15) say(a, pick(['Telitalálat!', 'Mint egy profi!', 'Egy csepp se ment mellé!']), 1.8);
  else if (miss < 1) say(a, pick(['Majdnem… senki nem veszi észre.', 'Az a pár csepp nem számít…']), 2.0);
  else {
    say(a, pick(['Upsz… ez sok lett.', 'Hát… a padló is kapott.']), 1.8);
    // mum notices (from wherever she is)
    const seat = pee.seatHits > 0.5, w = wc; setTimeout(() => w.scold(seat), 1800);
  }
  if (pee.seatHits > 0.5) wc.wet();
}
// after flushing: he can go again
export function peeFlushed() { pee.done = false; }
