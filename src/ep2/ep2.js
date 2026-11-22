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
import { $, V3, clamp, damp, dampAngle, pick } from '../util.js';
import { INSTANCES, collide, colliders, setGround } from '../world.js';
import { setPrompt } from '../activities/drinking.js';
import { FY, SPOTS, buildHome, ceiling, cutWalls, doors, switches, toggleDoor, toggleSwitch, flushToilet, toggleToiletSeat, toiletSeat, toiletSeatLabel, updateHome, wallView } from './home.js';
import { noise, tone } from '../audio.js';
import { buildOutside, placeOutsideProps, updateOutside } from './outside.js';
import { buildAppliances, devices, updateAppliances } from './appliances.js';
import { buildKarcsi, cageDoorOpen, cageFront, toggleCageDoor, updateKarcsi, wheek } from './karcsi.js';
import { dressPajama } from './pajama.js';

// ---------------------------------------------------------------- unlocking
export const EP2_STARS = 15;   // part 1's mischief stars needed
// developer access (npm run dev): always open, and ?resz=2 starts it at once. import.meta.env.DEV is false in the build,
// so Vite drops these branches – the released page has no way round the 15 stars.
export const ep2Unlocked = () => (import.meta.env.DEV ? true : totalStars() >= EP2_STARS);
export const ep2DevStart = () => import.meta.env.DEV && new URLSearchParams(location.search).get('resz') === '2';

// ---------------------------------------------------------------- calendar and clock
const DAY0 = new Date(2026, 8, 2), DAYS = 29;   // 2026. szeptember 2. (szerda) … 30. (szerda)
const WEEKDAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
export const ep2 = { day: 0, min: 6 * 60, room: null, talkT: 6, seen: new Set(), momT: 9, momAt: 'cook', petyusLine: 0 };

// ---------------------------------------------------------------- saving the day's state (before going back to the menu, on leaving)
// part 1's mischief results are saved on their own (mischief.js); part 2 keeps where the player is: the day, the clock,
// Petyus's place, the doors, the lights, the wall view, Karcsi's cage door. The September tile then says „Folytatás”.
const SAVE_KEY = 'petyus.r2.allapot';
export function ep2HasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function saveEp2() {
  const p = G.petike, st = { v: 1, day: ep2.day, min: ep2.min, x: p.pos.x, z: p.pos.z, h: p.heading,
    doors: doors.filter((d) => d.pivot).map((d) => d.open), seat: toiletSeat.state, lights: switches.map((s) => s.on), walls: wallView.mode, cage: cageDoorOpen() };
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
  for (const o of [...scene.children]) if (!o.isLight && o !== sun.target) scene.remove(o);   // part 1's world (built at boot)
  colliders.length = 0; INSTANCES.length = 0;
  setGround((x, z) => (x > -0.4 && x < 18.3 && z > -2.1 && z < 9.6 ? FY : 0));   // the flat (and its balconies) is upstairs, the yard on the ground
  ball.active = false; roller.rider = null; roller.path = null;
  scene.background.set(0xcde8f5);
  // bright morning: the sun is low in the east (through the east windows), cool sky light
  SUN_OFF.set(30, 26, -4); sun.color.set(0xfff3dc); sun.intensity = 2.3;
  // the sky light's ground colour was the park's grass (green): indoors every downward face (a fridge's ceiling, the underside
  // of a shelf) would look green – a warm neutral instead
  scene.traverse((o) => { if (o.isHemisphereLight) o.groundColor.set(0xb9ab98); });
  buildHome(placeOutsideProps); buildOutside(); buildKarcsi(); buildAppliances();
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
  $('hud').innerHTML = '<span class="chip">📅 <span id="e2Date"></span></span> <span class="chip">🕕 <span id="e2Clock"></span></span> <span class="chip" id="e2RoomChip">📍 <span id="e2Room"></span></span>';
  $('help').innerHTML = '<dl><dt>WASD / nyilak</dt><dd>mozgás</dd><dt>Shift</dt><dd>futás</dd><dt>E</dt><dd>használat: ajtó nyitása / csukása, villany, kopogás</dd><dt>Q / R  ·  , .</dt><dd>nézet forgatása (⟲ ⟳)</dd><dt>T</dt><dd>falak: átlátszó / lesüllyedő</dd><dt>V</dt><dd>belső nézet (FPS); kattintás után egérrel nézel, Esc: egér vissza</dd><dt>Görgő / + −</dt><dd>zoom (0: alap)</dd><dt>Egérrel húzva</dt><dd>körülnézés</dd><dt>M</dt><dd>hang</dd><dt>H</dt><dd>súgó elrejtése</dd></dl>';
  for (const id of ['kickBtn', 'runBtn']) { const el = $(id); if (el) el.style.display = id === 'kickBtn' ? 'none' : ''; }
  $('skipBtn').style.display = 'none'; $('hud').style.display = 'block'; $('help').style.display = isTouch ? 'none' : 'block';
  if (isTouch) $('touch').style.display = 'block';
  for (const [t, ttl, fn] of [['🧱', 'Falak: átlátszó / lesüllyedő (T)', toggleWalls], ['👁', 'Belső nézet (V)', () => toggleFps()]]) {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.title = ttl; b.onclick = (e) => { fn(); e.currentTarget.blur(); };
    $('topright').insertBefore(b, $('menuBtn'));   // ⟲ ⟳ 🧱 👁 🏠 📒 🔊
  }
  $('e2Date').textContent = dateText(); hudClock(true);
  // compile every material now (also the hidden ones: ceiling, lamps, the WC's water), so nothing stalls the game later when it
  // first shows up (a shader compiled on first use is a visible hitch)
  { const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try { renderer.compile(scene, camera); renderer.compile(scene, fpsCam); } catch (e) { /* best effort */ }
    for (const o of hidden) o.visible = false; }
  if (resumed) toast(`Folytatás: <b>${dateText()}</b>, ${clockText(ep2.min)}`, 3);
  else setTimeout(() => say(G.angi, 'Jó reggelt, Petyus! Kelj fel, mosd meg a fogad!', 3.6), 900);
}
let shownMin = -1;
function hudClock(force) { const m = Math.floor(ep2.min); if (m !== shownMin || force) { shownMin = m; $('e2Clock').textContent = clockText(m); } }

// ---------------------------------------------------------------- turning the view (Q / R, or the ⟲ ⟳ buttons): 90° steps
// CAM_OFF (scene.js) and the screen-relative walking directions CAM_FWD / CAM_RIGHT (player.js) turn together; the walls
// (home.js), the fading props (occlude.js) and dragging the view (input.js) read them every frame.
if (import.meta.env.DEV) window.__ep2 = { view: viewTurn, cutWalls, wallView, CAM_OFF, toggleFps, get fp() { return fp; } };   // debugging (dev server only)
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
  ceiling.visible = on; G.petike.rig.root.visible = !on;
  if (on) {
    fp.yaw = G.petike.heading; fp.pitch = -0.1;
    fpsCam.aspect = window.innerWidth / window.innerHeight; fpsCam.updateProjectionMatrix(); screen.cam = fpsCam;
    toast(isTouch ? 'Belső nézet – húzással körülnézel' : 'Belső nézet – <b>kattints a képre</b>, és az egérrel nézel körül · Esc: egér vissza · <b>V</b>: felülnézet', 4);
  } else { screen.cam = camera; if (document.pointerLockElement) document.exitPointerLock(); }
}
// mouse look: gentle (pointer lock reports raw pixels, often many per event); one event's jump is capped (browser spikes)
const LOOK_X = 0.0022, LOOK_Y = 0.0018;
const look = (dx, dy) => { dx = clamp(dx, -60, 60); dy = clamp(dy, -60, 60); fp.yaw -= dx * LOOK_X; fp.pitch = clamp(fp.pitch - dy * LOOK_Y, -1.0, 0.8); };
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
function updateFpsCam() {
  const a = G.petike, fx = Math.sin(fp.yaw), fz = Math.cos(fp.yaw), cp = Math.cos(fp.pitch);
  fpsCam.position.set(a.pos.x + fx * 0.1, FY + 1.32, a.pos.z + fz * 0.1);
  fpsCam.lookAt(fpsCam.position.x + fx * cp, FY + 1.32 + Math.sin(fp.pitch), fpsCam.position.z + fz * cp);
}

window.addEventListener('keydown', (e) => {
  if (G.episode !== 2 || G.mode !== 'play' || e.repeat) return;
  if (e.code === 'KeyV') toggleFps();
  if (fp.on) return;
  if (e.code === 'KeyQ') turnView(1);
  if (e.code === 'KeyR') turnView(-1);
  if (e.code === 'KeyT') toggleWalls();
});

// ---------------------------------------------------------------- lines
const DAD_LINES = ['Petyus! Fogmosás!', 'Öltözz fel, mert elkésünk!', 'Hol a tolltartód?', 'Bepakoltál a táskádba?', 'Ne rohangálj pizsamában!', 'Reggeliztél már?', 'Petyus, a cipőd hol van?', 'Ez a kávé még túl forró…'];
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
function movePetyus(dt) {
  const a = G.petike;
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
  if (fp.on) a.heading = a.targetHeading = fp.yaw;
  else { if (il > 0.1) a.targetHeading = Math.atan2(wx, wz); a.heading = dampAngle(a.heading, a.targetHeading, 14, dt); }
  a.animate(dt, spd > 0.2, spd); a.sync();
}

// E near a closed door: the sibling's room is locked, the front door is not for pyjamas
const door = { knockT: 0 };
function interactHome() {
  const p = G.petike.pos;
  // the nearest thing within reach: a door (open / close, knock, leave) or a light switch
  let best = null, bd = 1e9;
  for (const d of doors) { const r = Math.hypot(p.x - d.x, p.z - d.z); if (r < 1.0 && r < bd) { bd = r; best = { d }; } }
  for (const sw of switches) { const r = Math.hypot(p.x - sw.x, p.z - sw.z); if (r < 0.85 && r < bd) { bd = r; best = { sw }; } }
  { const cf = cageFront(), r = Math.hypot(p.x - cf.x, p.z - cf.z); if (r < 0.9 && r < bd) { bd = r; best = { cage: true }; } }
  { const r = Math.hypot(p.x - toiletSeat.x, p.z - (toiletSeat.z + 0.6)); if (r < 0.75 && r < bd) { bd = r; best = { seat: true }; } }
  for (const dv of devices) { const r = Math.hypot(p.x - dv.x, p.z - dv.z); if (r < dv.r && r < bd) { bd = r; best = { dev: dv }; } }
  let txt = '';
  // next to the toilet: Space (on touch: the LEHÚZÁS button) flushes
  // (a device with a second action – the microwave – uses Space too; on touch the RÚGÁS button shows that action's name)
  const kb = $('kickBtn');
  if (kb) { const lbl = isTouch ? (best && best.seat ? 'LEHÚZÁS' : best && best.dev && best.dev.alt ? best.dev.alt.short() : '') : ''; kb.style.display = lbl ? 'block' : 'none'; if (lbl && kb.textContent !== lbl) kb.textContent = lbl; }
  if (best && best.dev) {
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
  setPrompt(txt);
}
// a short click (switch, door handle)
function sClick() { tone('square', 1400, 900, 0.03, 0.04); }

// ---------------------------------------------------------------- the parents
function updateParents(dt) {
  G.petya.update(dt);
  const m = G.angi;
  // mum: at the cooktop, now and then to the fridge and back (Karcsi hears the fridge: wheek)
  ep2.momT -= dt;
  if (ep2.momT <= 0 && !m.path) {
    ep2.momT = 10 + Math.random() * 8;
    if (ep2.momAt === 'cook') { m.walkTo([[SPOTS.momFridge.x, SPOTS.momFridge.z]], 1.2); ep2.momAt = 'fridge'; setTimeout(wheek, 1800); } else { m.walkTo([[SPOTS.momCook.x, SPOTS.momCook.z]], 1.2); ep2.momAt = 'cook'; }
  }
  if (!m.path) m.targetHeading = ep2.momAt === 'fridge' ? -Math.PI / 2 : Math.PI;   // facing the fridge (west) or the counter (north)
  m.update(dt);
  // talking: dad (and now and then mum), more often when Petyus is close
  ep2.talkT -= dt;
  if (ep2.talkT <= 0) {
    const near = Math.hypot(G.petike.pos.x - G.petya.pos.x, G.petike.pos.z - G.petya.pos.z) < 5;
    ep2.talkT = (near ? 9 : 15) + Math.random() * 6;
    if (Math.random() < 0.6) { say(G.petya, pick(DAD_LINES), 3); G.petya.point = 1.4; } else say(G.angi, pick(MOM_LINES), 3);
  }
}

// ---------------------------------------------------------------- the step
export function stepEp2(dt) {
  G.clockT += dt;
  door.knockT -= dt;
  if (G.mode === 'play') {
    movePetyus(dt);
    interactHome();
    updateParents(dt); updateOutside(dt); updateKarcsi(dt); updateAppliances(dt);
    // walls solid in the first-person view and when zoomed far out (the roof is on then: the house looks whole)
    const r = updateHome(dt, G.petike.pos, fp.on || G.zoom > 1.55);
    if (r !== ep2.room) {
      ep2.room = r; $('e2Room').textContent = r ? r.name : '';
      const l = r && ROOM_LINES[r.id];
      if (l && !ep2.seen.has(r.id)) { ep2.seen.add(r.id); say(l[0](G), l[1], 3); ep2.talkT = Math.max(ep2.talkT, 5); }
    }
    ep2.min = Math.min(MORNING_END, ep2.min + dt * MIN_PER_SEC); hudClock();
    G.usePressed = false; G.qPressed = false; G.kickPressed = G.kickReleased = false;
  }
  updateViewTurn(dt);
  updateFx(dt); updateCamera(dt); if (fp.on) updateFpsCam(); updateOcclusion(dt); updateBubbles(dt);
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').classList.remove('show'); }
  if (G.bigT > 0) { G.bigT -= dt; if (G.bigT <= 0) $('big').classList.remove('show'); }
}
