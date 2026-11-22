// Petyus kalandjai – backmenu: vissza a főmenübe (🏠 jobb felül, játék közben – mindkét részben).
// A confirmation first (the game waits meanwhile); on yes the episode's own save runs (G.saveHook – part 2: the day's
// state), then the page starts again on the start screen (a clean boot: the parts are built only for the one played).
import { G } from './state.js';
import { $ } from './util.js';

let shown = null;
export function setupBackToMenu() {
  const btn = $('menuBtn'), dlg = $('backDlg');
  const close = () => { dlg.classList.remove('open'); G.paused = false; };
  btn.onclick = () => {
    if (document.pointerLockElement) document.exitPointerLock();
    $('backTxt').textContent = G.episode === 2
      ? 'A mai nap állását (dátum, óra, hol tartasz, ajtók, lámpák) elmentem, a szeptemberi képről innen folytathatod.'
      : 'A csibészségek eredményei és a dekázás-rekord el vannak mentve. A mostani játék (gólok, hol tartasz) a következő indításkor elölről kezdődik.';
    dlg.classList.add('open'); G.paused = true; $('backYes').focus();
  };
  $('backNo').onclick = close;
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  window.addEventListener('keydown', (e) => { if (dlg.classList.contains('open') && e.code === 'Escape') close(); });
  $('backYes').onclick = () => {
    try { if (G.saveHook) G.saveHook(); } catch (e) { /* storage blocked: nothing to keep */ }
    location.href = location.pathname;   // the start screen (without ?resz=2 or other parameters)
  };
}
// every frame: the button only while playing (intro or game), not on the start screen
export function updateBackButton() {
  const on = G.mode === 'intro' || G.mode === 'play';
  if (on !== shown) { shown = on; $('menuBtn').style.display = on ? 'inline-block' : 'none'; }
}
