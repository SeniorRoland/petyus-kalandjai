// Petyus kalandjai – 2. rész: Szeptember. Indítás (a park helyett a lakás), fő lépés (stepEp2), naptár és óra, reggeli jelenet.
// For now: home, morning (6:00–7:30) – the flat, the three of them in pajamas, Petyus walks around; dad and mum keep talking.
import { updateFx } from '../actors.js';
import { updateCamera } from '../camera.js';
import { isTouch, keys, touch } from '../input.js';
import { totalStars } from '../mischief.js';
import { updateOcclusion } from '../occlude.js';
import { CAM_FWD, CAM_RIGHT } from '../player.js';
import { EPISODES, G, SERIES, ball, rigs, roller } from '../state.js';
import { SUN_OFF, camTarget, scene, sun } from '../scene.js';
import { say, updateBubbles } from '../ui.js';
import { $, V3, clamp, damp, dampAngle, pick } from '../util.js';
import { INSTANCES, collide, colliders, setGround } from '../world.js';
import { setPrompt } from '../activities/drinking.js';
import { SPOTS, buildHome, doors, updateHome } from './home.js';
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
const MORNING_END = 7 * 60 + 30, MIN_PER_SEC = 90 / 600;   // the 90 morning minutes take 10 real minutes (to be tuned)
export function dateText(d = ep2.day) { const t = new Date(DAY0); t.setDate(t.getDate() + d); return `2026. szeptember ${t.getDate()}., ${WEEKDAYS[t.getDay()]}`; }
const clockText = (m) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- start: the park goes, the flat comes
export function startEp2() {
  G.episode = 2;
  for (const o of [...scene.children]) if (!o.isLight && o !== sun.target) scene.remove(o);   // part 1's world (built at boot)
  colliders.length = 0; INSTANCES.length = 0; setGround(() => 0);
  ball.active = false; roller.rider = null; roller.path = null;
  scene.background.set(0xcde8f5);
  // bright morning: the sun is low in the east (through the east windows), cool sky light
  SUN_OFF.set(30, 26, -4); sun.color.set(0xfff3dc); sun.intensity = 2.3;
  buildHome();
  // the three of them in pajamas (Petyus: the football kit's model – the walking one)
  dressPajama(rigs.foci, 'petyus'); dressPajama(rigs.petya, 'petya'); dressPajama(rigs.angi, 'angi');
  G.petike.riding = false; G.petike.setRig(rigs.foci); G.petike.stride = 6.5; G.petike.swing = 0.7;
  scene.add(G.petya.rig.root, G.angi.rig.root);
  const s = SPOTS;
  G.petike.place(s.petyusWake.x, s.petyusWake.z, s.petyusWake.h);
  G.petya.path = null; G.petya.place(s.dadChair.x, s.dadChair.z, s.dadChair.h); G.petya.seatH = 0.45; G.petya.sit = G.petya.sitTarget = 1;
  G.angi.path = null; G.angi.sit = G.angi.sitTarget = 0; G.angi.place(s.momCook.x, s.momCook.z, s.momCook.h);
  G.mode = 'play'; G.pstate = 'home'; G.petyaMode = 'home';
  G.viewSizeTarget = G.viewSize = 6.2; G.zoom = 1;
  camTarget.set(G.petike.pos.x, 0, G.petike.pos.z);
  // HUD, help, tab title
  const ep = EPISODES[1];
  document.title = `${SERIES} – ${ep.n}. rész: ${ep.month}`;
  $('hud').innerHTML = '<span class="chip">📅 <span id="e2Date"></span></span> <span class="chip">🕕 <span id="e2Clock"></span></span> <span class="chip" id="e2RoomChip">📍 <span id="e2Room"></span></span>';
  $('help').innerHTML = '<dl><dt>WASD / nyilak</dt><dd>mozgás</dd><dt>Shift</dt><dd>futás</dd><dt>E</dt><dd>használat</dd><dt>Görgő / + −</dt><dd>zoom (0: alap)</dd><dt>Egérrel húzva</dt><dd>körülnézés</dd><dt>M</dt><dd>hang</dd><dt>H</dt><dd>súgó elrejtése</dd></dl>';
  for (const id of ['kickBtn', 'runBtn']) { const el = $(id); if (el) el.style.display = id === 'kickBtn' ? 'none' : ''; }
  $('skipBtn').style.display = 'none'; $('hud').style.display = 'block'; $('help').style.display = isTouch ? 'none' : 'block';
  if (isTouch) $('touch').style.display = 'block';
  $('e2Date').textContent = dateText(); hudClock(true);
  setTimeout(() => say(G.angi, 'Jó reggelt, Petyus! Kelj fel, mosd meg a fogad!', 3.6), 900);
}
let shownMin = -1;
function hudClock(force) { const m = Math.floor(ep2.min); if (m !== shownMin || force) { shownMin = m; $('e2Clock').textContent = clockText(m); } }

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
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
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
  if (il > 0.1) a.targetHeading = Math.atan2(wx, wz);
  a.heading = dampAngle(a.heading, a.targetHeading, 14, dt);
  a.animate(dt, spd > 0.2, spd); a.sync();
}

// E near a closed door: the sibling's room is locked, the front door is not for pyjamas
const door = { knockT: 0 };
function interactHome() {
  const p = G.petike.pos;
  let txt = '';
  for (const d of doors) {
    if (Math.hypot(p.x - d.x, p.z - d.z) > 0.95) continue;
    if (d.kind === 'locked') {
      txt = 'E – kopogás';
      if (G.usePressed && door.knockT <= 0) {
        door.knockT = 3;
        say({ headWorld: (o) => o.set(d.x, 2.0, d.z) }, 'KOPP-KOPP', 1.4);
        setTimeout(() => say({ name: 'Tesó', headWorld: (o) => o.set(d.x, 1.7, d.z + 0.6) }, 'Zárva! Hagyj aludni…', 2.6, ''), 900);
        setTimeout(() => say(G.petike, 'Jó, jó…', 2), 2600);
      }
    } else if (d.kind === 'front') {
      txt = 'E – indulás';
      if (G.usePressed) say(G.angi, 'Pizsamában?! Előbb öltözz fel, és reggelizz!', 3.2);
    }
  }
  setPrompt(txt);
}

// ---------------------------------------------------------------- the parents
function updateParents(dt) {
  G.petya.update(dt);
  const m = G.angi;
  // mum: at the cooktop, now and then to the fridge and back
  ep2.momT -= dt;
  if (ep2.momT <= 0 && !m.path) {
    ep2.momT = 10 + Math.random() * 8;
    if (ep2.momAt === 'cook') { m.walkTo([[SPOTS.momFridge.x, SPOTS.momFridge.z]], 1.2); ep2.momAt = 'fridge'; } else { m.walkTo([[SPOTS.momCook.x, SPOTS.momCook.z]], 1.2); ep2.momAt = 'cook'; }
  }
  if (!m.path) m.targetHeading = Math.PI;   // facing the counter
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
    updateParents(dt);
    const r = updateHome(dt, G.petike.pos);
    if (r !== ep2.room) {
      ep2.room = r; $('e2Room').textContent = r ? r.name : '';
      const l = r && ROOM_LINES[r.id];
      if (l && !ep2.seen.has(r.id)) { ep2.seen.add(r.id); say(l[0](G), l[1], 3); ep2.talkT = Math.max(ep2.talkT, 5); }
    }
    ep2.min = Math.min(MORNING_END, ep2.min + dt * MIN_PER_SEC); hudClock();
    G.usePressed = false; G.qPressed = false; G.kickPressed = G.kickReleased = false;
  }
  updateFx(dt); updateCamera(dt); updateOcclusion(dt); updateBubbles(dt);
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').classList.remove('show'); }
  if (G.bigT > 0) { G.bigT -= dt; if (G.bigT <= 0) $('big').classList.remove('show'); }
}
