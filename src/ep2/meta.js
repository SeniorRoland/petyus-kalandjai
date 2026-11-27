// Petyus kalandjai – 2. rész: ami a kezdőképernyőhöz kell (megnyitás, mentés, továbblépés) – a rész kódja nélkül.
// The start screen needs only these few things about part 2; the part itself (ep2.js and everything under it) is loaded
// when it starts (main.js: import('./ep2/ep2.js')), so a park player never downloads it.
import { totalStars } from '../mischief.js';

export const EP2_STARS = 15;   // part 1's mischief stars needed
// developer access (npm run dev): always open, and ?resz=2 starts it at once. import.meta.env.DEV is false in the build,
// so Vite drops these branches – the released page has no way round the 15 stars.
export const ep2Unlocked = () => (import.meta.env.DEV ? true : totalStars() >= EP2_STARS);
export const ep2DevStart = () => import.meta.env.DEV && new URLSearchParams(location.search).get('resz') === '2';

export const SAVE_KEY = 'petyus.r2.allapot';
export function ep2HasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
// which part of the day the save is at (its code: the school's only when it is the school)
export function savedPhase() { try { const st = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return st && st.v === 1 && PHASE_IDS.includes(st.phase) ? st.phase : 'morning'; } catch (e) { return 'morning'; } }
export const PHASE_IDS = ['morning', 'school', 'evening'];

// moving on (ep2.js goPhase) leaves a note for the next page: its card, then that part of the day
export const NEXT_KEY = 'petyus.r2.tovabb';
export function takeEp2Next() {
  let n = null; try { n = JSON.parse(sessionStorage.getItem(NEXT_KEY) || 'null'); sessionStorage.removeItem(NEXT_KEY); } catch (e) { n = null; }
  return n && PHASE_IDS.includes(n.phase) ? n : null;
}
