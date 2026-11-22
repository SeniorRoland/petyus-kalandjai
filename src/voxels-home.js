// Petyus kalandjai – a lakás bútorai (2. rész: Szeptember) a voxel-katalógusban.
// The builders work in metres (bx: an axis-aligned box from (x0,y0,z0) to (x1,y1,z1), centred on the origin, y from the floor);
// every piece faces +z (the side people use: the front of a cupboard, the screen of a TV, the sitter of a chair looks that way).
// voxels.js adds HOME_CATALOG to CATALOG, so the catalogue page (designterv.html) shows them under „Lakás”.
import { VoxelGrid } from './voxels.js';

const S = 0.05;   // voxel size: 5 cm, like the street furniture
const vi = (m) => Math.round(m / S);
// box in metres → voxels (half-open: x0 ≤ x < x1); c: colour or (i, j, k) => colour (undefined = leave)
function bx(g, x0, y0, z0, x1, y1, z1, c) { g.box(vi(x0), vi(y0), vi(z0), vi(x1) - 1, vi(y1) - 1, vi(z1) - 1, c); }
function hole(g, x0, y0, z0, x1, y1, z1) { bx(g, x0, y0, z0, x1, y1, z1, null); }
const grid = (seed) => new VoxelGrid(S, seed);
const pick = (arr, seed) => arr[(seed - 1) % arr.length];

const C = {
  wood: 0xc08a52, woodDark: 0x8a5a2e, woodLight: 0xdcb07a, white: 0xf3f1ec, white2: 0xe4e1da, grey: 0x9aa0a6, dark: 0x2c2f33, black: 0x16181b,
  steel: 0xb8c0c8, steelDark: 0x7d868f, glass: 0x9fd0ea, screen: 0x24436a, chrome: 0xd9dee3, warm: 0xffe6a8,
};

// ---------------------------------------------------------------- beds
const BLANKETS = [[0x4f8fd6, 0xdbe9f7], [0x5fae6a, 0xe3f2dc], [0xe7a83a, 0xfff1d0]];
function bedSingle(seed) {   // 0.9 × 2.0 m, headboard at −z
  const g = grid(seed); const [b1, b2] = pick(BLANKETS, seed);
  bx(g, -0.47, 0, -1.0, 0.47, 0.28, 1.02, C.wood);
  bx(g, -0.47, 0, -1.07, 0.47, 0.85, -1.0, C.woodDark);
  bx(g, -0.47, 0, 1.0, 0.47, 0.42, 1.05, C.woodDark);
  bx(g, -0.44, 0.28, -0.98, 0.44, 0.44, 0.98, C.white);
  bx(g, -0.46, 0.3, -0.3, 0.46, 0.5, 0.99, (i, j, k) => (Math.floor(k / 3) % 2 ? b1 : b2));   // striped duvet, hanging over the sides
  bx(g, -0.3, 0.44, -0.95, 0.3, 0.56, -0.6, C.white2);
  if (seed === 1) { bx(g, -0.05, 0.5, 0.1, 0.12, 0.62, 0.22, 0xb07a45); bx(g, -0.03, 0.62, 0.12, 0.1, 0.7, 0.2, 0xb07a45); }   // teddy bear on the bed
  return g;
}
const DUVETS = [0xefe6d4, 0x7fb7be, 0xb9b3c9];
function bedDouble(seed) {   // 1.6 × 2.0 m
  const g = grid(seed); const d = pick(DUVETS, seed);
  bx(g, -0.82, 0, -1.0, 0.82, 0.3, 1.02, C.wood);
  bx(g, -0.82, 0, -1.08, 0.82, 1.0, -1.0, (i, j) => (j > 17 ? C.woodDark : C.wood));
  bx(g, -0.78, 0.3, -0.98, 0.78, 0.46, 0.98, C.white);
  bx(g, -0.8, 0.32, -0.25, 0.8, 0.52, 0.99, (i, j, k) => (j === vi(0.5) && k % 4 === 0 ? C.white2 : d));
  for (const x of [-0.42, 0.42]) bx(g, x - 0.3, 0.46, -0.95, x + 0.3, 0.6, -0.6, C.white2);
  return g;
}

// ---------------------------------------------------------------- tables, chairs, storage
function desk(seed) {   // 1.2 × 0.6 m, h 0.76; the sitter is on the +z side
  const g = grid(seed);
  bx(g, -0.6, 0.72, -0.3, 0.6, 0.77, 0.3, C.white);
  for (const x of [-0.57, 0.52]) for (const z of [-0.27, 0.22]) bx(g, x, 0, z, x + 0.05, 0.72, z + 0.05, C.grey);
  bx(g, 0.2, 0.42, -0.28, 0.57, 0.72, 0.25, C.white2);   // drawer block
  bx(g, 0.22, 0.56, 0.25, 0.55, 0.58, 0.27, C.grey);
  if (seed === 1) {   // monitor + keyboard + a small lamp
    bx(g, -0.12, 0.77, -0.2, 0.12, 0.79, -0.06, C.dark); bx(g, -0.03, 0.79, -0.15, 0.03, 0.97, -0.11, C.dark);
    bx(g, -0.3, 0.92, -0.2, 0.3, 1.27, -0.15, C.dark); bx(g, -0.27, 0.95, -0.15, 0.27, 1.24, -0.14, C.screen);
    bx(g, -0.2, 0.77, 0.02, 0.2, 0.79, 0.15, 0x3b3f45); bx(g, 0.25, 0.77, 0.05, 0.31, 0.79, 0.13, 0x3b3f45);
    bx(g, -0.55, 0.77, -0.25, -0.45, 0.79, -0.15, C.dark); bx(g, -0.52, 0.79, -0.22, -0.48, 1.05, -0.18, C.dark); bx(g, -0.56, 1.0, -0.24, -0.42, 1.08, -0.1, 0xffc24d);
  }
  return g;
}
const CHAIRS = [C.wood, C.white, 0xe2574c];
function chair(seed) {   // 0.42 × 0.42, seat 0.45, back at −z
  const g = grid(seed); const c = pick(CHAIRS, seed);
  bx(g, -0.21, 0.42, -0.21, 0.21, 0.47, 0.21, c);
  for (const x of [-0.2, 0.15]) for (const z of [-0.2, 0.15]) bx(g, x, 0, z, x + 0.05, 0.42, z + 0.05, seed === 2 ? C.grey : C.woodDark);
  bx(g, -0.21, 0.47, -0.22, 0.21, 0.95, -0.17, (i, j) => (j > 15 && j < 17 ? undefined : c));
  return g;
}
function diningTable(seed) {   // 1.8 × 0.9 m, h 0.76
  const g = grid(seed);
  bx(g, -0.9, 0.71, -0.45, 0.9, 0.77, 0.45, (i, j, k) => (Math.abs(k) % 4 === 0 ? C.woodLight : C.wood));
  for (const x of [-0.85, 0.8]) for (const z of [-0.4, 0.35]) bx(g, x, 0, z, x + 0.05, 0.71, z + 0.05, C.woodDark);
  // breakfast on the table: plates, mugs, a basket of bread (variant 1; the game's table is variant 2 – detailed things on it)
  if (seed === 1) for (const x of [-0.5, 0.0, 0.5]) { bx(g, x - 0.1, 0.77, -0.3, x + 0.1, 0.78, -0.1, C.white); bx(g, x - 0.1, 0.77, 0.1, x + 0.1, 0.78, 0.3, C.white); }
  if (seed === 1) { bx(g, 0.62, 0.77, -0.05, 0.7, 0.87, 0.03, 0xd9534f); bx(g, -0.72, 0.77, -0.05, -0.64, 0.87, 0.03, 0x4f8fd6);
    bx(g, -0.15, 0.77, -0.06, 0.15, 0.85, 0.06, 0xb07a45); bx(g, -0.12, 0.85, -0.04, 0.12, 0.88, 0.04, 0xe0b070); }
  return g;
}
const WARDROBES = [C.white, C.wood];
function wardrobe(seed) {   // 1.0 × 0.6 × 2.1 m, doors on +z
  const g = grid(seed); const c = pick(WARDROBES, seed), seam = seed === 2 ? C.woodDark : C.white2;
  bx(g, -0.5, 0, -0.3, 0.5, 2.1, 0.3, (i, j, k) => (i === 0 && k === vi(0.3) - 1 ? seam : c));
  bx(g, -0.5, 0, -0.3, 0.5, 0.08, 0.31, seam);
  for (const x of [-0.08, 0.04]) bx(g, x, 0.95, 0.3, x + 0.04, 1.2, 0.33, C.steelDark);
  return g;
}
function dresser(seed) {   // komód: 1.2 × 0.5 × 0.85 m, three drawers
  const g = grid(seed);
  bx(g, -0.6, 0.05, -0.25, 0.6, 0.85, 0.25, (i, j, k) => (k === vi(0.25) - 1 && (j === 7 || j === 12) ? C.woodDark : C.wood));
  for (const y of [0.25, 0.48, 0.7]) bx(g, -0.1, y, 0.25, 0.1, y + 0.04, 0.28, C.steel);
  bx(g, -0.55, 0, -0.2, 0.55, 0.05, 0.2, C.woodDark);
  if (seed === 1) { bx(g, -0.45, 0.85, -0.1, -0.3, 1.05, 0.05, 0x5fae6a); bx(g, 0.2, 0.85, -0.12, 0.45, 0.88, 0.1, 0xd9534f); }   // a plant and a book
  return g;
}

// ---------------------------------------------------------------- kitchen
const FRONTS = [0x6fa8a0, 0x6fa8a0, 0x6fa8a0, 0x6fa8a0];
function kitchenUnit(seed) {   // 1.0 × 0.6 × 0.92 m module: 1 cupboard, 2 sink, 3 cooktop, 4 drawers
  const g = grid(seed); const f = pick(FRONTS, seed);
  bx(g, -0.48, 0, -0.26, 0.48, 0.1, 0.26, C.dark);
  bx(g, -0.5, 0.1, -0.3, 0.5, 0.88, 0.28, (i, j, k) => (k === vi(0.28) - 1 && (i === 0 || (seed === 4 && (j === 8 || j === 13))) ? 0x4f857e : f));
  bx(g, -0.5, 0.88, -0.3, 0.5, 0.93, 0.31, 0xe8e2d6);
  if (seed === 1 || seed === 4) for (const x of [-0.1, 0.06]) bx(g, x, 0.7, 0.28, x + 0.04, 0.8, 0.31, C.steel);
  if (seed === 2) {   // sink + tap
    hole(g, -0.32, 0.8, -0.2, 0.32, 0.93, 0.2); bx(g, -0.32, 0.78, -0.2, 0.32, 0.8, 0.2, C.steelDark);
    bx(g, -0.34, 0.92, -0.22, 0.34, 0.94, -0.2, C.steel); bx(g, -0.34, 0.92, 0.2, 0.34, 0.94, 0.22, C.steel);
    bx(g, -0.03, 0.93, -0.28, 0.03, 1.2, -0.22, C.chrome); bx(g, -0.03, 1.15, -0.22, 0.03, 1.2, -0.08, C.chrome);
  }
  if (seed === 3) {   // cooktop (black glass, four rings) + a pot
    bx(g, -0.3, 0.93, -0.25, 0.3, 0.94, 0.25, C.black);
    for (const [x, z] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]]) bx(g, x - 0.05, 0.94, z - 0.05, x + 0.05, 0.945, z + 0.05, 0x5a2a24);
    bx(g, 0.05, 0.94, 0.02, 0.25, 1.06, 0.22, C.steel); hole(g, 0.1, 1.0, 0.07, 0.2, 1.06, 0.17);
  }
  return g;
}
function fridge(seed) {   // 0.6 × 0.65 × 1.85 m
  const g = grid(seed);
  bx(g, -0.3, 0, -0.32, 0.3, 1.85, 0.32, (i, j, k) => (j === 25 && k === vi(0.32) - 1 ? C.grey : C.white));
  bx(g, 0.18, 1.3, 0.32, 0.22, 1.7, 0.35, C.steelDark); bx(g, 0.18, 0.7, 0.32, 0.22, 1.15, 0.35, C.steelDark);
  bx(g, -0.2, 1.5, 0.32, -0.1, 1.6, 0.33, 0xffc24d); bx(g, -0.05, 1.42, 0.32, 0.05, 1.5, 0.33, 0x4f8fd6);   // magnets
  return g;
}
function fridgeWide(seed) {   // side-by-side fridge 0.9 × 0.65 × 1.85 m, two doors, a water dispenser
  const g = grid(seed);
  bx(g, -0.45, 0, -0.32, 0.45, 1.85, 0.32, (i, j, k) => (i === 0 && k === vi(0.32) - 1 ? C.grey : 0xdfe3e6));
  for (const x of [-0.07, 0.04]) bx(g, x, 0.6, 0.32, x + 0.03, 1.5, 0.36, C.steelDark);
  bx(g, -0.32, 1.05, 0.32, -0.12, 1.35, 0.33, C.dark); bx(g, -0.27, 1.1, 0.33, -0.17, 1.14, 0.34, 0x7fb6e8);
  bx(g, 0.2, 1.5, 0.32, 0.3, 1.6, 0.33, 0xffc24d); bx(g, 0.3, 1.38, 0.32, 0.38, 1.46, 0.33, 0x4f8fd6); bx(g, 0.15, 1.2, 0.32, 0.3, 1.32, 0.33, 0xf3f1ec);   // magnets, a drawing
  bx(g, -0.45, 0, -0.32, 0.45, 0.06, 0.33, C.dark);
  return g;
}
function coffeeMaker(seed) {   // a small espresso machine for dad
  const g = grid(seed);
  bx(g, -0.12, 0, -0.15, 0.12, 0.32, 0.12, C.dark); hole(g, -0.08, 0.04, 0.02, 0.08, 0.16, 0.12);
  bx(g, -0.08, 0.04, 0.0, 0.08, 0.05, 0.1, C.steel); bx(g, -0.03, 0.05, 0.03, 0.03, 0.11, 0.09, C.white);
  bx(g, -0.1, 0.32, -0.13, 0.1, 0.34, 0.1, C.steel);
  return g;
}

// ---------------------------------------------------------------- bathroom
function bathtub(seed) {   // 1.7 × 0.75 × 0.55 m, tap at −x
  const g = grid(seed);
  bx(g, -0.85, 0, -0.37, 0.85, 0.55, 0.38, C.white);
  hole(g, -0.75, 0.15, -0.27, 0.78, 0.55, 0.28);
  bx(g, -0.75, 0.15, -0.27, 0.78, 0.3, 0.28, 0x9fd0ea);   // a bit of water
  bx(g, -0.85, 0.55, -0.05, -0.8, 0.75, 0.05, C.chrome); bx(g, -0.8, 0.7, -0.03, -0.7, 0.75, 0.03, C.chrome);
  bx(g, 0.5, 0.55, -0.37, 0.7, 0.62, -0.25, 0xffd23f);   // rubber duck on the rim
  return g;
}
function bathSink(seed) {   // vanity unit + basin + mirror on the wall (back at −z)
  const g = grid(seed);
  bx(g, -0.3, 0.05, -0.22, 0.3, 0.78, 0.22, C.white2);
  bx(g, -0.33, 0.78, -0.24, 0.33, 0.88, 0.24, C.white); hole(g, -0.2, 0.82, -0.12, 0.2, 0.88, 0.16);
  bx(g, -0.02, 0.88, -0.22, 0.02, 1.02, -0.18, C.chrome); bx(g, -0.02, 0.98, -0.18, 0.02, 1.02, -0.1, C.chrome);
  bx(g, -0.27, 1.1, -0.25, 0.27, 1.7, -0.22, C.white2); bx(g, -0.24, 1.13, -0.22, 0.24, 1.67, -0.21, 0xcfe8f3);
  bx(g, 0.15, 0.88, -0.2, 0.21, 1.0, -0.14, 0x5fae6a); bx(g, 0.17, 1.0, -0.18, 0.19, 1.08, -0.16, 0xffc24d);   // cup + toothbrush
  return g;
}
// ---------------------------------------------------------------- the WC (2.5 cm voxels) and its two hinged parts
// shape in metres (the bowl's rim is an ellipse; the seat and the lid are cut to the same ellipse, so they sit exactly on it);
// the game puts the seat and the lid on separately (toiletSeatGeometry / toiletLidGeometry) and flips them on TOILET.hinge.
const TS = 0.025;
export const TOILET = { rim: 0.40, cz: 0.1, rx: 0.18, rz: 0.22, hx: 0.11, hz: 0.15, hinge: { y: 0.405, z: -0.08 } };
// fill every voxel whose centre (x, y, z in metres) the function gives a colour to
function fill(g, s, x0, x1, y0, y1, z0, z1, fn) {
  for (let i = Math.floor(x0 / s); i <= Math.ceil(x1 / s); i++) for (let j = Math.floor(y0 / s); j <= Math.ceil(y1 / s); j++) for (let k = Math.floor(z0 / s); k <= Math.ceil(z1 / s); k++) {
    const c = fn(i * s, (j + 0.5) * s, k * s); if (c !== undefined) g.set(i, j, k, c);
  }
}
const ell = (x, z, cz, rx, rz) => (x / rx) ** 2 + ((z - cz) / rz) ** 2;
function toilet(seed) {   // tank at −z; variant 1: with the seat and the lid down (catalogue), variant 2: without them (the game)
  const g = new VoxelGrid(TS, seed), T = TOILET, W = 0xf7f7f4, W2 = 0xe9ebee, SH = 0xdfe3e6;
  // the bowl: a pedestal widening into the rim (an ellipse), hollow, water at the bottom
  fill(g, TS, -0.22, 0.22, 0, T.rim, -0.16, 0.34, (x, y, z) => {
    const t = Math.min(1, y / 0.3), rx = 0.1 + (T.rx - 0.1) * Math.sqrt(t), rz = 0.13 + (T.rz - 0.13) * Math.sqrt(t), cz = 0.06 + (T.cz - 0.06) * t;
    const e = ell(x, z, cz, rx, rz);
    if (e > 1) return undefined;
    if (y > 0.2 && ell(x, z, T.cz + 0.01, T.hx, T.hz) < 1) return y < 0.24 ? 0x9fd0ea : undefined;   // the hole (water below)
    return y > T.rim - TS ? W : (y < 0.05 ? SH : W);
  });
  // the back of the bowl up to the tank, the tank (rounded top edge), its lid and the two-part flush button
  fill(g, TS, -0.13, 0.13, 0.25, T.rim, -0.16, -0.08, () => W);
  fill(g, TS, -0.21, 0.21, 0.42, 0.82, -0.34, -0.14, (x, y, z) => (y > 0.78 && (Math.abs(x) > 0.19 || z < -0.32 || z > -0.16) ? undefined : W));
  fill(g, TS, -0.22, 0.22, 0.8, 0.84, -0.35, -0.13, (x, y, z) => (Math.abs(x) > 0.2 && (z < -0.33 || z > -0.15) ? undefined : W2));
  fill(g, TS, -0.06, 0.06, 0.84, 0.87, -0.27, -0.21, (x) => (Math.abs(x) < 0.01 ? 0xa9b0b7 : x < 0 ? 0xd9dee3 : 0xc4cbd2));
  // the hinges at the back of the rim
  for (const hx of [-0.1, 0.1]) fill(g, TS, hx - 0.02, hx + 0.02, T.rim, T.rim + 0.03, -0.1, -0.06, () => 0xd9dee3);
  if (seed === 1) { addSeat(g, T.rim, 0); addLid(g, T.rim + TS, 0); }
  return g;
}
// the seat (a ring) and the lid (a full ellipse, slightly domed), in the hinge's frame when placed separately
function addSeat(g, y0, dz) {
  const T = TOILET;
  fill(g, TS, -0.2, 0.2, y0, y0 + TS * 0.9, -0.14 + dz, 0.34 + dz, (x, y, z) => { const e = ell(x, z - dz, T.cz, T.rx, T.rz); return e <= 1 && ell(x, z - dz, T.cz + 0.01, T.hx, T.hz) > 1 ? 0xf4f4f0 : undefined; });
}
function addLid(g, y0, dz) {
  const T = TOILET;
  fill(g, TS, -0.2, 0.2, y0, y0 + TS * 1.9, -0.14 + dz, 0.34 + dz, (x, y, z) => { const e = ell(x, z - dz, T.cz, T.rx - 0.005, T.rz - 0.005); return e <= 1 && (y < y0 + TS || e < 0.45) ? 0xfbfbf8 : undefined; });
}
export function toiletSeatGeometry() { const g = new VoxelGrid(TS, 7); addSeat(g, 0, -TOILET.hinge.z); return g.toGeometry(0.02); }
export function toiletLidGeometry() { const g = new VoxelGrid(TS, 8); addLid(g, TS, -TOILET.hinge.z); return g.toGeometry(0.02); }

function toiletPaper(seed) {   // 1.25 cm voxels: wall plate + arm, a roll with its cardboard core and a loose sheet; a shelf with two spare rolls
  const s = 0.0125, g = new VoxelGrid(s, seed), CH = 0xd9dee3, CH2 = 0xb8bfc6, P = 0xfafaf6, P2 = 0xeeeee8, CORE = 0xb8915e;
  fill(g, s, -0.09, 0.09, 0.64, 0.74, -0.012, 0.0, (x, y) => (Math.abs(x) > 0.08 && (y < 0.65 || y > 0.73) ? undefined : CH2));   // the wall plate
  fill(g, s, 0.07, 0.085, 0.68, 0.7, 0.0, 0.08, () => CH);                                                                       // the arm
  fill(g, s, -0.065, 0.07, 0.68, 0.7, 0.06, 0.08, (x) => (x > -0.06 ? CH : undefined));
  // the roll: a cylinder along x (radius 5.5 cm) round the arm, the core showing at the end
  fill(g, s, -0.06, 0.06, 0.63, 0.75, 0.015, 0.125, (x, y, z) => { const d = Math.hypot(y - 0.69, z - 0.07); if (d > 0.055) return undefined; if (d < 0.02 && Math.abs(x) > 0.05) return d < 0.012 ? undefined : CORE; return Math.abs(x) > 0.055 ? P2 : P; });
  fill(g, s, -0.055, 0.055, 0.56, 0.69, 0.12, 0.13, (x, y) => (Math.abs(y - 0.6) < 0.004 ? P2 : P));   // the loose sheet (perforation line)
  // a little shelf and two spare rolls standing on it
  fill(g, s, -0.15, 0.15, 1.04, 1.06, -0.012, 0.11, () => 0xe9e5dc);
  for (const cx of [-0.075, 0.075]) fill(g, s, cx - 0.06, cx + 0.06, 1.06, 1.17, -0.01, 0.11, (x, y, z) => { const d = Math.hypot(x - cx, z - 0.05); if (d > 0.055) return undefined; if (d < 0.02 && y > 1.15) return d < 0.012 ? undefined : CORE; return y > 1.155 ? P2 : P; });
  return g;
}
function plunger(seed) {   // WC pumpa: red rubber cup, wooden handle, standing in its holder
  const g = grid(seed);
  g.disc(0, 0, 2.2, 0, 1, 0xd9d4c8);
  g.disc(0, 0, 1.6, 1, 2, 0xc62828);
  bx(g, -0.02, 0.1, -0.02, 0.02, 0.58, 0.02, 0xb07a45);
  return g;
}
// ---------------------------------------------------------------- hallway: wall coat hanger, shoe cabinet
function wallCoatHanger(seed) {   // a board on the wall (back at −z) with hooks, coats, a hat and a scarf; a hat shelf on top
  const g = grid(seed);
  bx(g, -0.6, 1.55, -0.03, 0.6, 1.7, 0.0, C.woodDark);
  bx(g, -0.6, 1.88, -0.03, 0.6, 1.91, 0.22, C.wood);   // hat shelf
  for (let n = 0; n < 6; n++) bx(g, -0.5 + n * 0.2, 1.6, 0.0, -0.48 + n * 0.2, 1.63, 0.06, C.chrome);
  const coats = [[-0.45, 0x3d5a80, 0.6], [-0.22, 0xc8553d, 0.65], [0.02, 0x8ac926, 0.5], [0.25, 0x5a4632, 0.62], [0.45, 0x6a4c93, 0.55]];   // they end above a shoe cabinet (0.95 m)
  for (const [x, c, l] of coats) { bx(g, x - 0.09, 1.62 - l, 0.0, x + 0.09, 1.62, 0.12, c); bx(g, x - 0.05, 1.62 - l, 0.12, x + 0.05, 1.6, 0.13, (c & 0xfefefe) >> 1); }
  bx(g, 0.31, 1.25, 0.12, 0.37, 1.6, 0.14, 0xe63946);   // a scarf
  bx(g, -0.3, 1.91, 0.02, -0.08, 1.99, 0.18, 0x2c2f33); bx(g, -0.34, 1.91, 0.0, -0.04, 1.93, 0.2, 0x2c2f33);   // a hat
  bx(g, 0.15, 1.91, 0.03, 0.4, 1.96, 0.18, 0xf4a261);   // gloves / a cap
  return g;
}
function shoeCabinet(seed) {   // 1.0 × 0.35 × 0.9 m, two tilt-out flaps, shoes and keys on top
  const g = grid(seed);
  bx(g, -0.5, 0.04, -0.17, 0.5, 0.9, 0.17, (i, j, k) => (k === vi(0.17) - 1 && (i === 0 || j === 9) ? C.white2 : C.white));
  bx(g, -0.48, 0, -0.15, 0.48, 0.04, 0.15, C.dark);
  for (const [x, y] of [[-0.25, 0.4], [0.25, 0.4], [-0.25, 0.82], [0.25, 0.82]]) bx(g, x - 0.06, y, 0.17, x + 0.06, y + 0.02, 0.2, C.steelDark);
  bx(g, -0.42, 0.9, -0.1, -0.3, 0.93, 0.08, 0xc9a227); bx(g, -0.2, 0.9, -0.05, -0.05, 0.92, 0.05, 0xb5793f);   // keys, a wallet
  bx(g, 0.1, 0.9, -0.12, 0.38, 0.95, 0.12, 0xd9d4c8); bx(g, 0.15, 0.95, -0.06, 0.3, 1.1, 0.06, 0x5fae6a);   // a tray, a small plant
  return g;
}
// ---------------------------------------------------------------- parents' room: the low wall-long cabinet (sideboard modules)
function sideboard(seed) {   // 1.2 × 0.5 × 1.05 m; 1: drawers + two doors, 2: two doors + drawers; things on top
  const g = grid(seed);   // (fronts and handles one 5 cm voxel each: the body ends at 0.2, fronts 0.2…0.25, handles 0.25…0.3)
  bx(g, -0.6, 0.06, -0.25, 0.6, 1.0, 0.2, C.white);
  bx(g, -0.6, 1.0, -0.25, 0.6, 1.05, 0.25, C.wood);
  bx(g, -0.55, 0, -0.2, 0.55, 0.06, 0.15, C.woodDark);
  const dx0 = seed === 1 ? -0.6 : 0.0;   // the drawer column (0.6 wide): four drawers with a gap between them
  for (let n = 0; n < 4; n++) { const y = 0.1 + n * 0.225; bx(g, dx0 + 0.05, y, 0.2, dx0 + 0.55, y + 0.2, 0.25, C.white2); bx(g, dx0 + 0.2, y + 0.05, 0.25, dx0 + 0.4, y + 0.1, 0.3, C.wood); }
  const d0 = seed === 1 ? 0.0 : -0.6;    // the door pair
  bx(g, d0 + 0.05, 0.1, 0.2, d0 + 0.3, 0.95, 0.25, C.white2); bx(g, d0 + 0.3, 0.1, 0.2, d0 + 0.55, 0.95, 0.25, 0xe9e5dc);
  bx(g, d0 + 0.2, 0.45, 0.25, d0 + 0.25, 0.65, 0.3, C.wood); bx(g, d0 + 0.35, 0.45, 0.25, d0 + 0.4, 0.65, 0.3, C.wood);
  if (seed === 1) { bx(g, -0.4, 1.05, -0.1, -0.3, 1.3, 0.0, 0x3c6e71); bx(g, -0.45, 1.3, -0.15, -0.25, 1.35, 0.05, 0xf3a9c0); bx(g, 0.1, 1.05, -0.15, 0.45, 1.1, 0.1, 0x4f8fd6); bx(g, 0.15, 1.1, -0.1, 0.4, 1.15, 0.05, 0xd9534f); }   // vase, books
  else { bx(g, -0.3, 1.05, -0.1, -0.05, 1.3, -0.05, 0x2c2f33); bx(g, 0.2, 1.05, -0.1, 0.35, 1.15, 0.05, 0xc0643c); bx(g, 0.25, 1.15, -0.05, 0.3, 1.3, 0.0, 0x58ab4c); }   // a photo frame, a plant
  return g;
}


// ---------------------------------------------------------------- living room
const SOFAS = [0x5a7fa8, 0x8b9a5b, 0xb5675b];
function sofa(seed) {   // 2.0 × 0.9 m, back at −z
  const g = grid(seed); const c = pick(SOFAS, seed);
  bx(g, -1.0, 0.08, -0.45, 1.0, 0.42, 0.45, c);
  bx(g, -1.0, 0.42, -0.45, 1.0, 0.88, -0.2, c);
  bx(g, -1.0, 0.42, -0.45, -0.85, 0.65, 0.45, c); bx(g, 0.85, 0.42, -0.45, 1.0, 0.65, 0.45, c);
  for (const x of [-0.95, 0.9]) for (const z of [-0.4, 0.35]) bx(g, x, 0, z, x + 0.05, 0.08, z + 0.05, C.woodDark);
  bx(g, -0.75, 0.42, -0.2, -0.45, 0.7, -0.1, 0xffc24d); bx(g, 0.45, 0.42, -0.2, 0.75, 0.7, -0.1, 0xf3f1ec);
  return g;
}
function tvUnit(seed) {   // low cabinet 1.6 × 0.4 + TV, screen faces +z
  const g = grid(seed);
  bx(g, -0.8, 0.05, -0.2, 0.8, 0.5, 0.2, (i, j, k) => (k === vi(0.2) - 1 && (i === -6 || i === 5) ? C.woodDark : C.wood));
  bx(g, -0.15, 0.5, -0.1, 0.15, 0.52, 0.05, C.dark); bx(g, -0.04, 0.52, -0.06, 0.04, 0.62, 0.0, C.dark);
  bx(g, -0.58, 0.6, -0.08, 0.58, 1.27, -0.03, C.dark); bx(g, -0.55, 0.63, -0.03, 0.55, 1.24, -0.02, 0x1b2430);
  return g;
}
function floorLamp(seed) {
  const g = grid(seed);
  g.disc(0, 0, 3.5, 0, 0, C.dark);
  bx(g, -0.02, 0.05, -0.02, 0.03, 1.45, 0.03, C.dark);
  g.disc(0, 0, 4.4, vi(1.4), vi(1.7), (i, j, k) => (i * i + k * k > 12 ? 0xf6e7c4 : undefined));
  bx(g, -0.08, 1.45, -0.08, 0.08, 1.5, 0.08, C.warm);
  return g;
}
const RUGS = [[0x4f8fd6, 0xdbe9f7, 1.6, 1.1], [0xb5675b, 0xf1d9b5, 2.2, 1.5], [0x5fae6a, 0x3c8a4a, 1.3, 1.0]];
function rug(seed) {
  const g = grid(seed); const [a, b, w, d] = pick(RUGS, seed); const W = vi(w / 2), D = vi(d / 2);
  g.box(-W, 0, -D, W - 1, 0, D - 1, (i, j, k) => {
    const e = Math.min(i + W, W - 1 - i, k + D, D - 1 - k);
    if (seed === 3) return (e === 2 || (Math.abs(i) < 1 && k % 4 < 2)) ? 0xf3f1ec : (e < 2 ? b : a);   // play rug: a road with a dashed line
    return e < 2 ? b : e < 4 ? a : (Math.floor(i / 4) + Math.floor(k / 4)) % 2 ? a : b;
  });
  return g;
}

// ---------------------------------------------------------------- hallway, little things
function coatRack(seed) {   // fogas: a stand with coats and an umbrella
  const g = grid(seed);
  g.disc(0, 0, 3, 0, 0, C.woodDark);
  bx(g, -0.03, 0, -0.03, 0.03, 1.8, 0.03, C.woodDark);
  for (const [x, z] of [[-0.12, 0], [0.12, 0], [0, -0.12], [0, 0.12]]) bx(g, x - 0.02, 1.7, z - 0.02, x + 0.02, 1.74, z + 0.02, C.woodDark);
  bx(g, -0.3, 0.9, -0.06, -0.06, 1.7, 0.1, 0x3d5a80);   // dad's jacket
  bx(g, 0.06, 1.0, -0.08, 0.28, 1.7, 0.08, 0xc8553d);   // mum's coat
  bx(g, -0.08, 1.15, 0.06, 0.1, 1.68, 0.24, 0x8ac926);  // Petyus's anorak
  return g;
}
function schoolbag(seed) {   // Petyus's school bag (blue with orange flap and reflectors)
  const g = grid(seed);
  bx(g, -0.16, 0, -0.09, 0.16, 0.38, 0.09, 0x3a6fc4);
  bx(g, -0.16, 0.2, 0.09, 0.16, 0.38, 0.11, 0xf08a24);
  bx(g, -0.12, 0.08, 0.09, -0.07, 0.13, 0.1, 0xf2f25a); bx(g, 0.07, 0.08, 0.09, 0.12, 0.13, 0.1, 0xf2f25a);
  bx(g, -0.06, 0.38, -0.02, 0.06, 0.42, 0.02, C.dark);
  return g;
}
const SHOES = [0xe63946, 0x2c2f33, 0xf3f1ec];
function shoes(seed) {   // a pair of shoes, toes to +z
  const g = grid(seed); const c = pick(SHOES, seed);
  for (const x of [-0.12, 0.03]) { bx(g, x, 0, -0.12, x + 0.09, 0.03, 0.14, C.white); bx(g, x, 0.03, -0.12, x + 0.09, 0.1, 0.12, c); bx(g, x, 0.03, -0.12, x + 0.09, 0.14, -0.04, c); }
  return g;
}
function radiator(seed) {   // 0.9 × 0.1 × 0.6 m, ribbed
  const g = grid(seed);
  bx(g, -0.45, 0.12, -0.05, 0.45, 0.72, 0.05, (i) => (i % 2 ? C.white : C.white2));
  return g;
}
function pottedPlant(seed) {
  const g = grid(seed);
  g.disc(0, 0, 3, 0, 6, 0xc0643c);
  g.ellipsoid(0, 13, 0, 5, 7, 5, (i, j, k) => ((i + j + k) % 3 ? 0x4a9c42 : 0x3f8f3a), 0.6);
  return g;
}

// ---------------------------------------------------------------- bathroom: washing machine, shelf
function washingMachine(seed) {   // front loader 0.6 × 0.6 × 0.85 m, door on +z
  const g = grid(seed);
  bx(g, -0.3, 0, -0.3, 0.3, 0.85, 0.3, C.white);
  bx(g, -0.28, 0.7, 0.3, 0.28, 0.82, 0.31, C.white2); bx(g, 0.12, 0.74, 0.3, 0.2, 0.78, 0.32, C.dark); bx(g, -0.22, 0.74, 0.3, 0.0, 0.78, 0.31, 0x7fb6e8);
  for (let i = -5; i <= 5; i++) for (let j = 3; j <= 13; j++) { const d = i * i + (j - 8) * (j - 8); if (d <= 26) g.set(i, j, vi(0.3), d <= 13 ? 0x7f9fb4 : C.steelDark); }   // round door with glass
  return g;
}
function shelf(seed) {   // standing shelf 0.8 × 0.35 × 1.4 m with towels, bottles and a basket
  const g = grid(seed);
  for (const x of [-0.4, 0.36]) bx(g, x, 0, -0.17, x + 0.04, 1.4, 0.17, C.white2);
  for (const y of [0.05, 0.5, 0.95, 1.36]) bx(g, -0.4, y, -0.17, 0.4, y + 0.04, 0.17, C.white);
  bx(g, -0.32, 0.54, -0.12, -0.02, 0.74, 0.14, 0x7fb7be); bx(g, 0.02, 0.54, -0.12, 0.32, 0.7, 0.14, 0xf3a9c0);   // folded towels
  for (const [x, c] of [[-0.3, 0x5fae6a], [-0.18, 0xffc24d], [-0.06, 0x4f8fd6]]) bx(g, x, 0.99, -0.05, x + 0.08, 1.2, 0.05, c);   // bottles
  bx(g, 0.05, 0.09, -0.13, 0.35, 0.3, 0.14, 0xb07a45);   // laundry basket
  return g;
}

// ---------------------------------------------------------------- garden: trampoline with a safety net (0.1 m voxels)
function trampoline(seed) {   // Ø 3 m, mat at 0.6 m, net up to 2.1 m
  const g = new VoxelGrid(0.1, seed), R = 15;
  for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2, i = Math.round(Math.cos(a) * (R - 1)), k = Math.round(Math.sin(a) * (R - 1)); g.box(i, 0, k, i, 5, k, 0x3a3f44); }
  g.disc(0, 0, R, 5, 5, 0x3a3f44, R - 1.5);
  g.disc(0, 0, R - 1.5, 5, 5, 0x1c1c1e);
  g.disc(0, 0, R, 6, 6, 0x3a86ff, R - 2);
  for (let i = -R - 1; i <= R + 1; i++) for (let k = -R - 1; k <= R + 1; k++) {
    const d = Math.hypot(i, k); if (Math.abs(d - R) > 0.55) continue;
    const ang = Math.round((Math.atan2(k, i) + Math.PI) / (Math.PI * 2) * 96);
    for (let j = 7; j <= 20; j++) {
      const post = ang % 16 === 0;
      if (j === 20) g.set(i, j, k, 0x3a86ff);
      else if (post) g.set(i, j, k, 0x3a3f44);
      else if (j % 3 === 0 || ang % 3 === 0) g.set(i, j, k, 0x2b2b2b);
    }
  }
  return g;
}

// ---------------------------------------------------------------- house plants (the parents' room, under the east window)
const POTS = [0xc0643c, 0xf3f1ec, 0x3c6e71, 0xd9c7a3, 0x2c2f33];
function pot(g, r, h, c) { g.disc(0, 0, r, 0, h, c); g.disc(0, 0, r - 0.8, h, h, 0x4e3524); g.disc(0, 0, r + 0.6, h, h, c, r - 0.4); }
const LEAF = [0x2f7d3a, 0x3f8f3a, 0x4a9c42, 0x58ab4c];
function housePlant(seed) {
  const g = grid(seed), r = g.r, lc = () => LEAF[Math.floor(r() * LEAF.length)];
  switch (seed) {
    case 1: {   // monstera: big split leaves on long stems, ~1.1 m
      pot(g, 5, 8, POTS[0]);
      for (let n = 0; n < 7; n++) {
        const a = n / 7 * Math.PI * 2 + r() * 0.4, d = 5 + r() * 4, y = 12 + Math.floor(r() * 9), cx = Math.round(Math.cos(a) * d), cz = Math.round(Math.sin(a) * d);
        g.line([0, 8, 0], [cx, y, cz], 0x3d7a33);
        g.ellipsoid(cx, y, cz, 4.5, 1.2, 3.5, (i, j, k) => (Math.abs(i - cx) === 1 && (k - cz) % 2 === 0 ? undefined : 0x2a6e33), 0.3);   // the splits
      }
      break;
    }
    case 2: {   // ficus tree: thin trunk, a dense crown, ~1.7 m
      pot(g, 5, 9, POTS[1]);
      g.box(0, 9, 0, 0, 22, 0, 0x7a5a3a); g.line([0, 18, 0], [3, 24, 1], 0x7a5a3a); g.line([0, 20, 0], [-3, 26, -1], 0x7a5a3a);
      g.ellipsoid(0, 29, 0, 7, 6, 7, () => lc(), 0.7); g.ellipsoid(3, 25, 2, 4, 3, 4, () => lc(), 0.6);
      break;
    }
    case 3: {   // snake plant: upright blades with yellow edges, ~0.9 m
      pot(g, 4, 8, POTS[2]);
      for (const [x, z, h] of [[0, 0, 18], [-2, 1, 14], [2, -1, 16], [1, 2, 12], [-1, -2, 15], [2, 2, 10]]) g.box(x, 8, z, x, 8 + h, z, (i, j) => (j === 8 + h ? 0xd9c84a : (j % 3 ? 0x3d6e3a : 0x5b8f4a)));
      break;
    }
    case 4: {   // fern: arching fronds round a low pot, ~0.6 m
      pot(g, 4, 6, POTS[3]);
      g.ellipsoid(0, 10, 0, 7, 4, 7, () => (r() < 0.5 ? 0x6cbf58 : 0x58ab4c), 0.9);
      for (let n = 0; n < 8; n++) { const a = n / 8 * Math.PI * 2; g.line([0, 9, 0], [Math.round(Math.cos(a) * 9), 5, Math.round(Math.sin(a) * 9)], 0x6cbf58); }
      break;
    }
    case 5: {   // cactus + succulent in a small pot, ~0.45 m
      pot(g, 3, 4, POTS[4]);
      g.box(-1, 4, -1, 0, 12, 0, (i, j, k) => ((i + j + k) % 3 ? 0x4f8f4a : 0xe8e2b0)); g.box(1, 7, -1, 2, 9, 0, 0x4f8f4a); g.box(2, 9, -1, 2, 11, 0, 0x4f8f4a);
      g.ellipsoid(1, 5, 1, 1.5, 1, 1.5, 0x8fbf8a, 0.2); g.set(-1, 13, -1, 0xff6b8b);
      break;
    }
    case 6: {   // anthurium: glossy leaves and red flowers, ~0.6 m
      pot(g, 3.5, 6, POTS[1]);
      g.ellipsoid(0, 10, 0, 5, 4, 5, () => lc(), 0.7);
      for (const [x, z] of [[2, 3], [-3, 1], [1, -3], [-1, 2]]) { g.line([0, 7, 0], [x, 13, z], 0x3d7a33); g.box(x, 13, z, x + 1, 13, z, 0xd62828); g.set(x, 14, z, 0xffd23f); }
      break;
    }
    default: {   // pothos: trailing vines hanging over the pot (and the shelf's edge), ~0.35 m
      pot(g, 3.5, 6, POTS[3]);
      g.ellipsoid(0, 8, 0, 4.5, 2.5, 4.5, () => (r() < 0.6 ? 0x6fae3e : 0xc9d65a), 0.8);
      for (const [x, z, len] of [[4, 0, 10], [-4, 1, 7], [1, 4, 12], [-2, -4, 6], [3, 3, 9]]) for (let j = 7; j > 7 - len; j--) if (r() < 0.85) g.set(x + (j % 2), j, z, j % 3 ? 0x6fae3e : 0x4a8f3a);
    }
  }
  return g;
}
function plantShelf(seed) {   // a low white plant bench 1.6 × 0.35 × 0.45 m with a lower shelf
  const g = grid(seed);
  bx(g, -0.8, 0.42, -0.17, 0.8, 0.46, 0.17, C.white);
  bx(g, -0.75, 0.12, -0.15, 0.75, 0.15, 0.15, C.white2);
  for (const x of [-0.78, 0.74]) for (const z of [-0.16, 0.12]) bx(g, x, 0, z, x + 0.04, 0.42, z + 0.04, C.white2);
  return g;
}

// ---------------------------------------------------------------- the parents' bedside tables (lamp on top)
function nightstand(seed) {   // 0.46 × 0.4 × 0.5 m: a drawer, an open shelf, a table lamp, a book / a glass of water
  const g = grid(seed);
  bx(g, -0.23, 0.05, -0.2, 0.23, 0.5, 0.15, C.wood);
  bx(g, -0.2, 0.3, 0.15, 0.2, 0.45, 0.2, C.woodLight); bx(g, -0.05, 0.35, 0.2, 0.05, 0.4, 0.25, C.dark);   // the drawer + its knob
  hole(g, -0.2, 0.1, -0.15, 0.2, 0.25, 0.15); bx(g, -0.15, 0.1, -0.1, 0.1, 0.15, 0.1, 0xd9534f);           // the open shelf, a book in it
  for (const x of [-0.2, 0.15]) for (const z of [-0.15, 0.1]) bx(g, x, 0, z, x + 0.05, 0.05, z + 0.05, C.woodDark);
  // the lamp: a round base, a stem, a warm fabric shade
  g.disc(seed === 1 ? 2 : -2, -1, 1.6, vi(0.5), vi(0.5), 0xc9a227);
  const lx = seed === 1 ? 0.1 : -0.1;
  bx(g, lx - 0.0, 0.55, -0.05, lx + 0.05, 0.75, 0.0, 0xc9a227);
  g.disc(vi(lx), -1, 3.2, vi(0.75), vi(0.9), (i, j, k) => ((i - vi(lx)) ** 2 + (k + 1) ** 2 > 4 || j === vi(0.9) ? 0xf6e1b0 : 0xffe9a8));
  if (seed === 1) bx(g, -0.15, 0.5, -0.05, -0.05, 0.6, 0.05, 0xbfe6f7); else bx(g, 0.05, 0.5, -0.1, 0.2, 0.55, 0.1, 0x4f8fd6);   // a glass of water / a book
  return g;
}

// ---------------------------------------------------------------- a bookshelf (2.5 cm voxels): four shelves of books, a plant, a photo, boxes
function bookshelf(seed) {   // 1.0 × 0.32 × 1.8 m, back at −z
  const s = 0.025, g = new VoxelGrid(s, seed), W = 0xf3f1ec, W2 = 0xe2ded5;
  fill(g, s, -0.5, 0.5, 0, 1.8, -0.16, 0.15, (x, y, z) => {
    const side = Math.abs(x) > 0.47, back = z < -0.13, board = [0, 0.43, 0.86, 1.29, 1.77].some((b) => y >= b && y < b + 0.03);
    return side || back || board ? (side || board ? W : W2) : undefined;
  });
  const BOOK = [0xc1121f, 0x1d3557, 0x2a9d8f, 0xe9c46a, 0x6a4c93, 0xf4a261, 0x264653, 0x8ac926, 0xe76f51, 0x457b9d];
  let n = seed * 3;
  for (const by of [0.03, 0.46, 0.89, 1.32]) {
    let x = -0.45;
    while (x < 0.4) {
      const w = 0.025 * (1 + (n % 3)), h = 0.22 + ((n * 7) % 5) * 0.03, col = BOOK[n % BOOK.length]; n++;
      if (n % 9 === 0) { x += 0.15; continue; }   // a gap (for the things below)
      fill(g, s, x, x + w - 0.001, by, by + h, -0.12, 0.1, (px, py) => (py > by + h - 0.03 && (n % 2) ? 0xf3e9d2 : col));
      x += w;
    }
  }
  // a small plant, a photo frame, two boxes, a globe
  fill(g, s, 0.25, 0.38, 0.46, 0.56, -0.08, 0.05, () => 0xc0643c); g.ellipsoid(Math.round(0.315 / s), Math.round(0.62 / s), -1, 3, 3, 3, () => 0x4a9c42, 0.6);
  fill(g, s, -0.35, -0.2, 0.89, 1.05, -0.05, -0.02, (x, y) => (Math.abs(x + 0.275) < 0.05 && Math.abs(y - 0.97) < 0.05 ? 0x8ecae6 : 0x2c2f33));
  fill(g, s, 0.05, 0.4, 1.32, 1.47, -0.12, 0.1, () => 0xd9c7a3); fill(g, s, -0.15, 0.05, 1.32, 1.42, -0.12, 0.1, () => 0xb5651d);
  g.ellipsoid(Math.round(0.3 / s), Math.round(1.92 / s), -1, 3.5, 3.5, 3.5, (i, j, k) => ((i + j) % 3 ? 0x3a86ff : 0x5fae6a), 0.2); fill(g, s, 0.28, 0.32, 1.8, 1.85, -0.04, 0.0, () => 0xc9a227);
  return g;
}

// ---------------------------------------------------------------- bougainvillea in a pot (4 cm voxels): woody stems, a dense
// crown of small green leaves and paper-thin coloured bracts, a few branches hanging over the pot's rim
const BOUGAIN = [[0xd61f8c, 0xe83e9e, 0xb5176f], [0xf27aa8, 0xf59ac0, 0xe0608f], [0xa020a8, 0xb83cc0, 0x8a1a90], [0xf26b3a, 0xf58a5c, 0xe0502a], [0xfbe3ee, 0xf5c2d6, 0xffffff]];
function bougainvillea(seed) {
  const s = 0.04, g = new VoxelGrid(s, seed), r = g.r, br = BOUGAIN[(seed - 1) % BOUGAIN.length];
  const LEAF = [0x2f7d3a, 0x3f8f3a, 0x4a9c42], STEM = 0x6b4a2b, POT = seed % 2 ? 0xc0643c : 0xb5552f;
  g.disc(0, 0, 4.5, 0, 6, (i, j) => (j === 6 ? 0xd27a4f : POT)); g.disc(0, 0, 5.2, 6, 6, 0xd27a4f, 4.2); g.disc(0, 0, 3.6, 6, 6, 0x4e3524);   // the pot, its rim, soil
  const tops = [];
  for (let n = 0; n < 5; n++) { const a = n / 5 * Math.PI * 2 + r(), d = 2 + r() * 4, h = 14 + Math.floor(r() * 9); const t = [Math.round(Math.cos(a) * d), h, Math.round(Math.sin(a) * d)]; g.line([0, 6, 0], t, STEM); tops.push(t); }
  const crown = (cx, cy, cz, rx, ry, rz) => g.ellipsoid(cx, cy, cz, rx, ry, rz, () => (r() < 0.58 ? br[Math.floor(r() * 3)] : LEAF[Math.floor(r() * 3)]), 1.1);
  for (const t of tops) crown(t[0], t[1], t[2], 3.5 + r() * 1.5, 3 + r(), 3.5 + r() * 1.5);
  crown(0, 18, 0, 6, 4, 6);
  for (let n = 0; n < 4; n++) {   // branches hanging over the rim, flowering at their tips
    const a = n / 4 * Math.PI * 2 + 0.7, x0 = Math.round(Math.cos(a) * 4), z0 = Math.round(Math.sin(a) * 4), x1 = Math.round(Math.cos(a) * 7), z1 = Math.round(Math.sin(a) * 7);
    g.line([0, 8, 0], [x0, 9, z0], STEM); g.line([x0, 9, z0], [x1, 4, z1], LEAF[1]); g.ellipsoid(x1, 4, z1, 1.6, 1.6, 1.6, () => br[Math.floor(r() * 3)], 0.8);
  }
  return g;
}

export const HOME_CATALOG = [
  { id: 'bed_single', name: 'Egyszemélyes ágy', cat: 'Lakás', variants: 3, build: bedSingle, collider: { hx: 0.47, hz: 1.05, h: 0.6 }, desc: 'Fa keret, csíkos paplan, párna. Az 1. változaton plüssmaci.', use: 'Petyus szobája' },
  { id: 'bed_double', name: 'Franciaágy', cat: 'Lakás', variants: 3, build: bedDouble, collider: { hx: 0.82, hz: 1.06, h: 0.6 }, desc: '160 × 200 cm, magas fejtámla, két párna.', use: 'A szülők szobája, a testvér szobája' },
  { id: 'desk', name: 'Íróasztal', cat: 'Lakás', variants: 2, build: desk, collider: { hx: 0.6, hz: 0.3, h: 0.8 }, desc: 'Fiókos íróasztal; az 1. változaton monitor, billentyűzet, egér és lámpa.', use: 'Petyus szobája' },
  { id: 'chair', name: 'Szék', cat: 'Lakás', variants: 3, build: chair, collider: { hx: 0.21, hz: 0.21, h: 0.5 }, desc: 'Ülésmagasság 45 cm; fa, fehér és piros változat.', use: 'Étkező, íróasztal' },
  { id: 'dining_table', name: 'Étkezőasztal', cat: 'Lakás', variants: 2, build: diningTable, collider: { hx: 0.9, hz: 0.45, h: 0.8 }, desc: '6 személyes asztal megterítve: tányérok, bögrék, kenyereskosár.', use: 'Konyha–étkező' },
  { id: 'wardrobe', name: 'Szekrény', cat: 'Lakás', variants: 2, build: wardrobe, collider: { hx: 0.5, hz: 0.3, h: 2.1 }, desc: 'Kétajtós ruhásszekrény (100 cm); hosszában nyújtva gardróbsor.', use: 'Szobák' },
  { id: 'dresser', name: 'Komód', cat: 'Lakás', variants: 2, build: dresser, collider: { hx: 0.6, hz: 0.25, h: 0.9 }, desc: 'Háromfiókos komód; az 1. változaton virág és könyv.', use: 'A testvér szobája, nappali' },
  { id: 'kitchen_unit', name: 'Konyhaszekrény', cat: 'Lakás', variants: 4, build: kitchenUnit, collider: { hx: 0.5, hz: 0.3, h: 0.95 }, desc: '1 m-es elem munkalappal: 1 ajtós, 2 mosogató csappal, 3 főzőlap lábassal, 4 fiókos.', use: 'Konyha, az északi ablakok alatt' },
  { id: 'fridge', name: 'Hűtő', cat: 'Lakás', variants: 1, build: fridge, collider: { hx: 0.3, hz: 0.32, h: 1.85 }, desc: 'Kombinált hűtő hűtőmágnesekkel.', use: 'Konyha' },
  { id: 'fridge_wide', name: 'Széles hűtő', cat: 'Lakás', variants: 1, build: fridgeWide, collider: { hx: 0.45, hz: 0.33, h: 1.85 }, desc: 'Kétajtós (side-by-side) hűtő vízadagolóval, hűtőmágnesekkel, egy rajzzal.', use: 'Konyha, a nyugati falon' },
  { id: 'coffee_maker', name: 'Kávéfőző', cat: 'Lakás', variants: 1, build: coffeeMaker, collider: null, desc: 'Kis presszógép csészével – apa reggeli kávéja.', use: 'Konyhapult' },
  { id: 'bathtub', name: 'Kád', cat: 'Lakás', variants: 1, build: bathtub, collider: { hx: 0.85, hz: 0.38, h: 0.6 }, desc: 'Kád vízzel, csapteleppel és gumikacsával a peremén.', use: 'Fürdőszoba' },
  { id: 'bath_sink', name: 'Mosdó tükörrel', cat: 'Lakás', variants: 1, build: bathSink, collider: { hx: 0.33, hz: 0.24, h: 0.9 }, desc: 'Mosdószekrény, csap, fogmosó pohár, tükör a falon.', use: 'Fürdőszoba (reggeli fogmosás)' },
  { id: 'washing_machine', name: 'Mosógép', cat: 'Lakás', variants: 1, build: washingMachine, collider: { hx: 0.3, hz: 0.3, h: 0.9 }, desc: 'Elöltöltős mosógép kerek üvegajtóval és kezelőpanellel.', use: 'Fürdőszoba' },
  { id: 'shelf', name: 'Polc', cat: 'Lakás', variants: 1, build: shelf, collider: { hx: 0.4, hz: 0.18, h: 1.4 }, desc: 'Álló fürdőszobapolc törölközőkkel, flakonokkal és szennyeskosárral.', use: 'Fürdőszoba' },
  { id: 'toilet', name: 'WC', cat: 'Lakás', variants: 2, build: toilet, collider: { hx: 0.2, hz: 0.33, h: 0.8 }, desc: 'Finomabb (2,5 cm-es) voxelekből: ívelt csésze vízzel, tartály kétrészes öblítőgombbal, zsanérok. Az 1. változaton lehajtott ülőke és fedél; a 2. változat nélkülük – a játékban az ülőke és a fedél külön, fel- és lehajtható (E).', use: 'WC' },
  { id: 'toilet_paper', name: 'WC-papír-tartó', cat: 'Lakás', variants: 1, build: toiletPaper, collider: null, desc: 'Finom (1,25 cm-es) voxelekből: fali tartó, tekercs papírhengerrel és lelógó, perforált lappal; fölötte polc két álló tartalék tekerccsel.', use: 'WC' },
  { id: 'plunger', name: 'WC-pumpa', cat: 'Lakás', variants: 1, build: plunger, collider: null, desc: 'Piros gumifejű pumpa fa nyéllel, a tartójában.', use: 'WC, a sarokban' },
  { id: 'wall_coat_hanger', name: 'Fali fogas', cat: 'Lakás', variants: 1, build: wallCoatHanger, collider: null, desc: 'Fali fogasléc kalappolccal, rajta öt kabát, sál, kalap és sapka.', use: 'Előszoba' },
  { id: 'shoe_cabinet', name: 'Cipősszekrény', cat: 'Lakás', variants: 1, build: shoeCabinet, collider: { hx: 0.5, hz: 0.18, h: 0.95 }, desc: 'Két billenőajtós cipősszekrény; a tetején kulcsok, pénztárca, tálca, kis növény.', use: 'Előszoba' },
  { id: 'sideboard', name: 'Fiókos szekrény', cat: 'Lakás', variants: 2, build: sideboard, collider: { hx: 0.6, hz: 0.26, h: 1.1 }, desc: 'Fél magas (1,05 m) szekrényelem fiókokkal és két ajtóval; egymás mellé rakva egy egész falat beborít. A tetején váza, könyvek, fénykép, növény.', use: 'A szülők szobája, a testvér szobájának falán' },
  { id: 'nightstand', name: 'Éjjeliszekrény', cat: 'Lakás', variants: 2, build: nightstand, collider: { hx: 0.23, hz: 0.2, h: 0.55 }, desc: 'Fiókos éjjeliszekrény nyitott polccal, rajta asztali lámpa meleg ernyővel; mellette egy pohár víz vagy egy könyv.', use: 'A szülők franciaágya két oldalán' },
  { id: 'bookshelf', name: 'Könyvespolc', cat: 'Lakás', variants: 2, build: bookshelf, collider: { hx: 0.5, hz: 0.16, h: 1.9 }, desc: 'Fehér polc öt deszkával: különböző magas, színes könyvek, egy kis növény, fénykép, dobozok, a tetején földgömb.', use: 'A szülők szobája, a franciaágy mellett' },
  { id: 'sofa', name: 'Kanapé', cat: 'Lakás', variants: 3, build: sofa, collider: { hx: 1.0, hz: 0.45, h: 0.9 }, desc: 'Háromszemélyes kanapé karfákkal és díszpárnákkal.', use: 'A szülők szobája (nappali rész)' },
  { id: 'tv_unit', name: 'TV-szekrény', cat: 'Lakás', variants: 1, build: tvUnit, collider: { hx: 0.8, hz: 0.2, h: 1.3 }, desc: 'Alacsony szekrény lapos tévével.', use: 'Nappali' },
  { id: 'floor_lamp', name: 'Állólámpa', cat: 'Lakás', variants: 1, build: floorLamp, collider: { r: 0.18, h: 1.7 }, desc: 'Kerek talp, vékony szár, vászon ernyő meleg fényű izzóval.', use: 'Nappali' },
  { id: 'rug', name: 'Szőnyeg', cat: 'Lakás', variants: 3, build: rug, collider: null, noShadow: true, desc: 'Kockás szőnyegek; a 3. változat Petyus autós játszószőnyege (út szaggatott vonallal).', use: 'Szobák' },
  { id: 'coat_rack', name: 'Fogas', cat: 'Lakás', variants: 1, build: coatRack, collider: { r: 0.2, h: 1.8 }, desc: 'Álló fogas apa dzsekijével, anya kabátjával és Petyus zöld anorákjával.', use: 'Előtér' },
  { id: 'schoolbag', name: 'Iskolatáska', cat: 'Lakás', variants: 1, build: schoolbag, collider: null, desc: 'Kék iskolatáska narancs fedéllel és fényvisszaverőkkel.', use: 'Petyus szobája / előtér' },
  { id: 'shoes', name: 'Cipő', cat: 'Lakás', variants: 3, build: shoes, collider: null, noShadow: true, desc: 'Egy pár cipő: piros (Petyus), fekete (apa), fehér (anya).', use: 'Előtér' },
  { id: 'radiator', name: 'Radiátor', cat: 'Lakás', variants: 1, build: radiator, collider: { hx: 0.45, hz: 0.06, h: 0.7 }, desc: 'Bordás lapradiátor az ablak alatt.', use: 'Szobák, konyha' },
  { id: 'trampoline', name: 'Trambulin', cat: 'Lakás', variants: 1, build: trampoline, collider: { r: 1.55, h: 2.1 }, desc: '3 m átmérőjű trambulin kék párnázással és védőhálóval.', use: 'A ház mögött, az északi füves részen' },
  { id: 'house_plant', name: 'Szobanövény', cat: 'Lakás', variants: 7, build: housePlant, collider: { r: 0.25, h: 1.0 }, desc: '1 monstera, 2 fikusz (fa), 3 anyósnyelv, 4 páfrány, 5 kaktusz és pozsgás, 6 flamingóvirág, 7 csüngő futóka (polcra).', use: 'A szülők szobája, a keleti ablak alatt' },
  { id: 'plant_shelf', name: 'Virágpolc', cat: 'Lakás', variants: 1, build: plantShelf, collider: { hx: 0.8, hz: 0.18, h: 0.5 }, desc: 'Alacsony fehér virágtartó pad alsó polccal.', use: 'A szülők szobája, a keleti ablak alatt' },
  { id: 'bougainvillea', name: 'Bougainvillea', cat: 'Lakás', variants: 5, build: bougainvillea, collider: { r: 0.22, h: 1.0 }, desc: 'Cserepes bougainvillea: fás szárak, sűrű lomb apró zöld levelekkel és papírvékony színes murvalevelekkel, a cserép peremén átlógó virágos ágak. Színek: bíbor, rózsaszín, lila, narancs, fehér-rózsaszín.', use: 'Petyus erkélye' },
  { id: 'potted_plant', name: 'Cserepes növény', cat: 'Lakás', variants: 1, build: pottedPlant, collider: { r: 0.18, h: 0.9 }, desc: 'Terrakotta cserép dús lombbal.', use: 'Szobák, erkély' },
];
