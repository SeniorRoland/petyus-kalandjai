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
import { INSTANCES, addBoxCol, addCircleCol, partMesh, vcMat } from '../world.js';

export const WALL_H = 2.6;
// the flat is on the 2nd floor of a block of flats (outside.js builds the rest): its floor is at FY; the home meshes live in
// homeRoot (local y from 0), the furniture instances and INSTANCES carry the absolute height
export const FY = 6;
export const homeRoot = new THREE.Group(); homeRoot.position.y = FY;
const TE = 0.25, CUT = 0.17, FADE = 0.16, FADE_OUT = 0.2;   // outer wall thickness, a sunk wall's height (× WALL_H), a see-through (inner / outer) wall's opacity
export const wallView = { mode: 'fade' };   // 'fade' | 'sink'
const XE = 15.6, ZS = 9.2;   // the flat's inner east and south edges

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
  dadChair: { x: 10.3, z: 1.95, h: Math.PI / 2 },          // at the table (west side), facing it
  momCook: { x: 7.6, z: 1.0, h: Math.PI },                 // at the cooktop
  momFridge: { x: 5.95, z: 1.05 },
};

// ---------------------------------------------------------------- walls
// a wall: an axis-aligned box (x0..x1, z0..z1); openings along its length: doors { a, b, leaf } and windows { a, b, y0, y1 }.
// kind: 'out' (outer) or 'in' (inner); both full height.
const DOOR_H = 2.1;
const WIN = (a, b, y0 = 0.85, y1 = 2.2) => ({ a, b, y0, y1 });
const WALLS = [
  // outer north: bathroom, WC, kitchen ×2 windows; Petyus's room: the door to the north balcony + a window
  { kind: 'out', n: [0, -1], x0: -TE, z0: -TE, x1: XE + TE, z1: 0, open: [WIN(1.3, 2.3, 1.5), WIN(4.2, 4.9, 1.6, 2.1), WIN(6.4, 8.0, 1.05), WIN(8.6, 10.2, 1.05), { a: 12.2, b: 13.1, glass: true }, WIN(13.6, 15.0)] },
  // outer west: the front door (hallway), the sibling's window
  { kind: 'out', n: [-1, 0], x0: -TE, z0: 0, x1: 0, z1: ZS + TE, open: [{ a: 2.85, b: 3.8, leaf: 'front' }, WIN(5.6, 7.8)] },
  // outer south: two windows in each of the south rooms
  { kind: 'out', n: [0, 1], x0: -TE, z0: ZS, x1: XE + TE, z1: ZS + TE, open: [WIN(1.0, 3.0), WIN(3.8, 5.8), WIN(8.0, 10.2), WIN(11.6, 14.6)] },
  // outer east: Petyus's window; the parents' room: the door to the east balcony + a window
  { kind: 'out', n: [1, 0], x0: XE, z0: -TE, x1: XE + TE, z1: ZS, open: [WIN(1.0, 3.0), { a: 5.4, b: 6.4, glass: true }, WIN(6.9, 8.7)] },
  // inner
  { kind: 'in', x0: 0, z0: 2.3, x1: 5.42, z1: 2.42, open: [{ a: 2.2, b: 3.1 }, { a: 4.1, b: 4.9 }] },   // bathroom + WC | hallway
  { kind: 'in', x0: 3.6, z0: 0, x1: 3.72, z1: 2.3 },                                                   // bathroom | WC
  { kind: 'in', x0: 5.3, z0: 0, x1: 5.42, z1: 2.3 },                                                   // WC | kitchen
  { kind: 'in', x0: 11.6, z0: 0, x1: 11.72, z1: 4.2, open: [{ a: 3.05, b: 3.95 }] },                     // kitchen | Petyus's room
  { kind: 'in', x0: 0, z0: 4.2, x1: XE, z1: 4.32, open: [{ a: 2.6, b: 3.5, leaf: 'locked' }, { a: 9.4, b: 10.3 }] },   // north row | south row
  { kind: 'in', x0: 6.8, z0: 4.32, x1: 6.92, z1: ZS },                                                 // sibling | parents
];
const COL = { wall: 0xf4efe6, wallIn: 0xece6da, front: 0xeee7db, trim: 0x8a6a4a, frame: 0xffffff, door: 0xb98b58, doorDark: 0x8a6238, sill: 0xdcd4c6 };
const GLASS_OP = 0.45;
export const cutWalls = [];   // { body, mat, glass, lintels: [], box: [x0, z0, x1, z1], s, o }
export const doors = [];      // closed door leaves { x, z, kind }

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
        piece(b, o.a - 0.05, o.b + 0.05, o.y0 - 0.04, o.y0, COL.sill, -0.1);
        piece(b, o.a, o.a + 0.06, o.y0, o.y1, COL.frame, 0.02); piece(b, o.b - 0.06, o.b, o.y0, o.y1, COL.frame, 0.02); piece(b, o.a, o.b, o.y1 - 0.06, o.y1, COL.frame, 0.02);
        for (let k = 1, n = Math.max(1, Math.round((o.b - o.a) / 0.8)); k < n; k++) { const m = o.a + (o.b - o.a) * k / n; piece(b, m - 0.03, m + 0.03, o.y0, o.y1, COL.frame, 0.02); }
        panes.push([o.a, o.b, o.y0, Math.min(o.y1, H)]);
      } else {   // door: frame (+ the lintel, a separate mesh: it is hidden when the wall sinks)
        piece(b, o.a - 0.05, o.a, 0, DOOR_H + 0.05, COL.trim, -0.03); piece(b, o.b, o.b + 0.05, 0, DOOR_H + 0.05, COL.trim, -0.03);
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
  const lin = lintels.map((o) => { const m = partMesh((b) => piece(b, o.a - 0.05, o.b + 0.05, 0, WALL_H - DOOR_H, color, 0, 9)); m.material = mat; m.position.y = DOOR_H; group.add(m); return m; });
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
    for (let m = 0; x < r.x1; m++) { const x1 = Math.min(r.x1, x + 1.2); const xa = Math.max(r.x0, x); if (x1 > xa) b.quad(xa, z, x1, z1 - 0.008, 0.002, cols[(n + m) % cols.length], 0.03); x += 1.2; }
  }
}
function checker(b, r, s, c1, c2) {
  for (let z = r.z0, j = 0; z < r.z1 - 0.001; z += s, j++) for (let x = r.x0, i = 0; x < r.x1 - 0.001; x += s, i++) b.quad(x, z, Math.min(r.x1, x + s), Math.min(r.z1, z + s), 0.002, (i + j) % 2 ? c1 : c2, 0.02);
}

// ---------------------------------------------------------------- furniture (voxels-home.js, instanced)
const DEF = Object.fromEntries(CATALOG.map((d) => [d.id, d]));
const lists = new Map();
// a voxel prop: in the flat (y from its floor, with a collider) or outside ({ ground: true }: on the ground, no collider)
export function put(id, x, z, rot = 0, v = 0, o = {}) {
  if (o.ground) o.noCol = true;
  const K = id + ':' + v; if (!lists.has(K)) lists.set(K, []);
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
  put('toilet', 4.5, 0.37, 0);
  // hallway: coats, shoes by the front door
  put('coat_rack', 1.4, 2.7); put('shoes', 0.45, 3.85, E, 0); put('shoes', 0.45, 2.65, E, 1); put('shoes', 0.8, 3.95, E, 2);
  // kitchen: fridge + the counter under the north windows; the table along the wall to Petyus's room (the middle stays free)
  put('fridge', 5.78, 0.34, 0);
  put('kitchen_unit', 6.6, 0.31, 0, 0); put('kitchen_unit', 7.6, 0.31, 0, 2); put('kitchen_unit', 8.6, 0.31, 0, 1); put('kitchen_unit', 9.6, 0.31, 0, 3);
  put('coffee_maker', 9.75, 0.22, 0, 0, { y: 0.93 });
  put('dining_table', 10.95, 1.95, E);
  for (const z of [1.35, 1.95, 2.55]) put('chair', 10.3, z, E, 0);
  put('chair', 10.95, 0.78, 0, 0);
  put('potted_plant', 5.8, 3.9);
  // Petyus's room: bed on the kitchen wall, desk with the monitor by the east window, wardrobe on the south wall, play rug, school bag
  put('bed_single', 12.22, 1.95, 0, 0); put('desk', 15.28, 1.45, W, 0); put('chair', 14.7, 1.45, E, 2);
  put('wardrobe', 14.3, 3.88, P, 0); put('rug', 13.7, 2.2, 0, 2); put('schoolbag', 13.25, 3.95, P);
  // the sibling's room (locked): double bed, built-in wardrobe, dresser
  put('bed_double', 1.12, 6.8, E, 2); put('wardrobe', 4.4, 4.64, 0, 0); put('wardrobe', 5.4, 4.64, 0, 0); put('dresser', 4.6, 8.92, P, 0); put('rug', 3.4, 6.8, 0, 0);
  // the parents' room: bed on the north wall, the sofa opposite on the south wall, TV on the south wall near the sibling's
  // wall, the wardrobe strip on the sibling's wall (1 m pieces: occlude.js fades them one by one)
  put('bed_double', 12.6, 5.4, 0, 0); put('sofa', 12.6, 8.72, P, 0); put('tv_unit', 8.3, 8.95, P, 0);
  for (const z of [5.0, 6.0, 7.0]) put('wardrobe', 7.24, z, E, 1);
  put('floor_lamp', 14.3, 8.9); put('dresser', 10.3, 8.95, P, 1); put('rug', 12.6, 7.4, 0, 1);
  // balconies
  put('potted_plant', 12.1, -1.55); put('potted_plant', 15.2, -1.55); put('potted_plant', 17.7, 4.7); put('chair', 17.3, 8.3, W, 1);
}
function buildFurniture() {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (const [K, list] of lists) {
    const [id, v] = K.split(':'); const def = DEF[id];
    const geo = getGeometry(id, +v); if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox, gr = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z), gh = bb.max.y;
    const mesh = new THREE.InstancedMesh(geo, vcMat, list.length);
    list.forEach((it, n) => { e.set(0, it.rot, 0); q.setFromEuler(e); sc.set(it.sx * it.s, it.s, it.s); ps.set(it.x, it.y, it.z); m4.compose(ps, q, sc); mesh.setMatrixAt(n, m4);
      INSTANCES.push({ mesh, n, id, x: it.x, y: it.y, z: it.z, r: gr * it.sx * it.s, h: gh * it.s, matrix: m4.clone() }); });   // occlude.js: tall ones in front of Petyus fade
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    mesh.castShadow = !def.noShadow; mesh.receiveShadow = true; scene.add(mesh);
  }
}

// ---------------------------------------------------------------- balconies (railings), the building's slab
function buildShell() {
  homeRoot.add(partMesh((b) => {
    // the floor slab of the flat (seen at the edges) and the two balcony slabs
    b.bx(XE / 2, -0.32, ZS / 2, XE + 2 * TE, 0.32, ZS + 2 * TE, 0xd8d0c4, 0, 0.02);
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

// the ceiling: only in the first-person view (from above the flat is open); unlit – the hemisphere light would tint a downward face green
export let ceiling = null;
export function buildHome(outside) {
  scene.add(homeRoot);
  ceiling = new THREE.Mesh(new THREE.PlaneGeometry(XE + 2 * TE, ZS + 2 * TE), new THREE.MeshBasicMaterial({ color: 0xe9e5dd, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(XE / 2, WALL_H, ZS / 2); ceiling.visible = false; ceiling.receiveShadow = false; homeRoot.add(ceiling);
  homeRoot.add(partMesh((b) => { for (const r of ROOMS) FLOORS[r.floor](b, r); }));
  for (const w of WALLS) buildWall(w);
  furnish(); if (outside) outside(); buildFurniture(); buildShell();
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
  }
  return curRoom;
}
