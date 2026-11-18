// Petyus kalandjai – touchui: az érintéses gombok felirata és láthatósága helyzettől függően (telefon / tablet).
// A három gomb mindig ugyanaz (RÚGÁS = Szóköz, HASZNÁL = E, FUTÁS = Shift), de a csibészségekben mást csinálnak –
// ezt a feliratuk mutatja (FRÖCSKÖL, HALÁSZ, LEVEGŐ, UGRÁS, GRIMASZ …). A HASZNÁL gomb ott is látszik, ahol a
// minijátékból ki lehet lépni (KÉSZ / FELADOM), akkor is, ha épp nincs felirat (#prompt).
import { G } from './state.js';
import { $ } from './util.js';
import { pig } from './activities/pigeons.js';
import { ph } from './activities/photo.js';

// pstate → { kick, use, run } – null = hidden, undefined = the default behaviour
const LABELS = {
  free: () => ({ kick: pig.active && !pig.done ? 'MORZSA' : 'RÚGÁS', run: 'FUTÁS' }),
  autoBall: () => ({ kick: 'RÚGÁS', run: 'FUTÁS' }),
  riding: () => ({ kick: 'FÉK', run: 'GYORS' }),
  race: () => ({ kick: 'FÉK', run: 'GYORS', use: null }),
  sled: () => ({ kick: null, run: null, use: null }),
  squirt: () => ({ kick: 'FRÖCSKÖL', use: 'KÉSZ', run: null }),
  fish: () => ({ kick: 'HALÁSZ', use: 'KÉSZ', run: null }),
  photo: () => ({ kick: 'UGRÁS', run: 'GRIMASZ', use: ph.bird && ph.bird.mode === 'wait' && !ph.holding ? 'GALAMB' : null }),
  hide: () => ({ kick: 'LEVEGŐ', run: 'FUTÁS', use: 'FELADOM' }),
  balloon: () => ({ kick: 'UGRÁS', run: null, use: null }),
  tower: () => ({ kick: 'RAKD!', run: null, use: null }),
  juggle: () => ({ kick: null, run: null, use: null }),   // the ← ↑ → buttons (#jTouch)
  coach: () => ({ kick: null, run: null, use: null }),
};
const DEFAULT = () => ({ kick: null, run: null, use: null });   // cutscenes, autopilot (caught, chased, cat …)
const last = { kick: '', use: '', run: '' };
function setBtn(id, key, label, fallbackShown) {
  const el = $(id); if (!el) return;
  const show = label === undefined ? fallbackShown : label !== null;
  const txt = label || el.dataset.def;
  if (last[key] !== txt) { el.textContent = txt; last[key] = txt; }
  el.style.display = show ? 'block' : 'none';
}
export function updateTouchUI() {
  for (const [id, def] of [['kickBtn', 'RÚGÁS'], ['useBtn', 'HASZNÁL'], ['runBtn', 'FUTÁS']]) { const el = $(id); if (el && !el.dataset.def) el.dataset.def = def; }
  const L = (LABELS[G.pstate] || DEFAULT)();
  const promptShown = $('prompt').style.display === 'block';
  setBtn('kickBtn', 'kick', L.kick, true);
  setBtn('runBtn', 'run', L.run, true);
  setBtn('useBtn', 'use', L.use, promptShown);   // default: only when there is something to use (the prompt says what)
}
