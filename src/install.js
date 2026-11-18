// Petyus kalandjai – install: telefonon a kezdőképernyőn felajánlja, hogy a játék alkalmazásként a főképernyőre kerüljön.
// Android / Chrome: a böngésző `beforeinstallprompt` eseménye → „Telepítés” gomb (a böngésző saját ablaka jön fel).
// iPhone / iPad (Safari): nincs ilyen esemény → rövid útmutató („Megosztás → Főképernyőhöz adás”).
// Nem jelenik meg, ha már alkalmazásként fut, vagy ha egyszer „Most nem”-et nyomtak (localStorage).
import { $ } from './util.js';
import { MOBILE } from './quality.js';

const KEY = 'petyus.telepitesElutasitva';
const standalone = () => (typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const dismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
let deferred = null;

function show(html, withInstall) {
  const el = $('install'); if (!el || standalone() || dismissed()) return;
  el.querySelector('.txt').innerHTML = html;
  el.querySelector('.go').style.display = withInstall ? '' : 'none';
  el.classList.add('show');
}
function hide(remember) {
  $('install').classList.remove('show');
  if (remember) { try { localStorage.setItem(KEY, '1'); } catch (e) { /* this session only */ } }
}
export function setupInstall() {
  if (!MOBILE || !$('install')) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    show('📲 <b>Telepítsd alkalmazásként!</b> Teljes képernyőn fut, és net nélkül is megy.', true);
  });
  window.addEventListener('appinstalled', () => hide(true));
  $('install').querySelector('.go').addEventListener('click', async () => {
    if (!deferred) return hide(false);
    deferred.prompt();
    try { const r = await deferred.userChoice; hide(r && r.outcome === 'accepted'); } catch (e) { hide(false); }
    deferred = null;
  });
  $('install').querySelector('.no').addEventListener('click', () => hide(true));
  if (isIOS && !standalone()) setTimeout(() => show('📲 <b>Tedd a főképernyőre!</b> Koppints a <b>Megosztás</b> gombra (⬆), majd: <b>Főképernyőhöz adás</b>.', false), 1200);
  // the game started: the offer goes away (it is shown again on the next visit, unless declined)
  $('startBtn') && $('startBtn').addEventListener('click', () => hide(false));
}
