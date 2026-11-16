// Petike a parkban – input: Billentyűzet, egér, érintéses vezérlők.
import { JUG, jugPress } from './activities/juggle.js';
import { ambBed } from './audio.js';
import { resetBallToPlayer } from './ball.js';
import { skipIntro } from './intro.js';
import { G } from './state.js';
import { $, clamp } from './util.js';

// ---------------------------------------------------------------- input
export const keys = {};
export const touch = { active: false, x: 0, y: 0, run: false };
export let kickHeld = false;
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys[e.code] = true;
  if (G.pstate === 'juggle') { for (const k in JUG) if (JUG[k].codes.includes(e.code)) jugPress(k); }
  if (e.code === 'KeyQ') G.qPressed = true;
  if (e.code === 'Space') { kickHeld = true; G.kickPressed = true; }
  if (e.code === 'Enter' || e.code === 'Escape') skipIntro();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR' && G.pstate !== 'juggle') resetBallToPlayer();
  if (e.code === 'KeyE') G.usePressed = true;
  if (e.code === 'KeyH') { const h = $('help'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') { kickHeld = false; G.kickReleased = true; } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
window.addEventListener('wheel', (e) => { G.viewSizeTarget = clamp(G.viewSizeTarget * (e.deltaY > 0 ? 1.1 : 0.9), 5, 24); }, { passive: true });
function toggleMute() { G.muted = !G.muted; $('muteBtn').textContent = G.muted ? '🔇' : '🔊'; if (ambBed) ambBed.gain.value = G.muted ? 0 : 1; }
$('muteBtn').onclick = toggleMute;
$('skipBtn').onclick = () => skipIntro();
// touch joystick
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

