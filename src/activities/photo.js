// Petyus kalandjai – activities/photo: 6. csibészség – „Fotóbomba”.
// Now and then (dad and Angi on the bench, nothing else going on) Angi wants a family photo at the fountain: she and dad walk
// over, a ring marks Petyus' place. Five photos: Angi counts 3-2-1 and KATT – clowning at the click (SPACE / ↑ jump,
// A/D / ←→ pull a face) spoils the photo. Too early and Angi notices and starts again. On one of the photos a pigeon walks
// up to Petyus: E = pigeon in the hand (★★★ needs it). Dad blinks or sneezes on every single photo. The photos pile up
// as polaroids on the left.
import { makePigeon, spawnFx } from '../actors.js';
import { noise, sFlap, tone } from '../audio.js';
import { dad, dadReturn } from '../dad.js';
import { isTouch, keys, touch } from '../input.js';
import { SEAT } from '../intro.js';
import { award } from '../mischief.js';
import { pvel } from '../player.js';
import { camera, renderer, scene } from '../scene.js';
import { G, pigeons } from '../state.js';
import { bigText, say, toast } from '../ui.js';
import { $, R, V3, clamp, dampAngle, pick, rand } from '../util.js';
import * as THREE from 'three';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';
import { nap } from './nap.js';
import { pig } from './pigeons.js';

// the family stands on the south path by the fountain, facing south (the camera sees them from the south-east, nothing
// tall in between); Angi a few steps in front on the path
const D = [0, 1], PERP = [1, 0], FACE = 0;
const F = [0, 3.75];
const SPOT = { kid: [F[0] - PERP[0] * 0.5, F[1] - PERP[1] * 0.5], dad: [F[0] + PERP[0] * 0.5, F[1] + PERP[1] * 0.5], mom: [F[0] + D[0] * 3.2 - PERP[0] * 0.5, F[1] + D[1] * 3.2 - PERP[1] * 0.5] };
const NEAR = [2.9, 3.2];   // between the fountain rim and the flower bed
// bench ⇄ fountain along the paths (round the pitch fence)
export const BENCH_ROUTE = [[22.5, -11.2], [18, -6], [18, 0], [6.5, 0.6]];
const SHOTS = 5, FIRST_INVITE = 35, NEXT_INVITE = 75, GIVE_UP = 40;
const POSE_LEN = 0.75;   // a pose lasts this long – the click must land inside it
export const ph = { phase: 'off', idleT: 0, nextT: FIRST_INVITE, waitT: 0, ring: null, shot: 0, spoiled: 0, pigeon: false, pigShot: 0,
  step: '', t: 0, gap: 0, pose: '', poseT: 9, restarts: 0, bird: null, holding: false, sneezeT: 0, back: null, photos: [], reviewT: 0 };
const SMILE = ['Mindenki mosolyog!', 'Csííííz!', 'Petya, húzd be a hasad!', 'Most egy szép, rendes képet!', 'Nézzetek ide! Ide! Nem oda!'];
const NOTICE = ['Petyus! Állj rendesen!', 'Láttam ám! Előről!', 'Petyus… komolyan. Még egyszer!', 'Nem bohóckodunk! Újra!'];
const SPOILED = ['PETYUUUS!', 'Na tessék… megint.', 'Ez lesz a nagymamáé…', 'Petyus! Ez egy családi fotó!', 'Jaj, ne… ezt is elrontottad!'];
const NICE = ['Ez szép lett! …Petya, megint pislogtál.', 'Na végre egy rendes kép! …Majdnem.', 'Ez jó! Ezt kirakom a hűtőre.'];

// ---------- invitation: called every frame from player.js
export function photoTick(dt) {
  if (ph.reviewT > 0 && (ph.reviewT -= dt) <= 0) $('polaroids').classList.remove('show', 'review');
  if (ph.back) tickBack(dt);
  if (G.mode !== 'play') return;
  if (ph.phase === 'off') {
    const calm = G.pstate === 'free' && (G.petyaMode === 'bench' || (G.petyaMode === 'doze' && !nap.game && nap.fallT < 0)) && G.petya.sit > 0.9 && G.angi.sit > 0.9 && !pig.active && !ph.back;
    if (calm) ph.idleT += dt;
    if (ph.idleT > ph.nextT) invite();
    return;
  }
  if (ph.phase === 'invite') {
    const P = G.petike.pos, d = Math.hypot(P.x - SPOT.kid[0], P.z - SPOT.kid[1]), ready = Math.hypot(G.angi.pos.x - SPOT.mom[0], G.angi.pos.z - SPOT.mom[1]) < 0.2 && Math.hypot(G.petya.pos.x - SPOT.dad[0], G.petya.pos.z - SPOT.dad[1]) < 0.2;
    if (ready) { G.angi.targetHeading = FACE + Math.PI; G.petya.targetHeading = FACE; ph.waitT += dt; }
    if (ph.ring) ph.ring.material.opacity = 0.55 + Math.sin(G.clockT * 5) * 0.25;
    if (d < 0.75 && G.pstate === 'free') { if (ready) return startPhoto(); setPrompt('Várd meg anyát és apát…'); }
    if (ready && ph.waitT > GIVE_UP) { say(G.angi, 'Na jó… akkor majd később.', 2.4); setTimeout(() => say(G.petya, 'Végre. Visszaülhetünk.', 2.0), 1600); endInvite(); }
  }
}
function invite() {
  ph.phase = 'invite'; ph.waitT = 0; ph.idleT = 0;
  const woke = G.petyaMode === 'doze';
  G.petyaMode = 'photo'; dad.talkT = 99;
  G.angi.sitTarget = 0; G.petya.sitTarget = 0;
  say(G.angi, woke ? 'Petya! Ébresztő! Családi fotó a szökőkútnál!' : pick(['Családi fotó! Mindenki a szökőkúthoz!', 'Csináljunk egy közös képet a szökőkútnál!']), 2.8);
  runSeq([
    [0.8, () => { G.angi.walkTo([[SEAT.angi[0], -11.85], ...BENCH_ROUTE, NEAR, SPOT.mom], 1.8); }],
    [0.9, () => { say(G.petya, woke ? 'Nem aludtam! …Milyen fotó?' : pick(['Most? Épp kényelmesen ültem…', 'Már megint fotó? Tegnap is volt.', 'Jó, de csak egy kép! EGY!']), 2.4); G.petya.walkTo([[SEAT.petya[0], -11.85], ...BENCH_ROUTE.map(([x, z]) => [x + 0.6, z + 0.5]), NEAR, SPOT.dad], 1.75); }],
    [2.0, () => toast(`Anya fotózni akar: állj be a <b>szökőkútnál</b> a kék körbe!`, 5)],
  ]);
  ph.ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.58, 28), new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  ph.ring.rotation.x = -Math.PI / 2; ph.ring.position.set(SPOT.kid[0], 0.07, SPOT.kid[1]); scene.add(ph.ring);
}
function endInvite() {
  ph.phase = 'off'; ph.nextT = NEXT_INVITE; ph.idleT = 0;
  if (ph.ring) { scene.remove(ph.ring); ph.ring.geometry.dispose(); ph.ring = null; }
  goBack();
}
// Angi walks back and sits down (dad uses his own 'return' → 'seat')
function goBack() {
  const back = [...BENCH_ROUTE].reverse();
  G.angi.walkTo([NEAR, ...back, [SEAT.angi[0], -11.85]], 1.3); ph.back = 'walk';
  // dad: 'return' (dad.js) – he slides round the fountain rim on his own (collide)
  dadReturn();
}
function tickBack(dt) {
  const a = G.angi;
  if (ph.back === 'walk' && !a.path) { a.targetHeading = 0; ph.back = 'turn'; ph.backT = 0.5; }
  else if (ph.back === 'turn' && (ph.backT -= dt) <= 0) { a.walkTo([SEAT.angi], 0.7, true); ph.back = 'seat'; }
  else if (ph.back === 'seat' && !a.path) { a.sitTarget = 1; ph.back = null; }
}

// ---------- the photo session (pstate 'photo')
function startPhoto() {
  const a = G.petike;
  G.pstate = 'photo'; ph.phase = 'shoot'; pvel.set(0, 0, 0); G.charging = false; a.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  if (ph.ring) { scene.remove(ph.ring); ph.ring.geometry.dispose(); ph.ring = null; }
  a.place(SPOT.kid[0], SPOT.kid[1], FACE);
  G.petya.place(SPOT.dad[0], SPOT.dad[1], FACE); G.petya.path = null;
  ph.shot = 0; ph.spoiled = 0; ph.pigeon = false; ph.pigShot = 2 + Math.floor(rand() * 3); ph.photos = []; ph.holding = false;
  $('polaroids').innerHTML = ''; $('polaroids').classList.add('show'); $('polaroids').classList.remove('review');
  G.viewSizeTarget = 6;
  G.runPressed = false;
  toast(isTouch ? 'Kattanáskor bohóckodj: <b>UGRÁS</b> vagy <b>GRIMASZ</b> gomb (a joystick is jó)' : 'Kattanáskor bohóckodj: <b>Szóköz / ↑</b> – ugrás · <b>A / D</b> – grimasz', 5);
  say(G.angi, 'Na, álljatok össze! Petya, karold át a gyereket!', 2.4);
  $('mini').style.display = 'block'; hud();
  nextShot(2.4);
}
function hud() { $('mini').innerHTML = `📸 Kép: <b>${Math.min(ph.shot, SHOTS)}</b>/${SHOTS} · 🤪 Elrontva: <b>${ph.spoiled}</b>` + (ph.pigeon ? ' · 🐦' : ''); }
function nextShot(delay) {
  ph.shot++; ph.restarts = 0; hud();
  if (ph.shot === ph.pigShot) callPigeon();
  ph.step = 'smile'; ph.t = -delay;
}
// clowning input: a fresh press starts a pose (the jump or a face); not while one is running
function readPose() {
  let jump = G.kickPressed || keys.KeyW || keys.ArrowUp, face = keys.KeyA || keys.KeyD || keys.ArrowLeft || keys.ArrowRight;
  if (touch.active) { if (touch.y > 0.6) jump = true; if (Math.abs(touch.x) > 0.6) face = true; }
  if (G.runPressed) { face = true; G.runPressed = false; ph.runTap = 0.12; }   // touch: the GRIMASZ button (a tap – held for a moment)
  if (ph.runTap > 0) { ph.runTap -= 1 / 60; face = true; }
  G.kickPressed = G.kickReleased = false; G.qPressed = false;
  const fresh = (jump || face) && !ph.held;
  ph.held = jump || face;
  if (fresh && ph.poseT > POSE_LEN + 0.15) { ph.pose = jump ? 'jump' : 'face'; ph.poseT = 0; if (ph.pose === 'jump') tone('sine', 300, 520, 0.12, 0.05); }
}
const posing = () => ph.poseT > 0.05 && ph.poseT < POSE_LEN;
export function updatePhoto(dt) {
  const a = G.petike;
  readPose(); ph.poseT += dt;
  if (G.usePressed) { G.usePressed = false; if (ph.bird && ph.bird.mode === 'wait' && !ph.holding) grabPigeon(); }
  setPrompt(ph.bird && ph.bird.mode === 'wait' && !ph.holding ? (isTouch ? 'HASZNÁL – galamb a kézbe!' : 'E – galamb a kézbe!') : '');
  // the countdown: smile → 3 → 2 → 1 → KATT (the last gap varies: no rhythm to learn)
  ph.t += dt;
  if (ph.step === 'smile' && ph.t >= 0) { say(G.angi, pick(SMILE), 1.6); ph.step = '3'; ph.t = -1.3; }
  else if (['3', '2', '1'].includes(ph.step) && ph.t >= 0) {
    if (posing() && !ph.holding) {   // caught clowning before the click
      ph.restarts++; say(G.angi, pick(NOTICE), 1.6); ph.step = '3'; ph.t = -1.6; tone('square', 220, 180, 0.12, 0.04);
    } else {
      bigText(ph.step, 0.55); tone('sine', 660, 660, 0.08, 0.06);
      ph.step = ph.step === '3' ? '2' : ph.step === '2' ? '1' : 'click';
      ph.t = ph.step === 'click' ? -R(0.55, 1.15) : -R(0.7, 0.95);
    }
  } else if (ph.step === 'click' && ph.t >= 0) click();
  else if (ph.step === 'after' && ph.t >= 0) { if (ph.shot < SHOTS) nextShot(0.6); else review(); }
  else if (ph.step === 'review' && ph.t >= 0) finish();
  // Petyus: the pose
  a.heading = dampAngle(a.heading, FACE, 10, dt); a.animate(dt, false, 0);
  const r = a.rig, k = clamp(Math.min(ph.poseT / 0.12, (POSE_LEN - ph.poseT) / 0.15), 0, 1);
  if (ph.holding) { r.sh[1].rotation.x = -2.7; r.sh[1].rotation.z = 0.15; r.sh[0].rotation.x = -0.5; }
  if (ph.pose === 'jump' && k > 0) {
    const j = Math.sin(clamp(ph.poseT / POSE_LEN, 0, 1) * Math.PI);
    r.inner.position.y += j * 0.42; r.hip[0].rotation.x = r.hip[1].rotation.x = -0.6 * j; r.knee[0].rotation.x = r.knee[1].rotation.x = 1.1 * j;
    if (!ph.holding) { r.sh[0].rotation.x = r.sh[1].rotation.x = -2.8 * k; r.sh[0].rotation.z = -0.4 * k; r.sh[1].rotation.z = 0.4 * k; }
  } else if (ph.pose === 'face' && k > 0) {
    // bunny ears behind dad's head with the left hand, thumb on the nose with the right, a lean towards dad
    r.inner.rotation.z = -0.22 * k; r.sh[0].rotation.x = -2.0 * k; r.sh[0].rotation.z = 0.5 * k;
    if (!ph.holding) { r.sh[1].rotation.x = -2.9 * k; r.sh[1].rotation.z = -0.35 * k; }
  }
  a.sync();
  // Angi holds the phone up, dad stands stiff (and sneezes)
  const A = G.angi.rig; A.sh[0].rotation.x = A.sh[1].rotation.x = -1.45; A.sh[0].rotation.z = 0.25; A.sh[1].rotation.z = -0.25; G.angi.sync();
  if (ph.sneezeT > 0) { ph.sneezeT -= dt; const s = Math.sin(clamp(1 - ph.sneezeT / 0.5, 0, 1) * Math.PI); G.petya.rig.inner.rotation.x = 0.45 * s; G.petya.sync(); }
}
function click() {
  const bomb = posing() || ph.holding, withBird = ph.holding;
  // flash + shutter
  const el = $('filmDip'); el.style.background = '#fff'; el.classList.add('on'); setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.style.background = ''; }, 200); }, 90);
  noise(0.05, 3000, 1, 0.25); noise(0.07, 1500, 1, 0.18, 0.08);
  bigText('KATT!', 0.7);
  // dad, always: blinks or sneezes
  const sneeze = rand() < 0.45;
  if (sneeze) { say(G.petya, 'HAPCI!', 1.2); ph.sneezeT = 0.5; }
  else say({ headWorld: (v) => v.set(G.petya.pos.x, 2.05, G.petya.pos.z) }, '*pislog*', 1.0, '');
  snapshot(bomb ? (withBird ? 'Galambos fotóbomba! 🐦' : pick(['Fotóbomba!', 'Elrontva!', 'Bohóc a képen!'])) : (sneeze ? 'Apa tüsszent' : 'Apa pislog'), bomb);
  if (bomb) { ph.spoiled++; if (withBird) ph.pigeon = true; }
  hud();
  runSeq([[0.8, () => say(G.angi, bomb ? (withBird ? 'Az ott egy GALAMB?!' : pick(SPOILED)) : pick(NICE), 2.0)]]);
  if (withBird) releasePigeon();
  else if (ph.bird && ph.bird.mode !== 'held') { ph.bird.mode = 'leave'; }
  ph.step = 'after'; ph.t = -2.6;
}
// a polaroid of the actual frame (rendered right now, before the browser clears the canvas)
function snapshot(caption, bomb) {
  let url = '';
  try {
    renderer.render(scene, camera);
    const c = renderer.domElement, p = new V3(F[0], 1.0, F[1]).project(camera);
    const cx = (p.x + 1) / 2 * c.width, cy = (1 - p.y) / 2 * c.height, s = Math.min(c.width, c.height) * 0.42;
    const o = document.createElement('canvas'); o.width = o.height = 180;
    o.getContext('2d').drawImage(c, cx - s / 2, cy - s / 2, s, s, 0, 0, 180, 180); url = o.toDataURL('image/jpeg', 0.8);
  } catch (e) { url = ''; }
  ph.photos.push({ url, caption, bomb });
  const d = document.createElement('div'); d.className = 'pol' + (bomb ? ' bomb' : ''); d.style.setProperty('--rot', `${R(-7, 7).toFixed(1)}deg`);
  d.innerHTML = (url ? `<img src="${url}" alt="">` : '<div class="noimg"></div>') + `<span></span>`; d.querySelector('span').textContent = caption;
  $('polaroids').appendChild(d);
}
function review() {
  ph.step = 'review'; ph.t = -6.5;
  $('polaroids').classList.add('review');
  const n = ph.spoiled;
  runSeq([
    [0.2, () => say(G.angi, 'Lássuk a képeket…', 1.6)],
    [1.6, () => say(G.angi, n === 0 ? 'Végre egy normális családi fotó! …Petya, te mindegyiken pislogsz.' : n >= SHOTS ? 'Mind az öt?! ÖT?!' : n >= 3 ? 'Ezt a nagymama kapja karácsonyra.' : 'Na… legalább egy-kettő jó lett.', 2.6)],
    [2.6, () => say(G.petya, n === 0 ? 'Nem pislogtam! Csak… pihentettem a szemem.' : 'Én legalább mindegyiken… HAPCI!', 2.4)],
  ]);
}
function finish() {
  ph.step = ''; ph.phase = 'off'; ph.nextT = NEXT_INVITE; ph.idleT = 0; ph.reviewT = 4;
  G.pstate = 'free'; $('mini').style.display = 'none'; G.viewSizeTarget = 8.5;
  $('polaroids').classList.remove('review');
  if (ph.bird) { ph.bird.mode = 'leave'; }
  if (ph.spoiled > 0) award('fotobomba', ph.spoiled, { pigeon: ph.pigeon });
  else say(G.petike, 'Hmm… túl jól sikerültek. Legközelebb bohóckodom!', 2.4);
  goBack();
}

// ---------- the pigeon that walks into the picture (pg.hook: activities/pigeons.js lets us drive it)
function callPigeon() {
  const p = makePigeon(); scene.add(p.root);
  const a = rand() * Math.PI * 2, P = G.petike.pos;
  const pg = { p, pos: new V3(P.x + Math.cos(a) * 8, 0, P.z + Math.sin(a) * 8), home: new V3(Math.cos(a) * R(3.2, 4.6), 0, Math.sin(a) * R(3.2, 4.6)), heading: 0, state: 'idle', t: 0, vel: new V3(), y: 3, slot: pigeons.length };
  pg.mode = 'come'; pg.hook = birdHook; pigeons.push(pg); ph.bird = pg;
}
const birdSpot = () => [SPOT.kid[0] + D[0] * 0.55 - PERP[0] * 0.25, SPOT.kid[1] + D[1] * 0.55 - PERP[1] * 0.25];
function birdHook(pg, dt) {
  const p = pg.p, flap = (on) => { for (const w of p.wings) w.rotation.z = on ? Math.sin(G.clockT * 30) * 0.9 * (w.position.x > 0 ? 1 : -1) : 0; };
  if (pg.mode === 'come') {
    const [tx, tz] = birdSpot(), dx = tx - pg.pos.x, dz = tz - pg.pos.z, d = Math.hypot(dx, dz);
    const sp = Math.min(6, d * 2 + 0.3); if (d > 0.04) { pg.pos.x += dx / d * sp * dt; pg.pos.z += dz / d * sp * dt; pg.heading = Math.atan2(dx, dz); }
    pg.y = Math.max(0, pg.y - dt * (d > 2 ? 1.2 : 3) * Math.max(1, pg.y)); flap(pg.y > 0.02);
    if (d < 0.05 && pg.y <= 0.001) { pg.mode = 'wait'; pg.y = 0; say({ headWorld: (v) => v.set(pg.pos.x, 0.55, pg.pos.z) }, 'Kurr?', 1.2, ''); }
  } else if (pg.mode === 'wait') {
    flap(false); pg.heading = Math.atan2(G.petike.pos.x - pg.pos.x, G.petike.pos.z - pg.pos.z); p.head.rotation.x = Math.max(0, Math.sin(G.clockT * 6)) * 0.7;
  } else if (pg.mode === 'held') {
    const hb = G.petike.rig.handBones, hp = new V3();
    if (hb) hb[1].getWorldPosition(hp); else hp.set(G.petike.pos.x, 1.7, G.petike.pos.z);
    pg.pos.set(hp.x, 0, hp.z); pg.y = hp.y + 0.02; pg.heading = FACE; flap(Math.sin(G.clockT * 3) > 0.6);
    p.root.position.set(pg.pos.x, pg.y, pg.pos.z); p.root.rotation.y = pg.heading; return true;
  } else {   // leave: a regular pigeon from now on
    pg.hook = null; pg.state = 'fly'; pg.t = 3; const a = rand() * Math.PI * 2; pg.vel.set(Math.cos(a) * 3.5, 3, Math.sin(a) * 3.5); pg.heading = Math.atan2(pg.vel.x, pg.vel.z);
    if (ph.bird === pg) ph.bird = null; return false;
  }
  p.root.position.set(pg.pos.x, pg.y, pg.pos.z); p.root.rotation.y = pg.heading;
  return true;
}
function grabPigeon() {
  ph.holding = true; ph.bird.mode = 'held'; sFlap();
  say(G.petike, pick(['Gyere csak, galamb úr!', 'Ő is a család része!']), 1.6);
  runSeq([[1.0, () => say(G.petya, 'Tedd le! Tele van… mindennel!', 1.8)]]);
}
function releasePigeon() {
  ph.holding = false; const pg = ph.bird; if (!pg) return;
  pg.mode = 'leave'; sFlap();
  for (let i = 0; i < 6; i++) spawnFx(new V3(pg.pos.x, pg.y, pg.pos.z), new V3(R(-1, 1), R(0.5, 1.5), R(-1, 1)), 0xd8dde3, 0.04, 0.8, 3);
}
export const photoBusy = () => ph.phase !== 'off';
