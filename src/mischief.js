// Petyus kalandjai – mischief: a csibészségek pontozása (max. 3 csillag) és a csibészség-napló.
// Every mini game ends with award(id, result): stars from the result, the best result is kept (localStorage),
// a comic popup shows the stars. The journal (N / 📒) lists the done ones with stars and the remaining ones as "???" + hint.
import { sCheer, tone } from './audio.js';
import { G } from './state.js';
import { $, clamp } from './util.js';

export const MISCHIEFS = [
  { id: 'apa-dekaz', title: 'Fordított edzés', hint: 'Apa mindig okosabb… vagy mégsem? (vidd oda neki a labdát)', fmt: (v) => `apa ${v} érintést bírt`, stars: (v) => 1 + (v >= 8) + (v >= 15) },
  { id: 'szundi', title: 'A szundikáló apa', hint: 'Ha apa sokáig ül a padon…' },
  { id: 'galamb', title: 'Galambraj-vezénylés', hint: 'Angi táskájában van valami morzsás.' },
  { id: 'vizipisztoly', title: 'Vízipisztoly az ivókútból', hint: 'Az ivókútból nem csak inni lehet.' },
  { id: 'kutyaszan', title: 'Kutyaszán', hint: 'A szomszéd néni kutyája unatkozik.' },
  { id: 'fotobomba', title: 'Fotóbomba', hint: 'Anya fotózni készül a szökőkútnál.' },
  { id: 'penzhalasz', title: 'Pénzhalászat a szökőkútból', hint: 'Valami csillog a szökőkút alján.' },
  { id: 'rollerverseny', title: 'Rollerverseny a nyugdíjassal', hint: 'A padon ülő bácsi gyorsnak tartja magát.' },
  { id: 'bujocska', title: 'Bújócska apával', hint: 'Apa szeret keresgélni.' },
  { id: 'lufi', title: 'Lufis bácsi', hint: 'Valaki lufit árul a park szélén.' },
];
export const MAX_STARS = MISCHIEFS.length * 3;
const KEY = 'petyus.r1.csibeszsegek';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }   // storage blocked → this session only
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* not stored */ } };
export const totalStars = () => MISCHIEFS.reduce((s, m) => s + ((saved[m.id] && saved[m.id].stars) || 0), 0);
export const doneCount = () => MISCHIEFS.filter((m) => saved[m.id]).length;

// score a finished mischief: returns the stars of this attempt
export function award(id, value) {
  const m = MISCHIEFS.find((x) => x.id === id); if (!m) return 0;
  const stars = clamp(m.stars ? m.stars(value) : 1, 1, 3), prev = saved[id];
  const best = prev ? Math.max(prev.best, value) : value;
  const improved = !prev || best > prev.best;
  saved[id] = { stars: Math.max(stars, prev ? prev.stars : 0), best, at: prev && !improved ? prev.at : Date.now() };
  save(); refreshTotals();
  showAward(m, stars, value, !prev, improved && !!prev);
  return stars;
}
let awardTimer = 0;
function showAward(m, stars, value, first, better) {
  const el = $('mAward');
  const keep = saved[m.id] ? '★'.repeat(saved[m.id].stars) : '';
  el.querySelector('.t1').textContent = first ? 'Csibészség teljesítve!' : better ? 'Új legjobb!' : `Nem lett jobb – a legjobbad marad: ${keep}`;
  el.querySelector('.t2').textContent = m.title;
  el.querySelector('.st').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="--d:${0.35 + i * 0.35}s">★</span>`).join('');
  el.querySelector('.t3').textContent = m.fmt ? m.fmt(value) : '';
  el.classList.add('show');
  for (let i = 0; i < stars; i++) tone('triangle', 880 + i * 220, 1320 + i * 220, 0.16, 0.12, 0.35 + i * 0.35);
  if (stars === 3) setTimeout(sCheer, 1300);
  clearTimeout(awardTimer); awardTimer = setTimeout(() => el.classList.remove('show'), 4600);
}
// ⭐ x/30 on the HUD and on the playable start tile
export function refreshTotals() {
  const t = totalStars();
  if ($('mStars')) $('mStars').textContent = t;
  for (const el of document.querySelectorAll('.ep.ready .stars')) el.textContent = `⭐ ${t}/${MAX_STARS}`;
}

// ---------- the journal
export function journalOpen() { return $('journal').classList.contains('open'); }
export function toggleJournal(open = !journalOpen()) {
  const el = $('journal');
  if (open) renderJournal();
  el.classList.toggle('open', open);
  G.paused = open && G.mode === 'play';    // the game waits while you read
}
function renderJournal() {
  $('jrSum').textContent = `⭐ ${totalStars()} / ${MAX_STARS} · ${doneCount()} / ${MISCHIEFS.length} csibészség`;
  const list = $('jrList'); list.textContent = '';
  for (const [i, m] of MISCHIEFS.entries()) {
    const s = saved[m.id], row = document.createElement('div'); row.className = 'jr ' + (s ? 'done' : 'todo');
    const num = document.createElement('span'); num.className = 'no'; num.textContent = i + 1 + '.';
    const txt = document.createElement('span'); txt.className = 'tx';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s ? m.title : '???';
    const info = document.createElement('span'); info.className = 'info'; info.textContent = s ? (m.fmt ? 'Legjobb: ' + m.fmt(s.best) : 'Teljesítve') : 'Tipp: ' + m.hint;
    txt.append(nm, info);
    const st = document.createElement('span'); st.className = 'stars'; st.textContent = s ? '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars) : '☆☆☆';
    row.append(num, txt, st); list.appendChild(row);
  }
}
export function initMischief() {
  refreshTotals();
  $('journalBtn').onclick = () => toggleJournal();
  $('journalLink').onclick = () => toggleJournal(true);
  $('jrClose').onclick = () => toggleJournal(false);
  $('journal').addEventListener('click', (e) => { if (e.target.id === 'journal') toggleJournal(false); });
}
