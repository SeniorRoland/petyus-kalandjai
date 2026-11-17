// Petyus kalandjai – menu: a kezdőképernyő 12 havi része (szétszórt polaroidok; az egér alatti „felemelkedik”). Csak a `ready` rész indítható, a többi látszik, de zárva.
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
    if (!ep.ready) tile.tabIndex = 0;   // the locked ones can be picked up with the keyboard too
    // scattered on the table: a fixed (per episode) tilt and nudge, tape on every third
    const k = ep.n * 7919;
    tile.style.setProperty('--rot', `${((k % 13) - 6) * 1.25}deg`);
    tile.style.setProperty('--dx', `${(((k >> 3) % 11) - 5) * 1.8}px`); tile.style.setProperty('--dy', `${(((k >> 5) % 13) - 6) * 1.6}px`);
    if (ep.n % 3 === 1) { tile.classList.add('tape'); tile.style.setProperty('--tape', `${((k >> 2) % 9) - 4}deg`); }
    if (ep.c) { tile.style.setProperty('--c1', ep.c[0]); tile.style.setProperty('--c2', ep.c[1]); }
    // the photo
    const photo = document.createElement('span'); photo.className = 'photo';
    if (ep.art) {   // one panel of a 2×2 season image
      const art = document.createElement('span'); art.className = 'art';
      art.style.setProperty('--img', `url("${import.meta.env.BASE_URL}${ep.art.img}")`); art.style.setProperty('--bx', ep.art.col * 100 + '%'); art.style.setProperty('--by', ep.art.row * 100 + '%');
      photo.appendChild(art);
    }
    else if (ep.icon) { const ic = document.createElement('span'); ic.className = 'icon'; ic.textContent = ep.icon; photo.appendChild(ic); }
    // the caption, handwritten in the white margin
    const cap = document.createElement('span'); cap.className = 'cap';
    const num = document.createElement('span'); num.className = 'num'; num.textContent = `${ep.n}. rész`;
    const month = document.createElement('span'); month.className = 'month'; month.textContent = ep.month;
    cap.append(num, month);
    if (ep.ready) {
      if (ep.sub) { const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = ep.sub; cap.appendChild(sub); }
      const st = document.createElement('span'); st.className = 'stars'; photo.appendChild(st);   // ⭐ x/30 (refreshTotals)
      const go = document.createElement('span'); go.className = 'go'; go.textContent = 'Betöltés…'; photo.appendChild(go);
      tile.id = 'startBtn'; tile.disabled = true; tile.setAttribute('aria-label', `${ep.n}. rész: ${ep.month} – ${ep.sub || ''}`);
      start = tile;
    } else {
      const lock = document.createElement('span'); lock.className = 'lock'; lock.textContent = '🔒'; const lt = document.createElement('span'); lt.className = 't'; lt.textContent = ' Hamarosan'; lock.appendChild(lt); photo.appendChild(lock);
      tile.setAttribute('aria-disabled', 'true'); tile.setAttribute('aria-label', `${ep.n}. rész: ${ep.month} – hamarosan`); tile.title = 'Hamarosan';
    }
    tile.append(photo, cap); box.appendChild(tile);
  }
  return start;
}
// the playable tile's label: "Betöltés…" → "Indítás ▶" (or "Hiba")
export function setStartLabel(txt) { const go = $('startBtn') && $('startBtn').querySelector('.go'); if (go) go.textContent = txt; }
