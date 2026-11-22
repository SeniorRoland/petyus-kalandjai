// Petyus kalandjai – 2. rész: a ház és környéke. A lakás a társasház 2. emeletén van (home.js, FY); itt: a ház alsó
// szintjei és a szomszéd lakás/lépcsőház, a déli bejárat, a parkoló autókkal, a nagy füves udvar (nyugat, észak, kelet)
// fákkal, trambulinnal a ház mögött, drótkerítés körben, garázssor nyugaton, a szomszéd társasházak; gyerekek, kutyák, macskák.
// Coordinates: as in home.js (the flat's inner NW corner is (0, 0)); the ground is y = 0.
import { Actor, animLegs, makeCat, makeDog } from '../actors.js';
import { makePerson } from '../rigs.js';
import { scene } from '../scene.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { R, V3, clamp, dampAngle, pick } from '../util.js';
import { partMesh } from '../world.js';
import { FY, put } from './home.js';

// our block: the flat (x −0.25 … 15.85) + the stairwell and the neighbours' flat to the west; ground floor + 1st floor below
const HB = { x0: -6.25, x1: 15.85, z0: -0.25, z1: 9.45 }, FLOOR = 3;
const DOOR_X = -3.2;   // the entrance (south side, ground floor)
const FENCE = { x0: -24, x1: 34, z0: -22, z1: 17 };
const C = { facade: 0xe9dcb8, facade2: 0xdccb9f, plinth: 0x9b958b, band: 0xf4ecd6, glass: 0x5b7c99, frame: 0xf6f4ee, roofCut: 0xb7aea0,
  grass: [0x7db556, 0x86bd5c, 0x78b052], asphalt: 0x5d6066, line: 0xf2f2f2, walk: 0xcfc8bb, path: 0xd9c7a3 };

// ---------------------------------------------------------------- buildings
// a block with window rows on every side; skip(side, x) → no window there (the entrance)
function block(b, x0, z0, x1, z1, y0, floors, col, opt = {}) {
  const h = floors * FLOOR, w = x1 - x0, d = z1 - z0;
  b.bx((x0 + x1) / 2, y0, (z0 + z1) / 2, w, h, d, col, 0, 0.02);
  b.bx((x0 + x1) / 2, y0, (z0 + z1) / 2, w + 0.06, Math.min(0.6, h), d + 0.06, C.plinth, 0, 0.02);
  const step = opt.step || 1.8;
  for (let f = 0; f < floors; f++) {
    const fy = y0 + f * FLOOR;
    if (f > 0) b.bx((x0 + x1) / 2, fy - 0.06, (z0 + z1) / 2, w + 0.04, 0.12, d + 0.04, C.band, 0, 0);
    const win = (cx, cz, alongX, out) => {
      if (opt.skip && opt.skip(cx, cz, f)) return;
      const ww = opt.winW || 1.1, wh = 1.3, wy = fy + 0.9;
      if (alongX) { b.bx(cx, wy - 0.05, cz + out * 0.03, ww + 0.12, wh + 0.1, 0.08, C.frame, 0, 0); b.bx(cx, wy, cz + out * 0.05, ww, wh, 0.06, C.glass, 0, 0.03); }
      else { b.bx(cx + out * 0.03, wy - 0.05, cz, 0.08, wh + 0.1, ww + 0.12, C.frame, 0, 0); b.bx(cx + out * 0.05, wy, cz, 0.06, wh, ww, C.glass, 0, 0.03); }
    };
    for (let x = x0 + step / 2 + 0.3; x < x1 - 0.6; x += step) { win(x, z0, true, -1); win(x, z1, true, 1); }
    for (let z = z0 + step / 2 + 0.3; z < z1 - 0.6; z += step) { win(x0, z, false, -1); win(x1, z, false, 1); }
  }
  if (opt.roof !== false) b.bx((x0 + x1) / 2, y0 + h, (z0 + z1) / 2, w + 0.3, 0.25, d + 0.3, opt.roofCol || 0x8c8478, 0, 0.02);
}
function buildHouse(b) {
  // ground floor + 1st floor under the flat and the stairwell part (no roof: the flat sits on it)
  block(b, HB.x0, HB.z0, HB.x1, HB.z1, 0, 2, C.facade, { roof: false, skip: (x, z, f) => f === 0 && z === HB.z1 && Math.abs(x - DOOR_X) < 1.6 });
  // 2nd floor west of the flat: the stairwell and the neighbours' flat, cut open at the top like the rest of the floor
  block(b, HB.x0, HB.z0, -0.25, HB.z1, FY, 1, C.facade2, { roof: false, step: 2.2 });
  b.bx((HB.x0 - 0.25) / 2, FY + 2.6, (HB.z0 + HB.z1) / 2, -0.25 - HB.x0, 0.08, HB.z1 - HB.z0, C.roofCut, 0, 0);
  // stacked balconies below ours (1st floor): north and east
  const balc = (cx, cz, w, d, y, rails) => {
    b.bx(cx, y - 0.22, cz, w, 0.22, d, 0xd0c7ba, 0, 0.02);
    for (const [ax, az, bx2, bz] of rails) {
      const len = Math.hypot(bx2 - ax, bz - az), n = Math.max(2, Math.round(len / 0.15));
      for (let i = 0; i <= n; i++) b.bx(ax + (bx2 - ax) * i / n, y, az + (bz - az) * i / n, 0.03, 0.95, 0.03, 0x5c6670, 0, 0);
      b.bx((ax + bx2) / 2, y + 0.95, (az + bz) / 2, Math.abs(bx2 - ax) + 0.05, 0.05, Math.abs(bz - az) + 0.05, 0x3f474f, 0, 0);
    }
  };
  balc(13.66, -1.075, 3.98, 1.65, FLOOR, [[11.7, -1.9, 15.6, -1.9], [11.7, -1.9, 11.7, -0.3], [15.6, -1.9, 15.6, -0.3]]);
  balc(16.975, 6.76, 2.25, 4.88, FLOOR, [[18.1, 4.3, 18.1, 9.25], [15.9, 4.3, 18.1, 4.3], [15.9, 9.25, 18.1, 9.25]]);
  // the entrance: glass door, canopy, steps, the house number
  b.bx(DOOR_X, 0, HB.z1 + 0.04, 1.5, 2.4, 0.1, C.frame, 0, 0); b.bx(DOOR_X, 0.05, HB.z1 + 0.1, 1.3, 2.25, 0.05, 0x7fa6c2, 0, 0);
  b.bx(DOOR_X, 2.6, HB.z1 + 0.7, 2.4, 0.15, 1.4, 0x6d6a66, 0, 0);
  for (let i = 0; i < 3; i++) b.bx(DOOR_X, 0, HB.z1 + 0.5 + i * 0.32, 2.2, 0.16 - i * 0.05, 0.36, 0xbdb6aa, 0, 0);
  b.bx(DOOR_X + 1.2, 2.0, HB.z1 + 0.06, 0.35, 0.3, 0.04, 0x2f5f9e, 0, 0); b.bx(DOOR_X + 1.2, 2.06, HB.z1 + 0.09, 0.12, 0.18, 0.02, 0xffffff, 0, 0);
}
// the neighbouring blocks and the garage row (west)
function buildNeighbours(b) {
  block(b, -12, -52, 30, -40, 0, 5, 0xd9c8a8, {});
  block(b, 46, -24, 58, 18, 0, 4, 0xcfd6cf, {});
  block(b, -22, 30, 12, 40, 0, 4, 0xe3cfc2, {});
  block(b, 24, 30, 50, 40, 0, 4, 0xd6d0bd, {});
  block(b, -70, -14, -48, 14, 0, 5, 0xc9d1d9, {});
  // garages: a row facing east, coloured metal doors, a flat roof
  const GC = [0x8a9aa8, 0x6f8f6f, 0xa8805e, 0x7b7fa6, 0xb05a4f, 0x8f8f8f, 0x5f7f99, 0xa69b6e, 0x6f6f6f];
  b.bx(-34, 0, -2, 6, 2.6, 27, 0xcac3b6, 0, 0.02); b.bx(-34, 2.6, -2, 6.3, 0.18, 27.3, 0x777068, 0, 0);
  for (let n = 0; n < 9; n++) { const z = -14.2 + n * 3.0; b.bx(-30.97, 0.05, z, 0.06, 2.15, 2.4, GC[n], 0, 0.04); for (let k = 1; k < 6; k++) b.bx(-30.93, 0.05 + k * 0.36, z, 0.03, 0.03, 2.4, 0x555555, 0, 0); }
}

// ---------------------------------------------------------------- ground, parking, fence
function buildGround(b) {
  // grass everywhere, in patches of three greens
  for (let x = -90; x < 95; x += 5) for (let z = -75; z < 60; z += 5) b.quad(x, z, x + 5, z + 5, -0.005, pick(C.grass), 0.05);
  // the street south of the fence, sidewalks, the parking lot in front of the house, the drive to the garages, paths
  b.bx(0, 0, 21, 190, 0.02, 5, C.asphalt, 0, 0.02);
  for (let x = -90; x < 95; x += 4) b.bx(x + 1, 0.02, 21, 2, 0.01, 0.15, C.line, 0, 0);
  b.bx(0, 0, 18, 190, 0.1, 1.2, C.walk, 0, 0.02); b.bx(0, 0, 24.1, 190, 0.1, 1.2, C.walk, 0, 0.02);
  b.bx(-2, 0, 13.6, 30, 0.03, 6.0, C.asphalt, 0, 0.02);   // parking lot z 10.6 … 16.6
  for (let k = 0; k <= 9; k++) b.bx(-15.5 + k * 3.0, 0.035, 12.2, 0.1, 0.01, 2.6, C.line, 0, 0);
  b.bx(-27.5, 0, -2, 5, 0.03, 30, C.asphalt, 0, 0.02);    // in front of the garages
  b.bx(-22, 0, 13.6, 10, 0.03, 4.2, C.asphalt, 0, 0.02);  // drive: parking → garages
  b.bx(DOOR_X, 0, 10.0, 1.6, 0.05, 1.3, C.path, 0, 0.03);
  b.bx(-16.5, 0, 17, 5, 0.035, 1.2, C.asphalt, 0, 0.02);  // the gate for cars
  b.bx(DOOR_X, 0, 17, 1.6, 0.05, 1.2, C.path, 0, 0.03);   // the gate for people
  // a path round the house (gravel strip)
  b.bx((HB.x0 + HB.x1) / 2, 0, HB.z0 - 0.6, HB.x1 - HB.x0 + 2.4, 0.03, 1.2, C.path, 0, 0.04);
  b.bx(HB.x0 - 0.6, 0, (HB.z0 + HB.z1) / 2, 1.2, 0.03, HB.z1 - HB.z0, C.path, 0, 0.04);
  b.bx(HB.x1 + 0.6 + 2.3, 0, (HB.z0 + HB.z1) / 2, 1.2, 0.03, HB.z1 - HB.z0, C.path, 0, 0.04);
}
// wire fence round the yard: posts, top and bottom wires, a wire mesh grid; two openings on the south side
function buildFence(b) {
  const P = 0x3c5a46, W = 0xa9b0b5, H = 1.6;
  const gaps = [[-19, -14], [DOOR_X - 0.8, DOOR_X + 0.8]];
  const side = (ax, az, bx2, bz) => {
    const len = Math.hypot(bx2 - ax, bz - az), ux = (bx2 - ax) / len, uz = (bz - az) / len;
    for (let t = 0; t <= len + 0.001; t += 0.2) {
      const x = ax + ux * t, z = az + uz * t;
      if (az === FENCE.z1 && bz === FENCE.z1 && gaps.some(([g0, g1]) => x > g0 && x < g1)) continue;
      const post = Math.abs(t / 2.5 - Math.round(t / 2.5)) < 0.04;
      if (post) b.bx(x, 0, z, 0.07, H + 0.1, 0.07, P, 0, 0);
      else b.bx(x, 0.05, z, 0.015, H - 0.05, 0.015, W, 0, 0);
    }
    // the horizontal wires: one piece per stretch between the openings
    const cuts = az === FENCE.z1 && bz === FENCE.z1 ? gaps : [];
    let t0 = 0;
    for (const t1 of [...cuts.flatMap(([g0, g1]) => [g0 - ax, -(g1 - ax)]), len]) {
      if (t1 >= 0 && t1 > t0) for (const y of [0.05, 0.45, 0.85, 1.25, H]) b.bx(ax + ux * (t0 + t1) / 2, y, az + uz * (t0 + t1) / 2, Math.abs(ux) * (t1 - t0) + 0.015, 0.015, Math.abs(uz) * (t1 - t0) + 0.015, y === H ? P : W, 0, 0);
      if (t1 < 0) t0 = -t1;
    }
  };
  side(FENCE.x0, FENCE.z0, FENCE.x1, FENCE.z0); side(FENCE.x0, FENCE.z1, FENCE.x1, FENCE.z1);
  side(FENCE.x0, FENCE.z0, FENCE.x0, FENCE.z1); side(FENCE.x1, FENCE.z0, FENCE.x1, FENCE.z1);
}

// ---------------------------------------------------------------- props (voxel catalogue, instanced via home.js put)
export function placeOutsideProps() {
  const g = { ground: true };
  // parked cars in front of the house (some bays empty)
  [0, 1, 2, 4, 5, 7, 8].forEach((k, n) => put('car', -14 + k * 3.0, 12.4, n % 2 ? Math.PI : 0, (n * 5) % 6, g));
  put('car', -25, -9, Math.PI / 2, 3, g); put('car', 30, 21, Math.PI / 2, 4, g);   // one by the garages, one on the street
  // trees in the yard and outside
  const T = [['oak', -18, -12], ['oak', -20, 5], ['birch', -13, -18], ['pine', -21, -19], ['oak', 2, -17], ['birch', 9, -19], ['oak', 22, -16], ['pine', 30, -19],
    ['oak', 27, -5], ['birch', 30, 6], ['oak', 25, 13], ['birch', -16, 0], ['pine', 32, 14], ['oak', -8, 26], ['oak', 18, 26], ['pine', 40, -30], ['oak', -40, 22], ['birch', 40, 12]];
  T.forEach(([id, x, z], n) => put(id, x, z, n * 1.7, n % 4, { ground: true, s: 0.9 + (n % 3) * 0.12 }));
  for (const [x, z] of [[-10, -5], [-8, 14.5], [3, 14.6], [20, -10], [26, 0], [-22, 12]]) put('bush', x, z, x, Math.abs(x) % 4, g);
  // the trampoline behind the house (north), a bench and a bin by the door
  put('trampoline', 6, -9, 0, 0, g);
  put('bench', -6.2, 10.4, Math.PI, 0, g); put('bin', -0.8, 10.3, 0, 0, g);
  put('lamp', -9, 10.2, 0, 0, g); put('lamp', 6, 10.2, 0, 0, g);
}

// ---------------------------------------------------------------- life in the yard: children, dogs, cats
const AREAS = [{ x0: -22, x1: -9, z0: -20, z1: 15 }, { x0: -5, x1: 32, z0: -20, z1: -5 }, { x0: 20, x1: 32, z0: -4, z1: 15 }];   // west, north, east lawns
const randIn = () => { const a = pick(AREAS); return new V3(R(a.x0, a.x1), 0, R(a.z0, a.z1)); };
const TRAMP = { x: 6, z: -9 };
const kids = [], pets = [];
function buildLife() {
  // two on the trampoline, two playing tag on the lawn
  const looks = [{ shirt: 0xe63946, pants: 0x1d3557, hair: 0x5a3825 }, { shirt: 0xffca3a, pants: 0x3d405b, hair: 0xd8b45c, dress: true }, { shirt: 0x8ac926, pants: 0x264653, hair: 0x2b1d14 }, { shirt: 0xff70a6, pants: 0x6b705c, hair: 0x8a5a2b, longHair: true }];
  looks.forEach((o, n) => {
    const a = new Actor(makePerson({ ...o, scale: 0.68, hat: false, glasses: false }), ['Bence', 'Lili', 'Marci', 'Zsófi'][n]); a.stride = 7;
    if (n < 2) { a.place(TRAMP.x + (n ? 0.6 : -0.6), TRAMP.z + (n ? 0.3 : -0.2), n ? -2 : 1); kids.push({ a, tramp: true, ph: n * 1.7 }); }
    else { const p = randIn(); a.place(p.x, p.z, 0); kids.push({ a, tramp: false, target: randIn(), wait: R(0, 2), it: n === 2 }); }
  });
  // dogs (one big, one small) and two cats
  for (const [ca, cb, s] of [[0xe6c27a, 0xb08850, 1.2], [0x3b2f2a, 0xe9e2d6, 0.85]]) { const d = makeDog(ca, cb, s); scene.add(d.root); const p = randIn(); pets.push({ a: d, pos: p, heading: 0, target: randIn(), wait: 0, speed: R(1.4, 2.0), phase: 0, type: 'dog' }); }
  for (const [c1, c2] of [[0x2b2b2b, 0xffffff], [0xe08a3c, 0xf3d1a6]]) { const c = makeCat(c1, c2); scene.add(c.root); const p = randIn(); pets.push({ a: c, pos: p, heading: 0, target: randIn(), wait: R(3, 8), speed: 0.8, phase: 0, type: 'cat' }); }
}
// the house (with its balconies) and the parked cars are in the way: pushed out to the nearest side
const BLOCKED = [{ x0: HB.x0 - 0.4, x1: 18.5, z0: -2.3, z1: HB.z1 + 1.5 }, { x0: -17, x1: 13, z0: 10.6, z1: 16.6 }];
function keepOut(p) {
  for (const b of BLOCKED) {
    if (p.x < b.x0 || p.x > b.x1 || p.z < b.z0 || p.z > b.z1) continue;
    const d = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z], m = Math.min(...d), k = d.indexOf(m);
    if (k === 0) p.x = b.x0; else if (k === 1) p.x = b.x1; else if (k === 2) p.z = b.z0; else p.z = b.z1;
  }
}
let chatT = 6;
export function updateOutside(dt) {
  for (const k of kids) {
    const a = k.a;
    if (k.tramp) {   // bouncing: up and down on the mat (0.6 m), arms up at the top
      k.ph += dt * 3.2; const up = Math.abs(Math.sin(k.ph));
      a.animate(dt, false, 0); a.rig.sh[0].rotation.x = a.rig.sh[1].rotation.x = -2.4 * up; a.rig.sh[0].rotation.z = -0.3; a.rig.sh[1].rotation.z = 0.3;
      a.rig.knee[0].rotation.x = a.rig.knee[1].rotation.x = 0.6 * (1 - up); a.heading += dt * 0.4;
      a.sync(); a.rig.root.position.y = 0.62 + up * 1.1;
      continue;
    }
    // tag: the one who is "it" runs after the other, who wanders; now and then they swap
    const other = kids.find((o) => !o.tramp && o !== k);
    let tx = k.target.x, tz = k.target.z, sp = 1.7;
    if (k.it && other) { tx = other.a.pos.x; tz = other.a.pos.z; sp = 2.6; }
    const dx = tx - a.pos.x, dz = tz - a.pos.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (k.it && d < 0.6) { k.it = false; other.it = true; k.target = randIn(); say(a, pick(['Megvagy!', 'Te vagy a fogó!', 'Haha!']), 1.6); }
    else if (d > 0.3 && (k.it || k.wait <= 0)) { a.pos.x += dx / d * sp * dt; a.pos.z += dz / d * sp * dt; a.targetHeading = Math.atan2(dx, dz); moving = true; }
    else { k.wait -= dt; if (k.wait <= -2) { k.target = randIn(); k.wait = R(0, 1.5); } }
    keepOut(a.pos);
    a.heading = dampAngle(a.heading, a.targetHeading, 9, dt); a.animate(dt, moving, sp); a.sync(); a.rig.root.position.y = 0;   // on the ground (groundH is the flat's floor under the house)
  }
  for (const p of pets) {
    const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z, d = Math.hypot(dx, dz); let moving = 0;
    if (d > 0.3) { p.pos.x += dx / d * p.speed * dt; p.pos.z += dz / d * p.speed * dt; p.heading = dampAngle(p.heading, Math.atan2(dx, dz), 6, dt); moving = 1; }
    else { p.wait -= dt; if (p.wait <= 0) { p.target = p.type === 'dog' && Math.random() < 0.4 ? kids[2 + (Math.random() < 0.5 ? 0 : 1)].a.pos.clone() : randIn(); p.wait = p.type === 'cat' ? R(4, 10) : R(1, 4); } }
    p.pos.x = clamp(p.pos.x, FENCE.x0 + 0.5, FENCE.x1 - 0.5); p.pos.z = clamp(p.pos.z, FENCE.z0 + 0.5, FENCE.z1 - 0.5); keepOut(p.pos);
    p.phase += dt * p.speed * (p.type === 'cat' ? 9 : 7); animLegs(p.a, p.phase, moving);
    p.a.tail.rotation.z = Math.sin(G.clockT * (p.type === 'cat' ? 2 : 12)) * (p.type === 'cat' ? 0.25 : 0.5);
    if (p.type === 'cat' && !moving) { p.a.legs[2].rotation.x = -1.2; p.a.legs[3].rotation.x = -1.2; p.a.body.rotation.x = -0.3; } else p.a.body.rotation.x = 0;
    p.a.root.position.set(p.pos.x, 0, p.pos.z); p.a.root.rotation.y = p.heading;
  }
  // now and then a sound from the yard (only shown when it is in the picture)
  if ((chatT -= dt) <= 0) {
    chatT = R(7, 14);
    const p = pick(pets);
    if (p) say({ headWorld: (v) => v.set(p.pos.x, p.type === 'dog' ? 1.0 : 0.7, p.pos.z) }, p.type === 'dog' ? pick(['Vau!', 'Vau-vau!']) : pick(['Miaú!', 'Mrrr…']), 1.3, '');
  }
}

// the props go in with the flat's furniture (home.js buildHome(placeOutsideProps)); this builds the rest
export function buildOutside() {
  scene.add(partMesh((b) => buildGround(b)));
  scene.add(partMesh((b) => { buildHouse(b); buildNeighbours(b); buildFence(b); }));
  buildLife();
}
