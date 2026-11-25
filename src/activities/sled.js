// Petyus kalandjai – activities/sled: 5. csibészség – „Kutyaszán”.
// On the scooter next to a dog walker: „E – Megsétáltatom a kutyát!” → the dog pulls the scooter, Petyus can only steer
// sideways (towards where you push). The dog runs along the park path, then cuts through the park to the fountain
// (flower beds, benches, lamps in the way – every bump counts; it goes after cats it spots), and jumps in. So does Petyus.
import { spawnFx } from '../actors.js';
import { noise, sBark, sThunk, soundAt, tone } from '../audio.js';
import { dadReturn } from '../dad.js';
import { keys, touch } from '../input.js';
import { dismount } from '../intro.js';
import { award } from '../mischief.js';
import { loopPoint } from '../npcs.js';
import { CAM_FWD, CAM_RIGHT } from '../player.js';
import { poseRider } from '../roller.js';
import { G, animals, npcs, rigs, roller } from '../state.js';
import { bigText, say } from '../ui.js';
import { $, R, V3, angDiff, clamp, damp, dampAngle, pick, rand } from '../util.js';
import { FOUNTAIN, addCircleCol, collide, colliders, groundH } from '../world.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';

const SPEED = 4.6, LEASH = 2.3, LAT = 1.9;
export const sl = { on: false, dog: null, owner: null, phase: '', t: 0, path: [], lat: 0, hits: 0, hitCd: 0, catT: 0, cat: null, leapT: 0, wetT: 0 };

// a dog on a leash whose owner is right next to Petyus on the scooter
export function sledDog() {
  if (G.pstate !== 'riding' || sl.on) return null;
  for (const an of animals) if (an.type === 'leashed' && !an.sled && an.owner.pos.distanceTo(G.petike.pos) < 2.6) return an;
  return null;
}
export function startSled(an) {
  sl.on = true; sl.dog = an; sl.phase = 'intro'; sl.t = 0; sl.lat = 0; sl.hits = 0; sl.hitCd = 0; sl.catT = 0; sl.cat = null;
  sl.owner = npcs.find((n) => n.actor === an.owner); if (sl.owner) sl.owner.pause = 999;
  G.pstate = 'sled'; roller.speed = 0; roller.scripted = true; setPrompt('');   // scripted: the main loop's rollerRide() must not move the scooter
  an.sled = true; an.sledSpd = 0;
  // the route: a straight stretch of the park path (no corners – the lamps there would be unfair), then into the park
  let best = 0, bd = 1e9; for (let s = 0; s < 96; s += 0.5) { const p = loopPoint(s); const d = Math.hypot(p.x - an.pos.x, p.z - an.pos.z); if (d < bd) { bd = d; best = s; } }
  const straight = (dir) => { const p0 = loopPoint(best); let n = 0; for (let k = 1; k <= 5; k++) { const p = loopPoint(best + dir * k * 4); if (p.dx !== p0.dx || p.dz !== p0.dz) break; n = k; } return n; };
  const nf = straight(1), nb = straight(-1), dir = nf > nb || (nf === nb && rand() < 0.5) ? 1 : -1; sl.path = [];
  for (let k = 1; k <= Math.max(1, Math.max(nf, nb)); k++) { const p = loopPoint(best + dir * k * 4); sl.path.push([p.x, p.z]); }
  sl.obs = [];
  // …then into the park, straight across three obstacles (it hops over flower beds, darts under benches) –
  // the scooter right behind it crashes into them unless Petyus steers round in time
  let cur = sl.path[sl.path.length - 1]; const used = new Set();
  const obsC = (c) => c.box ? [(c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2, Math.max(c.x1 - c.x0, c.z1 - c.z0) / 2] : [c.x, c.z, c.r];
  for (let k = 0; k < 3; k++) {
    let pick1 = null, pd = 1e9;
    for (const c of colliders) {
      if (used.has(c) || c.h < 0.3) continue;
      const [ox, oz, orad] = obsC(c), df = Math.hypot(ox, oz);
      if (orad > 1.4 || df < 3.6 || df > 14 || df > Math.hypot(cur[0], cur[1]) - 0.6) continue;
      const score = Math.hypot(ox - cur[0], oz - cur[1]) + df * 0.8;
      if (score < pd) { pd = score; pick1 = c; }
    }
    if (!pick1) break;
    used.add(pick1); const [ox, oz] = obsC(pick1);
    const wp = [ox, oz];
    sl.path.push(wp); cur = wp;
    const name = pick1.box ? (pick1.h < 0.6 ? 'egy virágágyás' : 'egy pad') : pick1.h > 2 ? 'lámpa' : 'kuka';
    sl.obs.push({ x: ox, z: oz, name, warned: false });
  }
  const dl = Math.hypot(cur[0], cur[1]) || 1;
  sl.path.push([cur[0] * (FOUNTAIN.r + 0.8) / dl, cur[1] * (FOUNTAIN.r + 0.8) / dl]);   // and straight at the fountain – it jumps from just outside the rim
  say(G.petike, 'Néni, megsétáltathatom a kutyát? Rolleren!', 2.2);
  runSeq([
    [2.0, () => say(an.owner, 'Persze, kisfiam! De vigyázz, Bodri erős!', 2.4, '')],
    [2.4, () => { say(G.petike, 'Nem gond! Gyí, Bodri!', 1.6); sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.0, an.pos.z) }, 'VAU!', 1.0, ''); sl.phase = 'run'; $('mini').style.display = 'block'; hud(); }],
  ]);
}
function hud() { $('mini').innerHTML = `🐕 Kutyaszán · ütközés: <b>${sl.hits}</b>`; }
export function updateSled(dt) {
  const a = G.petike, ro = roller, an = sl.dog;
  G.kickPressed = G.kickReleased = false; G.usePressed = false; G.qPressed = false;
  sl.t += dt; sl.hitCd -= dt;
  if (sl.phase === 'intro') { an.sledSpd = 0; leash(); poseRider(ro); return; }
  if (sl.phase === 'run') {
    // over (or under) an obstacle the dog makes a little hop
    let over = false; for (const c of colliders) { if (c.h < 0.3 || c.h > 1.3) continue; if (c.box ? an.pos.x > c.x0 - 0.2 && an.pos.x < c.x1 + 0.2 && an.pos.z > c.z0 - 0.2 && an.pos.z < c.z1 + 0.2 : Math.hypot(an.pos.x - c.x, an.pos.z - c.z) < c.r + 0.2) { over = true; break; } }
    an.y = damp(an.y || 0, over ? 0.45 : 0, 14, dt);
    // the dog: next waypoint – or a cat it has just spotted
    if (!sl.cat && sl.catT <= 0) for (const c of animals) if (c.type === 'cat' && !c.evt && c.pos.distanceTo(an.pos) < 6) { sl.cat = c; sl.catT = 1.6; sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.0, an.pos.z) }, 'VAU! VAU! VAU!', 1.2, ''); say(a, 'Bodri, NEEE! Az egy cica!', 1.6); break; }
    if (sl.cat) { sl.catT -= dt; if (sl.catT <= 0) { sl.cat = null; sl.catT = 6; } } else if (sl.catT > 0) sl.catT -= dt;
    // Petyus calls out the obstacle the dog is heading for, so there is time to steer round it
    for (const o of sl.obs) if (!o.warned && Math.hypot(o.x - an.pos.x, o.z - an.pos.z) < 5) { o.warned = true; say(a, o.name === 'lámpa' ? 'Vigyázz, lámpa!' : `Jaj, ${o.name}!`, 1.3); }
    const tgt = sl.cat ? [sl.cat.pos.x, sl.cat.pos.z] : sl.path[0];
    const dx = tgt[0] - an.pos.x, dz = tgt[1] - an.pos.z, d = Math.hypot(dx, dz);
    if (!sl.cat && d < 0.6) { sl.path.shift(); if (!sl.path.length) return leap(); }
    an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 5, dt);
    // the leash: if the scooter lags behind (stuck at an obstacle) the dog is held back
    const gap = Math.hypot(ro.pos.x - an.pos.x, ro.pos.z - an.pos.z);
    const sp = SPEED * (sl.cat ? 1.15 : 1) * clamp(1 - (gap - LEASH - 0.4) * 0.45, 0.15, 1);
    an.pos.x += Math.sin(an.heading) * sp * dt; an.pos.z += Math.cos(an.heading) * sp * dt; an.sledSpd = sp;
    // the scooter trails the dog on the leash; Petyus pushes it sideways (camera-relative input projected on the dog's left)
    let ix = 0, iy = 0;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (touch.active) { ix = touch.x; iy = touch.y; }
    const wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
    const h = an.heading, lx = Math.cos(h), lz = -Math.sin(h);           // the dog's left (+X at heading 0)
    sl.lat = clamp(sl.lat + (wx * lx + wz * lz) * 2.4 * dt, -LAT, LAT);
    const tx = an.pos.x - Math.sin(h) * LEASH + lx * sl.lat, tz = an.pos.z - Math.cos(h) * LEASH + lz * sl.lat;
    const ox = ro.pos.x, oz = ro.pos.z;
    ro.pos.x = damp(ro.pos.x, tx, 6, dt); ro.pos.z = damp(ro.pos.z, tz, 6, dt);
    let hit = false;
    if (Math.hypot(ro.pos.x - an.pos.x, ro.pos.z - an.pos.z) < LEASH + 1.6) collide(ro.pos, 0.35, 0, (nx, nz, c) => { if (c.box || Math.hypot(c.x - FOUNTAIN.x, c.z - FOUNTAIN.z) > 0.1) hit = true; });   // the fountain is the goal, not an obstacle
    else sl.hitCd = Math.min(sl.hitCd, 0.2);   // badly stuck: the dog yanks the scooter free (over whatever was in the way)
    if (hit && sl.hitCd <= 0) {
      sl.hitCd = 0.9; sl.hits++; hud(); sThunk(8);
      say(a, pick(['Áú!', 'Bocsánat, pad!', 'Jaj, a virágok!', 'Hoppá!', 'Bodri, lassabban!']), 1.3);
      for (let i = 0; i < 6; i++) spawnFx(new V3(ro.pos.x, 0.3, ro.pos.z), new V3(R(-1, 1), R(0.5, 1.5), R(-1, 1)), 0x6bb94e, 0.05, 0.5, 6);
    }
    const mv = Math.hypot(ro.pos.x - ox, ro.pos.z - oz) / Math.max(dt, 1e-4);
    const want = Math.atan2(an.pos.x - ro.pos.x, an.pos.z - ro.pos.z), turn = angDiff(ro.heading, want);
    ro.heading = dampAngle(ro.heading, want, 8, dt); ro.speed = mv; ro.lean = damp(ro.lean, clamp(-turn * 1.2, -0.3, 0.3), 6, dt); ro.t += dt;
    if (rand() < dt * 0.4) say(a, pick(['Juhééé!', 'Bodri, balra! A másik balra!', 'Ez jobb, mint a motor!', 'Gyííí!']), 1.4);
  } else if (sl.phase === 'leap') {
    // the dog jumps into the fountain, the scooter stops dead at the rim and Petyus flies in after it
    sl.leapT += dt; const k = Math.min(1, sl.leapT / 0.55);
    an.pos.lerpVectors(sl.from, sl.to, k); an.y = Math.sin(k * Math.PI) * 0.9; an.sledSpd = 2;
    if (k >= 1 && !sl.dogIn) { sl.dogIn = true; for (let i = 0; i < 25; i++) spawnFx(new V3(an.pos.x, 0.45, an.pos.z), new V3(R(-1.5, 1.5), R(1.5, 3.5), R(-1.5, 1.5)), pick([0x8fd8ff, 0xc9efff, 0xffffff]), 0.06, 0.8, 9.8); soundAt(an.pos.x, an.pos.z, () => noise(0.4, 900, 0.6, 0.3), 1.5); }
    // the leash yanks him off: the scooter stops dead at the rim, Petyus flies over it head first
    if (sl.leapT > 0.22 && sl.flyT < 0) startFly();
    if (sl.flyT >= 0) { flyTick(dt); return leash(); }
  } else if (sl.phase === 'wet') {
    sl.wetT -= dt; an.sledSpd = 0; an.y = -0.15;
    const r = a.rig; a.animate(dt, false, 0); r.inner.position.y = -0.35; r.sh[0].rotation.x = r.sh[1].rotation.x = -2.6; a.sync();   // sitting in the water, arms up
    if (sl.wetT <= 0) finish();
    return leash();
  }
  ro.group.position.set(ro.pos.x, groundH(ro.pos.x, ro.pos.z), ro.pos.z); ro.group.rotation.set(0, ro.heading, ro.lean, 'YXZ');
  poseRider(ro); a.pos.copy(ro.pos); a.heading = ro.heading;
  leash();
}
// the leash from Petyus' hand to the dog's collar (npcs.js draws the dog, we draw the leash while sledding)
function leash() {
  const an = sl.dog, hp = new V3();
  const r = G.petike.rig, hb = r.handBones && r.handBones[1];   // the skinned rig's sh[] are proxies outside the scene graph – use the real hand bone
  if (hb) { r.root.updateMatrixWorld(true); hb.getWorldPosition(hp); } else { r.sh[1].getWorldPosition(hp); hp.y -= 0.35; }
  an.sledLeash = [hp, new V3(an.pos.x + Math.sin(an.heading) * 0.2 * an.a.s, 0.38 * an.a.s + (an.y || 0), an.pos.z + Math.cos(an.heading) * 0.2 * an.a.s)];
}
function leap() {
  const an = sl.dog; sl.phase = 'leap'; sl.leapT = 0; sl.splashed = false; sl.flyT = -1; sl.dogIn = false;
  const d = Math.hypot(an.pos.x, an.pos.z) || 1;
  sl.from = an.pos.clone(); sl.to = new V3(an.pos.x / d * 1.4, 0, an.pos.z / d * 1.4);
  sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.0, an.pos.z) }, 'VAUUU!', 1.2, '');
  say(G.petike, 'Bodri, ne! A szökőkút! NEEEE!', 1.6);
}
// the scooter is left at the rim; Petyus (in his football kit again) flies in an arc over the rim into the basin
function startFly() {
  const ro = roller, a = G.petike; sl.flyT = 0;
  roller.scripted = false;
  const d = Math.hypot(ro.pos.x, ro.pos.z) || 1, ux = ro.pos.x / d, uz = ro.pos.z / d, rimX = ux * (FOUNTAIN.r + 0.45), rimZ = uz * (FOUNTAIN.r + 0.45);
  ro.pos.set(rimX, 0, rimZ); ro.speed = 0; ro.lean = 0.1;
  ro.group.position.set(rimX, groundH(rimX, rimZ), rimZ); ro.group.rotation.set(0, ro.heading, ro.lean, 'YXZ');
  dismount(rimX, rimZ);
  a.setRig(rigs.foci); a.stride = 6.5; a.swing = 0.7; a.heading = a.targetHeading = Math.atan2(-ux, -uz);
  addCircleCol(rimX, rimZ, 0.3, 1.0); G.rollerCol = colliders[colliders.length - 1]; G.rollerCol.soft = true;
  // a little to the side of the dog
  const side = 0.35; sl.flyFrom = new V3(rimX, 0, rimZ); sl.flyTo = new V3(ux * 1.75 - uz * side, 0, uz * 1.75 + ux * side);
  tone('triangle', 600, 1200, 0.35, 0.08);
}
function flyTick(dt) {
  const a = G.petike, r = a.rig; sl.flyT += dt; const k = Math.min(1, sl.flyT / 0.75);
  a.pos.lerpVectors(sl.flyFrom, sl.flyTo, k);
  a.animate(dt, false, 0);
  // head first, arms stretched out in front, legs trailing
  r.inner.rotation.x = 1.5 * Math.sin(Math.min(1, k * 1.3) * Math.PI / 2) - (k > 0.85 ? (k - 0.85) * 4 : 0);
  r.sh[0].rotation.x = r.sh[1].rotation.x = -2.9 * Math.min(1, k * 3); r.sh[0].rotation.z = -0.2; r.sh[1].rotation.z = 0.2;
  r.hip[0].rotation.x = 0.35 + Math.sin(sl.flyT * 18) * 0.25; r.hip[1].rotation.x = 0.35 - Math.sin(sl.flyT * 18) * 0.25;
  a.sync(); a.rig.root.position.y = 0.25 + Math.sin(k * Math.PI) * 1.05 - k * 0.25;
  if (k >= 1 && !sl.splashed) splash();
}
function splash() {
  const an = sl.dog, a = G.petike; sl.splashed = true; sl.flyT = -1;
  for (let i = 0; i < 70; i++) spawnFx(new V3(R(-0.8, 0.8) + a.pos.x, 0.5, R(-0.8, 0.8) + a.pos.z), new V3(R(-2.5, 2.5), R(2, 5), R(-2.5, 2.5)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2, 0xffffff]), 0.07, 1.1, 9.8);
  soundAt(0, 0, () => { noise(0.9, 700, 0.5, 0.5); noise(1.2, 2200, 0.6, 0.22, 0.1); }, 2);
  bigText('CSOBBANÁS!', 1.8);
  sl.phase = 'wet'; sl.wetT = 6.5; $('mini').style.display = 'none';
  const owner = sl.dog.owner;
  runSeq([
    [0.6, () => say(a, 'Brrr! Ez hideg! …De jó volt!', 2.2)],
    [2.0, () => say(owner, 'Bodri még sosem volt ilyen boldog!', 2.4, '')],
    [2.0, () => { say(G.petya, pick(['PETYUUUS! Kifelé a szökőkútból!', 'Ezt nem hiszem el… MEGINT a szökőkút?!']), 2.4); G.petya.point = 2; }],
    [1.6, () => say(G.angi, 'Hozom a törölközőt!', 2.0)],
  ]);
}
function finish() {
  const an = sl.dog;
  sl.on = false; an.sled = false; an.y = 0; an.sledLeash = null;
  if (sl.owner) sl.owner.pause = R(0.5, 2);
  G.pstate = 'free'; G.viewSizeTarget = 8.5;
  // out of the water, onto the rim
  const a = G.petike, d = Math.hypot(a.pos.x, a.pos.z) || 1; a.pos.set(a.pos.x / d * (FOUNTAIN.r + 0.5), 0, a.pos.z / d * (FOUNTAIN.r + 0.5)); a.sync();
  dadReturn();
  award('kutyaszan', sl.hits);
}
