// Petyus kalandjai – dad: Az apa (Petya) viselkedése és szövegei.
import { updateDadCat } from './activities/cat.js';
import { tickSeq, updateDadFountain } from './activities/fountain.js';
import { SEAT } from './intro.js';
import { pvel } from './player.js';
import { G, animals, ball, npcs, roller } from './state.js';
import { say } from './ui.js';
import { R, V3, clamp, pick, rand } from './util.js';
import { FAMILY_BENCH, FENCE, colliders } from './world.js';

// ---------- dad (Petya)
       // bench | standing | leaving | follow | return | seat
export const dad = { talkT: 6, last: '', seatPhase: 0, seatT: 0, alarmT: 0, limpT: 0 };   // limpT: after the „Fordított edzés” his back hurts
export const G_OUT = [30, -10.9], G_IN = [30, -8.7];        // the pitch gate, outside / inside
export const inPitch = (x, z) => x > FENCE.x0 && x < FENCE.x1 && z > FENCE.z0 && z < FENCE.z1;
export function navTarget(p, to) {
  // stuck behind the family bench → walk round its end first
  const B = FAMILY_BENCH; if (p.z < B.z + 0.2 && Math.abs(p.x - B.x) < 1.5 && to[1] > B.z) return [B.x + (p.x >= B.x ? 1.7 : -1.7), p.z];
  const a = inPitch(p.x, p.z), b = inPitch(to[0], to[1]); if (a === b) return to;
  // already in the gate passage → head for the gate point on the destination side (no flip-flopping between the two)
  if (Math.abs(p.x - (FENCE.gate0 + FENCE.gate1) / 2) < 0.9 && p.z > G_OUT[1] - 0.4 && p.z < G_IN[1] + 0.4) return b ? G_IN : G_OUT;
  const first = a ? G_IN : G_OUT, second = a ? G_OUT : G_IN;
  return Math.hypot(p.x - first[0], p.z - first[1]) > 0.35 ? first : second;
}
export const petyaFront = () => [SEAT.petya[0], -11.85];
export function dadStartFollow() {
  G.petyaMode = 'standing'; G.petya.sitTarget = 0; G.petya.path = null; dad.talkT = 2.5;
  say(G.petya, pick(['Petyus! Várj meg! Sisak rajtad van?!', 'Jaj ne, a roller… Lassan!!', 'Várj, megyek veled!']), 2.4); G.petya.point = 1.2;
}
export function dadReturn() { G.petyaMode = 'return'; dad.talkT = 1.6; }
export function dadAlarm() { if (dad.alarmT > G.clockT) return; dad.alarmT = G.clockT + 2; say(G.petya, pick(['Jaj! Megütötted magad?!', 'Mondtam, hogy vigyázz!', 'Nekimentél! Na tessék!']), 2.2); G.petya.point = 1.2; dad.talkT = 3; }
export const FTN_STATES = ['toFountain', 'ftnDrink', 'caught', 'chased', 'atMom'];
export function updateDad(dt) {
  const p = G.petya;
  tickSeq(dt);
  if (G.petyaMode.startsWith('ftn')) return updateDadFountain(dt);
  if (G.petyaMode.startsWith('cat')) return updateDadCat(dt);
  if (G.petyaMode === 'coach') return;   // the „Fordított edzés” mischief drives him (activities/coach.js)
  if (dad.limpT > 0) dad.limpT -= dt;
  if (G.petyaMode === 'standing') { if (p.sit < 0.05) { p.walkTo([petyaFront()], 1.4); G.petyaMode = 'leaving'; } }
  else if (G.petyaMode === 'leaving') { if (!p.path) G.petyaMode = G.pstate === 'riding' ? 'follow' : 'return'; }
  else if (G.petyaMode === 'follow') {
    const ro = roller, d = Math.hypot(p.pos.x - ro.pos.x, p.pos.z - ro.pos.z);
    if (d > 2.4) { const t = navTarget(p.pos, [ro.pos.x - Math.sin(ro.heading) * 2, ro.pos.z - Math.cos(ro.heading) * 2]); p.path = [new V3(t[0], 0, t[1])]; p.speed = clamp(1.5 + (d - 2.4) * 1.1, 1.5, 5.2); p.keepHeading = false; }
    else { p.path = null; p.targetHeading = Math.atan2(ro.pos.x - p.pos.x, ro.pos.z - p.pos.z); }
  } else if (G.petyaMode === 'return') {
    if (G.pstate === 'riding') { G.petyaMode = 'follow'; return; }
    const f = petyaFront(), d = Math.hypot(p.pos.x - f[0], p.pos.z - f[1]);
    if (d < 0.25) { p.path = null; G.petyaMode = 'seat'; dad.seatPhase = 0; dad.seatT = 0.6; p.targetHeading = 0; }
    else { const t = navTarget(p.pos, f); p.path = [new V3(t[0], 0, t[1])]; p.speed = dad.limpT > 0 ? 0.5 : 1.2; p.keepHeading = false; }  // slow, grumpy walk (or a limp)
    if (dad.limpT > 0) { const r = p.rig; r.inner.rotation.x = 0.38; r.sh[0].rotation.x = 0.85; r.sh[0].rotation.z = -0.25; }   // hand on the aching back
  } else if (G.petyaMode === 'seat') {
    if (G.pstate === 'riding') { G.petyaMode = 'follow'; return; }
    dad.seatT -= dt;
    if (dad.seatPhase === 0 && dad.seatT <= 0) { p.walkTo([SEAT.petya], 0.7, true); dad.seatPhase = 1; }
    else if (dad.seatPhase === 1 && !p.path) { p.sitTarget = 1; G.petyaMode = 'bench'; dad.talkT = R(2, 4); }
  }
  // speech
  dad.talkT -= dt;
  if (dad.talkT > 0) return;
  let line = null, gap = R(3, 4.5), point = true;
  if (['standing', 'leaving', 'follow'].includes(G.petyaMode)) { line = worryLine(); gap = R(2.2, 3.4); }
  else if (G.petyaMode === 'return' || G.petyaMode === 'seat') { line = pick(dad.limpT > 0 ? LIMP : GRUMBLE); gap = R(3.2, 4.8); point = false; }
  else if (G.pstate === 'free') {
    if (playingFootball()) line = coachLine();
    else { const far = G.petike.pos.distanceTo(p.pos) > 28; line = far ? null : pick(rand() < 0.6 ? GRUMBLE : BENCH_IDLE); gap = R(6, 9); point = false;
      if (far) { say(G.angi, pick(['Petyus, ne menj túl messzire!', 'Petyuuus, gyere vissza a pályára!']), 2.6); } }
  }
  if (line) {
    if (line === dad.last) line = coachFallback(); dad.last = line;
    say(p, line, 2.6); if (point) p.point = 1.2;
    if (G.petyaMode === 'bench' && rand() < 0.25) setTimeout(() => say(G.angi, pick(ANGI_DEFEND), 2.4), 1500);
  }
  dad.talkT = gap;
}
function playingFootball() {
  if (!ball.active) return false;
  return inPitch(G.petike.pos.x, G.petike.pos.z) || G.petike.pos.distanceTo(ball.pos) < 4;
}
const coachFallback = () => pick(['Az én időmben ezt mezítláb csináltuk!', 'Figyelj oda, Petyus!', 'Nem így! … Vagyis igen, de mégse.', 'Koncentrálj!', 'Na. Ez… ez valami volt.', 'Ügyes! …Ezt nem mondtam.']);
function coachLine() {
  const sp = Math.hypot(pvel.x, pvel.z), db = G.petike.pos.distanceTo(ball.pos);
  if (G.lastKick && G.clockT - G.lastKick.t < 2.5) {
    const k = G.lastKick; G.lastKick = null;
    if (k.power < 0) return pick(['A labdát kell megrúgni, nem a levegőt!', 'Hol volt a labda? Hát nem ott!', 'A levegő megköszöni, hogy megrúgtad.', 'Láttam, a fű is megijedt.', 'Ez lövés volt, vagy tánclépés?']);
    if (k.power < 0.35) return pick(['Erősebben! Nem hallottam a labdát!', 'Ez passz volt vagy simogatás?', 'Rúgd meg rendesen, nem tojás!', 'A labda még most is alszik.', 'Ennél a nagymamád is erősebben köhög.', 'Ezzel a lövéssel a hangyákat se ijeszted meg.']);
    if (k.power > 0.8) return pick(['Nem ekkorát! Ez nem rakétakilövés!', 'Pontosság, nem erő, hányszor mondjam!', 'A felhőket akarod eltalálni?', 'Ez a labda már a szomszéd megyében jár.', 'A NASA most hívott, kérdezik, mi repült el.', 'Szólj, ha leszáll a labda!']);
    if (!k.toward) return pick(['Kapura, Petyus, KAPURA!', 'Rossz irány! A kapu arra van!', 'Ezt meg kinek rúgtad?', 'Ezt a galamboknak szántad?', 'A kapu arra van! A másik arra! …Egyik se arra.', 'Ez gólpassz volt. A galambnak.']);
    return pick(['Közepes. Lehetett volna jobb.', 'Hmm. A térdedet hajlítsd be jobban!', 'Majdnem jó. De csak majdnem.', 'Hármas alá. Vagyis… hármas.', 'Majdnem gól. A majdnem nem számít.', 'Ha a kapus alszik, ez gól lett volna.']);
  }
  if (db > 4) return pick(['Menj már a labdára!', 'Mit csinálsz ott? A labda ott van!', 'Ne sétálgass, a labdáért futni kell!', 'A labda nem fog odagurulni hozzád, nem kutya!', 'Ha így mész a labdáért, uzsonnára odaérsz.', 'A labdát keresed? Az a nagy fekete-fehér gömb.']);
  if (sp < 0.3) return pick(['Ne álldogálj! Mozogj!', 'Szobor vagy, vagy focista?', 'Gyerünk, ne aludj el!', 'Ne pózolj, nem fotózás van!', 'Gyökeret eresztettél?', 'A galambok többet mozognak nálad.']);
  if (sp > 4.5) return pick(['Ne rohangálj ennyit, oszd be az erőd!', 'Lassabban, ki fogsz fulladni!', 'Nem a sebesség a lényeg, hanem a fej!', 'Lassabban! A pálya nem fog elszaladni.', 'Te most focizol, vagy a buszt kéred?']);
  if (db < 1.2) return pick(['Fejet fel! Ne a labdát nézd!', 'Közelebb a lábadhoz a labdát!', 'Használd a bal lábad is!', 'Belsővel, ne spiccel!', 'Testtel takard a labdát!', 'Ne szerelmesen nézd a labdát, rúgd!', 'A labda nem fog elszökni… remélem.', 'A bal lábad nem dísz, használd!']);
  return pick(['Az én időmben ezt mezítláb csináltuk!', 'Figyeld a kaput, ne engem!', 'Rövidebb lépésekkel!', 'Térdet behajlítani!', 'Nem így! … Vagyis igen, de mégse.', 'Az én időmben a labda is nehezebb volt.', 'Ha így folytatod, a végén még jó leszel. Ne ijedj meg.', 'Puskás Öcsi is így kezdte. Na jó, nem így.', 'Gondolkodj, mielőtt rúgsz! …Ne ennyit!']);
}
function worryLine() {
  if (G.pstate !== 'riding') return pick(['Várj meg!', 'Hová mész?!']);
  const ro = roller, x = ro.pos.x, z = ro.pos.z;
  if (z > 10.5) return pick(['Ne menj az út közelébe!!', 'Ott jönnek az autók, gyere vissza!', 'Az úttest nem játszótér!']);
  if (ro.speed > 4.6) return pick(['Lassíts! LASSÍTS!', 'Nem versenypálya ez!', 'Ha elesel, ne nekem sírj!', 'Fékezz, fékezz!']);
  if (ro.speed > 1) {
    const ax = x + Math.sin(ro.heading) * 2.2, az = z + Math.cos(ro.heading) * 2.2;
    for (const c of colliders) {
      if (c.h < 0.5 || c === G.rollerCol) continue;
      const d = c.box ? Math.hypot(ax - clamp(ax, c.x0, c.x1), az - clamp(az, c.z0, c.z1)) : Math.hypot(ax - c.x, az - c.z) - c.r;
      if (d < 0.4) return pick(['Vigyázz, ott előtted!', 'Nézz előre, nekimész!', 'Kormányozz el! Jobbra! Vagy balra!']);
    }
  }
  for (const n of npcs) if (Math.hypot(n.actor.pos.x - x, n.actor.pos.z - z) < 2.4) return pick(['Vigyázz a nénire!', 'Csengess! Ja, nincs csengő…', 'Kerüld ki a bácsit!']);
  for (const an of animals) if (Math.hypot(an.pos.x - x, an.pos.z - z) < 2.6) return an.type === 'cat' ? 'Ne üsd el a cicát!' : 'Vigyázz a kutyára!';
  if (Math.abs(ro.turn) > 1.2 && ro.speed > 2) return pick(['Ne kanyarodj ilyen élesen!', 'Óvatosan a kanyarban!']);
  return pick(['Két kézzel fogd a kormányt!', 'Nézz előre, ne hátra!', 'Hajlítsd be a térded!', 'Lassabban, Petyus!', 'Sisak rajtad van? Jó.', 'Ne menj túl messzire!', 'Fékezz időben!', 'Jaj, a szívem…']);
}
const GRUMBLE = ['Ez a gyerek egyszer a frászt hozza rám…', 'Minek vettünk neki elektromos rollert…', 'A térdem… mindjárt leszakad.', 'Az én időmben görkorcsolya volt, az is fából.', 'Bezzeg ha én akarnék rollerezni…', 'Na, ennyi volt a nyugodt vasárnap.', 'Ki bírja ezt a sok futkározást?', 'Legközelebb ő hozza a táskát.'];
const BENCH_IDLE = ['Na, mi lesz? Focizni jöttünk vagy nézelődni?', 'Petyus, a pálya arra van!', 'A labda nem fog magától gurulni!', 'Ha nem focizol, mehetünk haza is.'];
export const ANGI_DEFEND = ['Petya, hagyd már szegény gyereket!', 'Szerintem nagyon ügyes!', 'Ne kiabálj, mindenki minket néz.', 'Te is ilyen voltál kicsiben?', 'Hagyd játszani, Petya!', 'Ügyes vagy, kicsim, ne figyelj apára!'];
export const GOAL_GRUMBLE = ['Na jó. De a bal lábaddal is menne?', 'Szerencsés volt. Még egyszer!', 'Ezt a nagymamád is berúgta volna.', 'Gól, gól… de a kapus hol volt?', 'Túl lassú volt a lövés, de mindegy.', 'Rendben, de ünnepelni ráérsz otthon!', 'Gól? Inkább a kapu állt rossz helyen.', 'Na jó, ezt most az egyszer elismerem. De senkinek ne mondd!', 'Szép. Az én góljaim szebbek voltak, de szép.'];
const LIMP = ['Áú… a derekam.', 'Semmi baj… csak egy kicsit… áú.', 'Angi, ugye nem láttad, ahogy elestem? …Nem estem el.', 'Holnaptól újra edzek. Holnapután. Jövő héten.', 'Ez a labda túl nehéz volt. Biztos vizes.'];

