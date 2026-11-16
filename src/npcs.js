// Petyus kalandjai – npcs: Járókelők, állatok, galambok, autók, szökőkút-vízsugár.
import * as THREE from 'three';
import { updateEvtCat, updateFlock } from './activities/cat.js';
import { Actor, animLegs, makeCat, makeDog, makePigeon, spawnFx } from './actors.js';
import { sBark, sFlap, sMeow } from './audio.js';
import { makePerson } from './rigs.js';
import { scene } from './scene.js';
import { G, animals, ball, cars, npcs, pigeons } from './state.js';
import { say } from './ui.js';
import { R, V3, clamp, damp, dampAngle, pick, rand } from './util.js';
import { getGeometry } from './voxels.js';
import { FOUNTAIN, GX0, GX1, L, benchSpots, collide, groundH, vcMat } from './world.js';

// ---------------------------------------------------------------- NPCs & animals
const LOOP = [[-18, -6], [18, -6], [18, 6], [-18, 6]];
const loopSegs = LOOP.map((p, i) => { const b = LOOP[(i + 1) % LOOP.length]; return { a: p, b, len: Math.hypot(b[0] - p[0], b[1] - p[1]) }; });
const LOOP_LEN = loopSegs.reduce((s, x) => s + x.len, 0);
export function loopPoint(s) {
  s = ((s % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
  for (const g of loopSegs) { if (s <= g.len) { const t = s / g.len; const dx = (g.b[0] - g.a[0]) / g.len, dz = (g.b[1] - g.a[1]) / g.len; return { x: g.a[0] + (g.b[0] - g.a[0]) * t, z: g.a[1] + (g.b[1] - g.a[1]) * t, dx, dz }; } s -= g.len; }
  return { x: LOOP[0][0], z: LOOP[0][1], dx: 1, dz: 0 };
}
let CAR_IDX = 0;
export function buildPeople() {
  for (let i = 0; i < 9; i++) {
    const old = rand() < 0.25;
    const act = new Actor(makePerson(old ? { hair: pick([0xb0b0b0, 0xe8e8e8]), glasses: true, scale: 0.96 } : {}), '');
    act.stride = 4.2; act.solid = true;
    const dir = rand() < 0.5 ? 1 : -1;
    npcs.push({ actor: act, type: 'loop', s: i * LOOP_LEN / 9 + R(0, 4), dir, speed: old ? R(0.7, 0.9) : R(1.0, 1.45), lane: R(0.2, 0.55) * (dir > 0 ? 1 : -1), pause: 0 });
  }
  // sidewalk walkers
  for (let i = 0; i < 4; i++) {
    const act = new Actor(makePerson({}), ''); act.solid = true;
    const z = i % 2 ? 13.5 : 18.5; const x = R(-40, 50);
    npcs.push({ actor: act, type: 'street', x, z, dir: rand() < 0.5 ? 1 : -1, speed: R(1.0, 1.4) });
  }
  // two elderly people sitting on park benches
  for (const bi of [0, 3]) {
    const b = benchSpots[bi]; const act = new Actor(makePerson({ hair: pick([0xd8d8d8, 0xb0b0b0]), glasses: true, hat: bi === 0 }), '');
    const [x, z] = L(b.x, b.z, b.rot, -0.45, -0.05); act.place(x, z, b.rot); act.sit = 1; act.sitTarget = 1;
    npcs.push({ actor: act, type: 'sit', b });
  }
  // dogs: two with owners, one free
  const dogCols = [[0xc68642, 0x8a5a2b], [0x2b2b2b, 0xf0f0f0], [0xe6c27a, 0xb08850], [0xffffff, 0x8a5a2b]];
  for (const owner of [npcs[1], npcs[5]]) {
    const [ca, cb] = pick(dogCols); const d = makeDog(ca, cb, R(0.9, 1.15)); scene.add(d.root);
    const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), new THREE.LineBasicMaterial({ color: 0xc0392b })); scene.add(leash);
    animals.push({ a: d, type: 'leashed', owner: owner.actor, pos: owner.actor.pos.clone(), heading: 0, phase: 0, leash, barkCd: 0 });
  }
  const free = makeDog(0xe6c27a, 0xb08850, 1.2); scene.add(free.root);
  animals.push({ a: free, type: 'free', pos: new V3(-8, 0, 4), heading: 0, phase: 0, target: new V3(-8, 0, 4), wait: 0, speed: 2.4, barkCd: 0 });
  // cats
  for (const [c1, c2, x, z] of [[0xf4a261, 0xffffff, -12, 9], [0x3a3a3a, 0x3a3a3a, 14, -9], [0xd9d9d9, 0x8a8a8a, -20, -2]]) {
    const c = makeCat(c1, c2); scene.add(c.root);
    animals.push({ a: c, type: 'cat', pos: new V3(x, 0, z), heading: rand() * 6, phase: 0, target: new V3(x, 0, z), wait: R(1, 5), speed: 0.7, flee: 0 });
  }
  // pigeons around the fountain
  for (let i = 0; i < 7; i++) {
    const p = makePigeon(); scene.add(p.root); const a = rand() * Math.PI * 2, rr = R(3.2, 4.4);
    pigeons.push({ p, pos: new V3(Math.cos(a) * rr, 0, Math.sin(a) * rr), home: new V3(Math.cos(a) * rr, 0, Math.sin(a) * rr), heading: rand() * 6, state: 'idle', t: R(0, 3), vel: new V3(), y: 0 });
  }
  // cars
  for (const [z, dir, col, x] of [[15, 1, 0xe63946, -30], [17, -1, 0x3a86ff, 20], [15, 1, 0xffbe0b, 30]]) {
    const g = new THREE.Mesh(getGeometry('car', CAR_IDX++ % 6), vcMat); g.castShadow = true; g.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(g); scene.add(grp);
    cars.push({ g: grp, x, z, dir, speed: R(5, 7) });
  }
}
export function updateNPCs(dt) {
  for (const n of npcs) {
    const a = n.actor;
    if (n.type === 'loop') {
      if (n.pause > 0) { n.pause -= dt; a.animate(dt, false, 0); a.sync(); continue; }
      n.s += n.dir * n.speed * dt;
      const p = loopPoint(n.s); const fx = p.dx * n.dir, fz = p.dz * n.dir;
      a.pos.set(p.x - p.dz * n.lane, 0, p.z + p.dx * n.lane);
      a.targetHeading = Math.atan2(fx, fz); a.heading = dampAngle(a.heading, a.targetHeading, 5, dt);
      a.animate(dt, true, n.speed); a.sync();
      if (rand() < dt * 0.02) { n.pause = R(1.5, 4); }
    } else if (n.type === 'street') {
      n.x += n.dir * n.speed * dt; if (n.x > 58) n.dir = -1; if (n.x < -48) n.dir = 1;
      a.pos.set(n.x, 0, n.z); a.targetHeading = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2; a.heading = dampAngle(a.heading, a.targetHeading, 4, dt);
      a.animate(dt, true, n.speed); a.sync();
    } else if (n.type === 'sit') { a.animate(dt, false, 0); if (rand() < dt * 0.05) a.rig.sh[0].rotation.x = -0.9; a.sync(); }
  }
}
function threatNear(p, r) {
  if (G.petike && G.petike.pos.distanceTo(p) < r) return G.petike.pos;
  if (ball.active && Math.hypot(ball.pos.x - p.x, ball.pos.z - p.z) < r) return ball.pos;
  return null;
}
export function updateAnimals(dt) {
  updateFlock(dt);
  for (const an of animals) {
    if (an.evt) { updateEvtCat(an, dt); continue; }
    const a = an.a; let moving = 0, spd = 0;
    an.barkCd = (an.barkCd || 0) - dt;
    if (an.type === 'leashed') {
      const o = an.owner; const h = o.heading; const tx = o.pos.x + Math.cos(h) * 0.75 - Math.sin(h) * 0.35, tz = o.pos.z - Math.sin(h) * 0.75 - Math.cos(h) * 0.35;
      const dx = tx - an.pos.x, dz = tz - an.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.08) { spd = Math.min(3.2, d * 3); an.pos.x += dx / d * spd * dt; an.pos.z += dz / d * spd * dt; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 6, dt); moving = 1; }
      const hp = new V3(); o.rig.sh[1].getWorldPosition(hp); hp.y -= 0.45;
      const cp = new V3(an.pos.x + Math.sin(an.heading) * 0.2 * a.s, 0.38 * a.s, an.pos.z + Math.cos(an.heading) * 0.2 * a.s);
      an.leash.geometry.setFromPoints([hp, cp]);
      if (ball.active && an.barkCd <= 0 && Math.hypot(ball.pos.x - an.pos.x, ball.pos.z - an.pos.z) < 3 && Math.hypot(ball.vel.x, ball.vel.z) > 2) { an.barkCd = 6; sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.0, an.pos.z) }, 'Vau! Vau!', 1.4, ''); }
    } else if (an.type === 'free') {
      const th = ball.active && Math.hypot(ball.pos.x - an.pos.x, ball.pos.z - an.pos.z) < 5 && Math.hypot(ball.vel.x, ball.vel.z) > 1.5;
      if (th) { an.target.set(ball.pos.x + R(-1, 1), 0, ball.pos.z + R(-1, 1)); an.wait = 0; if (an.barkCd <= 0) { an.barkCd = 5; sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.1, an.pos.z) }, 'Vau!', 1.2, ''); } }
      const dx = an.target.x - an.pos.x, dz = an.target.z - an.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.3) { spd = th ? 4 : an.speed; an.pos.x += dx / d * spd * dt; an.pos.z += dz / d * spd * dt; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 6, dt); moving = 1; }
      else { an.wait -= dt; if (an.wait <= 0) { an.target.set(R(-20, 20), 0, R(-9, 10)); if (Math.hypot(an.target.x, an.target.z) < 3.5) an.target.x += 6; an.wait = R(1, 4); } }
      collide(an.pos, 0.3, 0, null);
    } else if (an.type === 'cat') {
      const t = threatNear(an.pos, 2.4);
      if (t) { const dx = an.pos.x - t.x, dz = an.pos.z - t.z; const d = Math.hypot(dx, dz) || 1; an.target.set(an.pos.x + dx / d * 5, 0, an.pos.z + dz / d * 5); an.flee = 1.5; if (an.barkCd <= 0) { an.barkCd = 8; sMeow(); say({ headWorld: (v) => v.set(an.pos.x, 0.8, an.pos.z) }, 'Miaú!', 1.2, ''); } }
      an.flee -= dt;
      const dx = an.target.x - an.pos.x, dz = an.target.z - an.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.2) { spd = an.flee > 0 ? 4.2 : an.speed; an.pos.x += dx / d * spd * dt; an.pos.z += dz / d * spd * dt; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 7, dt); moving = 1; }
      else { an.wait -= dt; if (an.wait <= 0) { an.target.set(clamp(an.pos.x + R(-5, 5), -21, 21), 0, clamp(an.pos.z + R(-5, 5), -9, 10)); an.wait = R(2, 8); } }
      collide(an.pos, 0.2, 0, null);
    }
    an.phase += dt * spd * (an.type === 'cat' ? 9 : 7);
    animLegs(a, an.phase, moving);
    a.tail.rotation.z = Math.sin(G.clockT * (an.type === 'cat' ? 2 : 12)) * (an.type === 'cat' ? 0.25 : 0.5);
    if (an.type === 'cat' && !moving) { a.legs[2].rotation.x = -1.2; a.legs[3].rotation.x = -1.2; a.body.rotation.x = -0.3; a.body.position.y = -0.04; } else a.body.rotation.x = 0;
    a.root.position.set(an.pos.x, groundH(an.pos.x, an.pos.z), an.pos.z); a.root.rotation.y = an.heading;
  }
  // pigeons
  for (const pg of pigeons) {
    const p = pg.p; pg.t -= dt;
    if (pg.state === 'idle') {
      p.head.rotation.x = Math.max(0, Math.sin(G.clockT * 6 + pg.home.x)) * 0.8;
      if (pg.t <= 0) { pg.heading += R(-1.5, 1.5); pg.t = R(0.6, 2.5); }
      pg.pos.x += Math.sin(pg.heading) * 0.15 * dt; pg.pos.z += Math.cos(pg.heading) * 0.15 * dt;
      if (pg.pos.distanceTo(pg.home) > 1.2) pg.heading = Math.atan2(pg.home.x - pg.pos.x, pg.home.z - pg.pos.z);
      const th = threatNear(pg.pos, 2.6) || (animals[2] && animals[2].pos.distanceTo(pg.pos) < 2 ? animals[2].pos : null);
      if (th) { pg.state = 'fly'; pg.t = 6; const a = rand() * Math.PI * 2; pg.vel.set(Math.cos(a) * 4, 3.5, Math.sin(a) * 4); pg.heading = Math.atan2(pg.vel.x, pg.vel.z); if (rand() < 0.3) sFlap(); }
    } else if (pg.state === 'fly') {
      pg.pos.addScaledVector(pg.vel, dt); pg.y += pg.vel.y * dt;
      for (const w of p.wings) w.rotation.z = Math.sin(G.clockT * 30) * 0.9 * (w.position.x > 0 ? 1 : -1);
      if (pg.t <= 0) { pg.state = 'return'; }
    } else {
      const dx = pg.home.x - pg.pos.x, dz = pg.home.z - pg.pos.z; const d = Math.hypot(dx, dz);
      pg.heading = Math.atan2(dx, dz); const sp = Math.min(5, d * 1.5 + 0.5);
      if (d > 0.1) { pg.pos.x += dx / d * sp * dt; pg.pos.z += dz / d * sp * dt; }
      pg.y = damp(pg.y, 0, 1.5, dt);
      for (const w of p.wings) w.rotation.z = Math.sin(G.clockT * 30) * 0.9 * (w.position.x > 0 ? 1 : -1);
      if (d < 0.15 && pg.y < 0.05 && !threatNear(pg.home, 3)) { pg.state = 'idle'; pg.y = 0; pg.t = 1; for (const w of p.wings) w.rotation.z = 0; }
    }
    p.root.position.set(pg.pos.x, groundH(pg.pos.x, pg.pos.z) + pg.y, pg.pos.z); p.root.rotation.y = pg.heading;
  }
  for (const c of cars) { c.x += c.dir * c.speed * dt; if (c.x > GX1 + 4) c.x = GX0 - 4; if (c.x < GX0 - 4) c.x = GX1 + 4; c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
}
// fountain water
let jetT = 0;
export function updateFountain(dt) {
  jetT -= dt; while (jetT < 0) { jetT += 0.035; const a = rand() * Math.PI * 2; spawnFx(new V3(FOUNTAIN.x, 2.5, FOUNTAIN.z), new V3(Math.cos(a) * R(0.6, 1.0), R(2.2, 3), Math.sin(a) * R(0.6, 1.0)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2]), 0.08, 1.1, 6); }
}

