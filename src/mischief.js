// Petyus kalandjai – mischief: a csibészségek pontozása (max. 3 csillag) és a csibészség-napló.
// Every mini game ends with award(id, result): stars from the result, the best result is kept (localStorage),
// a comic popup shows the stars. The journal (N / 📒) lists the done ones with stars and the remaining ones as "???" + hint.
import { sCheer, tone } from './audio.js';
import { G } from './state.js';
import { $, clamp, touchText } from './util.js';

export const MISCHIEFS = [
  { id: 'apa-dekaz', title: 'Fordított edzés', hint: 'Apa mindig okosabb… vagy mégsem? (vidd oda neki a labdát)', fmt: (v) => `apa ${v} érintést bírt`, stars: (v) => 1 + (v >= 8) + (v >= 15) },
  { id: 'szundi', title: 'A szundikáló apa', hint: 'Ha apa sokáig ül a padon… (hagyd egy kicsit pihenni)', fmt: (v) => `${v} tárgy apa fején`, stars: (v) => 1 + (v >= 6) + (v >= 10) },
  { id: 'galamb', title: 'Galambraj-vezénylés', hint: 'Angi táskájában van valami morzsás.', fmt: (v, x) => `${v} galamb apán` + (x && x.t ? ` (${Math.round(x.t)} mp)` : ''), stars: (v, x) => 1 + (v >= 8) + (v >= 15 && x.t <= 60) },
  { id: 'vizipisztoly', title: 'Vízipisztoly az ivókútból', hint: 'Az ivókútból nem csak inni lehet. (Szóköz az ivókútnál)', fmt: (v, x) => `${v} találat` + (x && x.dad ? ', apa is ázott' : ''), stars: (v, x) => 1 + (v >= 8) + (v >= 12 && !!x.dad) },
  { id: 'kutyaszan', title: 'Kutyaszán', hint: 'A szomszéd néni kutyája unatkozik. (rollerrel menj oda)', lower: true, fmt: (v) => v === 0 ? 'ütközés nélkül a szökőkútig' : `${v} ütközéssel a szökőkútig`, stars: (v) => 1 + (v <= 3) + (v === 0) },
  { id: 'fotobomba', title: 'Fotóbomba', hint: 'Anya fotózni készül a szökőkútnál. (ha apa és anya nyugton ül a padon)', fmt: (v, x) => `${v}/5 kép elrontva` + (x && x.pigeon ? ', galambbal' : ''), stars: (v, x) => 1 + (v >= 3) + (v >= 5 && !!x.pigeon) },
  { id: 'penzhalasz', title: 'Pénzhalászat a szökőkútból', hint: 'Valami csillog a szökőkút alján. (Szóköz a szökőkút peremén)', fmt: (v, x) => `${v} érme` + (x && x.seen === 0 ? ', lebukás nélkül' : x && x.seen ? `, ${x.seen}× lebukott` : ''), stars: (v, x) => 1 + (v >= 6) + (v >= 10 && !x.seen) },
  { id: 'rollerverseny', title: 'Rollerverseny a nyugdíjassal', hint: 'A padon ülő bácsi gyorsnak tartja magát. (rollerrel gurulj oda hozzá)', fmt: (v) => v >= 3 ? 'legyőzte a bácsit' : v === 2 ? 'félúton vezetett' : 'célba ért', stars: (v) => v },
  { id: 'bujocska', title: 'Bújócska apával', hint: 'Apa szeret keresgélni. (szólj neki a padnál)', fmt: (v, x) => x && x.gaveUp ? `${v} mp – apa feladta` : `${v} mp rejtőzés`, stars: (v, x) => 1 + (v >= 40 || !!x.gaveUp) + (!!x.gaveUp) },
  { id: 'lufi', title: 'Lufis bácsi', hint: 'Valaki lufit árul a park szélén. (a pálya melletti sétánynál)', fmt: (v) => v >= 3 ? 'megvan a labda, minden lufi épen' : v === 2 ? 'megvan a fára akadt labda' : 'repült a lufikkal', stars: (v) => v },
];
// part 2 (Szeptember): its own list and its own save – the morning at home (the school and the afternoon come later)
export const MISCHIEFS2 = [
  { id: 'r2-tejszin', title: 'A tejszínes kávé', hint: 'Apa kávét kér, de a gyomra nem bír mindent. (a hűtőben van tej, tejszín és tejszínhab)', fmt: (v, x) => (v >= 3 ? 'apa a WC-n – első próbára, tanúk nélkül' : v === 2 ? 'apa a WC-n – első próbára' : 'apa a WC-n') + (x && x.paper ? ', papírért kiabált' : ''), stars: (v) => v },
  { id: 'r2-karcsi', title: 'Karcsi nagy szökése', hint: 'Karcsi is szeretne körülnézni a lakásban. (a hűtőben van répa – azt nagyon szereti)', fmt: (v, x) => `${v} mp szabadon` + (x && x.scream ? ', anya a széken' : ''), stars: (v, x) => 1 + (x && x.scream ? 1 : 0) + (x && x.scream && v >= 60 ? 1 : 0) },
  { id: 'r2-kulcs', title: 'Hol a kulcs, Angi?', hint: 'Anya kulcsa mindig a cipősszekrényen van. (és ha nem ott lenne?)', fmt: (v, x) => `${v} mp keresés` + (x && x.odd ? ', fura helyen' : '') + (x && x.hint ? ', lebukott' : ''), stars: (v, x) => 1 + (v >= 120 ? 1 : 0) + (x && x.odd && !x.hint ? 1 : 0) },
];
const BOOKS = {
  1: { list: MISCHIEFS, key: 'petyus.r1.csibeszsegek', sub: '1. rész: Augusztus – Egy nap a parkban' },
  2: { list: MISCHIEFS2, key: 'petyus.r2.csibeszsegek', sub: '2. rész: Szeptember – Otthon és iskola' },
};
for (const b of Object.values(BOOKS)) {
  try { b.saved = JSON.parse(localStorage.getItem(b.key) || '{}') || {}; } catch (e) { b.saved = {}; }   // storage blocked → this session only
}
const bookOf = (id) => Object.values(BOOKS).find((b) => b.list.some((m) => m.id === id));
const curBook = () => BOOKS[G.episode === 2 ? 2 : 1];
const saveBook = (b) => { try { localStorage.setItem(b.key, JSON.stringify(b.saved)); } catch (e) { /* not stored */ } };
const starsOf = (b) => b.list.reduce((s, m) => s + ((b.saved[m.id] && b.saved[m.id].stars) || 0), 0);
export const MAX_STARS = MISCHIEFS.length * 3;
// part 1's stars (the September episode opens with 15 of them)
export const totalStars = () => starsOf(BOOKS[1]);
// the best stars of one mischief so far (0: not done yet)
export const starsFor = (id) => { const b = bookOf(id); return (b && b.saved[id] && b.saved[id].stars) || 0; };
export const doneCount = () => MISCHIEFS.filter((m) => BOOKS[1].saved[m.id]).length;

// score a finished mischief: returns the stars of this attempt
export function award(id, value, extra = {}) {
  const b = bookOf(id); if (!b) return 0;
  const m = b.list.find((x) => x.id === id), saved = b.saved;
  const stars = clamp(m.stars ? m.stars(value, extra) : 1, 1, 3), prev = saved[id];
  // best result: the highest – or the lowest for „fewer is better” (m.lower, e.g. collisions)
  const best = prev ? (m.lower ? Math.min(prev.best, value) : Math.max(prev.best, value)) : value;
  const improved = !prev || (m.lower ? best < prev.best : best > prev.best) || stars > prev.stars;
  saved[id] = { stars: Math.max(stars, prev ? prev.stars : 0), best, x: improved ? extra : prev.x, at: prev && !improved ? prev.at : Date.now() };
  saveBook(b); refreshTotals();
  showAward(m, stars, value, !prev, improved && !!prev, extra, saved);
  return stars;
}
let awardTimer = 0;
function showAward(m, stars, value, first, better, extra, saved) {
  const el = $('mAward');
  const keep = saved[m.id] ? '★'.repeat(saved[m.id].stars) : '';
  el.querySelector('.t1').textContent = first ? 'Csibészség teljesítve!' : better ? 'Új legjobb!' : `Nem lett jobb – a legjobbad marad: ${keep}`;
  el.querySelector('.t2').textContent = m.title;
  el.querySelector('.st').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="--d:${0.35 + i * 0.35}s">★</span>`).join('');
  el.querySelector('.t3').textContent = m.fmt ? m.fmt(value, extra) : '';
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
  const b = curBook(), L = b.list;
  $('jrSub').textContent = b.sub;
  $('jrSum').textContent = `⭐ ${starsOf(b)} / ${L.length * 3} · ${L.filter((m) => b.saved[m.id]).length} / ${L.length} csibészség`;
  const list = $('jrList'); list.textContent = '';
  for (const [i, m] of L.entries()) {
    const s = b.saved[m.id], row = document.createElement('div'); row.className = 'jr ' + (s ? 'done' : 'todo');
    const num = document.createElement('span'); num.className = 'no'; num.textContent = i + 1 + '.';
    const txt = document.createElement('span'); txt.className = 'tx';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s ? m.title : '???';
    const info = document.createElement('span'); info.className = 'info'; info.textContent = s ? (m.fmt ? 'Legjobb: ' + m.fmt(s.best, s.x) : 'Teljesítve') : 'Tipp: ' + touchText(m.hint);
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
