// Petyus kalandjai – main: Belépési pont: fő ciklus (step) és betöltés.
import * as THREE from 'three';
// comic lettering for the speech bubbles (bundled, latin-ext → ő/ű work offline too)
import '@fontsource/patrick-hand/index.css';
import '@fontsource/bangers/index.css';
// load them up front (incl. the latin-ext part with ő/ű) so the first bubble doesn't swap fonts while it is shown
if (document.fonts) for (const f of ['19px "Patrick Hand"', '20px Bangers']) document.fonts.load(f, 'aáőű').catch(() => {});
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cev } from './activities/cat.js';
import { ftn } from './activities/fountain.js';
import { jug, jugPress } from './activities/juggle.js';
import { Actor, updateFx } from './actors.js';
import { updateAmbience } from './ambience.js';
import { initAudio } from './audio.js';
import { makeBall, updateBall } from './ball.js';
import { updateCamera } from './camera.js';
import { cine, tickCine } from './cine.js';
import { updateDad } from './dad.js';
import { keys } from './input.js';
import { mountRider, runIntro, skipIntro, tickCutscene } from './intro.js';
import { buildPeople, updateAnimals, updateFountain, updateNPCs } from './npcs.js';
import { updatePlayer } from './player.js';
import { CFG, rigFromGLTF } from './rigs.js';
import { rollerRide } from './roller.js';
import { camTarget, camera, renderer, scene, updateProjection } from './scene.js';
import { EPISODE, G, ROLLER_SCALE, SERIES, ball, rigs, roller } from './state.js';
import { buildEpisodeMenu, setStartLabel, showVersion } from './menu.js';
import { say, toast, updateBubbles } from './ui.js';
import { $, V3 } from './util.js';
import { TREES, buildWorld, collide } from './world.js';

// every module once, in the original order (some only register listeners / build DOM state)
import './util.js';
import './scene.js';
import './world.js';
import './rigs.js';
import './actors.js';
import './audio.js';
import './ui.js';
import './input.js';
import './state.js';
import './ball.js';
import './player.js';
import './roller.js';
import './npcs.js';
import './intro.js';
import './activities/drinking.js';
import './activities/fountain.js';
import './activities/cat.js';
import './activities/juggle.js';
import './activities/scooter.js';
import './dad.js';
import './cine.js';
import './camera.js';
import './ambience.js';
import { initMischief } from './mischief.js';
import { MOBILE, watchFrame } from './quality.js';
import { updateTouchUI } from './touchui.js';
import { IS_TOUCH } from './util.js';

// ---------------------------------------------------------------- main loop
let last = performance.now();
const TIME_SCALE = Math.max(1, Math.min(8, +(new URLSearchParams(location.search).get('speed') || 1)));
function frame(now) {
  const raw = (now - last) / 1000, dt0 = Math.min(0.05, raw); last = now;
  // phones: held upright during the game → a „turn your phone” notice and the game waits
  const upright = MOBILE && window.innerHeight > window.innerWidth && (G.mode === 'intro' || G.mode === 'play');
  document.body.classList.toggle('upright', upright);
  watchFrame(Math.min(raw, 0.25), !upright && !document.hidden && (G.mode === 'intro' || G.mode === 'play'), () => toast('Egyszerűbb grafika – hogy gördülékenyebb legyen a játék.', 3));
  if (!G.paused && !upright) {   // paused while the mischief journal is open (still rendered)
    tickCine(dt0);
    for (let i = 0; i < TIME_SCALE; i++) step(dt0 * cine.slow);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function step(dt) {
  G.clockT += dt;
  tickCutscene(dt);
  if (G.mode === 'intro' || G.mode === 'play') {
    G.petya.update(dt); G.angi.update(dt);
    if (G.mode === 'play') { updatePlayer(dt); if (IS_TOUCH) updateTouchUI(); } else G.petike.update(dt);
    if ((roller.rider || roller.path) && G.pstate !== 'riding') rollerRide(dt);
    if (G.mode === 'play') { updateDad(dt); if (['follow', 'return', 'ftnRun', 'ftnChase', 'catRun', 'catCarry', 'hideSeek', 'balloon'].includes(G.petyaMode)) { collide(G.petya.pos, 0.3, 0, null, true); G.petya.sync(); } }
    updateBall(dt);
    G.usePressed = false; G.qPressed = false;
  }
  updateNPCs(dt); updateAnimals(dt); updateFountain(dt); updateFx(dt);
  updateCamera(dt); updateBubbles(dt);
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').classList.remove('show'); }
  if (G.bigT > 0) { G.bigT -= dt; if (G.bigT <= 0) $('big').classList.remove('show'); }
  updateAmbience(dt);
}

// ---------------------------------------------------------------- boot
async function boot() {
  if (MOBILE) document.body.classList.add('mobile');   // quality.js: phone / tablet
  buildEpisodeMenu(); showVersion();   // the 12 monthly episodes on the start screen (August playable once loaded) + the version
  initMischief();       // stars, ⭐ totals, the mischief journal
  buildWorld();
  makeBall();
  const loader = new GLTFLoader();
  const files = ['petya.glb', 'angi.glb', 'petike_roller.glb', 'petike_foci.glb', 'roller_kicsi.glb'];
  let done = 0; const bar = $('loadbar').firstElementChild;
  let res;
  try {
    res = await Promise.all(files.map((f) => loader.loadAsync(import.meta.env.BASE_URL + f).then((g) => { done++; bar.style.width = (done / files.length * 100) + '%'; return g; })));
  } catch (e) {
    $('err').innerHTML = 'Nem sikerült betölteni a modelleket (' + (e.message || e) + ').<br>Ellenőrizd, hogy a <code>public/</code> mappában valódi .glb fájlok vannak.';
    setStartLabel('Hiba'); console.error(e); return;
  }
  const [gPetya, gAngi, gRoller, gFoci, gScooter] = res;
  rigs.petya = rigFromGLTF(gPetya, CFG.petya);
  rigs.angi = rigFromGLTF(gAngi, CFG.angi);
  rigs.roller = rigFromGLTF(gRoller, CFG.roller);
  rigs.foci = rigFromGLTF(gFoci, CFG.foci);
  // scooter
  G.rollerModel = gScooter.scene; G.rollerModel.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const sc = new THREE.Group(); sc.add(G.rollerModel); G.rollerModel.scale.setScalar(ROLLER_SCALE); G.rollerModel.rotation.y = Math.PI / 2; G.rollerModel.position.x = 0.07 * ROLLER_SCALE;
  roller.group.add(sc); scene.add(roller.group);

  G.petya = new Actor(rigs.petya, 'Petya'); G.petya.stride = 4.2;
  G.angi = new Actor(rigs.angi, 'Angi'); G.angi.stride = 4.5;
  G.petike = new Actor(rigs.roller, 'Petyus'); G.petike.stride = 6.5;
  buildPeople();
  // initial (pre-start) view
  G.petya.place(-4, -5.6, Math.PI / 2); G.angi.place(-4, -6.4, Math.PI / 2);
  roller.base = new V3(-8.6, 0, -6); roller.pos.copy(roller.base); roller.dir = new V3(1, 0, 0); roller.heading = Math.PI / 2; mountRider(); rollerRide(0.016);
  G.mode = 'title'; camTarget.set(-6, 0, -6);
  // tab title from the episode data; the August tile becomes clickable
  document.title = `${SERIES} – ${EPISODE.n}. rész: ${EPISODE.month}`;
  $('loadbar').classList.add('done');
  const btn = $('startBtn'); btn.disabled = false; setStartLabel('Indítás ▶'); btn.focus({ preventScroll: true });
  btn.onclick = () => { initAudio(); if (MOBILE) goFullscreen(); $('overlay').classList.add('hide'); runIntro(); };
  requestAnimationFrame(frame);
  window.__game = { THREE, scene, camera, renderer, petike: () => G.petike, petya: () => G.petya, angi: () => G.angi, ball, roller, keys, skipIntro, get mode() { return G.mode; }, get pstate() { return G.pstate; }, get petyaMode() { return G.petyaMode; }, use: () => { G.usePressed = true; }, roller, setZoom: (z) => { G.zoomOverride = z; G.viewSizeTarget = z; G.viewSize = z; updateProjection(); }, camTarget, setKick: (p) => { G.kickPressed = true; setTimeout(() => { G.kickReleased = true; }, p); },
    // manual stepping (works even when the tab is hidden and rAF is paused): __game.tick(seconds)
    tick: (sec, dt = 1 / 60) => { for (let i = 0; i < Math.round(sec / dt); i++) { tickCine(dt); step(dt * cine.slow); } renderer.render(scene, camera); }, cine, ftn, cev, TREES, jug, jugPress, juggle: () => { G.qPressed = true; }, say };
}
boot();

// phones: full screen + landscape lock when the game starts (where the browser allows it – Android Chrome; iOS: add to home screen)
function goFullscreen() {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) { /* not supported */ } };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { /* not allowed */ }
}
// installable web app: works offline after the first visit (only in the built version – the dev server would cache stale files)
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

