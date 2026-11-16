// Petike a parkban – activities/cat: Tétlenség → magától focizás → macskatámadás → az apa a fára dobja a macskát.
import * as THREE from 'three';
import { animLegs, spawnFx } from '../actors.js';
import { noise, sBird, sMeow, soundAt } from '../audio.js';
import { atHeight, cine, cineCap, cineEnd, cineFocus, cineStart, slowMo } from '../cine.js';
import { G_IN, G_OUT, dad, inPitch, navTarget, petyaFront } from '../dad.js';
import { pvel } from '../player.js';
import { CAM_OFF, scene } from '../scene.js';
import { G, animals, ball } from '../state.js';
import { say } from '../ui.js';
import { $, R, V3, clamp, dampAngle, lerp, pick, rand, smooth } from '../util.js';
import { FENCE, GX0, GX1, GZ0, GZ1, PITCH, TREES, groundH, partMesh, treeTop } from '../world.js';
import { setPrompt } from './drinking.js';
import { autoRun, ftn, ftnMom, runSeq } from './fountain.js';

// ---------- idle on the pitch → Petike plays alone → a cat attacks → dad throws the cat onto a tree
// pstate: free → autoBall → catScared → catChased → catSafe → catToMom → catAtMom → free
// petyaMode: bench → catStand → catRun → catCarry → catThrow → catCurse → return → seat
// cat (an.evt): approach → hiss → chase → held → flying → tree (stays there for good)
export const CAT_STATES = ['catScared', 'catChased', 'catSafe', 'catToMom', 'catAtMom'];
const CAT_IDLE = 10, CAT_COME = 3.5, CAT_DAD = 10;   // s: standing still before auto-play · auto-play before the cat · chase before dad steps in
export const cev = { idleT: 0, autoT: 0, cat: null, t: 0, lineT: 0, tree: null, spot: null, from: new V3(), to: new V3(), loopA: 0, throwT: 0 };
const CHASE_LOOP = { rx: 8, rz: 4.6 };                    // chase loop round the centre spot
const loopPt = (ang) => [PITCH.cx + Math.cos(ang) * CHASE_LOOP.rx, PITCH.cz + Math.sin(ang) * CHASE_LOOP.rz];
const catVoice = (an) => ({ headWorld: (v) => v.set(an.pos.x, (an.y || 0) + 0.7, an.pos.z) });
const sHiss = () => { noise(0.55, 3400, 0.7, 0.2); noise(0.45, 5600, 1.2, 0.1, 0.05); };
const CAT_HISS = ['FFFHHH!', 'Pssszt… FFFHHH!', 'Rrrrr… FFF!', 'HHHHH!'];
const CAT_PANIC = ['Segítség! Macska!', 'Apaaa! Megesz a macska!', 'Nem bántottalak!!', 'Anyaaa!', 'Miért pont engem?!', 'Gyorsabb, mint én!!'];
const CAT_DAD_RUN = ['Félre, jövök!', 'Cicc! Cicc… gyere csak ide!', 'Na megállj, te szőrgombóc!'];
// camera focus for a point in the air: the ground point on the same view ray (ortho camera looks along −CAM_OFF)
const airFocus = (x, y, z) => ({ x: x - y * CAM_OFF.x / CAM_OFF.y, z: z - y * CAM_OFF.z / CAM_OFF.y });
const CAT_TREE_MEOW = 12;     // s: the cat on the tree meows at this interval
export function idleFootball(dt, anyInput) {
  const a = G.petike;
  if (cine.on) anyInput = false;   // no taking over during a cutscene
  if (anyInput) {
    cev.idleT = 0;
    if (G.pstate === 'autoBall') { G.pstate = 'free'; if (cev.cat && cev.cat.evt === 'approach') { cev.cat.evt = null; cev.cat = null; } }
    return null;
  }
  if (G.pstate === 'free') {
    const still = Math.hypot(pvel.x, pvel.z) < 0.3 && a.kickT < 0;
    if (still && inPitch(a.pos.x, a.pos.z) && G.petyaMode === 'bench' && ball.active) cev.idleT += dt; else cev.idleT = 0;
    if (cev.idleT < CAT_IDLE) return null;
    G.pstate = 'autoBall'; cev.autoT = 0; cev.idleT = 0;
    say(a, pick(['Unatkozom… akkor játszom magamnak!', 'Jó, akkor egyedül focizok!', 'Senki nem játszik velem? Na jó!']), 2.4);
    runSeq([[2.2, () => { if (G.pstate === 'autoBall') { say(G.petya, pick(['Na végre, magától is megy!', 'Látod? Nem kell ide állandóan engem hallgatni!']), 2.4); G.petya.point = 1.2; dad.talkT = 6; } }]]);
  }
  // auto-play: get behind the ball, dribble towards the nearer goal, shoot when close
  cev.autoT += dt;
  if (cev.autoT > CAT_COME && !cev.cat) callCat();
  if (!ball.active || G.goalLock > 0) return { wx: 0, wz: 0 };
  const gx = ball.pos.x > PITCH.cx ? PITCH.x1 : PITCH.x0;
  let gdx = gx - ball.pos.x, gdz = -ball.pos.z; const gl = Math.hypot(gdx, gdz) || 1; gdx /= gl; gdz /= gl;
  const bx = ball.pos.x - gdx * 0.4, bz = ball.pos.z - gdz * 0.4, dx = bx - a.pos.x, dz = bz - a.pos.z, d = Math.hypot(dx, dz);
  const facing = Math.sin(a.heading) * gdx + Math.cos(a.heading) * gdz;
  if (d < 0.6 && gl < 9 && a.kickT < 0 && facing > 0.85) { a.kickT = 0; G.kickPower = R(0.35, 0.65); G.kickDone = false; }
  return d > 0.35 ? { wx: dx / d * 0.75, wz: dz / d * 0.75 } : { wx: gdx * 0.75, wz: gdz * 0.75 };
}
function callCat() {
  let best = null, bd = 1e9;
  for (const an of animals) if (an.type === 'cat' && !an.evt) { const d = an.pos.distanceTo(G.petike.pos); if (d < bd) { bd = d; best = an; } }
  cev.cat = best || false;           // false: no cats left on the ground → just keep playing
  if (!best) return;
  // it creeps out from under the bushes south of the pitch, close to Petike – cutscene!
  best.evt = 'sneak'; best.y = 0; best.sneakT = 0;
  best.pos.set(clamp(G.petike.pos.x + R(-3, 3), FENCE.x0 + 2, FENCE.x1 - 2), 0, 12.4); best.heading = Math.PI;
  cineStart(() => best.pos, 4.2);
  cineCap('Eközben, a bokor alján…', 3.2);
}
// the event cat (bypasses the normal cat AI; slips through the pitch fence like real cats do)
export function updateEvtCat(an, dt) {
  const a = an.a, P = G.petike.pos; let moving = 0, spd = 0;
  a.body.rotation.set(0, 0, 0); a.body.position.y = 0; a.tail.rotation.x = -0.3;
  const go = (tx, tz, sp) => { const dx = tx - an.pos.x, dz = tz - an.pos.z, d = Math.hypot(dx, dz); if (d < 0.05) return d; const st = Math.min(d, sp * dt); an.pos.x += dx / d * st; an.pos.z += dz / d * st; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 9, dt); moving = 1; spd = sp; return d; };
  if (an.evt === 'sneak') {
    // creeping low, eyes on the boy who dared to wake it up
    an.sneakT += dt; go(P.x, P.z, 0.9); a.body.position.y = -0.05; a.tail.rotation.x = -0.1;
    if (an.sneakT > 2.8) {
      an.evt = 'approach';
      cineFocus(() => atHeight((an.pos.x + P.x) / 2, 0.6, (an.pos.z + P.z) / 2), 6.5);
      cineCap('…valaki nagyon nem szereti, ha a délutáni alvását focilabda zavarja.', 3.6);
    }
  } else if (an.evt === 'approach') {
    const d = go(P.x, P.z, 3.4);
    if (d < 1.4) { an.evt = 'hiss'; sHiss(); say(catVoice(an), 'FFFHHH!', 1.4, ''); G.pstate = 'catScared'; cev.t = 0; pvel.set(0, 0, 0); G.charging = false; G.petike.kickT = -1; $('charge').style.display = 'none'; setPrompt('');
      say(G.petike, pick(['Á-á-á! Egy macska!', 'Jaj! Ez a cica nagyon mérges!']), 1.8);
      slowMo(0.35, 1.3); cineFocus(null, 3.8); cineCap('Ez nem fog jól végződni.', 2.4); }
  } else if (an.evt === 'hiss') {
    an.heading = dampAngle(an.heading, Math.atan2(P.x - an.pos.x, P.z - an.pos.z), 9, dt);
    a.body.position.y = 0.05; a.body.rotation.x = 0.15; a.tail.rotation.x = -1.3;   // arched back, tail up
  } else if (an.evt === 'chase') {
    const h = G.petike.heading, tx = P.x - Math.sin(h) * 1.2, tz = P.z - Math.cos(h) * 1.2, d = Math.hypot(tx - an.pos.x, tz - an.pos.z);
    go(tx, tz, clamp(d * 3, 2, 5.4)); a.tail.rotation.x = -1.2;
    cev.lineT -= dt; if (cev.lineT <= 0) { cev.lineT = R(1.8, 2.6); sHiss(); say(catVoice(an), pick(CAT_HISS), 1.3, ''); }
  } else if (an.evt === 'held') {
    const p = G.petya, h = p.heading; an.heading = h + Math.PI / 2;
    an.pos.set(p.pos.x + Math.sin(h) * 0.45, 0, p.pos.z + Math.cos(h) * 0.45); an.y = 0.75;
    a.body.rotation.z = 0.25; moving = 1; spd = 3;                                      // wriggling, paws paddling in the air
  } else if (an.evt === 'flying') {
    cev.throwT += dt; const k = Math.min(1, cev.throwT / 1.1);
    an.pos.lerpVectors(cev.from, cev.to, k); an.y = lerp(cev.from.y, cev.to.y, k) + Math.sin(k * Math.PI) * 2.6;
    a.body.rotation.x = k * Math.PI * 4; moving = 1; spd = 4;
    if (k >= 1) { an.evt = 'tree'; an.y = cev.to.y; an.wait = CAT_TREE_MEOW;
      noise(0.5, 900, 0.6, 0.25); for (let i = 0; i < 18; i++) spawnFx(new V3(an.pos.x, an.y + 0.2, an.pos.z), new V3(R(-1.5, 1.5), R(0.5, 2), R(-1.5, 1.5)), pick([0x4f9a3a, 0x6bbf4e, 0x3d7d2c]), 0.07, 0.8, 5);
      scatterBirds(an.pos.x, an.y, an.pos.z);
      soundAt(an.pos.x, an.pos.z, sMeow, 1.4); say(catVoice(an), 'Miaú?!', 1.6, ''); onCatLanded(); }
  } else if (an.evt === 'tree') {
    // stuck up there for good – meows at a steady interval
    an.wait -= dt; if (an.wait <= 0) { an.wait = CAT_TREE_MEOW; soundAt(an.pos.x, an.pos.z, sMeow, 1.4); say(catVoice(an), pick(['Miaú…', 'Miaaaú!', 'Mrrr… miaú.', 'MIAÚ!']), 1.4, ''); }
  }
  an.phase += dt * spd * 9; animLegs(a, an.phase, moving);
  if (an.evt === 'held') { for (let i = 0; i < 4; i++) a.legs[i].rotation.x = Math.sin(G.clockT * 22 + i * 1.7) * 0.9; }
  if (!moving && an.evt !== 'hiss') { a.legs[2].rotation.x = -1.2; a.legs[3].rotation.x = -1.2; a.body.rotation.x = -0.3; a.body.position.y = -0.04; }
  a.tail.rotation.z = Math.sin(G.clockT * (an.evt === 'chase' || an.evt === 'hiss' ? 14 : 2)) * 0.3;
  a.root.position.set(an.pos.x, an.y || (an.evt === 'tree' ? 0 : groundH(an.pos.x, an.pos.z)), an.pos.z); a.root.rotation.y = an.heading;
}
export function updateCatPetike(dt) {
  const a = G.petike, r = a.rig, cat = cev.cat;
  G.kickPressed = G.kickReleased = false; G.usePressed = false; cev.t += dt;
  const face = (x, z, k = 8) => { a.heading = dampAngle(a.heading, Math.atan2(x - a.pos.x, z - a.pos.z), k, dt); };
  if (G.pstate === 'catScared') {
    face(cat.pos.x, cat.pos.z, 10); a.animate(dt, false, 0);
    const k = Math.min(1, cev.t * 4); r.sh[0].rotation.x = -2.8 * k; r.sh[1].rotation.x = -2.8 * k; r.sh[0].rotation.z = -0.4 * k; r.sh[1].rotation.z = 0.4 * k;
    r.inner.position.y += Math.abs(Math.sin(cev.t * 14)) * 0.06;   // trembling hop
    if (cev.t > 1.3) {
      G.pstate = 'catChased'; cat.evt = 'chase'; cev.t = 0; cev.lineT = 0.8;
      const dx = a.pos.x - PITCH.cx, dz = a.pos.z - PITCH.cz; cev.loopA = Math.atan2(dz / CHASE_LOOP.rz, dx / CHASE_LOOP.rx);
      say(a, 'Segítség!!!', 1.6);
      cineEnd(10.5);   // wide shot for the merry-go-round
      runSeq([
        [3.0, () => { say(G.petya, pick(['Csak egy macska, Petike! Ne fuss el előle!', 'Állj meg és nézz rá szigorúan!']), 2.6); G.petya.point = 1.5; }],
        [3.5, () => { say(G.angi, 'Petya! Csinálj már valamit!', 2.4); }],
        [CAT_DAD - 6.5, () => {
          // cutscene: the hero rises from the bench
          cineStart(() => atHeight(G.petya.pos.x, 1.2, G.petya.pos.z), 4.0); cineCap('Ekkor Petya úgy döntött: elég volt.', 3.0);
          say(G.petya, 'Jó, jó, megyek már! A térdem…', 2.4); G.petyaMode = 'catStand'; G.petya.sitTarget = 0; G.petya.path = null; dad.lineT = 2.5;
        }],
      ]);
    }
  } else if (G.pstate === 'catChased') {
    // round and round the centre circle, the cat hissing at his heels
    cev.loopA += 4.1 / ((CHASE_LOOP.rx + CHASE_LOOP.rz) / 2) * dt;
    const t = loopPt(cev.loopA + 0.45), dx = t[0] - a.pos.x, dz = t[1] - a.pos.z, d = Math.hypot(dx, dz), sp = 4.4;
    if (d > 0.01) { const st = Math.min(d, sp * dt); a.pos.x += dx / d * st; a.pos.z += dz / d * st; face(t[0], t[1], 12); }
    a.animate(dt, true, sp);
    const w = Math.sin(G.clockT * 18) * 0.4; r.sh[0].rotation.x = -2.6 + w; r.sh[1].rotation.x = -2.6 - w; r.sh[0].rotation.z = -0.35; r.sh[1].rotation.z = 0.35;   // arms flailing above the head
    cev.lineT -= dt; if (cev.lineT <= 0) { cev.lineT = R(2.2, 3.0); say(a, pick(CAT_PANIC), 1.9); }
  } else if (G.pstate === 'catSafe') {
    face(G.petya.pos.x, G.petya.pos.z); a.animate(dt, false, 0);
    r.inner.rotation.x = 0.3; r.sh[0].rotation.x = -0.5; r.sh[1].rotation.x = -0.5;   // hands on knees, panting
  } else if (G.pstate === 'catToMom') {
    if (autoRun(a, 3.2, dt)) {
      G.pstate = 'catAtMom'; cev.t = 0;
      runSeq([
        [0.0, () => say(a, 'Anyaaa! Megtámadott egy macska!', 2.4)],
        [2.4, () => say(G.angi, 'Jaj, kicsim! Nagyon megijedtél?', 2.4)],
        [2.4, () => say(a, 'Csak egy kicsit… De apa feldobta a fára!', 2.4)],
        [2.6, () => say(G.angi, 'A fára?! …Petya!', 2.2)],
        [2.2, () => { G.pstate = 'free'; cev.cat = null; cev.idleT = 0; }],
      ]);
    }
  } else if (G.pstate === 'catAtMom') {
    a.heading = dampAngle(a.heading, Math.PI, 8, dt); a.animate(dt, false, 0);
  }
  a.pos.x = clamp(a.pos.x, GX0 + 1, GX1 - 1); a.pos.z = clamp(a.pos.z, GZ0 + 1, GZ1 - 1);
  a.sync();
}
function pickCatTree(x) {
  // a tree north of the pitch fence (nearest to x), leafy ones preferred
  let best = null, bd = 1e9;
  for (const t of TREES) {
    if (t.z > FENCE.z0 - 2 || t.z < FENCE.z0 - 9 || t.x < FENCE.x0 - 4 || t.x > FENCE.x1 + 4) continue;
    const d = Math.abs(t.x - x) + (t.id === 'oak' ? 0 : 4) + Math.abs(t.z - (FENCE.z0 - 4.5)) * 0.3;
    if (d < bd) { bd = d; best = t; }
  }
  if (!best) for (const t of TREES) { const d = Math.hypot(t.x - x, t.z - FENCE.z0); if (d < bd) { bd = d; best = t; } }
  return best;
}
export function updateDadCat(dt) {
  const p = G.petya, cat = cev.cat;
  dad.lineT -= dt;
  if (G.petyaMode === 'catStand') { if (p.sit < 0.05) { p.walkTo([petyaFront()], 2.2); G.petyaMode = 'catLeave'; } return; }   // step out in front of the bench first
  if (G.petyaMode === 'catLeave') { if (!p.path) { G.petyaMode = 'catRun'; cineFocus(() => ({ x: (p.pos.x * 2 + cat.pos.x) / 3, z: (p.pos.z * 2 + cat.pos.z) / 3 }), 7.5); cineCap('A térde tiltakozott. Petya nem hallgatott rá.', 3.2); } return; }
  if (G.petyaMode === 'catRun') {
    const t = navTarget(p.pos, [cat.pos.x, cat.pos.z]);
    p.path = [new V3(t[0], 0, t[1])]; p.speed = 5.0; p.keepHeading = false;
    if (dad.lineT <= 0) { dad.lineT = R(2.4, 3.2); say(p, pick(CAT_DAD_RUN), 2.0); }
    if (cat.evt === 'chase' && Math.hypot(p.pos.x - cat.pos.x, p.pos.z - cat.pos.z) < 0.75 && inPitch(p.pos.x, p.pos.z)) {
      cat.evt = 'held'; G.pstate = 'catSafe'; G.petyaMode = 'catCarry'; p.path = null; cev.t = 0;
      sMeow(); say(catVoice(cat), 'MRRRÁÚÚ!', 1.5, '');
      say(p, pick(['Megvagy, te kis szőrös terrorista!', 'Megvagy! Na, most beszélgetünk!']), 2.4);
      say(G.petike, pick(['Huh… köszi, apa!', 'Hű… ez meleg helyzet volt!']), 2.2);
      cev.tree = pickCatTree(cat.pos.x);
      cev.spot = [clamp(cev.tree.x, FENCE.x0 + 0.8, FENCE.x1 - 0.8), FENCE.z0 + 0.7];
      slowMo(0.3, 1.5); cineFocus(() => atHeight(p.pos.x, 1.1, p.pos.z), 3.6); cineCap('Egy apa nem ismer lehetetlent.', 3.0);
      runSeq([[1.6, () => cineFocus(() => ({ x: (p.pos.x + cev.spot[0]) / 2, z: (p.pos.z + cev.spot[1]) / 2 }), 6.5)]]);
    }
    return;
  }
  if (G.petyaMode === 'catCarry') {
    const s = cev.spot, d = Math.hypot(p.pos.x - s[0], p.pos.z - s[1]);
    if (d > 0.12) { p.path = [new V3(s[0], 0, s[1])]; p.speed = 1.8; p.keepHeading = false; p.rig.sh[0].rotation.x = -1.3; p.rig.sh[1].rotation.x = -1.3; }
    else { p.path = null; G.petyaMode = 'catThrow'; cev.t = 0; p.targetHeading = Math.atan2(cev.tree.x - p.pos.x, cev.tree.z - p.pos.z); say(p, 'Na, repülni tanulunk!', 1.6); }
    p.sync(); return;
  }
  if (G.petyaMode === 'catThrow') {
    cev.t += dt; const r = p.rig;
    if (cev.t < 0.9) { const k = smooth(Math.min(1, cev.t / 0.9)); r.sh[0].rotation.x = lerp(-1.3, -3.0, k); r.sh[1].rotation.x = lerp(-1.3, -3.0, k); }   // wind-up over the head
    else if (cat.evt === 'held') {
      cat.evt = 'flying'; cev.throwT = 0;
      cev.from.set(cat.pos.x, 1.9, cat.pos.z); cev.to.set(cev.tree.x, treeTop(cev.tree) - 0.12, cev.tree.z);
      noise(0.35, 1500, 0.8, 0.2); say(p, 'HOPP!', 1.2); p.cheer = 0;
      cev.from.y = 1.9; cat.y = 1.9;
      cineFocus(() => airFocus(cat.pos.x, cat.y || 0, cat.pos.z), 7.5);   // follow the flying cat
    }
    if (cev.t >= 0.9) { const k = Math.min(1, (cev.t - 0.9) / 0.25); r.sh[0].rotation.x = lerp(-3.0, -1.2, k); r.sh[1].rotation.x = lerp(-3.0, -1.2, k); }
    p.sync(); return;
  }
  if (G.petyaMode === 'catCurse') {
    p.targetHeading = Math.atan2(cev.tree.x - p.pos.x, cev.tree.z - p.pos.z);
  }
}
function onCatLanded() {
  // Petike heads to mom (through the pitch gate), dad stays and has a word with the cat
  const P = G.petike.pos;
  G.pstate = 'catToMom'; ftn.path = inPitch(P.x, P.z) ? [G_IN, G_OUT, ftnMom()] : [ftnMom()]; ftn.stuckT = 0; ftn.ghostT = 0; ftn.lastP.copy(P);
  G.petyaMode = 'catCurse';
  const p = G.petya, cat = cev.cat, top = airFocus(cat.pos.x, cat.y, cat.pos.z);
  cineFocus(() => top, 6.5); cineCap('A fa lakói nem örültek a vendégnek.', 3.0);
  runSeq([[3.0, () => cineEnd(8.5)]]);   // back to Petike
  runSeq([
    [0.8, () => { say(G.angi, 'PETYA! Az egy cica volt!', 2.2); }],
    [1.8, () => { say(p, 'Most már fáramászó cica!', 2.2); p.point = 2; }],
    [2.4, () => { say(p, 'Te #@&%! szőrgombóc! Ha még egyszer a gyerek közelébe mész…', 2.8); p.point = 2.8; }],
    [3.0, () => { say(p, '…akkor @#%&! a tűzoltók szednek le, de csak jövő kedden!', 2.8); p.point = 2.8; }],
    [3.0, () => { sMeow(); say(catVoice(cat), 'Miaú.', 1.4, ''); }],
    [1.4, () => { say(p, 'Ne miákolj itt nekem! #@&%!', 2.2); p.point = 2; }],
    [2.4, () => { say(p, pick(['Na. Ennyi volt a vasárnapi pihenés.', 'A térdem… megérte.']), 2.4); G.petyaMode = 'return'; dad.talkT = 7; }],
  ]);
}

// ---------- bird flock (cat scene)
// a flock of small birds bursting out of the tree the cat landed in
const flock = [];
function makeSparrow() {
  const col = pick([[0x8b5a2b, 0xd9b48f], [0x6b6f7a, 0xe8e2d0], [0xa0522d, 0xf4d58d], [0x3a3a3a, 0xc9c9c9]]);
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0, 0, 0.08, 0.07, 0.13, col[0], 0, 0); b.bx(0, -0.015, 0.01, 0.07, 0.04, 0.1, col[1], 0, 0);
    b.bx(0, 0.04, 0.07, 0.06, 0.06, 0.06, col[0], 0, 0); b.bx(0, 0.035, 0.11, 0.02, 0.02, 0.03, 0xf2c14e, 0, 0);
    b.bx(0, 0.01, -0.09, 0.05, 0.02, 0.07, col[0], 0, 0);
  }));
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.04, 0.02, 0); body.add(w); w.add(partMesh((b) => b.box(s * 0.06, 0, 0, 0.12, 0.015, 0.09, col[0], 0, 0))); wings.push(w); }
  return { root, wings };
}
function scatterBirds(x, y, z) {
  for (let i = 0; i < 16; i++) {
    const b = makeSparrow(); scene.add(b.root);
    const a = rand() * Math.PI * 2, sp = R(3, 6.5);
    flock.push({ b, pos: new V3(x + R(-0.6, 0.6), y + R(-0.5, 0.4), z + R(-0.6, 0.6)), vel: new V3(Math.cos(a) * sp, R(1.2, 3.2), Math.sin(a) * sp), t: R(4.5, 7), ph: rand() * 6 });
  }
  soundAt(x, z, () => { for (let i = 0; i < 6; i++) noise(0.25, R(600, 1100), 0.8, 0.1, i * 0.05); for (let i = 0; i < 5; i++) sBird(R(0, 0.8)); }, 1.6);
}
export function updateFlock(dt) {
  for (let i = flock.length - 1; i >= 0; i--) {
    const f = flock[i]; f.t -= dt;
    f.vel.y += Math.sin(G.clockT * 3 + f.ph) * 1.5 * dt;            // a little bobbing in flight
    f.pos.addScaledVector(f.vel, dt);
    for (const w of f.b.wings) w.rotation.z = Math.sin(G.clockT * 34 + f.ph) * 1.0 * (w.position.x > 0 ? 1 : -1);
    f.b.root.position.copy(f.pos); f.b.root.rotation.y = Math.atan2(f.vel.x, f.vel.z);
    if (f.t <= 0) { scene.remove(f.b.root); flock.splice(i, 1); }
  }
}

