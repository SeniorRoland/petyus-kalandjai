// Petyus kalandjai – 2. rész: az iskola (8:00–15:30) – a tököli Weöres Sándor Általános Iskola fényképe és légifotója alapján.
// Egyelőre csibészségek nélkül.
//  · A főépület hosszú, kelet–nyugati, háromszintes (földszint + 2 emelet), lapostetős, a tetőn napelemek; fehér vakolat narancs
//    sávokkal (földszinti lábazat, az 1. emelet ablakai alatt), a tető alatt krémszínű sáv, fehér keretes, osztott ablakok.
//    Nyugati végén a narancs tömb fehér szalagablakokkal; mellette a bejárat: sötétbarna fa előtető két vékony oszlopon, rajta
//    a felirat, betonlépcső oldalfalakkal, üvegajtó.
//  · Délre hozzá kapcsolódik a kétszintes, négyzetes épület (tornaterem / ebédlő), attól délre a nagy füves pálya az Iskola utcáig.
//  · Északon a városi sportcsarnok (piros nyeregtető, napelemek), keletre mellette a kék műanyag borítású sportpálya.
//  · A bejárat előtt térkő, kerékpártámaszok, betonpadok fa ülőlappal, fa szemetesek, platánok; nyugaton a Kossuth Lajos utca
//    (ott a kapu), délen az Iskola utca, keleten az Aradi utca, körben piros tetős családi házak.
// Bent csak a főépület földszintje járható: a folyosó és három terem. Amíg Petyus bent van, az emeletek eltűnnek, a kamera felőli
// falak lesüllyednek. A kapunál: E – hazaindulás (→ otthon délután).
import * as THREE from 'three';
import { Actor, spawnFx } from '../actors.js';
import { makePerson } from '../rigs.js';
import { CAM_OFF, scene, sun } from '../scene.js';
import { G } from '../state.js';
import { isTouch } from '../input.js';
import { bigText, say } from '../ui.js';
import { award } from '../mischief.js';
import { R, V3, damp, pick } from '../util.js';
import { addBoxCol, colliders, partMesh, vcMat } from '../world.js';
import { TOILET, toiletSeatGeometry } from '../voxels-home.js';
import { canPee, pee, peeFlushed, startPee } from './pee.js';
import { noise, soundAt, tone } from '../audio.js';
import { buildFurniture, put, wallView } from './home.js';
import { getGeometry } from '../voxels.js';
import { TIMETABLE, WRITERS, boardText, hungaryMap, makeClock, portrait, timesTable, timetable } from './posters.js';

const FLOOR = 3.3, TW = 0.25;
// the main building (only its ground floor is inside the game): x 0 … 36, z −12 … 0; the corridor along its south side
export const SCHOOL = { x0: 0, x1: 36, z0: -12, z1: 0 };
const CORR = -2.6;                                     // the corridor's north wall (the classrooms behind it)
const WING = { x0: -9, x1: 0, z0: -15, z1: 4 };        // the orange block at the west end
const LOW = { x0: 14, x1: 32, z0: 1.5, z1: 16 };       // the two-storey square building (gym / dining hall) south of it
const HALL = { x0: 6, x1: 34, z0: -46, z1: -24 };      // the town's sports hall
const COURT = { x0: 38, x1: 60, z0: -42, z1: -27 };    // the blue court
const FIELD = { x0: 2, x1: 44, z0: 21, z1: 40 };       // the grass field
const CAMPUS = { x0: -18, x1: 64, z0: -58, z1: 42 };   // the school's fence
export const GATE = { x: -18, z: 8 };                  // the gate to Kossuth Lajos utca (west)
export const SCHOOL_START = { x: -16.4, z: 8, h: Math.PI / 2 };   // just inside the gate, facing the school
export const BOUNDS = { x0: -21, x1: 63, z0: -57, z1: 41 };
const C = { white: 0xf2f1ec, orange: 0xef8f4e, orangeD: 0xe07c3c, cream: 0xf2dfb4, frame: 0xffffff, glass: 0x7c93a6, curtain: 0xeef0f2,
  wallIn: 0xf6f1e6, board: 0x2f4f3f, boardFrame: 0x8a6a4a, floorClass: 0xc9a27a, floorHall: 0xd8d2c4,
  paver: [0xa9a8a4, 0xb2b1ad, 0x9f9e9a], red: [0xc9826b, 0xbf7a63], asphalt: 0x5d6066, line: 0xf4f4f4, grass: [0x7db556, 0x86bd5c, 0x78b052],
  fence: 0x4f6b4a, wood: 0x5a3b26, concrete: 0xc9c6bf, roofTile: [0xc4542f, 0xb84d2b], solar: 0x2b3c5a };

// ---------------------------------------------------------------- windows (white frames, two or three panes, light curtains inside)
// along a facade: alongX – the face runs along x (at `at` = its z), else along z (at = its x); out: the way it faces (±1)
// GLASS: while it is set (the ground floor's walls), the glass is not drawn into the batch but collected – it becomes a
// see-through pane of its own (one can look out of the ground floor's windows)
let GLASS = null;
function windowAt(b, alongX, at, out, c, y, w, h, panes = 3, curtain = true, pane = true) {   // pane: false – only the frame (the inside of a see-through window)
  const o = 0.03 * out;
  if (GLASS && pane) GLASS.push({ alongX, at: at + o * 2, c, y, w, h });
  if (alongX) {
    // the frame: four bars round the opening (a slab behind the glass would hide what is beyond a see-through pane)
    b.bx(c, y - 0.06, at + o, w + 0.12, 0.06, 0.06, C.frame, 0, 0); b.bx(c, y + h, at + o, w + 0.12, 0.06, 0.06, C.frame, 0, 0); b.bx(c - w / 2 - 0.03, y, at + o, 0.06, h, 0.06, C.frame, 0, 0); b.bx(c + w / 2 + 0.03, y, at + o, 0.06, h, 0.06, C.frame, 0, 0);
    if (!GLASS && pane) b.bx(c, y, at + o * 2, w, h, 0.03, C.glass, 0, 0.03);
    if (curtain) b.bx(c, y + h * 0.35, at + o * 1.4, w * 0.96, h * 0.6, 0.02, C.curtain, 0, 0.02);
    for (let k = 1; k < panes; k++) b.bx(c - w / 2 + (w * k) / panes, y, at + o * 2.4, 0.05, h, 0.04, C.frame, 0, 0);
    b.bx(c, y + h * 0.72, at + o * 2.4, w, 0.05, 0.04, C.frame, 0, 0);   // the transom
  } else {
    b.bx(at + o, y - 0.06, c, 0.06, 0.06, w + 0.12, C.frame, 0, 0); b.bx(at + o, y + h, c, 0.06, 0.06, w + 0.12, C.frame, 0, 0); b.bx(at + o, y, c - w / 2 - 0.03, 0.06, h, 0.06, C.frame, 0, 0); b.bx(at + o, y, c + w / 2 + 0.03, 0.06, h, 0.06, C.frame, 0, 0);
    if (!GLASS && pane) b.bx(at + o * 2, y, c, 0.03, h, w, C.glass, 0, 0.03);
    if (curtain) b.bx(at + o * 1.4, y + h * 0.35, c, 0.02, h * 0.6, w * 0.96, C.curtain, 0, 0.02);
    for (let k = 1; k < panes; k++) b.bx(at + o * 2.4, y, c - w / 2 + (w * k) / panes, 0.04, h, 0.05, C.frame, 0, 0);
    b.bx(at + o * 2.4, y + h * 0.72, c, 0.04, 0.05, w, C.frame, 0, 0);
  }
}

// ---------------------------------------------------------------- the ground floor's walls (with door and window openings);
// the camera-side ones sink while Petyus is inside
const walls = [];
function wall(x0, z0, x1, z1, open = [], outer = 0) {   // outer: ±1 – which way the outside faces (0: an inside wall)
  const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, a0 = alongX ? x0 : z0;
  const g = new THREE.Group(); scene.add(g);
  const ops = [...open].sort((p, q) => p.a - q.a);
  GLASS = [];
  const m = partMesh((b) => {
    const seg = (a, c, y0, y1, col) => {
      if (c - a < 0.01 || y1 - y0 < 0.01) return;
      if (alongX) b.bx((a + c) / 2, y0, (z0 + z1) / 2, c - a, y1 - y0, z1 - z0, col, 0, 0.01); else b.bx((x0 + x1) / 2, y0, (a + c) / 2, x1 - x0, y1 - y0, c - a, col, 0, 0.01);
    };
    const col = outer ? C.white : C.wallIn;
    let at = a0;
    for (const o of ops) {
      seg(at, a0 + o.a, 0, FLOOR, col);
      if (o.win) { seg(a0 + o.a, a0 + o.b, 0, 0.9, col); seg(a0 + o.a, a0 + o.b, 2.5, FLOOR, col); } else seg(a0 + o.a, a0 + o.b, 2.3, FLOOR, col);
      at = a0 + o.b;
    }
    seg(at, a0 + len, 0, FLOOR, col);
    if (outer) {   // the orange plinth band outside (the photo: up to the ground-floor windows)
      const face = alongX ? (outer > 0 ? z1 : z0) : (outer > 0 ? x1 : x0);
      let p = a0;
      for (const o of ops) { if (!o.win) { pband(b, alongX, face, outer, p, a0 + o.a); p = a0 + o.b; } }
      pband(b, alongX, face, outer, p, a0 + len);
    }
    for (const o of ops) if (o.win) {
      const mid = a0 + (o.a + o.b) / 2, w = o.b - o.a, face = alongX ? (outer >= 0 ? z1 : z0) : (outer >= 0 ? x1 : x0);
      windowAt(b, alongX, face, outer || 1, mid, 0.9, w, 1.6, 3, false);   // (no curtains: one can look out)
      const inFace = alongX ? (outer >= 0 ? z0 : z1) : (outer >= 0 ? x0 : x1);   // the frame inside too
      windowAt(b, alongX, inFace, -(outer || 1), mid, 0.9, w, 1.6, 3, false, false);   // (no pane: the glass is the see-through one outside)
    }
  });
  const glass = GLASS; GLASS = null;
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.22, depthWrite: false });
  for (const q of glass) {
    // a hair smaller than the opening: its edges would lie on the frame bars' faces (the same plane – flicker)
    const gm = new THREE.Mesh(new THREE.BoxGeometry(q.alongX ? q.w - 0.02 : 0.02, q.h - 0.02, q.alongX ? 0.02 : q.w - 0.02), glassMat);
    gm.position.set(q.alongX ? q.c : q.at, q.y + q.h / 2, q.alongX ? q.at : q.c); gm.renderOrder = 2; g.add(gm);
  }
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  const mat = vcMat.clone(); mat.transparent = true; m.material = mat;   // its own material: it can fade on its own
  const col = (a, c) => { if (c - a < 0.01) return; if (alongX) addBoxCol(a, z0, c, z1, FLOOR); else addBoxCol(x0, a, x1, c, FLOOR); };
  let at = a0;
  for (const o of ops) { col(at, a0 + o.a); if (o.win) col(a0 + o.a, a0 + o.b); at = a0 + o.b; }
  col(at, a0 + len);
  walls.push({ g, alongX, c: alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, s: 1, o: 1, mats: [mat], pics: [], glass: glassMat });
}
// things hung on a wall (the board, pictures, coats): they fade with it, and are put away while it is sunk.
// axis 'x': a wall running along z at x = at; 'z': a wall running along x at z = at. No such wall (the orange block): just there
function onWall(meshes, axis, at) {
  const w = walls.find((q) => q.alongX === (axis === 'z') && Math.abs(q.c - at) < 0.2);
  for (const m of meshes) {
    if (!w) { scene.add(m); continue; }
    m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; w.mats.push(o.material); } });
    w.g.add(m); w.pics.push(m);
  }
}
function pband(b, alongX, face, out, a, c) {
  if (c - a < 0.01) return;
  // (up to just under the windows' bottom frame bar – its top at 0.9 would share a plane with the bar's: flicker)
  if (alongX) b.bx((a + c) / 2, 0, face + out * 0.02, c - a, 0.83, 0.05, C.orange, 0, 0.02); else b.bx(face + out * 0.02, 0, (a + c) / 2, 0.05, 0.83, c - a, C.orange, 0, 0.02);
}

// ---------------------------------------------------------------- the main building: the ground floor (inside) + the upper floors
let upper = null, low = null;   // the two upper floors and the roof: hidden while Petyus is inside · the low building: sinks then
function buildMain() {
  const W = (a, b) => ({ a, b, win: true }), D = (a, b) => ({ a, b });
  const { x0, x1, z0, z1 } = SCHOOL;
  const classWins = []; for (let r = 0; r < 3; r++) for (const x of [1.5, 4.9, 8.3]) classWins.push(W(r * 12 + x, r * 12 + x + 2.2));   // three per room (none at the partitions)
  wall(x0, z0 - TW, x1 + TW, z0, classWins, -1);                                                      // north (the classrooms' windows)
  // (no window at x 19.5 … 25.5: there the passage to the low building joins on)
  wall(x0, z1, x1 + TW, z1 + TW, [D(1.2, 4.0), W(6.2, 8.4), W(9.6, 11.8), W(15.4, 17.6), W(27.4, 29.6), W(31.6, 33.8)], 1);   // south: the entrance, corridor windows
  wall(x1, z0, x1 + TW, z1, [W(9.9, 11.7)], 1);                                                       // east: a window only at the corridor (the last room's board is not there, but its bookcases are)
  // inside: the corridor's north wall with the classroom doors, the walls between the rooms
  wall(x0, CORR - 0.12, x1, CORR, [D(4.6, 5.6), D(16.6, 17.6), D(25.6, 26.6), D(32.6, 33.6)]);   // 6. b, 6. a, the boys' and the girls' toilet
  wall(11.94, z0, 12.06, CORR - 0.12); wall(23.94, z0, 24.06, CORR - 0.12); wall(29.94, z0, 30.06, CORR - 0.12);
  // the floors: wood in the classrooms, stone in the corridor
  scene.add(partMesh((b) => {
    for (const x of [6, 18]) b.bx(x, 0, (z0 + CORR) / 2, 12, 0.04, CORR - z0, C.floorClass, 0, 0.03);   // (the toilets: tiles – buildToilets)
    b.bx(18, 0, CORR / 2, 36, 0.04, -CORR, C.floorHall, 0, 0.03);
  }));
  // the upper floors (outside only) and the roof with its solar panels
  upper = new THREE.Group(); scene.add(upper);
  upper.add(partMesh((b) => {
    const w = x1 - x0 + TW, d = z1 - z0 + 2 * TW, cx = (x0 + x1 + TW) / 2, cz = (z0 + z1) / 2;
    b.bx(cx, FLOOR, cz, w, 2 * FLOOR, d, C.white, 0, 0.01);
    b.bx(cx, FLOOR - 0.05, cz, w + 0.06, 0.12, d + 0.06, C.white, 0, 0);
    for (const out of [-1, 1]) {
      const face = out > 0 ? z1 + TW : z0 - TW;
      b.bx(cx, FLOOR + 3.3 - 0.9, face + out * 0.02, w, 1.05, 0.05, C.orange, 0, 0.02);          // the orange band under the 2nd floor's windows
      b.bx(cx, 3 * FLOOR - 0.55, face + out * 0.02, w, 0.55, 0.05, C.cream, 0, 0.02);             // the cream band under the roof
      for (let f = 1; f < 3; f++) for (let x = 1.4; x < 35; x += 3.0) {
        if (out > 0 && f === 1 && x + 1.1 > 18.8 && x + 1.1 < 26.2) continue;   // behind the passage to the low building (it is two storeys high): no window into it
        windowAt(b, true, face, out, x + 1.1, f * FLOOR + 0.9, 2.2, 1.55, 3, true);
      }
    }
    for (let f = 1; f < 3; f++) for (const z of [-9.5, -5.5, -2]) windowAt(b, false, x1 + TW, 1, z, f * FLOOR + 0.9, 2.2, 1.55, 3, true);
    // the roof: a parapet, rows of solar panels (dark blue, tilted to the south), vents
    b.bx(cx, 3 * FLOOR, cz, w + 0.1, 0.25, d + 0.1, 0xdddad3, 0, 0);
    b.bx(cx, 3 * FLOOR + 0.25, cz, w - 0.4, 0.02, d - 0.4, 0x9a968e, 0, 0.03);
    for (let z = z0 + 1.2; z < z1 - 1; z += 1.6) for (let x = x0 + 1.2; x < x1 - 1; x += 1.9) { b.bx(x, 3 * FLOOR + 0.3, z, 1.7, 0.25, 1.1, C.solar, 0, 0.03); b.bx(x, 3 * FLOOR + 0.56, z, 1.7, 0.02, 1.1, 0x3d5a86, 0, 0.02); }
  }));
  // the orange block at the west end (full height): white ribbon windows on every floor
  upper.parent.add(partMesh((b) => {
    const { x0: a0, x1: a1, z0: c0, z1: c1 } = WING, cx = (a0 + a1) / 2, cz = (c0 + c1) / 2, h = 3 * FLOOR + 0.4;
    b.bx(cx, 0, cz, a1 - a0, h, c1 - c0, C.orange, 0, 0.015);
    for (let f = 0; f < 3; f++) {
      const y = f * FLOOR + 1.5;
      b.bx(cx, y - 0.25, c1 + 0.02, a1 - a0, 0.95, 0.05, C.white, 0, 0);   // the white strip, south
      b.bx(a0 - 0.02, y - 0.25, cz, 0.05, 0.95, c1 - c0, C.white, 0, 0);   // west
      for (let k = 0; k < 4; k++) windowAt(b, true, c1 + 0.04, 1, a0 + 1.4 + k * 2.1, y - 0.1, 1.6, 0.62, 2, false);
      for (let k = 0; k < 7; k++) windowAt(b, false, a0 - 0.04, -1, c0 + 1.6 + k * 2.6, y - 0.1, 1.8, 0.62, 2, false);
    }
    b.bx(cx, h, cz, a1 - a0 + 0.1, 0.2, c1 - c0 + 0.1, 0xdddad3, 0, 0);
  }));
  addBoxCol(WING.x0, WING.z0, WING.x1, WING.z1, 9);
  // the entrance: a dark wooden canopy on two slim cream posts with the school's name, concrete steps with side walls, a glass door
  scene.add(partMesh((b) => {
    const ex = 2.6, ez = z1 + TW;
    b.bx(ex, 0, ez + 1.1, 3.6, 0.15, 2.2, C.concrete, 0, 0.02); b.bx(ex, 0, ez + 2.4, 2.6, 0.3, 0.5, C.concrete, 0, 0.02);   // landing, steps
    b.bx(ex, 0, ez + 2.9, 2.6, 0.15, 0.5, C.concrete, 0, 0.02);
    for (const s of [-1, 1]) b.bx(ex + s * 1.65, 0, ez + 1.5, 0.3, 0.75, 3.0, C.concrete, 0, 0.02);                    // the side walls
    b.bx(ex, 2.65, ez + 1.6, 4.6, 0.12, 3.4, 0x4a3122, 0, 0.02); b.bx(ex, 2.45, ez + 3.25, 4.6, 0.36, 0.1, C.wood, 0, 0.02);   // the canopy, its fascia
    for (const s of [-1, 1]) b.bx(ex + s * 1.9, 0, ez + 3.0, 0.12, 2.65, 0.12, C.cream, 0, 0);                         // the posts
    for (const x of [-1.2, 1.2]) b.bx(ex + x, 2.6, ez + 1.6, 0.6, 0.04, 0.12, 0xffe9a8, 0, 0);                        // lights under it
  }));
  for (const s of [-1, 1]) addBoxCol(2.6 + s * 1.65 - 0.15, 0.25, 2.6 + s * 1.65 + 0.15, 3.25, 0.75);
  // the name on the canopy's fascia
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 80; const c = cv.getContext('2d');
  c.fillStyle = '#5a3b26'; c.fillRect(0, 0, 1024, 80); c.fillStyle = '#f3e7d0'; c.font = 'bold 46px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('WEÖRES SÁNDOR ÁLTALÁNOS ISKOLA', 512, 42);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.34), new THREE.MeshLambertMaterial({ map: tex })); sign.position.set(2.6, 2.63, SCHOOL.z1 + TW + 3.31); scene.add(sign);
}

// ---------------------------------------------------------------- the low building (two storeys, square, flat roof) south of it,
// joined to the main building by a short passage
function buildLow() {
  const { x0, x1, z0, z1 } = LOW;
  low = { s: 1, m: partMesh((b) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = 2 * FLOOR;
    b.bx(cx, 0, cz, x1 - x0, h, z1 - z0, C.white, 0, 0.012);
    b.bx(22.5, 0, (SCHOOL.z1 + z0) / 2 + TW / 2, 6, h, z0 - SCHOOL.z1, C.white, 0, 0.01);   // the passage
    for (const out of [-1, 1]) {
      b.bx(cx, 0, (out > 0 ? z1 : z0) + out * 0.02, x1 - x0, 0.9, 0.05, C.orange, 0, 0.02);
      b.bx((out > 0 ? x1 : x0) + out * 0.02, 0, cz, 0.05, 0.9, z1 - z0, C.orange, 0, 0.02);
      b.bx(cx, FLOOR - 0.1, (out > 0 ? z1 : z0) + out * 0.02, x1 - x0, 0.9, 0.05, C.orange, 0, 0.02);
    }
    for (let f = 0; f < 2; f++) {
      for (let x = x0 + 1.6; x < x1 - 1; x += 3.2) windowAt(b, true, z1, 1, x + 1.0, f * FLOOR + 1.0, 2.0, 1.5, 3, f === 0);
      for (let z = z0 + 1.8; z < z1 - 1; z += 3.2) { windowAt(b, false, x1, 1, z + 1.0, f * FLOOR + 1.0, 2.0, 1.5, 3, true); windowAt(b, false, x0, -1, z + 1.0, f * FLOOR + 1.0, 2.0, 1.5, 3, true); }
    }
    b.bx(cx, h, cz, x1 - x0 + 0.1, 0.25, z1 - z0 + 0.1, 0xdddad3, 0, 0);
    b.bx(cx - 2, h + 0.25, cz - 1, 8, 1.0, 6, 0xe8e5de, 0, 0.01);   // the raised middle (a skylight box)
    for (let x = cx - 5.5; x < cx + 2; x += 1.6) b.bx(x, h + 1.25, cz - 1, 1.2, 0.08, 5.6, 0xa9c6dc, 0, 0.02);
  }) };
  scene.add(low.m);
  // while Petyus is inside: only a low stub of it (its plinth), so the classrooms behind it can be seen
  low.stub = partMesh((b) => { b.bx((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 0.9, z1 - z0, C.white, 0, 0.012); b.bx((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0 + 0.05, 0.9, z1 - z0 + 0.05, C.orange, 0, 0.02); b.bx((x0 + x1) / 2, 0.9, (z0 + z1) / 2, x1 - x0 - 0.3, 0.02, z1 - z0 - 0.3, 0xd9d4ca, 0, 0); });
  low.stub.visible = false; scene.add(low.stub);
  addBoxCol(x0, z0, x1, z1, 6.6); addBoxCol(19.5, SCHOOL.z1 + TW, 25.5, z0, 6.6);
}

// ---------------------------------------------------------------- the sports hall (red gable roof, solar panels) and the blue court
function buildHall() {
  const { x0, x1, z0, z1 } = HALL, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = 7;
  scene.add(partMesh((b) => {
    b.bx(cx, 0, cz, x1 - x0, h, z1 - z0, 0xeee7d8, 0, 0.012);
    b.bx(cx, 0, cz, x1 - x0 + 0.06, 0.8, z1 - z0 + 0.06, 0xc9b49a, 0, 0.02);
    for (let x = x0 + 2; x < x1 - 1; x += 3) { b.bx(x, 4.6, z1 + 0.03, 2.2, 1.6, 0.05, C.glass, 0, 0.03); b.bx(x, 4.6, z0 - 0.03, 2.2, 1.6, 0.05, C.glass, 0, 0.03); }
    b.bx(cx, 0, z1 + 0.04, 3.2, 2.6, 0.06, 0x3b3f45, 0, 0);   // the doors (south)
    // the gable roof: ridge along x, stepped tile courses; solar panels on the south slope
    const D = z1 - z0 + 1.2;
    for (let n = 0; ; n++) {
      const dd = D - 2 * n * 0.6; if (dd < 0.8) { b.bx(cx, h + n * 0.32, cz, x1 - x0 + 1, 0.2, 0.6, 0x8a3a22, 0, 0); break; }
      b.bx(cx, h + n * 0.32, cz, x1 - x0 + 1, 0.32, dd, pick(C.roofTile), 0, 0.03);
    }
    for (let x = x0 + 2; x < x1 - 2; x += 2.0) for (let k = 0; k < 4; k++) b.bx(x, h + 0.75 + k * 0.62, z1 - 2.2 - k * 1.85, 1.8, 0.06, 1.7, C.solar, 0, 0.02);
  }));
  addBoxCol(x0, z0, x1, z1, 9);
  const { x0: a0, x1: a1, z0: c0, z1: c1 } = COURT;
  scene.add(partMesh((b) => {
    b.bx((a0 + a1) / 2, 0, (c0 + c1) / 2, a1 - a0, 0.03, c1 - c0, 0x3a6fc4, 0, 0.01);
    const L = (x, z, w, d) => b.bx(x, 0.031, z, w, 0.01, d, C.line, 0, 0);
    L((a0 + a1) / 2, c0 + 1, a1 - a0 - 2, 0.08); L((a0 + a1) / 2, c1 - 1, a1 - a0 - 2, 0.08); L(a0 + 1, (c0 + c1) / 2, 0.08, c1 - c0 - 2); L(a1 - 1, (c0 + c1) / 2, 0.08, c1 - c0 - 2); L((a0 + a1) / 2, (c0 + c1) / 2, 0.08, c1 - c0 - 2);
    for (const x of [a0 + 1, a1 - 1]) { b.bx(x, 0, (c0 + c1) / 2 - 1.5, 0.08, 2, 0.08, 0xffffff, 0, 0); b.bx(x, 0, (c0 + c1) / 2 + 1.5, 0.08, 2, 0.08, 0xffffff, 0, 0); b.bx(x, 2, (c0 + c1) / 2, 0.08, 0.08, 3.1, 0xffffff, 0, 0); }   // the goals
    for (let x = a0; x <= a1; x += 0.5) { b.bx(x, 0, c0, 0.04, 3, 0.04, C.fence, 0, 0); b.bx(x, 0, c1, 0.04, 3, 0.04, C.fence, 0, 0); }
    for (let z = c0; z <= c1; z += 0.5) { b.bx(a0, 0, z, 0.04, 3, 0.04, C.fence, 0, 0); b.bx(a1, 0, z, 0.04, 3, 0.04, C.fence, 0, 0); }
    for (const y of [1, 2, 3]) { b.bx((a0 + a1) / 2, y, c0, a1 - a0, 0.04, 0.04, C.fence, 0, 0); b.bx((a0 + a1) / 2, y, c1, a1 - a0, 0.04, 0.04, C.fence, 0, 0); b.bx(a0, y, (c0 + c1) / 2, 0.04, 0.04, c1 - c0, C.fence, 0, 0); b.bx(a1, y, (c0 + c1) / 2, 0.04, 0.04, c1 - c0, C.fence, 0, 0); }
  }));
  addBoxCol(a0, c0 - 0.05, a1, c0 + 0.05, 3); addBoxCol(a0, c1 - 0.05, a1, c1 + 0.05, 3); addBoxCol(a0 - 0.05, c0, a0 + 0.05, c1, 3); addBoxCol(a1 - 0.05, c0, a1 + 0.05, c1, 3);
}

// ---------------------------------------------------------------- the ground: lawns, the paved square in front, paths, the field,
// the gravel car park, the streets round the block and the houses along them
function familyHouse(b, cx, cz, w, d, roofCol, wall, along) {
  const W = along ? w : d, Dd = along ? d : w;
  b.bx(cx, 0, cz, W, 3.0, Dd, wall, 0, 0.02); b.bx(cx, 0, cz, W + 0.06, 0.45, Dd + 0.06, 0xb7a596, 0, 0.02);
  for (const k of [-1, 0, 1]) for (const s of [-1, 1]) {
    if (along) { b.bx(cx + k * W / 3, 1.0, cz + s * (Dd / 2 + 0.04), 0.9, 1.0, 0.05, 0xf8f7f3, 0, 0); b.bx(cx + k * W / 3, 1.05, cz + s * (Dd / 2 + 0.07), 0.75, 0.85, 0.03, C.glass, 0, 0.03); }
    else { b.bx(cx + s * (W / 2 + 0.04), 1.0, cz + k * Dd / 3, 0.05, 1.0, 0.9, 0xf8f7f3, 0, 0); b.bx(cx + s * (W / 2 + 0.07), 1.05, cz + k * Dd / 3, 0.03, 0.85, 0.75, C.glass, 0, 0.03); }
  }
  for (let n = 0; ; n++) {   // a red tiled gable roof
    const dd = (along ? Dd : W) + 0.8 - 2 * n * 0.42;
    if (dd < 0.5) { if (along) b.bx(cx, 3 + n * 0.3, cz, W + 0.8, 0.18, 0.4, 0x8a3a22, 0, 0); else b.bx(cx, 3 + n * 0.3, cz, 0.4, 0.18, Dd + 0.8, 0x8a3a22, 0, 0); break; }
    if (along) b.bx(cx, 3 + n * 0.3, cz, W + 0.8, 0.3, dd, n % 2 ? roofCol : (roofCol & 0xfefefe) - 0x0a0604, 0, 0.03);
    else b.bx(cx, 3 + n * 0.3, cz, dd, 0.3, Dd + 0.8, n % 2 ? roofCol : (roofCol & 0xfefefe) - 0x0a0604, 0, 0.03);
  }
}
function buildGround() {
  scene.add(partMesh((b) => {
    for (let x = -70; x < 110; x += 5) for (let z = -90; z < 80; z += 5) b.quad(x, z, x + 5, z + 5, -0.005, pick(C.grass), 0.05);
    // the paved square in front of the entrance (grey pavers), the reddish paved walk east along the main building
    for (let x = -17; x < 14; x += 1) for (let z = 0.4; z < 18; z += 1) if (!(x >= -9 && x < 0 && z < 4)) b.bx(x + 0.5, 0, z + 0.5, 1, 0.03, 1, pick(C.paver), 0, 0.03);
    for (let x = 14; x < 40; x += 1) for (let z = 18; z < 20.5; z += 1) b.bx(x + 0.5, 0, z + 0.5, 1, 0.03, 1, pick(C.red), 0, 0.03);
    for (let x = 32; x < 40; x += 1) for (let z = 0.4; z < 18; z += 1) b.bx(x + 0.5, 0, z + 0.5, 1, 0.03, 1, pick(C.red), 0, 0.03);
    for (let z = -22; z < 0; z += 1) for (let x = 36.4; x < 40; x += 1) b.bx(x + 0.5, 0, z + 0.5, 1, 0.03, 1, pick(C.paver), 0, 0.03);   // a walk to the hall
    for (let x = -17; x < 6; x += 1) for (let z = -23; z < -14; z += 1) b.bx(x + 0.5, 0, z + 0.5, 1, 0.03, 1, pick(C.paver), 0, 0.03);
    // the grass field (worn patches, two goals) and the gravel car park behind the hall
    const { x0, x1, z0, z1 } = FIELD;
    for (let n = 0; n < 40; n++) b.bx(R(x0 + 2, x1 - 2), 0, R(z0 + 2, z1 - 2), R(1, 3), 0.01, R(1, 2.5), 0xb8a57c, 0, 0.05);
    for (const x of [x0 + 2, x1 - 2]) { for (const dz of [-1.6, 1.6]) b.bx(x, 0, (z0 + z1) / 2 + dz, 0.1, 2, 0.1, 0xffffff, 0, 0); b.bx(x, 2, (z0 + z1) / 2, 0.1, 0.1, 3.3, 0xffffff, 0, 0); }
    b.bx(20, 0, -52, 34, 0.02, 10, 0xc8bfae, 0, 0.04);
    // the streets: Kossuth Lajos utca (west), Iskola utca (south), Aradi utca (east), with sidewalks
    b.bx(-24.5, 0, 0, 7, 0.02, 180, C.asphalt, 0, 0.02); b.bx(-20.3, 0, 0, 1.4, 0.1, 180, 0xcfc8bb, 0, 0.02); b.bx(-28.7, 0, 0, 1.4, 0.1, 180, 0xcfc8bb, 0, 0.02);
    b.bx(20, 0, 46.5, 180, 0.02, 7, C.asphalt, 0, 0.02); b.bx(20, 0, 42.3, 180, 0.1, 1.4, 0xcfc8bb, 0, 0.02); b.bx(20, 0, 50.7, 180, 0.1, 1.4, 0xcfc8bb, 0, 0.02);
    b.bx(70.5, 0, 0, 7, 0.02, 180, C.asphalt, 0, 0.02); b.bx(66.3, 0, 0, 1.4, 0.1, 180, 0xcfc8bb, 0, 0.02);
    for (let z = -85; z < 85; z += 4) { b.bx(-24.5, 0.03, z, 0.12, 0.01, 2, C.line, 0, 0); b.bx(70.5, 0.03, z, 0.12, 0.01, 2, C.line, 0, 0); }
    for (let x = -60; x < 100; x += 4) b.bx(x, 0.03, 46.5, 2, 0.01, 0.12, C.line, 0, 0);
    // the school's fence (the gate on the west side), a low concrete base
    const F = CAMPUS;
    for (let z = F.z0; z <= F.z1; z += 0.25) if (Math.abs(z - GATE.z) > 1.6) b.bx(F.x0, 0, z, 0.05, 1.6, 0.05, C.fence, 0, 0);
    for (let z = F.z0; z <= F.z1; z += 0.25) b.bx(F.x1, 0, z, 0.05, 1.6, 0.05, C.fence, 0, 0);
    for (let x = F.x0; x <= F.x1; x += 0.25) { b.bx(x, 0, F.z0, 0.05, 1.6, 0.05, C.fence, 0, 0); b.bx(x, 0, F.z1, 0.05, 1.6, 0.05, C.fence, 0, 0); }
    for (const y of [0.5, 1.5]) {
      b.bx(F.x0, y, (F.z0 + GATE.z - 1.6) / 2, 0.05, 0.05, GATE.z - 1.6 - F.z0, C.fence, 0, 0); b.bx(F.x0, y, (GATE.z + 1.6 + F.z1) / 2, 0.05, 0.05, F.z1 - GATE.z - 1.6, C.fence, 0, 0);
      b.bx(F.x1, y, (F.z0 + F.z1) / 2, 0.05, 0.05, F.z1 - F.z0, C.fence, 0, 0);
      b.bx((F.x0 + F.x1) / 2, y, F.z0, F.x1 - F.x0, 0.05, 0.05, C.fence, 0, 0); b.bx((F.x0 + F.x1) / 2, y, F.z1, F.x1 - F.x0, 0.05, 0.05, C.fence, 0, 0);
    }
    for (const dz of [-1.6, 1.6]) b.bx(F.x0, 0, GATE.z + dz, 0.16, 1.9, 0.16, 0x3b4a38, 0, 0);
    b.bx(F.x0 + 0.6, 0, GATE.z - 1.6 + 0.02, 1.2, 1.5, 0.05, C.fence, 0, 0);   // one wing open
    // the houses round the block: along Kossuth Lajos utca (west), Iskola utca (south), Aradi utca (east)
    const roofs = [0xd9662f, 0xc9552a, 0xe0743a, 0xb84f2c], walls2 = [0xf1ece2, 0xe9e1cf, 0xf4efe6];
    for (let z = -70, n = 0; z < 70; z += 13, n++) familyHouse(b, -38, z, 9, 10, roofs[n % 4], walls2[n % 3], false);
    for (let x = -10, n = 0; x < 90; x += 14, n++) familyHouse(b, x, 58, 10, 9, roofs[(n + 1) % 4], walls2[(n + 2) % 3], true);
    for (let z = -70, n = 0; z < 70; z += 13, n++) familyHouse(b, 80, z, 9, 10, roofs[(n + 2) % 4], walls2[n % 3], false);
  }));
  const F = CAMPUS;
  addBoxCol(F.x0 - 0.05, F.z0, F.x0 + 0.05, GATE.z - 1.6, 1.6); addBoxCol(F.x0 - 0.05, GATE.z + 1.6, F.x0 + 0.05, F.z1, 1.6);
  addBoxCol(F.x1 - 0.05, F.z0, F.x1 + 0.05, F.z1, 1.6); addBoxCol(F.x0, F.z0 - 0.05, F.x1, F.z0 + 0.05, 1.6); addBoxCol(F.x0, F.z1 - 0.05, F.x1, F.z1 + 0.05, 1.6);
}
// ---------------------------------------------------------------- the square: bike racks, concrete benches with wooden tops,
// wooden bins, plane trees; trees round the field and the buildings
function buildSquare() {
  scene.add(partMesh((b) => {
    for (let k = 0; k < 8; k++) { const x = -8.5 + k * 1.0; b.bx(x - 0.3, 0, 5.2, 0.05, 0.8, 0.05, 0xc8ccd0, 0, 0); b.bx(x + 0.3, 0, 5.2, 0.05, 0.8, 0.05, 0xc8ccd0, 0, 0); b.bx(x, 0.78, 5.2, 0.65, 0.05, 0.05, 0xc8ccd0, 0, 0); }   // bike racks (U)
    for (let k = 0; k < 4; k++) { const x = 6.5 + k * 1.0; b.bx(x - 0.3, 0, 1.0, 0.05, 0.8, 0.05, 0xc8ccd0, 0, 0); b.bx(x + 0.3, 0, 1.0, 0.05, 0.8, 0.05, 0xc8ccd0, 0, 0); b.bx(x, 0.78, 1.0, 0.65, 0.05, 0.05, 0xc8ccd0, 0, 0); }
    for (const [x, z, w, d] of [[-12, 14, 4.5, 1.0], [-2, 15, 6, 1.0], [8, 14, 4.5, 1.0], [-14.5, 4, 1.0, 4]]) { b.bx(x, 0, z, w, 0.45, d, C.concrete, 0, 0.02); b.bx(x, 0.45, z, w + 0.06, 0.07, d + 0.06, 0x6b4a32, 0, 0.03); }   // concrete benches, wooden tops
    HOP_SQ.forEach(([dx, dz], n) => b.bx(HOP.x + dx, 0.032, HOP.z0 + dz * HOP.step, dx ? 0.3 : 0.55, 0.01, 0.55, n % 2 ? 0xffca3a : 0xff70a6, 0, 0));   // the hopscotch (chalk on the pavers)
    for (const x of [0.3, 4.9]) { b.bx(x, 0, 4.0, 0.5, 0.85, 0.5, 0x6b4a32, 0, 0.03); for (let k = 0; k < 4; k++) b.bx(x, 0.12 + k * 0.2, 4.0, 0.52, 0.03, 0.52, 0x4e3524, 0, 0); }   // wooden bins
  }));
  for (const [x, z, w, d] of [[-12, 14, 4.5, 1.0], [-2, 15, 6, 1.0], [8, 14, 4.5, 1.0], [-14.5, 4, 1.0, 4]]) addBoxCol(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0.5);
  for (const x of [0.3, 4.9]) addBoxCol(x - 0.25, 3.75, x + 0.25, 4.25, 0.9);
  const g = { ground: true, col: true };
  // plane trees on the square and along the buildings (big oaks stand in for them), birches and pines round the field
  for (const [x, z, s] of [[-12, 9, 1.4], [-5, 11, 1.3], [9, 8, 1.4], [12.5, -14, 1.3], [-14, -8, 1.4], [-6, -20, 1.2], [36, 6, 1.3], [44, -6, 1.4], [44, 12, 1.3], [-12, 30, 1.3], [-6, 38, 1.2], [50, 30, 1.4], [56, 18, 1.3], [-14, -38, 1.3], [44, -50, 1.2], [58, -12, 1.3]]) put('oak', x, z, x * 0.7, Math.abs(Math.round(x)) % 4, { ground: true, col: true, s });
  for (const [x, z] of [[-14, 22], [0, 41], [24, 41], [48, 40], [-16, -30], [2, -54], [36, -54], [60, -50], [60, 0]]) put('birch', x, z, x, Math.abs(Math.round(z)) % 4, { ground: true, col: true, s: 1.1 });
  for (const [x, z] of [[-16, 40], [62, 40], [62, -56], [-16, -56]]) put('pine', x, z, x, 1, { ground: true, col: true, s: 1.2 });
  for (const [x, z] of [[-10, 2.2], [11, 17], [34, 17], [-16, 17]]) put('bush', x, z, x, Math.abs(x) % 4, { ground: true, s: 1.0 });
  for (const [x, z] of [[-16, 2], [-3, 17.5], [13, 17.5], [30, 19.6], [38, -12], [-16, -16]]) put('lamp', x, z, 0, 0, g);
}

// ---------------------------------------------------------------- inside: the classrooms and the corridor
// The board hangs on each room's west wall (no windows there – the default camera from the south-east looks at it); the pupils
// face west, the windows (north) are on their right; under the windows only radiators and low plants (lower than the sill).
const ROOMS3 = [
  { x0: 0, door: 5.1, cls: '6. b', kind: 'ours', board: ['Matematika – Törtek', '3/4 + 1/8 = ?        2 1/2 · 4 = ?', 'Házi feladat: 47. oldal, 3–5.'] },
  { x0: 12, door: 17.1, cls: '6. a', kind: 'other', board: ['Irodalom – Arany János: Toldi', '„Ég a napmelegtől a kopár szik sarja…”', 'Memoriter: az első versszak'] },
];
const desks = [];   // Petyus's class: where the pupils sit { x, z }
export const seat = { x: 0, z: 0 };   // Petyus's own place (his chair in the 6. b)
const clocks = [];
function buildClassroom(r) {
  const x0 = r.x0, z0 = SCHOOL.z0, ours = r.kind === 'ours', W = -Math.PI / 2, E = Math.PI / 2, bz = -7.3;
  const wx = x0 === 0 ? 0 : x0 + 0.06;   // the west wall's inner face (the first room: the orange block's wall)
  // the board, its chalk writing, the clock above it – they belong to the west wall (they fade / sink with it)
  const board = partMesh((b) => {
    b.bx(wx + 0.03, 0.95, bz, 0.06, 1.3, 4.6, C.boardFrame, 0, 0); b.bx(wx + 0.06, 1.0, bz, 0.04, 1.2, 4.4, C.board, 0, 0.02);
    b.bx(wx + 0.1, 0.92, bz, 0.12, 0.04, 4.4, C.boardFrame, 0, 0);
    for (let k = 0; k < 4; k++) b.bx(wx + 0.12, 0.96, bz - 1.6 + k * 0.3, 0.03, 0.02, 0.08, 0xf4f4f0, 0, 0);   // chalk sticks
    if (!ours) b.bx(wx + 0.12, 0.96, bz + 1.4, 0.05, 0.04, 0.12, 0x8a6a4a, 0, 0);                            // the sponge (the 6. b's: its own mesh – „Vizes szivacs”)
  });
  if (ours) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    sponge.home.set(wx + 0.12, 0.985, bz + 1.4); m.position.copy(sponge.home); m.castShadow = true; scene.add(m); sponge.mesh = m;
  }
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 1.16), new THREE.MeshBasicMaterial({ map: boardText(r.board), transparent: true })); txt.position.set(wx + 0.085, 1.6, bz); txt.rotation.y = E; r.txt = txt;
  // the clock on the back (east) wall, between the bookcases and the cupboards: the teacher sees it facing the class, the
  // pupils have it behind them
  const ck = makeClock(); clocks.push(ck);
  const ew = x0 + 11.94, clock = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ map: ck.tex, transparent: true })); clock.position.set(ew - 0.02, 2.25, bz); clock.rotation.y = W;
  onWall([board, txt], 'x', wx); onWall([clock], 'x', ew);
  // pictures: beside the board writers' portraits and the times table; on the back and corridor walls more portraits,
  // the map, the timetable
  const pic = (texture, w, h, x, y, z, face) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: texture, transparent: true })); m.position.set(x, y, z); m.rotation.y = face; return m; };
  const i0 = (x0 / 12) * 3;
  onWall([pic(portrait(WRITERS[i0 % WRITERS.length]), 0.5, 0.66, wx + 0.02, 1.75, -11.1, E), pic(portrait(WRITERS[(i0 + 1) % WRITERS.length]), 0.5, 0.66, wx + 0.02, 1.75, -10.4, E),
    pic(timesTable(), 1.0, 1.1, wx + 0.02, 1.55, -3.8, E)], 'x', wx);
  const sw = CORR - 0.12 - 0.012;   // the corridor wall's classroom face
  onWall([pic(timetable(), 1.05, 0.92, x0 + 2.0, 1.6, sw, Math.PI), pic(hungaryMap(), 1.6, 1.06, x0 + 8.4, 1.6, sw, Math.PI),
    pic(portrait(WRITERS[(i0 + 2) % WRITERS.length]), 0.5, 0.66, x0 + 6.4, 1.7, sw, Math.PI), pic(portrait(WRITERS[(i0 + 3) % WRITERS.length]), 0.5, 0.66, x0 + 10.4, 1.7, sw, Math.PI),
    pic(portrait(WRITERS[(i0 + 4) % WRITERS.length]), 0.5, 0.66, x0 + 11.1, 1.7, sw, Math.PI)], 'z', CORR - 0.06);
  // the teacher's desk by the board (she sits west of it, facing the class), the pupils' desks: 3 rows × 3, two chairs each
  put('desk', x0 + 1.9, -9.6, W, 0, { ground: true, col: true });   // (variant 0: the one with the monitor – the teacher's)
  put('chair', x0 + 1.32, -9.6, E, 1, { ground: true, col: true });   // the teacher's chair
  if (ours) {   // a spare chair by the back wall (its own mesh: it can be dragged under the clock – „Előre a mutatót!”)
    const m = new THREE.Mesh(getGeometry('chair', 0), vcMat); m.castShadow = m.receiveShadow = true; m.rotation.y = W;
    m.position.set(x0 + 11.45, 0, -8.85); scene.add(m); tchair.mesh = m; tchair.home.set(x0 + 11.45, 0, -8.85);
  }
  for (const [k, x] of [[0, 4.3], [1, 6.3], [2, 8.3]]) for (const z of [-9.9, -7.3, -4.7]) {
    put('desk', x0 + x, z, E, 1, { ground: true, col: true });   // (variant 1: a plain desk)
    for (const s of [-0.3, 0.3]) {
      put('chair', x0 + x + 0.55, z + s, W, ours ? 0 : 1, { ground: true, col: true });
      (r.desks ||= []).push({ x: x0 + x + 0.55, z: z + s, row: k });
      if (ours) desks.push({ x: x0 + x + 0.55, z: z + s, row: k });
    }
  }
  // the back (east) wall: two bookcases and low cupboards; under the north windows radiators and low plants
  const ex = x0 + 11.75;
  put('bookshelf', ex, -10.9, W, 0, { ground: true, col: true }); put('bookshelf', ex, -9.8, W, 1, { ground: true, col: true });
  put('sideboard', ex - 0.05, -5.0, W, 0, { ground: true, col: true }); put('sideboard', ex - 0.05, -3.8, W, 1, { ground: true, col: true });
  for (const wxx of [2.6, 6.0, 9.4]) put('radiator', x0 + wxx, z0 + 0.12, 0, 0, { ground: true, col: true });
  put('potted_plant', x0 + 0.5, z0 + 0.4, 0, 0, { ground: true, col: true }); put('potted_plant', x0 + 11.4, z0 + 0.45, 0, 0, { ground: true, col: true });
  put('bin', x0 + 0.5, -3.3, 0, 0, { ground: true, col: true });
}
function buildCorridor() {
  // coats and bags on hooks along the corridor wall (they belong to that wall; none on the doors), a trophy cabinet, notice boards, benches;
  // on the outer wall between the windows the writers' gallery
  const coats = partMesh((b) => {
    for (let x = 0.8; x < 35.5; x += 0.6) { if ([5.1, 17.1, 26.1, 33.1].some((d) => Math.abs(x - d) < 0.8) || Math.abs(x - 11) < 1) continue; b.bx(x, 1.55, CORR + 0.05, 0.05, 0.05, 0.12, 0x555555, 0, 0); if (Math.round(x * 10) % 3) b.bx(x, 0.9, CORR + 0.1, 0.38, 0.65, 0.12, pick([0xe63946, 0x3a86ff, 0xffca3a, 0x2a9d8f, 0xff70a6]), 0, 0.03); }
    b.bx(11, 0, CORR + 0.2, 1.6, 1.8, 0.4, 0x8a6238, 0, 0.02); b.bx(11, 0.9, CORR + 0.41, 1.4, 0.8, 0.02, 0x9fd4ef, 0, 0);
    for (const x of [8.0, 22.5]) b.bx(x, 1.3, CORR + 0.03, 1.6, 1.0, 0.04, 0xc9a06a, 0, 0.02);
  });
  onWall([coats], 'z', CORR - 0.06);
  addBoxCol(10.2, CORR, 11.8, CORR + 0.4, 2);
  const gallery = [];
  [[5.1, 4], [12.6, 5], [19.3, 6], [25.6, 7], [30.6, 0]].forEach(([x, i]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.73), new THREE.MeshLambertMaterial({ map: portrait(WRITERS[i]), transparent: true })); m.position.set(x, 1.65, -0.02); m.rotation.y = Math.PI; gallery.push(m);
  });
  onWall(gallery, 'z', 0.12);
  put('bench', 9.0, -0.55, Math.PI, 0, { ground: true, col: true }); put('bench', 26.0, -0.55, Math.PI, 0, { ground: true, col: true });
  put('potted_plant', 35.5, -2.2, 0, 1, { ground: true, col: true });
}
// the ceiling of the ground floor with its fluorescent lamps: only in the first-person view
let ceil = null;
function buildCeiling() {
  ceil = new THREE.Group(); ceil.visible = false; scene.add(ceil);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), new THREE.MeshBasicMaterial({ color: 0xbcb8b0, side: THREE.DoubleSide })); m.rotation.x = Math.PI / 2; m.position.set(18, FLOOR - 0.02, -6); ceil.add(m);
  // (the lamps on it: buildLights)
}
export function setSchoolFps(on) { if (ceil) ceil.visible = on; }

// ---------------------------------------------------------------- people: the teacher at the board, the class at their desks,
// children on the square
const people = [];
const TEACHER_LINES = ['Gyerekek, figyeljetek a táblára!', 'Ki tudja a választ?', 'Csendet kérek!', 'Nyissátok ki a füzeteteket!', 'Szép munka!', 'Ki jön ki a táblához?', 'Holnap témazáró!'];
const KID_LINES = ['Szia, Petyus!', 'Láttad a tegnapi meccset?', 'Kölcsönadod a radírod?', 'Mi lesz az uzsonna?', 'Fogócska a szünetben?', 'Megcsináltad a házit?', 'Petyus, gyere ide!'];
const pupils = [];   // the 6. b's children (in their seats in a lesson, in the yard in a break)
export const school = { teacher: null, talkT: 6, seated: false, seatedSaid: false, chalkT: 4, chatT: 0, bellMin: -1, lastMin: -1, min: 0 };
// „Előre a mutatót!” (r2-ora): the 6. b's wall clock can be put forward (off: minutes); the teacher turns to the board to write
// now and then (writing: her back to the class); when the clock says the lesson is over, she lets the 6. b out early (early)
export const ck = { off: 0, writing: false, wT: 10, wDur: 0, early: false, earlyMin: 0, caught: false, climbT: 0, lookT: 3, said: 0 };
const CLOCK = { x: 11.35, z: -7.3 };   // in front of the 6. b's clock (on the back – east – wall)
// „Vizes szivacs a széken” (r2-szivacs): the board's sponge – where: 'board' | 'hand' | 'chair'; wet (soaked at a WC sink); seen:
// the teacher saw Petyus with it; the teacher's chair at her desk (she sits down there at the start of a lesson)
export const sponge = { mesh: null, home: new V3(), where: 'board', wet: false, seen: false, dripT: 0, sitT: -1, done: false };
const TCHAIR = { x: 1.32, z: -9.6 }, SINKS = [28.3, 29.3, 34.5, 35.4], BREAK_SPOT = { x: 6.6, z: -1.3 };
// the spare chair by the back wall: at its place, or under the clock (at), Petyus standing on it (on)
export const tchair = { mesh: null, home: new V3(), at: false, on: false, back: false };
const CHAIR_TOP = 0.46;
function chairTo(clock) { tchair.at = clock; tchair.mesh.position.set(clock ? CLOCK.x + 0.2 : tchair.home.x, 0, clock ? CLOCK.z : tchair.home.z); soundAt(tchair.mesh.position.x, tchair.mesh.position.z, () => noise(0.35, 500, 0.8, 0.12), 1); }
const lessonEnd = (min) => { const t = min - 8 * 60, n = Math.floor(t / 55); return 8 * 60 + n * 55 + 45; };
function buildPeople() {
  const T = new Actor(makePerson({ scale: 0.92, shirt: 0x6a4c93, pants: 0x3d405b, hair: 0x8a5a2b, dress: true, glasses: false, hat: false }), 'Tanító néni');
  // her glasses: their own little mesh on her face („Hol a szemüvegem?” – in a break she leaves them on her desk)
  { const g = new THREE.Group(), blk = new THREE.MeshLambertMaterial({ color: 0x222222 }), lens = new THREE.MeshLambertMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.55 });
    for (const sx of [-0.07, 0.07]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.015), blk); f.position.x = sx; g.add(f); const l = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.048, 0.02), lens); l.position.x = sx; g.add(l); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), blk); g.add(br);
    for (const sx of [-0.125, 0.125]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.16), blk); arm.position.set(sx, 0.01, -0.08); g.add(arm); }
    gl.mesh = g; gl.face = T.rig.S; g.position.set(0, 1.55, 0.165); T.rig.S.add(g); }
  const home = new V3(0.9, 0, -7.3);
  T.place(home.x, home.z, Math.PI / 2); T.stride = 4.4; school.teacher = T; people.push({ a: T, kind: 'teacher', home, t: R(2, 5), room: ROOMS3[0], sitT: -1 });
  const looks = [[0xe63946, 0x1d3557, 0x5a3825], [0xffca3a, 0x3d405b, 0xd8b45c], [0x8ac926, 0x264653, 0x2b1d14], [0xff70a6, 0x6b705c, 0x8a5a2b], [0x3a86ff, 0x22223b, 0x1b1b1b], [0xf4a261, 0x3d405b, 0x6f4e37],
    [0x2a9d8f, 0x1d3557, 0xc9a66b], [0xb5179e, 0x3d405b, 0x2b1d14], [0x90be6d, 0x264653, 0x5a3825], [0xffd166, 0x1d3557, 0x3b2b20], [0x118ab2, 0x2b2d42, 0x8a5a2b], [0xef476f, 0x264653, 0x1b1b1b]];
  const names = ['Bence', 'Lili', 'Marci', 'Zsófi', 'Ádám', 'Dóri', 'Gergő', 'Panni', 'Levi', 'Bori', 'Máté', 'Kata'], GIRLS = new Set(['Lili', 'Zsófi', 'Dóri', 'Panni', 'Bori', 'Kata']);
  // Petyus's place: the front row (nearest the board), the middle desk, its window-side chair; four more places stay empty
  const mine = desks.findIndex((d) => d.row === 0 && Math.abs(d.z - (-7.6)) < 0.01);
  Object.assign(seat, desks[mine]);
  const free = new Set([mine, 3, 10, 14, 17]);
  let k = 0;
  desks.forEach((d, i) => {
    if (free.has(i) || k >= looks.length) return;
    const girl = GIRLS.has(names[k]);
    const [shirt, pants, hair] = looks[k], a = new Actor(makePerson({ scale: 0.7, shirt, pants, hair, hat: false, glasses: k % 5 === 2, dress: girl && k % 2 === 1, longHair: girl }), names[k]); k++;
    a.place(d.x, d.z, -Math.PI / 2); a.seatH = 0.45; a.sit = a.sitTarget = 1; a.stride = 7;
    pupils.push({ a, girl, seat: { x: d.x, z: d.z }, room: ROOMS3[0], pupil: true, state: 'seat', t: R(1, 6), look: 0, out: false });   // (crowdTick moves them)
  });
  // the 6. a next door: its teacher at the board, fourteen children
  const r2 = ROOMS3[1];
  const T2 = new Actor(makePerson({ scale: 0.95, shirt: 0x2a6f97, pants: 0x2b2d42, hair: 0x3b2b20, dress: false, glasses: false, hat: false }), 'Tanár bácsi');
  const home2 = new V3(r2.x0 + 0.9, 0, -7.3);
  T2.place(home2.x, home2.z, Math.PI / 2); T2.stride = 4.4; r2.teacher = T2; ROOMS3[0].teacher = T; people.push({ a: T2, kind: 'teacher', home: home2, t: R(2, 5), room: r2, sitT: -1 });
  const names2 = ['Kristóf', 'Emma', 'Botond', 'Hanna', 'Zalán', 'Luca', 'Áron', 'Zoé', 'Milán', 'Anna', 'Noel', 'Nóra', 'Dani', 'Olivér'];
  const GIRLS2 = new Set(['Emma', 'Hanna', 'Luca', 'Zoé', 'Anna', 'Nóra']), free2 = new Set([1, 6, 11, 16]);
  let k2 = 0;
  r2.desks.forEach((d, i) => {
    if (free2.has(i) || k2 >= names2.length) return;
    const nm = names2[k2], girl = GIRLS2.has(nm), [shirt, pants, hair] = looks[(k2 * 5 + 3) % looks.length]; k2++;
    const a = new Actor(makePerson({ scale: R(0.68, 0.72), shirt, pants, hair, hat: false, glasses: k2 % 6 === 0, dress: girl && k2 % 2 === 0, longHair: girl }), nm);
    a.place(d.x, d.z, -Math.PI / 2); a.seatH = 0.45; a.sit = a.sitTarget = 1; a.stride = 7;
    pupils.push({ a, girl, seat: { x: d.x, z: d.z }, room: r2, pupil: true, state: 'seat', t: R(1, 6), look: 0, out: false });
  });

}
function updatePeople(dt) {
  const P = G.petike.pos;
  for (const p of people) {
    const a = p.a;
    if (p.kind === 'pupil') {   // facing the board (west); now and then to a neighbour, or to Petyus going by
      p.t -= dt; if (p.t <= 0) { p.t = R(2, 6); p.look = pick([0, 0, 0.6, -0.6]); }
      const near = Math.hypot(P.x - a.pos.x, P.z - a.pos.z) < 1.6 && !school.seated;
      a.targetHeading = near ? Math.atan2(P.x - a.pos.x, P.z - a.pos.z) : -Math.PI / 2 + p.look;
      a.update(dt);
    } else if (p.kind === 'teacher' && p.out) {   // after 14:00 out on the square, watching the children
      if (!a.path) a.targetHeading = Math.atan2(-2 - a.pos.x, 9 - a.pos.z) + Math.sin(G.clockT * 0.3 + p.home.x) * 0.8;
      a.update(dt);
    } else if (p.kind === 'teacher' && !p.out && teacherBreak(p, dt, school.min)) {   // the teachers: the break in the corridor, sitting down (the mischiefs)
    } else if (p.kind === 'teacher' && a === school.teacher && lesson(school.min)) {   // the 6. b: now and then she writes on the board
      if (ck.writing) {
        a.targetHeading = -Math.PI / 2; a.update(dt);
        const r = a.rig, w = Math.sin(G.clockT * 7) * 0.15; r.sh[0].rotation.x = -2.1 + w; r.sh[0].rotation.z = 0.2; if (r.elbow) r.elbow[0] = 0.5; a.sync();   // the chalk hand up
        if ((ck.wDur -= dt) <= 0) { ck.writing = false; ck.wT = R(9, 15); }
      } else {
        ck.wT -= dt;
        if (ck.wT <= 0 && !a.path) { ck.writing = true; ck.wDur = R(6, 9); school.chalkT = 0.2; a.walkTo([[0.6, -7.3 + R(-1.2, 1.2)]], 0.9); }
        p.t -= dt; if (p.t <= 0 && !a.path && !ck.writing) { p.t = R(3, 7); a.walkTo([[p.home.x + R(0, 0.5), p.home.z + R(-1.8, 1.8)]], 0.8); }
        if (!a.path) a.targetHeading = Math.PI / 2;
        a.update(dt);
      }
    } else if (p.kind === 'teacher') {   // walking a little in front of the board, facing the class
      p.t -= dt; if (p.t <= 0 && !a.path) { p.t = R(3, 7); a.walkTo([[p.home.x + R(0, 0.5), p.home.z + R(-1.8, 1.8)]], 0.8); }
      if (!a.path) a.targetHeading = Math.PI / 2;
      a.update(dt);
    } else if (p.kind === 'still') { a.targetHeading = p.h; a.update(dt);
    } else {
      p.t -= dt; if (!a.path && p.t <= 0) { p.t = R(0.5, 2.5); a.walkTo(p.field ? [[R(FIELD.x0 + 3, FIELD.x1 - 3), R(FIELD.z0 + 3, FIELD.z1 - 3)]] : [[R(-13, 11), R(6, 13)]], R(1.6, 3.0)); }
      a.update(dt);
    }
    if (school.seated) continue;
    const dx = P.x - a.pos.x, dz = P.z - a.pos.z, d = Math.hypot(dx, dz), m = a.sit > 0.5 ? 0.42 : 0.5;
    if (d < m && d > 1e-4) { P.x = a.pos.x + dx / d * m; P.z = a.pos.z + dz / d * m; }
  }
}

// ---------------------------------------------------------------- doors that open (E): the entrance (two glass wings), the
// classrooms (wood, the class on a plate), the toilets (white, a boy / a girl sign). All in walls running along x; they open
// inwards (north). A closed door has a collider; the leaves belong to their wall (they fade / sink with it).
const doors = [];
function signTex(kind, text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  if (kind === 'class') {
    x.fillStyle = '#f7f3e8'; x.fillRect(0, 0, 256, 160); x.strokeStyle = '#2a4a7a'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 150);
    x.fillStyle = '#2a4a7a'; x.font = 'bold 86px Bangers, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 84);
  } else {   // a toilet sign: the figure (blue boy / red girl in a dress) and FIÚ / LÁNY
    const girl = kind === 'girl', col = girl ? '#e63946' : '#2a6fd6';
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); x.strokeStyle = col; x.lineWidth = 12; x.strokeRect(6, 6, 244, 244);
    x.fillStyle = col; x.beginPath(); x.arc(128, 58, 24, 0, Math.PI * 2); x.fill();
    if (girl) { x.beginPath(); x.moveTo(128, 86); x.lineTo(86, 170); x.lineTo(170, 170); x.closePath(); x.fill(); x.fillRect(108, 168, 12, 30); x.fillRect(136, 168, 12, 30); }
    else { x.fillRect(102, 86, 52, 72); x.fillRect(104, 156, 18, 44); x.fillRect(134, 156, 18, 44); }
    x.fillRect(88, 90, 14, 52); x.fillRect(154, 90, 14, 52);
    x.font = 'bold 40px Bangers, sans-serif'; x.textAlign = 'center'; x.fillText(text, 128, 238);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeDoor(cx, wallZ, width, o) {
  const leaves = o.double ? 2 : 1, lw = width / leaves, h = 2.2, d = { x: cx, z: wallZ, open: false, t: 0, piv: [], name: o.name };
  const mat = new THREE.MeshLambertMaterial({ color: o.color });
  const hinges = leaves === 1 ? [[cx - width / 2, 1]] : [[cx - width / 2, 1], [cx + width / 2, -1]];
  const parts = [];
  for (const [hx, s] of hinges) {
    const pv = new THREE.Group(); pv.position.set(hx, 0, wallZ);
    if (o.glass) {   // a dark frame round a glass pane
      const fr = new THREE.MeshLambertMaterial({ color: 0x3b3f45 }), gl = new THREE.MeshLambertMaterial({ color: 0x9fc4dd, transparent: true, opacity: 0.6 });
      for (const [w, hh, x, y] of [[lw - 0.02, 0.1, 0, 0.05], [lw - 0.02, 0.1, 0, h - 0.05], [0.08, h, -lw / 2 + 0.05, h / 2], [0.08, h, lw / 2 - 0.05, h / 2], [lw - 0.02, 0.06, 0, 1.0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.06), fr); m.position.set(s * lw / 2 + x, y, 0); pv.add(m); }
      const g = new THREE.Mesh(new THREE.BoxGeometry(lw - 0.16, h - 0.2, 0.02), gl); g.position.set(s * lw / 2, h / 2, 0); pv.add(g);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.06), new THREE.MeshLambertMaterial({ color: 0xc8ccd0 })); hd.position.set(s * (lw - 0.15), 1.05, 0.07); pv.add(hd);
    } else {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(lw - 0.02, h, 0.05), mat); leaf.position.set(s * lw / 2, h / 2, 0); leaf.castShadow = true; pv.add(leaf);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.06), new THREE.MeshLambertMaterial({ color: 0xa7abb0 })); hd.position.set(s * (lw - 0.12), 1.0, 0.05); pv.add(hd);
      if (o.sign) {   // the plate on the corridor side
        const sz = o.sign.kind === 'class' ? [0.42, 0.26] : [0.34, 0.34];
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(...sz), new THREE.MeshLambertMaterial({ map: signTex(o.sign.kind, o.sign.text), transparent: true }));
        sg.position.set(s * lw / 2, 1.6, 0.03); pv.add(sg);
      }
    }
    pv.userData.s = s; d.piv.push(pv); parts.push(pv);
  }
  addBoxCol(cx - width / 2, wallZ - 0.1, cx + width / 2, wallZ + 0.1, FLOOR); d.col = colliders[colliders.length - 1];
  onWall(parts, 'z', wallZ);
  doors.push(d);
  return d;
}
function toggleDoor(d) {
  d.open = !d.open; d.col.h = d.open ? -1 : FLOOR;
  soundAt(d.x, d.z, () => { tone('sine', d.open ? 320 : 220, d.open ? 200 : 140, 0.12, 0.07); if (!d.open) noise(0.08, 400, 1, 0.12, 0.2); }, 1);
}
function updateDoors(dt) {
  for (const d of doors) { d.t = damp(d.t, d.open ? 1 : 0, 6, dt); for (const pv of d.piv) pv.rotation.y = pv.userData.s * d.t * 1.55; }   // (+: swings north for both hinges)
}

// ---------------------------------------------------------------- the toilets (boys x 24 … 30, girls x 30 … 36): stalls with
// toilets (a seat that flips up – E), sinks with mirrors, urinals for the boys; tiled floor. Space at a toilet: peeing (pee.js),
// or flushing. A girl stands at the girls' sinks – if Petyus walks in…
const toilets = [];
export const WC = { boys: { x0: 24, x1: 30 }, girls: { x0: 30, x1: 36 } };
function buildToilets() {
  scene.add(partMesh((b) => {
    for (let x = 24; x < 36; x += 0.5) for (let z = SCHOOL.z0; z < CORR - 0.12; z += 0.5) b.bx(x + 0.25, 0, z + 0.25, 0.5, 0.045, 0.5, ((x + z) * 2) % 2 === 0 ? 0xe9edf0 : 0xc9d3db, 0, 0.01);
    for (const [x0, xs] of [[24, [24.55, 25.95, 27.35]], [30, [30.55, 31.95, 33.35, 34.75]]]) {   // the stall partitions (1.9 m), a back panel line
      for (const x of xs) b.bx(x, 0.12, SCHOOL.z0 + 0.8, 0.05, 1.8, 1.6, 0x8fb7d6, 0, 0.01);
      b.bx(x0 + 0.05, 0, SCHOOL.z0 + 1.6, 0.02, 0.02, 0.02, 0xffffff, 0, 0);
    }
    // wall tiles up to 1.5 m on the walls of both rooms (on the corridor wall's room face)
    for (const [a0, a1] of [[24, 25.6], [26.6, 32.6], [33.6, 36]]) b.bx((a0 + a1) / 2, 0, CORR - 0.135, a1 - a0, 1.5, 0.01, 0xdfe8ee, 0, 0.01);   // (not across the doorways)
    // the sinks with mirrors (on the corridor wall), the boys' urinals (on the west wall)
    for (const x of [28.3, 29.3, 34.5, 35.4]) { b.bx(x, 0.75, CORR - 0.32, 0.5, 0.12, 0.36, 0xffffff, 0, 0); b.bx(x, 0, CORR - 0.24, 0.12, 0.75, 0.12, 0xeeeeee, 0, 0); b.bx(x, 0.9, CORR - 0.2, 0.04, 0.12, 0.12, 0xb8bcc0, 0, 0); b.bx(x, 1.2, CORR - 0.14, 0.45, 0.6, 0.02, 0xbfe3f5, 0, 0.02); }
    for (const z of [-9.2, -8.3, -7.4]) { b.bx(24.25, 0.45, z, 0.3, 0.6, 0.36, 0xffffff, 0, 0); b.bx(24.33, 0.55, z, 0.14, 0.4, 0.26, 0xdbe7ef, 0, 0); }
  }));
  for (const x of [28.3, 29.3, 34.5, 35.4]) addBoxCol(x - 0.25, CORR - 0.5, x + 0.25, CORR - 0.12, 0.9);
  for (const z of [-9.2, -8.3, -7.4]) addBoxCol(24.06, z - 0.18, 24.4, z + 0.18, 1.0);
  for (const x of [24.55, 25.95, 27.35, 30.55, 31.95, 33.35, 34.75]) addBoxCol(x - 0.03, SCHOOL.z0, x + 0.03, SCHOOL.z0 + 1.6, 1.9);
  // the toilets: the catalogue's (without its seat) and a seat that flips up
  for (const [x, girls] of [[25.25, false], [26.65, false], [31.25, true], [32.65, true], [34.05, true]]) {
    const z = SCHOOL.z0 + 0.37;
    put('toilet', x, z, 0, 1, { ground: true, col: true });
    const pv = new THREE.Group(); pv.position.set(x, TOILET.hinge.y - 0.005, z + TOILET.hinge.z); scene.add(pv);
    const seatM = new THREE.Mesh(toiletSeatGeometry(), vcMat); seatM.castShadow = true; pv.add(seatM);
    const t = { x, z, girls, st: 1, seatT: 0, pv };
    t.wc = { x, z, state: () => t.st, root: scene, wet: () => {}, scold: (seat) => say(cleaner(), seat ? 'Ki pisilt az ülőkére?! Fel kell hajtani, gyerekek!!' : 'Ki pisilt mellé?! Megmondom az osztályfőnöknek!!', 2.8, 'Takarító néni') };
    toilets.push(t);
  }
  // a girl at the girls' sinks
  const g = new Actor(makePerson({ scale: 0.7, shirt: 0xff70a6, pants: 0x3d405b, hair: 0x5a3825, dress: true, hat: false }), 'Réka');
  g.place(34.9, CORR - 0.85, Math.PI); people.push({ a: g, kind: 'still', h: Math.PI });
}
const cleaner = () => ({ name: 'Takarító néni', rig: { root: { visible: true } }, headWorld: (v) => v.set(18, 2.2, -1.3) });
function updateToilets(dt) {
  for (const t of toilets) { t.seatT = damp(t.seatT, t.st === 2 ? 1 : 0, 8, dt); t.pv.rotation.x = -t.seatT * Math.PI * 0.46; }
  // Petyus in the girls' toilet
  const P = G.petike.pos, inGirls = P.x > WC.girls.x0 + 0.1 && P.z < CORR - 0.2;
  if (inGirls && !school.inGirls) { const r = people.find((p) => p.a.name === 'Réka'); if (r) { r.a.targetHeading = Math.atan2(P.x - r.a.pos.x, P.z - r.a.pos.z); say(r.a, pick(['Iiiii! Petyus! Ez a lányvécé! Kifelé!!', 'KIFELÉ!! Ez a LÁNYVÉCÉ!!']), 2.6); } }
  school.inGirls = inGirls;
}
function flush(t) {
  soundAt(t.x, t.z, () => { tone('square', 900, 700, 0.05, 0.05); noise(1.7, 700, 0.5, 0.3, 0.1); noise(1.2, 1600, 0.7, 0.12, 0.3); tone('sine', 260, 110, 1.3, 0.05, 0.2); }, 1.4);
  say({ headWorld: (o) => o.set(t.x, 1.1, t.z + 0.2) }, 'HÚÚÚSSS!', 1.6, '');
  peeFlushed();
}

// ---------------------------------------------------------------- the lights: every room has its ceiling lights and a switch
// inside by its door (E – villany fel / le); the corridor's are always on. A light is a point light under the ceiling (no
// shadow); switched off it stays in the scene with no intensity (adding / removing lights would recompile every shader).
// Inside the building the sun has (almost) no effect: the daylight is turned down while Petyus is in, the rooms are lit by
// their own lamps and a soft, even light (indoorLight).
const LIGHTS = [
  // (the switch: on the door's latch side – the door hangs on its west edge, so it does not hide the switch when open)
  { name: '6. b', x0: 0, x1: 12, sw: 6.0, on: true }, { name: '6. a', x0: 12, x1: 24, sw: 18.0, on: true },   // (the classrooms: on from the start)
  { name: 'fiú WC', x0: 24, x1: 30, sw: 27.0, on: false }, { name: 'lány WC', x0: 30, x1: 36, sw: 34.0, on: false },
];
const lamps = [];
// every lamp is a rectangular panel on the ceiling with its light right under it (the light comes from the panels, nothing else):
// a classroom 2 × 2, a toilet 1, the corridor 3 (always on)
const FIX_ON = 0xffffff, FIX_OFF = 0xc9c9c3;
// (fewer lights than panels: every light costs on every pixel of the whole scene – a classroom's four panels share two)
function lightAt(x, z, list, d = 7.5) { const l = new THREE.PointLight(0xfff6e4, 0, d, 1.2); l.position.set(x, FLOOR - 0.25, z); scene.add(l); list.push(l); }
function lampAt(x, z, list, fixes, on = true) {
  if (list) lightAt(x, z, list);
  const f = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.38), new THREE.MeshBasicMaterial({ color: on ? FIX_ON : FIX_OFF })); f.position.set(x, FLOOR - 0.06, z); ceil.add(f); fixes.push(f);
}
function buildLights() {
  for (const L of LIGHTS) {
    L.lights = []; L.fix = [];
    const wide = L.x1 - L.x0 > 8;
    if (wide) { for (const dx of [3.5, 8.5]) { for (const z of [-9.4, -5.3]) lampAt(L.x0 + dx, z, null, L.fix); lightAt(L.x0 + dx, -7.35, L.lights, 9); } L.I = 8; }
    else { lampAt((L.x0 + L.x1) / 2, (SCHOOL.z0 + CORR) / 2, L.lights, L.fix); L.I = 7; }
    // the switch: a plate with a rocker on the room side of the corridor wall, by the door
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.02), new THREE.MeshLambertMaterial({ color: 0xf7f7f4 })); plate.position.set(L.sw, 1.05, CORR - 0.15);   // (in front of the toilets' wall tiles too)
    const rk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), new THREE.MeshLambertMaterial({ color: 0xdedbd2 })); rk.position.set(L.sw, 1.05, CORR - 0.165);
    L.rocker = rk; onWall([plate, rk], 'z', CORR - 0.06);
    lamps.push(L); showLight(L);
  }
  // the corridor: three panels, always on
  const cl = [], cf = [];
  for (const x of [6, 18, 30]) lampAt(x, -1.3, null, cf);
  for (const x of [9, 27]) lightAt(x, -1.3, cl, 11);
  for (const l of cl) l.intensity = 6;
}
function toggleLight(L) { L.on = !L.on; showLight(L); tone('square', 1200, 900, 0.03, 0.05); }
function showLight(L) {
  for (const l of L.lights) l.intensity = L.on ? L.I : 0;
  for (const f of L.fix) f.material.color.set(L.on ? FIX_ON : FIX_OFF);
  L.rocker.material.color.set(L.on ? 0xffc24d : 0xdedbd2); L.rocker.rotation.x = L.on ? -0.35 : 0;
}
// the daylight inside: k = 1 inside the building (or in the first-person view there), 0 outside
const day = { k: 0, sun: 0, hemi: [] };
function indoorLight(dt) {
  if (!day.sun) { day.sun = sun.intensity; scene.traverse((o) => { if (o.isHemisphereLight) day.hemi.push([o, o.intensity]); }); }
  day.k = damp(day.k, inside() ? 1 : 0, 4, dt);
  sun.intensity = day.sun * (1 - 0.88 * day.k);
  for (const [h, i] of day.hemi) h.intensity = i * (1 - 0.45 * day.k);
}

// ---------------------------------------------------------------- the break: the children come out of the school – the boys
// play football on the grass field (a ball, two goals), the girls play hopscotch on the square; when the bell rings for the
// lesson they go back in (through the entrance) and the yard is empty again.
const HOP = { x: -4.2, z0: 6.6, step: 0.62 };   // the hopscotch grid on the square (8 squares northwards → southwards)
const HOP_SQ = [[0, 0], [0, 1], [-0.32, 2], [0.32, 2], [0, 3], [-0.32, 4], [0.32, 4], [0, 5]];
const crowd = { on: false, boys: [], girls: [], ball: null, bv: new V3(), hopper: -1, hopK: 0, hopT: 0, cheerT: 2, goalT: 0 };
const DOOR_OUT = { x: 2.6, z: 3.6 };
function buildCrowd() {
  // the classes' children: the boys to the field (into the two teams), the girls round the hopscotch
  pupils.forEach((p, i) => {
    if (p.girl) { const an = (crowd.girls.length / 12) * Math.PI * 2; p.home = new V3(HOP.x + Math.cos(an) * 2.4, 0, HOP.z0 + 2.2 + Math.sin(an) * 2.0); crowd.girls.push(p); }
    else { p.team = crowd.boys.length % 2; p.home = new V3(p.team ? R(24, 34) : R(10, 20), 0, R(FIELD.z0 + 3, FIELD.z1 - 3)); crowd.boys.push(p); }
  });
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshLambertMaterial({ color: 0xf4f4f4, flatShading: true }));
  ball.castShadow = true; ball.visible = false; ball.position.set((FIELD.x0 + FIELD.x1) / 2, 0.11, (FIELD.z0 + FIELD.z1) / 2); scene.add(ball); crowd.ball = ball;
}
// the bell decides: out at the start of a break, back in at the start of a lesson
// the way from a seat in the 6. b out to the yard (and back): along the aisle, through the classroom door, the corridor, the entrance
const outRoute = (k) => { const s = k.seat, dx = k.room.door; return [[s.x + 0.45, s.z], [s.x + 0.45, -3.4], [dx, -3.3], [dx, -1.4], [2.6, -1.1], [2.6, 1.2], [2.6, 4.4]]; };
const AROUND = [11.5, 19.2];   // the field is beyond the low building: round its west side
// early: the 6. b's teacher let her class out before the bell (ck – „Előre a mutatót!”): only they go; the 6. a follows at the bell
function crowdTick(dt, brk, early = false) {
  const all = [...crowd.boys, ...crowd.girls], want = brk || early;
  const goOut = (list, rooms) => {
    for (const d of doors) if (!d.open && (rooms.includes(d.name) || d.name === 'bejárat')) toggleDoor(d);
    for (const r of ROOMS3) if (rooms.includes(r.cls) && inside()) setTimeout(() => say(r.teacher, pick(['Szünet! Irány az udvar!', 'Mindenki ki a friss levegőre!', 'Szünet van, gyerekek, ki az udvarra!']), 2.2), 900 + r.x0 * 60);
    list.forEach((k, i) => { k.wait = (k.pupil ? 0.4 : 3.0) + i * 0.3; k.play = false; k.state = 'leaving'; });
  };
  if (want && !crowd.on) {   // the break: the class stands up and goes out (the door is opened), the others come out of the entrance
    crowd.on = true; crowd.part = !brk;
    goOut(brk ? all : all.filter((k) => !k.pupil || k.room === ROOMS3[0]), brk ? ['6. b', '6. a'] : ['6. b']);
    crowd.ball.visible = true; crowd.ball.position.set((FIELD.x0 + FIELD.x1) / 2, 0.11, (FIELD.z0 + FIELD.z1) / 2); crowd.bv.set(0, 0, 0);
  } else if (brk && crowd.on && crowd.part) {   // the real bell after an early release: now the 6. a comes out too
    crowd.part = false;
    goOut(all.filter((k) => k.pupil && k.room === ROOMS3[1] && !k.out), ['6. a']);
  } else if (!want && crowd.on) {   // the bell: everybody in – the class back to their seats
    crowd.on = false; crowd.hopper = -1; crowd.part = false;
    for (const k of all) {
      k.play = false;
      if (!k.out) { k.state = k.pupil ? 'seat' : 'in'; continue; }
      k.state = 'returning';
      const via = crowd.boys.includes(k) ? [AROUND] : [];
      if (k.pupil) k.a.walkTo([...via, [k.a.pos.x > 12 ? 4.6 : k.a.pos.x, Math.max(Math.min(k.a.pos.z, 14), 4.6)], ...outRoute(k).reverse()], R(2.6, 3.2));
      else k.a.walkTo([...via, [DOOR_OUT.x + R(-0.8, 0.8), 6], [DOOR_OUT.x, DOOR_OUT.z - 0.4]], R(2.6, 3.4));
    }
  }
  const P = G.petike.pos;
  for (const k of all) {
    if (k.state === 'leaving' && (k.wait -= dt) <= 0) {   // off they go
      const via = crowd.boys.includes(k) ? [AROUND] : [];
      if (k.pupil) { k.a.sitTarget = 0; if (k.a.sit < 0.1) { k.state = 'out'; k.out = true; k.a.walkTo([...outRoute(k), ...via, [k.home.x, k.home.z]], R(2.4, 3.0)); } }
      else { k.state = 'out'; k.out = true; k.a.place(DOOR_OUT.x, DOOR_OUT.z, 0); k.a.rig.root.visible = true; k.a.walkTo([[DOOR_OUT.x + R(-1, 1), 6], ...via, [k.home.x, k.home.z]], R(2.4, 3.2)); }
    }
    if (k.state === 'out' && !k.a.path) k.play = true;   // arrived: now they play
    if (k.state === 'returning' && !k.a.path) {   // back: the class in their seats, the others gone in
      k.out = false;
      if (k.pupil) { k.state = 'seat'; k.a.place(k.seat.x, k.seat.z, -Math.PI / 2); k.a.sitTarget = 1; }
      else { k.state = 'in'; k.a.rig.root.visible = false; }
    }
    if (k.pupil && k.state === 'seat') {   // a lesson: always sitting, on their own chair
      k.a.sitTarget = 1;
      if (!k.a.path && Math.hypot(k.a.pos.x - k.seat.x, k.a.pos.z - k.seat.z) > 0.05) k.a.place(k.seat.x, k.seat.z, -Math.PI / 2);
    }
    if (k.pupil && (k.state === 'seat' || (k.state === 'leaving' && k.a.sit > 0.1))) {   // in their seats: facing the board, now and then a neighbour / Petyus
      k.t -= dt; if (k.t <= 0) { k.t = R(2, 6); k.look = pick([0, 0, 0.6, -0.6]); }
      const near = Math.hypot(P.x - k.a.pos.x, P.z - k.a.pos.z) < 1.6 && !school.seated;
      k.a.targetHeading = near ? Math.atan2(P.x - k.a.pos.x, P.z - k.a.pos.z) : -Math.PI / 2 + k.look;
      k.a.update(dt);
      if (!school.seated) { const dx = P.x - k.a.pos.x, dz = P.z - k.a.pos.z, d = Math.hypot(dx, dz); if (d < 0.42 && d > 1e-4) { P.x = k.a.pos.x + dx / d * 0.42; P.z = k.a.pos.z + dz / d * 0.42; } }
      continue;
    }
    if (!k.out) continue;
    k.a.update(dt);
    const dx = P.x - k.a.pos.x, dz = P.z - k.a.pos.z, d = Math.hypot(dx, dz);   // nobody walks through Petyus
    if (d < 0.5 && d > 1e-4) { P.x = k.a.pos.x + dx / d * 0.5; P.z = k.a.pos.z + dz / d * 0.5; }
  }
  if (!crowd.on) { if (!crowd.boys.some((k) => k.out)) crowd.ball.visible = false; return; }
  footballTick(dt); hopscotchTick(dt);
}
// football: the nearest boy runs for the ball and kicks it on – to a team mate, or at the other team's goal
function footballTick(dt) {
  const B = crowd.ball.position, v = crowd.bv;
  B.x += v.x * dt; B.z += v.z * dt; v.multiplyScalar(Math.pow(0.45, dt));
  crowd.ball.rotation.x += v.z * dt * 4; crowd.ball.rotation.z -= v.x * dt * 4;
  const cz = (FIELD.z0 + FIELD.z1) / 2;
  if (B.z < FIELD.z0 + 0.5 || B.z > FIELD.z1 - 0.5) { v.z *= -0.6; B.z = THREE.MathUtils.clamp(B.z, FIELD.z0 + 0.5, FIELD.z1 - 0.5); }
  if (B.x < FIELD.x0 + 1.6 || B.x > FIELD.x1 - 1.6) {
    if (Math.abs(B.z - cz) < 1.6 && crowd.goalT <= 0) {   // a goal!
      crowd.goalT = 3; const scorers = crowd.boys.filter((k) => k.play); const sc = pick(scorers);
      if (sc) say(sc.a, pick(['GÓÓÓL!!', 'Benne van!!', 'GÓL! Ez az!']), 1.8);
      soundAt(B.x, B.z, () => noise(0.6, 900, 0.4, 0.12), 1.2);
      setTimeout(() => { B.set((FIELD.x0 + FIELD.x1) / 2, 0.11, cz); v.set(0, 0, 0); }, 1200);
    }
    v.x *= -0.6; B.x = THREE.MathUtils.clamp(B.x, FIELD.x0 + 1.6, FIELD.x1 - 1.6);
  }
  crowd.goalT -= dt;
  let near = null, nd = 1e9;
  for (const k of crowd.boys) { if (!k.play) continue; const d = Math.hypot(k.a.pos.x - B.x, k.a.pos.z - B.z); if (d < nd) { nd = d; near = k; } }
  for (const k of crowd.boys) {
    if (!k.play) continue;
    if (k === near) {   // chase the ball, kick it when there
      k.chase = true;
      if (nd < 0.45) {
        const goalX = k.team ? FIELD.x0 + 1 : FIELD.x1 - 1, mates = crowd.boys.filter((m) => m.play && m.team === k.team && m !== k);
        const to = Math.random() < 0.45 || !mates.length ? new V3(goalX, 0, cz + R(-1.5, 1.5)) : pick(mates).a.pos;
        const dx = to.x - B.x, dz = to.z - B.z, d = Math.hypot(dx, dz) || 1, sp = R(5, 9);
        v.set(dx / d * sp, 0, dz / d * sp);
        soundAt(B.x, B.z, () => tone('triangle', 180, 90, 0.08, 0.12), 1);
        k.a.kickT = 0;
      } else { k.a.path = [new V3(B.x, 0, B.z)]; k.a.speed = 3.2; }
    } else {   // keep their place, drifting with the play
      k.chase = false;
      const tx = k.home.x + (B.x - 22) * 0.3, tz = k.home.z + (B.z - cz) * 0.3;
      if (Math.hypot(k.a.pos.x - tx, k.a.pos.z - tz) > 1.2) { k.a.path = [new V3(tx, 0, tz)]; k.a.speed = 2.0; }
      else if (!k.a.path) k.a.targetHeading = Math.atan2(B.x - k.a.pos.x, B.z - k.a.pos.z);
    }
  }
}
// hopscotch: one girl hops the squares (one foot / two feet), the others watch and cheer; then the next one
function hopscotchTick(dt) {
  const gs = crowd.girls.filter((k) => k.play && !k.a.path);
  if (crowd.hopper < 0) {
    if (gs.length >= 2) { crowd.hopper = crowd.girls.indexOf(pick(gs)); crowd.hopK = -1; crowd.hopT = 0.4; const g = crowd.girls[crowd.hopper]; g.a.path = [new V3(HOP.x, 0, HOP.z0 - 0.6)]; g.a.speed = 1.6; }
    return;
  }
  const g = crowd.girls[crowd.hopper]; if (!g.play) { crowd.hopper = -1; return; }
  for (const k of gs) if (k !== g) k.a.targetHeading = Math.atan2(g.a.pos.x - k.a.pos.x, g.a.pos.z - k.a.pos.z);
  if (g.a.path) return;
  crowd.hopT -= dt;
  const r = g.a.rig;
  if (crowd.hopT <= 0) {
    crowd.hopK++;
    if (crowd.hopK >= HOP_SQ.length) {   // done: back to her place, the next one
      const others = crowd.girls.filter((q) => q.play && q !== g); say((others.length ? pick(others) : g).a, pick(['Ügyes!', 'Hibátlan!', 'Most én jövök!']), 1.4);
      g.a.walkTo([[g.home.x, g.home.z]], 1.4); crowd.hopper = -1; return;
    }
    const [dx, dz] = HOP_SQ[crowd.hopK];
    g.a.pos.set(HOP.x + dx, 0, HOP.z0 + dz * HOP.step); g.a.heading = g.a.targetHeading = 0; crowd.hopT = 0.42;
    soundAt(g.a.pos.x, g.a.pos.z, () => tone('sine', 220, 160, 0.05, 0.05), 0.8);
  }
  // one foot on a single square, both feet on a pair
  const single = crowd.hopK >= 0 && HOP_SQ[crowd.hopK] && HOP_SQ[crowd.hopK][0] === 0;
  r.knee[0].rotation.x = single ? 1.2 : 0.15; g.a.sync();
  const k = 1 - Math.max(0, crowd.hopT) / 0.42;
  if (crowd.hopK >= 0) r.root.position.y += Math.sin(Math.min(1, k) * Math.PI) * 0.22;   // the hop (after sync: it sets the height)
}

// ---------------------------------------------------------------- the walls' view: see-through or sunk (T, like at home), solid in
// the first-person view and when zoomed out (then the upper floors and the roof are on as well); the pictures go with their wall
const inside = () => { const P = G.petike.pos; return P.x > SCHOOL.x0 - 0.3 && P.x < SCHOOL.x1 + 0.3 && P.z > SCHOOL.z0 - 0.3 && P.z < SCHOOL.z1 + 0.3; };
function updateWalls(dt, solid) {
  const P = G.petike.pos, inn = inside(), fade = wallView.mode === 'fade';
  for (const w of walls) {
    let between = false;
    if (inn && !solid) between = w.alongX ? (CAM_OFF.z > 0 ? w.c > P.z + 0.1 : w.c < P.z - 0.1) : (CAM_OFF.x > 0 ? w.c > P.x + 0.1 : w.c < P.x - 0.1);
    w.s = damp(w.s, between && !fade ? 0.15 : 1, 8, dt); w.o = damp(w.o, between && fade ? 0.16 : 1, 8, dt);
    w.g.scale.y = w.s;
    for (const m of w.mats) { m.opacity = w.o; m.depthWrite = w.o > 0.98; }
    w.glass.opacity = 0.22 * w.o;
    for (const p of w.pics) p.visible = w.s > 0.9;
  }
  if (upper) upper.visible = !inn || solid;   // (in the first-person view it stays: seen through the windows)
  if (low) { const full = !inn || solid; low.m.visible = full; low.stub.visible = !full; }
}

// ---------------------------------------------------------------- the school's sounds: the bell (every lesson starts and ends with
// it – 45 minutes, 10 minutes' break), the children's chatter (loud in the breaks), the chalk on the board, shouts in the yard
const LESSONS = 6;
const lesson = (min) => { const t = min - 8 * 60, n = Math.floor(t / 55); return t >= 0 && n < LESSONS && t - n * 55 < 45; };
// what the HUD shows: which lesson (and what), or the break and how long it still lasts; wd: Monday 0 … Friday 4
export function schoolStatus(min, wd) {
  const t = min - 8 * 60, n = Math.floor(t / 55), r = t - n * 55, subj = (k) => TIMETABLE[Math.max(0, Math.min(4, wd))][k];
  if (t < 0) return { brk: true, text: '🔔 Mindjárt becsengetnek' };
  if (n >= LESSONS || (n === LESSONS - 1 && r >= 45)) return { brk: true, text: min < AFTERNOON ? `🍽️ Ebédszünet · még ${Math.ceil(AFTERNOON - min)} perc` : '🏠 Délután – mindenki kint az udvaron' };
  if (r < 45) return { brk: false, text: `📚 ${n + 1}. óra · ${subj(n)} · még ${Math.ceil(45 - r)} perc` };
  return { brk: true, text: `🔔 Szünet · még ${Math.ceil(55 - r)} perc` + (n + 1 < LESSONS ? ` · utána: ${subj(n + 1)}` : '') };
}
function sBellRing(x, z) {
  soundAt(x, z, () => { for (let k = 0; k < 44; k++) { tone('square', 1480, 1470, 0.03, 0.05, k * 0.05); tone('sine', 2960, 2950, 0.03, 0.025, k * 0.05 + 0.025); } }, 2.2);
}
function updateSounds(dt, min) {
  const P = G.petike.pos, inn = inside();
  // the bell at the start and the end of every lesson
  const t = Math.floor(min - 8 * 60), n = Math.floor(t / 55), mark = t >= 0 && n < LESSONS && (t % 55 === 0 || t % 55 === 45);
  if (mark && school.bellMin !== t) {   // the bell, and a big sign: the lesson begins / the break
    school.bellMin = t; sBellRing(18, -1.3);
    bigText(t % 55 === 0 ? `BECSENGETTEK! ${n + 1}. ÓRA` : (n + 1 >= LESSONS ? 'VÉGE A TANÍTÁSNAK!' : 'SZÜNET!'), 2.2);
  }
  const brk = !lesson(min);
  // chatter: a murmur of children's voices – soft in a lesson, loud in a break (and in the yard in a break)
  school.chatT -= dt;
  if (school.chatT <= 0) {
    school.chatT = brk ? R(0.08, 0.2) : R(0.3, 0.8);
    const near = inn ? { x: P.x + R(-3, 3), z: P.z + R(-2, 2) } : { x: R(-12, 10), z: R(6, 14) };
    if (inn || brk) soundAt(near.x, near.z, () => { noise(R(0.08, 0.22), R(700, 1900), 2.2, brk ? 0.05 : 0.018); if (Math.random() < 0.3) tone('triangle', R(380, 620), R(340, 700), 0.12, brk ? 0.03 : 0.01); }, 1);
    if (brk && !inn && Math.random() < 0.02) { const kids = [...crowd.boys, ...crowd.girls].filter((k) => k.out && k.a.rig.root.visible); if (kids.length) say(pick(kids).a, pick(['Hahó!', 'Passzold ide!', 'Nem ér!', 'Én jövök!', 'Lőj már!']), 1.4); }
  }
  // the chalk squeaks while the teacher writes (in a lesson)
  if (!brk && ck.writing && (school.chalkT -= dt) <= 0) {
    school.chalkT = R(0.8, 2.2);
    if (Math.hypot(P.x - 1, P.z + 7.3) < 12) soundAt(0.4, -7.3, () => { for (let k = 0; k < 4; k++) tone('sine', R(2600, 3400), R(2800, 3600), 0.07, 0.025, k * 0.12); noise(0.4, 3000, 3, 0.02); }, 1);
  }
}

// ---------------------------------------------------------------- Petyus's place: E – sitting down / standing up (ep2.js: seating)
export function schoolAction() {
  const P = G.petike.pos;
  if (pee.on) return null;
  for (const t of toilets) if (Math.hypot(P.x - t.x, P.z - (t.z + 0.62)) < 0.55) return { toilet: t, txt: (t.st === 2 ? 'E – ülőke lehajtása' : 'E – ülőke felhajtása') + (isTouch ? '' : canPee(t.wc) ? ' · Szóköz – pisilés' : ' · Szóköz – lehúzás'), kick: canPee(t.wc) ? 'PISILÉS' : 'LEHÚZÁS' };
  for (const L of lamps) if (Math.hypot(P.x - L.sw, P.z - (CORR - 0.45)) < 0.6) return { light: L, txt: (L.on ? 'E – villany le' : 'E – villany fel') + ` (${L.name})` };
  let bd = null, bdist = 1.1;
  for (const d of doors) { const r = Math.hypot(P.x - d.x, P.z - d.z); if (r < bdist) { bdist = r; bd = d; } }
  if (bd) return { door: bd, txt: (bd.open ? 'E – ajtó becsukása' : 'E – ajtó kinyitása') + ` (${bd.name})` };
  if (nearGate()) return { txt: 'E – hazaindulás', gate: true };
  // „Vizes szivacs”: the sponge – from the board, soaked at a sink, onto the teacher's chair (or back)
  if (!carry.what && sponge.where === 'board' && Math.hypot(P.x - sponge.home.x - 0.45, P.z - sponge.home.z) < 0.8) return { sponge: 'take', txt: 'E – a táblatörlő szivacs elvétele' };
  if (!carry.what && sponge.where === 'chair' && Math.hypot(P.x - TCHAIR.x, P.z - (TCHAIR.z + 0.6)) < 0.75) return { sponge: 'take', txt: 'E – a szivacs elvétele a székről' };
  if (sponge.where === 'hand') {
    if (SINKS.some((x) => Math.hypot(P.x - x, P.z - (CORR - 0.75)) < 0.55)) return { sponge: 'soak', txt: sponge.wet ? 'E – még jobban beáztatni (már csuromvizes)' : 'E – a szivacs beáztatása a csap alatt' };
    if (Math.hypot(P.x - TCHAIR.x, P.z - (TCHAIR.z + 0.6)) < 0.75) return { sponge: 'chair', txt: 'E – a szivacs a tanári székre' };
    if (Math.hypot(P.x - sponge.home.x - 0.45, P.z - sponge.home.z) < 0.8) return { sponge: 'board', txt: 'E – a szivacs vissza a táblához' };
  }
  // „Béka a fiókban”: catch the frog by its bush, into the 6. a's teacher's drawer (or let it go)
  if (!carry.what && sponge.where !== 'hand' && frog.where === 'yard' && !frog.path && Math.hypot(P.x - frog.mesh.position.x, P.z - frog.mesh.position.z) < 0.75) return { frog: 'catch', txt: 'E – a béka elkapása' };
  if (carry.what === 'frog') return Math.hypot(P.x - FDESK.x, P.z - FDESK.z) < 0.8 ? { frog: 'drawer', txt: 'E – a béka a tanári asztal fiókjába' } : { frog: 'free', txt: 'E – a béka elengedése' };
  // „Hol a szemüvegem?”: her glasses from her desk (in a break), put down anywhere – or given back to her
  if (!carry.what && sponge.where !== 'hand' && gl.where === 'desk' && Math.hypot(P.x - (GDESK.x + 0.6), P.z - GDESK.z) < 0.8) return { glasses: 'take', txt: 'E – a tanító néni szemüvegének elvétele' };
  if (!carry.what && gl.where === 'floor' && Math.hypot(P.x - gl.at.x, P.z - gl.at.z) < 0.7) return { glasses: 'take', txt: 'E – a szemüveg felvétele' };
  if (carry.what === 'glasses') return gl.search && Math.hypot(P.x - school.teacher.pos.x, P.z - school.teacher.pos.z) < 1.4 ? { glasses: 'give', txt: 'E – „Tanító néni, itt a szemüvege!”' } : { glasses: 'drop', txt: 'E – a szemüveg letétele ide (elrejtés)' };
  // „Előre a mutatót!”: the teacher's chair under the clock, up on it, the hand forward (+5 minutes) – and the chair back
  if (tchair.on) return { clock: 'push', txt: ck.early ? 'Mozgás – leszállás a székről' : 'E – a mutató előre (+5 perc) · mozgás – leszállás', kick: '' };
  if (Math.hypot(P.x - CLOCK.x, P.z - CLOCK.z) < 1.0) {
    if (tchair.at) return { clock: 'climb', txt: 'E – felállás a székre' + (isTouch ? '' : ' · Szóköz – a szék vissza a helyére'), kick: 'SZÉK VISSZA' };
    if (lesson(school.min) && !ck.early) return { clock: 'drag', txt: 'E – a pótszék odahúzása a falióra alá' };
  }
  if (Math.hypot(P.x - (seat.x + 0.45), P.z - seat.z) < 0.8 || (school.seated && Math.hypot(P.x - seat.x, P.z - seat.z) < 0.6)) return { txt: school.seated ? 'E – felállás' : 'E – leülés (a helyed)', seat: true };
  return null;
}
// E and Space on what schoolAction found (the gate and the seat: ep2.js)
export function schoolUse(act) {
  if (act.frog) frogUse(act.frog);
  else if (act.glasses) glassesUse(act.glasses);
  else if (act.sponge) spongeUse(act.sponge);
  else if (act.clock === 'push') { if (!ck.early && ck.climbT <= 0) clockPush(); }
  else if (act.clock === 'drag') chairDrag();
  else if (act.clock === 'climb') chairClimb(true);
  else if (act.light) toggleLight(act.light);
  else if (act.door) toggleDoor(act.door);
  else if (act.toilet) { act.toilet.st = act.toilet.st === 2 ? 1 : 2; tone('sine', 700, 500, 0.05, 0.05); }
}
export function schoolKick(act) {
  if (act && act.clock === 'climb') { chairTo(false); return; }   // the chair back to her desk
  if (!act || !act.toilet) return;
  if (canPee(act.toilet.wc)) startPee(act.toilet.wc); else flush(act.toilet);
}
export function toggleSeat(seating) {
  school.seated = !school.seated;
  Object.assign(seating, { on: school.seated, x: seat.x, z: seat.z, h: -Math.PI / 2, seatH: 0.45, chair: true, base: 0 });
  tone('sine', school.seated ? 180 : 240, school.seated ? 120 : 300, 0.15, 0.05);
  if (school.seated && !school.seatedSaid) { school.seatedSaid = true; setTimeout(() => say(school.teacher, 'Na végre, Petyus! Örülök, hogy megtisztelsz minket.', 2.8), 600); }
}

// ---------------------------------------------------------------- „Előre a mutatót!”: the clock forward, the early break, the reveal
const teacherSees = () => !ck.writing && !school.teacher.path;   // (facing the class – writing she has her back to it)
function chairDrag() {
  if (teacherSees()) { ck.caught = true; say(school.teacher, 'Petyus! Mit csinálsz ott hátul azzal a székkel?! Ülj vissza a helyedre!', 2.8); return; }
  chairTo(true); say(G.petike, 'Hopp…', 1);
}
function chairClimb(up) {
  const P = G.petike;
  tchair.on = up;
  if (up) { P.place(CLOCK.x + 0.2, CLOCK.z, Math.PI / 2); P.pos.y = CHAIR_TOP; soundAt(CLOCK.x, CLOCK.z, () => tone('triangle', 200, 140, 0.1, 0.08), 1); }
  else { P.place(CLOCK.x - 0.45, CLOCK.z, -Math.PI / 2); P.pos.y = 0; soundAt(CLOCK.x, CLOCK.z, () => noise(0.12, 600, 1, 0.12), 1); }
}
// every frame from ep2.js movePetyus: while he stands on the chair he does not walk; a movement key gets him down
export function schoolStand(dt, moveKey) {
  if (!tchair.on) return false;
  const P = G.petike;
  if (moveKey && ck.climbT <= 0) { chairClimb(false); return false; }
  P.pos.y = CHAIR_TOP; P.animate(dt, false, 0); P.sync();
  return true;
}
function clockPush() {
  ck.climbT = 1.2; G.petike.cheer = 1.0;   // on the chair, the arms up to the clock
  soundAt(CLOCK.x, CLOCK.z, () => { for (let k = 0; k < 6; k++) tone('square', 2400, 2400, 0.02, 0.03, 0.1 + k * 0.09); }, 1);   // the clock's clicks
  const T = school.teacher, sees = teacherSees();
  if (sees) {   // she is facing the class: caught
    ck.caught = true; ck.off = 0; clocks[0].draw(school.min);
    setTimeout(() => say(T, pick(['Petyus! Szállj le onnan! Mit csinálsz a faliórával?!', 'Petyus! A faliórához nem nyúlunk! Vissza a helyedre!']), 2.8), 300);
    setTimeout(() => { if (tchair.on) chairClimb(false); chairTo(false); }, 1200);
    return;
  }
  ck.off += 5; clocks[0].draw(school.min + ck.off);
  if (Math.random() < 0.5) setTimeout(() => say(pick(pupils.filter((k) => k.room === ROOMS3[0] && k.a.rig.root.visible))?.a || G.petike, pick(['Hihi…', 'Petyus, mit csinálsz?', 'Psszt!']), 1.4), 600);
}
function clockTick(dt, min) {
  ck.climbT -= dt;
  const T = school.teacher, real = lesson(min);
  if (!real) {   // a break (or the lesson is over): if she let them out early, the bell gives it away
    if (ck.early) {
      const m = ck.earlyMin, caught = ck.caught;
      setTimeout(() => say(ROOMS3[1].teacher, 'Már szünet van? A 6. b már kint focizik?!', 2.6), 1500);
      setTimeout(() => say(T, 'Hm… a karórám szerint most csengettek. Valaki elállította a faliórát!', 3), 4300);
      setTimeout(() => award('r2-ora', m, { caught }), 6500);
      ck.early = false;
    }
    if (ck.off) { ck.off = 0; clocks[0].draw(min); }   // (she puts it right in the break)
    if (tchair.at && !tchair.on) chairTo(false);
    ck.writing = false; ck.caught = false;
    return;
  }
  if (ck.early || ck.writing || T.path) return;
  if (tchair.at && !tchair.on && !tchair.back) {   // her chair under the clock: she takes it back (and wonders)
    tchair.back = true; say(T, pick(['Mit keres az a szék a falióra alatt?', 'Ki húzta oda azt a széket? Tegyétek a helyére!']), 2.4);
    setTimeout(() => { chairTo(false); tchair.back = false; }, 1600);
    return;
  }
  // facing the class: now and then she glances at the clock
  if ((ck.lookT -= dt) > 0) return;
  ck.lookT = R(2.5, 4);
  const shown = min + ck.off, left = lessonEnd(min) - shown;
  if (ck.off > 0 && shown >= lessonEnd(min)) {   // by the clock the lesson is over (or long over): out you go – only the 6. b
    ck.early = true; ck.earlyMin = Math.round(lessonEnd(min) - min);
    say(T, 'Ó, már ennyi az idő? Na, gyerekek, mára ennyi – szünet! Kifelé!', 3);
  } else if (left > 0 && left <= 12 && Math.floor(left / 5) !== ck.said && Math.random() < 0.3) { ck.said = Math.floor(left / 5); say(T, `Még ${Math.ceil(left)} perc, gyerekek!`, 2); }
}

// ---------------------------------------------------------------- „Vizes szivacs a széken”
function spongeUse(what) {
  const m = sponge.mesh;
  if (what === 'take') { sponge.where = 'hand'; tone('sine', 520, 780, 0.1, 0.05); }
  else if (what === 'soak') {
    sponge.wet = true; m.material.color.set(0x4e3a26); m.scale.set(1.15, 1.25, 1.15);   // darker, swollen
    soundAt(G.petike.pos.x, G.petike.pos.z, () => { noise(1.2, 1800, 0.6, 0.08); noise(0.6, 900, 0.8, 0.05, 0.4); }, 1);
    say(G.petike, pick(['Hehe… csuromvizes.', 'Na, ez jól megszívta magát…']), 1.6);
  } else if (what === 'chair') { sponge.where = 'chair'; m.position.set(TCHAIR.x, 0.48, TCHAIR.z); m.rotation.set(0, 0.3, 0); tone('sine', 600, 420, 0.1, 0.05); if (sponge.wet) soundAt(TCHAIR.x, TCHAIR.z, () => noise(0.25, 700, 1, 0.08), 1); }
  else if (what === 'board') { sponge.where = 'board'; m.position.copy(sponge.home); m.rotation.set(0, 0, 0); tone('sine', 600, 420, 0.1, 0.05); }
}
const _hp = new V3();
function spongeTick(dt, min) {
  const m = sponge.mesh, P = G.petike;
  if (gl.where === 'hand' && gl.mesh) { if (gl.mesh.parent !== scene) scene.add(gl.mesh); handPos(_hp); gl.mesh.position.set(_hp.x, _hp.y, _hp.z); gl.mesh.rotation.set(0, P.heading, 0); }
  frogTick(dt);
  if (!m) return;
  if (sponge.where === 'hand') {   // in his right hand (it drips when wet)
    P.rig.handBones?.[0] ? P.rig.handBones[0].getWorldPosition(_hp) : _hp.set(P.pos.x, 0.8, P.pos.z);
    m.position.set(_hp.x, _hp.y - 0.04, _hp.z); m.rotation.y = P.heading;
    if (sponge.wet && (sponge.dripT -= dt) <= 0) { sponge.dripT = 0.25; spawnFx(new V3(_hp.x, _hp.y - 0.07, _hp.z), new V3(0, -0.5, 0), 0x6fb7e0, 0.025, 0.6, -6); }
    // the teacher in the corridor sees him with it
    const T = school.teacher;
    if (!sponge.seen && !lesson(min) && Math.hypot(T.pos.x - P.pos.x, T.pos.z - P.pos.z) < 2.4 && Math.hypot(sponge.mesh.position.x - P.pos.x, sponge.mesh.position.z - P.pos.z) < 0.6) { sponge.seen = true; say(T, 'Petyus, mit csinálsz azzal a szivaccsal?', 2.4); setTimeout(() => say(P, 'Semmit… letörlöm a táblát!', 2), 2200); }
  }
}
// the teachers: in a break out in the corridor (by their door); at the start of a lesson back to the desk, they sit down for a
// moment („Na, nézzük a naplót…”) – the 6. b's onto whatever is on her chair (and she puts her glasses on – if they are still
// there), the 6. a's opens his drawer for the register (and whatever is in it jumps out)
function teacherBreak(p, dt, min) {
  const a = p.a, brk = !lesson(min), r = p.room, ours = r === ROOMS3[0], ch = { x: r.x0 + 1.32, z: -9.6 }, spot = { x: r.door + 1.5, z: -1.3 };
  if (ours && gl.search) return glassesSearch(p, dt, min);
  if (brk && !p.brk && !p.out && min >= 8 * 60) {
    p.brk = true; p.back = false;
    if (ours && gl.where === 'head') { gl.where = 'desk'; scene.add(gl.mesh); gl.mesh.position.set(GDESK.x, 0.8, GDESK.z); gl.mesh.rotation.set(0, Math.PI / 2, 0); say(a, 'Hű, de fáradt a szemem… leteszem a szemüvegem.', 2.2); }
    a.walkTo([[p.home.x + 0.8, -3.6], [r.door, -3.4], [r.door, -1.6], [spot.x, spot.z]], 1.1);
  }
  if (!brk && p.brk && !p.back) { p.back = true; if (ours) ck.writing = false; a.walkTo([[r.door, -1.6], [r.door, -3.4], [r.x0 + 1.9, -3.8], [r.x0 + 1.9, -9.0], [ch.x + 0.1, ch.z + 0.5]], 1.4); }
  if (p.back && !a.path && p.sitT < 0) {   // at the chair: sit down
    a.place(ch.x, ch.z, Math.PI / 2); a.seatH = 0.45; a.sitTarget = 1; p.sitT = 0;
    say(a, ours ? pick(['Na, nézzük a naplót…', 'Üljetek le, gyerekek!', 'Csendet kérek!']) : pick(['Na, hol is a napló…', 'Csend legyen!']), 2);
  }
  if (p.sitT >= 0) {
    p.sitT += dt;
    if (ours && sponge.where === 'chair' && a.sit > 0.7 && !sponge.hit) spongeHit(a);
    if (ours && p.sitT > 0.8 && !p.glDone) { p.glDone = true; glassesOn(a); }
    if (!ours && frog.where === 'drawer' && p.sitT > 1.2 && !frog.out) frogOut(p);
    if (frog.out && !ours) return frogTeacher(p, dt);
    const busy = ours && sponge.hit;
    if (p.sitT > (busy ? 1.0 : 4.5)) a.sitTarget = 0;
    if (p.sitT > (busy ? 2.0 : 5.5)) { p.sitT = -1; p.brk = false; p.back = false; p.glDone = false; if (ours) sponge.hit = false; if (!(ours && gl.search)) a.walkTo([[p.home.x, p.home.z]], 0.9); }
    a.update(dt); return true;
  }
  if (p.brk) { if (!a.path && !p.back) a.targetHeading = Math.PI; a.update(dt); return true; }
  return false;
}
function spongeHit(T) {
  sponge.hit = true;
  if (!sponge.wet) {   // a dry sponge: just odd
    say(T, 'Hát ez meg hogy került ide?', 2.2);
    setTimeout(() => spongeUse('board'), 1500);
    return;
  }
  T.sitTarget = 0; T.cheer = 1.2;
  say(T, 'HŰŰŰŰ!!', 1.6); soundAt(TCHAIR.x, TCHAIR.z, () => { noise(0.4, 600, 0.7, 0.2); tone('sine', 900, 1400, 0.3, 0.1); }, 1);
  for (let k = 0; k < 6; k++) spawnFx(new V3(TCHAIR.x + R(-0.15, 0.15), 0.5, TCHAIR.z + R(-0.15, 0.15)), new V3(R(-0.6, 0.6), R(0.6, 1.4), R(-0.6, 0.6)), 0x6fb7e0, 0.03, 0.8, -6);
  const kids = pupils.filter((k) => k.room === ROOMS3[0] && k.a.rig.root.visible);
  kids.slice(0, 4).forEach((k, i) => setTimeout(() => say(k.a, pick(['HAHAHA!', 'Hihihi!', 'Hahaha, vizes!', 'HAHA!']), 1.4), 500 + i * 300));
  soundAt(6, -7, () => { for (let k = 0; k < 10; k++) tone('triangle', R(400, 700), R(300, 650), 0.12, 0.03, k * 0.11); }, 1);
  const seen = sponge.seen;
  setTimeout(() => say(T, 'Ki volt ez?! Ki tette a vizes szivacsot a székemre?!', 2.8), 2000);
  if (seen) setTimeout(() => say(T, 'Petyus! Láttalak a folyosón azzal a szivaccsal!', 2.8), 5000);
  else setTimeout(() => { const k = pick(kids); if (k) say(k.a, 'Nem tudjuk, tanító néni!', 2); }, 5000);
  setTimeout(() => { spongeUse('board'); sponge.wet = false; sponge.mesh.material.color.set(0x8a6a4a); sponge.mesh.scale.set(1, 1, 1); award('r2-szivacs', seen ? 2 : 3, { seen }); }, 6500);
  sponge.seen = false;
}

// ---------------------------------------------------------------- „Béka a fiókban” (r2-beka) and „Hol a szemüvegem?” (r2-szemuveg)
// carry: what Petyus has in his hand of these two ('frog' | 'glasses' | null – the sponge has its own)
export const carry = { what: null };
export const frog = { mesh: null, where: 'yard', home: new V3(-9.0, 0, 3.3), hopT: 1, hop: null, path: null, out: false, peeked: false, caught: false, done: false };
export const gl = { mesh: null, face: null, where: 'head', at: new V3(), search: false, t: 0, stage: 0, step: 0, returned: false };
const GDESK = { x: 1.9, z: -9.25 };   // where she leaves her glasses (her desk)
const FDESK = { x: 14.55, z: -9.6 };  // in front of the 6. a's teacher's desk (its drawer)
function buildFrog() {
  const g = new THREE.Group(), grn = new THREE.MeshLambertMaterial({ color: 0x4caf50 }), dk = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.15), grn); body.position.y = 0.05; g.add(body);
  for (const sx of [-0.04, 0.04]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), grn); e.position.set(sx, 0.1, 0.05); g.add(e); const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0x111111 })); p2.position.set(sx, 0.105, 0.068); g.add(p2); }
  for (const sx of [-0.08, 0.08]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.1), dk); l.position.set(sx, 0.02, -0.04); g.add(l); }
  g.position.copy(frog.home); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g); frog.mesh = g;
}
const handPos = (out) => { const P = G.petike; P.rig.handBones?.[0] ? P.rig.handBones[0].getWorldPosition(out) : out.set(P.pos.x, 0.8, P.pos.z); return out; };
const sees = (a, p, far, cone) => { const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz); if (d > far) return false; let da = Math.atan2(dx, dz) - a.heading; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < cone; };
function frogHopTo(x, z) { frog.hop = { x0: frog.mesh.position.x, z0: frog.mesh.position.z, x1: x, z1: z, t: 0 }; frog.mesh.rotation.y = Math.atan2(x - frog.mesh.position.x, z - frog.mesh.position.z); }
function frogTick(dt) {
  const m = frog.mesh, P = G.petike; if (!m) return;
  if (frog.where === 'hand') { handPos(_hp); m.position.set(_hp.x, _hp.y - 0.05, _hp.z); m.rotation.y = P.heading; return; }
  if (frog.hop) {   // a hop: an arc
    const h = frog.hop; h.t = Math.min(1, h.t + dt * 2.6);
    m.position.set(h.x0 + (h.x1 - h.x0) * h.t, (frog.hopY || 0) + Math.sin(h.t * Math.PI) * 0.18, h.z0 + (h.z1 - h.z0) * h.t);
    if (h.t >= 1) { frog.hop = null; m.position.y = frog.hopY || 0; if (Math.random() < 0.3) say({ headWorld: (o) => o.set(m.position.x, 0.45, m.position.z) }, 'BREKK!', 0.9); }
    return;
  }
  if (frog.path && frog.path.length) { const [x, z] = frog.path.shift(); frog.hopY = 0; frogHopTo(x, z); if (!frog.path.length) frog.path = null; return; }
  if (frog.where === 'yard') {   // now and then a hop near its bush; it hops off if Petyus comes close
    const d = Math.hypot(P.pos.x - m.position.x, P.pos.z - m.position.z);
    if ((frog.hopT -= dt) <= 0 || (d < 1.0 && Math.random() < dt * 0.8)) {
      frog.hopT = R(2, 4);
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.4;
      frogHopTo(frog.home.x + Math.cos(a) * r, frog.home.z + Math.sin(a) * r);
    }
  }
}
function frogUse(what) {
  const P = G.petike;
  if (what === 'catch') {
    if (Math.random() < 0.5) { frog.where = 'hand'; carry.what = 'frog'; frog.hop = null; say(P, 'Megvagy, brekike!', 1.4); tone('sine', 520, 780, 0.1, 0.05); }
    else { const a = Math.atan2(frog.mesh.position.x - P.pos.x, frog.mesh.position.z - P.pos.z); frogHopTo(frog.mesh.position.x + Math.sin(a) * 1.1, frog.mesh.position.z + Math.cos(a) * 1.1); say(P, pick(['Elugrott!', 'Hé, gyere vissza!']), 1.2); }
  } else if (what === 'drawer') {
    const T2 = ROOMS3[1].teacher;
    if (T2.pos.z < CORR && T2.pos.x > 12 && T2.pos.x < 24 && sees(T2, P.pos, 6, 1.3)) {   // he is in the room and sees it
      frog.caught = true; say(T2, 'Hát te mit keresel az asztalomnál, fiam?', 2.4);
      frog.where = 'yard'; carry.what = null; frog.mesh.position.set(P.pos.x, 0, P.pos.z); frog.path = [[P.pos.x + 0.8, P.pos.z + 1], [14, -3.4], [17.1, -3.3], [17.1, -1.4], [2.6, -1.2], [2.6, 1.2], [2.6, 4.4], [frog.home.x, frog.home.z]];
      setTimeout(() => say(P, 'Csak… egy béka volt nálam. Már nincs.', 2), 2000);
      return;
    }
    frog.where = 'drawer'; carry.what = null; frog.mesh.visible = false; soundAt(FDESK.x, FDESK.z, () => { noise(0.15, 800, 1, 0.12); noise(0.12, 600, 1, 0.12, 0.35); }, 1);   // the drawer out and in
    say(P, 'Hihi… jó lesz neki ott.', 1.4);
  } else if (what === 'free') { frog.where = 'yard'; carry.what = null; frog.mesh.position.set(P.pos.x, 0, P.pos.z); frog.path = [[P.pos.x + 0.5, P.pos.z + 0.4]]; }
}
// the 6. a's teacher opens his drawer: the frog jumps out, he is up on his desk, the frog hops off to the corridor, past the 6. b
function frogOut(p) {
  const T2 = p.a; frog.out = true; frog.tt = 0; frog.where = 'loose'; frog.peeked = false;
  frog.mesh.visible = true; frog.mesh.position.set(p.room.x0 + 1.9, 0.78, -9.45); frog.hopY = 0.78;
  say({ headWorld: (o) => o.set(p.room.x0 + 1.9, 1.3, -9.45) }, 'BREKK!', 1.2); soundAt(p.room.x0 + 1.9, -9.5, () => { tone('square', 140, 90, 0.18, 0.12); tone('square', 120, 80, 0.18, 0.1, 0.25); }, 1);
  setTimeout(() => { say(T2, 'ÁÁÁ!! Egy BÉKA!!', 1.8); T2.sitTarget = 0; }, 400);
  setTimeout(() => { T2.place(p.room.x0 + 1.9, -9.6, Math.PI / 2); T2.pos.y = 0.78; T2.cheer = 6; }, 900);   // up on the desk
  const kids = pupils.filter((k) => k.room === ROOMS3[1] && k.a.rig.root.visible);
  kids.slice(0, 5).forEach((k, i) => setTimeout(() => say(k.a, pick(['IIIIIII!', 'Egy béka!!', 'Hahaha!', 'Fúúúj!', 'Brekk-brekk!']), 1.4), 900 + i * 280));
  // its way: down, through the room, out of the door, along the corridor to the 6. b's door, then out to the yard
  setTimeout(() => { frog.hopY = 0; frog.path = [[p.room.x0 + 2.6, -8.6], [p.room.x0 + 4, -6.5], [p.room.x0 + 5.1, -4.2], [p.room.door, -3.4], [p.room.door, -2.2], [p.room.door - 3, -1.6], [8, -1.6], [5.1, -1.8], [5.1, -2.7]]; }, 1500);
}
function frogTeacher(p, dt) {   // on the desk until the frog is gone; then down
  const T2 = p.a; frog.tt += dt;
  T2.update(dt); if (T2.pos.y > 0.1) { T2.pos.y = 0.78; T2.sync(); }
  if (!frog.peeked && !frog.path && !frog.hop && frog.mesh.position.x < 6) {   // at the 6. b's door
    frog.peeked = true; const d = doors.find((q) => q.name === '6. b'), open = d && d.open;
    if (open) { say(school.teacher, 'Egy BÉKA?! Gyerekek, maradjatok a helyeteken!', 2.6); pupils.filter((k) => k.room === ROOMS3[0]).slice(0, 3).forEach((k, i) => setTimeout(() => say(k.a, pick(['Egy béka!', 'Hahaha!', 'Brekk!']), 1.2), 600 + i * 300)); }
    frog.sixB = open;
    setTimeout(() => { frog.path = [[5.1, -1.4], [2.6, -1.1], [2.6, 1.2], [2.6, 4.4], [frog.home.x, frog.home.z]]; }, 1600);
  }
  if (frog.tt > 9 && T2.pos.y > 0.1) { T2.pos.y = 0; T2.cheer = 0; T2.place(p.room.x0 + 2.6, -9.0, Math.PI / 2); say(T2, 'Ki volt ez?! Na megállj, ha megtudom!', 2.4); }
  if (frog.tt > 9 && frog.peeked && !frog.done) { frog.done = true; const v = frog.caught ? 2 : 2 + (frog.sixB ? 1 : 0); setTimeout(() => award('r2-beka', v, { sixB: frog.sixB, caught: frog.caught }), 1500); }
  if (frog.tt > 11 && !frog.path && !frog.hop) { frog.out = false; frog.where = 'yard'; frog.done = false; frog.caught = false; p.sitT = -1; p.brk = false; p.back = false; T2.walkTo([[p.home.x, p.home.z]], 0.9); }
  return true;
}
// ---- the glasses
function glassesUse(what) {
  const P = G.petike;
  if (what === 'take') { gl.where = 'hand'; carry.what = 'glasses'; tone('sine', 520, 780, 0.1, 0.05); }
  else if (what === 'drop') { gl.where = 'floor'; carry.what = null; gl.at.set(P.pos.x + Math.sin(P.heading) * 0.3, 0, P.pos.z + Math.cos(P.heading) * 0.3); gl.mesh.position.set(gl.at.x, 0.03, gl.at.z); tone('sine', 600, 420, 0.1, 0.05); }
  else if (what === 'give') {   // back to her: a red point (but no ★★★)
    gl.returned = true; carry.what = null; glassesBack(school.teacher, true);
  }
}
function glassesOn(T) {   // at her desk: on with them – or they are gone
  if (gl.where === 'desk') { gl.where = 'head'; gl.face.add(gl.mesh); gl.mesh.position.set(0, 1.55, 0.165); gl.mesh.rotation.set(0, 0, 0); return; }
  gl.search = true; gl.t = 0; gl.stage = 1; gl.step = 0; gl.returned = false;
  say(T, 'Hol a szemüvegem? Itt hagytam az asztalon…', 2.6);
}
const scramble = (l) => l.split('').map((c) => (c === ' ' || Math.random() < 0.55 ? c : pick('abcdefgijklmnoprstuvz?/1234'.split('')))).join('');
function glassesSearch(p, dt, min) {
  const T = p.a, P = G.petike; gl.t += dt;
  const found = gl.where === 'floor' && Math.hypot(T.pos.x - gl.at.x, T.pos.z - gl.at.z) < 1.1;
  if (found || !lesson(min)) { glassesBack(T, false); p.sitT = -1; p.brk = false; p.back = false; T.update(dt); return true; }
  const go = (pts) => T.walkTo(pts, 0.9);
  // the steps: the desk → blind at the board (wrong names) → the shelves → the 6. a's teacher
  if (gl.step === 0 && gl.t > 2.6) { gl.step = 1; T.sitTarget = 0; go([[2.6, -9.0]]); }
  if (gl.step === 1 && gl.t > 5) { gl.step = 2; say(T, 'Nincs itt… Na mindegy, vakon is megy.', 2.4); ROOMS3[0].txt.material.map = boardText(ROOMS3[0].board.map(scramble)); go([[0.6, -7.3]]); }
  if (gl.step === 2 && gl.t > 9) {
    gl.step = 3; gl.stage = 2; T.targetHeading = Math.PI / 2;
    say(T, 'Botond, gyere ki a táblához!', 2.2);
    setTimeout(() => { const k = pick(pupils.filter((q) => q.room === ROOMS3[0] && q.a.rig.root.visible)); if (k) say(k.a, 'Botond a 6. a-ba jár, tanító néni!', 2.2); }, 2300);
    if (P.pos.z < CORR && P.pos.x < 12) setTimeout(() => say(T, 'Akkor te, kislány, ott elöl!', 2), 5000), setTimeout(() => say(P, 'Tanító néni… én Petyus vagyok.', 2), 7000);
  }
  if (gl.step === 2 && T.path === null && gl.t > 6) { T.targetHeading = -Math.PI / 2; const r = T.rig; r.sh[0].rotation.x = -2.1 + Math.sin(G.clockT * 7) * 0.2; }
  if (gl.step === 3 && gl.t > 15) { gl.step = 4; say(T, 'Hátha a polcon hagytam…', 2); go([[3.5, -6.5], [10.8, -9.6]]); }
  if (gl.step === 4 && gl.t > 22 && !T.path) {   // not found: next door – it must be him
    gl.step = 5; say(T, 'Nincs sehol. Ez csak a kolléga lehetett!', 2.4);
    go([[10, -4], [5.1, -3.4], [5.1, -1.6], [17.1, -1.6], [17.1, -2.3]]);
  }
  if (gl.step === 5 && !T.path && gl.t > 24) {
    gl.step = 6; gl.stage = 3;
    say(T, 'Kolléga! Nem látta a szemüvegemet? Biztos maga tette el!', 3);
    setTimeout(() => say(ROOMS3[1].teacher, 'Én? Ugyan, kolléganő! Nálam nincs!', 2.6), 3200);
    setTimeout(() => say(T, 'Hmpf. Szerencsére van egy tartalék a táskámban.', 2.6), 6200);
  }
  if (gl.step === 6 && gl.t > 34) { glassesBack(T, false); p.sitT = -1; p.brk = false; p.back = false; T.walkTo([[17.1, -1.6], [5.1, -1.6], [5.1, -3.4], [p.home.x, p.home.z]], 1.1); }
  T.update(dt);
  if (gl.step === 2 && !T.path) { const r = T.rig; r.sh[0].rotation.x = -2.1 + Math.sin(G.clockT * 7) * 0.2; r.sh[0].rotation.z = 0.2; T.sync(); }
  return true;
}
function glassesBack(T, given) {   // the search is over: the glasses on her nose, the board right again; the stars
  const stage = gl.stage, returned = given || gl.returned;
  gl.search = false; gl.where = 'head'; carry.what = null; gl.face.add(gl.mesh); gl.mesh.position.set(0, 1.55, 0.165); gl.mesh.rotation.set(0, 0, 0);
  ROOMS3[0].txt.material.map = boardText(ROOMS3[0].board);
  if (given) say(T, 'Ó, köszönöm, Petyus! Ezért jár egy piros pont!', 2.6);
  else if (stage < 3) say(T, 'Na végre! Itt van!', 2);
  if (stage >= 1) setTimeout(() => award('r2-szemuveg', returned ? Math.min(stage, 2) : stage, { returned, blamed: stage >= 3 && !returned }), 2500);
  gl.stage = 0;
}

// ---------------------------------------------------------------- build / tick
export function buildSchool() {
  walls.length = 0; desks.length = 0; people.length = 0; clocks.length = 0; doors.length = 0; toilets.length = 0;
  buildGround(); buildMain(); buildLow(); buildHall(); buildSquare();
  for (const r of ROOMS3) buildClassroom(r);
  buildCorridor(); buildCeiling(); buildToilets(); buildLights();
  makeDoor(2.6, SCHOOL.z1 + TW / 2, 2.8, { double: true, glass: true, name: 'bejárat' });
  makeDoor(5.1, CORR - 0.06, 1.0, { color: 0xb5793f, sign: { kind: 'class', text: '6. b' }, name: '6. b' });
  makeDoor(17.1, CORR - 0.06, 1.0, { color: 0xb5793f, sign: { kind: 'class', text: '6. a' }, name: '6. a' });
  makeDoor(26.1, CORR - 0.06, 1.0, { color: 0xf4f4f4, sign: { kind: 'boy', text: 'FIÚ' }, name: 'fiú WC' });
  makeDoor(33.1, CORR - 0.06, 1.0, { color: 0xf4f4f4, sign: { kind: 'girl', text: 'LÁNY' }, name: 'lány WC' });
  buildFurniture();
  buildPeople(); buildCrowd(); buildFrog();   // (the crowd is made of the classes' children: after them)
}
export function schoolRoom(x, z) {
  if (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1) return z > CORR ? 'Iskola – folyosó' : x >= 30 ? 'Iskola – lány WC' : x >= 24 ? 'Iskola – fiú WC' : 'Iskola – a ' + ROOMS3[Math.floor(x / 12)].cls + ' osztályterme';
  if (x < CAMPUS.x0 || z > CAMPUS.z1) return 'Az utca';
  return 'Iskola – udvar';
}
export const schoolFloor = (x, z) => (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1 ? (z > CORR ? 'stone' : x >= 24 ? 'tile' : 'wood') : 'stone');
// solid: the first-person view or zoomed out – walls solid, the roof on
// from 14:00 the teachers go out too (the children are already out: the afternoon)
const AFTERNOON = 14 * 60;
function teachersOut(min) {
  if (min < AFTERNOON || school.teachersOut) return;
  school.teachersOut = true;
  for (const d of doors) if (!d.open && (d.name === '6. b' || d.name === '6. a' || d.name === 'bejárat')) toggleDoor(d);
  people.filter((p) => p.kind === 'teacher').forEach((p, i) => {
    const r = ROOMS3.find((q) => p.home.x > q.x0 && p.home.x < q.x0 + 12), spot = i ? [6.5, 12.2] : [-7.5, 11.8];
    p.out = true;
    p.a.walkTo([[p.a.pos.x + 0.6, -3.4], [r.door, -3.3], [r.door, -1.4], [2.6, -1.1], [2.6, 1.2], [2.6, 4.4], spot], 1.3);
  });
}
export function updateSchool(dt, min, solid) {
  school.min = min;
  teachersOut(min);
  updateWalls(dt, solid); updatePeople(dt); updateSounds(dt, min); updateDoors(dt); updateToilets(dt); indoorLight(dt); clockTick(dt, min); spongeTick(dt, min); crowdTick(dt, !lesson(min), ck.early);
  if (Math.floor(min) !== school.lastMin) { school.lastMin = Math.floor(min); clocks.forEach((c, i) => c.draw(min + (i === 0 ? ck.off : 0))); }   // (the 6. b's: maybe put forward)
  if (school.seated && !G.petike.sitTarget && G.petike.sit < 0.05) school.seated = false;   // stood up with a movement key
  const P = G.petike.pos, inRoom = P.z < CORR && P.z > SCHOOL.z0 && P.x < 24 ? (P.x < 12 ? 0 : 1) : -1;
  school.talkT -= dt;
  if (school.talkT <= 0) {
    school.talkT = R(7, 12);
    if (inRoom === 0 && lesson(min)) say(school.teacher, school.seated ? pick(TEACHER_LINES) : pick(['Petyus, ülj a helyedre!', 'Petyus! Az első padban van a helyed!', ...TEACHER_LINES]), 2.8);
    else if (inRoom === 1 && lesson(min)) say(ROOMS3[1].teacher, pick(['Petyus! Te nem ebbe az osztályba jársz!', 'Kopogni illik, Petyus!', 'A 6. b a szomszédban van, fiam.', ...TEACHER_LINES]), 2.8);
    else { const kids = pupils.filter((p) => p.a.rig.root.visible && Math.hypot(p.a.pos.x - P.x, p.a.pos.z - P.z) < 5); if (kids.length) say(pick(kids).a, pick(KID_LINES), 2.4); }
  }
}
// the gate: E – going home
export const nearGate = () => Math.hypot(G.petike.pos.x - (GATE.x + 0.7), G.petike.pos.z - GATE.z) < 1.6;

