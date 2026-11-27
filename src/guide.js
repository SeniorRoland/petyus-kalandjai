// Petyus kalandjai – guide: a pályák leírása a játékban (📖 gomb, L billentyű; a kezdőképernyőn a „Pályaleírások” gomb).
// The descriptions are the very files in docs/palyak/*.md (one text for the repo and the game): each is a file of its own in the
// build, loaded only when it is opened (import.meta.glob, ?raw). A small Markdown → HTML: headings, paragraphs, lists, tables,
// bold, code, links (a link to another .md opens that one here). The mischiefs (### under „A csibészségek”) are folded:
// their title and the stars you have; open one for how it goes (no spoiling at first sight).
import { G } from './state.js';
import { $ } from './util.js';
import { bestStarsByTitle } from './mischief.js';

const FILES = import.meta.glob('../docs/palyak/*.md', { query: '?raw', import: 'default' });
const load = (name) => { const f = FILES[`../docs/palyak/${name}.md`]; return f ? f() : Promise.resolve('# Nincs ilyen leírás'); };
// the tabs: every level, the phone page and the list
const TABS = [['1-park', 'Park'], ['2-otthon-reggel', 'Reggel'], ['2-iskola', 'Iskola'], ['2-otthon-este', 'Este'], ['mobil', 'Telefon'], ['README', 'Mind']];
let cur = '1-park';

// the level being played (part 2: ep2.js sets G.guidePage by the part of the day); the start screen: the list
const here = () => (G.mode === 'play' || G.mode === 'intro' ? G.guidePage || '1-park' : 'README');

// ---------------------------------------------------------------- Markdown → HTML (just what the descriptions use)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, href) => (/^[\w-]+\.md$/.test(href) ? `<a href="#" data-md="${href.slice(0, -3)}">${t}</a>` : t));
}
function render(md) {
  const L = md.replace(/\r/g, '').split('\n'), out = [];
  let i = 0, inFold = false, inCsib = false;
  const closeFold = () => { if (inFold) { out.push('</div></details>'); inFold = false; } };
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,3}) (.*)$/.exec(l))) {
      const n = m[1].length, txt = m[2];
      if (n <= 2) { closeFold(); inCsib = n === 2 && /csibészségek/i.test(txt); out.push(`<h${n + 1}>${inline(txt)}</h${n + 1}>`); }
      else if (inCsib) {   // a mischief: folded, with the stars you have
        closeFold();
        const title = txt.replace(/^\d+\.\s*/, ''), st = bestStarsByTitle(title);
        const stars = st === null ? '' : `<span class="gst">${'★'.repeat(st)}</span><span class="gst0">${'★'.repeat(3 - st)}</span>`;   // got · not yet
        out.push(`<details class="gm"><summary>${inline(txt)} ${stars}</summary><div>`); inFold = true;
      } else out.push(`<h4>${inline(txt)}</h4>`);
      i++; continue;
    }
    if (l.startsWith('|')) {   // a table
      const rows = []; while (i < L.length && L[i].startsWith('|')) { rows.push(L[i]); i++; }
      const cells = (r) => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\|[\s:|-]+\|?\s*$/.test(r));
      out.push('<div class="gtab"><table>' + body.map((r, k) => '<tr>' + cells(r).map((c) => (k ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`)).join('') + '</tr>').join('') + '</table></div>');
      continue;
    }
    if (/^\s*(- |\d+\. )/.test(l)) {   // a list (two levels: by the indent)
      const ord = /^\s*\d+\. /.test(l); let html = ord ? '<ol>' : '<ul>', depth = 0;
      while (i < L.length && /^\s*(- |\d+\. )/.test(L[i])) {
        const ind = L[i].match(/^\s*/)[0].length >= 2 ? 1 : 0, txt = L[i].replace(/^\s*(- |\d+\. )/, '');
        if (ind > depth) { html += '<ul>'; depth = 1; } else if (ind < depth) { html += '</ul>'; depth = 0; }
        html += `<li>${inline(txt)}</li>`; i++;
      }
      if (depth) html += '</ul>';
      out.push(html + (ord ? '</ol>' : '</ul>')); continue;
    }
    if (l.startsWith('>')) { i++; continue; }   // notes for the developers – not in the game
    const para = []; while (i < L.length && L[i].trim() && !/^(#|\||\s*- |\s*\d+\. |>)/.test(L[i])) { para.push(L[i]); i++; }
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);   // (one line, one line – the descriptions are written so)
  }
  closeFold();
  return out.join('\n');
}

// ---------------------------------------------------------------- the window
export function guideOpen() { return $('guide').classList.contains('open'); }
async function show(name) {
  cur = name;
  const tabs = $('gdTabs'); tabs.textContent = '';
  for (const [id, label] of TABS) {
    const t = document.createElement('button'); t.type = 'button'; t.textContent = label; t.className = id === cur ? 'on' : '';
    t.onclick = () => show(id); tabs.appendChild(t);
  }
  const body = $('gdBody'); body.textContent = 'Betöltés…';
  try { body.innerHTML = render(await load(name)); } catch (e) { body.textContent = 'Nem sikerült betölteni a leírást – ellenőrizd az internetkapcsolatot!'; return; }
  body.scrollTop = 0;
  for (const a of body.querySelectorAll('a[data-md]')) a.onclick = (e) => { e.preventDefault(); show(a.dataset.md); };
}
export function toggleGuide(open = !guideOpen()) {
  if (open && !guideOpen()) show(here());
  $('guide').classList.toggle('open', open);
  G.paused = open && G.mode === 'play';    // the game waits while you read
}
export function initGuide() {
  $('guideBtn').onclick = (e) => { toggleGuide(); e.currentTarget.blur(); };
  $('guideLink').onclick = () => toggleGuide(true);
  $('gdClose').onclick = () => toggleGuide(false);
  $('guide').addEventListener('click', (e) => { if (e.target.id === 'guide') toggleGuide(false); });
}
