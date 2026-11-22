// Petyus kalandjai – 2. rész: a lakás (az alaprajz alapján). Falak, ajtók, ablakok, padlók, bútorok, ütközők, erkélyek.
// Coordinates: 1 unit = 1 m, the inner north-west corner of the flat is (0, 0), x grows east, z south (as on the floor plan).
// Dollhouse view: the camera looks from the south-east, so the outer south and east walls are low (window-sill height);
// the inner walls are full height, but the ones between the camera and Petyus / his room sink down (cutaway, updateHome).
import * as THREE from 'three';
import { CAM_OFF, scene } from '../scene.js';
import { damp } from '../util.js';
import { CATALOG, getGeometry } from '../voxels.js';
import { INSTANCES, addBoxCol, addCircleCol, partMesh, vcMat } from '../world.js';

export const WALL_H = 2.6;
const TE = 0.25, LOW = 0.62, CUT = 0.17;   // outer wall thickness, the low front walls, a sunk wall's height (× WALL_H)

// ---------------------------------------------------------------- rooms (inner floor areas)
export const ROOMS = [
  { id: 'furdo', name: 'Fürdőszoba', x0: 0, z0: 0, x1: 2.88, z1: 1.8, floor: 'tile' },
  { id: 'wc', name: 'WC', x0: 3.0, z0: 0, x1: 4.13, z1: 1.8, floor: 'tile' },
  { id: 'eloter', name: 'Előtér', x0: 0, z0: 1.92, x1: 4.25, z1: 3.2, floor: 'stone' },
  { id: 'konyha', name: 'Konyha–étkező', x0: 4.25, z0: 0, x1: 8.9, z1: 3.2, floor: 'kitchen' },
  { id: 'kisszoba', name: 'Petyus szobája', x0: 9.02, z0: 0, x1: 12, z1: 3.2, floor: 'wood' },
  { id: 'testver', name: 'A testvér szobája', x0: 0, z0: 3.32, x1: 5.18, z1: 7.02, floor: 'wood2', locked: true },
  { id: 'szulok', name: 'A szülők szobája', x0: 5.3, z0: 3.32, x1: 12, z1: 7.02, floor: 'wood' },
  { id: 'erkely_e', name: 'Erkély', x0: 9.02, z0: -1.55, x1: 12, z1: -TE, floor: 'balcony' },
  { id: 'erkely_k', name: 'Erkély', x0: 12 + TE, z0: 3.32, x1: 14.05, z1: 7.02, floor: 'balcony' },
];
export function roomAt(x, z) { return ROOMS.find((r) => x >= r.x0 - 0.06 && x <= r.x1 + 0.06 && z >= r.z0 - 0.06 && z <= r.z1 + 0.06) || null; }

// places in the flat the game uses
export const SPOTS = {
  petyusWake: { x: 10.55, z: 1.35, h: Math.PI * 0.75 },   // next to his bed
  dadChair: { x: 7.2, z: 1.52, h: 0 },                     // at the table, facing the room
  momCook: { x: 5.8, z: 0.95, h: Math.PI },                // at the cooktop
  siblingDoor: { x: 2.43, z: 3.26 },
  frontDoor: { x: 0.05, z: 2.56 },
};

// ---------------------------------------------------------------- walls
// a wall: an axis-aligned box (x0..x1, z0..z1); openings along its length: doors { a, b, leaf: 'closed' } and windows
// { a, b, y0, y1 }. kind: 'back' (outer north / west, full height), 'front' (outer south / east, low), 'in' (inner, cutaway).
const DOOR_H = 2.1;
const WALLS = [
  // outer: north (windows: bathroom, WC, kitchen ×2, Petyus's room; the door to the north balcony), west (front door, sibling's window)
  { kind: 'back', x0: -TE, z0: -TE, x1: 12 + TE, z1: 0, open: [{ a: 1.0, b: 1.8, y0: 1.5, y1: 2.2 }, { a: 3.3, b: 3.8, y0: 1.6, y1: 2.1 }, { a: 4.9, b: 6.3, y0: 1.05, y1: 2.2 }, { a: 6.9, b: 8.3, y0: 1.05, y1: 2.2 }, { a: 9.35, b: 10.2 }, { a: 10.6, b: 11.7, y0: 0.9, y1: 2.2 }] },
  { kind: 'back', x0: -TE, z0: 0, x1: 0, z1: 7.02 + TE, open: [{ a: 2.1, b: 3.02, leaf: 'front' }, { a: 4.4, b: 6.0, y0: 0.9, y1: 2.2 }] },
  // outer: south and east (low; the east one has the door to the east balcony)
  { kind: 'front', x0: -TE, z0: 7.02, x1: 12 + TE, z1: 7.02 + TE },
  { kind: 'front', x0: 12, z0: -TE, x1: 12 + TE, z1: 7.02, open: [{ a: 4.6, b: 5.5 }] },
  // inner
  { kind: 'in', x0: 0, z0: 1.8, x1: 4.25, z1: 1.92, open: [{ a: 1.6, b: 2.4 }, { a: 3.2, b: 3.9 }] },   // bathroom + WC | hallway
  { kind: 'in', x0: 2.88, z0: 0, x1: 3.0, z1: 1.8 },                                                    // bathroom | WC
  { kind: 'in', x0: 4.13, z0: 0, x1: 4.25, z1: 1.8 },                                                   // WC | kitchen
  { kind: 'in', x0: 8.9, z0: 0, x1: 9.02, z1: 3.2, open: [{ a: 2.25, b: 3.05 }] },                       // kitchen | Petyus's room
  { kind: 'in', x0: 0, z0: 3.2, x1: 12, z1: 3.32, open: [{ a: 2.0, b: 2.86, leaf: 'locked' }, { a: 7.95, b: 8.8 }] },   // north row | south row
  { kind: 'in', x0: 5.18, z0: 3.32, x1: 5.3, z1: 7.02 },                                                // sibling | parents
];
const COL = { wall: 0xf4efe6, wallIn: 0xece6da, top: 0xc9bfb0, front: 0xe9e2d6, trim: 0x8a6a4a, glass: 0xa9d8ee, frame: 0xffffff, door: 0xb98b58, doorDark: 0x8a6238, sill: 0xdcd4c6 };
export const cutWalls = [];   // { group, lintels: [], box: [x0, z0, x1, z1], s }
export const doors = [];      // closed door leaves { x, z, kind }

function buildWall(w) {
  const alongX = w.x1 - w.x0 > w.z1 - w.z0;
  const a0 = alongX ? w.x0 : w.z0, a1 = alongX ? w.x1 : w.z1, t0 = alongX ? w.z0 : w.x0, t1 = alongX ? w.z1 : w.x1;
  const tm = (t0 + t1) / 2, tw = t1 - t0, H = w.kind === 'front' ? LOW : WALL_H;
  const color = w.kind === 'in' ? COL.wallIn : w.kind === 'front' ? COL.front : COL.wall;
  // a box along the wall from a to b, y0..y1 (in the wall's own frame)
  const piece = (b, a, bb, y0, y1, c = color, inset = 0) => {
    const cx = (a + bb) / 2, len = bb - a, h = y1 - y0;
    if (len <= 0.001 || h <= 0.001) return;
    if (alongX) b.bx(cx, y0, tm, len, h, tw - inset, c, 0, 0.02); else b.bx(tm, y0, cx, tw - inset, h, len, c, 0, 0.02);
  };
  const cols = [];
  const solid = (a, bb) => { if (bb - a > 0.001) cols.push(alongX ? [a, t0, bb, t1] : [t0, a, t1, bb]); };
  const opens = (w.open || []).slice().sort((p, q) => p.a - q.a);
  const lintels = [];
  const main = partMesh((b) => {
    let x = a0;
    for (const o of opens) {
      piece(b, x, o.a, 0, H); solid(x, o.a);
      if (o.y0 !== undefined) {   // window: wall below and above, sill, frame, glass
        piece(b, o.a, o.b, 0, o.y0); piece(b, o.a, o.b, o.y1, H); solid(o.a, o.b);
        piece(b, o.a - 0.04, o.b + 0.04, o.y0 - 0.04, o.y0, COL.sill, -0.08);
        piece(b, o.a, o.a + 0.05, o.y0, o.y1, COL.frame); piece(b, o.b - 0.05, o.b, o.y0, o.y1, COL.frame); piece(b, o.a, o.b, o.y1 - 0.05, o.y1, COL.frame);
        piece(b, (o.a + o.b) / 2 - 0.025, (o.a + o.b) / 2 + 0.025, o.y0, o.y1, COL.frame);
      } else if (w.kind !== 'front') {   // door: frame (+ the lintel, a separate mesh: it is hidden when the wall sinks)
        piece(b, o.a - 0.05, o.a, 0, DOOR_H + 0.05, COL.trim, -0.03); piece(b, o.b, o.b + 0.05, 0, DOOR_H + 0.05, COL.trim, -0.03);
        if (o.leaf) {   // a closed door (the front door, the sibling's room): leaf + handle; it blocks the way
          piece(b, o.a, o.b, 0, DOOR_H, o.leaf === 'front' ? COL.doorDark : COL.door, tw * 0.5);
          const hx = o.leaf === 'front' ? o.a + 0.12 : o.b - 0.12;
          piece(b, hx - 0.03, hx + 0.03, 0.98, 1.06, 0xd9c27a, -0.12);
          solid(o.a, o.b);
          doors.push({ kind: o.leaf, x: alongX ? (o.a + o.b) / 2 : tm, z: alongX ? tm : (o.a + o.b) / 2 });
        }
        lintels.push(o);
      }
      x = o.b;
    }
    piece(b, x, a1, 0, H); solid(x, a1);
    if (w.kind === 'front') piece(b, a0, a1, LOW, LOW + 0.04, COL.sill, -0.06);   // a cap on the low wall
  });
  main.castShadow = true; main.receiveShadow = true;
  const group = new THREE.Group(); group.add(main); scene.add(group);
  const lin = lintels.map((o) => { const m = partMesh((b) => piece(b, o.a - 0.05, o.b + 0.05, 0, WALL_H - DOOR_H)); m.position.y = DOOR_H; group.add(m); return m; });
  for (const [x0, z0, x1, z1] of cols) addBoxCol(x0, z0, x1, z1, H < 1 ? 1 : WALL_H);
  if (w.kind === 'in') cutWalls.push({ group, main, lintels: lin, box: [w.x0, w.z0, w.x1, w.z1], s: 1 });
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
function put(id, x, z, rot = 0, v = 0, o = {}) {
  const K = id + ':' + v; if (!lists.has(K)) lists.set(K, []);
  lists.get(K).push({ x, y: o.y || 0, z, rot, sx: o.sx || 1 });
  const c = DEF[id].collider;
  if (c && !o.noCol) {
    if (c.r !== undefined) addCircleCol(x, z, c.r, c.h);
    else { const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)), hx0 = c.hx * (o.sx || 1); const hx = cs * hx0 + sn * c.hz, hz = sn * hx0 + cs * c.hz; addBoxCol(x - hx, z - hz, x + hx, z + hz, c.h); }
  }
}
function furnish() {
  const P = Math.PI, E = P / 2, W = -P / 2;   // facing: 0 = south (+z, towards the camera side), P = north, E = east, W = west
  // bathroom
  put('bathtub', 0.92, 0.43, 0); put('bath_sink', 2.42, 0.27, 0); put('rug', 1.0, 1.25, 0, 0, { sx: 0.6 });
  // WC
  put('toilet', 3.56, 0.37, 0);
  // hallway: coats, shoes by the front door
  put('coat_rack', 1.05, 2.18); put('shoes', 0.45, 2.95, E, 0); put('shoes', 0.45, 2.4, E, 1); put('shoes', 0.75, 3.0, E, 2);
  // kitchen: the counter under the north windows, fridge, the table set for breakfast
  put('kitchen_unit', 4.8, 0.31, 0, 0); put('kitchen_unit', 5.8, 0.31, 0, 2); put('kitchen_unit', 6.8, 0.31, 0, 1); put('kitchen_unit', 7.8, 0.31, 0, 3);
  put('fridge', 8.55, 0.34, 0); put('coffee_maker', 7.55, 0.22, 0, 0, { y: 0.93 });
  put('dining_table', 6.6, 2.2, 0);
  for (const x of [6.0, 7.2]) { put('chair', x, 1.52, 0, 0); put('chair', x, 2.9, P, 0); }
  put('chair', 5.45, 2.2, E, 0); put('chair', 7.78, 2.2, W, 0);
  put('potted_plant', 4.55, 2.95);
  // Petyus's room: bed by the east wall, desk with the monitor, wardrobe, play rug, school bag
  put('bed_single', 11.5, 1.2, 0, 0); put('desk', 10.4, 2.9, P, 0); put('chair', 10.4, 2.33, 0, 2);
  put('wardrobe', 9.33, 0.95, E, 0, { sx: 0.9 }); put('rug', 10.3, 1.15, 0, 2); put('schoolbag', 9.65, 2.85, E);
  // the sibling's room (locked): double bed, built-in wardrobe, dresser
  put('bed_double', 1.12, 5.3, E, 2); put('wardrobe', 3.45, 3.64, 0, 0); put('wardrobe', 4.45, 3.64, 0, 0); put('dresser', 3.9, 6.72, P, 0); put('rug', 2.9, 5.3, 0, 0);
  // the parents' room: bed + wardrobe strip (west), sofa, TV, floor lamp, rug (east)
  put('bed_double', 6.38, 5.25, E, 0); put('wardrobe', 5.85, 3.63, 0, 1); put('wardrobe', 6.85, 3.63, 0, 1);   // the wardrobe strip: 1 m pieces (occlude.js fades them one by one) put('floor_lamp', 5.62, 6.72);
  put('sofa', 10.3, 3.8, 0, 0); put('tv_unit', 10.3, 6.78, P, 0); put('rug', 10.3, 5.3, 0, 1); put('dresser', 8.4, 6.75, P, 1);
  // balconies
  put('potted_plant', 9.4, -1.2); put('potted_plant', 11.6, -1.2); put('potted_plant', 13.7, 3.7); put('chair', 13.3, 6.2, W, 1);
}
function buildFurniture() {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (const [K, list] of lists) {
    const [id, v] = K.split(':'); const def = DEF[id];
    const geo = getGeometry(id, +v); if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox, gr = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z), gh = bb.max.y;
    const mesh = new THREE.InstancedMesh(geo, vcMat, list.length);
    list.forEach((it, n) => { e.set(0, it.rot, 0); q.setFromEuler(e); sc.set(it.sx, 1, 1); ps.set(it.x, it.y, it.z); m4.compose(ps, q, sc); mesh.setMatrixAt(n, m4);
      INSTANCES.push({ mesh, n, id, x: it.x, y: it.y, z: it.z, r: gr * it.sx, h: gh, matrix: m4.clone() }); });   // occlude.js: tall ones in front of Petyus fade
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    mesh.castShadow = !def.noShadow; mesh.receiveShadow = true; scene.add(mesh);
  }
}

// ---------------------------------------------------------------- balconies (railings), the building's slab
function buildShell() {
  scene.add(partMesh((b) => {
    // the floor slab of the flat (seen at the edges) and the two balcony slabs
    b.bx(6, -0.32, 3.51, 12 + 2 * TE, 0.32, 7.02 + 2 * TE, 0xd8d0c4, 0, 0.02);
    b.bx(10.51, -0.22, -0.9, 3.1, 0.22, 1.35, 0xd0c7ba, 0, 0.02);
    b.bx(13.15, -0.22, 5.17, 1.8, 0.22, 3.85, 0xd0c7ba, 0, 0.02);
    // railings: posts + top rail (north balcony: north, west, east sides; east balcony: east, north, south sides)
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.12));
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; b.bx(x, 0, z, 0.03, 0.95, 0.03, 0x5c6670, 0, 0); }
      b.bx((x0 + x1) / 2, 0.95, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.06, 0.05, Math.abs(z1 - z0) + 0.06, 0x3f474f, 0, 0);
    };
    rail(9.0, -1.55, 12.0, -1.55); rail(9.0, -1.55, 9.0, -0.3); rail(12.0, -1.55, 12.0, -0.3);
    rail(14.05, 3.3, 14.05, 7.07); rail(12.3, 3.3, 14.05, 3.3); rail(12.3, 7.07, 14.05, 7.07);
  }));
  for (const [x0, z0, x1, z1] of [[8.95, -1.6, 12.05, -1.5], [8.95, -1.6, 9.05, -0.25], [11.95, -1.6, 12.05, -0.25], [14.0, 3.28, 14.1, 7.1], [12.25, 3.25, 14.1, 3.35], [12.25, 7.02, 14.1, 7.12]]) addBoxCol(x0, z0, x1, z1, 1.0);
}

export function buildHome() {
  scene.add(partMesh((b) => { for (const r of ROOMS) FLOORS[r.floor](b, r); }));
  for (const w of WALLS) buildWall(w);
  furnish(); buildFurniture(); buildShell();
}

// ---------------------------------------------------------------- cutaway: inner walls between the camera and Petyus sink down
const DIR = CAM_OFF.clone().normalize();
function rayHits(px, py, pz, bx) {   // ray from (px, py, pz) towards the camera vs the wall's box (0 … WALL_H)
  let t0 = 0.05, t1 = 60;
  const lo = [bx[0], 0, bx[1]], hi = [bx[2], WALL_H, bx[3]], o = [px, py, pz], d = [DIR.x, DIR.y, DIR.z];
  for (let k = 0; k < 3; k++) {
    const a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
    if (t0 > t1) return false;
  }
  return true;
}
let curRoom = null;
export function updateHome(dt, P) {
  const r = roomAt(P.x, P.z); if (r) curRoom = r;
  const pts = [[P.x, 0.2, P.z], [P.x, 0.9, P.z], [P.x, 1.5, P.z]];
  if (curRoom) {   // the whole room he is in should be visible: its far corners and centre too
    const R = curRoom, i = 0.35;
    pts.push([(R.x0 + R.x1) / 2, 0.3, (R.z0 + R.z1) / 2], [R.x0 + i, 0.3, R.z0 + i], [R.x1 - i, 0.3, R.z0 + i], [R.x0 + i, 0.3, R.z1 - i]);
  }
  for (const w of cutWalls) {
    const hit = pts.some((p) => rayHits(p[0], p[1], p[2], w.box));
    w.s = damp(w.s, hit ? CUT : 1, hit ? 9 : 4, dt);
    w.main.scale.y = w.s;
    for (const l of w.lintels) { l.visible = w.s > 0.9; }
  }
  return curRoom;
}
