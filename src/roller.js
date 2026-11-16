// Petike a parkban – roller: A roller modellje és a rajta álló Petike pózai.
import { resetPose } from './rigs.js';
import { roller } from './state.js';
import { angDiff, clamp, damp, dampAngle } from './util.js';
import { groundH } from './world.js';

// ---------------------------------------------------------------- roller (scooter)
// rider stances: legacy = original petike_roller.glb (has a 0.12 rad yaw baked in), skinned = rigged T-pose model
const RIDE_LEGACY = { x: 0.06, z: 0.16, ry: -0.12, lean: 0.15, front: -0.14, back: 0.22, sh: -0.9, shz: 0.05 };
const RIDE_SKINNED = { x: 0.0, z: 0.14, ry: 0, lean: 0.15, front: -0.14, back: 0.22, sh: -0.6, shz: 0.05, elbow: 0.3 };
export function rollerRide(dt) {
  const ro = roller;
  if (ro.path) {
    const t = ro.path[0]; const dx = t.x - ro.base.x, dz = t.z - ro.base.z; const d = Math.hypot(dx, dz); const st = ro.speed * dt;
    if (d <= st) { ro.base.x = t.x; ro.base.z = t.z; ro.path.shift(); if (!ro.path.length) ro.path = null; }
    else { ro.base.x += dx / d * st; ro.base.z += dz / d * st; ro.dir.set(dx / d, 0, dz / d); }
    ro.t += dt;
    ro.weaveAmp = damp(ro.weaveAmp, ro.path && ro.path.length > 1 ? 0.28 : 0, 1.5, dt);
  } else ro.weaveAmp = damp(ro.weaveAmp, 0, 3, dt);
  const w = Math.sin(ro.t * 0.9) * ro.weaveAmp;
  const nx = ro.base.x - ro.dir.z * w, nz = ro.base.z + ro.dir.x * w;
  const mdx = nx - ro.pos.x, mdz = nz - ro.pos.z; const mv = Math.hypot(mdx, mdz);
  if (mv > 1e-4) { const th = Math.atan2(mdx, mdz); const turn = angDiff(ro.heading, th); ro.heading = dampAngle(ro.heading, th, 8, dt); ro.lean = damp(ro.lean, clamp(-turn * 6, -0.25, 0.25), 6, dt); }
  ro.pos.set(nx, 0, nz);
  ro.group.position.set(ro.pos.x, groundH(ro.pos.x, ro.pos.z), ro.pos.z);
  ro.group.rotation.set(0, ro.heading, ro.lean, 'YXZ');
  poseRider(ro);
}
export function poseRider(ro) {
  if (ro.rider) {
    // electric scooter: both feet stay on the deck, one in front of the other
    const r = ro.rider.rig; resetPose(r);
    const moving = !!ro.path || Math.abs(ro.speed) > 0.2; const vib = moving ? Math.sin(ro.t * 38) * 0.004 : 0;
    // stance measured against the handlebar grips (±0.2 m, 0.75 m high, 0.46 m ahead of the deck centre)
    const P = r.skinned ? RIDE_SKINNED : RIDE_LEGACY;
    r.inner.rotation.x = P.lean;
    r.hip[1].rotation.x = P.front; r.hip[0].rotation.x = P.back; // front (left) foot / back (right) foot
    r.hip[1].rotation.z = 0.03; r.hip[0].rotation.z = -0.03;
    r.sh[0].rotation.x = P.sh; r.sh[1].rotation.x = P.sh; r.sh[0].rotation.z = -P.shz; r.sh[1].rotation.z = P.shz;
    if (r.elbow) r.elbow[0] = r.elbow[1] = P.elbow || 0;
    r.root.position.set(P.x, 0.15 + vib, P.z); r.root.rotation.y = P.ry;
    if (r.apply) r.apply();
  }
}

