// Petyus kalandjai – menu: a kezdőképernyő 12 havi része (képregény-csík). Csak a `ready` rész indítható, a többi látszik, de zárva.
import { EPISODES } from './state.js';
import { $ } from './util.js';

// builds the tiles; returns the playable tile (it is the start button: id="startBtn", disabled until the models are loaded)
export function buildEpisodeMenu() {
  const box = $('episodes'); box.textContent = '';
  let start = null;
  for (const ep of EPISODES) {
    const tile = document.createElement(ep.ready ? 'button' : 'div');
    tile.className = 'ep ' + (ep.ready ? 'ready' : 'locked');
    tile.setAttribute('role', 'listitem');
    if (ep.c) { tile.style.setProperty('--c1', ep.c[0]); tile.style.setProperty('--c2', ep.c[1]); }
    if (ep.art) {   // one panel of a 2×2 season image
      const art = document.createElement('span'); art.className = 'art';
      art.style.setProperty('--img', `url("${import.meta.env.BASE_URL}${ep.art.img}")`); art.style.setProperty('--bx', ep.art.col * 100 + '%'); art.style.setProperty('--by', ep.art.row * 100 + '%');
      tile.appendChild(art);
    }
    else if (ep.icon) { const ic = document.createElement('span'); ic.className = 'icon'; ic.textContent = ep.icon; tile.appendChild(ic); }
    const cap = document.createElement('span'); cap.className = 'cap';
    const num = document.createElement('span'); num.className = 'num'; num.textContent = `${ep.n}. rész`;
    const month = document.createElement('span'); month.className = 'month'; month.textContent = ep.month;
    cap.append(num, month);
    if (ep.ready) {
      if (ep.sub) { const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = ep.sub; cap.appendChild(sub); }
      const go = document.createElement('span'); go.className = 'go'; go.textContent = 'Betöltés…'; cap.appendChild(go);
      tile.id = 'startBtn'; tile.disabled = true; tile.setAttribute('aria-label', `${ep.n}. rész: ${ep.month} – ${ep.sub || ''}`);
      start = tile;
    } else {
      const lock = document.createElement('span'); lock.className = 'lock'; lock.textContent = '🔒'; const lt = document.createElement('span'); lt.className = 't'; lt.textContent = ' Hamarosan'; lock.appendChild(lt); tile.appendChild(lock);
      tile.setAttribute('aria-disabled', 'true'); tile.setAttribute('aria-label', `${ep.n}. rész: ${ep.month} – hamarosan`); tile.title = 'Hamarosan';
    }
    tile.appendChild(cap); box.appendChild(tile);
  }
  return start;
}
// the playable tile's label: "Betöltés…" → "Indítás ▶" (or "Hiba")
export function setStartLabel(txt) { const go = $('startBtn') && $('startBtn').querySelector('.go'); if (go) go.textContent = txt; }
