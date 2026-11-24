// Petyus kalandjai – 2. rész, csibészség: „Karcsi nagy szökése” (r2-karcsi).
// Petyus lures Karcsi to the open cage door with a carrot, takes him out and puts him down on the floor (inventory.js). Karcsi
// runs round the flat (karcsi.js: hiding under the beds, the sofa, the table …, sniffing towards the kitchen). If he gets to
// mum's feet in the kitchen she shrieks („ÁÁÁÁÁ! EGY PATKÁNY!!”), jumps onto a chair and stays there while he is about – and
// the breakfast burns on the cooktop (smoke; dad: „Ég a rántotta!”). Dad gets up and chases him on all fours („Gyere ide, te
// kis… szőrgombóc!”), bumps his head under the table („Au!”); Karcsi bolts from hiding place to hiding place. In the end dad
// (or Petyus) catches him and puts him back: „Petyus! Délután nincs Xbox!” → late (+10 minutes).
// Stars: ★ Karcsi out in the flat · ★★ mum on the chair · ★★★ and Karcsi free for at least 60 seconds before dad catches him.
import { spawnFx } from '../actors.js';
import { noise, soundAt, tone } from '../audio.js';
import { award } from '../mischief.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { V3, clamp, lerp, pick } from '../util.js';
import { FY, SPOTS } from './home.js';
import { CAGE, HIDES, boltKarcsi, cageFront, closeCage, karcsiFree, karcsiHidden, karcsiPos, karcsiRoom, karcsiState, putKarcsiBack, takeKarcsi } from './karcsi.js';
import { invHooks } from './inventory.js';
import { findPath } from './navgrid.js';
import { addLate } from './ep2.js';
import { dadBusy } from './coffee.js';

export const rw = { phase: 'off', freeT: 0, scream: false, mom: 'cook', momT: 0, burnT: 0, burnSaid: false, dad: 'seat', dadT: 0, repathT: 0, bumped: false, nearHideT: 0, chaseT: 0 };
const MOM_CHAIR = { x: 10.4, z: 2.6 };
const COOKTOP = { x: 7.6, z: 0.31 };
const TABLE = { x0: 9.8, z0: 1.5, x1: 11.6, z1: 2.4 };
export const momBusy = () => rw.mom !== 'cook';
export const dadChasing = () => rw.dad !== 'seat';

// Karcsi on the floor: the escape starts (once per escape)
invHooks.karcsiFree = () => {
  if (rw.phase === 'off' || rw.phase === 'done') { Object.assign(rw, { phase: 'free', freeT: 0, scream: false, burnT: 0, burnSaid: false, bumped: false, chaseT: 0 }); say(G.petike, 'Szaladj, Karcsi! Szabad vagy!', 2.2); }
};
// Petyus put him back himself
invHooks.karcsiBack = () => { if (rw.phase === 'free') finish('petyus'); };

function finish(who) {
  rw.phase = 'done';
  closeCage();
  if (rw.dad !== 'seat') { rw.dad = 'toChair'; dadWalk(SPOTS.dadChair.x, SPOTS.dadChair.z, 1.2); }
  if (who === 'dad') say(G.petya, 'Megvan a szökevény! Vissza a börtönbe!', 2.6);
  setTimeout(() => say(G.angi, 'Petyus! Délután nincs Xbox!', 2.6), 2600);
  addLate(10);
  const stars = 1 + (rw.scream ? 1 : 0) + (rw.scream && rw.freeT >= 60 ? 1 : 0);
  setTimeout(() => award('r2-karcsi', Math.round(rw.freeT), { scream: rw.scream, stars }), 3200);
}
function dadWalk(x, z, sp) { const p = findPath(G.petya.pos.x, G.petya.pos.z, x, z); G.petya.walkTo(p && p.length ? p : [[x, z]], sp); }

// dad on all fours: the body tipped forward, the hands on the floor, the knees bent (after Actor.update, before sync). The body
// is then lifted (or lowered) so that the lowest of his knees, hands and feet just touches the floor.
const _b = new V3();
function crawlPose(a, k) {
  const r = a.rig, w = Math.sin(G.clockT * 7) * (a.path ? 1 : 0.2);
  r.inner.rotation.x = 1.2 * k; r.inner.position.set(0, 0, 0);
  for (let i = 0; i < 2; i++) {
    const s = i ? -1 : 1;
    r.hip[i].rotation.x = lerp(r.hip[i].rotation.x, -1.15 + s * w * 0.25, k); r.knee[i].rotation.x = lerp(r.knee[i].rotation.x, 1.5, k);
    r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -1.2 - s * w * 0.3, k); r.sh[i].rotation.z = 0; if (r.elbow) r.elbow[i] = 0.1;
    if (r.foot) r.foot[i].rotation.x = 0.6 * k;
  }
  a.sync(); r.root.updateMatrixWorld(true);
  let low = 1e9; const y0 = r.root.position.y;
  for (const b of [...r.knee, ...(r.handBones || []), ...(r.foot || [])]) { b.getWorldPosition(_b); low = Math.min(low, _b.y - y0); }
  r.inner.position.y = (0.07 - low) * k;   // knees and hands on the floor
  a.sync();
}

// ---------------------------------------------------------------- every frame (after the parents' update – ep2.js)
export function runawayTick(dt) {
  const m = G.angi, d = G.petya;
  if (rw.phase === 'free' && karcsiFree()) rw.freeT += dt;
  // ---- mum: shrieks, jumps onto the chair, stays up there while Karcsi is about
  const kp = karcsiPos(), inKitchen = karcsiFree() && karcsiRoom() === 'konyha';
  if (rw.phase === 'free' && rw.mom === 'cook' && !G.angiSearching && inKitchen && Math.hypot(kp.x - m.pos.x, kp.z - m.pos.z) < 2.2) {
    rw.mom = 'shriek'; rw.momT = 0; rw.scream = true;
    say(m, 'ÁÁÁÁÁ! EGY PATKÁNY!!', 2.2); soundAt(m.pos.x, m.pos.z, () => { tone('sine', 1200, 1700, 0.5, 0.06); tone('sine', 1500, 2000, 0.6, 0.05, 0.4); });
    setTimeout(() => say(G.petike, 'Anya, ez Karcsi!', 1.8), 1300);
  }
  if (rw.mom === 'shriek') { rw.momT += dt; m.cheer = 0.5; if (rw.momT > 0.9) { rw.mom = 'toChair'; m.walkTo([[MOM_CHAIR.x - 0.6, MOM_CHAIR.z + 0.3], [MOM_CHAIR.x, MOM_CHAIR.z]], 3.2); } }
  else if (rw.mom === 'toChair' && !m.path) { rw.mom = 'onChair'; rw.momT = 0; rw.burnT = 0; }
  if (rw.mom === 'onChair') {
    rw.momT += dt; rw.burnT += dt;
    m.rig.root.position.y = FY + 0.45; m.targetHeading = Math.atan2(kp.x - m.pos.x, kp.z - m.pos.z);
    const r = m.rig, w = Math.sin(G.clockT * 8) * 0.15; r.sh[0].rotation.x = -2.7 + w; r.sh[1].rotation.x = -2.7 - w; r.sh[0].rotation.z = -0.3; r.sh[1].rotation.z = 0.3; m.rig.apply(); m.rig.root.position.y = FY + 0.45;
    if (Math.random() < dt * 0.3) say(m, pick(['Vigyétek innen!', 'Petya, csinálj valamit!', 'Nem jövök le!', 'Ííí! Erre jön!']), 1.8);
    // the breakfast burns meanwhile: smoke from the pan, dad notices
    if (rw.burnT > 3 && Math.random() < dt * 8) spawnFx(new V3(COOKTOP.x + 0.15, FY + 1.05, COOKTOP.z + 0.12), new V3((Math.random() - 0.5) * 0.15, 0.45, (Math.random() - 0.5) * 0.15), pick([0x555555, 0x6b6b6b, 0x444444]), 0.06 + Math.random() * 0.05, 2.2, -0.1);
    if (rw.burnT > 6 && !rw.burnSaid) { rw.burnSaid = true; say(d, 'Ég a rántotta!', 2); soundAt(COOKTOP.x, COOKTOP.z, () => noise(1.2, 3000, 0.6, 0.05)); }
    // down again when he has been out of the kitchen (and not near her) for 3 seconds
    const away = !karcsiFree() || (karcsiRoom() !== 'konyha' && Math.hypot(kp.x - m.pos.x, kp.z - m.pos.z) > 3);
    if (away && (rw.awayT = (rw.awayT || 0) + dt) > 3 && rw.momT > 8) {
      rw.awayT = 0; rw.mom = 'down'; m.rig.root.position.y = FY;
      say(m, 'Huh… Petyus, ezt még megbeszéljük!', 2.4);
      m.walkTo([[SPOTS.momCook.x, SPOTS.momCook.z]], 1.4);
    } else if (!away) rw.awayT = 0;
  }
  if (rw.mom === 'down' && !m.path) rw.mom = 'cook';
  // ---- dad: up from his chair, then after Karcsi on all fours
  if (rw.phase === 'free' && rw.dad === 'seat' && (rw.scream || rw.freeT > 30) && karcsiFree() && !dadBusy()) {
    rw.dad = 'up'; rw.dadT = 0; d.sitTarget = 0;
    say(d, pick(['Na majd én! Gyere ide, te kis… szőrgombóc!', 'Majd én elkapom!']), 2.4);
  }
  if (rw.dad === 'up') { rw.dadT += dt; if (d.sit < 0.1) { rw.dad = 'crawl'; rw.repathT = 0; rw.chaseT = 0; } }
  if (rw.dad === 'crawl') {
    rw.chaseT += dt;
    if (!karcsiFree() && rw.phase !== 'free') { rw.dad = 'toChair'; dadWalk(SPOTS.dadChair.x, SPOTS.dadChair.z, 1.2); }
    else if (karcsiFree()) {
      if ((rw.repathT -= dt) <= 0) { rw.repathT = 0.5; dadWalk(kp.x, kp.z, 0.75); }
      // under the table: bump!
      const p = d.pos; if (!rw.bumped && p.x > TABLE.x0 && p.x < TABLE.x1 && p.z > TABLE.z0 && p.z < TABLE.z1) {
        rw.bumped = true; say(d, 'Au! A fejem!', 1.8); say({ headWorld: (o) => o.set(p.x, FY + 0.9, p.z) }, 'KONG!', 1.0); soundAt(p.x, p.z, () => { tone('sine', 220, 180, 0.3, 0.12); noise(0.1, 800, 1, 0.2); });
      }
      const dk = Math.hypot(kp.x - p.x, kp.z - p.z);
      if (karcsiHidden()) {   // he waits by the hiding place, reaches in – Karcsi bolts
        if (dk < 0.75) { rw.nearHideT += dt; if (rw.nearHideT > 2.2) { rw.nearHideT = 0; say(d, pick(['Gyere ki onnan!', 'Látlak ám!', 'Na, megvagy… nem.']), 1.8); if (karcsiState().bolts < 3 || rw.chaseT < 25) { boltKarcsi(); rw.graceT = 1.5; } } }
      } else rw.nearHideT = 0;
      // caught: close enough while he is out in the open (or tired out under a hiding place)
      rw.graceT = Math.max(0, (rw.graceT || 0) - dt);   // just reached under the furniture: he slips past
      if (dk < 0.38 && rw.graceT <= 0 && (!karcsiHidden() || karcsiState().bolts >= 3)) {
        takeKarcsi('dad'); rw.dad = 'carry'; say(d, 'MEGVAGY!', 1.6);
        const cf = cageFront(); dadWalk(cf.x, cf.z + 0.15, 1.1);
      }
    }
    crawlPose(d, 1);
  }
  if (rw.dad === 'carry' && !d.path) {   // at the cage: in he goes, the door shut
    putKarcsiBack(); d.targetHeading = Math.PI; finish('dad');
  }
  if (rw.dad === 'toChair' && !d.path) {
    rw.dad = 'seat'; d.place(SPOTS.dadChair.x, SPOTS.dadChair.z, SPOTS.dadChair.h); d.pos.y = FY; d.seatH = 0.45; d.sitTarget = 1;
  }
}
export const runawayActive = () => rw.phase === 'free' || rw.mom !== 'cook' || rw.dad !== 'seat';
void CAGE; void HIDES; void clamp;
