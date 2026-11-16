// Petike a parkban – activities/juggle: Dekázás quick-time eventtel és rekorddal.
import { sCheer, sKick, tone } from '../audio.js';
import { ANGI_DEFEND, dad } from '../dad.js';
import { isTouch } from '../input.js';
import { pvel } from '../player.js';
import { G, ball } from '../state.js';
import { bigText, say } from '../ui.js';
import { $, R, V3, clamp, lerp, pick, rand } from '../util.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';

// ---------- juggling (dekázás): Q next to the ball, then a quick-time event per touch
// The ball flies between "contacts" (left foot / right foot / head). On each flight the key to press is shown with a ring
// closing in on it; press it within ±W of the contact. Faster flights and a narrower window as the count grows.
export const JUG = { L: { codes: ['ArrowLeft', 'KeyA'], sym: '←', part: 'bal láb' }, R: { codes: ['ArrowRight', 'KeyD'], sym: '→', part: 'jobb láb' }, U: { codes: ['ArrowUp', 'KeyW'], sym: '↑', part: 'fej' } };
export const jug = { n: 0, best: 0, t: 0, T: 0.9, H: 0.9, next: 'R', prev: 'R', from: new V3(), to: new V3(), hit: false, kickT: -1, kickPart: 'R', msgT: 0 };
try { jug.best = +(localStorage.getItem('petike.dekazasRekord') || 0) || 0; } catch (e) { /* storage blocked – the record lives for this session only */ }
$('jBest').textContent = jug.best;

const jugWindow = () => clamp(0.2 - jug.n * 0.004, 0.09, 0.2);
export function canJuggle() {
  if (!ball.active || G.goalLock > 0 || ball.juggle) return false;
  return Math.hypot(ball.pos.x - G.petike.pos.x, ball.pos.z - G.petike.pos.z) < 1.3 && ball.pos.y < 0.6 && Math.hypot(ball.vel.x, ball.vel.z) < 3;
}
function jugContact(part, out) {
  const a = G.petike, h = a.heading, fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);   // forward, left (+X at heading 0)
  if (part === 'U') return out.set(a.pos.x + fx * 0.05, a.rig.height + 0.19, a.pos.z + fz * 0.05);   // just above the head
  const s = part === 'L' ? 0.1 : -0.1;
  return out.set(a.pos.x + fx * 0.3 + lx * s, 0.35, a.pos.z + fz * 0.3 + lz * s);
}
function jugUI(show) {
  $('juggle').style.display = show ? 'block' : 'none';
  if (show && isTouch) $('jTouch').style.display = 'flex';
}
export function startJuggle() {
  const a = G.petike;
  G.pstate = 'juggle'; pvel.set(0, 0, 0); G.charging = false; a.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  a.targetHeading = a.heading = Math.atan2(ball.pos.x - a.pos.x, ball.pos.z - a.pos.z);
  ball.juggle = true; ball.vel.set(0, 0, 0); jug.n = 0; jug.next = 'R';
  jugContact('R', ball.pos); jug.kickT = 0; jug.kickPart = 'R'; sKick(0.05);   // first flick from the right foot
  $('jCount').textContent = '0'; $('jMsg').textContent = ''; jugUI(true);
  say(a, pick(['Figyelj, apa!', 'Dekázok!', 'Na, most nézzétek!']), 1.6);
  if (G.petyaMode === 'bench' && rand() < 0.6) runSeq([[1.2, () => { if (G.pstate === 'juggle') say(G.petya, pick(['Na, lássuk, hányat bírsz!', 'Ne a labdát nézd… vagyis de, azt nézd!']), 2.2); }]]);
  newFlight();
}
function newFlight() {
  jug.from.copy(ball.pos); jug.prev = jug.next;
  // first touches alternate feet; later the head joins in, and the order gets less predictable
  const r = rand();
  jug.next = jug.n >= 4 && r < 0.22 ? 'U' : (jug.n < 3 ? (jug.prev === 'R' ? 'L' : 'R') : (r < 0.61 ? 'L' : 'R'));
  if (jug.next === 'U' && jug.prev === 'U') jug.next = 'R';
  jug.T = Math.max(0.52, 0.9 - jug.n * 0.012); jug.H = jug.next === 'U' || jug.prev === 'U' ? 0.6 : 0.95;
  jugContact(jug.next, jug.to); jug.t = 0; jug.hit = false;
  $('jKey').textContent = JUG[jug.next].sym; $('jPart').textContent = JUG[jug.next].part;
}
export function jugPress(k) {
  if (G.pstate !== 'juggle' || jug.hit) return;
  const dtc = jug.t - jug.T, W = jugWindow();
  if (dtc < -W) return jugFail('Korai!');
  if (k !== jug.next) return jugFail('Rossz! A ' + JUG[jug.next].part + ' kellett!');
  jug.hit = true; jug.msgT = 0.7;
  const el = $('jMsg'); el.textContent = Math.abs(dtc) < W * 0.35 ? 'Tökéletes!' : 'Jó!'; el.style.color = Math.abs(dtc) < W * 0.35 ? '#7ddc5a' : '#ffd166';
}
function jugTouch() {
  // the ball meets foot / head: count it, then the next flight
  jug.n++; $('jCount').textContent = jug.n;
  jug.kickT = 0; jug.kickPart = jug.next;
  if (jug.next === 'U') tone('sine', 260, 180, 0.08, 0.25); else sKick(0.08);
  const n = jug.n;
  if (G.petyaMode === 'bench') {
    const L = { 5: 'Öt. Ne a labdát nézd! …Jó, nézd a labdát.', 10: 'Tíz! De a bal lábad csak dísz?', 20: 'Húsz?! Ki tanított erre? …Én, persze.', 30: 'Jó-jó, de én a te korodban százat dekáztam!', 50: 'Ötven… Angi, ezt látod? …Mármint láttam már jobbat is.' }[n];
    if (L) { say(G.petya, L, 2.6); G.petya.point = 1.2; dad.talkT = 6; }
    if (n === 15) say(G.angi, 'Petya, nézd már, milyen ügyes!', 2.4);
  }
  newFlight();
}
function jugFail(msg) {
  const n = jug.n, old = jug.best;
  G.pstate = 'free'; ball.juggle = false;
  // the ball just drops away
  const k = jug.t / jug.T, vy = (jug.to.y - jug.from.y) / jug.T + 4 * jug.H * (1 - 2 * k) / jug.T;
  ball.vel.set((jug.to.x - jug.from.x) / jug.T + R(-1.2, 1.2), Math.min(vy, 1), (jug.to.z - jug.from.z) / jug.T + R(-1.2, 1.2));
  const el = $('jMsg'); el.textContent = msg; el.style.color = '#ff6b5b'; jug.msgT = 1.6;
  $('jKey').textContent = '✗'; $('jPart').textContent = n + ' dekázás';
  setTimeout(() => { if (G.pstate !== 'juggle') jugUI(false); }, 1600);
  say(G.petike, pick(['Jaj!', 'Hoppá…', 'Majdnem!', 'A fene…']), 1.4);
  if (n > old) {
    jug.best = n; $('jBest').textContent = n;
    try { localStorage.setItem('petike.dekazasRekord', String(n)); } catch (e) { /* not stored */ }
    if (old > 0 || n >= 3) { bigText('ÚJ REKORD: ' + n + '!', 2.2); sCheer(); G.angi.cheer = 1.6; }
  }
  if (G.petyaMode === 'bench') {
    const line = n < 3 ? pick(['Ennyi? A nagymamád is többet dekázik!', 'Ez még bemelegítésnek is kevés.']) : n < 10 ? pick(['Na, majd ha tízet megcsinálsz, akkor beszélünk.', 'Nem rossz. Nem is jó.']) : n > old ? pick(['Hát… nem rossz. De én a te korodban százat!', 'Rekord? Az én rekordom ezt meg se nézi.']) : pick(['A rekordodat se érted el. Gyakorolj!', 'Láttam már tőled jobbat is.']);
    runSeq([[0.9, () => { say(G.petya, line, 2.6); G.petya.point = 1.3; dad.talkT = 5; }]]);
    if (n >= 10) runSeq([[3.6, () => say(G.angi, pick(ANGI_DEFEND), 2.4)]]);
  }
}
export function updateJuggle(dt) {
  const a = G.petike, r = a.rig;
  G.kickPressed = G.kickReleased = false; G.usePressed = false; G.qPressed = false;
  jug.t += dt;
  const W = jugWindow(), k = jug.t / jug.T;
  // ball on a parabola from the last contact to the next one (keeps falling if the touch is late)
  ball.pos.x = lerp(jug.from.x, jug.to.x, Math.min(k, 1.15)); ball.pos.z = lerp(jug.from.z, jug.to.z, Math.min(k, 1.15));
  ball.pos.y = Math.max(ball.r, lerp(jug.from.y, jug.to.y, k) + 4 * jug.H * k * (1 - k));
  // QTE ring
  const ring = $('jRing'); ring.style.transform = 'scale(' + lerp(2.4, 1, clamp(k, 0, 1)).toFixed(3) + ')';
  ring.classList.toggle('hot', Math.abs(jug.t - jug.T) <= W);
  if (jug.msgT > 0) { jug.msgT -= dt; if (jug.msgT <= 0) $('jMsg').textContent = ''; }
  if (jug.hit && jug.t >= jug.T) jugTouch();
  else if (!jug.hit && jug.t > jug.T + W) { jugFail('Késő!'); }
  // pose: arms out for balance, eyes on the ball, kick / header
  a.animate(dt, false, 0);
  r.sh[0].rotation.z = -0.55; r.sh[1].rotation.z = 0.55; r.sh[0].rotation.x = -0.2; r.sh[1].rotation.x = -0.2;
  if (jug.kickT >= 0) {
    jug.kickT += dt; const s = Math.sin(Math.PI * Math.min(1, jug.kickT / 0.26));
    if (jug.kickPart === 'U') { r.inner.rotation.x = -0.22 * s; r.inner.position.y += 0.05 * s; }
    else { const i = jug.kickPart === 'R' ? 0 : 1; r.hip[i].rotation.x = -0.85 * s; r.knee[i].rotation.x = 0.75 * s; }
    if (jug.kickT > 0.26) jug.kickT = -1;
  }
  a.sync();
}

