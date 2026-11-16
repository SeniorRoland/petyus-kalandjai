// Petike a parkban – cine: Játék közbeni átvezetők: fekete csíkok, narrátor, kamerafókusz, lassítás.
import { setPrompt } from './activities/drinking.js';
import { G } from './state.js';
import { $ } from './util.js';

// ---------------------------------------------------------------- in-game cutscenes (letterbox, narrator, camera focus, slow motion)
export const cine = { on: false, focus: null, zoom: 6, slow: 1, slowT: 0, capT: 0 };
export function cineStart(focus, zoom) { cine.on = true; cine.focus = focus; cine.zoom = zoom; document.body.classList.add('cine'); setPrompt(''); }
export function cineFocus(focus, zoom) { if (focus) cine.focus = focus; if (zoom) cine.zoom = zoom; }
export function cineCap(txt, dur = 3) { const el = $('cineCap'); el.textContent = txt; el.classList.add('show'); cine.capT = dur; }
export function cineEnd(zoomAfter = 8.5) { cine.on = false; cine.focus = null; cine.slow = 1; document.body.classList.remove('cine'); $('cineCap').classList.remove('show'); G.viewSizeTarget = G.zoomOverride || zoomAfter; }
export function slowMo(f, dur) { cine.slow = f; cine.slowT = dur; }   // dur in real seconds
export function tickCine(realDt) {
  if (cine.slowT > 0) { cine.slowT -= realDt; if (cine.slowT <= 0) cine.slow = 1; }
  if (cine.capT > 0) { cine.capT -= realDt; if (cine.capT <= 0) $('cineCap').classList.remove('show'); }
}

