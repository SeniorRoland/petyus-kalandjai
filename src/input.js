// Petyus kalandjai – input: Billentyűzet, egér, érintéses vezérlők.
import { JUG, jugPress } from './activities/juggle.js';
import { ambBed } from './audio.js';
import { resetBallToPlayer } from './ball.js';
import { skipIntro } from './intro.js';
import { G } from './state.js';
import { $, clamp } from './util.js';
import { journalOpen, toggleJournal } from './mischief.js';

// ---------------------------------------------------------------- input
export const keys = {};
export const touch = { active: false, x: 0, y: 0, run: false };
export let kickHeld = false;
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyN') { toggleJournal(); return; }
  if (journalOpen()) { if (e.code === 'Escape') toggleJournal(false); return; }   // the journal is open: keys don't reach the game
  keys[e.code] = true;
  if (G.pstate === 'juggle') { for (const k in JUG) if (JUG[k].codes.includes(e.code)) jugPress(k); }
  if (e.code === 'KeyQ') G.qPressed = true;
  if (e.code === 'Space') { kickHeld = true; G.kickPressed = true; }
  if (e.code === 'Enter' || e.code === 'Escape') skipIntro();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.key === '+') zoomBy(0.85);
  if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-') zoomBy(1 / 0.85);
  if (e.code === 'Digit0' || e.code === 'Numpad0') G.zoom = 1;
  if (e.code === 'KeyR' && G.pstate !== 'juggle') resetBallToPlayer();
  if (e.code === 'KeyE') G.usePressed = true;
  if (e.code === 'KeyH') { const h = $('help'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') { kickHeld = false; G.kickReleased = true; } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// zoom: wheel, + / − (0 = back to normal), two-finger pinch on touch screens. Range ≈ 3× closer … 2.6× further than normal.
export const ZOOM_MIN = 0.3, ZOOM_MAX = 2.6;
export function zoomBy(f) { G.zoom = clamp(G.zoom * f, ZOOM_MIN, ZOOM_MAX); }
window.addEventListener('wheel', (e) => { if (journalOpen()) return; zoomBy(Math.pow(1.0015, clamp(e.deltaY, -240, 240))); }, { passive: true });
function toggleMute() { G.muted = !G.muted; $('muteBtn').textContent = G.muted ? '🔇' : '🔊'; if (ambBed) ambBed.gain.value = G.muted ? 0 : 1; }
$('muteBtn').onclick = toggleMute;
$('skipBtn').onclick = () => skipIntro();
// touch joystick
// two-finger pinch on the game view
{
  let d0 = 0, z0 = 1;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const app = $('app');
  app.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = G.zoom; } }, { passive: true });
  app.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && d0 > 0) { G.zoom = clamp(z0 * d0 / Math.max(10, dist(e.touches)), ZOOM_MIN, ZOOM_MAX); e.preventDefault(); } }, { passive: false });
  app.addEventListener('touchend', (e) => { if (e.touches.length < 2) d0 = 0; });
}
export const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) {
  const joy = $('joy'), knob = $('joyKnob'); let jid = null, jcx = 0, jcy = 0;
  joy.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); jcx = r.left + r.width / 2; jcy = r.top + r.height / 2; touch.active = true; e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { let dx = (t.clientX - jcx) / 55, dy = (t.clientY - jcy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } touch.x = dx; touch.y = -dy; knob.style.left = (45 + dx * 45) + 'px'; knob.style.top = (45 - touch.y * 45) + 'px'; } }, { passive: false });
  window.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; touch.active = false; touch.x = touch.y = 0; knob.style.left = '45px'; knob.style.top = '45px'; } });
  $('kickBtn').addEventListener('touchstart', (e) => { kickHeld = true; G.kickPressed = true; e.preventDefault(); }, { passive: false });
  $('kickBtn').addEventListener('touchend', (e) => { kickHeld = false; G.kickReleased = true; e.preventDefault(); }, { passive: false });
  $('useBtn').addEventListener('touchstart', (e) => { G.usePressed = true; e.preventDefault(); }, { passive: false });
  for (const b of document.querySelectorAll('#jTouch button')) b.addEventListener('touchstart', (e) => { jugPress(b.dataset.k); e.preventDefault(); }, { passive: false });
  $('runBtn').addEventListener('touchstart', (e) => { touch.run = !touch.run; $('runBtn').style.background = touch.run ? 'rgba(255,122,61,.85)' : ''; e.preventDefault(); }, { passive: false });
}

