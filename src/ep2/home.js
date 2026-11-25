// Petyus kalandjai – 2. rész: a lakás (az alaprajz alapján). Falak, ajtók, ablakok, padlók, bútorok, ütközők, erkélyek.
// Coordinates: 1 unit = 1 m, the inner north-west corner of the flat is (0, 0), x grows east, z south (as on the floor plan).
// The rooms are ~1.3× the floor plan's size, so that the three of them (and the camera) have room to move.
// Dollhouse view: every wall is full height. The outer walls facing the camera and the inner ones between the camera and
// Petyus or his room become see-through (wallView.mode 'fade') or sink down ('sink') – updateHome, T switches. The camera
// can turn (ep2.js), so this works from any side; in the first-person view every wall is solid.
import * as THREE from 'three';
import { CAM_OFF, scene } from '../scene.js';
import { damp } from '../util.js';
import { CATALOG, getGeometry } from '../voxels.js';
import { TOILET, toiletLidGeometry, toiletSeatGeometry } from '../voxels-home.js';
import { Q } from '../quality.js';
import * as F from './food.js';
import { INSTANCES, addBoxCol, addCircleCol, colliders, partMesh, vcMat } from '../world.js';

export const WALL_H = 2.6;
// the flat is on the 2nd floor of a block of flats (outside.js builds the rest): its floor is at FY; the home meshes live in
// homeRoot (local y from 0), the furniture instances and INSTANCES carry the absolute height
export const FY = 6;
export const homeRoot = new THREE.Group(); homeRoot.position.y = FY;
const TE = 0.25, CUT = 0.17, FADE = 0.16, FADE_OUT = 0.2;   // outer wall thickness, a sunk wall's height (× WALL_H), a see-through (inner / outer) wall's opacity
export const wallView = { mode: 'fade' };   // 'fade' | 'sink'
export const XE = 15.6, ZS = 9.2;   // the flat's inner east and south edges

// ---------------------------------------------------------------- rooms (inner floor areas)
export const ROOMS = [
  { id: 'furdo', name: 'Fürdőszoba', x0: 0, z0: 0, x1: 3.6, z1: 2.3, floor: 'tile' },
  { id: 'wc', name: 'WC', x0: 3.72, z0: 0, x1: 5.3, z1: 2.3, floor: 'tile' },
  { id: 'eloter', name: 'Előtér', x0: 0, z0: 2.42, x1: 5.42, z1: 4.2, floor: 'stone' },
  { id: 'konyha', name: 'Konyha–étkező', x0: 5.42, z0: 0, x1: 11.6, z1: 4.2, floor: 'kitchen' },
  { id: 'kisszoba', name: 'Petyus szobája', x0: 11.72, z0: 0, x1: XE, z1: 4.2, floor: 'wood' },
  { id: 'testver', name: 'A testvér szobája', x0: 0, z0: 4.32, x1: 6.8, z1: ZS, floor: 'wood2', locked: true },
  { id: 'szulok', name: 'A szülők szobája', x0: 6.92, z0: 4.32, x1: XE, z1: ZS, floor: 'wood' },
  { id: 'erkely_e', name: 'Erkély', x0: 11.72, z0: -1.9, x1: XE, z1: -TE, floor: 'balcony' },
  { id: 'erkely_k', name: 'Erkély', x0: XE + TE, z0: 4.32, x1: 18.1, z1: ZS, floor: 'balcony' },
];
export function roomAt(x, z) { return ROOMS.find((r) => x >= r.x0 - 0.06 && x <= r.x1 + 0.06 && z >= r.z0 - 0.06 && z <= r.z1 + 0.06) || null; }

// places in the flat the game uses
export const SPOTS = {
  petyusWake: { x: 13.1, z: 1.8, h: Math.PI * 0.75 },     // next to his bed
  dadChair: { x: 9.55, z: 1.95, h: Math.PI / 2 },          // at the table's west end, facing it (in front of the chair's back: see furnish)
  momCook: { x: 7.6, z: 1.0, h: Math.PI },                 // at the cooktop
  momFridge: { x: 6.55, z: 1.5 },                          // in front of the wide fridge (west wall)
};

// ---------------------------------------------------------------- walls
// a wall: an axis-aligned box (x0..x1, z0..z1); openings along its length: doors { a, b, leaf } and windows { a, b, y0, y1 }.
// A door with swing (±1: towards +/− across the wall) has a leaf that opens and closes (E); start: 'open' → open at first.
// kind: 'out' (outer) or 'in' (inner); both full height.
const DOOR_H = 2.1;
const WIN = (a, b, y0 = 0.85, y1 = 2.2) => ({ a, b, y0, y1 });
const WALLS = [
  // outer north: bathroom, WC, kitchen ×2 windows; Petyus's room: the door to the north balcony + a window
  { kind: 'out', n: [0, -1], x0: -TE, z0: -TE, x1: XE + TE, z1: 0, open: [WIN(1.3, 2.3, 1.5), WIN(4.2, 4.9, 1.6, 2.1), WIN(6.4, 8.0, 1.05), WIN(8.6, 10.2, 1.05), { a: 12.2, b: 13.1, glass: true, swing: 1 }, WIN(13.6, 15.0)] },
  // outer west: the front door (hallway); the sibling's room has pictures above the bed there (no window)
  { kind: 'out', n: [-1, 0], x0: -TE, z0: 0, x1: 0, z1: ZS + TE, open: [{ a: 2.85, b: 3.8, leaf: 'front' }] },
  // outer south: two windows in each of the south rooms
  { kind: 'out', n: [0, 1], x0: -TE, z0: ZS, x1: XE + TE, z1: ZS + TE, open: [WIN(1.0, 3.0), WIN(3.8, 5.8), WIN(8.0, 10.2), WIN(11.6, 14.6)] },
  // outer east: Petyus's window; the parents' room: the door to the east balcony + a window
  { kind: 'out', n: [1, 0], x0: XE, z0: -TE, x1: XE + TE, z1: ZS, open: [WIN(1.0, 3.0), { a: 5.4, b: 6.4, glass: true, swing: -1 }, WIN(6.9, 8.7)] },
  // inner
  { kind: 'in', x0: 0, z0: 2.3, x1: 5.42, z1: 2.42, open: [{ a: 2.2, b: 3.1, swing: -1, start: 'open' }, { a: 4.1, b: 4.9, swing: -1 }] },   // bathroom + WC | hallway
  { kind: 'in', x0: 3.6, z0: 0, x1: 3.72, z1: 2.3 },                                                   // bathroom | WC
  { kind: 'in', x0: 5.3, z0: 0, x1: 5.42, z1: 2.3 },                                                   // WC | kitchen
  { kind: 'in', x0: 11.6, z0: 0, x1: 11.72, z1: 4.2, open: [{ a: 3.05, b: 3.95, swing: 1 }] },           // kitchen | Petyus's room
  { kind: 'in', x0: 0, z0: 4.2, x1: XE, z1: 4.32, open: [{ a: 2.6, b: 3.5, leaf: 'locked' }, { a: 9.4, b: 10.3, swing: 1, start: 'open' }] },   // north row | south row
  { kind: 'in', x0: 6.8, z0: 4.32, x1: 6.92, z1: ZS },                                                 // sibling | parents
];
const COL = { wall: 0xf4efe6, wallIn: 0xece6da, front: 0xeee7db, trim: 0x8a6a4a, frame: 0xffffff, door: 0xb98b58, doorDark: 0x8a6238, sill: 0xdcd4c6 };
const GLASS_OP = 0.45;
export const cutWalls = [];   // { body, mat, glass, lintels: [], box: [x0, z0, x1, z1], s, o }
export const doors = [];      // { kind: 'front' | 'locked' | 'room' | 'balcony', x, z } (+ open, t, pivot, col for the ones that open)

function buildWall(w) {
  const alongX = w.x1 - w.x0 > w.z1 - w.z0;
  const a0 = alongX ? w.x0 : w.z0, a1 = alongX ? w.x1 : w.z1, t0 = alongX ? w.z0 : w.x0, t1 = alongX ? w.z1 : w.x1;
  const tm = (t0 + t1) / 2, tw = t1 - t0, H = WALL_H;
  const color = w.kind === 'in' ? COL.wallIn : COL.wall;
  // a box along the wall from a to bb, y0..y1 (clipped to the wall's height), in the wall's own frame
  const piece = (b, a, bb, y0, y1, c = color, inset = 0, maxY = H) => {
    y1 = Math.min(y1, maxY); const cx = (a + bb) / 2, len = bb - a, h = y1 - y0;
    if (len <= 0.001 || h <= 0.001) return;
    if (alongX) b.bx(cx, y0, tm, len, h, tw - inset, c, 0, 0.02); else b.bx(tm, y0, cx, tw - inset, h, len, c, 0, 0.02);
  };
  const cols = [];
  const solid = (a, bb) => { if (bb - a > 0.001) cols.push(alongX ? [a, t0, bb, t1] : [t0, a, t1, bb]); };
  const opens = (w.open || []).slice().sort((p, q) => p.a - q.a);
  const lintels = [], panes = [];
  const main = partMesh((b) => {
    let x = a0;
    for (const o of opens) {
      piece(b, x, o.a, 0, H); solid(x, o.a);
      if (o.y0 !== undefined) {   // window: wall below (and above), sill, frame, glass
        piece(b, o.a, o.b, 0, o.y0); piece(b, o.a, o.b, o.y1, H); solid(o.a, o.b);
        // sill and frame: no two faces in one plane (they would flicker, close up in the first-person view): the sill's top is
        // 1 cm above the wall below, the posts stop under the top bar, the frame is 2 cm thinner than the wall
        piece(b, o.a - 0.05, o.b + 0.05, o.y0 - 0.04, o.y0 + 0.01, COL.sill, -0.1);
        piece(b, o.a, o.a + 0.06, o.y0 + 0.01, o.y1 - 0.06, COL.frame, 0.02); piece(b, o.b - 0.06, o.b, o.y0 + 0.01, o.y1 - 0.06, COL.frame, 0.02); piece(b, o.a, o.b, o.y1 - 0.06, o.y1, COL.frame, 0.02);
        for (let k = 1, n = Math.max(1, Math.round((o.b - o.a) / 0.8)); k < n; k++) { const m = o.a + (o.b - o.a) * k / n; piece(b, m - 0.03, m + 0.03, o.y0 + 0.01, o.y1 - 0.06, COL.frame, 0.025); }
        panes.push([o.a, o.b, o.y0, Math.min(o.y1, H)]);
        if (w.n) {   // roller blind outside the window, half pulled up (slats over the upper half) + its box on top
          const sg = alongX ? w.n[1] : w.n[0], off = sg * (tw / 2 + 0.025);
          const slab = (a, bb, y0, y1, c, o2, th) => { const cx = (a + bb) / 2; if (alongX) b.bx(cx, y0, tm + o2, bb - a, y1 - y0, th, c, 0, 0.01); else b.bx(tm + o2, y0, cx, th, y1 - y0, bb - a, c, 0, 0.01); };
          for (let y = (o.y0 + o.y1) / 2, k = 0; y < o.y1 - 0.001; y += 0.07, k++) slab(o.a + 0.02, o.b - 0.02, y, Math.min(o.y1, y + 0.07), k % 2 ? 0xd8d2c4 : 0xc6bfaf, off, 0.04);
          slab(o.a - 0.03, o.b + 0.03, o.y1, o.y1 + 0.18, 0xd8d2c4, off + sg * 0.05, 0.14);
        }
      } else {   // door: frame (+ the lintel, a separate mesh: it is hidden when the wall sinks)
        // the frame: jambs reaching 2 cm into the opening and a head piece below the lintel – no face of it lies in the same
        // plane as a wall face (coplanar overlapping faces flicker, especially close up in the first-person view)
        piece(b, o.a - 0.05, o.a + 0.02, 0, DOOR_H + 0.03, COL.trim, -0.03); piece(b, o.b - 0.02, o.b + 0.05, 0, DOOR_H + 0.03, COL.trim, -0.03);
        piece(b, o.a - 0.05, o.b + 0.05, DOOR_H - 0.04, DOOR_H + 0.03, COL.trim, -0.03);
        if (o.leaf) {   // a closed door (the front door, the sibling's room): leaf + handle; it blocks the way
          piece(b, o.a, o.b, 0, DOOR_H, o.leaf === 'front' ? COL.doorDark : COL.door, tw * 0.5);
          const hx = o.leaf === 'front' ? o.a + 0.12 : o.b - 0.12;
          piece(b, hx - 0.03, hx + 0.03, 0.98, 1.06, 0xd9c27a, -0.12);
          solid(o.a, o.b);
          doors.push({ kind: o.leaf, x: alongX ? (o.a + o.b) / 2 : tm, z: alongX ? tm : (o.a + o.b) / 2 });
        }
        if (o.glass) piece(b, o.a, o.b, 0, 0.03, COL.sill, -0.04, 1);   // balcony door (open): just the threshold
        lintels.push(o);
      }
      x = o.b;
    }
    piece(b, x, a1, 0, H); solid(x, a1);
  });
  // each wall has its own material: it can fade on its own (see-through mode)
  // transparent from the start: a material compiled as opaque would ignore its opacity later (three.js forces alpha 1 then)
  const mat = vcMat.clone(); mat.transparent = true;
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4ef, transparent: true, opacity: GLASS_OP, depthWrite: false });
  main.material = mat; main.castShadow = true; main.receiveShadow = true;
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body); body.add(main); homeRoot.add(group);
  for (const [a, bb, y0, y1] of panes) {   // the glass of the windows (see-through)
    const len = bb - a - 0.08, h = y1 - y0 - 0.04, g = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.03, h, alongX ? 0.03 : len), glass);
    if (alongX) g.position.set((a + bb) / 2, y0 + 0.02 + h / 2, tm); else g.position.set(tm, y0 + 0.02 + h / 2, (a + bb) / 2);
    g.renderOrder = 3; body.add(g);
  }
  // doors that open and close: a leaf on a hinge (pivot) at the opening's start; its collider is switched off while open
  for (const o of opens) {
    if (!o.swing) continue;
    const wd = o.b - o.a;
    const leaf = partMesh((b) => {
      if (o.glass) {   // balcony door: white frame, glass
        for (const [y, h] of [[0, 0.1], [DOOR_H - 0.12, 0.1], [0.95, 0.06]]) b.bx(wd / 2, y, 0, wd - 0.02, h, 0.06, COL.frame, 0, 0);
        b.bx(0.05, 0, 0, 0.08, DOOR_H - 0.02, 0.06, COL.frame, 0, 0); b.bx(wd - 0.05, 0, 0, 0.08, DOOR_H - 0.02, 0.06, COL.frame, 0, 0);
        b.bx(wd / 2, 0.1, 0, wd - 0.18, DOOR_H - 0.24, 0.02, 0xb7dcef, 0, 0);
      } else {   // room door: white leaf with two panels
        b.bx(wd / 2, 0, 0, wd - 0.02, DOOR_H - 0.02, 0.045, 0xf3f0ea, 0, 0.01);
        b.bx(wd / 2, 1.15, 0, wd - 0.26, 0.75, 0.055, 0xe6e1d6, 0, 0); b.bx(wd / 2, 0.2, 0, wd - 0.26, 0.75, 0.055, 0xe6e1d6, 0, 0);
      }
      b.bx(wd - 0.12, 0.98, 0, 0.13, 0.03, 0.13, 0xc9a227, 0, 0); b.bx(wd - 0.07, 0.93, 0, 0.04, 0.12, 0.075, 0xc9a227, 0, 0);   // handles (both sides)
    });
    leaf.material = mat; leaf.castShadow = true; leaf.receiveShadow = true;
    const pivot = new THREE.Group(); if (alongX) pivot.position.set(o.a, 0, tm); else pivot.position.set(tm, 0, o.a);
    pivot.add(leaf); body.add(pivot);
    const closedR = alongX ? 0 : -Math.PI / 2, openR = alongX ? (o.swing > 0 ? -Math.PI / 2 : Math.PI / 2) : (o.swing > 0 ? 0 : -Math.PI);
    if (alongX) addBoxCol(o.a, t0, o.b, t1, WALL_H); else addBoxCol(t0, o.a, t1, o.b, WALL_H);
    const d = { kind: o.glass ? 'balcony' : 'room', x: alongX ? (o.a + o.b) / 2 : tm, z: alongX ? tm : (o.a + o.b) / 2, open: o.start === 'open', pivot, closedR, openR, col: colliders[colliders.length - 1] };
    d.t = d.open ? 1 : 0; d.col.h = d.open ? -1 : WALL_H; pivot.rotation.y = d.open ? openR : closedR;
    doors.push(d);
  }
  // the lintel covers exactly the opening: overlapping the wall would flicker
  const lin = lintels.map((o) => { const m = partMesh((b) => piece(b, o.a, o.b, 0, WALL_H - DOOR_H, color, 0, 9)); m.material = mat; m.position.y = DOOR_H; group.add(m); return m; });
  for (const [x0, z0, x1, z1] of cols) addBoxCol(x0, z0, x1, z1, WALL_H);
  cutWalls.push({ body, mat, glass, lintels: lin, box: [w.x0, w.z0, w.x1, w.z1], n: w.n, s: 1, o: 1 });
}

// ---------------------------------------------------------------- floors
const FLOORS = {
  wood: (b, r) => planks(b, r, [0xc89a64, 0xbf8f58, 0xd2a46e], 0.18),
  wood2: (b, r) => planks(b, r, [0xb98a58, 0xae7f4e, 0xc49562], 0.18),
  tile: (b, r) => checker(b, r, 0.3, 0xe9eef1, 0xcfd9de),
  kitchen: (b, r) => checker(b, r, 0.4, 0xefe6d6, 0xd9cdb8),
  stone: (b, r) => checker(b, r, 0.4, 0xc9c1b4, 0xbdb4a6),
  balcony: (b, r) => checker(b, r, 0.33, 0xc7b9a6, 0xb8a993),
};
function planks(b, r, cols, w) {
  let n = 0;
  for (let z = r.z0; z < r.z1 - 0.001; z += w, n++) {
    const z1 = Math.min(r.z1, z + w); let x = r.x0 - ((n * 0.77) % 1.2);
    for (let m = 0; x < r.x1; m++) { const x1 = Math.min(r.x1, x + 1.2); const xa = Math.max(r.x0, x); if (x1 > xa) b.quad(xa, z, x1, z1 - 0.008, 0.004, cols[(n + m) % cols.length], 0.03); x += 1.2; }
  }
}
function checker(b, r, s, c1, c2) {
  for (let z = r.z0, j = 0; z < r.z1 - 0.001; z += s, j++) for (let x = r.x0, i = 0; x < r.x1 - 0.001; x += s, i++) b.quad(x, z, Math.min(r.x1, x + s), Math.min(r.z1, z + s), 0.004, (i + j) % 2 ? c1 : c2, 0.02);
}

// ---------------------------------------------------------------- furniture (voxels-home.js, instanced)
const DEF = Object.fromEntries(CATALOG.map((d) => [d.id, d]));
const lists = new Map();
// a voxel prop: in the flat (y from its floor, with a collider) or outside ({ ground: true }: on the ground, no collider)
export const SOLO = {};   // single furniture meshes that move (dad's chair): { mesh, pivot, col }
export function put(id, x, z, rot = 0, v = 0, o = {}) {
  if (o.ground && !o.col) o.noCol = true;   // (outside props have no colliders; col: true keeps it – the school's furniture)
  if (o.solo) {   // its own mesh in a pivot at the floor (it can tip over)
    const pivot = new THREE.Group(); pivot.position.set(x, FY + (o.y || 0), z); scene.add(pivot);
    const mesh = new THREE.Mesh(getGeometry(id, v), vcMat); mesh.rotation.y = rot; mesh.castShadow = mesh.receiveShadow = true; pivot.add(mesh);
    const c = DEF[id].collider; if (c && c.r !== undefined) addCircleCol(x, z, c.r, c.h); else if (c) addBoxCol(x - c.hz, z - c.hz, x + c.hz, z + c.hz, c.h);
    SOLO[o.solo] = { mesh, pivot, col: colliders[colliders.length - 1], x, z, rot };
    return;
  }
  // one instanced mesh per kind, variant AND 16 m cell: a mesh is culled as a whole, so cells off screen are not drawn at all
  const K = id + ':' + v + ':' + Math.floor(x / 16) + ':' + Math.floor(z / 16); if (!lists.has(K)) lists.set(K, []);
  lists.get(K).push({ x, y: (o.y || 0) + (o.ground ? 0 : FY), z, rot, sx: o.sx || 1, s: o.s || 1 });
  const c = DEF[id].collider;
  if (c && !o.noCol) {
    if (c.r !== undefined) addCircleCol(x, z, c.r, c.h);
    else { const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)), hx0 = c.hx * (o.sx || 1); const hx = cs * hx0 + sn * c.hz, hz = sn * hx0 + cs * c.hz; addBoxCol(x - hx, z - hz, x + hx, z + hz, c.h); }
  }
}
function furnish() {
  const P = Math.PI, E = P / 2, W = -P / 2;   // facing: 0 = south (+z, towards the camera side), P = north, E = east, W = west
  // bathroom: tub on the west wall, washing machine + shelf on the north wall, the basin on the east wall
  put('bathtub', 0.4, 1.15, E); put('washing_machine', 1.45, 0.33, 0); put('shelf', 2.45, 0.2, 0); put('bath_sink', 3.35, 1.05, W); put('rug', 1.9, 1.55, 0, 0, { sx: 0.6 });
  // WC
  put('toilet', 4.5, 0.37, 0, 1);   // without its seat: the seat flips up and down (buildToiletSeat)
  put('toilet_paper', 5.29, 0.75, W); put('plunger', 4.98, 0.22);   // the plunger beside the toilet
  wcRolls(5.29, 0.75, W);
  // hallway: coats, shoes by the front door
  put('wall_coat_hanger', 1.3, 4.19, P); put('shoe_cabinet', 1.3, 4.02, P);   // on the wall opposite the bathroom, by the front door
  put('shoes', 0.45, 3.55, E, 0); put('shoes', 0.45, 2.75, E, 1); put('shoes', 2.15, 3.95, P, 2);
  // kitchen: fridge + the counter under the north windows; the table along the wall to Petyus's room (the middle stays free)
  // the wide fridge on the west wall, the counter beside it turning the corner (L): one unit on the west wall, four on the north
  put('kitchen_unit', 5.73, 0.5, E, 3);   // (the wide fridge itself opens: appliances.js)
  put('kitchen_unit', 6.6, 0.31, 0, 0); put('kitchen_unit', 7.6, 0.31, 0, 2); put('kitchen_unit', 8.6, 0.31, 0, 1); put('kitchen_unit', 9.6, 0.31, 0, 3);
  put('coffee_maker', 9.75, 0.22, 0, 0, { y: 0.93 });
  put('dining_table', 10.7, 1.95, 0, 1);   // (the breakfast on it: buildBreakfast)
  // the table's short end at the wall to Petyus's room: chairs on its two long sides, dad's at the free (west) end
  put('chair', 10.4, 1.3, 0, 0); put('chair', 11.2, 1.3, 0, 0); put('chair', 10.4, 2.6, P, 0);
  put('chair', 9.42, 1.95, E, 0, { solo: 'dadChair' });     // dad's own: it falls over when he runs (coffee.js)
  put('potted_plant', 5.8, 3.9);
  // Petyus's room: bed on the kitchen wall, desk with the monitor by the east window, wardrobe on the south wall, play rug, school bag
  put('bed_single', 12.22, 1.95, 0, 0); put('desk', 15.28, 1.45, W, 1);   // the computer on it: appliances.js put('chair', 14.7, 1.45, E, 2);
  put('desk', 14.3, 0.32, 0, 1);   // the table before the north window, with Karcsi's cage on it (karcsi.js)
  addBoxCol(13.8, 3.58, 14.8, 4.18, 2.1);   // Petyus's wardrobe: hollow, with doors that open – built in dressing.js (only its collider here)
  put('rug', 13.7, 2.2, 0, 2); put('schoolbag', 15.32, 2.32, W);   // the bag next to the desk (the scooter: appliances.js)
  // the sibling's room (locked): double bed, built-in wardrobe, dresser
  put('bed_double', 1.12, 6.8, E, 2); put('wardrobe', 4.4, 4.64, 0, 0); put('wardrobe', 5.4, 4.64, 0, 0); put('dresser', 4.6, 8.92, P, 0); put('rug', 3.4, 6.8, 0, 0);
  // the parents' room: bed on the north wall, the sofa opposite on the south wall, TV on the south wall near the sibling's
  // wall, the wardrobe strip on the sibling's wall (1 m pieces: occlude.js fades them one by one)
  // a bedside table with a lamp on each side of the bed
  put('bed_double', 12.6, 5.4, 0, 0); put('nightstand', 11.5, 4.55, 0, 0); put('nightstand', 13.72, 4.55, 0, 1);
  put('sofa', 12.6, 8.72, P, 0); put('tv_unit', 8.3, 8.95, P, 0);
  put('bookshelf', 14.95, 4.49, 0, 0);   // on the north wall, right of the bed, by the balcony door
  [4.92, 6.12, 7.32, 8.52].forEach((z, n) => put('sideboard', 7.17, z, E, n % 2));   // half-height drawers + doors along the whole wall
  put('floor_lamp', 11.25, 8.95);
  // the parents' plants under the east window (z 6.9 … 8.7): a plant bench with small ones on it and below, big ones on the floor
  put('plant_shelf', 15.38, 7.8, W, 0);
  put('house_plant', 15.38, 7.25, 0, 6, { y: 0.46, noCol: true }); put('house_plant', 15.36, 7.8, 1, 4, { y: 0.46, noCol: true }); put('house_plant', 15.38, 8.35, 2, 5, { y: 0.46, noCol: true });
  put('house_plant', 15.38, 7.45, 0.5, 4, { y: 0.15, noCol: true }); put('house_plant', 15.38, 8.15, 2.1, 6, { y: 0.15, noCol: true });
  put('house_plant', 14.95, 6.75, 0.3, 0); put('house_plant', 14.85, 7.6, 1.2, 2); put('house_plant', 14.9, 8.4, 0.8, 3); put('house_plant', 15.15, 8.95, 2.2, 1); put('dresser', 10.2, 8.95, P, 1); put('rug', 12.6, 7.4, 0, 1);
  // balconies
  // Petyus's balcony (north): bougainvilleas in pots all along the railing and on both sides, of different sizes and colours
  // (the way from the balcony door, x 12.2 … 13.1, stays free)
  [[11.95, -1.62, 1.15, 0], [12.45, -1.68, 0.9, 1], [12.95, -1.62, 1.25, 2], [13.45, -1.68, 1.0, 0], [13.95, -1.62, 1.2, 3], [14.45, -1.68, 0.95, 1], [14.95, -1.62, 1.3, 0], [15.35, -1.55, 1.05, 4],
    [11.98, -1.05, 0.85, 1], [11.98, -0.6, 1.1, 2], [15.35, -1.05, 1.0, 3], [15.35, -0.6, 0.85, 0], [14.2, -1.1, 0.75, 4]].forEach(([x, z, sc, v], n) => put('bougainvillea', x, z, n * 1.3, v, { s: sc }));
  put('potted_plant', 17.7, 4.7); put('chair', 17.3, 8.3, W, 1);
}
export function buildFurniture() {   // (also the school: school.js)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (const [K, list] of lists) {
    const [id, v] = K.split(':'); const def = DEF[id];
    const geo = getGeometry(id, +v); if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox, gr = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z), gh = bb.max.y;
    const mesh = new THREE.InstancedMesh(geo, vcMat, list.length);
    list.forEach((it, n) => { e.set(0, it.rot, 0); q.setFromEuler(e); sc.set(it.sx * it.s, it.s, it.s); ps.set(it.x, it.y, it.z); m4.compose(ps, q, sc); mesh.setMatrixAt(n, m4);
      INSTANCES.push({ mesh, n, id, x: it.x, y: it.y, z: it.z, r: gr * it.sx * it.s, h: gh * it.s, matrix: m4.clone() }); });   // occlude.js: tall ones in front of Petyus fade
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    // shadows (the shadow pass draws every caster again): the flat's furniture, and outside only the trees and the trampoline –
    // the parked cars, bushes, rocks, lamps … stay flat (a big saving: 19 cars alone are ~120 000 triangles)
    const outside = list[0].y < FY - 0.5, castOut = /^(oak|pine|birch|trampoline)$/.test(id);
    mesh.castShadow = !def.noShadow && (!outside || castOut); mesh.receiveShadow = true; scene.add(mesh);
  }
}

// ---------------------------------------------------------------- balconies (railings), the building's slab
function buildShell() {
  homeRoot.add(partMesh((b) => {
    // the floor slab of the flat (seen at the edges) and the two balcony slabs
    // (no slab of its own: the floor stands on the block below (outside.js); a slab here lay exactly on the block's top and
    //  its sides on the facade – coplanar faces flicker, seen through the see-through outer walls)
    b.bx(13.66, -0.22, -1.075, 3.98, 0.22, 1.65, 0xd0c7ba, 0, 0.02);
    b.bx(16.975, -0.22, 6.76, 2.25, 0.22, 4.88, 0xd0c7ba, 0, 0.02);
    // railings: posts + top rail (north balcony: north, west, east sides; east balcony: east, north, south sides)
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.12));
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; b.bx(x, 0, z, 0.03, 0.95, 0.03, 0x5c6670, 0, 0); }
      b.bx((x0 + x1) / 2, 0.95, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.06, 0.05, Math.abs(z1 - z0) + 0.06, 0x3f474f, 0, 0);
    };
    rail(11.7, -1.9, XE, -1.9); rail(11.7, -1.9, 11.7, -0.3); rail(XE, -1.9, XE, -0.3);
    rail(18.1, 4.3, 18.1, ZS + 0.05); rail(XE + 0.3, 4.3, 18.1, 4.3); rail(XE + 0.3, ZS + 0.05, 18.1, ZS + 0.05);
  }));
  for (const [x0, z0, x1, z1] of [[11.65, -1.95, XE + 0.05, -1.85], [11.65, -1.95, 11.75, -0.25], [XE - 0.05, -1.95, XE + 0.05, -0.25], [18.05, 4.25, 18.15, ZS + 0.1], [XE + TE, 4.25, 18.15, 4.35], [XE + TE, ZS, 18.15, ZS + 0.1]]) addBoxCol(x0, z0, x1, z1, 1.0);
}

// ---------------------------------------------------------------- light switches (E next to one) and the room lights
// each switch: a plate on the wall at 1.05 m (n: the wall face it sits on), its room's light (a point light without shadows,
// off in the morning) and a lamp under the ceiling (seen in the first-person view)
const SWITCHES = [
  { room: 'furdo', x: 1.95, z: 2.42, n: [0, 1] },     // outside the bathroom door, in the hallway
  { room: 'wc', x: 3.85, z: 2.42, n: [0, 1] },        // outside the WC door
  { room: 'eloter', x: 0, z: 2.6, n: [1, 0] },        // by the front door
  { room: 'konyha', x: 5.9, z: 4.2, n: [0, -1] },     // the kitchen, by the hallway
  { room: 'kisszoba', x: 11.72, z: 2.8, n: [1, 0] },  // inside Petyus's room, by the door
  { room: 'szulok', x: 10.55, z: 4.32, n: [0, 1] },   // inside the parents' room, by the door
];
export const switches = [];
// Every point light costs on every pixel of every lit surface, switched on or not (and adding / removing one recompiles all
// shaders): a fixed pool of two lights goes to the switched-on rooms nearest Petyus; with all lights off they are dark.
const LIGHT_POOL = [];
// The pool's lights are spot lights under the ceiling lamps pointing down: they cast the flat's shadows (the sun casts none
// in part 2). A light that is not needed is hidden (no shadow pass for it); both states are compiled in advance (ep2.js).
export function lightPool() {
  if (!LIGHT_POOL.length) for (let i = 0; i < 2; i++) {
    const l = new THREE.SpotLight(0xffd9a0, LIGHT_ON, 9, 1.25, 0.55, 1.6);
    l.castShadow = Q.shadowSize > 0; l.shadow.mapSize.set(Q.level >= 2 ? 1024 : 512, Q.level >= 2 ? 1024 : 512);
    l.shadow.bias = -0.0008; l.shadow.normalBias = 0.02; l.shadow.camera.near = 0.2; l.shadow.camera.far = 9;
    l.visible = false; homeRoot.add(l, l.target); LIGHT_POOL.push(l);
  }
  return LIGHT_POOL;
}
// the evening (ep2.js): a few soft room lights more, without shadows – every lit room glows, not only the two nearest
const FILL = [];
export function addFillLights(n) {   // (short reach: they should not light up the facade outside)
  for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffdcae, 3.0, 4.8, 1.2); l.visible = false; homeRoot.add(l); FILL.push(l); }
}
function updateLights(P) {
  const on = switches.filter((s) => s.on).sort((a, b) => Math.hypot(a.light.position.x - P.x, a.light.position.z - P.z) - Math.hypot(b.light.position.x - P.x, b.light.position.z - P.z));
  FILL.forEach((l, i) => { const s = on[i]; l.visible = !!s; if (s) l.position.set(s.light.position.x, WALL_H - 0.4, s.light.position.z); });
  lightPool().forEach((l, i) => {
    const s = on[i]; l.visible = !!s;
    if (s) { l.position.set(s.light.position.x, WALL_H - 0.12, s.light.position.z); l.target.position.set(s.light.position.x, 0, s.light.position.z); l.target.updateMatrixWorld(); }
  });
}
const LIGHT_ON = 9;
function buildSwitches() {
  for (const sd of SWITCHES) {
    const r = ROOMS.find((q) => q.id === sd.room), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const alongX = sd.n[1] !== 0;   // the plate lies in a wall running along x
    const plate = partMesh((b) => b.bx(0, -0.07, 0, alongX ? 0.09 : 0.016, 0.14, alongX ? 0.016 : 0.09, 0xf7f7f4, 0, 0));
    plate.position.set(sd.x + sd.n[0] * 0.008, 1.05, sd.z + sd.n[1] * 0.008); homeRoot.add(plate);
    const rocker = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.05 : 0.02, 0.07, alongX ? 0.02 : 0.05), new THREE.MeshLambertMaterial({ color: 0xdedbd2 }));
    rocker.position.set(sd.x + sd.n[0] * 0.02, 1.05, sd.z + sd.n[1] * 0.02); homeRoot.add(rocker);
    const light = { position: new THREE.Vector3(cx, 2.35, cz) };   // where the room's light is (a pool light goes there when it is on)
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0xdedad2 }));
    lamp.position.set(cx, WALL_H - 0.07, cz); ceiling.add(lamp);
    switches.push({ ...sd, on: false, rocker, light, lamp, alongX, name: r.name });
  }
}
export function toggleSwitch(sw) {
  sw.on = !sw.on;
  // (the light itself: updateLights – the nearest switched-on rooms get the pool's lights)
  sw.lamp.material.color.set(sw.on ? 0xfff1c4 : 0xdedad2);
  sw.rocker.material.color.set(sw.on ? 0xffc24d : 0xdedbd2);
  if (sw.alongX) sw.rocker.rotation.x = sw.on ? -0.35 : 0; else sw.rocker.rotation.z = sw.on ? 0.35 : 0;
}
// doors that open: E toggles; the collider is off while open (h −1: collide() skips it)
export function toggleDoor(d) { d.open = !d.open; d.col.h = d.open ? -1 : WALL_H; }

// ---------------------------------------------------------------- pictures on the walls (scenes from part 1, public/kepek)
// each: the wall face it hangs on (x, z on the face, n: the way it looks), its height and width; 16:9 photos in a frame.
// A picture belongs to its wall: it fades (or sinks) with it.
const PICTURES = [
  { img: 'kep-01-csaladi-nap', x: 0.9, z: 2.42, n: [0, 1], y: 1.55, w: 0.75, frame: 0x2c2f33 },        // hallway
  { img: 'kep-02-rollerverseny', x: 11.6, z: 1.95, n: [-1, 0], y: 1.6, w: 0.85, frame: 0xb5793f },     // kitchen, above the table
  { img: 'kep-04-galambraj', x: 7.6, z: 4.2, n: [0, -1], y: 1.6, w: 0.8, frame: 0xf3f1ec },             // kitchen
  { img: 'kep-08-kutyaszan', x: 11.72, z: 1.95, n: [1, 0], y: 1.55, w: 0.7, frame: 0x3a86ff },          // Petyus's room, above the bed
  { img: 'kep-10-szundikalo-apa', x: 12.6, z: 4.32, n: [0, 1], y: 1.7, w: 1.1, frame: 0x8a5a2e },       // the parents' bed
  { img: 'kep-03-lufis-bacsi', x: 6.92, z: 5.6, n: [1, 0], y: 1.8, w: 0.8, frame: 0x2c2f33 },           // above the low cabinet
  { img: 'kep-05-fotobomba', x: 6.92, z: 7.8, n: [1, 0], y: 1.8, w: 0.8, frame: 0x2c2f33 },
  // the sibling's room: three above the bed on the west wall (where the window was)
  { img: 'kep-04-galambraj', x: 0, z: 5.95, n: [1, 0], y: 1.55, w: 0.55, frame: 0xf3f1ec },
  { img: 'kep-01-csaladi-nap', x: 0, z: 6.8, n: [1, 0], y: 1.65, w: 0.75, frame: 0xe76f9a },
  { img: 'kep-03-lufis-bacsi', x: 0, z: 7.65, n: [1, 0], y: 1.55, w: 0.55, frame: 0xf3f1ec },
];
function wallAt(x, z) { return cutWalls.find((w) => x >= w.box[0] - 0.03 && x <= w.box[2] + 0.03 && z >= w.box[1] - 0.03 && z <= w.box[3] + 0.03); }
function buildPictures() {
  const loader = new THREE.TextureLoader();
  for (const p of PICTURES) {
    const w = p.w, h = w * 9 / 16, fr = 0.035;
    const g = new THREE.Group(); g.position.set(p.x + p.n[0] * 0.012, p.y, p.z + p.n[1] * 0.012); g.rotation.y = Math.atan2(p.n[0], p.n[1]);
    const frameMat = new THREE.MeshLambertMaterial({ color: p.frame, transparent: true });
    for (const [fx, fy, fw, fh] of [[0, h / 2 + fr / 2, w + 2 * fr, fr], [0, -h / 2 - fr / 2, w + 2 * fr, fr], [-w / 2 - fr / 2, 0, fr, h], [w / 2 + fr / 2, 0, fr, h]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.03), frameMat); m.position.set(fx, fy, 0.015); g.add(m);
    }
    const tex = loader.load(import.meta.env.BASE_URL + 'kepek/' + p.img + '.jpg'); tex.colorSpace = THREE.SRGBColorSpace;
    const photoMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat); photo.position.z = 0.012; g.add(photo);
    const wall = wallAt(p.x, p.z);
    if (wall) { wall.body.add(g); (wall.extras ||= []).push(frameMat, photoMat); (wall.pics ||= []).push(g); } else homeRoot.add(g);
  }
}

// ---------------------------------------------------------------- breakfast on the kitchen table (food.js)
// the table: x 9.8 … 11.6, z 1.5 … 2.4 (its short end at the wall to Petyus's room), top at 0.77. Places: dad at the west end
// (facing east), Petyus on the north side, mum on the south side, a free place north-east; the shared things in the middle
// band (z 1.87 … 2.07) and along the south-east edge. Everything stays at least 4 cm inside the edge.
function buildBreakfast() {
  const t = new THREE.Group(); t.position.y = 0.77; homeRoot.add(t);
  const H = Math.PI / 2;
  // dad: a plate with salami, knife and fork beside it (his mug: inventory.js – the 'dad' place, 10.18 / 2.22)
  F.at(t, F.plate(0x2a9d8f), 10.02, 0, 1.95); F.at(t, F.cutlery(1), 10.02, 0, 1.95, H);
  { const sl = F.salamiSlices(3); F.at(t, sl, 10.02, 0.02, 1.96); }
  // Petyus: muesli with milk, a glass of milk on his right
  F.at(t, F.muesliBowl(), 10.42, 0, 1.66); F.at(t, F.glass(0xfafaf6, 0.75), 10.24, 0, 1.62);
  // mum: a plate with knife and fork, her tea on the right
  F.at(t, F.plate(0xe76f51), 10.42, 0, 2.24); F.at(t, F.cutlery(1), 10.42, 0, 2.24); F.at(t, F.mug(0xffffff, 0xa8641a), 10.66, 0, 2.28, Math.PI);
  // the free place: a plate and a glass of orange juice, napkins
  F.at(t, F.plate(0xffca3a), 11.2, 0, 1.67); F.at(t, F.glass(0xf8961e, 0.7), 11.42, 0, 1.62); F.at(t, F.napkins(), 11.47, 0, 1.79);
  // the middle band: bread on its board, salami, milk, muesli box, honey
  F.at(t, F.breadBoard(), 10.62, 0, 1.97);
  { const p = F.plate(0xc1121f, 0.1); F.at(t, p, 10.95, 0, 1.97); F.at(t, F.salamiSlices(7), 10.95, 0.02, 1.97); }
  F.at(t, F.milkCarton(), 11.15, 0, 1.92); F.at(t, F.muesliBox(), 11.3, 0, 1.92, H); F.at(t, F.honeyJar(), 11.47, 0, 1.94);
  // along the south-east edge: butter, the teapot, the fruit bowl
  F.at(t, F.butterDish(), 10.9, 0, 2.25); F.at(t, F.teapot(), 11.15, 0, 2.25); F.at(t, F.fruitBowl(), 11.43, 0, 2.23);
}
// the WC's paper holder: the roll on its arm (turned on its side, a sheet hanging from it) and two spares on the shelf –
// the same model as the roll Petyus can pick up (food.js toiletRoll)
function wcRolls(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; homeRoot.add(g);
  const r = F.toiletRoll(); r.rotation.z = Math.PI / 2; r.position.set(0.05, 0.69, 0.07); g.add(r);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.003), new THREE.MeshLambertMaterial({ color: 0xfafaf6 }));
  sheet.position.set(0, 0.625, 0.125); sheet.castShadow = true; g.add(sheet);
  const perf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.003, 0.004), new THREE.MeshLambertMaterial({ color: 0xe6e6df })); perf.position.set(0, 0.6, 0.126); g.add(perf);
  for (const cx of [-0.075, 0.075]) { const sp = F.toiletRoll(); sp.position.set(cx, 1.06, 0.05); g.add(sp); }
}

// ---------------------------------------------------------------- the shower over the bath (west wall) and its curtain
function buildShower() {
  homeRoot.add(partMesh((b) => {
    const C2 = 0xd9dee3, zt = 1.75;   // the tap end of the bath (south)
    b.bx(0.04, 0.95, zt, 0.06, 0.1, 0.22, C2, 0, 0); b.bx(0.1, 0.97, zt - 0.07, 0.06, 0.04, 0.04, C2, 0, 0); b.bx(0.1, 0.97, zt + 0.07, 0.06, 0.04, 0.04, C2, 0, 0);   // mixer + knobs
    b.bx(0.04, 1.05, zt - 0.35, 0.03, 1.0, 0.03, C2, 0, 0);   // the sliding rail
    b.bx(0.1, 1.86, zt - 0.35, 0.12, 0.04, 0.04, C2, 0, 0); b.bx(0.2, 1.78, zt - 0.35, 0.1, 0.12, 0.16, C2, 0, 0); b.bx(0.255, 1.79, zt - 0.35, 0.01, 0.1, 0.14, 0x8aa0b0, 0, 0);   // the head
    for (let k = 0; k < 6; k++) b.bx(0.07, 0.65 + k * 0.07, zt - 0.06 - k * 0.05, 0.025, 0.08, 0.025, 0xb8bcc0, 0, 0);   // the hose (a loose loop)
    b.bx(0.06, 0.6, zt - 0.32, 0.025, 0.42, 0.025, 0xb8bcc0, 0, 0);
    // the curtain rail along the bath's outer edge, and the curtain pushed to the north end
    b.bx(0.8, 2.0, 1.15, 0.025, 0.025, 1.75, C2, 0, 0); b.bx(0.4, 2.0, 0.28, 0.8, 0.025, 0.025, C2, 0, 0); b.bx(0.4, 2.0, 2.02, 0.8, 0.025, 0.025, C2, 0, 0);
    for (let k = 0; k < 8; k++) b.bx(0.8 + (k % 2 ? 0.035 : -0.035), 0.62, 0.34 + k * 0.065, 0.03, 1.36, 0.07, k % 2 ? 0x9fd4ef : 0xc4e6f6, 0, 0);
  }));
}

// ---------------------------------------------------------------- the WC seat and lid: E next to the toilet steps through
// closed (both down) → lid up → seat up too → closed. Both are cut to the bowl's rim (voxels-home.js TOILET) and turn on its hinge.
export const toiletSeat = { x: 4.5, z: 0.37, state: 0, seatT: 0, lidT: 0, seat: null, lid: null };
function buildToiletSeat() {
  const mk = (geo) => { const m = new THREE.Mesh(geo, vcMat); m.castShadow = true; m.receiveShadow = true;
    const pv = new THREE.Group(); pv.position.set(toiletSeat.x, TOILET.hinge.y - 0.005, toiletSeat.z + TOILET.hinge.z); pv.add(m); homeRoot.add(pv); return pv; };
  toiletSeat.seat = mk(toiletSeatGeometry()); toiletSeat.lid = mk(toiletLidGeometry());
  // the flush: a swirl of water in the bowl (shown while flushing)
  const sw = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.6, 0.06, 20, 1, true), new THREE.MeshLambertMaterial({ color: 0x8fd0f0, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  sw.position.set(toiletSeat.x, 0.27, toiletSeat.z + TOILET.cz + 0.01); sw.scale.set(TOILET.hx * 0.95, 1, TOILET.hz * 0.95); sw.visible = false; homeRoot.add(sw);
  toiletSeat.swirl = sw;
}
export function toggleToiletSeat() { toiletSeat.state = (toiletSeat.state + 1) % 3; }
// flushing (Space / the LEHÚZÁS button next to the toilet): 2.6 s of swirling water; true if it started
export function flushToilet() { if (toiletSeat.flushT > 0) return false; toiletSeat.flushT = 2.6; return true; }
export const toiletSeatLabel = () => ['E – WC-fedél felnyitása', 'E – ülőke felhajtása', 'E – ülőke és fedél lehajtása'][toiletSeat.state];

// the ceiling: only in the first-person view (from above the flat is open); unlit – the hemisphere light would tint a downward face green
export let ceiling = null;
export function buildHome(outside) {
  scene.add(homeRoot);
  ceiling = new THREE.Group(); ceiling.visible = false; homeRoot.add(ceiling);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(XE + 2 * TE, ZS + 2 * TE), new THREE.MeshBasicMaterial({ color: 0xe9e5dd, side: THREE.DoubleSide }));
  plane.rotation.x = Math.PI / 2; plane.position.set(XE / 2, WALL_H, ZS / 2); ceiling.add(plane);
  buildSwitches();
  homeRoot.add(partMesh((b) => { for (const r of ROOMS) FLOORS[r.floor](b, r); }));
  for (const w of WALLS) buildWall(w);
  furnish(); if (outside) outside(); buildFurniture(); buildShell();
  buildPictures(); buildShower(); buildToiletSeat(); buildBreakfast();
}

// ---------------------------------------------------------------- walls between the camera and Petyus / his room
// fade: see-through (each wall its own material); sink: down to CUT × height. The camera may turn: the ray follows CAM_OFF.
const DIR = new THREE.Vector3();
function rayHits(px, py, pz, bx) {   // ray from (px, py, pz) towards the camera vs the wall's box (0 … WALL_H)
  let t0 = 0.05, t1 = 60;
  const lo = [bx[0], 0, bx[1]], hi = [bx[2], WALL_H, bx[3]], o = [px, py, pz], d = [DIR.x, DIR.y, DIR.z];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-6) { if (o[k] < lo[k] || o[k] > hi[k]) return false; continue; }
    const a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
    if (t0 > t1) return false;
  }
  return true;
}
let curRoom = null;
// (the rays work in the flat's own frame: Petyus's point and the walls both measured from the flat's floor)
export function updateHome(dt, P, fps = false) {
  DIR.copy(CAM_OFF).normalize();
  const r = roomAt(P.x, P.z); if (r) curRoom = r;
  const pts = [[P.x, 0.2, P.z], [P.x, 0.9, P.z], [P.x, 1.5, P.z]];
  if (curRoom) {   // the whole room he is in should be visible: its corners and centre too
    const R = curRoom, i = 0.35;
    pts.push([(R.x0 + R.x1) / 2, 0.3, (R.z0 + R.z1) / 2], [R.x0 + i, 0.3, R.z0 + i], [R.x1 - i, 0.3, R.z0 + i], [R.x0 + i, 0.3, R.z1 - i], [R.x1 - i, 0.3, R.z1 - i]);
  }
  const fade = wallView.mode === 'fade', hl = Math.hypot(DIR.x, DIR.z);
  for (const w of cutWalls) {
    // outer walls facing the camera: always open; inner walls: when they hide Petyus or his room
    const facing = w.n && (w.n[0] * DIR.x + w.n[1] * DIR.z) / hl > 0.3;
    const hit = !fps && (facing || pts.some((p) => rayHits(p[0], p[1], p[2], w.box)));
    w.s = damp(w.s, hit && !fade ? CUT : 1, hit ? 9 : 4, dt);
    w.o = damp(w.o, hit && fade ? (facing ? FADE_OUT : FADE) : 1, hit ? 9 : 4, dt);
    w.body.scale.y = w.s;
    for (const l of w.lintels) l.visible = w.s > 0.9;
    const see = w.o < 0.985;
    w.mat.opacity = see ? w.o : 1; w.mat.depthWrite = !see;
    w.glass.opacity = GLASS_OP * w.o;
    if (w.extras) for (const m of w.extras) m.opacity = w.o;   // the pictures on it fade with the wall
    if (w.pics) for (const g of w.pics) g.visible = w.s > 0.9;   // a sunk wall: its pictures are put away (not squashed)
  }
  if (toiletSeat.swirl) {
    const f = toiletSeat.flushT = Math.max(0, (toiletSeat.flushT || 0) - dt), sw = toiletSeat.swirl;
    sw.visible = f > 0;
    if (f > 0) { sw.rotation.y += dt * 9; const k = Math.sin(Math.min(1, (2.6 - f) / 2.2) * Math.PI); sw.position.y = 0.24 + 0.07 * k; sw.scale.y = 0.5 + k; sw.material.opacity = 0.5 + 0.4 * k; }
  }
  if (toiletSeat.seat) {   // up: leaning back against the tank (the lid behind the seat)
    toiletSeat.lidT = damp(toiletSeat.lidT, toiletSeat.state >= 1 ? 1 : 0, 8, dt); toiletSeat.seatT = damp(toiletSeat.seatT, toiletSeat.state === 2 ? 1 : 0, 8, dt);
    toiletSeat.lid.rotation.x = -toiletSeat.lidT * Math.PI * 0.49; toiletSeat.seat.rotation.x = -toiletSeat.seatT * Math.PI * 0.46;
  }
  updateLights(P);
  for (const d of doors) if (d.pivot) { d.t = damp(d.t, d.open ? 1 : 0, 7, dt); d.pivot.rotation.y = d.closedR + (d.openR - d.closedR) * d.t; }
  return curRoom;
}
