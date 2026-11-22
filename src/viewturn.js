// Petyus kalandjai – viewturn: a nézet forgatása 90°-onként (⟲ ⟳ jobb felül, vagy , és . – a 2. részben Q / R is).
// CAM_OFF (scene.js) and the screen-relative walking directions CAM_FWD / CAM_RIGHT (player.js) turn together; the camera,
// cine.js, the fading props (occlude.js), dragging the view (input.js) and part 2's walls read them every frame.
import { CAM_OFF } from './scene.js';
import { CAM_FWD, CAM_RIGHT } from './player.js';
import { G } from './state.js';
import { $, damp } from './util.js';

const CAM_R = Math.hypot(CAM_OFF.x, CAM_OFF.z), CAM_Y = CAM_OFF.y;
export const viewTurn = { yaw: Math.atan2(CAM_OFF.x, CAM_OFF.z), want: Math.atan2(CAM_OFF.x, CAM_OFF.z) };
function applyYaw(y) {
  const sy = Math.sin(y), cy = Math.cos(y);
  CAM_OFF.set(sy * CAM_R, CAM_Y, cy * CAM_R); CAM_FWD.set(-sy, 0, -cy); CAM_RIGHT.set(cy, 0, -sy);
}
// dir +1: the view turns left (⟲), −1: right (⟳); not in part 2's first-person view
export function turnView(dir) { if (G.mode !== 'play' || G.fps) return; viewTurn.want += dir * Math.PI / 2; }
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Comma') turnView(1);
  if (e.code === 'Period') turnView(-1);
});
// the two buttons (top right, before 🏠); shown while playing
export function setupTurnButtons() {
  const before = $('menuBtn');
  for (const [id, t, ttl, d] of [['turnL', '⟲', 'Nézet forgatása balra ( , )', 1], ['turnR', '⟳', 'Nézet forgatása jobbra ( . )', -1]]) {
    const b = document.createElement('button'); b.className = 'btn'; b.id = id; b.textContent = t; b.title = ttl; b.style.display = 'none';
    b.onclick = (e) => { turnView(d); e.currentTarget.blur(); };
    before.parentNode.insertBefore(b, before);
  }
}
let shown = null;
// every step: ease the camera to the wanted side; show the buttons only while playing
export function updateViewTurn(dt) {
  if (Math.abs(viewTurn.yaw - viewTurn.want) > 1e-4) { viewTurn.yaw = damp(viewTurn.yaw, viewTurn.want, 7, dt); applyYaw(viewTurn.yaw); }
  const on = G.mode === 'play';
  if (on !== shown) { shown = on; for (const id of ['turnL', 'turnR']) { const b = $(id); if (b) b.style.display = on ? 'inline-block' : 'none'; } }
}
