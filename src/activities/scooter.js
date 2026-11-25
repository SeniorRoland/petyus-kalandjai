// Petyus kalandjai – activities/scooter: Rollerezés.
import { poof } from '../actors.js';
import { sThunk } from '../audio.js';
import { dadAlarm, dadReturn, dadStartFollow } from '../dad.js';
import { keys, kickHeld, touch } from '../input.js';
import { dismount, mountRider } from '../intro.js';
import { CAM_FWD, CAM_RIGHT, pvel } from '../player.js';
import { poseRider } from '../roller.js';
import { G, ball, rigs, roller } from '../state.js';
import { say } from '../ui.js';
import { $, angDiff, clamp, damp, pick } from '../util.js';
import { GX0, GX1, GZ0, GZ1, addCircleCol, collide, colliders, groundH } from '../world.js';
import { setPrompt } from './drinking.js';
import { sledDog, startSled } from './sled.js';
import { raceOldie, startRace } from './race.js';

// ---------- scooter
export function mountScooter() {
  G.pstate = 'riding'; setPrompt(''); G.charging = false; G.petike.kickT = -1; pvel.set(0, 0, 0); $('charge').style.display = 'none';
  if (G.rollerCol) { const i = colliders.indexOf(G.rollerCol); if (i >= 0) colliders.splice(i, 1); G.rollerCol = null; }
  poof(G.petike.pos);
  G.petike.setRig(rigs.roller); G.petike.stride = 6.5; G.petike.swing = 0.6;
  roller.lean = 0; roller.speed = 0; roller.turn = 0; roller.path = null; roller.t = 0;
  mountRider(); G.petike.pos.copy(roller.pos);
  say(G.petike, pick(['Juhú, rollerezés!', 'Apa, nézd, milyen gyors vagyok!', 'Indulás!']), 2.2);
  dadStartFollow(); G.viewSizeTarget = 10;
}
function dismountScooter() {
  const h = roller.heading; roller.speed = 0; roller.turn = 0;
  dismount(roller.pos.x - Math.cos(h) * 0.6, roller.pos.z + Math.sin(h) * 0.6);
  poof(G.petike.pos); G.petike.setRig(rigs.foci); G.petike.stride = 6.5; G.petike.swing = 0.7;
  roller.lean = 0.1; // resting on its kickstand
  roller.group.position.set(roller.pos.x, groundH(roller.pos.x, roller.pos.z), roller.pos.z); roller.group.rotation.set(0, roller.heading, roller.lean, 'YXZ');
  addCircleCol(roller.pos.x, roller.pos.z, 0.3, 1.0); G.rollerCol = colliders[colliders.length - 1]; G.rollerCol.soft = true;
  G.pstate = 'free'; G.viewSizeTarget = 8.5; setPrompt('');
  say(G.petike, pick(['Ennyi volt, megyek focizni!', 'Jó volt! Most foci!']), 2);
  dadReturn();
}
export function updateRiding(dt) {
  const ro = roller, a = G.petike;
  const dog = sledDog();   // 5. csibészség: „Kutyaszán” – a dog walker right here
  const oldie = dog ? null : raceOldie();   // 8. csibészség: „Rollerverseny a nyugdíjassal” – the old man on his bench
  if (G.usePressed) { G.usePressed = false; if (dog) return startSled(dog); if (oldie) return startRace(oldie); dismountScooter(); return; }
  G.touchUse = dog ? 'KUTYASZÁN' : oldie ? 'VERSENY' : 'LESZÁLL';
  setPrompt(dog ? 'E – Megsétáltatom a kutyát!' : oldie ? 'E – Verseny a bácsival!' : 'E – leszállni a rollerről');
  rideStep(dt);
}
// the scooter's movement (also used by the race: boost = slipstream)
export function rideStep(dt, boost = 1) {
  const ro = roller, a = G.petike;
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const il = Math.min(1, Math.hypot(wx, wz));
  const maxSp = ((keys.ShiftLeft || keys.ShiftRight || touch.run) ? 5.6 : 3.8) * boost;
  ro.turn = 0;
  if (il > 0.1) {
    const diff = angDiff(ro.heading, Math.atan2(wx, wz));
    if (Math.abs(diff) > 2.3 && ro.speed > 0.6) ro.speed = Math.max(0, ro.speed - 6 * dt);       // pulling back = brake
    else {
      const turn = clamp(diff, -2.4 * dt, 2.4 * dt); ro.heading += turn; ro.turn = turn / dt;
      const target = maxSp * il * (1 - Math.min(0.6, Math.abs(diff) / 3));
      ro.speed = ro.speed < target ? Math.min(target, ro.speed + 2.6 * dt) : Math.max(target, ro.speed - 3 * dt);
    }
  } else ro.speed = Math.max(0, ro.speed - 1.5 * dt);
  if (keys.Space || kickHeld) ro.speed = Math.max(0, ro.speed - 7 * dt);
  G.kickPressed = G.kickReleased = false;
  const fx = Math.sin(ro.heading), fz = Math.cos(ro.heading);
  ro.pos.x += fx * ro.speed * dt; ro.pos.z += fz * ro.speed * dt;
  let hit = false; collide(ro.pos, 0.35, 0, () => { hit = true; });
  if (hit) { if (ro.speed > 1.6) { sThunk(ro.speed * 2); dadAlarm(); } ro.speed *= 0.35; }
  ro.pos.x = clamp(ro.pos.x, GX0 + 1, GX1 - 1); ro.pos.z = clamp(ro.pos.z, GZ0 + 1, GZ1 - 1);
  ro.lean = damp(ro.lean, clamp(-ro.turn * ro.speed * 0.07, -0.3, 0.3), 6, dt);
  ro.t += dt;
  ro.group.position.set(ro.pos.x, groundH(ro.pos.x, ro.pos.z), ro.pos.z); ro.group.rotation.set(0, ro.heading, ro.lean, 'YXZ');
  poseRider(ro);
  a.pos.copy(ro.pos); a.heading = ro.heading;
  // the scooter nudges the ball
  if (ball.active && G.goalLock <= 0 && ball.pos.y < 0.5) {
    const dx = ball.pos.x - ro.pos.x, dz = ball.pos.z - ro.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.45 && d > 1e-4) { const nx = dx / d, nz = dz / d; ball.pos.x = ro.pos.x + nx * 0.45; ball.pos.z = ro.pos.z + nz * 0.45; const v = ro.speed * 1.2 + 0.4; ball.vel.x = nx * v + fx * ro.speed * 0.4; ball.vel.z = nz * v + fz * ro.speed * 0.4; }
  }
}

