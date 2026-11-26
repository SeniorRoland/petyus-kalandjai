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
import { Q } from '../quality.js';
import { FY, SPOTS, roomAt, buildHome, lightPool, ceiling, cutWalls, doors, switches, toggleDoor, toggleSwitch, flushToilet, toggleToiletSeat, toiletSeat, toiletSeatLabel, updateHome, wallView } from './home.js';
import { noise, sStep, setMasterVol, setOutdoor, tone } from '../audio.js';
import { buildOutside, placeOutsideProps, setEvening, updateOutside } from './outside.js';
import { buildAppliances, devices, fx, seating, updateAppliances } from './appliances.js';
import { buildInventory, cycleItem, holdingController, inv, invAction, invTake, itemObj, pickLabel, pickUp, pickables, selectItem, updateInventory } from './inventory.js';
import { buildKarcsi, cageDoorOpen, cageFront, toggleCageDoor, updateKarcsi, wheek } from './karcsi.js';
import { TOPS, dressClothes, dressPajama } from './pajama.js';
import { buildWardrobe, dress, dressLoad, dressSave, dressTick, hurryParents, leaveBlock, wardrobeCand, wardrobeLabel, wardrobeUse } from './dressing.js';
import { buildSister, updateSister } from './sister.js';
import { canPee, pee, peeFlushed, peeLabel, peeTick, startPee } from './pee.js';
import { startWakeup, wakeTick, wakeupFocus } from './wakeup.js';
import { BOUNDS as SCHOOL_BOUNDS, SCHOOL_START, buildSchool, schoolAction, schoolFloor, schoolKick, schoolStatus, schoolUse, schoolRoom, setSchoolFps, toggleSeat, updateSchool } from './school.js';
import { starsFor } from '../mischief.js';
import { cf, coffeeTick, dadBusy } from './coffee.js';
import { dadChasing, momBusy, runawayTick, rw } from './runaway.js';
import { giveKeyHint, kh, keyBusy, keyHintLabel, keyTick } from './keyhunt.js';
import { brushBusy, buildBath, toothTick, tp } from './toothpaste.js';
import { tm, tvBusy, tvTick } from './tvmatch.js';
import { gh, ghostBusy, ghostTick, momGhostBusy, sheetLabel, sheetOffer, toggleSheet } from './ghost.js';
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
export const ep2 = { phase: 'morning', bounds: { x0: -0.5, x1: 18.5, z0: -2.5, z1: 10 }, day: 0, min: 6 * 60, room: null, talkT: 6, seen: new Set(), momT: 9, momAt: 'cook', petyusLine: 0, lateMin: 0 };
// the mischiefs make the family late (minutes): shown on the HUD (⏰)
export function addLate(min) { ep2.lateMin += min; hudLate(); toast(`⏰ Késés: <b>+${min} perc</b>`, 2.6); }
function hudLate() { const el = $('e2Late'); if (!el) return; el.style.display = ep2.lateMin > 0 ? '' : 'none'; $('e2LateN').textContent = ep2.lateMin; }

// ---------------------------------------------------------------- saving the day's state (before going back to the menu, on leaving)
// part 1's mischief results are saved on their own (mischief.js); part 2 keeps where the player is: the day, the clock,
// Petyus's place, the doors, the lights, the wall view, Karcsi's cage door. The September tile then says „Folytatás”.
const SAVE_KEY = 'petyus.r2.allapot';
export function ep2HasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function saveEp2() {
  const p = G.petike, st = { v: 1, phase: ep2.phase, day: ep2.day, min: ep2.min, x: p.pos.x, z: p.pos.z, h: p.heading,
    doors: doors.filter((d) => d.pivot).map((d) => d.open), seat: toiletSeat.state, lights: switches.map((s) => s.on), walls: wallView.mode, cage: cageDoorOpen(), late: ep2.lateMin, dress: ep2.phase === 'morning' ? dressSave() : null, top: ep2.phase === 'morning' ? dress.top : ep2.top };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ }
}
function loadEp2() {
  let st = null; try { st = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { st = null; }
  if (!st || st.v !== 1) return false;
  ep2.day = clamp(st.day | 0, 0, DAYS - 1);
  ep2.lateMin = clamp(st.late | 0, 0, 300);
  if (st.fresh) return 'fresh';   // just arrived (a change of place / day: goPhase) – the place's own start, nothing else to restore
  const ph = PHASES[ep2.phase];
  ep2.min = clamp(+st.min || ph.start, ph.start, ph.end);
  G.petike.place(st.x, st.z, st.h); G.petike.pos.y = ep2.phase === 'school' ? 0 : FY;
  if (ep2.phase === 'school') return true;
  doors.filter((d) => d.pivot).forEach((d, i) => { if (typeof st.doors?.[i] === 'boolean' && d.open !== st.doors[i]) { toggleDoor(d); d.t = d.open ? 1 : 0; } });
  switches.forEach((s, i) => { if (typeof st.lights?.[i] === 'boolean' && s.on !== st.lights[i]) toggleSwitch(s); });
  if (st.walls === 'fade' || st.walls === 'sink') wallView.mode = st.walls;
  if (typeof st.cage === 'boolean' && st.cage !== cageDoorOpen()) toggleCageDoor();
  if (ep2.phase === 'morning') dressLoad(st.dress);
  if (typeof st.seat === 'number') { toiletSeat.state = clamp(st.seat | 0, 0, 2); toiletSeat.lidT = toiletSeat.state >= 1 ? 1 : 0; toiletSeat.seatT = toiletSeat.state === 2 ? 1 : 0; }
  return true;
}
window.addEventListener('pagehide', () => { if (G.episode === 2 && G.mode === 'play' && !ep2.leaving) saveEp2(); });
// which part of the day the saved game is in (read before building anything)
function savedTop() { try { const st = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return st && TOPS[st.top] !== undefined ? st.top : null; } catch (e) { return null; } }
function savedPhase() { try { const st = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return st && st.v === 1 && PHASES[st.phase] ? st.phase : 'morning'; } catch (e) { return 'morning'; } }

// ---------------------------------------------------------------- the parts of a day: home in the morning → school → home in
// the afternoon–evening → (sleep) → the next morning. Each has its own clock range; the clock runs ~10 real minutes per part.
const MORNING_END = 7 * 60 + 30;
const PHASES = {
  morning: { start: 6 * 60, end: MORNING_END, place: 'Otthon – reggel' },
  school: { start: 8 * 60, end: 15 * 60 + 30, place: 'Iskola' },
  evening: { start: 16 * 60, end: 22 * 60, place: 'Otthon – délután, este' },
};
const minPerSec = () => { const ph = PHASES[ep2.phase]; return (ph.end - ph.start) / 600; };
const weekend = (d) => { const t = new Date(DAY0); t.setDate(t.getDate() + d); return t.getDay() === 0 || t.getDay() === 6; };
const MORNING_IDS = ['r2-tejszin', 'r2-karcsi', 'r2-kulcs'];
const morningDone = () => MORNING_IDS.filter((id) => starsFor(id) > 0).length;

// moving on: save the new part's start („fresh”), then the page starts again with a card (date · time · place, Tovább ▶) –
// a fresh start gives every part its own clean state, and the card's click lets the sound play
const NEXT_KEY = 'petyus.r2.tovabb';
function goPhase(phase, day, note = '') {
  ep2.leaving = true;
  const st = { v: 1, phase, day, min: PHASES[phase].start, fresh: true, late: phase === 'morning' ? 0 : ep2.lateMin, top: phase === 'morning' ? null : dress.top || ep2.top };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); sessionStorage.setItem(NEXT_KEY, JSON.stringify({ phase, day, note })); } catch (e) { /* storage blocked */ }
  G.mode = 'leaving'; setPrompt('');
  $('filmDip').classList.add('on');
  setTimeout(() => { location.href = location.pathname; }, 450);
}
// boot (main.js): the card of the part that comes next, if the last page moved on
export function takeEp2Next() {
  let n = null; try { n = JSON.parse(sessionStorage.getItem(NEXT_KEY) || 'null'); sessionStorage.removeItem(NEXT_KEY); } catch (e) { n = null; }
  return n && PHASES[n.phase] ? n : null;
}
export function showPhaseCard(n, onGo) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(circle at 50% 40%,#223156,#0b1020);color:#fff;text-align:center;padding:16px;';
  const ph = PHASES[n.phase];
  el.innerHTML = `<div style="font-family:'Bangers',sans-serif;font-size:clamp(40px,9vw,88px);letter-spacing:2px;color:#ffd166;text-shadow:3px 3px 0 #000">${ph.place}</div>
    <div style="font-family:'Patrick Hand',sans-serif;font-size:clamp(20px,3.6vw,34px)">${dateText(n.day)} · ${clockText(ph.start)}</div>
    ${n.note ? `<div style="font-family:'Patrick Hand',sans-serif;font-size:clamp(17px,2.8vw,26px);max-width:760px;opacity:.9">${n.note}</div>` : ''}
    <button class="btn" style="margin-top:12px;font-size:22px;padding:10px 26px">Tovább ▶</button>`;
  document.body.appendChild(el);
  const btn = el.querySelector('button'); btn.focus();
  btn.onclick = () => { el.remove(); onGo(); };
}
// the three ways on
function leaveMorning() {
  const done = morningDone();
  const block = leaveBlock();
  if (block === 'dress') { say(G.angi, 'Pizsamában?! Előbb öltözz fel! A ruháid a szobádban vannak, a szekrényben.', 3.4); toast('Öltözés: Petyus szobájában a <b>szekrénynél</b> (E).', 3); return; }
  if (ep2.min < MORNING_END && done < MORNING_IDS.length) {
    say(G.angi, `Még csak ${clockText(ep2.min)} van! Fél nyolckor indulunk.`, 3.0);
    toast(`Indulás: <b>7:30</b>-kor – vagy ha mindhárom reggeli csibészség megvolt (<b>${done}/3</b>).`, 3.4);
    return;
  }
  if (block === 'parents') { say(G.petya, 'Várj meg minket, Petyus! Mi is felöltözünk!', 2.6); hurryParents(); return; }
  if (weekend(ep2.day)) goPhase('evening', ep2.day, 'Hétvége: ma nincs iskola – egész nap a nagyiéknál voltatok.');
  else goPhase('school', ep2.day);
}
function leaveSchool() { goPhase('evening', ep2.day); }
function goToBed() {
  const next = ep2.day + 1;
  if (next >= DAYS) goPhase('morning', 0, 'Vége a szeptembernek! A hónap elölről kezdődik – a csibészségek eredményei megmaradnak.');
  else goPhase('morning', next, weekend(next) ? 'Hétvége: ma nincs iskola.' : '');
}
export function dateText(d = ep2.day) { const t = new Date(DAY0); t.setDate(t.getDate() + d); return `2026. szeptember ${t.getDate()}., ${WEEKDAYS[t.getDay()]}`; }
const clockText = (m) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- start: the park goes, the flat comes
export function startEp2() {
  G.episode = 2;
  // which part of the day: the saved one (dev: ?nyitany=1 – a new game's morning with the opening film)
  const forceNew = import.meta.env.DEV && new URLSearchParams(location.search).has('nyitany');
  ep2.phase = forceNew ? 'morning' : savedPhase(); ep2.min = PHASES[ep2.phase].start;
  const SCHOOL = ep2.phase === 'school', EVE = ep2.phase === 'evening';
  setMasterVol(0.9);   // indoors: louder than the park
  for (const o of [...scene.children]) if (!o.isLight && o !== sun.target) scene.remove(o);   // part 1's world (built at boot)
  colliders.length = 0; INSTANCES.length = 0;
  if (SCHOOL) setGround(() => 0);
  else setGround((x, z) => (x > -0.4 && x < 18.3 && z > -2.1 && z < 9.6 ? FY : 0));   // the flat (and its balconies) is upstairs, the yard on the ground
  ball.active = false; roller.rider = null; roller.path = null;
  // the sky light's ground colour was the park's grass (green): indoors every downward face (a fridge's ceiling, the underside
  // of a shelf) would look green – a warm neutral instead
  scene.traverse((o) => { if (o.isHemisphereLight) o.groundColor.set(0xb9ab98); });
  if (EVE) {   // dark outside: a little blue night sky light; inside the lamps are on (home.js lightPool)
    scene.background.set(0x0c1428); SUN_OFF.set(-20, 30, 10); sun.color.set(0x8fa6ff); sun.intensity = 0.22; sun.castShadow = false;
    scene.traverse((o) => { if (o.isHemisphereLight) { o.intensity = 0.42; o.color.set(0x9aa4c8); o.groundColor.set(0x6b5a48); } });
  } else if (SCHOOL) {   // a sunny day at school (the sun casts the shadows here: there are no ceiling lamps)
    scene.background.set(0xcde8f5); SUN_OFF.set(30, 40, 20); sun.color.set(0xfff6e6); sun.intensity = 2.4; sun.castShadow = true;
  } else {   // bright morning: the sun is low in the east (through the east windows), cool sky light
    scene.background.set(0xcde8f5); SUN_OFF.set(30, 26, -4); sun.color.set(0xfff3dc); sun.intensity = 2.3;
    sun.castShadow = false;   // the shadows in the flat come from its ceiling lamps (home.js lightPool), not the sun
  }
  if (SCHOOL) buildSchool();
  else {
    buildHome(placeOutsideProps); buildOutside(); buildKarcsi(); buildAppliances(); buildBath(); buildInventory();
    if (EVE) ceiling.children[0].material.color.set(0x77726b);   // the ceiling (unlit): dimmer in the evening, lit only by the lamps
    buildWardrobe();   // Petyus's wardrobe (getting dressed in the morning: dressing.js)
    if (!EVE) buildSister();   // (in the evening she is out)
    if (EVE) setEvening();   // (no fill lights: without shadows they shone through the walls – the three nearest lit rooms have the pool's lights)
  }
  // in the morning the three of them are in pajamas (Petyus: the football kit's model – the walking one)
  if (ep2.phase === 'morning') { dressPajama(rigs.foci, 'petyus'); dressPajama(rigs.petya, 'petya'); dressPajama(rigs.angi, 'angi'); }
  else { ep2.top = savedTop(); if (ep2.top) dressClothes(rigs.foci, TOPS[ep2.top]); }   // what he put on in the morning
  // the people cast shadows but take none on themselves: their own (lagging, coarse) shadow flickered on them as they moved
  if (!SCHOOL) for (const k in rigs) rigs[k]?.root?.traverse?.((o) => { if (o.isMesh) o.receiveShadow = false; });
  G.petike.riding = false; G.petike.setRig(rigs.foci); G.petike.stride = 6.5; G.petike.swing = 0.7;
  if (SCHOOL) {   // the parents are not there
    ep2.bounds = SCHOOL_BOUNDS;
    for (const a of [G.petya, G.angi]) { a.path = null; a.pos.set(-999, 0, -999); }
    G.petike.place(SCHOOL_START.x, SCHOOL_START.z, SCHOOL_START.h); G.petike.pos.y = 0;
  } else { scene.add(G.petya.rig.root, G.angi.rig.root); placeFamily(); }
  G.saveHook = saveEp2;
  // where the player left off (back to the menu / closed the page)
  const resumed = !forceNew && loadEp2();
  G.mode = 'play'; G.pstate = 'home'; G.petyaMode = 'home';
  // the base framing (zoom 1) shows most of the flat; zooming out stops at 2× (the house and the yard), zooming in is free
  G.viewSizeTarget = G.viewSize = 8; G.zoom = 1; G.zoomMax = 2;   // (the school too: zoomed out its walls are solid, the roof on)
  camTarget.set(G.petike.pos.x, SCHOOL ? 0 : FY, G.petike.pos.z);
  // HUD, help, tab title
  const ep = EPISODES[1];
  document.title = `${SERIES} – ${ep.n}. rész: ${ep.month}`;
  $('hud').innerHTML = '<span class="chip">📅 <span id="e2Date"></span></span> <span class="chip">🕕 <span id="e2Clock"></span></span> <span class="chip" id="e2RoomChip">📍 <span id="e2Room"></span></span> <span class="chip" id="e2Late" style="display:none">⏰ +<span id="e2LateN"></span> perc</span>'
    + (SCHOOL ? '<span class="chip row" id="e2Lesson"></span>' : '');   // at school: the lesson or the break (a line of its own)
  $('help').innerHTML = SCHOOL
    ? '<dl><dt>WASD / nyilak</dt><dd>mozgás</dd><dt>Shift</dt><dd>futás</dd><dt>E</dt><dd>leülés a helyedre (6. b, első pad) · a kapunál: hazaindulás</dd><dt>Q / R  ·  , .</dt><dd>nézet forgatása (⟲ ⟳)</dd><dt>T</dt><dd>falak: átlátszó / lesüllyedő</dd><dt>V</dt><dd>belső nézet (FPS); kattintás után egérrel nézel, Esc: egér vissza</dd><dt>Görgő / + −</dt><dd>zoom (0: alap)</dd><dt>Egérrel húzva</dt><dd>körülnézés</dd><dt>M</dt><dd>hang</dd><dt>H</dt><dd>súgó elrejtése</dd></dl>'
    : '<dl><dt>WASD / nyilak</dt><dd>mozgás</dd><dt>Shift</dt><dd>futás</dd><dt>E</dt><dd>használat: ajtó nyitása / csukása, villany, kopogás' + (EVE ? ', lefekvés (Petyus ágyánál)' : ', indulás (a bejárati ajtónál)') + '</dd><dt>Q / R  ·  , .</dt><dd>nézet forgatása (⟲ ⟳)</dd><dt>T</dt><dd>falak: átlátszó / lesüllyedő</dd><dt>V</dt><dd>belső nézet (FPS); kattintás után egérrel nézel, Esc: egér vissza</dd><dt>E · F</dt><dd>tárgy felvétele · a kiválasztott lerakása / bögre töltése</dd><dt>1–9 · Tab</dt><dd>tárgy kiválasztása</dd><dt>Görgő / + −</dt><dd>zoom (0: alap)</dd><dt>Egérrel húzva</dt><dd>körülnézés</dd><dt>M</dt><dd>hang</dd><dt>H</dt><dd>súgó elrejtése</dd></dl>';
  for (const id of ['kickBtn', 'runBtn']) { const el = $(id); if (el) el.style.display = id === 'kickBtn' ? 'none' : ''; }
  $('skipBtn').style.display = 'none'; $('hud').style.display = 'block'; $('help').style.display = isTouch ? 'none' : 'block';
  if (isTouch) $('touch').style.display = 'block';
  for (const [t, ttl, fn] of [['🧱', 'Falak: átlátszó / lesüllyedő (T)', toggleWalls], ['👁', 'Belső nézet (V)', () => toggleFps()]]) {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.title = ttl; b.onclick = (e) => { fn(); e.currentTarget.blur(); };
    $('topright').insertBefore(b, $('menuBtn'));   // ⟲ ⟳ 🧱 👁 🏠 📒 🔊
  }
  // the evening: every room's light on (a resumed evening keeps the saved switches)
  if (EVE && resumed !== true) for (const sw of switches) if (!sw.on && sw.room === 'konyha') toggleSwitch(sw);   // the evening: the kitchen's light on
  if (!SCHOOL && resumed !== true) for (const d of doors) if (d.pivot && d.open && Math.abs(d.z - 2.36) < 0.2 && d.x < 5.5) { toggleDoor(d); d.t = 0; }   // the bathroom and the WC: shut
  if (resumed === 'fresh' && EVE) { G.petike.place(0.9, 3.3, Math.PI / 2); G.petike.pos.y = FY; }   // just home: in the hallway, by the front door
  $('e2Date').textContent = dateText(); hudClock(true); hudLate(); fitHud();
  // compile every material now (also the hidden ones: ceiling, lamps, the WC's water), so nothing stalls the game later when it
  // first shows up (a shader compiled on first use is a visible hitch)
  { const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    if (!SCHOOL) lightPool();   // (created before compiling: a light added later would recompile everything)
    try { renderer.compile(scene, camera); if (!SCHOOL) renderer.compile(scene, fpsCam); } catch (e) { /* best effort */ }   // (the lights never hide: one set of shaders)
    for (const o of hidden) o.visible = false; }
  if (resumed === true) toast(`Folytatás: <b>${dateText()}</b>, ${clockText(ep2.min)}`, 3);
  else if (resumed === 'fresh') {   // just arrived
    if (SCHOOL) setTimeout(() => say(G.petike, pick(['Na, itt is vagyok!', 'Jó reggelt, suli!', 'Remélem, nem lesz dolgozat…']), 2.6), 800);
    else if (EVE) setTimeout(() => say(G.angi, pick(['Szia, Petyus! Milyen volt a suli?', 'Megjöttél? Mosd meg a kezed, mindjárt vacsora!']), 3.0), 800);
    else setTimeout(() => say(G.angi, 'Jó reggelt, Petyus! Kelj fel, mosd meg a fogad!', 3.2), 800);
  } else {   // a new game: the opening film first (wakeup.js), then the morning
    startWakeup(() => {
      placeFamily(); camTarget.set(G.petike.pos.x, FY, G.petike.pos.z);
      setTimeout(() => say(G.angi, 'Jó reggelt, Petyus! Na végre fent vagy. Mosd meg a fogad!', 3.4), 700);
    });
  }
}
// where everyone is when the morning starts: Petyus by his bed, dad at the table, mum at the cooktop
function placeFamily() {
  const s = SPOTS;
  G.petike.place(s.petyusWake.x, s.petyusWake.z, s.petyusWake.h);
  G.petya.path = null; G.petya.place(s.dadChair.x, s.dadChair.z, s.dadChair.h); G.petya.seatH = 0.45; G.petya.seatBase = FY; G.petya.sit = G.petya.sitTarget = 1;
  G.angi.path = null; G.angi.sit = G.angi.sitTarget = 0; G.angi.place(s.momCook.x, s.momCook.z, s.momCook.h);
  for (const a of [G.petike, G.petya, G.angi]) { a.pos.y = FY; a.sync(); }   // occlude.js measures from here
}
// the HUD must not run under the top-right buttons (their number differs by place and screen): it may be as wide as the gap
function fitHud() {
  const tr = $('topright'), hud = $('hud'); if (!tr || !hud) return;
  hud.style.maxWidth = Math.max(140, tr.getBoundingClientRect().left - hud.getBoundingClientRect().left - 10) + 'px';
}
window.addEventListener('resize', () => { if (G.episode === 2) fitHud(); });
let shownMin = -1;
function hudClock(force) { const m = Math.floor(ep2.min); if (m !== shownMin || force) { shownMin = m; $('e2Clock').textContent = clockText(m); } }

// ---------------------------------------------------------------- turning the view (Q / R, or the ⟲ ⟳ buttons): 90° steps
// CAM_OFF (scene.js) and the screen-relative walking directions CAM_FWD / CAM_RIGHT (player.js) turn together; the walls
// (home.js), the fading props (occlude.js) and dragging the view (input.js) read them every frame.
if (import.meta.env.DEV) window.__ep2 = { coffee: cf, rw, kh, karcsi: karcsiState, inv, itemObj, take(id) { const c = pickables(G.petike.pos).find((q) => q.item.id === id); if (c) pickUp(c.item); return !!c; }, view: viewTurn, cutWalls, wallView, CAM_OFF, toggleFps, get fp() { return fp; }, ep2, tooth: tp, tv: tm, ghost: gh };   // debugging (dev server only)
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
  if (ceiling) ceiling.visible = on; setSchoolFps(on && ep2.phase === 'school'); G.petike.rig.root.visible = !on;
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
  const eye = (ep2.phase === 'school' ? 0 : FY) + 1.32 - (a.sit || 0) * 0.42;   // lower when he sits (the armchair)
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
const DAD_EVE = ['Na, milyen volt a suli?', 'Megírtad a leckét?', 'Ma ki nyert a szünetben?', 'Holnap is korán kelünk, ne maradj fent sokáig!', 'Kapcsold le a villanyt, ha kijössz!'];
const MOM_EVE = ['Mindjárt kész a vacsora!', 'Mosd meg a kezed, Petyus!', 'Pakold be a táskádat holnapra!', 'Fürdés, aztán ágy!', 'Ne nézz már annyit tévét!'];
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
  if (peeTick(dt)) return;   // at the WC (pee.js): standing, aiming
  if (dress.choosing || dress.changeT >= 0) { a.animate(dt, false, 0); a.sync(); return; }   // at the wardrobe (dressing.js)
  // sitting in the armchair: no walking; a movement key (or the stick) stands him up again
  if (seating.on) {
    const moveKey = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || (!fp.on && (keys.ArrowLeft || keys.ArrowRight)) || touch.active;
    if (moveKey && a.sit > 0.95) seating.on = false;
    else {
      a.seatH = seating.seatH; a.seatBase = seating.base ?? FY; a.sitTarget = 1;
      a.pos.x = damp(a.pos.x, seating.x, 10, dt); a.pos.z = damp(a.pos.z, seating.z + (seating.chair ? 0 : 0.06), 10, dt);   // a little forward: a child's legs reach out over the edge
      if (!fp.on) a.heading = a.targetHeading = dampAngle(a.heading, seating.h, 10, dt);
      a.animate(dt, false, 0);
      // in the armchair the legs are stretched out in front, slightly raised (knees straight – the feet point up, over the seat's edge)
      const r = a.rig, k = a.sit * a.sit * (3 - 2 * a.sit);
      if (!seating.chair) for (let i = 0; i < 2; i++) { r.hip[i].rotation.x = lerp(r.hip[i].rotation.x, -1.62, k); r.knee[i].rotation.x = lerp(r.knee[i].rotation.x, 0.04, k); if (r.foot) r.foot[i].rotation.x = lerp(r.foot[i].rotation.x, 0, k); }
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
  a.pos.x = clamp(a.pos.x, ep2.bounds.x0, ep2.bounds.x1); a.pos.z = clamp(a.pos.z, ep2.bounds.z0, ep2.bounds.z1);
  const spd = Math.hypot(pvel.x, pvel.z);
  // footsteps: one at every half stride (the walk cycle's phase), the floor decides the sound
  const stepN = Math.floor(a.phase / Math.PI);
  if (stepN !== step.n) { step.n = stepN; if (spd > 0.4) { const r = ep2.phase === 'school' ? null : roomAt(a.pos.x, a.pos.z); sStep(ep2.phase === 'school' ? schoolFloor(a.pos.x, a.pos.z) : r ? r.floor : 'wood', sprint ? 1 : 0); } }
  if (fp.on) a.heading = a.targetHeading = fp.yaw;
  else { if (il > 0.1) a.targetHeading = Math.atan2(wx, wz); a.heading = dampAngle(a.heading, a.targetHeading, 14, dt); }
  a.animate(dt, spd > 0.2, spd); a.sync();
}

// E near a closed door: the sibling's room is locked, the front door is not for pyjamas
const door = { knockT: 0 };
function interactHome() {
  const p = G.petike.pos;
  if (pee.on) {   // peeing: only the aiming and the end
    setPrompt(isTouch ? 'Célozz a botkormánnyal!' : 'A / D – célzás · Szóköz – kész');
    const kb = $('kickBtn'); if (kb && isTouch) { kb.style.display = 'block'; if (kb.textContent !== 'KÉSZ') kb.textContent = 'KÉSZ'; }
    return;
  }
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
  if (ep2.phase === 'morning') cands.push(wardrobeCand(p));   // getting dressed (dressing.js)
  if (ep2.phase === 'evening') cands.push({ o: { bed: true }, r: Math.hypot(p.x - 12.75, p.z - 1.95), reach: 0.8, aim: new V3(12.22, 0.5, 1.95), size: 0.5 });   // Petyus's bed: sleep
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
  if (kb) { const lbl = isTouch ? (best && best.seat ? (canPee() ? 'PISILÉS' : 'LEHÚZÁS') : best && best.dev && best.dev.alt ? best.dev.alt.short() : act ? act.short : '') : ''; kb.style.display = lbl ? 'block' : 'none'; if (lbl && kb.textContent !== lbl) kb.textContent = lbl; }
  if (act && (G.invPressed || (isTouch && G.kickPressed && !altBusy))) act.run();
  if (best && best.wardrobe) {
    txt = wardrobeLabel();
    if (G.usePressed) wardrobeUse();
  } else if (best && best.bed) {
    txt = 'E – lefekvés (jó éjt!)' + (sheetOffer() ? ' · ' + sheetLabel() : '');   // the sheet: „A lepedős kísértet” (ghost.js)
    if (kb && isTouch && sheetOffer()) { kb.style.display = 'block'; kb.textContent = 'LEPEDŐ'; }
    if (G.usePressed) { if (gh.sheet) toggleSheet(); say(G.petike, 'Jó éjt, anya! Jó éjt, apa!', 1.8); setTimeout(goToBed, 1200); }
    else if (G.kickPressed && sheetOffer()) toggleSheet();
  } else if (best && best.hint) {
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
    txt = toiletSeatLabel() + (isTouch ? '' : canPee() ? ' · ' + peeLabel() : ' · Szóköz – lehúzás');
    if (G.usePressed) { toggleToiletSeat(); sClick(); }
    if (G.kickPressed && canPee()) startPee();
    else if (G.kickPressed && flushToilet()) {
      peeFlushed();
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
      if (ep2.phase === 'evening') {
        txt = 'E – ki';
        if (G.usePressed) say(G.angi, 'Este már nem megyünk sehova! Majd holnap.', 2.8);
      } else {
        txt = weekend(ep2.day) ? 'E – indulás (hétvége: a nagyiékhoz)' : 'E – indulás az iskolába';
        if (G.usePressed) leaveMorning();
      }
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
  if (momBusy() || keyBusy() || brushBusy('angi') || momGhostBusy()) { if (fx.fridge && ep2.momAt === 'fridge' && fx.fridge.open() && !petyusAtFridge()) fx.fridge.setOpen(false); return; }
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
  const MORNING = ep2.phase === 'morning';
  if (MORNING) {   // getting dressed (dressing.js): once Petyus is dressed and it is time, the parents get ready and wait at the door
    const ready = ep2.min >= MORNING_END || morningDone() === MORNING_IDS.length;
    if (dressTick(dt, ready, dadBusy() || dadChasing() || momBusy() || keyBusy())) { if (dress.parents !== 'change') { G.petya.update(dt); G.angi.update(dt); } return; }
  }
  G.petya.update(dt); if (MORNING) coffeeTick(dt);   // the creamy coffee may take dad over (coffee.js)
  const m = G.angi;
  momRoutine(dt);
  m.update(dt);
  if (ep2.momAt === 'fridge' && !m.path && !momBusy() && !keyBusy() && !brushBusy('angi')) momLook();
  if (MORNING) {
    runawayTick(dt);   // „Karcsi nagy szökése”: mum on the chair, dad on all fours (runaway.js)
    keyTick(dt);       // „Hol a kulcs, Angi?”: mum looking for her keys (keyhunt.js)
  }
  if (!MORNING) {   // the evening: their own lines; late in the evening mum sends him to bed
    // the evening's timetable (the mischiefs): the match 20:00–20:42 (tvmatch.js), mum's teeth 20:45, the rubbish 21:00
    // (ghost.js), dad's teeth 21:30 (toothpaste.js) – dad does one thing at a time
    const dadFree = () => !brushBusy('petya') && !tvBusy() && !ghostBusy() && G.petya.sit > 0.9;
    tvTick(dt, ep2.min, dadFree);
    ghostTick(dt, ep2.min, dadFree);
    toothTick(dt, ep2.min, (who) => (who === 'petya' ? tvBusy() || ghostBusy() : momGhostBusy()));
    if (brushBusy('angi') || brushBusy('petya') || tvBusy() || ghostBusy()) return;
    ep2.talkT -= dt;
    if (ep2.talkT <= 0) {
      ep2.talkT = 14 + Math.random() * 8;
      if (ep2.min > 21 * 60 + 15) say(G.angi, pick(['Petyus, ideje lefeküdni!', 'Fogmosás, és irány az ágy!', 'Késő van már, Petyus!']), 3);
      else if (Math.random() < 0.5) { say(G.petya, pick(DAD_EVE), 3); G.petya.point = 1.2; } else say(G.angi, pick(MOM_EVE), 3);
    }
    return;
  }
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
  if ((ep2.fitT = (ep2.fitT || 0) - dt) <= 0) { ep2.fitT = 0.5; fitHud(); }   // (buttons come and go: the HUD keeps clear of them)
  door.knockT -= dt;
  if (G.mode === 'play' && ep2.phase === 'school') {   // the school (school.js): walking about, the gate home
    movePetyus(dt); updateSchool(dt, ep2.min, fp.on || G.zoom > 1.55);   // (walls solid, the roof on: first person or zoomed out)
    const P = G.petike.pos, room = schoolRoom(P.x, P.z);
    setOutdoor(room === 'Iskola – udvar' || room === 'Az utca' ? 1 : fp.on ? 0.15 : 0.4);
    if (room !== ep2.room) { ep2.room = room; $('e2Room').textContent = room; }
    const act = schoolAction();   // doors, the toilets, Petyus's own place (sit down / stand up), the gate (home)
    const kb = $('kickBtn'); if (kb && isTouch) { const l = pee.on ? 'KÉSZ' : act && act.kick ? act.kick : ''; kb.style.display = l ? 'block' : 'none'; if (l && kb.textContent !== l) kb.textContent = l; }
    if (pee.on) setPrompt(isTouch ? 'Célozz a botkormánnyal!' : 'A / D – célzás · Szóköz – kész');
    else if (act) {
      setPrompt(isTouch ? act.txt.replace(/^E – /, 'HASZNÁL – ') : act.txt);
      if (G.usePressed) { if (act.gate) leaveSchool(); else if (act.seat) toggleSeat(seating); else schoolUse(act); }
      if (G.kickPressed) schoolKick(act);
    } else setPrompt('');
    // the breaks pass slower (10 minutes ≈ 50 s): time to get out to the yard and play
    { const inBreak = ep2.min >= 8 * 60 && ep2.min < 8 * 60 + 6 * 55 && (ep2.min - 8 * 60) % 55 >= 45;
      ep2.min = Math.min(PHASES.school.end, ep2.min + dt * (inBreak ? 0.2 : minPerSec())); hudClock(); }
    { const st = schoolStatus(ep2.min, (new Date(DAY0.getFullYear(), DAY0.getMonth(), DAY0.getDate() + ep2.day).getDay() + 6) % 7), el = $('e2Lesson');
      if (el && el.textContent !== st.text) { el.textContent = st.text; el.style.background = st.brk ? 'rgba(42,157,143,.85)' : 'rgba(29,53,87,.85)'; } }
    G.usePressed = false; G.qPressed = false; G.kickPressed = G.kickReleased = false; G.invPressed = false;
  } else if (G.mode === 'play') {
    movePetyus(dt);
    interactHome();
    // the world outside: indoors in the first-person view not at all (only the dog barking in the yard), indoors in the top
    // view faintly, on a balcony fully
    { const r = roomAt(G.petike.pos.x, G.petike.pos.z), out = !!(r && r.floor === 'balcony'); setOutdoor(out ? 1 : fp.on ? 0 : 0.3); }
    updateParents(dt); updateOutside(dt); updateKarcsi(dt); updateAppliances(dt); updateInventory(); updateSister(dt);
    // walls solid in the first-person view and when zoomed far out (the roof is on then: the house looks whole)
    const r = updateHome(dt, G.petike.pos, fp.on || G.zoom > 1.55);
    if (r !== ep2.room) {
      ep2.room = r; $('e2Room').textContent = r ? r.name : '';
      const l = ep2.phase === 'morning' && r && ROOM_LINES[r.id];   // (the rooms' morning lines)
      if (l && !(r.id === 'eloter' && dress.top) && !ep2.seen.has(r.id) && !(l[0](G) === G.petya && dadBusy())) { ep2.seen.add(r.id); say(l[0](G), l[1], 3); ep2.talkT = Math.max(ep2.talkT, 5); }   // (the hallway's „pajamas” line: only in pajamas)
    }
    ep2.min = Math.min(PHASES[ep2.phase].end, ep2.min + dt * minPerSec()); hudClock();
    G.usePressed = false; G.qPressed = false; G.kickPressed = G.kickReleased = false; G.invPressed = false;
  }
  if (G.mode === 'intro') { wakeTick(dt); updateSister(dt); updateOutside(dt); updateHome(dt, wakeupFocus(), false); }   // the opening film (wakeup.js)
  updateViewTurn(dt);
  updateFx(dt); updateCamera(dt); if (fp.on) updateFpsCam(); updateOcclusion(dt); updateBubbles(dt);
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').classList.remove('show'); }
  if (G.bigT > 0) { G.bigT -= dt; if (G.bigT <= 0) $('big').classList.remove('show'); }
}
