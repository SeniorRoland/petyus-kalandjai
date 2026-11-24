// Petyus kalandjai – 2. rész: Szeptember. Indítás (a park helyett a lakás), fő lépés (stepEp2), naptár és óra, reggeli jelenet.
// For now: home, morning (6:00–7:30) – the flat, the three of them in pajamas, Petyus walks around; dad and mum keep talking.
import * as THREE from 'three';
import { updateFx } from '../actors.js';
import { updateCamera } from '../camera.js';
import { isTouch, keys, touch } from '../input.js';
import { totalStars } from '../mischief.js';
import { updateOcclusion } from '../occlude.js';
import { CAM_FWD, CAM_RIGHT } from '../player.js';
import { turnView, updateViewTurn, viewTurn } from '../viewturn.js';
import { EPISODES, G, SERIES, ball, rigs, roller } from '../state.js';
import { CAM_OFF, SUN_OFF, camTarget, camera, renderer, scene, sun, view as screen } from '../scene.js';
import { say, toast, updateBubbles } from '../ui.js';
import { $, V3, clamp, damp, dampAngle, lerp, pick } from '../util.js';
import { INSTANCES, collide, colliders, setGround } from '../world.js';
import { setPrompt } from '../activities/drinking.js';
import { FY, SPOTS, roomAt, buildHome, lightPool, ceiling, cutWalls, doors, switches, toggleDoor, toggleSwitch, flushToilet, toggleToiletSeat, toiletSeat, toiletSeatLabel, updateHome, wallView } from './home.js';
import { noise, sStep, setMasterVol, setOutdoor, tone } from '../audio.js';
import { buildOutside, placeOutsideProps, updateOutside } from './outside.js';
import { buildAppliances, devices, fx, seating, updateAppliances } from './appliances.js';
import { buildInventory, cycleItem, holdingController, inv, invAction, invTake, itemObj, pickLabel, pickUp, pickables, selectItem, updateInventory } from './inventory.js';
import { buildKarcsi, cageDoorOpen, cageFront, toggleCageDoor, updateKarcsi, wheek } from './karcsi.js';
import { dressPajama } from './pajama.js';
import { cf, coffeeTick, dadBusy } from './coffee.js';
import { dadChasing, momBusy, runawayTick, rw } from './runaway.js';
import { giveKeyHint, kh, keyBusy, keyHintLabel, keyTick } from './keyhunt.js';
import { karcsiState, karcsiTakeable, pigObj, takeKarcsi } from './karcsi.js';

// ---------------------------------------------------------------- unlocking
export const EP2_STARS = 15;   // part 1's mischief stars needed
// developer access (npm run dev): always open, and ?resz=2 starts it at once. import.meta.env.DEV is false in the build,
// so Vite drops these branches – the released page has no way round the 15 stars.
export const ep2Unlocked = () => (import.meta.env.DEV ? true : totalStars() >= EP2_STARS);
export const ep2DevStart = () => import.meta.env.DEV && new URLSearchParams(location.search).get('resz') === '2';

// ---------------------------------------------------------------- calendar and clock
const DAY0 = new Date(2026, 8, 2), DAYS = 29;   // 2026. szeptember 2. (szerda) … 30. (szerda)
const WEEKDAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
export const ep2 = { day: 0, min: 6 * 60, room: null, talkT: 6, seen: new Set(), momT: 9, momAt: 'cook', petyusLine: 0, lateMin: 0 };
// the mischiefs make the family late (minutes): shown on the HUD (⏰)
export function addLate(min) { ep2.lateMin += min; hudLate(); toast(`⏰ Késés: <b>+${min} perc</b>`, 2.6); }
function hudLate() { const el = $('e2Late'); if (!el) return; el.style.display = ep2.lateMin > 0 ? '' : 'none'; $('e2LateN').textContent = ep2.lateMin; }

// ---------------------------------------------------------------- saving the day's state (before going back to the menu, on leaving)
// part 1's mischief results are saved on their own (mischief.js); part 2 keeps where the player is: the day, the clock,
// Petyus's place, the doors, the lights, the wall view, Karcsi's cage door. The September tile then says „Folytatás”.
const SAVE_KEY = 'petyus.r2.allapot';
export function ep2HasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function saveEp2() {
  const p = G.petike, st = { v: 1, day: ep2.day, min: ep2.min, x: p.pos.x, z: p.pos.z, h: p.heading,
    doors: doors.filter((d) => d.pivot).map((d) => d.open), seat: toiletSeat.state, lights: switches.map((s) => s.on), walls: wallView.mode, cage: cageDoorOpen(), late: ep2.lateMin };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ }
}
function loadEp2() {
  let st = null; try { st = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { st = null; }
  if (!st || st.v !== 1) return false;
  ep2.day = clamp(st.day | 0, 0, DAYS - 1); ep2.min = clamp(+st.min || 6 * 60, 6 * 60, MORNING_END);
  G.petike.place(st.x, st.z, st.h); G.petike.pos.y = FY;
  doors.filter((d) => d.pivot).forEach((d, i) => { if (typeof st.doors?.[i] === 'boolean' && d.open !== st.doors[i]) { toggleDoor(d); d.t = d.open ? 1 : 0; } });
  switches.forEach((s, i) => { if (typeof st.lights?.[i] === 'boolean' && s.on !== st.lights[i]) toggleSwitch(s); });
  if (st.walls === 'fade' || st.walls === 'sink') wallView.mode = st.walls;
  ep2.lateMin = clamp(st.late | 0, 0, 300);
  if (typeof st.cage === 'boolean' && st.cage !== cageDoorOpen()) toggleCageDoor();
  if (typeof st.seat === 'number') { toiletSeat.state = clamp(st.seat | 0, 0, 2); toiletSeat.lidT = toiletSeat.state >= 1 ? 1 : 0; toiletSeat.seatT = toiletSeat.state === 2 ? 1 : 0; }
  return true;
}
window.addEventListener('pagehide', () => { if (G.episode === 2 && G.mode === 'play') saveEp2(); });
const MORNING_END = 7 * 60 + 30, MIN_PER_SEC = 90 / 600;   // the 90 morning minutes take 10 real minutes (to be tuned)
export function dateText(d = ep2.day) { const t = new Date(DAY0); t.setDate(t.getDate() + d); return `2026. szeptember ${t.getDate()}., ${WEEKDAYS[t.getDay()]}`; }
const clockText = (m) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- start: the park goes, the flat comes
export function startEp2() {
  G.episode = 2;
  setMasterVol(0.9);   // indoors: louder than the park
  for (const o of [...scene.children]) if (!o.isLight && o !== sun.target) scene.remove(o);   // part 1's world (built at boot)
  colliders.length = 0; INSTANCES.length = 0;
  setGround((x, z) => (x > -0.4 && x < 18.3 && z > -2.1 && z < 9.6 ? FY : 0));   // the flat (and its balconies) is upstairs, the yard on the ground
  ball.active = false; roller.rider = null; roller.path = null;
  scene.background.set(0xcde8f5);
  // bright morning: the sun is low in the east (through the east windows), cool sky light
  SUN_OFF.set(30, 26, -4); sun.color.set(0xfff3dc); sun.intensity = 2.3;
  sun.castShadow = false;   // the shadows in the flat come from its ceiling lamps (home.js lightPool), not the sun
  // the sky light's ground colour was the park's grass (green): indoors every downward face (a fridge's ceiling, the underside
  // of a shelf) would look green – a warm neutral instead
  scene.traverse((o) => { if (o.isHemisphereLight) o.groundColor.set(0xb9ab98); });
  buildHome(placeOutsideProps); buildOutside(); buildKarcsi(); buildAppliances(); buildInventory();
  // the three of them in pajamas (Petyus: the football kit's model – the walking one)
  dressPajama(rigs.foci, 'petyus'); dressPajama(rigs.petya, 'petya'); dressPajama(rigs.angi, 'angi');
  G.petike.riding = false; G.petike.setRig(rigs.foci); G.petike.stride = 6.5; G.petike.swing = 0.7;
  scene.add(G.petya.rig.root, G.angi.rig.root);
  const s = SPOTS;
  G.petike.place(s.petyusWake.x, s.petyusWake.z, s.petyusWake.h);
  G.petya.path = null; G.petya.place(s.dadChair.x, s.dadChair.z, s.dadChair.h); G.petya.seatH = 0.45; G.petya.seatBase = FY; G.petya.sit = G.petya.sitTarget = 1;
  G.angi.path = null; G.angi.sit = G.angi.sitTarget = 0; G.angi.place(s.momCook.x, s.momCook.z, s.momCook.h);
  for (const a of [G.petike, G.petya, G.angi]) a.pos.y = FY;   // occlude.js measures from here
  G.saveHook = saveEp2;
  const resumed = loadEp2();   // where the player left off (back to the menu / closed the page)
  G.mode = 'play'; G.pstate = 'home'; G.petyaMode = 'home';
  // the base framing (zoom 1) shows most of the flat; zooming out stops at 2× (the house and the yard), zooming in is free
  G.viewSizeTarget = G.viewSize = 8; G.zoom = 1; G.zoomMax = 2;   // starts at zoom 1; out to 2× (the house and its surroundings)
  camTarget.set(G.petike.pos.x, FY, G.petike.pos.z);
  // HUD, help, tab title
  const ep = EPISODES[1];
  document.title = `${SERIES} – ${ep.n}. rész: ${ep.month}`;
  $('hud').innerHTML = '<span class="chip">📅 <span id="e2Date"></span></span> <span class="chip">🕕 <span id="e2Clock"></span></span> <span class="chip" id="e2RoomChip">📍 <span id="e2Room"></span></span> <span class="chip" id="e2Late" style="display:none">⏰ +<span id="e2LateN"></span> perc</span>';
  $('help').innerHTML = '<dl><dt>WASD / nyilak</dt><dd>mozgás</dd><dt>Shift</dt><dd>futás</dd><dt>E</dt><dd>használat: ajtó nyitása / csukása, villany, kopogás</dd><dt>Q / R  ·  , .</dt><dd>nézet forgatása (⟲ ⟳)</dd><dt>T</dt><dd>falak: átlátszó / lesüllyedő</dd><dt>V</dt><dd>belső nézet (FPS); kattintás után egérrel nézel, Esc: egér vissza</dd><dt>E · F</dt><dd>tárgy felvétele · a kiválasztott lerakása / bögre töltése</dd><dt>1–9 · Tab</dt><dd>tárgy kiválasztása</dd><dt>Görgő / + −</dt><dd>zoom (0: alap)</dd><dt>Egérrel húzva</dt><dd>körülnézés</dd><dt>M</dt><dd>hang</dd><dt>H</dt><dd>súgó elrejtése</dd></dl>';
  for (const id of ['kickBtn', 'runBtn']) { const el = $(id); if (el) el.style.display = id === 'kickBtn' ? 'none' : ''; }
  $('skipBtn').style.display = 'none'; $('hud').style.display = 'block'; $('help').style.display = isTouch ? 'none' : 'block';
  if (isTouch) $('touch').style.display = 'block';
  for (const [t, ttl, fn] of [['🧱', 'Falak: átlátszó / lesüllyedő (T)', toggleWalls], ['👁', 'Belső nézet (V)', () => toggleFps()]]) {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.title = ttl; b.onclick = (e) => { fn(); e.currentTarget.blur(); };
    $('topright').insertBefore(b, $('menuBtn'));   // ⟲ ⟳ 🧱 👁 🏠 📒 🔊
  }
  $('e2Date').textContent = dateText(); hudClock(true); hudLate();
  // compile every material now (also the hidden ones: ceiling, lamps, the WC's water), so nothing stalls the game later when it
  // first shows up (a shader compiled on first use is a visible hitch)
  { const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    const pool = lightPool();
    try { for (const on of [true, false]) { pool.forEach((l) => { l.visible = on; }); renderer.compile(scene, camera); renderer.compile(scene, fpsCam); } } catch (e) { /* best effort */ }
    pool.forEach((l) => { l.visible = false; });
    for (const o of hidden) o.visible = false; }
  if (resumed) toast(`Folytatás: <b>${dateText()}</b>, ${clockText(ep2.min)}`, 3);
  else setTimeout(() => say(G.angi, 'Jó reggelt, Petyus! Kelj fel, mosd meg a fogad!', 3.6), 900);
}
let shownMin = -1;
function hudClock(force) { const m = Math.floor(ep2.min); if (m !== shownMin || force) { shownMin = m; $('e2Clock').textContent = clockText(m); } }

// ---------------------------------------------------------------- turning the view (Q / R, or the ⟲ ⟳ buttons): 90° steps
// CAM_OFF (scene.js) and the screen-relative walking directions CAM_FWD / CAM_RIGHT (player.js) turn together; the walls
// (home.js), the fading props (occlude.js) and dragging the view (input.js) read them every frame.
if (import.meta.env.DEV) window.__ep2 = { coffee: cf, rw, kh, karcsi: karcsiState, inv, itemObj, take(id) { const c = pickables(G.petike.pos).find((q) => q.item.id === id); if (c) pickUp(c.item); return !!c; }, view: viewTurn, cutWalls, wallView, CAM_OFF, toggleFps, get fp() { return fp; } };   // debugging (dev server only)
export function toggleWalls() {
  wallView.mode = wallView.mode === 'fade' ? 'sink' : 'fade';
  toast(wallView.mode === 'fade' ? 'Falak: <b>átlátszók</b> (T)' : 'Falak: <b>lesüllyednek</b> (T)', 2);
}
// ---------------------------------------------------------------- first-person view (V or the 👁 button)
// A perspective camera at Petyus's eyes; his own model is hidden, the walls are solid, the ceiling is on.
// W/S forward and back, A/D sideways, ← → or dragging (mouse / one finger) turns, dragging up and down looks up and down.
const fpsCam = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);
const fp = { on: false, yaw: 0, pitch: -0.1, mx: null, my: null, tid: null };
export function toggleFps(on = !fp.on) {
  fp.on = on; G.fps = on;
  let xh = $('xhair'); if (!xh) { xh = document.createElement('div'); xh.id = 'xhair'; xh.style.cssText = 'position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;box-shadow:0 0 0 1.5px rgba(0,0,0,.65);z-index:14;pointer-events:none;'; document.body.appendChild(xh); }
  xh.style.display = on ? 'block' : 'none';
  ceiling.visible = on; G.petike.rig.root.visible = !on;
  if (on) {
    fp.yaw = G.petike.heading; fp.pitch = -0.1;
    fpsCam.aspect = window.innerWidth / window.innerHeight; fpsCam.updateProjectionMatrix(); screen.cam = fpsCam;
    toast(isTouch ? 'Belső nézet – húzással körülnézel' : 'Belső nézet – <b>kattints a képre</b>, és az egérrel nézel körül · Esc: egér vissza · <b>V</b>: felülnézet', 4);
  } else { screen.cam = camera; if (document.pointerLockElement) document.exitPointerLock(); }
}
// mouse look: gentle (pointer lock reports raw pixels, often many per event); one event's jump is capped (browser spikes)
const LOOK_X = 0.0022, LOOK_Y = 0.0018;
const look = (dx, dy) => { dx = clamp(dx, -60, 60); dy = clamp(dy, -60, 60); fp.yaw -= dx * LOOK_X; fp.pitch = clamp(fp.pitch - dy * LOOK_Y, -1.45, 1.35); };   // pitch: down to the floor at his feet, up to the ceiling (≈ ±80°)
{
  const app = $('app');
  // mouse: a click locks the pointer (then just moving the mouse looks round, like in FPS games; Esc frees it);
  // where pointer lock is not available, dragging with the button held works too
  app.addEventListener('mousedown', (e) => {
    if (!fp.on) return;
    fp.mx = e.clientX; fp.my = e.clientY;
    if (!document.pointerLockElement && app.requestPointerLock) { try { const r = app.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* not allowed here */ } }
  });
  window.addEventListener('mousemove', (e) => {
    if (!fp.on) return;
    if (document.pointerLockElement) { look(e.movementX || 0, e.movementY || 0); return; }
    if (fp.mx === null) return; look(e.clientX - fp.mx, e.clientY - fp.my); fp.mx = e.clientX; fp.my = e.clientY;
  });
  window.addEventListener('mouseup', () => { fp.mx = null; });
  app.addEventListener('touchstart', (e) => { if (fp.on && e.touches.length === 1) { const t = e.touches[0]; fp.tid = t.identifier; fp.mx = t.clientX; fp.my = t.clientY; } }, { passive: true });
  app.addEventListener('touchmove', (e) => { if (!fp.on) return; for (const t of e.changedTouches) if (t.identifier === fp.tid) { look((t.clientX - fp.mx) * 2, (t.clientY - fp.my) * 2); fp.mx = t.clientX; fp.my = t.clientY; } }, { passive: true });
  app.addEventListener('touchend', () => { fp.tid = null; fp.mx = null; });
}
// first person: how far off the centre of the view a world point is (radians) – Infinity when it is not aimed at
// (outside the object's size seen from here) or further than ~1.9 m from the eyes
const _dir = new THREE.Vector3(), _to = new THREE.Vector3();
function lookAngle(w, size = 0.12) {
  _to.copy(w).sub(fpsCam.position); const dist = _to.length(); if (dist > 1.9 || dist < 0.05) return Infinity;
  fpsCam.getWorldDirection(_dir); const a = _dir.angleTo(_to.divideScalar(dist));
  const cone = Math.min(0.5, Math.max(0.06, Math.atan(size / dist)));   // the object's size seen from here (small things need exact aim)
  return a < cone ? a : Infinity;
}
function updateFpsCam() {
  const a = G.petike, fx = Math.sin(fp.yaw), fz = Math.cos(fp.yaw), cp = Math.cos(fp.pitch);
  const eye = FY + 1.32 - (a.sit || 0) * 0.42;   // lower when he sits (the armchair)
  fpsCam.position.set(a.pos.x + fx * 0.1, eye, a.pos.z + fz * 0.1);
  fpsCam.lookAt(fpsCam.position.x + fx * cp, eye + Math.sin(fp.pitch), fpsCam.position.z + fz * cp);
}

window.addEventListener('keydown', (e) => {
  if (G.episode !== 2 || G.mode !== 'play' || e.repeat) return;
  if (e.code === 'KeyV') toggleFps();
  if (e.code === 'KeyF') G.invPressed = true;
  if (/^Digit[1-9]$/.test(e.code)) selectItem(+e.code.slice(5) - 1);
  if (e.code === 'Tab') { e.preventDefault(); cycleItem(); }
  if (fp.on) return;
  if (e.code === 'KeyQ') turnView(1);
  if (e.code === 'KeyR') turnView(-1);
  if (e.code === 'KeyT') toggleWalls();
});

// ---------------------------------------------------------------- lines
const DAD_LINES = ['Petyus! Fogmosás!', 'Öltözz fel, mert elkésünk!', 'Hol a tolltartód?', 'Bepakoltál a táskádba?', 'Ne rohangálj pizsamában!', 'Reggeliztél már?', 'Petyus, a cipőd hol van?'];
const MOM_LINES = ['Kakaót kérsz vagy teát?', 'Becsomagoltam az uzsonnádat.', 'Petya, nem láttad a kulcsomat?', 'Vajas kenyér lesz, vagy müzli?', 'Ne felejtsd el a tornacuccot!'];
const ROOM_LINES = {
  furdo: [G_ => G_.petike, 'Fogmosás… két percig…'],
  konyha: [G_ => G_.angi, 'Ülj le, mindjárt kész a reggeli!'],
  szulok: [G_ => G_.petya, 'Petyus! Ne ugrálj az ágyunkon!'],
  eloter: [G_ => G_.petya, 'Még nem indulunk, pizsamában vagy!'],
  erkely_e: [G_ => G_.angi, 'Gyere be, hideg van, mezítláb vagy!'],
  erkely_k: [G_ => G_.angi, 'Gyere be, hideg van, mezítláb vagy!'],
};

// ---------------------------------------------------------------- Petyus
const pvel = new V3();
const step = { n: 0 };
function movePetyus(dt) {
  const a = G.petike;
  // sitting in the armchair: no walking; a movement key (or the stick) stands him up again
  if (seating.on) {
    const moveKey = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || (!fp.on && (keys.ArrowLeft || keys.ArrowRight)) || touch.active;
    if (moveKey && a.sit > 0.95) seating.on = false;
    else {
      a.seatH = seating.seatH; a.seatBase = FY; a.sitTarget = 1;
      a.pos.x = damp(a.pos.x, seating.x, 10, dt); a.pos.z = damp(a.pos.z, seating.z + 0.06, 10, dt);   // a little forward: a child's legs reach out over the edge
      if (!fp.on) a.heading = a.targetHeading = dampAngle(a.heading, seating.h, 10, dt);
      a.animate(dt, false, 0);
      // in the armchair the legs are stretched out in front, slightly raised (knees straight – the feet point up, over the seat's edge)
      const r = a.rig, k = a.sit * a.sit * (3 - 2 * a.sit);
      for (let i = 0; i < 2; i++) { r.hip[i].rotation.x = lerp(r.hip[i].rotation.x, -1.62, k); r.knee[i].rotation.x = lerp(r.knee[i].rotation.x, 0.04, k); if (r.foot) r.foot[i].rotation.x = lerp(r.foot[i].rotation.x, 0, k); }
      if (holdingController()) for (let i = 0; i < 2; i++) { r.sh[i].rotation.x = -0.85; r.sh[i].rotation.z = i === 0 ? 0.3 : -0.3; if (r.elbow) r.elbow[i] = 0.95; }
      a.sync(); pvel.set(0, 0, 0);
      return;
    }
  }
  if (a.sitTarget) { a.sitTarget = 0; }
  let ix = 0, iy = 0, wx, wz;
  if (fp.on) {   // first person: forward / sideways relative to where he looks, ← → turn
    if (keys.KeyA) ix -= 1; if (keys.KeyD) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (keys.ArrowLeft) fp.yaw += 2.2 * dt; if (keys.ArrowRight) fp.yaw -= 2.2 * dt;
    if (touch.active) { ix = touch.x; iy = touch.y; }
    const fx = Math.sin(fp.yaw), fz = Math.cos(fp.yaw);
    wx = fx * iy - fz * ix; wz = fz * iy + fx * ix;
  } else {
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (touch.active) { ix = touch.x; iy = touch.y; }
    wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy; wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  }
  const il = Math.hypot(wx, wz); if (il > 1) { wx /= il; wz /= il; }
  const sprint = keys.ShiftLeft || keys.ShiftRight || touch.run;
  const maxSp = sprint ? 3.6 : 2.2;   // indoors: slower than in the park
  pvel.x = damp(pvel.x, wx * maxSp, 10, dt); pvel.z = damp(pvel.z, wz * maxSp, 10, dt);
  a.pos.x += pvel.x * dt; a.pos.z += pvel.z * dt;
  collide(a.pos, 0.22, 0, null);
  for (const o of [G.petya, G.angi]) {   // the parents are solid too
    const dx = a.pos.x - o.pos.x, dz = a.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = 0.5;
    if (d < m && d > 1e-4) { a.pos.x = o.pos.x + dx / d * m; a.pos.z = o.pos.z + dz / d * m; }
  }
  a.pos.x = clamp(a.pos.x, -0.5, 18.5); a.pos.z = clamp(a.pos.z, -2.5, 10);
  const spd = Math.hypot(pvel.x, pvel.z);
  // footsteps: one at every half stride (the walk cycle's phase), the floor decides the sound
  const stepN = Math.floor(a.phase / Math.PI);
  if (stepN !== step.n) { step.n = stepN; if (spd > 0.4) { const r = roomAt(a.pos.x, a.pos.z); sStep(r ? r.floor : 'wood', sprint ? 1 : 0); } }
  if (fp.on) a.heading = a.targetHeading = fp.yaw;
  else { if (il > 0.1) a.targetHeading = Math.atan2(wx, wz); a.heading = dampAngle(a.heading, a.targetHeading, 14, dt); }
  a.animate(dt, spd > 0.2, spd); a.sync();
}

// E near a closed door: the sibling's room is locked, the front door is not for pyjamas
const door = { knockT: 0 };
function interactHome() {
  const p = G.petike.pos;
  // everything that can be used, with where it is (aim: a point of it in the flat's frame, y from the floor). Top view: the
  // nearest within reach wins (things to pick up up to 20 cm further). First-person view: only what the dot in the middle
  // of the screen points at (and not further than ~1.9 m from the eyes) – the best aimed one wins.
  const cands = [];
  for (const d of doors) cands.push({ o: { d }, r: Math.hypot(p.x - d.x, p.z - d.z), reach: 1.0, aim: new V3(d.x, 1.05, d.z), size: 0.45 });
  for (const sw of switches) cands.push({ o: { sw }, r: Math.hypot(p.x - sw.x, p.z - sw.z), reach: 0.85, aim: new V3(sw.x, 1.05, sw.z), size: 0.07 });
  { const cf = cageFront(); cands.push({ o: { cage: true }, r: Math.hypot(p.x - cf.x, p.z - cf.z), reach: 0.9, aim: new V3(14.3, 1.0, 0.32), size: 0.3 }); }
  cands.push({ o: { seat: true }, r: Math.hypot(p.x - toiletSeat.x, p.z - (toiletSeat.z + 0.6)), reach: 0.75, aim: new V3(toiletSeat.x, 0.45, toiletSeat.z + 0.1), size: 0.25 });
  for (const dv of devices) cands.push({ o: { dev: dv }, r: Math.hypot(p.x - dv.x, p.z - dv.z), reach: dv.r, aim: dv.aim || new V3(dv.x, 0.9, dv.z), size: dv.size || 0.14 });
  for (const pc of pickables(p)) cands.push({ o: { item: pc.item }, r: pc.d - 0.2, reach: 0.55, aimW: pc.w, size: 0.08 });
  { const hl = keyHintLabel(); if (hl) cands.push({ o: { hint: hl }, r: Math.hypot(p.x - G.angi.pos.x, p.z - G.angi.pos.z) - 0.3, reach: 1.1, aimW: new V3(G.angi.pos.x, FY + 1.2, G.angi.pos.z), size: 0.35 }); }
  if (karcsiTakeable()) { const w = new V3(); pigObj().getWorldPosition(w); cands.push({ o: { karcsi: true }, r: Math.hypot(p.x - w.x, p.z - w.z) - 0.6, reach: 0.4, aimW: w, size: 0.12 }); }   // he wins over the cage door next to him
  let best = null;
  if (fp.on) {
    let ba = 1e9;
    for (const c of cands) { const a = lookAngle(c.aimW || new V3(c.aim.x, c.aim.y + FY, c.aim.z), c.size); if (a < ba) { ba = a; best = c.o; } }
  } else {
    let bd = 1e9;
    for (const c of cands) if (c.r < c.reach && c.r < bd) { bd = c.r; best = c.o; }
  }
  const act = invAction(p, fp.on ? (w, size = 0.1) => lookAngle(w, size) < 1e8 : null);   // what F would do with the selected thing here (aimed in first person)
  let txt = '';
  // next to the toilet: Space (on touch: the LEHÚZÁS button) flushes
  // (a device with a second action – the microwave – uses Space too; on touch the RÚGÁS button shows that action's name)
  const kb = $('kickBtn'), altBusy = !!(best && (best.seat || (best.dev && best.dev.alt)));
  if (kb) { const lbl = isTouch ? (best && best.seat ? 'LEHÚZÁS' : best && best.dev && best.dev.alt ? best.dev.alt.short() : act ? act.short : '') : ''; kb.style.display = lbl ? 'block' : 'none'; if (lbl && kb.textContent !== lbl) kb.textContent = lbl; }
  if (act && (G.invPressed || (isTouch && G.kickPressed && !altBusy))) act.run();
  if (best && best.hint) {
    txt = best.hint;
    if (G.usePressed) giveKeyHint();
  } else if (best && best.karcsi) {
    txt = 'E – Karcsi felvétele';
    if (G.usePressed) { takeKarcsi('carried'); invTake('karcsi'); say(G.petike, 'Megvagy, Karcsi!', 1.6); }
  } else if (best && best.item) {
    txt = pickLabel(best.item);
    if (G.usePressed) pickUp(best.item);
  } else if (best && best.dev) {
    const dv = best.dev; txt = dv.label() + (dv.alt && !isTouch ? ' · ' + dv.alt.label() : '');
    if (G.usePressed) dv.use();
    if (G.kickPressed && dv.alt) dv.alt.use();
  } else if (best && best.seat) {
    txt = toiletSeatLabel() + (isTouch ? '' : ' · Szóköz – lehúzás');
    if (G.usePressed) { toggleToiletSeat(); sClick(); }
    if (G.kickPressed && flushToilet()) {
      tone('square', 900, 700, 0.05, 0.05); noise(1.7, 700, 0.5, 0.3, 0.1); noise(1.2, 1600, 0.7, 0.12, 0.3); tone('sine', 260, 110, 1.3, 0.05, 0.2); noise(1.8, 2800, 1.2, 0.04, 1.6);
      say({ headWorld: (o) => o.set(toiletSeat.x, FY + 1.1, toiletSeat.z + 0.2) }, 'HÚÚÚSSS!', 1.6);
    }
  } else if (best && best.cage) {
    txt = cageDoorOpen() ? 'E – kalitka becsukása' : 'E – kalitka kinyitása';
    if (G.usePressed) { toggleCageDoor(); sClick(); }
  } else if (best && best.sw) {
    const sw = best.sw; txt = sw.on ? 'E – villany le' : 'E – villany fel';
    if (G.usePressed) { toggleSwitch(sw); sClick(); }
  } else if (best) {
    const d = best.d;
    if (d.kind === 'locked') {
      txt = 'E – kopogás';
      if (G.usePressed && door.knockT <= 0) {
        door.knockT = 3;
        say({ headWorld: (o) => o.set(d.x, FY + 2.0, d.z) }, 'KOPP-KOPP', 1.4);
        setTimeout(() => say({ name: 'Tesó', headWorld: (o) => o.set(d.x, FY + 1.7, d.z + 0.6) }, 'Zárva! Hagyj aludni…', 2.6, ''), 900);
        setTimeout(() => say(G.petike, 'Jó, jó…', 2), 2600);
      }
    } else if (d.kind === 'front') {
      txt = 'E – indulás';
      if (G.usePressed) say(G.angi, 'Pizsamában?! Előbb öltözz fel, és reggelizz!', 3.2);
    } else {
      txt = d.open ? 'E – ajtó becsukása' : 'E – ajtó kinyitása';
      if (G.usePressed) { toggleDoor(d); sClick(); }
    }
  }
  // touch screens: no E / F / Space keys – the prompt names the on-screen buttons, and the HASZNÁL button says what it does
  // (NYIT, ZÁR, BE, KI, FELVESZ, VILLANY, KOPOG …); the action of F (and of a device's second action) is the RÚGÁS button's
  if (isTouch) {
    const short = touchVerb(txt);
    txt = txt.replace(/^E – /, short + ' – ');
    if (best && best.dev && best.dev.alt) txt += ' · ' + best.dev.alt.label().replace(/^Szóköz – /, best.dev.alt.short() + ' – ');
    if (best && best.seat) txt += ' · LEHÚZÁS – lehúzás';
    if (act && !altBusy) txt += (txt ? ' · ' : '') + act.short + ' – ' + act.label;
    const ub = $('useBtn'); if (ub && ub.textContent !== short) { ub.textContent = short; ub.classList.toggle('long', short.length > 7); }
  } else if (act) txt += (txt ? ' · ' : '') + 'F – ' + act.label;
  setPrompt(txt);
  if (isTouch && !best) $('useBtn').style.display = 'none';   // only F's action here: the RÚGÁS button does it
}
// the HASZNÁL button's label from a prompt ('E – hűtő kinyitása' → NYIT …)
const VERBS = [[/felvétele/, 'FELVESZ'], [/kinyitása|megnyitása|felnyitása/, 'NYIT'], [/becsukása|elzárása/, 'ZÁR'], [/bekapcsolása|indítása/, 'BE'],
  [/kikapcsolása|leállítása/, 'KI'], [/felhajtása/, 'FELHAJT'], [/lehajtása/, 'LEHAJT'], [/leülés/, 'LEÜL'], [/felállás/, 'FELÁLL'],
  [/villany/, 'VILLANY'], [/kopogás/, 'KOPOG'], [/indulás/, 'INDULÁS'], [/Anya, nem/, 'TIPP']];
function touchVerb(txt) { const m = /^E – (.*?)( · |$)/.exec(txt); if (!m) return 'HASZNÁL'; for (const [re, v] of VERBS) if (re.test(m[1])) return v; return 'HASZNÁL'; }
// a short click (switch, door handle)
function sClick() { tone('square', 1400, 900, 0.03, 0.04); }

// ---------------------------------------------------------------- mum's morning: at the cooktop; now and then to the fridge – she
// opens it, looks around in it, shuts it and goes back. When Petyus stands in front of the fridge she does not go there: she
// busies herself at the sink, the kettle or the cooktop instead. (Karcsi hears the fridge: wheek.)
const MOM_JOBS = { sink: { x: 8.6, z: 0.95, h: Math.PI }, kettle: { x: 9.3, z: 0.9, h: Math.PI }, cooktop: { x: 7.75, z: 0.95, h: Math.PI } };
const FRIDGE_FRONT = { x: 6.55, z: 1.5 };
const petyusAtFridge = () => Math.hypot(G.petike.pos.x - FRIDGE_FRONT.x, G.petike.pos.z - FRIDGE_FRONT.z) < 1.3;
function momRoutine(dt) {
  const m = G.angi;
  if (momBusy() || keyBusy()) { if (fx.fridge && ep2.momAt === 'fridge' && fx.fridge.open() && !petyusAtFridge()) fx.fridge.setOpen(false); return; }
  ep2.momT -= dt;
  // on the way to the fridge, Petyus steps in front of it: she turns to something else
  if (ep2.momAt === 'toFridge' && m.path && petyusAtFridge()) { momJob(); return; }
  if (ep2.momAt === 'toFridge' && !m.path) { ep2.momAt = 'fridge'; ep2.momT = 2.5 + Math.random() * 1.5; fx.fridge.setOpen(true); wheek(); }
  if (ep2.momAt === 'toJob' && !m.path) { ep2.momAt = 'job'; ep2.momT = 3 + Math.random() * 2; }
  if (ep2.momAt === 'job' && ep2.momJob === 'sink' && Math.random() < dt * 1.5) noise(0.4, 1800, 0.6, 0.03);   // a little water
  if (ep2.momT > 0 || m.path) {
    if (!m.path && ep2.momAt !== 'fridge') m.targetHeading = ep2.momAt === 'job' ? MOM_JOBS[ep2.momJob].h : Math.PI;   // the counter (north)
    return;
  }
  // the time is up for what she is doing
  if (ep2.momAt === 'fridge') { fx.fridge.setOpen(false); goCook(); }
  else if (ep2.momAt === 'job') goCook();
  else if (ep2.momAt === 'cook') {
    if (petyusAtFridge()) momJob();
    else { ep2.momAt = 'toFridge'; m.walkTo([[FRIDGE_FRONT.x, FRIDGE_FRONT.z]], 1.2); }
  }
}
function goCook() { ep2.momAt = 'cook'; ep2.momT = 10 + Math.random() * 8; G.angi.walkTo([[SPOTS.momCook.x, SPOTS.momCook.z]], 1.2); }
function momJob() {
  const k = pick(['sink', 'kettle', 'cooktop']), j = MOM_JOBS[k];
  ep2.momAt = 'toJob'; ep2.momJob = k; G.angi.walkTo([[j.x, j.z]], 1.2);
}
// at the open fridge: facing it, bending a little to look in, a hand on the door
function momLook() {
  const m = G.angi, r = m.rig, w = Math.sin(G.clockT * 2.2);
  m.targetHeading = -Math.PI / 2; m.heading = dampAngle(m.heading, -Math.PI / 2, 8, 1 / 60);
  r.inner.rotation.x = 0.18 + w * 0.05; r.sh[1].rotation.x = -1.2; r.sh[0].rotation.x = -0.5 + w * 0.2; m.sync();
}

// ---------------------------------------------------------------- the parents
function updateParents(dt) {
  G.petya.update(dt); coffeeTick(dt);   // the creamy coffee may take dad over (coffee.js)
  const m = G.angi;
  momRoutine(dt);
  m.update(dt);
  if (ep2.momAt === 'fridge' && !m.path && !momBusy() && !keyBusy()) momLook();
  runawayTick(dt);   // „Karcsi nagy szökése”: mum on the chair, dad on all fours (runaway.js)
  keyTick(dt);       // „Hol a kulcs, Angi?”: mum looking for her keys (keyhunt.js)
  // talking: dad (and now and then mum), more often when Petyus is close
  ep2.talkT -= dt;
  if (ep2.talkT <= 0) {
    const near = Math.hypot(G.petike.pos.x - G.petya.pos.x, G.petike.pos.z - G.petya.pos.z) < 5;
    ep2.talkT = (near ? 9 : 15) + Math.random() * 6;
    if (Math.random() < 0.6 && !dadBusy() && !dadChasing()) { say(G.petya, pick(DAD_LINES), 3); G.petya.point = 1.4; } else if (!momBusy() && !keyBusy()) say(G.angi, pick(MOM_LINES), 3);
  }
}

// ---------------------------------------------------------------- the step
export function stepEp2(dt) {
  G.clockT += dt;
  door.knockT -= dt;
  if (G.mode === 'play') {
    movePetyus(dt);
    interactHome();
    // the world outside: indoors in the first-person view not at all (only the dog barking in the yard), indoors in the top
    // view faintly, on a balcony fully
    { const r = roomAt(G.petike.pos.x, G.petike.pos.z), out = !!(r && r.floor === 'balcony'); setOutdoor(out ? 1 : fp.on ? 0 : 0.3); }
    updateParents(dt); updateOutside(dt); updateKarcsi(dt); updateAppliances(dt); updateInventory();
    // walls solid in the first-person view and when zoomed far out (the roof is on then: the house looks whole)
    const r = updateHome(dt, G.petike.pos, fp.on || G.zoom > 1.55);
    if (r !== ep2.room) {
      ep2.room = r; $('e2Room').textContent = r ? r.name : '';
      const l = r && ROOM_LINES[r.id];
      if (l && !ep2.seen.has(r.id) && !(l[0](G) === G.petya && dadBusy())) { ep2.seen.add(r.id); say(l[0](G), l[1], 3); ep2.talkT = Math.max(ep2.talkT, 5); }
    }
    ep2.min = Math.min(MORNING_END, ep2.min + dt * MIN_PER_SEC); hudClock();
    G.usePressed = false; G.qPressed = false; G.kickPressed = G.kickReleased = false; G.invPressed = false;
  }
  updateViewTurn(dt);
  updateFx(dt); updateCamera(dt); if (fp.on) updateFpsCam(); updateOcclusion(dt); updateBubbles(dt);
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').classList.remove('show'); }
  if (G.bigT > 0) { G.bigT -= dt; if (G.bigT <= 0) $('big').classList.remove('show'); }
}
