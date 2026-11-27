// Petyus kalandjai – input: Billentyűzet, egér, érintéses vezérlők.
import { JUG, jugPress } from './activities/juggle.js';
import { ambBed } from './audio.js';
import { resetBallToPlayer } from './ball.js';
import { skipIntro } from './intro.js';
import { G } from './state.js';
import { $, clamp } from './util.js';
import { journalOpen, toggleJournal } from './mischief.js';
import { guideOpen, toggleGuide } from './guide.js';
import { CAM_FWD, CAM_RIGHT } from './player.js';

// ---------------------------------------------------------------- input
export const keys = {};
export const touch = { active: false, x: 0, y: 0, run: false };
export let kickHeld = false;
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyN') { toggleJournal(); return; }
  if (journalOpen()) { if (e.code === 'Escape') toggleJournal(false); return; }   // the journal is open: keys don't reach the game
  if (e.code === 'KeyL') { toggleGuide(); return; }   // the level's description (guide.js)
  if (guideOpen()) { if (e.code === 'Escape') toggleGuide(false); return; }
  keys[e.code] = true;
  if (G.pstate === 'juggle') { for (const k in JUG) if (JUG[k].codes.includes(e.code)) jugPress(k); }
  if (e.code === 'KeyQ') G.qPressed = true;
  if (e.code === 'Space') { kickHeld = true; G.kickPressed = true; }
  if (e.code === 'Enter' || e.code === 'Escape') skipIntro();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.key === '+') zoomBy(0.85);
  if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-') zoomBy(1 / 0.85);
  if (e.code === 'Digit0' || e.code === 'Numpad0') G.zoom = 1;
  if (e.code === 'KeyR' && G.pstate !== 'juggle' && G.episode !== 2) resetBallToPlayer();
  if (e.code === 'KeyE') G.usePressed = true;
  if (e.code === 'KeyH') { const h = $('help'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') { kickHeld = false; G.kickReleased = true; } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// zoom: wheel, + / − (0 = back to normal), two-finger pinch on touch screens. Range ≈ 3× closer … 2.6× further than normal.
export const ZOOM_MIN = 0.3, ZOOM_MAX = 2.6;
// G.zoomMax: a scene may forbid zooming out past its own framing (part 2: 1 = the overview is the furthest)
export function zoomBy(f) { G.zoom = clamp(G.zoom * f, ZOOM_MIN, G.zoomMax || ZOOM_MAX); }
window.addEventListener('wheel', (e) => { if (journalOpen() || guideOpen()) return; zoomBy(Math.pow(1.0015, clamp(e.deltaY, -240, 240))); }, { passive: true });
function toggleMute() { G.muted = !G.muted; $('muteBtn').textContent = G.muted ? '🔇' : '🔊'; if (ambBed) ambBed.gain.value = G.muted ? 0 : 1; }
$('muteBtn').onclick = toggleMute;
$('skipBtn').onclick = () => skipIntro();
// touch joystick
// looking around (panning): drag the game view with the mouse (desktop) or one finger (touch – not on the joystick / buttons).
// Screen pixels → ground metres: the orthographic view is 2·viewSize tall; the ground is seen at an angle (CAM_OFF: sin ≈ 0.52).
// screen right / forward on the ground: CAM_RIGHT / CAM_FWD (player.js – they turn with the camera in part 2)
const PAN_SIN = 34 / Math.hypot(40, 34, 40), PAN_MAX = 28;
function panBy(dx, dy) {
  const u = 2 * G.viewSize / window.innerHeight;
  let x = G.pan.x - (CAM_RIGHT.x * dx - CAM_FWD.x * dy / PAN_SIN) * u, z = G.pan.z - (CAM_RIGHT.z * dx - CAM_FWD.z * dy / PAN_SIN) * u;
  const l = Math.hypot(x, z); if (l > PAN_MAX) { x *= PAN_MAX / l; z *= PAN_MAX / l; }
  G.pan.x = x; G.pan.z = z; G.pan.t = 0;
}
{
  const app = $('app'); let mx = null, my = null, tid = null, tx = 0, ty = 0;
  app.addEventListener('mousedown', (e) => { if (e.button !== 0 && e.button !== 1) return; mx = e.clientX; my = e.clientY; app.classList.add('panning'); });
  window.addEventListener('mousemove', (e) => { if (mx === null || G.fps) return; panBy(e.clientX - mx, e.clientY - my); mx = e.clientX; my = e.clientY; });
  window.addEventListener('mouseup', () => { mx = null; app.classList.remove('panning'); });
  app.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { const t = e.touches[0]; tid = t.identifier; tx = t.clientX; ty = t.clientY; } else tid = null; }, { passive: true });
  app.addEventListener('touchmove', (e) => { if (e.touches.length !== 1 || tid === null) return; const t = e.touches[0]; if (t.identifier !== tid || G.fps) return; panBy(t.clientX - tx, t.clientY - ty); tx = t.clientX; ty = t.clientY; }, { passive: true });
  app.addEventListener('touchend', () => { tid = null; });
}
// two-finger pinch on the game view
{
  let d0 = 0, z0 = 1;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const app = $('app');
  app.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = G.zoom; } }, { passive: true });
  app.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && d0 > 0) { G.zoom = clamp(z0 * d0 / Math.max(10, dist(e.touches)), ZOOM_MIN, G.zoomMax || ZOOM_MAX); e.preventDefault(); } }, { passive: false });
  app.addEventListener('touchend', (e) => { if (e.touches.length < 2) d0 = 0; });
}
export const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) {
  // the stick: centre and travel come from its actual size (the phone layout makes it smaller – index.html), not fixed pixels
  const joy = $('joy'), knob = $('joyKnob'); let jid = null, jcx = 0, jcy = 0, home = 45, travel = 45, reach = 55;
  const measure = () => { const w = joy.clientWidth || 140, k = knob.offsetWidth || 50; home = (w - k) / 2; travel = home; reach = w * 0.4; };
  const release = () => { jid = null; touch.active = false; touch.x = touch.y = 0; knob.style.left = knob.style.top = ''; };   // the CSS centre (index.html) of whatever size the stick has
  joy.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; jid = t.identifier; measure(); const r = joy.getBoundingClientRect(); jcx = r.left + r.width / 2; jcy = r.top + r.height / 2; touch.active = true; e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { let dx = (t.clientX - jcx) / reach, dy = (t.clientY - jcy) / reach; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } touch.x = dx; touch.y = -dy; knob.style.left = (home + dx * travel) + 'px'; knob.style.top = (home - touch.y * travel) + 'px'; } }, { passive: false });
  for (const ev of ['touchend', 'touchcancel']) window.addEventListener(ev, (e) => { for (const t of e.changedTouches) if (t.identifier === jid) release(); });
  // turning the phone changes the layout (and the stick's size): back to the CSS centre of the new size
  window.addEventListener('resize', () => { if (jid === null) { knob.style.left = knob.style.top = ''; } });
  $('kickBtn').addEventListener('touchstart', (e) => { kickHeld = true; G.kickPressed = true; e.preventDefault(); }, { passive: false });
  $('kickBtn').addEventListener('touchend', (e) => { kickHeld = false; G.kickReleased = true; e.preventDefault(); }, { passive: false });
  $('useBtn').addEventListener('touchstart', (e) => { G.usePressed = true; e.preventDefault(); }, { passive: false });
  $('ballBtn').addEventListener('touchstart', (e) => { if (G.pstate !== 'juggle' && G.episode !== 2) resetBallToPlayer(); e.preventDefault(); }, { passive: false });   // the R key on a keyboard
  for (const b of document.querySelectorAll('#jTouch button')) b.addEventListener('touchstart', (e) => { jugPress(b.dataset.k); e.preventDefault(); }, { passive: false });
  $('runBtn').addEventListener('touchstart', (e) => { G.runPressed = true; if (G.pstate === 'photo') { e.preventDefault(); return; }   // „Fotóbomba”: GRIMASZ
    touch.run = !touch.run; $('runBtn').style.background = touch.run ? 'rgba(255,122,61,.85)' : ''; e.preventDefault(); }, { passive: false });
}

