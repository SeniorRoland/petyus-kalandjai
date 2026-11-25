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
import { say } from '../ui.js';
import { R, V3, damp, pick } from '../util.js';
import { addBoxCol, partMesh } from '../world.js';
import { buildFurniture, put } from './home.js';

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
  const col = (a, c) => { if (c - a < 0.01) return; if (alongX) addBoxCol(a, z0, c, z1, FLOOR); else addBoxCol(x0, a, x1, c, FLOOR); };
  let at = a0;
  for (const o of ops) { col(at, a0 + o.a); if (o.win) col(a0 + o.a, a0 + o.b); at = a0 + o.b; }
  col(at, a0 + len);
  walls.push({ g, alongX, c: alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, s: 1 });
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
  const classWins = []; for (let x = 1.4; x < 35; x += 3.0) classWins.push(W(x, x + 2.2));
  wall(x0, z0 - TW, x1 + TW, z0, classWins, -1);                                                      // north (the classrooms' windows)
  wall(x0, z1, x1 + TW, z1 + TW, [D(1.2, 4.0), W(6.2, 8.4), W(9.6, 11.8), W(15.4, 17.6), W(21.6, 23.8), W(27.4, 29.6), W(31.6, 33.8)], 1);   // south: the entrance, corridor windows
  wall(x1, z0, x1 + TW, z1, [W(2.4, 4.6), W(6.2, 8.4)], 1);                                           // east
  // inside: the corridor's north wall with the classroom doors, the walls between the rooms
  wall(x0, CORR - 0.12, x1, CORR, [D(4.6, 5.6), D(16.6, 17.6), D(28.6, 29.6)]);
  wall(11.94, z0, 12.06, CORR - 0.12); wall(23.94, z0, 24.06, CORR - 0.12);
  // the floors: wood in the classrooms, stone in the corridor
  scene.add(partMesh((b) => {
    for (const x of [6, 18, 30]) b.bx(x, 0, (z0 + CORR) / 2, 12, 0.04, CORR - z0, C.floorClass, 0, 0.03);
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
    b.bx(ex, 0, ez + 0.04, 2.6, 2.3, 0.05, 0x3b3f45, 0, 0); b.bx(ex - 0.62, 0.05, ez + 0.07, 1.1, 2.15, 0.02, 0x9fc4dd, 0, 0.02); b.bx(ex + 0.62, 0.05, ez + 0.07, 1.1, 2.15, 0.02, 0x9fc4dd, 0, 0.02);
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
  const g = { ground: true };
  // plane trees on the square and along the buildings (big oaks stand in for them), birches and pines round the field
  for (const [x, z, s] of [[-12, 9, 1.4], [-5, 11, 1.3], [9, 8, 1.4], [12.5, -14, 1.3], [-14, -8, 1.4], [-6, -20, 1.2], [36, 6, 1.3], [44, -6, 1.4], [44, 12, 1.3], [-12, 30, 1.3], [-6, 38, 1.2], [50, 30, 1.4], [56, 18, 1.3], [-14, -38, 1.3], [44, -50, 1.2], [58, -12, 1.3]]) put('oak', x, z, x * 0.7, Math.abs(Math.round(x)) % 4, { ground: true, s });
  for (const [x, z] of [[-14, 22], [0, 41], [24, 41], [48, 40], [-16, -30], [2, -54], [36, -54], [60, -50], [60, 0]]) put('birch', x, z, x, Math.abs(Math.round(z)) % 4, { ground: true, s: 1.1 });
  for (const [x, z] of [[-16, 40], [62, 40], [62, -56], [-16, -56]]) put('pine', x, z, x, 1, { ground: true, s: 1.2 });
  for (const [x, z] of [[-10, 2.2], [11, 17], [34, 17], [-16, 17]]) put('bush', x, z, x, Math.abs(x) % 4, { ground: true, s: 1.0 });
  for (const [x, z] of [[-16, 2], [-3, 17.5], [13, 17.5], [30, 19.6], [38, -12], [-16, -16]]) put('lamp', x, z, 0, 0, g);
}

// ---------------------------------------------------------------- inside: the classrooms and the corridor
const desks = [];   // Petyus's class: where the pupils sit { x, z }
function buildClassroom(x0, kind) {
  const cx = x0 + 6, P = Math.PI, z0 = SCHOOL.z0, ours = kind === 'ours';
  scene.add(partMesh((b) => {
    b.bx(cx, 0.95, z0 + 0.14, 4.6, 1.3, 0.06, C.boardFrame, 0, 0); b.bx(cx, 1.0, z0 + 0.18, 4.4, 1.2, 0.04, C.board, 0, 0.02);
    b.bx(cx, 0.92, z0 + 0.22, 4.4, 0.04, 0.12, C.boardFrame, 0, 0);
    b.bx(x0 + 11.4, 0, -7.0, 0.5, 2.0, 2.4, 0xb5793f, 0, 0.03);
    for (let k = 0; k < 4; k++) b.bx(x0 + 0.35, 0.3 + k * 0.45, -7.4, 0.4, 0.04, 3.0, 0xd8c6a2, 0, 0);
    for (let k = 0; k < 4; k++) for (let n = 0; n < 9; n++) b.bx(x0 + 0.35, 0.34 + k * 0.45, -8.7 + n * 0.3, 0.26, R(0.22, 0.32), 0.16, pick([0xe63946, 0x3a86ff, 0xffca3a, 0x8ac926, 0xff70a6, 0x6a4c93]), 0, 0.03);
    for (let n = 0; n < 7; n++) b.bx(x0 + 1.2 + n * 1.55, 1.5, CORR - 0.2, 0.9, 0.65, 0.03, pick([0xfff3c4, 0xd8f0ff, 0xffe0ec, 0xe2ffd8]), 0, 0.02);
    b.bx(cx, 2.45, z0 + 0.16, 0.36, 0.36, 0.05, 0xffffff, 0, 0);
  }));
  addBoxCol(x0 + 11.15, -8.2, x0 + 11.65, -5.8, 2);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 140; const c = cv.getContext('2d');
  c.fillStyle = '#2f4f3f'; c.fillRect(0, 0, 512, 140); c.fillStyle = '#f2f2ea'; c.font = '34px "Patrick Hand", sans-serif';
  const txt = { ours: ['Szeptember – Matematika', '7 + 8 = ?     12 – 5 = ?'], a4: ['Szeptember', 'Üdv a 4. a osztályban!'], a2: ['Olvasás', 'Ősz – alma – dió – szilva'] }[kind];
  c.fillText(txt[0], 24, 50); c.fillText(txt[1], 24, 104);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 1.16), new THREE.MeshBasicMaterial({ map: tex })); bd.position.set(cx, 1.6, z0 + 0.21); scene.add(bd);
  put('desk', cx + 1.6, z0 + 1.4, P, 1, { ground: true }); put('chair', cx + 1.6, z0 + 0.8, 0, 1, { ground: true });
  for (const z of [-8.6, -6.7, -4.8]) for (const dx of [-3.4, 0, 3.4]) {
    put('desk', cx + dx, z, 0, 0, { ground: true });
    for (const s of [-0.3, 0.3]) {
      put('chair', cx + dx + s, z + 0.55, P, ours ? 0 : 2, { ground: true, noCol: true });
      if (ours) desks.push({ x: cx + dx + s, z: z + 0.55 });
    }
  }
  for (const x of [x0 + 2.5, x0 + 9.5]) put('potted_plant', x, z0 + 0.4, 0, 0, { ground: true });
  put('bin', x0 + 11.4, z0 + 0.5, 0, 0, { ground: true });
}
function buildCorridor() {
  scene.add(partMesh((b) => {
    for (let x = 0.8; x < 35.5; x += 0.6) { if (Math.abs(x - 5.1) < 0.8 || Math.abs(x - 17.1) < 0.8 || Math.abs(x - 29.1) < 0.8) continue; b.bx(x, 1.55, CORR + 0.05, 0.05, 0.05, 0.12, 0x555555, 0, 0); if (Math.round(x * 10) % 3) b.bx(x, 0.9, CORR + 0.1, 0.38, 0.65, 0.12, pick([0xe63946, 0x3a86ff, 0xffca3a, 0x2a9d8f, 0xff70a6]), 0, 0.03); }
    b.bx(11, 0, CORR + 0.2, 1.6, 1.8, 0.4, 0x8a6238, 0, 0.02); b.bx(11, 0.9, CORR + 0.41, 1.4, 0.8, 0.02, 0x9fd4ef, 0, 0);   // a trophy cabinet
    for (const x of [8.0, 22.5]) b.bx(x, 1.3, CORR + 0.03, 1.6, 1.0, 0.04, 0xc9a06a, 0, 0.02);
  }));
  addBoxCol(10.2, CORR, 11.8, CORR + 0.4, 2);
  put('bench', 9.0, -0.5, Math.PI, 0, { ground: true }); put('bench', 26.0, -0.5, Math.PI, 0, { ground: true });
  put('potted_plant', 35.5, -2.2, 0, 1, { ground: true });
}

// ---------------------------------------------------------------- people: the teacher at the board, the class at their desks,
// children on the square
const people = [];
const TEACHER_LINES = ['Gyerekek, figyeljetek a táblára!', 'Ki tudja a választ?', 'Petyus, ülj a helyedre!', 'Csendet kérek!', 'Nyissátok ki a füzeteteket!', 'Szép munka!'];
const KID_LINES = ['Szia, Petyus!', 'Láttad a tegnapi meccset?', 'Kölcsönadod a radírod?', 'Mi lesz az uzsonna?', 'Fogócska a szünetben?', 'Petyus, gyere ide!'];
export const school = { teacher: null, talkT: 6 };
function buildPeople() {
  const T = new Actor(makePerson({ scale: 0.92, shirt: 0x6a4c93, pants: 0x3d405b, hair: 0x8a5a2b, dress: true, glasses: true, hat: false }), 'Tanító néni');
  const home = new V3(6, 0, SCHOOL.z0 + 1.1);
  T.place(home.x, home.z, 0); T.stride = 4.4; school.teacher = T; people.push({ a: T, kind: 'teacher', home, t: R(2, 5) });
  const looks = [[0xe63946, 0x1d3557, 0x5a3825], [0xffca3a, 0x3d405b, 0xd8b45c], [0x8ac926, 0x264653, 0x2b1d14], [0xff70a6, 0x6b705c, 0x8a5a2b], [0x3a86ff, 0x22223b, 0x1b1b1b], [0xf4a261, 0x3d405b, 0x6f4e37],
    [0x2a9d8f, 0x1d3557, 0xc9a66b], [0xb5179e, 0x3d405b, 0x2b1d14], [0x90be6d, 0x264653, 0x5a3825], [0xffd166, 0x1d3557, 0x3b2b20], [0x118ab2, 0x2b2d42, 0x8a5a2b], [0xef476f, 0x264653, 0x1b1b1b]];
  const names = ['Bence', 'Lili', 'Marci', 'Zsófi', 'Ádám', 'Dóri', 'Gergő', 'Panni', 'Levi', 'Bori', 'Máté', 'Kata'];
  const free = new Set([1, 4, 9, 13, 16]);
  let k = 0;
  desks.forEach((d, i) => {
    if (free.has(i) || k >= looks.length) return;
    const [shirt, pants, hair] = looks[k], a = new Actor(makePerson({ scale: 0.68, shirt, pants, hair, hat: false, glasses: k % 5 === 2, dress: k % 3 === 1 }), names[k]); k++;
    a.place(d.x, d.z, Math.PI); a.seatH = 0.45; a.sit = a.sitTarget = 1;
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
    if (p.kind === 'pupil') {
      p.t -= dt; if (p.t <= 0) { p.t = R(2, 6); p.look = pick([0, 0, 0.6, -0.6]); }
      const near = Math.hypot(P.x - a.pos.x, P.z - a.pos.z) < 1.6;
      a.targetHeading = near ? Math.atan2(P.x - a.pos.x, P.z - a.pos.z) : Math.PI + p.look;
      a.update(dt);
    } else if (p.kind === 'teacher') {
      p.t -= dt; if (p.t <= 0 && !a.path) { p.t = R(3, 7); a.walkTo([[p.home.x + R(-2, 2), p.home.z + R(0, 0.8)]], 0.8); }
      if (!a.path) a.targetHeading = 0;
      a.update(dt);
    } else {   // on the square (one on the field): running about
      p.t -= dt; if (!a.path && p.t <= 0) { p.t = R(0.5, 2.5); a.walkTo(p.field ? [[R(FIELD.x0 + 3, FIELD.x1 - 3), R(FIELD.z0 + 3, FIELD.z1 - 3)]] : [[R(-13, 11), R(6, 13)]], R(1.6, 3.0)); }
      a.update(dt);
    }
    const dx = P.x - a.pos.x, dz = P.z - a.pos.z, d = Math.hypot(dx, dz), m = a.sit > 0.5 ? 0.42 : 0.5;
    if (d < m && d > 1e-4) { P.x = a.pos.x + dx / d * m; P.z = a.pos.z + dz / d * m; }
  }
}

// ---------------------------------------------------------------- inside: the upper floors go, the camera-side walls sink
const inside = () => { const P = G.petike.pos; return P.x > SCHOOL.x0 - 0.3 && P.x < SCHOOL.x1 + 0.3 && P.z > SCHOOL.z0 - 0.3 && P.z < SCHOOL.z1 + 0.3; };
function updateWalls(dt) {
  const P = G.petike.pos, inn = inside();
  for (const w of walls) {
    let between = false;
    if (inn) between = w.alongX ? (CAM_OFF.z > 0 ? w.c > P.z + 0.1 : w.c < P.z - 0.1) : (CAM_OFF.x > 0 ? w.c > P.x + 0.1 : w.c < P.x - 0.1);
    w.s = damp(w.s, between ? 0.15 : 1, 8, dt); w.g.scale.y = w.s;
  }
  if (upper) upper.visible = !inn;
  if (low) { low.m.visible = !inn; low.stub.visible = inn; }   // (it stands between the camera and the classrooms)
}

// ---------------------------------------------------------------- build / tick
export function buildSchool() {
  walls.length = 0; desks.length = 0; people.length = 0;
  buildGround(); buildMain(); buildLow(); buildHall(); buildSquare();
  buildClassroom(0, 'ours'); buildClassroom(12, 'a4'); buildClassroom(24, 'a2'); buildCorridor();
  buildFurniture();
  buildPeople();
}
export function schoolRoom(x, z) {
  if (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1) return z > CORR ? 'Iskola – folyosó' : x < 12 ? 'Iskola – a 3. b osztályterme' : x < 24 ? 'Iskola – a 4. a osztályterme' : 'Iskola – a 2. a osztályterme';
  if (x < CAMPUS.x0 || z > CAMPUS.z1) return 'Az utca';
  return 'Iskola – udvar';
}
export const schoolFloor = (x, z) => (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1 ? (z > CORR ? 'stone' : 'wood') : 'stone');
export function updateSchool(dt) {
  updateWalls(dt); updatePeople(dt);
  const P = G.petike.pos, inClass = P.x < 12 && P.z < CORR && P.z > SCHOOL.z0;
  school.talkT -= dt;
  if (school.talkT <= 0) {
    school.talkT = R(7, 12);
    if (inClass) say(school.teacher, pick(TEACHER_LINES), 2.8);
    else { const kids = people.filter((p) => p.kind !== 'teacher' && Math.hypot(p.a.pos.x - P.x, p.a.pos.z - P.z) < 5); if (kids.length) say(pick(kids).a, pick(KID_LINES), 2.4); }
  }
}
// the gate: E – going home
export const nearGate = () => Math.hypot(G.petike.pos.x - (GATE.x + 0.7), G.petike.pos.z - GATE.z) < 1.6;
