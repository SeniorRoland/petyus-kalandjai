// Petyus kalandjai – camera: Kamerakövetés.
import { cine } from './cine.js';
import { CAM_OFF, SUN_OFF, camTarget, camera, sun, updateProjection } from './scene.js';
import { G, ball, roller } from './state.js';
import { damp } from './util.js';

// ---------------------------------------------------------------- camera
export function updateCamera(dt) {
  let tx, tz;
  if (cine.on && cine.focus) {
    const f = cine.focus(); tx = f.x; tz = f.z; G.viewSizeTarget = cine.zoom;
  } else if (G.mode === 'intro') {
    const rp = roller.rider ? roller.pos : G.petike.pos;
    tx = (G.petya.pos.x + G.angi.pos.x + rp.x) / 3; tz = (G.petya.pos.z + G.angi.pos.z + rp.z) / 3;
    G.viewSizeTarget = G.zoomOverride || 7.5;
  } else if (G.mode === 'play') {
    const bw = G.pstate === 'riding' ? 0 : 0.25;
    tx = G.petike.pos.x + (ball.active ? (ball.pos.x - G.petike.pos.x) * bw : 0); tz = G.petike.pos.z + (ball.active ? (ball.pos.z - G.petike.pos.z) * bw : 0);
  } else { tx = 0; tz = -4; }
  const ck = cine.on ? 3.5 / Math.max(0.3, cine.slow) : 3;   // the cutscene camera keeps up even in slow motion
  camTarget.x = damp(camTarget.x, tx, ck, dt); camTarget.z = damp(camTarget.z, tz, ck, dt);
  camera.position.copy(camTarget).add(CAM_OFF); camera.lookAt(camTarget);
  if (cine.shake > 0) { const s = cine.shake; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s * 0.6; camera.position.z += (Math.random() - 0.5) * s; }   // not the seeded rand: keeps the world deterministic
  if (Math.abs(G.viewSize - G.viewSizeTarget) > 0.001) { G.viewSize = damp(G.viewSize, G.viewSizeTarget, 4, dt); updateProjection(); }
  // shadow camera follows (snapped to texels to avoid shimmering)
  const step = 64 / 2048; const sx = Math.round(camTarget.x / step) * step, sz = Math.round(camTarget.z / step) * step;
  sun.position.set(sx + SUN_OFF.x, SUN_OFF.y, sz + SUN_OFF.z); sun.target.position.set(sx, 0, sz); sun.target.updateMatrixWorld();
}

