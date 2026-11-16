// Petyus kalandjai – cine: Játék közbeni átvezetők: fekete csíkok, narrátor, kamerafókusz, lassítás.
import { setPrompt } from './activities/drinking.js';
import { CAM_OFF, camTarget, updateProjection } from './scene.js';
import { G } from './state.js';
import { $ } from './util.js';

// ---------------------------------------------------------------- in-game cutscenes (letterbox, narrator, camera focus, slow motion)
export const cine = { on: false, focus: null, zoom: 6, slow: 1, slowT: 0, capT: 0, shake: 0 };
// hard cut: jump the camera straight to the new framing (no easing)
export function cineCut(focus, zoom) { cineFocus(focus, zoom); const f = cine.focus(); camTarget.set(f.x, 0, f.z); G.viewSize = G.viewSizeTarget = cine.zoom; updateProjection(); }
// camera focus for a point at height y (e.g. a person's chest): the ground point on the same view ray (the ortho camera looks along −CAM_OFF)
export const atHeight = (x, y, z) => ({ x: x - y * CAM_OFF.x / CAM_OFF.y, z: z - y * CAM_OFF.z / CAM_OFF.y });
export function shake(amount) { cine.shake = Math.max(cine.shake, amount); }   // world units, decays by itself
export function cineStart(focus, zoom) { cine.on = true; cine.focus = focus; cine.zoom = zoom; document.body.classList.add('cine'); setPrompt(''); }
export function cineFocus(focus, zoom) { if (focus) cine.focus = focus; if (zoom) cine.zoom = zoom; }
export function cineCap(txt, dur = 3) { const el = $('cineCap'); el.textContent = txt; el.classList.add('show'); cine.capT = dur; }
export function cineEnd(zoomAfter = 8.5) { cine.on = false; cine.focus = null; cine.slow = 1; document.body.classList.remove('cine'); $('cineCap').classList.remove('show'); G.viewSizeTarget = G.zoomOverride || zoomAfter; }
export function slowMo(f, dur) { cine.slow = f; cine.slowT = dur; }   // dur in real seconds
export function tickCine(realDt) {
  if (cine.slowT > 0) { cine.slowT -= realDt; if (cine.slowT <= 0) cine.slow = 1; }
  if (cine.capT > 0) { cine.capT -= realDt; if (cine.capT <= 0) $('cineCap').classList.remove('show'); }
  cine.shake *= Math.exp(-4.5 * realDt); if (cine.shake < 0.002) cine.shake = 0;
}

