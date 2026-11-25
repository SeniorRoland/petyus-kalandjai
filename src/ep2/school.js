// Petyus kalandjai – 2. rész: az iskola (8:00–15:30). Egyelőre csibészségek nélkül: földszintes iskolaépület (folyosó, Petyus
// osztályterme a tanító nénivel és az osztálytársakkal, a szomszéd terem), előtte az iskolaudvar (kosárpalánk, kis kapuk, padok,
// fák), kerítés, kapu az utca felé – a kapunál: E – hazaindulás (→ otthon délután).
// The ground is y = 0; the building: x 0 … 22, z −11 … 0 (the entrance in the middle of the south wall); the yard south of it.
import * as THREE from 'three';
import { Actor } from '../actors.js';
import { makePerson } from '../rigs.js';
import { CAM_OFF, scene } from '../scene.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { R, V3, damp, pick } from '../util.js';
import { addBoxCol, partMesh } from '../world.js';
import { buildFurniture, put } from './home.js';

const WALL_H = 3.0, TW = 0.25;
export const SCHOOL = { x0: 0, x1: 22, z0: -11, z1: 0 };
export const GATE = { x: 11, z: 16 };                 // the gate in the yard's south fence (from the street)
export const SCHOOL_START = { x: 11, z: 14.6, h: Math.PI };   // just inside the gate, facing the school
export const BOUNDS = { x0: -8, x1: 30, z0: -13, z1: 15.6 };
const C = { wall: 0xf3e9d2, wallIn: 0xf6f1e6, plinth: 0xc9a77c, frame: 0xffffff, glass: 0x8cc1e0, board: 0x2f4f3f, boardFrame: 0x8a6a4a,
  floorClass: 0xc9a27a, floorHall: 0xd8d2c4, asphalt: 0x6e7176, line: 0xf4f4f4, grass: [0x7db556, 0x86bd5c, 0x78b052], fence: 0x4f6b4a };

// ---------------------------------------------------------------- walls (with door and window openings), sinking towards the camera
const walls = [];
// an axis-aligned wall; open: [{ a, b, win }] along its length (win: a window from 0.9 to 2.3 m, else a door up to 2.2 m)
function wall(x0, z0, x1, z1, open = [], outer = false) {
  const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, a0 = alongX ? x0 : z0;
  const g = new THREE.Group(); scene.add(g);
  const m = partMesh((b) => {
    const seg = (a, c, y0, y1, col) => {
      if (c - a < 0.01 || y1 - y0 < 0.01) return;
      const mid = (a + c) / 2, w = c - a;
      if (alongX) b.bx(mid, y0, (z0 + z1) / 2, w, y1 - y0, z1 - z0, col, 0, 0.01); else b.bx((x0 + x1) / 2, y0, mid, x1 - x0, y1 - y0, w, col, 0, 0.01);
    };
    const col = outer ? C.wall : C.wallIn;
    let at = a0; const ops = [...open].sort((p, q) => p.a - q.a);
    for (const o of ops) {
      seg(at, a0 + o.a, 0, WALL_H, col);
      if (o.win) { seg(a0 + o.a, a0 + o.b, 0, 0.9, col); seg(a0 + o.a, a0 + o.b, 2.3, WALL_H, col); }
      else seg(a0 + o.a, a0 + o.b, 2.2, WALL_H, col);
      at = a0 + o.b;
    }
    seg(at, a0 + len, 0, WALL_H, col);
    if (outer) { if (alongX) b.bx((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0 + 0.04, 0.5, z1 - z0 + 0.04, C.plinth, 0, 0.02); else b.bx((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0 + 0.04, 0.5, z1 - z0 + 0.04, C.plinth, 0, 0.02); }
    // window frames and glass
    for (const o of ops) if (o.win) {
      const mid = a0 + (o.a + o.b) / 2, w = o.b - o.a;
      if (alongX) { b.bx(mid, 0.86, (z0 + z1) / 2, w, 0.06, z1 - z0 + 0.1, C.frame, 0, 0); b.bx(mid, 0.9, (z0 + z1) / 2, w, 1.4, 0.04, C.glass, 0, 0.02); b.bx(mid, 0.9, (z0 + z1) / 2, 0.06, 1.4, 0.07, C.frame, 0, 0); }
      else { b.bx((x0 + x1) / 2, 0.86, mid, x1 - x0 + 0.1, 0.06, w, C.frame, 0, 0); b.bx((x0 + x1) / 2, 0.9, mid, 0.04, 1.4, w, C.glass, 0, 0.02); b.bx((x0 + x1) / 2, 0.9, mid, 0.07, 1.4, 0.06, C.frame, 0, 0); }
    }
  });
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  // colliders: every solid piece (a door opening is free, a window is not)
  let at = a0; const ops = [...open].sort((p, q) => p.a - q.a);
  const col = (a, c) => { if (c - a < 0.01) return; if (alongX) addBoxCol(a, z0, c, z1, WALL_H); else addBoxCol(x0, a, x1, c, WALL_H); };
  for (const o of ops) { col(at, a0 + o.a); if (o.win) col(a0 + o.a, a0 + o.b); at = a0 + o.b; }
  col(at, a0 + len);
  walls.push({ g, alongX, c: alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, lo: alongX ? x0 : z0, hi: alongX ? x1 : z1, s: 1 });
}
// a wall between Petyus (inside the building) and the camera sinks to a low stub (like the flat's walls in part 2)
function updateWalls(dt) {
  const P = G.petike.pos, inside = P.x > SCHOOL.x0 - 0.3 && P.x < SCHOOL.x1 + 0.3 && P.z > SCHOOL.z0 - 0.3 && P.z < SCHOOL.z1 + 0.3;
  for (const w of walls) {
    let between = false;
    if (inside) {
      if (w.alongX) between = CAM_OFF.z > 0 ? w.c > P.z + 0.1 : w.c < P.z - 0.1;
      else between = CAM_OFF.x > 0 ? w.c > P.x + 0.1 : w.c < P.x - 0.1;
    }
    w.s = damp(w.s, between ? 0.17 : 1, 8, dt);
    w.g.scale.y = w.s;
  }
}

// ---------------------------------------------------------------- the ground: lawn, the yard's asphalt, paths, the street
function buildGround() {
  scene.add(partMesh((b) => {
    for (let x = -60; x < 70; x += 5) for (let z = -50; z < 50; z += 5) b.quad(x, z, x + 5, z + 5, -0.005, pick(C.grass), 0.05);
    b.bx(11, 0, 7.2, 28, 0.02, 14, C.asphalt, 0, 0.02);                               // the yard
    for (const [x0, z0, x1, z1] of [[2, 1.5, 10, 13], [12, 1.5, 20, 13]]) { b.bx((x0 + x1) / 2, 0.02, z0, x1 - x0, 0.01, 0.08, C.line, 0, 0); b.bx((x0 + x1) / 2, 0.02, z1, x1 - x0, 0.01, 0.08, C.line, 0, 0); b.bx(x0, 0.02, (z0 + z1) / 2, 0.08, 0.01, z1 - z0, C.line, 0, 0); b.bx(x1, 0.02, (z0 + z1) / 2, 0.08, 0.01, z1 - z0, C.line, 0, 0); }
    // hopscotch by the entrance
    [[0, 0], [0, 1], [-0.5, 2], [0.5, 2], [0, 3], [-0.5, 4], [0.5, 4], [0, 5]].forEach(([x, z], n) => b.bx(7 + x, 0.02, 1.5 + z * 0.6, 0.5, 0.01, 0.55, n % 2 ? 0xffca3a : 0xff70a6, 0, 0));
    b.bx(11, 0, 18.2, 2.4, 0.03, 4.4, 0xcfc8bb, 0, 0.02);                          // the path from the gate to the sidewalk
    b.bx(11, 0, 21.0, 140, 0.1, 1.4, 0xcfc8bb, 0, 0.02); b.bx(11, 0, 24.5, 140, 0.02, 5.6, 0x5d6066, 0, 0.02);   // sidewalk, street
    for (let x = -55; x < 80; x += 4) b.bx(x, 0.03, 24.5, 2, 0.01, 0.12, C.line, 0, 0);
    // the floors inside: wood in the classrooms, stone in the corridor
    b.bx(5.5, 0, -6.8, 11, 0.04, 8.4, C.floorClass, 0, 0.03); b.bx(16.5, 0, -6.8, 11, 0.04, 8.4, C.floorClass, 0, 0.03); b.bx(11, 0, -1.3, 22, 0.04, 2.6, C.floorHall, 0, 0.03);
  }));
}
// ---------------------------------------------------------------- the building
function buildBuilding() {
  const W = (a, b) => ({ a, b, win: true }), D = (a, b) => ({ a, b });
  // outer walls: north (classroom windows), south (the entrance in the middle, corridor windows), west, east
  wall(SCHOOL.x0 - TW, SCHOOL.z0 - TW, SCHOOL.x1 + TW, SCHOOL.z0, [W(1.6, 3.4), W(4.6, 6.4), W(7.6, 9.4), W(12.8, 14.6), W(15.8, 17.6), W(19.0, 20.8)], true);
  wall(SCHOOL.x0 - TW, SCHOOL.z1, SCHOOL.x1 + TW, SCHOOL.z1 + TW, [W(2.2, 4.2), W(6.0, 8.0), D(10.1, 12.4), W(14.6, 16.6), W(18.4, 20.4)], true);
  wall(SCHOOL.x0 - TW, SCHOOL.z0, SCHOOL.x0, SCHOOL.z1, [W(2.2, 4.4), W(5.6, 7.8)], true);
  wall(SCHOOL.x1, SCHOOL.z0, SCHOOL.x1 + TW, SCHOOL.z1, [W(2.2, 4.4), W(5.6, 7.8)], true);
  // inside: the corridor's north wall with the two classroom doors, the wall between the classrooms
  wall(SCHOOL.x0, -2.72, SCHOOL.x1, -2.6, [D(4.2, 5.2), D(15.0, 16.0)]);
  wall(10.94, SCHOOL.z0, 11.06, -2.72);
  // the roof edge (a thin cornice: the building is seen cut open from above)
  scene.add(partMesh((b) => { b.bx(11, WALL_H, -0.12 + 0.13, 22.7, 0.06, 0.06, 0xd9cfba, 0, 0); }));
  // the school's sign over the entrance
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const c = cv.getContext('2d');
  c.fillStyle = '#2a4a7a'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#fff'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Tököli Általános Iskola', 256, 50);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshLambertMaterial({ map: tex })); sign.position.set(11.25, 2.6, 0.27); scene.add(sign);
}
// ---------------------------------------------------------------- inside: the two classrooms and the corridor
const desks = [];   // Petyus's class: where the pupils sit { x, z }
function buildClassroom(x0, ours) {
  const cx = x0 + 5.5, P = Math.PI;
  scene.add(partMesh((b) => {
    // the blackboard on the north wall (with the date and a sum in chalk: a canvas texture below), the teacher's desk, a cupboard
    b.bx(cx, 0.95, -10.86, 4.6, 1.3, 0.06, C.boardFrame, 0, 0); b.bx(cx, 1.0, -10.82, 4.4, 1.2, 0.04, C.board, 0, 0.02);
    b.bx(cx, 0.92, -10.78, 4.4, 0.04, 0.12, C.boardFrame, 0, 0);   // the chalk ledge
    b.bx(x0 + 10.4, 0, -6.0, 0.5, 2.0, 2.4, 0xb5793f, 0, 0.03);       // a cupboard on the east wall
    for (let k = 0; k < 4; k++) b.bx(x0 + 0.35, 0.3 + k * 0.45, -6.8, 0.4, 0.04, 3.0, 0xd8c6a2, 0, 0);   // open shelves on the west wall …
    for (let k = 0; k < 4; k++) for (let n = 0; n < 9; n++) b.bx(x0 + 0.35, 0.34 + k * 0.45, -8.1 + n * 0.3, 0.26, R(0.22, 0.32), 0.16, pick([0xe63946, 0x3a86ff, 0xffca3a, 0x8ac926, 0xff70a6, 0x6a4c93]), 0, 0.03);   // … with books
    // the children's drawings on the south wall, a clock over the board
    for (let n = 0; n < 6; n++) b.bx(x0 + 1.2 + n * 1.5, 1.5, -2.8, 0.9, 0.65, 0.03, pick([0xfff3c4, 0xd8f0ff, 0xffe0ec, 0xe2ffd8]), 0, 0.02);
    b.bx(cx, 2.35, -10.84, 0.36, 0.36, 0.05, 0xffffff, 0, 0);
  }));
  addBoxCol(x0 + 10.15, -7.2, x0 + 10.65, -4.8, 2);
  // the board's writing
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 140; const c = cv.getContext('2d');
  c.fillStyle = '#2f4f3f'; c.fillRect(0, 0, 512, 140); c.fillStyle = '#f2f2ea'; c.font = '34px "Patrick Hand", sans-serif';
  c.fillText(ours ? 'Szeptember – Matematika' : 'Szeptember', 24, 50); c.fillText(ours ? '7 + 8 = ?     12 – 5 = ?' : 'Üdv a 4. a osztályban!', 24, 104);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 1.16), new THREE.MeshBasicMaterial({ map: tex })); bd.position.set(cx, 1.6, -10.79); scene.add(bd);
  // furniture from the catalogue (instanced): the teacher's desk and chair, 3 rows × 3 desks with two chairs each, plants
  put('desk', cx + 1.6, -9.6, P, 1, { ground: true }); put('chair', cx + 1.6, -10.2, 0, 1, { ground: true });
  for (const z of [-7.9, -6.1, -4.3]) for (const dx of [-3.2, 0, 3.2]) {
    put('desk', cx + dx, z, 0, 0, { ground: true });   // the sitter's side (+z) towards the pupils
    for (const s of [-0.3, 0.3]) {
      put('chair', cx + dx + s, z + 0.55, P, ours ? 0 : 2, { ground: true, noCol: true });
      if (ours) desks.push({ x: cx + dx + s, z: z + 0.55 });
    }
  }
  for (const x of [x0 + 2.5, x0 + 8.5]) put('potted_plant', x, -10.6, 0, 0, { ground: true });
  put('bin', x0 + 10.5, -10.5, 0, 0, { ground: true });
}
function buildCorridor() {
  // coat hooks with jackets and bags along the corridor's north wall, benches, a trophy cabinet, a plant, notice boards
  scene.add(partMesh((b) => {
    for (let n = 0; n < 14; n++) { const x = 0.8 + n * 0.6 + (n > 6 ? 5.6 : 0); if (x > 21) continue; b.bx(x, 1.55, -2.55, 0.05, 0.05, 0.12, 0x555555, 0, 0); if (n % 3 !== 1) b.bx(x, 0.9, -2.5, 0.38, 0.65, 0.12, pick([0xe63946, 0x3a86ff, 0xffca3a, 0x2a9d8f, 0xff70a6]), 0, 0.03); }
    b.bx(11, 0, -2.4, 1.6, 1.8, 0.4, 0x8a6238, 0, 0.02); b.bx(11, 0.9, -2.19, 1.4, 0.8, 0.02, 0x9fd4ef, 0, 0);   // the trophy cabinet
    for (const x of [8.0, 13.6]) b.bx(x, 1.3, -2.57, 1.6, 1.0, 0.04, 0xc9a06a, 0, 0.02);                         // notice boards
  }));
  addBoxCol(10.2, -2.6, 11.8, -2.2, 2);
  put('bench', 3.0, -0.5, Math.PI, 0, { ground: true }); put('bench', 19.0, -0.5, Math.PI, 0, { ground: true });
  put('potted_plant', 21.5, -2.2, 0, 1, { ground: true });
}
// ---------------------------------------------------------------- the yard: basketball hoop, small goals, benches, trees, fence
function buildYard() {
  scene.add(partMesh((b) => {
    // the basketball hoop (east), the two small goals (west)
    b.bx(24.6, 0, 7, 0.14, 3.05, 0.14, 0x555b60, 0, 0); b.bx(24.25, 2.6, 7, 0.06, 1.0, 1.6, 0xf4f4f4, 0, 0); b.bx(23.9, 2.85, 7, 0.45, 0.04, 0.04, 0xe76f51, 0, 0);
    for (const z of [3, 11]) { for (const dx of [-0.8, 0.8]) b.bx(-1.5 + dx, 0, z, 0.08, 1.2, 0.08, 0xffffff, 0, 0); b.bx(-1.5, 1.2, z, 1.7, 0.08, 0.08, 0xffffff, 0, 0); }
    // the fence round the yard, with the gate in the south side
    const F = { x0: -6, x1: 28, z0: 0.5, z1: 16 };
    for (let x = F.x0; x <= F.x1; x += 0.25) { if (Math.abs(x - GATE.x) < 1.3) continue; b.bx(x, 0, F.z1, 0.05, 1.5, 0.05, C.fence, 0, 0); }
    for (const z of [0.4, 1.4]) b.bx((F.x0 + GATE.x - 1.3) / 2, z, F.z1, GATE.x - 1.3 - F.x0, 0.05, 0.05, C.fence, 0, 0), b.bx((GATE.x + 1.3 + F.x1) / 2, z, F.z1, F.x1 - GATE.x - 1.3, 0.05, 0.05, C.fence, 0, 0);
    for (const x of [F.x0, F.x1]) { for (let z = -13; z <= F.z1; z += 0.25) b.bx(x, 0, z, 0.05, 1.5, 0.05, C.fence, 0, 0); for (const y of [0.4, 1.4]) b.bx(x, y, (F.z1 - 13) / 2, 0.05, 0.05, F.z1 + 13, C.fence, 0, 0); }
    // the gate: two posts and an open wing
    for (const dx of [-1.3, 1.3]) b.bx(GATE.x + dx, 0, F.z1, 0.14, 1.8, 0.14, 0x3b4a38, 0, 0);
    b.bx(GATE.x - 1.3, 0, F.z1 + 0.6, 0.05, 1.5, 1.2, C.fence, 0, 0);
  }));
  addBoxCol(-6.1, 15.95, GATE.x - 1.3, 16.05, 1.5); addBoxCol(GATE.x + 1.3, 15.95, 28.1, 16.05, 1.5);
  addBoxCol(-6.1, -13, -5.95, 16, 1.5); addBoxCol(27.95, -13, 28.1, 16, 1.5);
  addBoxCol(-11, -13.2, 33, -13.05, 1.5);   // behind the school (north): the fence's back line
  addBoxCol(24.5, 6.9, 24.7, 7.1, 3);
  const g = { ground: true };
  for (const [x, z, id, v] of [[-3, 6, 'oak', 1], [26, 13, 'birch', 2], [-4, -6, 'pine', 0], [25.5, -6, 'oak', 3], [-3.6, 13.6, 'birch', 0], [5.5, -12.2, 'oak', 2], [17, -12.4, 'birch', 1]]) put(id, x, z, x, v, { ground: true, s: 1.0 });
  for (const [x, z, r] of [[3, 14.6, Math.PI], [19, 14.6, Math.PI], [-4.6, 9, Math.PI / 2], [26.6, 3, -Math.PI / 2]]) put('bench', x, z, r, 0, g);
  for (const x of [5, 17]) put('bin', x, 14.9, 0, 0, g);
  put('bikerack', 23, 14.8, 0, 0, g); put('lamp', 7.5, 15.4, 0, 0, g); put('lamp', 14.5, 15.4, 0, 0, g);
  for (let n = 0; n < 60; n++) { const x = R(-5.5, 27.5), z = R(-12.8, -11.6); put('grass', x, z, n, n % 6, { ground: true, s: R(0.8, 1.2) }); }
  for (const [x, z] of [[-5, 1.2], [27, 1.2], [-5, 15.2], [27, 15.2]]) put('bush', x, z, x, Math.abs(x) % 4, { ground: true, s: 0.9 });
}

// ---------------------------------------------------------------- people: the teacher at the board, the class at their desks, a few in the yard
const people = [];
const TEACHER_LINES = ['Gyerekek, figyeljetek a táblára!', 'Ki tudja a választ?', 'Petyus, ülj a helyedre!', 'Csendet kérek!', 'Nyissátok ki a füzeteteket!', 'Szép munka!'];
const KID_LINES = ['Szia, Petyus!', 'Láttad a tegnapi meccset?', 'Kölcsönadod a radírod?', 'Mi lesz az uzsonna?', 'Fogócska a szünetben?', 'Petyus, gyere ide!'];
export const school = { teacher: null, talkT: 6, kidT: 4 };
function buildPeople() {
  const T = new Actor(makePerson({ scale: 0.92, shirt: 0x6a4c93, pants: 0x3d405b, hair: 0x8a5a2b, dress: true, glasses: true, hat: false }), 'Tanító néni');
  T.place(5.5, -10.0, 0); T.stride = 4.4; school.teacher = T; people.push({ a: T, kind: 'teacher', home: new V3(5.5, 0, -10.0), t: R(2, 5) });
  const looks = [[0xe63946, 0x1d3557, 0x5a3825], [0xffca3a, 0x3d405b, 0xd8b45c], [0x8ac926, 0x264653, 0x2b1d14], [0xff70a6, 0x6b705c, 0x8a5a2b], [0x3a86ff, 0x22223b, 0x1b1b1b], [0xf4a261, 0x3d405b, 0x6f4e37],
    [0x2a9d8f, 0x1d3557, 0xc9a66b], [0xb5179e, 0x3d405b, 0x2b1d14], [0x90be6d, 0x264653, 0x5a3825], [0xffd166, 0x1d3557, 0x3b2b20], [0x118ab2, 0x2b2d42, 0x8a5a2b], [0xef476f, 0x264653, 0x1b1b1b]];
  const names = ['Bence', 'Lili', 'Marci', 'Zsófi', 'Ádám', 'Dóri', 'Gergő', 'Panni', 'Levi', 'Bori', 'Máté', 'Kata'];
  // twelve of the eighteen places taken; the free ones (one of them Petyus's: the front row, by the window side) stay empty
  const free = new Set([1, 4, 9, 13, 16]);
  let k = 0;
  desks.forEach((d, i) => {
    if (free.has(i) || k >= looks.length) return;
    const [shirt, pants, hair] = looks[k], a = new Actor(makePerson({ scale: 0.68, shirt, pants, hair, hat: false, glasses: k % 5 === 2, dress: k % 3 === 1 }), names[k]); k++;
    a.place(d.x, d.z, Math.PI); a.seatH = 0.45; a.sit = a.sitTarget = 1; a.solid = true;
    people.push({ a, kind: 'pupil', t: R(1, 6), look: 0 });
  });
  school.petyusDesk = desks[1];
  // in the yard: two playing tag, one bouncing a ball by the hoop
  for (const [n, x, z] of [[0, 4, 8], [1, 8, 10], [2, 22, 7]]) {
    const [shirt, pants, hair] = looks[(n * 5 + 3) % looks.length];
    const a = new Actor(makePerson({ scale: 0.66, shirt, pants, hair, hat: false }), ['Dani', 'Emma', 'Olivér'][n]); a.place(x, z, 0); a.stride = 7;
    people.push({ a, kind: 'yard', t: R(0, 2), target: new V3(x, 0, z) });
  }
}
function updatePeople(dt) {
  const P = G.petike.pos;
  for (const p of people) {
    const a = p.a;
    if (p.kind === 'pupil') {   // sitting; now and then turning to the neighbour or looking at Petyus going by
      p.t -= dt; if (p.t <= 0) { p.t = R(2, 6); p.look = pick([0, 0, 0.6, -0.6]); }
      const near = Math.hypot(P.x - a.pos.x, P.z - a.pos.z) < 1.6;
      a.targetHeading = near ? Math.atan2(P.x - a.pos.x, P.z - a.pos.z) : Math.PI + p.look;
      a.update(dt);
    } else if (p.kind === 'teacher') {   // walking a little in front of the board
      p.t -= dt; if (p.t <= 0 && !a.path) { p.t = R(3, 7); a.walkTo([[p.home.x + R(-2, 2), p.home.z + R(0, 0.8)]], 0.8); }
      if (!a.path) a.targetHeading = 0;
      a.update(dt);
    } else {   // the yard: running about
      p.t -= dt; if (!a.path && p.t <= 0) { p.t = R(0.5, 2.5); a.walkTo([[R(1, 21), R(2, 13)]], R(1.6, 3.0)); }
      a.update(dt);
    }
    // nobody walks through Petyus (and he does not walk through them)
    const dx = P.x - a.pos.x, dz = P.z - a.pos.z, d = Math.hypot(dx, dz), m = a.sit > 0.5 ? 0.42 : 0.5;
    if (d < m && d > 1e-4) { P.x = a.pos.x + dx / d * m; P.z = a.pos.z + dz / d * m; }
  }
}

// ---------------------------------------------------------------- build / tick
export function buildSchool() {
  walls.length = 0; desks.length = 0; people.length = 0;
  buildGround(); buildBuilding(); buildClassroom(SCHOOL.x0, true); buildClassroom(11, false); buildCorridor(); buildYard();
  buildFurniture();
  buildPeople();
}
export function schoolRoom(x, z) {
  if (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1) return z > -2.66 ? 'Iskola – folyosó' : x < 11 ? 'Iskola – a 3. b osztályterme' : 'Iskola – a 4. a osztályterme';
  return z < 16 ? 'Iskola – udvar' : 'Az utca';
}
export const schoolFloor = (x, z) => (x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1 ? (z > -2.66 ? 'stone' : 'wood') : 'stone');
export function updateSchool(dt) {
  updateWalls(dt); updatePeople(dt);
  // talking: the teacher when Petyus is in the class, the children in the yard / corridor
  const P = G.petike.pos, inClass = P.x < 11 && P.z < -2.66 && P.z > SCHOOL.z0;
  school.talkT -= dt;
  if (school.talkT <= 0) {
    school.talkT = R(7, 12);
    if (inClass) say(school.teacher, pick(TEACHER_LINES), 2.8);
    else { const kids = people.filter((p) => p.kind !== 'teacher' && Math.hypot(p.a.pos.x - P.x, p.a.pos.z - P.z) < 5); if (kids.length) say(pick(kids).a, pick(KID_LINES), 2.4); }
  }
}
// the gate: E – going home
export const nearGate = () => Math.hypot(G.petike.pos.x - GATE.x, G.petike.pos.z - (GATE.z - 0.6)) < 1.6;
