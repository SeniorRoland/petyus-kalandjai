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
import { Actor } from '../actors.js';
import { makePerson } from '../rigs.js';
import { CAM_OFF, scene } from '../scene.js';
import { G } from '../state.js';
import { isTouch } from '../input.js';
import { say } from '../ui.js';
import { R, V3, damp, pick } from '../util.js';
import { addBoxCol, colliders, partMesh, vcMat } from '../world.js';
import { TOILET, toiletSeatGeometry } from '../voxels-home.js';
import { canPee, pee, peeFlushed, startPee } from './pee.js';
import { noise, soundAt, tone } from '../audio.js';
import { buildFurniture, put, wallView } from './home.js';
import { WRITERS, boardText, hungaryMap, makeClock, portrait, timesTable, timetable } from './posters.js';

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
function windowAt(b, alongX, at, out, c, y, w, h, panes = 3, curtain = true) {
  const o = 0.03 * out;
  if (alongX) {
    b.bx(c, y - 0.06, at + o, w + 0.12, h + 0.12, 0.06, C.frame, 0, 0); b.bx(c, y, at + o * 2, w, h, 0.03, C.glass, 0, 0.03);
    if (curtain) b.bx(c, y + h * 0.35, at + o * 1.4, w * 0.96, h * 0.6, 0.02, C.curtain, 0, 0.02);
    for (let k = 1; k < panes; k++) b.bx(c - w / 2 + (w * k) / panes, y, at + o * 2.4, 0.05, h, 0.04, C.frame, 0, 0);
    b.bx(c, y + h * 0.72, at + o * 2.4, w, 0.05, 0.04, C.frame, 0, 0);   // the transom
  } else {
    b.bx(at + o, y - 0.06, c, 0.06, h + 0.12, w + 0.12, C.frame, 0, 0); b.bx(at + o * 2, y, c, 0.03, h, w, C.glass, 0, 0.03);
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
      windowAt(b, alongX, face, outer || 1, mid, 0.9, w, 1.6, 3, !!outer);
      if (!outer) windowAt(b, alongX, alongX ? z0 : x0, -1, mid, 0.9, w, 1.6, 3, false);
    }
  });
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  const mat = vcMat.clone(); mat.transparent = true; m.material = mat;   // its own material: it can fade on its own
  const col = (a, c) => { if (c - a < 0.01) return; if (alongX) addBoxCol(a, z0, c, z1, FLOOR); else addBoxCol(x0, a, x1, c, FLOOR); };
  let at = a0;
  for (const o of ops) { col(at, a0 + o.a); if (o.win) col(a0 + o.a, a0 + o.b); at = a0 + o.b; }
  col(at, a0 + len);
  walls.push({ g, alongX, c: alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, s: 1, o: 1, mats: [mat], pics: [] });
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
  if (alongX) b.bx((a + c) / 2, 0, face + out * 0.02, c - a, 0.9, 0.05, C.orange, 0, 0.02); else b.bx(face + out * 0.02, 0, (a + c) / 2, 0.05, 0.9, c - a, C.orange, 0, 0.02);
}

// ---------------------------------------------------------------- the main building: the ground floor (inside) + the upper floors
let upper = null, low = null;   // the two upper floors and the roof: hidden while Petyus is inside · the low building: sinks then
function buildMain() {
  const W = (a, b) => ({ a, b, win: true }), D = (a, b) => ({ a, b });
  const { x0, x1, z0, z1 } = SCHOOL;
  const classWins = []; for (let r = 0; r < 3; r++) for (const x of [1.5, 4.9, 8.3]) classWins.push(W(r * 12 + x, r * 12 + x + 2.2));   // three per room (none at the partitions)
  wall(x0, z0 - TW, x1 + TW, z0, classWins, -1);                                                      // north (the classrooms' windows)
  wall(x0, z1, x1 + TW, z1 + TW, [D(1.2, 4.0), W(6.2, 8.4), W(9.6, 11.8), W(15.4, 17.6), W(21.6, 23.8), W(27.4, 29.6), W(31.6, 33.8)], 1);   // south: the entrance, corridor windows
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
      for (let f = 1; f < 3; f++) for (let x = 1.4; x < 35; x += 3.0) windowAt(b, true, face, out, x + 1.1, f * FLOOR + 0.9, 2.2, 1.55, 3, true);
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
  { x0: 0, cls: '6. b', kind: 'ours', board: ['Matematika – Törtek', '3/4 + 1/8 = ?        2 1/2 · 4 = ?', 'Házi feladat: 47. oldal, 3–5.'] },
  { x0: 12, cls: '6. a', kind: 'other', board: ['Irodalom – Arany János: Toldi', '„Ég a napmelegtől a kopár szik sarja…”', 'Memoriter: az első versszak'] },
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
    b.bx(wx + 0.12, 0.96, bz + 1.4, 0.05, 0.04, 0.12, 0x8a6a4a, 0, 0);                                       // the sponge
  });
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 1.16), new THREE.MeshBasicMaterial({ map: boardText(r.board), transparent: true })); txt.position.set(wx + 0.085, 1.6, bz); txt.rotation.y = E;
  const ck = makeClock(); clocks.push(ck);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ map: ck.tex, transparent: true })); clock.position.set(wx + 0.05, 2.62, bz); clock.rotation.y = E;
  onWall([board, txt, clock], 'x', wx);
  // pictures: beside the board writers' portraits and the times table; on the back and corridor walls more portraits,
  // the map, the timetable
  const pic = (texture, w, h, x, y, z, face) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: texture, transparent: true })); m.position.set(x, y, z); m.rotation.y = face; return m; };
  const i0 = (x0 / 12) * 3;
  onWall([pic(portrait(WRITERS[i0 % WRITERS.length]), 0.5, 0.66, wx + 0.02, 1.75, -11.1, E), pic(portrait(WRITERS[(i0 + 1) % WRITERS.length]), 0.5, 0.66, wx + 0.02, 1.75, -10.4, E),
    pic(timesTable(), 1.0, 1.1, wx + 0.02, 1.55, -3.8, E)], 'x', wx);
  const sw = CORR - 0.12 - 0.012;   // the corridor wall's classroom face
  onWall([pic(timetable(), 1.05, 0.8, x0 + 2.0, 1.6, sw, Math.PI), pic(hungaryMap(), 1.6, 1.06, x0 + 8.4, 1.6, sw, Math.PI),
    pic(portrait(WRITERS[(i0 + 2) % WRITERS.length]), 0.5, 0.66, x0 + 6.4, 1.7, sw, Math.PI), pic(portrait(WRITERS[(i0 + 3) % WRITERS.length]), 0.5, 0.66, x0 + 10.4, 1.7, sw, Math.PI),
    pic(portrait(WRITERS[(i0 + 4) % WRITERS.length]), 0.5, 0.66, x0 + 11.1, 1.7, sw, Math.PI)], 'z', CORR - 0.06);
  // the teacher's desk by the board (she sits west of it, facing the class), the pupils' desks: 3 rows × 3, two chairs each
  put('desk', x0 + 1.9, -9.6, W, 0, { ground: true, col: true });   // (variant 0: the one with the monitor – the teacher's) put('chair', x0 + 1.32, -9.6, E, 1, { ground: true, col: true });
  for (const [k, x] of [[0, 4.3], [1, 6.3], [2, 8.3]]) for (const z of [-9.9, -7.3, -4.7]) {
    put('desk', x0 + x, z, E, 1, { ground: true, col: true });   // (variant 1: a plain desk)
    for (const s of [-0.3, 0.3]) {
      put('chair', x0 + x + 0.55, z + s, W, ours ? 0 : 2, { ground: true, col: true });
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), new THREE.MeshBasicMaterial({ color: 0xeeebe4, side: THREE.DoubleSide })); m.rotation.x = Math.PI / 2; m.position.set(18, FLOOR - 0.02, -6); ceil.add(m);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfdfbf2 });
  for (let x = 2; x < 36; x += 3) for (const z of [-9.5, -6, -1.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.2), lampMat); l.position.set(x, FLOOR - 0.05, z); ceil.add(l); }
}
export function setSchoolFps(on) { if (ceil) ceil.visible = on; }

// ---------------------------------------------------------------- people: the teacher at the board, the class at their desks,
// children on the square
const people = [];
const TEACHER_LINES = ['Gyerekek, figyeljetek a táblára!', 'Ki tudja a választ?', 'Csendet kérek!', 'Nyissátok ki a füzeteteket!', 'Szép munka!', 'Ki jön ki a táblához?', 'Holnap témazáró!'];
const KID_LINES = ['Szia, Petyus!', 'Láttad a tegnapi meccset?', 'Kölcsönadod a radírod?', 'Mi lesz az uzsonna?', 'Fogócska a szünetben?', 'Megcsináltad a házit?', 'Petyus, gyere ide!'];
export const school = { teacher: null, talkT: 6, seated: false, seatedSaid: false, chalkT: 4, chatT: 0, bellMin: -1, lastMin: -1 };
function buildPeople() {
  const T = new Actor(makePerson({ scale: 0.92, shirt: 0x6a4c93, pants: 0x3d405b, hair: 0x8a5a2b, dress: true, glasses: true, hat: false }), 'Tanító néni');
  const home = new V3(0.9, 0, -7.3);
  T.place(home.x, home.z, Math.PI / 2); T.stride = 4.4; school.teacher = T; people.push({ a: T, kind: 'teacher', home, t: R(2, 5) });
  const looks = [[0xe63946, 0x1d3557, 0x5a3825], [0xffca3a, 0x3d405b, 0xd8b45c], [0x8ac926, 0x264653, 0x2b1d14], [0xff70a6, 0x6b705c, 0x8a5a2b], [0x3a86ff, 0x22223b, 0x1b1b1b], [0xf4a261, 0x3d405b, 0x6f4e37],
    [0x2a9d8f, 0x1d3557, 0xc9a66b], [0xb5179e, 0x3d405b, 0x2b1d14], [0x90be6d, 0x264653, 0x5a3825], [0xffd166, 0x1d3557, 0x3b2b20], [0x118ab2, 0x2b2d42, 0x8a5a2b], [0xef476f, 0x264653, 0x1b1b1b]];
  const names = ['Bence', 'Lili', 'Marci', 'Zsófi', 'Ádám', 'Dóri', 'Gergő', 'Panni', 'Levi', 'Bori', 'Máté', 'Kata'];
  // Petyus's place: the front row (nearest the board), the middle desk, its window-side chair; four more places stay empty
  const mine = desks.findIndex((d) => d.row === 0 && Math.abs(d.z - (-7.6)) < 0.01);
  Object.assign(seat, desks[mine]);
  const free = new Set([mine, 3, 10, 14, 17]);
  let k = 0;
  desks.forEach((d, i) => {
    if (free.has(i) || k >= looks.length) return;
    const [shirt, pants, hair] = looks[k], a = new Actor(makePerson({ scale: 0.7, shirt, pants, hair, hat: false, glasses: k % 5 === 2, dress: k % 3 === 1 }), names[k]); k++;
    a.place(d.x, d.z, -Math.PI / 2); a.seatH = 0.45; a.sit = a.sitTarget = 1;
    people.push({ a, kind: 'pupil', t: R(1, 6), look: 0 });
  });
  for (const [n, x, z] of [[0, -8, 10], [1, -4, 12], [2, 6, 10], [3, 20, 30]]) {
    const [shirt, pants, hair] = looks[(n * 5 + 3) % looks.length];
    const a = new Actor(makePerson({ scale: 0.66, shirt, pants, hair, hat: false }), ['Dani', 'Emma', 'Olivér', 'Noel'][n]); a.place(x, z, 0); a.stride = 7;
    people.push({ a, kind: 'yard', t: R(0, 2), field: n === 3 });
  }
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
    for (const p of w.pics) p.visible = w.s > 0.9;
  }
  if (upper) upper.visible = !G.fps && (!inn || solid);
  if (low) { const full = !inn || (solid && !G.fps); low.m.visible = full; low.stub.visible = !full; }
}

// ---------------------------------------------------------------- the school's sounds: the bell (every lesson starts and ends with
// it – 45 minutes, 10 minutes' break), the children's chatter (loud in the breaks), the chalk on the board, shouts in the yard
const lesson = (min) => { const t = (min - 8 * 60) % 55; return t >= 0 && t < 45; };
function sBellRing(x, z) {
  soundAt(x, z, () => { for (let k = 0; k < 44; k++) { tone('square', 1480, 1470, 0.03, 0.05, k * 0.05); tone('sine', 2960, 2950, 0.03, 0.025, k * 0.05 + 0.025); } }, 2.2);
}
function updateSounds(dt, min) {
  const P = G.petike.pos, inn = inside();
  // the bell at the start and the end of every lesson
  const t = Math.floor(min - 8 * 60), mark = t % 55 === 0 || t % 55 === 45;
  if (mark && school.bellMin !== t) { school.bellMin = t; sBellRing(18, -1.3); if (t > 0) setTimeout(() => say({ headWorld: (v) => v.set(18, 2.8, -1.3) }, 'CSENGŐ: RRRRRRING!', 1.6, ''), 50); }
  const brk = !lesson(min);
  // chatter: a murmur of children's voices – soft in a lesson, loud in a break (and in the yard in a break)
  school.chatT -= dt;
  if (school.chatT <= 0) {
    school.chatT = brk ? R(0.08, 0.2) : R(0.3, 0.8);
    const near = inn ? { x: P.x + R(-3, 3), z: P.z + R(-2, 2) } : { x: R(-12, 10), z: R(6, 14) };
    if (inn || brk) soundAt(near.x, near.z, () => { noise(R(0.08, 0.22), R(700, 1900), 2.2, brk ? 0.05 : 0.018); if (Math.random() < 0.3) tone('triangle', R(380, 620), R(340, 700), 0.12, brk ? 0.03 : 0.01); }, 1);
    if (brk && !inn && Math.random() < 0.02) { const kids = people.filter((p) => p.kind === 'yard'); if (kids.length) say(pick(kids).a, pick(['Hahó!', 'Fogóóó!', 'Nem ér!', 'Passzold ide!']), 1.4); }
  }
  // the chalk squeaks while the teacher writes (in a lesson)
  if (!brk && (school.chalkT -= dt) <= 0) {
    school.chalkT = R(4, 9);
    if (Math.hypot(P.x - 1, P.z + 7.3) < 12) soundAt(0.4, -7.3, () => { for (let k = 0; k < 4; k++) tone('sine', R(2600, 3400), R(2800, 3600), 0.07, 0.025, k * 0.12); noise(0.4, 3000, 3, 0.02); }, 1);
  }
}

// ---------------------------------------------------------------- Petyus's place: E – sitting down / standing up (ep2.js: seating)
export function schoolAction() {
  const P = G.petike.pos;
  if (pee.on) return null;
  for (const t of toilets) if (Math.hypot(P.x - t.x, P.z - (t.z + 0.62)) < 0.55) return { toilet: t, txt: (t.st === 2 ? 'E – ülőke lehajtása' : 'E – ülőke felhajtása') + (isTouch ? '' : canPee(t.wc) ? ' · Szóköz – pisilés' : ' · Szóköz – lehúzás'), kick: canPee(t.wc) ? 'PISILÉS' : 'LEHÚZÁS' };
  let bd = null, bdist = 1.1;
  for (const d of doors) { const r = Math.hypot(P.x - d.x, P.z - d.z); if (r < bdist) { bdist = r; bd = d; } }
  if (bd) return { door: bd, txt: (bd.open ? 'E – ajtó becsukása' : 'E – ajtó kinyitása') + ` (${bd.name})` };
  if (nearGate()) return { txt: 'E – hazaindulás', gate: true };
  if (Math.hypot(P.x - (seat.x + 0.45), P.z - seat.z) < 0.8 || (school.seated && Math.hypot(P.x - seat.x, P.z - seat.z) < 0.6)) return { txt: school.seated ? 'E – felállás' : 'E – leülés (a helyed)', seat: true };
  return null;
}
// E and Space on what schoolAction found (the gate and the seat: ep2.js)
export function schoolUse(act) {
  if (act.door) toggleDoor(act.door);
  else if (act.toilet) { act.toilet.st = act.toilet.st === 2 ? 1 : 2; tone('sine', 700, 500, 0.05, 0.05); }
}
export function schoolKick(act) {
  if (!act || !act.toilet) return;
  if (canPee(act.toilet.wc)) startPee(act.toilet.wc); else flush(act.toilet);
}
export function toggleSeat(seating) {
  school.seated = !school.seated;
  Object.assign(seating, { on: school.seated, x: seat.x, z: seat.z, h: -Math.PI / 2, seatH: 0.45, chair: true, base: 0 });
  tone('sine', school.seated ? 180 : 240, school.seated ? 120 : 300, 0.15, 0.05);
  if (school.seated && !school.seatedSaid) { school.seatedSaid = true; setTimeout(() => say(school.teacher, 'Na végre, Petyus! Örülök, hogy megtisztelsz minket.', 2.8), 600); }
}

// ---------------------------------------------------------------- build / tick
export function buildSchool() {
  walls.length = 0; desks.length = 0; people.length = 0; clocks.length = 0; doors.length = 0; toilets.length = 0;
  buildGround(); buildMain(); buildLow(); buildHall(); buildSquare();
  for (const r of ROOMS3) buildClassroom(r);
  buildCorridor(); buildCeiling(); buildToilets();
  makeDoor(2.6, SCHOOL.z1 + TW / 2, 2.8, { double: true, glass: true, name: 'bejárat' });
  makeDoor(5.1, CORR - 0.06, 1.0, { color: 0xb5793f, sign: { kind: 'class', text: '6. b' }, name: '6. b' });
  makeDoor(17.1, CORR - 0.06, 1.0, { color: 0xb5793f, sign: { kind: 'class', text: '6. a' }, name: '6. a' });
  makeDoor(26.1, CORR - 0.06, 1.0, { color: 0xf4f4f4, sign: { kind: 'boy', text: 'FIÚ' }, name: 'fiú WC' });
  makeDoor(33.1, CORR - 0.06, 1.0, { color: 0xf4f4f4, sign: { kind: 'girl', text: 'LÁNY' }, name: 'lány WC' });
  buildFurniture();
  buildPeople();
}
export function schoolRoom(x, z) {
  if (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1) return z > CORR ? 'Iskola – folyosó' : x >= 30 ? 'Iskola – lány WC' : x >= 24 ? 'Iskola – fiú WC' : 'Iskola – a ' + ROOMS3[Math.floor(x / 12)].cls + ' osztályterme';
  if (x < CAMPUS.x0 || z > CAMPUS.z1) return 'Az utca';
  return 'Iskola – udvar';
}
export const schoolFloor = (x, z) => (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1 ? (z > CORR ? 'stone' : x >= 24 ? 'tile' : 'wood') : 'stone');
// solid: the first-person view or zoomed out – walls solid, the roof on
export function updateSchool(dt, min, solid) {
  updateWalls(dt, solid); updatePeople(dt); updateSounds(dt, min); updateDoors(dt); updateToilets(dt);
  if (Math.floor(min) !== school.lastMin) { school.lastMin = Math.floor(min); for (const c of clocks) c.draw(min); }
  if (school.seated && !G.petike.sitTarget && G.petike.sit < 0.05) school.seated = false;   // stood up with a movement key
  const P = G.petike.pos, inClass = P.x < 12 && P.z < CORR && P.z > SCHOOL.z0;
  school.talkT -= dt;
  if (school.talkT <= 0) {
    school.talkT = R(7, 12);
    if (inClass && lesson(min)) say(school.teacher, school.seated ? pick(TEACHER_LINES) : pick(['Petyus, ülj a helyedre!', 'Petyus! Az első padban van a helyed!', ...TEACHER_LINES]), 2.8);
    else { const kids = people.filter((p) => p.kind !== 'teacher' && Math.hypot(p.a.pos.x - P.x, p.a.pos.z - P.z) < 5); if (kids.length) say(pick(kids).a, pick(KID_LINES), 2.4); }
  }
}
// the gate: E – going home
export const nearGate = () => Math.hypot(G.petike.pos.x - (GATE.x + 0.7), G.petike.pos.z - GATE.z) < 1.6;
