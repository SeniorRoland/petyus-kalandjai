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
  // breakfast on the table: plates, mugs, a basket of bread
  for (const x of [-0.5, 0.0, 0.5]) { bx(g, x - 0.1, 0.77, -0.3, x + 0.1, 0.78, -0.1, C.white); bx(g, x - 0.1, 0.77, 0.1, x + 0.1, 0.78, 0.3, C.white); }
  bx(g, 0.62, 0.77, -0.05, 0.7, 0.87, 0.03, 0xd9534f); bx(g, -0.72, 0.77, -0.05, -0.64, 0.87, 0.03, 0x4f8fd6);
  bx(g, -0.15, 0.77, -0.06, 0.15, 0.85, 0.06, 0xb07a45); bx(g, -0.12, 0.85, -0.04, 0.12, 0.88, 0.04, 0xe0b070);
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
function toilet(seed) {   // tank at −z
  const g = grid(seed);
  bx(g, -0.16, 0, -0.12, 0.16, 0.38, 0.28, C.white);
  bx(g, -0.19, 0.38, -0.14, 0.19, 0.42, 0.32, C.white2);
  bx(g, -0.21, 0.35, -0.34, 0.21, 0.8, -0.14, C.white);
  bx(g, -0.05, 0.8, -0.27, 0.05, 0.82, -0.2, C.chrome);
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

export const HOME_CATALOG = [
  { id: 'bed_single', name: 'Egyszemélyes ágy', cat: 'Lakás', variants: 3, build: bedSingle, collider: { hx: 0.47, hz: 1.05, h: 0.6 }, desc: 'Fa keret, csíkos paplan, párna. Az 1. változaton plüssmaci.', use: 'Petyus szobája' },
  { id: 'bed_double', name: 'Franciaágy', cat: 'Lakás', variants: 3, build: bedDouble, collider: { hx: 0.82, hz: 1.06, h: 0.6 }, desc: '160 × 200 cm, magas fejtámla, két párna.', use: 'A szülők szobája, a testvér szobája' },
  { id: 'desk', name: 'Íróasztal', cat: 'Lakás', variants: 2, build: desk, collider: { hx: 0.6, hz: 0.3, h: 0.8 }, desc: 'Fiókos íróasztal; az 1. változaton monitor, billentyűzet, egér és lámpa.', use: 'Petyus szobája' },
  { id: 'chair', name: 'Szék', cat: 'Lakás', variants: 3, build: chair, collider: { hx: 0.21, hz: 0.21, h: 0.5 }, desc: 'Ülésmagasság 45 cm; fa, fehér és piros változat.', use: 'Étkező, íróasztal' },
  { id: 'dining_table', name: 'Étkezőasztal', cat: 'Lakás', variants: 1, build: diningTable, collider: { hx: 0.9, hz: 0.45, h: 0.8 }, desc: '6 személyes asztal megterítve: tányérok, bögrék, kenyereskosár.', use: 'Konyha–étkező' },
  { id: 'wardrobe', name: 'Szekrény', cat: 'Lakás', variants: 2, build: wardrobe, collider: { hx: 0.5, hz: 0.3, h: 2.1 }, desc: 'Kétajtós ruhásszekrény (100 cm); hosszában nyújtva gardróbsor.', use: 'Szobák' },
  { id: 'dresser', name: 'Komód', cat: 'Lakás', variants: 2, build: dresser, collider: { hx: 0.6, hz: 0.25, h: 0.9 }, desc: 'Háromfiókos komód; az 1. változaton virág és könyv.', use: 'A testvér szobája, nappali' },
  { id: 'kitchen_unit', name: 'Konyhaszekrény', cat: 'Lakás', variants: 4, build: kitchenUnit, collider: { hx: 0.5, hz: 0.3, h: 0.95 }, desc: '1 m-es elem munkalappal: 1 ajtós, 2 mosogató csappal, 3 főzőlap lábassal, 4 fiókos.', use: 'Konyha, az északi ablakok alatt' },
  { id: 'fridge', name: 'Hűtő', cat: 'Lakás', variants: 1, build: fridge, collider: { hx: 0.3, hz: 0.32, h: 1.85 }, desc: 'Kombinált hűtő hűtőmágnesekkel.', use: 'Konyha' },
  { id: 'coffee_maker', name: 'Kávéfőző', cat: 'Lakás', variants: 1, build: coffeeMaker, collider: null, desc: 'Kis presszógép csészével – apa reggeli kávéja.', use: 'Konyhapult' },
  { id: 'bathtub', name: 'Kád', cat: 'Lakás', variants: 1, build: bathtub, collider: { hx: 0.85, hz: 0.38, h: 0.6 }, desc: 'Kád vízzel, csapteleppel és gumikacsával a peremén.', use: 'Fürdőszoba' },
  { id: 'bath_sink', name: 'Mosdó tükörrel', cat: 'Lakás', variants: 1, build: bathSink, collider: { hx: 0.33, hz: 0.24, h: 0.9 }, desc: 'Mosdószekrény, csap, fogmosó pohár, tükör a falon.', use: 'Fürdőszoba (reggeli fogmosás)' },
  { id: 'washing_machine', name: 'Mosógép', cat: 'Lakás', variants: 1, build: washingMachine, collider: { hx: 0.3, hz: 0.3, h: 0.9 }, desc: 'Elöltöltős mosógép kerek üvegajtóval és kezelőpanellel.', use: 'Fürdőszoba' },
  { id: 'shelf', name: 'Polc', cat: 'Lakás', variants: 1, build: shelf, collider: { hx: 0.4, hz: 0.18, h: 1.4 }, desc: 'Álló fürdőszobapolc törölközőkkel, flakonokkal és szennyeskosárral.', use: 'Fürdőszoba' },
  { id: 'toilet', name: 'WC', cat: 'Lakás', variants: 1, build: toilet, collider: { hx: 0.2, hz: 0.33, h: 0.8 }, desc: 'Álló WC tartállyal és öblítőgombbal.', use: 'WC' },
  { id: 'sofa', name: 'Kanapé', cat: 'Lakás', variants: 3, build: sofa, collider: { hx: 1.0, hz: 0.45, h: 0.9 }, desc: 'Háromszemélyes kanapé karfákkal és díszpárnákkal.', use: 'A szülők szobája (nappali rész)' },
  { id: 'tv_unit', name: 'TV-szekrény', cat: 'Lakás', variants: 1, build: tvUnit, collider: { hx: 0.8, hz: 0.2, h: 1.3 }, desc: 'Alacsony szekrény lapos tévével.', use: 'Nappali' },
  { id: 'floor_lamp', name: 'Állólámpa', cat: 'Lakás', variants: 1, build: floorLamp, collider: { r: 0.18, h: 1.7 }, desc: 'Kerek talp, vékony szár, vászon ernyő meleg fényű izzóval.', use: 'Nappali' },
  { id: 'rug', name: 'Szőnyeg', cat: 'Lakás', variants: 3, build: rug, collider: null, noShadow: true, desc: 'Kockás szőnyegek; a 3. változat Petyus autós játszószőnyege (út szaggatott vonallal).', use: 'Szobák' },
  { id: 'coat_rack', name: 'Fogas', cat: 'Lakás', variants: 1, build: coatRack, collider: { r: 0.2, h: 1.8 }, desc: 'Álló fogas apa dzsekijével, anya kabátjával és Petyus zöld anorákjával.', use: 'Előtér' },
  { id: 'schoolbag', name: 'Iskolatáska', cat: 'Lakás', variants: 1, build: schoolbag, collider: null, desc: 'Kék iskolatáska narancs fedéllel és fényvisszaverőkkel.', use: 'Petyus szobája / előtér' },
  { id: 'shoes', name: 'Cipő', cat: 'Lakás', variants: 3, build: shoes, collider: null, noShadow: true, desc: 'Egy pár cipő: piros (Petyus), fekete (apa), fehér (anya).', use: 'Előtér' },
  { id: 'radiator', name: 'Radiátor', cat: 'Lakás', variants: 1, build: radiator, collider: { hx: 0.45, hz: 0.06, h: 0.7 }, desc: 'Bordás lapradiátor az ablak alatt.', use: 'Szobák, konyha' },
  { id: 'potted_plant', name: 'Cserepes növény', cat: 'Lakás', variants: 1, build: pottedPlant, collider: { r: 0.18, h: 0.9 }, desc: 'Terrakotta cserép dús lombbal.', use: 'Szobák, erkély' },
];
