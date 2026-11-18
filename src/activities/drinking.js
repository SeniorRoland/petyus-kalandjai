// Petyus kalandjai – activities/drinking: Interakciók (E) és az ivókút.
import { spawnFx } from '../actors.js';
import { tone } from '../audio.js';
import { isTouch } from '../input.js';
import { pvel } from '../player.js';
import { G, roller } from '../state.js';
import { say } from '../ui.js';
import { $, R, V3, dampAngle, pick, rand } from '../util.js';
import { FOUNTAIN } from '../world.js';
import { startFountain } from './fountain.js';
import { canChallengeDad, startDadChallenge } from './coach.js';
import { canJuggle, startJuggle } from './juggle.js';
import { mountScooter } from './scooter.js';
import { canTower, startTower } from './nap.js';
import { askCrumbs, canAskCrumbs, canDump, dumpOnDad, pig } from './pigeons.js';
import { startSquirt } from './squirt.js';
import { canFish, startFish } from './fish.js';
import { canHide, startHide } from './hide.js';
import { canBalloon, startBalloon } from './balloon.js';

// ---------------------------------------------------------------- play activities: drinking fountain, scooter, worried dad
const DRINK = { x: 28.3, z: -12.9, stand: [28.3, -12.36] };
            // free | toDrink | drinking | riding | toFountain | ftnDrink | caught | chased | atMom

export function setPrompt(txt) {
  const el = $('prompt'); if (el.textContent !== txt) el.textContent = txt;
  el.style.display = txt ? 'block' : 'none';
  if (isTouch) $('useBtn').style.display = txt ? 'block' : 'none';
}
// returns true when the player started an activity this frame
export function interactions() {
  const p = G.petike.pos;
  const dDrink = Math.hypot(p.x - DRINK.x, p.z - DRINK.z), dRoll = Math.hypot(p.x - roller.pos.x, p.z - roller.pos.z);
  const dFtn = Math.hypot(p.x - FOUNTAIN.x, p.z - FOUNTAIN.z);
  const canDrink = dDrink < 1.6, canRide = dRoll < 1.5 && !roller.rider, canFtn = dFtn < FOUNTAIN.r + 1.0;
  const canJug = canJuggle(), canCoach = canChallengeDad(), canDmp = canDump(), canTwr = canTower(), canCrumb = canAskCrumbs(), canHd = canHide(), canBl = canBalloon();
  // the bench mischiefs win over the scooter leaning right next to dad
  setPrompt(canDrink ? (pig.active ? 'E – inni az ivókútból' : isTouch ? 'HASZNÁL – inni · RÚGÁS – vízipisztoly!' : 'E – inni · Szóköz – vízipisztoly!') : canDmp ? 'E – Morzsa apára!' : canTwr ? 'E – Torony apa fejére (csitt!)' : canHd ? 'E – Apa, bújócskázzunk!' : canBl ? 'E – Kérek egy lufit!' : canRide ? 'E – felszállni a rollerre' : canFtn ? (pig.active ? 'E – inni a szökőkútból' : isTouch ? 'HASZNÁL – inni a szökőkútból · RÚGÁS – pénzhalászat' : 'E – inni a szökőkútból · Szóköz – pénzhalászat')
    : canCoach ? 'E – Mutasd te, apa!' : canCrumb ? 'E – Anya, van egy kis morzsád?' : pig.active && !pig.done ? (isTouch ? 'RÚGÁS – morzsát szórni' : 'Szóköz – morzsát szórni') : canJug ? (isTouch ? 'Dekázás' : 'Q – dekázás') : '');
  if (G.qPressed) { G.qPressed = false; if (canJug) { startJuggle(); return true; } }
  if (canDrink && G.kickPressed && !pig.active) { G.kickPressed = false; startSquirt(); return true; }   // 4. csibészség: „Vízipisztoly az ivókútból”
  const atRim = canFtn && !canDrink && !canDmp && !canTwr && !canHd && !canBl && !canRide;
  if (atRim && G.kickPressed && !pig.active && canFish()) { G.kickPressed = false; startFish(); return true; }   // 7. csibészség: „Pénzhalászat a szökőkútból”
  if (!G.usePressed) return false;
  G.usePressed = false;
  if (canDrink) { startDrink(); return true; }
  if (canDmp) { dumpOnDad(); return true; }            // 3. csibészség: „Galambraj-vezénylés”
  if (canTwr) { startTower(); return true; }           // 2. csibészség: „A szundikáló apa”
  if (canHd) { startHide(); return true; }              // 9. csibészség: „Bújócska apával”
  if (canBl) { startBalloon(); return true; }          // 10. csibészség: „Lufis bácsi”
  if (canRide) { mountScooter(); return true; }
  if (canFtn) { startFountain(); return true; }
  if (canCoach) { startDadChallenge(); return true; }   // 1. csibészség: „Fordított edzés”
  if (canCrumb) { askCrumbs(); return true; }
  if (canJug && isTouch) { startJuggle(); return true; }   // touch: the use button starts juggling
  return false;
}

// ---------- drinking
function startDrink() { G.pstate = 'toDrink'; pvel.set(0, 0, 0); G.charging = false; G.petike.kickT = -1; setPrompt(''); $('charge').style.display = 'none'; }
export function updateDrinking(dt) {
  const a = G.petike;
  if (G.pstate === 'toDrink') {
    const dx = DRINK.stand[0] - a.pos.x, dz = DRINK.stand[1] - a.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.04) { const st = Math.min(d, 2.4 * dt); a.pos.x += dx / d * st; a.pos.z += dz / d * st; a.targetHeading = Math.atan2(dx, dz); a.heading = dampAngle(a.heading, a.targetHeading, 12, dt); a.animate(dt, true, 2.4); }
    else { G.pstate = 'drinking'; G.drinkT = 0; G.gulpT = 0.5; }
    a.sync(); return;
  }
  G.drinkT += dt; a.heading = dampAngle(a.heading, Math.PI, 10, dt); a.animate(dt, false, 0);
  const r = a.rig, k = Math.max(0, Math.min(1, G.drinkT * 3, (3.0 - G.drinkT) * 3));
  r.inner.rotation.x = 0.5 * k; r.sh[0].rotation.x = -0.85 * k; r.sh[1].rotation.x = -0.85 * k; r.sh[0].rotation.z = -0.3 * k; r.sh[1].rotation.z = 0.3 * k;
  if (G.drinkT > 0.35 && G.drinkT < 2.6) {
    if (rand() < 0.7) spawnFx(new V3(DRINK.x + R(-0.02, 0.02), 1.13, DRINK.z - 0.03), new V3(R(-0.05, 0.05), R(0.9, 1.2), R(0.7, 0.95)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2]), 0.04, 0.35, 6);
    G.gulpT -= dt; if (G.gulpT <= 0) { G.gulpT = 0.42; tone('sine', 260, 140, 0.09, 0.12); }
  }
  if (G.drinkT >= 3.0) {
    G.pstate = 'free'; r.inner.rotation.x = 0;
    say(G.petike, pick(['Ááá, ez jólesett!', 'Glugy-glugy… mehet tovább!', 'Hű, de hideg a víz!']), 2.2);
    if (G.petyaMode === 'bench' && rand() < 0.8) setTimeout(() => { say(G.petya, pick(['Ne igyál annyit, megfájdul a hasad!', 'Csak kortyolgasd, ne vedeld!', 'Ivás után ne rohanj rögtön!', 'Megint iszol? Most ittál!']), 2.6); G.petya.point = 1.2; }, 900);
  }
  a.sync();
}

