// Petyus kalandjai – player: Petyus irányítása: mozgás, rúgás, cselezés.
import { CAT_STATES, idleFootball, updateCatPetike } from './activities/cat.js';
import { interactions, updateDrinking } from './activities/drinking.js';
import { updateFountainDrink } from './activities/fountain.js';
import { updateJuggle } from './activities/juggle.js';
import { updateRiding } from './activities/scooter.js';
import { spawnFx } from './actors.js';
import { sKick, tone } from './audio.js';
import { FTN_STATES } from './dad.js';
import { keys, touch } from './input.js';
import { G, ball } from './state.js';
import { $, R, V3, clamp, damp, dampAngle, lerp, smooth } from './util.js';
import { GX0, GX1, GZ0, GZ1, PITCH, collide } from './world.js';
import { updateCoach } from './activities/coach.js';
import { updateTower } from './activities/nap.js';
import { pig, scatterCrumbs, tickCrumbs } from './activities/pigeons.js';
import { squirtTick, updateSquirt } from './activities/squirt.js';
import { updateSled } from './activities/sled.js';
import { photoTick, updatePhoto } from './activities/photo.js';
import { fishTick, updateFish } from './activities/fish.js';
import { raceTick, updateRace } from './activities/race.js';

// ---------------------------------------------------------------- player control
export const CAM_FWD = new V3(-1, 0, -1).normalize(), CAM_RIGHT = new V3(1, 0, -1).normalize();
export const pvel = new V3();
let charge = 0;
export function updatePlayer(dt) {
  photoTick(dt); fishTick(dt); raceTick(dt);   // background bits of the 6./7./8. mischief (invitation, people walking off, the parked moped)
  if (G.pstate === 'race') return updateRace(dt);
  if (G.pstate === 'riding') return updateRiding(dt);
  if (G.pstate === 'toDrink' || G.pstate === 'drinking') return updateDrinking(dt);
  if (FTN_STATES.includes(G.pstate)) return updateFountainDrink(dt);
  if (CAT_STATES.includes(G.pstate)) return updateCatPetike(dt);
  if (G.pstate === 'juggle') return updateJuggle(dt);
  if (G.pstate === 'coach') return updateCoach(dt);
  if (G.pstate === 'tower') return updateTower(dt);
  squirtTick(dt);
  if (G.pstate === 'squirt') return updateSquirt(dt);
  if (G.pstate === 'sled') return updateSled(dt);
  if (G.pstate === 'photo') return updatePhoto(dt);
  if (G.pstate === 'fish') return updateFish(dt);
  tickCrumbs(dt);
  if (G.pstate !== 'autoBall' && interactions()) return;
  const a = G.petike;
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const il0 = Math.hypot(wx, wz); if (il0 > 1) { wx /= il0; wz /= il0; }
  // idle on the pitch → Petyus starts playing on his own (any input takes control back)
  const anyInput = il0 > 0.1 || G.kickPressed || G.charging;
  const auto = idleFootball(dt, anyInput);
  if (auto) { wx = auto.wx; wz = auto.wz; }
  const il = Math.hypot(wx, wz);
  const sprint = keys.ShiftLeft || keys.ShiftRight || touch.run;
  const maxSp = (sprint ? 5.4 : 3.3) * (G.charging ? 0.6 : 1);
  pvel.x = damp(pvel.x, wx * maxSp, 10, dt); pvel.z = damp(pvel.z, wz * maxSp, 10, dt);
  a.pos.x += pvel.x * dt; a.pos.z += pvel.z * dt;
  collide(a.pos, 0.26, 0, null);
  a.pos.x = clamp(a.pos.x, GX0 + 1, GX1 - 1); a.pos.z = clamp(a.pos.z, GZ0 + 1, GZ1 - 1);
  const spd = Math.hypot(pvel.x, pvel.z);
  if (il > 0.1) a.targetHeading = Math.atan2(wx, wz);
  a.heading = dampAngle(a.heading, a.targetHeading, 14, dt);
  a.animate(dt, spd > 0.25, spd);

  // kick input (with the bag of crumbs SPACE scatters crumbs instead)
  if (pig.active && !pig.done) { if (G.kickPressed) scatterCrumbs(); G.kickPressed = G.kickReleased = false; G.charging = false; }
  if (G.kickPressed) { G.charging = true; charge = 0; }
  if (G.charging) { charge = Math.min(1, charge + dt / 0.9); }
  if (G.kickReleased && G.charging) { G.charging = false; G.kickPower = charge; a.kickT = 0; G.kickDone = false; }
  G.kickPressed = G.kickReleased = false;
  $('charge').style.display = G.charging ? 'block' : 'none'; $('charge').firstElementChild.style.width = (charge * 100) + '%';

  const fx_ = Math.sin(a.heading), fz_ = Math.cos(a.heading);
  if (a.kickT >= 0) {
    a.kickT += dt; const t = a.kickT / 0.42; const r = a.rig;
    let hp, kn;
    if (t < 0.4) { const k = smooth(t / 0.4); hp = lerp(0, 0.8, k); kn = lerp(0, 1.3, k); }
    else if (t < 0.6) { const k = (t - 0.4) / 0.2; hp = lerp(0.8, -1.3, k); kn = lerp(1.3, 0.05, k); }
    else { const k = smooth(Math.min(1, (t - 0.6) / 0.4)); hp = lerp(-1.3, 0, k); kn = lerp(0.05, 0, k); }
    r.hip[0].rotation.x = hp; r.knee[0].rotation.x = kn; r.hip[1].rotation.x = 0.1; r.knee[1].rotation.x = 0.15;
    r.sh[1].rotation.x = hp * 0.6; r.sh[0].rotation.x = -hp * 0.4; r.sh[0].rotation.z = -0.3; r.sh[1].rotation.z = 0.3;
    if (!G.kickDone && t >= 0.5) { G.kickDone = true; tryKick(fx_, fz_); }
    if (t >= 1) a.kickT = -1;
  }

  // dribble / body contact with the ball
  if (ball.active && ball.pos.y < 0.55 + ball.r && G.goalLock <= 0) {
    const fpX = a.pos.x + fx_ * 0.3, fpZ = a.pos.z + fz_ * 0.3;
    const dx = ball.pos.x - fpX, dz = ball.pos.z - fpZ; const d = Math.hypot(dx, dz);
    if (a.kickT < 0 && d < 0.2 + ball.r && spd > 0.4) {
      const bs = Math.hypot(ball.vel.x, ball.vel.z);
      const want = spd * 1.3 + 0.5;
      if (bs < want) { ball.vel.x = pvel.x / spd * want + dx * 2; ball.vel.z = pvel.z / spd * want + dz * 2; }
    }
    const bx = ball.pos.x - a.pos.x, bz = ball.pos.z - a.pos.z; const bd = Math.hypot(bx, bz); const m = 0.24 + ball.r;
    if (bd < m && bd > 1e-4) {
      const nx = bx / bd, nz = bz / bd; ball.pos.x = a.pos.x + nx * m; ball.pos.z = a.pos.z + nz * m;
      const vn = ball.vel.x * nx + ball.vel.z * nz; const pv = pvel.x * nx + pvel.z * nz;
      if (vn < pv) { ball.vel.x += (pv - vn + 0.3) * nx; ball.vel.z += (pv - vn + 0.3) * nz; }
    }
  }
  a.sync();
}
function tryKick(fx_, fz_) {
  const a = G.petike; const p = G.kickPower;
  if (!ball.active || G.goalLock > 0) { tone('sine', 300, 200, 0.06, 0.05); return; }
  const dx = ball.pos.x - a.pos.x, dz = ball.pos.z - a.pos.z; const d = Math.hypot(dx, dz);
  const facing = d > 1e-3 ? (dx * fx_ + dz * fz_) / d : 1;
  if (d < 1.05 && ball.pos.y < 1.0 && (facing > 0.15 || d < 0.45)) {
    const pow = 4.5 + 13 * p;
    ball.vel.x = fx_ * pow + pvel.x * 0.3; ball.vel.z = fz_ * pow + pvel.z * 0.3;
    ball.vel.y = p > 0.5 ? 2 + (p - 0.5) * 12 : 0.6 + p;
    ball.pos.y = Math.max(ball.pos.y, ball.r + 0.02);
    sKick(p);
    const gx = fx_ > 0 ? PITCH.x1 : PITCH.x0, gdx = gx - ball.pos.x, gdz = -ball.pos.z, gl = Math.hypot(gdx, gdz) || 1;
    G.lastKick = { t: G.clockT, power: p, toward: (fx_ * gdx + fz_ * gdz) / gl > 0.9 };
    for (let i = 0; i < 6; i++) spawnFx(new V3(ball.pos.x, 0.1, ball.pos.z), new V3(R(-1, 1), R(0.5, 1.5), R(-1, 1)), 0x6bb94e, 0.06, 0.4, 5);
  } else { tone('sine', 300, 200, 0.06, 0.05); G.lastKick = { t: G.clockT, power: -1 }; }
}

