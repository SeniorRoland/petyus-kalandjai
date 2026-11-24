// Petyus kalandjai – activities/fish: 7. csibészség – „Pénzhalászat a szökőkútból”.
// At the fountain rim SPACE: Petyus finds a stick and fishes the coins off the bottom of the basin. A/D (any direction)
// walks him round the rim, SPACE held = fishing the coin in front of him (≈1 s). The park keeper patrols round the fountain;
// now and then he stops („Hmm?”) and looks: Petyus must freeze (red light, green light) – moving or fishing while he looks
// = caught (whistle, a coin goes back into the water). The fountain's middle column hides you from him.
// With at least 3 coins: off to the ice-cream cart, and the scoop lands on dad's shoe.
import * as THREE from 'three';
import { Actor, actors, spawnFx } from '../actors.js';
import { noise, sBell, sWhistle, tone } from '../audio.js';
import { dad } from '../dad.js';
import { isTouch, kickHeld, keys, touch } from '../input.js';
import { award } from '../mischief.js';
import { CAM_FWD, CAM_RIGHT, pvel } from '../player.js';
import { makePerson } from '../rigs.js';
import { scene } from '../scene.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { $, R, V3, clamp, dampAngle, pick, rand } from '../util.js';
import { FOUNTAIN } from '../world.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';
import { BENCH_ROUTE } from './photo.js';

const RIM = FOUNTAIN.r + 0.32, WATER_Y = 0.42, COINS = 12, TIME = 70, FISH_T = 1.0, REACH = 0.42, PATROL_R = 3.85, MAX_SEEN = 3;
export const fi = { on: false, t: 0, th: 0, coins: [], got: 0, seen: 0, fishT: 0, target: null, stick: null, keeper: null, kState: '', kT: 0, kA: 0,
  moved: false, sparkT: 0, end: '', cart: null, vendor: null, cone: null, scoop: null, leaving: [], leaveT: 0 };
const coinMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });   // unlit: glints through the water
const CAUGHT = ['Hé, fiatalember! A szökőkút nem pénztárca!', 'Láttalak ám! Az a pénz a szerencséé!', 'Megint te?! Vissza vele!'];
const KEEPER_HMM = ['Hmm?', 'Mi volt ez?', 'Hallottam valamit…', 'Csak nem…?'];
const KEEPER_OK = ['Hm. Semmi.', 'Biztos a galambok…', 'Na jó.'];

export const canFish = () => G.pstate === 'free' && !fi.on && !fi.end && G.mode === 'play';
export function startFish() {
  const a = G.petike;
  G.pstate = 'fish'; fi.on = true; fi.t = 0; fi.got = 0; fi.seen = 0; fi.fishT = 0; fi.target = null; fi.end = '';
  pvel.set(0, 0, 0); G.charging = false; a.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  fi.th = Math.atan2(a.pos.z - FOUNTAIN.z, a.pos.x - FOUNTAIN.x); placeOnRim();
  // the coins on the bottom
  for (const c of fi.coins) scene.remove(c.m);
  fi.coins = [];
  for (let i = 0; i < COINS; i++) addCoin();
  // the stick
  if (!fi.stick) {
    const g = new THREE.BoxGeometry(0.035, 0.035, 1); g.translate(0, 0, 0.5);
    fi.stick = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x7a5230 })); fi.stick.castShadow = true;
  }
  scene.add(fi.stick);
  // the park keeper
  fi.keeper = new Actor(makePerson({ shirt: 0x55703a, pants: 0x3f3a2c, hat: true, hatColor: 0x3f5a2c, dress: false, longHair: false, hair: 0x9a9a9a, glasses: true }), 'Parkőr');
  fi.kA = fi.th + Math.PI; fi.keeper.place(Math.cos(fi.kA) * PATROL_R, Math.sin(fi.kA) * PATROL_R, 0); fi.kState = 'walk'; fi.kT = R(4.5, 6.5); fi.dir = 0;
  say(a, pick(['Ott csillog valami… Kell egy bot!', 'Pénz a szökőkút alján? Halászni fogok!']), 2.2);
  runSeq([[2.0, () => { if (fi.keeper) say(fi.keeper, 'Rend a parkban, rend a lelkekben…', 2.2); }]]);
  setTimeout(() => { if (fi.on) $('fishTip').classList.add('show'); }, 400);
  $('fishTip').innerHTML = isTouch ? 'Joystick – körbe a peremen · <b>HALÁSZ</b> nyomva – halászni · ha a parkőr néz: <b>mozdulatlan!</b>'
    : '<b>A / D</b> – körbe a peremen · <b>Szóköz</b> nyomva – halászni · ha a parkőr néz: <b>mozdulatlan!</b> · <b>E</b> – abbahagyni';
  $('mini').style.display = 'block'; hud();
}
function addCoin() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12), coinMat);
  const r = R(1.05, 2.0), a = rand() * Math.PI * 2; m.position.set(FOUNTAIN.x + Math.cos(a) * r, WATER_Y - 0.035, FOUNTAIN.z + Math.sin(a) * r);
  m.rotation.set(R(-0.2, 0.2), rand() * 6, R(-0.2, 0.2)); scene.add(m);
  fi.coins.push({ m, a, r });
}
function hud() {
  const light = fi.kState === 'look' || fi.kState === 'scold' ? '🔴' : fi.kState === 'warn' ? '🟡' : '🟢';
  $('mini').innerHTML = `🪙 <b>${fi.got}</b> · ⏱ ${Math.max(0, Math.ceil(TIME - fi.t))} · ${light}` + (fi.seen ? ` · 👮 ${fi.seen}/${MAX_SEEN}` : '');
}
function placeOnRim() { const a = G.petike; a.pos.set(FOUNTAIN.x + Math.cos(fi.th) * RIM, 0, FOUNTAIN.z + Math.sin(fi.th) * RIM); a.targetHeading = Math.atan2(-Math.cos(fi.th), -Math.sin(fi.th)); }

export function updateFish(dt) {
  if (fi.end) return updateFinale(dt);
  const a = G.petike;
  fi.t += dt;
  // walk round the rim: the camera-relative input projected on the tangent
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  const wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const tx = -Math.sin(fi.th), tz = Math.cos(fi.th), along = wx * tx + wz * tz;
  const fishing = keys.Space || kickHeld;
  G.kickPressed = G.kickReleased = false; G.qPressed = false;
  const stop = G.usePressed; G.usePressed = false;
  // holding a direction keeps him going round the same way (at the sides of the screen the rim runs across the key's direction)
  const inp = Math.hypot(wx, wz);
  if (inp < 0.3 || fishing) fi.dir = 0; else if (Math.abs(along) > 0.35 || !fi.dir) fi.dir = Math.sign(along) || 1;
  const v = fi.dir * 2.0;
  fi.th += v / RIM * dt; placeOnRim(); fi.moved = v !== 0;
  a.heading = dampAngle(a.heading, a.targetHeading, 12, dt); a.animate(dt, fi.moved, Math.abs(v));
  // the coin in front of him (within reach of the stick)
  fi.target = null; let best = REACH;
  for (const c of fi.coins) { const d = Math.abs(Math.atan2(Math.sin(c.a - fi.th), Math.cos(c.a - fi.th))) * c.r; if (d < best) { best = d; fi.target = c; } }
  if (fishing && fi.target) {
    fi.fishT += dt;
    if (fi.fishT >= FISH_T) catchCoin(fi.target);
  } else fi.fishT = Math.max(0, fi.fishT - dt * 2);
  // pose: leaning over the rim, stick in both hands
  const r = a.rig; r.inner.rotation.x = fishing ? 0.4 : 0.15; r.sh[0].rotation.x = fishing ? -1.0 : -0.6; r.sh[1].rotation.x = fishing ? -0.9 : -0.5; a.sync();
  poseStick(fishing);
  // the coins glint
  fi.sparkT -= dt;
  if (fi.sparkT <= 0 && fi.coins.length) { fi.sparkT = 0.25; const c = pick(fi.coins); spawnFx(new V3(c.m.position.x, WATER_Y + 0.03, c.m.position.z), new V3(0, 0.4, 0), 0xffffff, 0.035, 0.35, 0); }
  if (fi.target) fi.target.m.scale.setScalar(1 + Math.sin(G.clockT * 12) * 0.25);
  for (const c of fi.coins) if (c !== fi.target) c.m.scale.setScalar(1);
  updateKeeper(dt, fishing);
  if (Math.floor(fi.t * 5) !== Math.floor((fi.t - dt) * 5)) hud();
  if (stop || fi.t >= TIME || !fi.coins.length || fi.seen >= MAX_SEEN) endFish();
}
function poseStick(fishing) {
  const a = G.petike, hb = a.rig.handBones, hp = new V3();
  if (hb) { a.rig.root.updateMatrixWorld(true); hb[0].getWorldPosition(hp); } else hp.set(a.pos.x, 0.9, a.pos.z);
  let tip;
  if (fishing && fi.target) {
    const k = clamp(fi.fishT / FISH_T, 0, 1), m = fi.target.m.position;
    tip = new V3(m.x, WATER_Y - 0.02 + Math.sin(G.clockT * 18) * 0.03 + k * 0.05, m.z);
    if (Math.random() < 0.3) spawnFx(new V3(m.x, WATER_Y + 0.02, m.z), new V3(R(-0.5, 0.5), R(0.6, 1.2), R(-0.5, 0.5)), 0xc9efff, 0.035, 0.4, 7);
  } else {
    const r0 = fishing ? 1.6 : 1.9; tip = new V3(FOUNTAIN.x + Math.cos(fi.th) * r0, fishing ? WATER_Y : 0.85, FOUNTAIN.z + Math.sin(fi.th) * r0);
    if (fishing && Math.random() < 0.3) spawnFx(tip.clone().setY(WATER_Y + 0.02), new V3(R(-0.5, 0.5), R(0.6, 1.2), R(-0.5, 0.5)), 0xc9efff, 0.035, 0.4, 7);
  }
  fi.stick.position.copy(hp); fi.stick.scale.set(1, 1, hp.distanceTo(tip) + 0.15); fi.stick.lookAt(tip);
}
function catchCoin(c) {
  fi.fishT = 0; fi.coins.splice(fi.coins.indexOf(c), 1); scene.remove(c.m); c.m.geometry.dispose();
  fi.got++; hud();
  tone('triangle', 1320, 1760, 0.12, 0.1); tone('triangle', 1760, 2350, 0.1, 0.08, 0.08);
  const P = G.petike.pos;
  for (let i = 0; i < 8; i++) spawnFx(new V3(c.m.position.x, WATER_Y + 0.05, c.m.position.z), new V3(R(-0.8, 0.8), R(1, 2), R(-0.8, 0.8)), pick([0xc9efff, 0xffcc33]), 0.04, 0.6, 7);
  if (fi.got === 1 || fi.got % 4 === 0) say(G.petike, fi.got === 1 ? 'Megvan az első!' : pick(['Pling!', `Már ${fi.got}!`, 'Gazdag leszek!']), 1.2);
}
// the keeper: patrol → warn („Hmm?”, turning) → look (red light) → patrol; moving / fishing while he looks = caught
function updateKeeper(dt, fishing) {
  const k = fi.keeper; fi.kT -= dt;
  if (fi.kState === 'walk') {
    fi.kA += 0.95 / PATROL_R * dt;   // on the paved ring round the fountain
    const x = Math.cos(fi.kA) * PATROL_R, z = Math.sin(fi.kA) * PATROL_R;
    k.targetHeading = Math.atan2(x - k.pos.x, z - k.pos.z); k.pos.set(x, 0, z); k.heading = dampAngle(k.heading, k.targetHeading, 8, dt); k.animate(dt, true, 1.05); k.sync();
    if (fi.kT <= 0) { fi.kState = 'warn'; fi.kT = 0.95; say(k, pick(KEEPER_HMM), 1.2); tone('sine', 520, 420, 0.25, 0.05); hud(); }
    return;
  }
  const toP = Math.atan2(G.petike.pos.x - k.pos.x, G.petike.pos.z - k.pos.z);
  k.heading = dampAngle(k.heading, fi.kState === 'warn' ? toP : toP, fi.kState === 'warn' ? 3.5 : 10, dt); k.animate(dt, false, 0); k.sync();
  if (fi.kState === 'warn' && fi.kT <= 0) { fi.kState = 'look'; fi.kT = R(1.6, 2.8); fi.sawT = 0; hud(); }
  else if (fi.kState === 'look') {
    if (!hidden() && (fi.moved || fishing)) { fi.sawT += dt; if (fi.sawT > 0.12) caught(); }
    else if (fi.kT <= 0) { if (rand() < 0.5) say(k, pick(KEEPER_OK), 1.2); backToWalk(); }
  } else if (fi.kState === 'scold' && fi.kT <= 0) backToWalk();
}
function backToWalk() { fi.kState = 'walk'; fi.kT = R(4, 7.5); hud(); }
// the fountain's middle column (and the bowls on it) blocks his view
function hidden() {
  const k = fi.keeper.pos, p = G.petike.pos, dx = p.x - k.x, dz = p.z - k.z, L = dx * dx + dz * dz;
  const t = clamp(((FOUNTAIN.x - k.x) * dx + (FOUNTAIN.z - k.z) * dz) / L, 0, 1);
  return Math.hypot(k.x + dx * t - FOUNTAIN.x, k.z + dz * t - FOUNTAIN.z) < 0.85;
}
function caught() {
  fi.seen++; fi.kState = 'scold'; fi.kT = 2.6; fi.fishT = 0; hud();
  sWhistle(); fi.keeper.point = 2;
  say(fi.keeper, fi.seen >= MAX_SEEN ? 'Na, elég volt! Irány anyukádhoz!' : CAUGHT[Math.min(fi.seen - 1, CAUGHT.length - 1)], 2.4);
  if (fi.got > 0) {
    fi.got--; addCoin(); hud();
    runSeq([[1.2, () => say(G.petike, pick(['De csak egy kicsit…', 'Én csak… megszámoltam őket!', 'Szerencsét hoz, nem?']), 1.8)]]);
    for (let i = 0; i < 6; i++) spawnFx(new V3(fi.coins[fi.coins.length - 1].m.position.x, WATER_Y + 0.05, fi.coins[fi.coins.length - 1].m.position.z), new V3(R(-0.6, 0.6), R(1, 1.8), R(-0.6, 0.6)), 0xc9efff, 0.04, 0.5, 7);
  }
}
function endFish() {
  fi.on = false; $('fishTip').classList.remove('show'); $('mini').style.display = 'none';
  scene.remove(fi.stick);
  for (const c of fi.coins) c.m.scale.setScalar(1);
  // the keeper walks off and leaves the park
  const k = fi.keeper; fi.keeper = null; k.walkTo([[Math.cos(fi.kA) * 16, Math.sin(fi.kA) * 16]], 1.2); fi.leaving.push(k); fi.leaveT = 12;
  if (fi.got < 3) {
    G.pstate = 'free';
    say(G.petike, fi.got === 0 ? 'Egy fillér se… pedig ott csillog!' : 'Ennyiből még egy gombóc se jön ki…', 2.4);
    return;
  }
  // with money in his pocket: ice cream!
  fi.end = 'cart'; startFinale();
}

// ---------- finale: the ice-cream cart rolls up, Petyus buys a scoop and takes it to dad
// the cart stops on the paved path east of the fountain (not in the flower bed), Petyus walks round the fountain on the ring
// path to buy (not through the water); the vendor comes and goes along the paths
const CART = [6.4, -0.3], BUY = [5.25, -0.3], RING_R = 3.6;
function ringRoute(from, to) {   // waypoints round the fountain on the ring path, then the target
  let a0 = Math.atan2(from.z - FOUNTAIN.z, from.x - FOUNTAIN.x), a1 = Math.atan2(to[1] - FOUNTAIN.z, to[0] - FOUNTAIN.x);
  let d = a1 - a0; d = Math.atan2(Math.sin(d), Math.cos(d));
  const n = Math.max(1, Math.ceil(Math.abs(d) / 0.5)), pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + d * i / n; pts.push([FOUNTAIN.x + Math.cos(a) * RING_R, FOUNTAIN.z + Math.sin(a) * RING_R]); }
  pts.push(to); return pts;
}
function buildCart() {
  const g = new THREE.Group(), m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, x, y, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  box(1.0, 0.62, 0.62, 0, 0.62, 0, 0xfdf3f7); box(1.02, 0.12, 0.64, 0, 0.36, 0, 0xf28cb1); box(1.02, 0.08, 0.64, 0, 0.95, 0, 0xf28cb1);
  for (const [x, c] of [[-0.3, 0xf7d6a6], [0, 0x8b5a3c], [0.3, 0xf6a5c0]]) box(0.2, 0.08, 0.2, x, 1.02, 0, c);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14), m(0x333333)); w.rotation.x = Math.PI / 2; w.position.set(s * 0.32, 0.2, 0.34); g.add(w); }
  box(0.04, 1.2, 0.04, 0, 1.55, 0, 0xdddddd);
  const um = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.35, 8), m(0xf28cb1)); um.position.set(0, 2.25, 0); um.castShadow = true; g.add(um);
  scene.add(g); return g;
}
function makeCone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), new THREE.MeshLambertMaterial({ color: 0xd9a35b })); c.rotation.x = Math.PI; g.add(c);
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshLambertMaterial({ color: 0x6b3b22 })); s.position.y = 0.12; g.add(s);
  scene.add(g); return { g, s };
}
function startFinale() {
  const a = G.petike, n = fi.got;
  fi.cart = fi.cart || buildCart(); fi.cart.position.set(17.4, 0, -6.4); fi.cart.rotation.y = 0; fi.cart.visible = true;
  if (!fi.vendor) { fi.vendor = new Actor(makePerson({ shirt: 0xffffff, pants: 0xf28cb1, hat: true, hatColor: 0xffffff, dress: false }), 'Fagyis'); }
  fi.vendor.place(18.2, -6.4, -Math.PI / 2); fi.vendor.walkTo([[18.2, CART[1]], [CART[0] + 0.85, CART[1]]], 2.0);
  sBell();
  const dadSeated = G.petyaMode === 'bench' || G.petyaMode === 'doze';
  const toDad = dadSeated ? [...BENCH_ROUTE].reverse().concat([[G.petya.pos.x + 0.05, G.petya.pos.z + 0.95]]) : null;
  runSeq([
    [0.2, () => say(a, n >= 10 ? 'Meggazdagodtam! Irány a fagyis!' : 'Megvan! Ebből fagyi lesz!', 2.0)],
    [0.8, () => say(fi.vendor, 'Fagyit tessék! Friss fagyi!', 2.0)],
    [0.4, () => { a.walkTo(ringRoute(a.pos, BUY), 2.4); fi.end = 'walk'; }],
    [0.2, () => { a.targetHeading = Math.atan2(CART[0] - a.pos.x, CART[1] - a.pos.z); say(a, `Egy csokit kérek! Itt van ${n} érme.`, 2.2); }, () => !a.path && !fi.vendor.path],
    [2.2, () => say(fi.vendor, n >= 10 ? 'Hűha! Ez két gombóc, kisfiam.' : n >= 6 ? 'Ez épp egy nagy gombóc.' : 'Hm… pont egy kis gombócra elég.', 2.2)],
    [2.0, () => { fi.cone = makeCone(); fi.cone.s.scale.setScalar(n >= 10 ? 1.35 : n >= 6 ? 1.15 : 0.9); tone('sine', 880, 990, 0.1, 0.06); say(a, 'Köszönöm!', 1.2); }],
    [1.2, () => { if (toDad) a.walkTo(toDad, 3.4); else say(a, 'Mmm! Ez a legjobb fagyi a világon!', 2.2); }],
    [0.3, () => { if (toDad) say(a, 'Apa, nézd! Fagyit vettem!', 2.0); }, () => !a.path],
    [1.8, () => { if (toDad) { say(G.petya, 'Fagyit? Honnan volt rá pénzed?', 2.2); dad.talkT = 12; } }],
    [2.2, () => { if (toDad) say(a, '…A szökőkútból.', 1.8); }],
    [1.1, () => { if (toDad) dropScoop(); }],
    [1.3, () => { if (toDad) say(G.petya, '…Ez az új cipőm volt.', 2.4); }],
    [2.2, () => { if (toDad) say(G.angi, 'Hihi! Legalább csokis.', 2.0); }],
    [1.6, () => {
      award('penzhalasz', n, { seen: fi.seen });
      G.pstate = 'free'; fi.end = '';
      if (fi.cone) { scene.remove(fi.cone.g); fi.cone = null; if (a.rig.elbow) a.rig.elbow[0] = 0; }
      fi.vendor.walkTo([[18.2, CART[1]], [18.2, -6.2], [22.5, -11.2], [60, -11.2]], 1.6); fi.cartGo = true; fi.leaving.push(fi.vendor); fi.vendor = null; fi.leaveT = 14;
      setTimeout(() => { if (fi.scoop) { scene.remove(fi.scoop); fi.scoop = null; } }, 15000);
    }],
  ]);
}
function dropScoop() {
  const s = fi.cone.s, from = new V3(); s.getWorldPosition(from); fi.cone.g.remove(s); scene.add(s); s.position.copy(from);
  const P = G.petya.pos; fi.scoop = s; fi.drop = { from, to: new V3(P.x + 0.11, 0.08, P.z + 0.5), t: 0 };
}
// the ice cream in the right fist: forearm up, hand in front of the chest (also while walking), the cone stuck in the fist
export const HOLD = { sh: -0.55, shz: 0.12, elbow: 1.45, grip: 0.06, up: 0.03 };
function holdCone() {
  const a = G.petike, r = a.rig;
  r.sh[0].rotation.x = HOLD.sh; r.sh[0].rotation.z = HOLD.shz; if (r.elbow) r.elbow[0] = HOLD.elbow; a.sync();
  const hb = r.handBones, hp = new V3();
  if (!hb) { fi.cone.g.position.set(a.pos.x, 1.0, a.pos.z); return; }
  r.root.updateMatrixWorld(true); hb[0].getWorldPosition(hp);
  const fp = new V3(); r.foreBones[0].getWorldPosition(fp);
  const dir = hp.clone().sub(fp).normalize();   // along the forearm, towards the fingers
  fi.cone.g.position.copy(hp).addScaledVector(dir, HOLD.grip); fi.cone.g.position.y += HOLD.up;
}
function updateFinale(dt) {
  const a = G.petike;
  a.update(dt);
  if (fi.cone) holdCone();
  if (fi.drop) {
    const d = fi.drop; d.t = Math.min(1, d.t + dt / 0.45); fi.scoop.position.lerpVectors(d.from, d.to, d.t); fi.scoop.position.y = d.from.y + (d.to.y - d.from.y) * d.t * d.t;
    if (d.t >= 1) {
      fi.drop = null; fi.scoop.scale.y *= 0.55;
      say({ headWorld: (v) => v.set(d.to.x, 0.7, d.to.z) }, 'PLACCS!', 1.4, ''); noise(0.18, 600, 0.8, 0.3);
      for (let i = 0; i < 8; i++) spawnFx(new V3(d.to.x, 0.1, d.to.z), new V3(R(-1, 1), R(0.5, 1.4), R(-1, 1)), 0x6b3b22, 0.04, 0.5, 8);
    }
  }
}
// every frame (player.js): the cart rolls in along with the vendor, the keeper / vendor walk off and are removed
export function fishTick(dt) {
  if (fi.vendor && fi.cart) { fi.vendor.update(dt); fi.cart.position.set(fi.vendor.pos.x - 0.85, 0, fi.vendor.pos.z); }
  if (!fi.leaving.length) return;
  for (const w of fi.leaving) w.update(dt);
  if (fi.cartGo && fi.cart) { const v = fi.leaving[fi.leaving.length - 1]; fi.cart.position.set(v.pos.x - Math.sin(v.heading) * -0.85, 0, v.pos.z - Math.cos(v.heading) * -0.85); fi.cart.rotation.y = v.heading + Math.PI / 2; }
  if ((fi.leaveT -= dt) <= 0) {
    for (const w of fi.leaving) { scene.remove(w.rig.root); const i = actors.indexOf(w); if (i >= 0) actors.splice(i, 1); }
    fi.leaving = []; if (fi.cartGo && fi.cart) { fi.cart.visible = false; fi.cartGo = false; }
  }
}
