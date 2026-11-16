// Petyus kalandjai – activities/coach: 1. csibészség – „Fordított edzés”: apa dekázik, Petyus edzi.
// Petyus brings the ball to dad on the bench → E: „Mutasd te, apa!” → dad gets up, the player juggles FOR him
// (same quick-time event, narrower window) while Petyus coaches him with his own lines → dad's back gives up → stars.
import { sCheer } from '../audio.js';
import { dad, petyaFront } from '../dad.js';
import { award } from '../mischief.js';
import { pvel } from '../player.js';
import { G, ball } from '../state.js';
import { say } from '../ui.js';
import { $, dampAngle, pick, rand } from '../util.js';
import { setPrompt } from './drinking.js';
import { runSeq } from './fountain.js';
import { startJuggle } from './juggle.js';

const co = { phase: '', lineT: 0, last: '', spot: null, kidSpot: null, hurt: false };

// Petyus coaching dad: dad's own favourite lines thrown back at him, and a few new ones
const KID_COACH = [
  'Fejet fel, apa!', 'Ez passz volt vagy simogatás?', 'Térdet behajlítani, apa! A térdet!', 'Ne a labdát nézd! …Jó, nézd a labdát.',
  'Használd a bal lábad is! Az is a tiéd!', 'Szobor vagy, vagy focista?', 'Gyerünk, apa, ne aludj el!', 'Lazábban! Nem adóbevallást töltesz ki!',
  'Az én időmben ezt mezítláb csináltuk! …Múlt héten.', 'Anya, nézd! Apa sportol!', 'Hűha, apa, ez majdnem szép volt!', 'Lélegezz, apa! Be… és ki…',
  'Ne nyögj, az a labdát zavarja!', 'Pontosság, nem erő, hányszor mondjam?', 'Nem rossz. Nem is jó.', 'Majdnem jó. De csak majdnem.',
];
const KID_MILESTONE = {
  3: 'Három! Apa, ez a te korosztályodban már rekord!',
  5: 'Öt! Hívjam a mentőket vagy a tévét?',
  8: 'Nyolc! Na jó, ez tényleg nem rossz. De a bal lábad csak dísz?',
  10: 'Tíz! Anya, vedd fel videóra, senki nem fogja elhinni!',
  15: 'Tizenöt?! Apa, te titokban edzel?!',
  20: 'Húsz! Oké, oké… ki tanított erre? …Én, persze.',
  25: 'Huszonöt! Apa, kérsz egy kis vizet? Vagy oxigént?',
};
const DAD_GRUNT = ['Hopp!', 'Uff…', 'Ez csak bemelegítés!', 'Figyeld a technikát!', 'Hehe! Látod?', 'Nem nehéz ez!'];

export function canChallengeDad() {
  if (G.petyaMode !== 'bench' || G.petya.sit < 0.9 || !ball.active || ball.juggle || G.goalLock > 0) return false;
  const P = G.petike.pos;
  return Math.hypot(P.x - G.petya.pos.x, P.z - G.petya.pos.z) < 2.6 && Math.hypot(ball.pos.x - P.x, ball.pos.z - P.z) < 3.5 && ball.pos.y < 0.6;
}
export function startDadChallenge() {
  const p = G.petya;
  G.pstate = 'coach'; co.phase = 'intro'; co.hurt = false; pvel.set(0, 0, 0); G.charging = false; G.petike.kickT = -1; setPrompt(''); $('charge').style.display = 'none';
  G.petyaMode = 'coach'; ball.vel.set(0, 0, 0);
  // dad juggles a couple of metres from his seat (so he has to limp back afterwards), Petyus coaches 2.3 m to his west
  const f = petyaFront(); co.spot = [f[0] + 1.8, f[1] + 0.85]; co.kidSpot = [co.spot[0] - 2.3, co.spot[1] + 0.3];
  runSeq([
    [0.0, () => say(G.petike, pick(['Apa, ha ilyen jól tudod, mutasd meg te!', 'Apa! Most te jössz. Én edzek!']), 2.4)],
    [2.4, () => { say(p, pick(['Na jó. Nézd és tanulj, fiam.', 'Hah! Ezt nézd meg, és jegyzetelj!']), 2.4); p.sitTarget = 0; }],
    [2.4, () => say(G.angi, 'Petya… a derekad.', 2.0)],
    [2.0, () => { say(p, 'A derekamnak semmi baja! …Még.', 2.2); p.walkTo([co.spot], 1.1); }],
    [0.3, () => {}, () => !p.path && p.sit < 0.05],
    [0.4, () => {
      p.targetHeading = p.heading = Math.atan2(G.petike.pos.x - p.pos.x, G.petike.pos.z - p.pos.z);   // facing his coach
      co.phase = 'juggle'; co.lineT = 2.2; startJuggle(p);
      say(G.petike, 'Rajta, apa! Mutasd!', 1.6);
    }],
  ]);
}
// Petyus: walks to his coaching spot, then watches dad (pstate 'coach' = intro / outro)
export function updateCoach(dt) {
  G.kickPressed = G.kickReleased = false; G.usePressed = false; G.qPressed = false;
  const a = G.petike, p = G.petya;
  const dx = co.kidSpot[0] - a.pos.x, dz = co.kidSpot[1] - a.pos.z, d = Math.hypot(dx, dz);
  if (co.phase === 'intro' && d > 0.08) {
    const st = Math.min(d, 2.2 * dt); a.pos.x += dx / d * st; a.pos.z += dz / d * st;
    a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 10, dt); a.animate(dt, true, 2.2);
  } else { a.heading = dampAngle(a.heading, Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z), 8, dt); a.animate(dt, false, 0); }
  a.sync();
  if (co.hurt) {   // dad holds his back
    const r = p.rig; r.inner.rotation.x = 0.42; r.sh[0].rotation.x = 0.85; r.sh[0].rotation.z = -0.25; r.sh[1].rotation.x = 0.6; p.sync();
  }
}
// while dad juggles (called from updateJuggle): Petyus watches, points and coaches
export function coachKid(dt) {
  const a = G.petike, p = G.petya;
  a.heading = dampAngle(a.heading, Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z), 8, dt); a.animate(dt, false, 0); a.sync();
  co.lineT -= dt;
  if (co.lineT <= 0) {
    co.lineT = 2.6 + rand() * 1.4;
    let line = pick(KID_COACH); if (line === co.last) line = pick(KID_COACH); co.last = line;
    say(a, line, 2.2); a.point = 1.4;
  }
}
export function coachTouch(n) {
  if (KID_MILESTONE[n]) { say(G.petike, KID_MILESTONE[n], 2.6); G.petike.point = 1.6; co.lineT = 3.2; }
  else if (rand() < 0.16) say(G.petya, pick(DAD_GRUNT), 1.2);
  if (n === 8) say(G.angi, 'Petya, ne erőltesd!', 2.0);
  if (n === 12) say(G.angi, 'Jaj, a derekad…', 2.0);
  if (n === 15) { G.angi.cheer = 1.5; sCheer(); }
}
// the ball dropped: verdict, excuse, the back gives up, limp back to the bench, stars
export function coachFail(n) {
  const p = G.petya;
  G.pstate = 'coach'; co.phase = 'outro';
  const verdict = n < 3 ? pick(['Ennyi? A nagymamám is többet dekázik!', 'Ez még bemelegítésnek is kevés, apa.'])
    : n < 8 ? pick(['Na, majd ha tízet megcsinálsz, akkor beszélünk.', 'Közepes. Lehetett volna jobb.'])
    : n < 15 ? pick(['Nem rossz. Nem is jó.', 'Hmm. A térdedet hajlítsd be jobban!'])
    : pick(['Apa… ez tényleg menő volt!', 'Oké. Ezt most az egyszer elismerem.']);
  const excuse = n < 3 ? pick(['A cipőm csúszik!', 'Túl van fújva ez a labda!', 'A nap a szemembe sütött!'])
    : n < 8 ? pick(['Ez csak bemelegítés volt!', 'A szél! Láttad, mekkora szél volt?'])
    : n < 15 ? pick(['Na ugye! Megmondtam!', 'És még be sem melegítettem!'])
    : pick(['Hát persze. Az én időmben százat…', 'Na? Na?! Ki az apád?']);
  runSeq([
    [0.6, () => { say(G.petike, verdict, 2.4); G.petike.point = 1.6; }],
    [2.4, () => say(p, excuse, 2.4)],
    [2.4, () => { co.hurt = true; say(p, 'ÁÚ!! A DEREKAM!', 2.0); }],
    [1.8, () => say(G.angi, pick(['Mondtam, Petya…', 'Hozom a Voltarent.']), 2.2)],
    [1.6, () => {
      award('apa-dekaz', n);
      co.hurt = false; co.phase = ''; G.pstate = 'free';
      G.petyaMode = 'return'; dad.limpT = 14; dad.talkT = 2.5;   // limps back to the bench (dad.js)
    }],
  ]);
}
