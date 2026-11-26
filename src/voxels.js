// =====================================================================
//  Petyus kalandjai – voxel objektumkönyvtár
//  Minden beépített környezeti elem itt van definiálva. A játék (world.js)
//  és a design terv (designterv.html) ugyanezt a modult használja.
// =====================================================================
import * as THREE from 'three';
import { HOME_CATALOG } from './voxels-home.js';

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hash3(i, j, k, seed = 0) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1440662683) + Math.imul(seed, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- palette
export const PAL = {
  bark: 0x6e4a2b, barkDark: 0x553820, barkLight: 0x8a6038,
  leaf: [0x3f8f3a, 0x4a9c42, 0x58ab4c, 0x6cbf58], leafBirch: [0x7dbb40, 0x8cc84b, 0x9fd25a, 0xb3dd6c], pine: [0x24603a, 0x2c6f42, 0x367d4a, 0x418a52],
  birch: 0xeeeee6, birchMark: 0x2b2b2b, apple: 0xd9453a,
  wood: [0xb5793f, 0xa86c35, 0xc0844a], woodDark: 0x7a4a24, metal: 0x2f3a32, steel: 0x9aa3ab,
  binGreen: 0x2f7d4f, binDark: 0x24603d, lid: 0x3a3f44,
  lampDark: 0x2c3136, glass: 0xfff1b0,
  stone: 0xc8c2b6, stone2: 0xbdb6aa, stoneLight: 0xd8d2c6, tile: 0x7fc4e0, tile2: 0x6bb6d6,
  soil: 0x4e3524, frame: 0x8a6a4a, frameDark: 0x6e5238,
  flowers: [0xff4f6d, 0xffd23f, 0xff8c42, 0xc77dff, 0xffffff, 0xff6bcb, 0x5aa9ff], stem: 0x3f8f2e,
  fence: 0x2e6b46, fenceRail: 0x3f8a5a, fenceBar: 0x4c9a68,
  tire: 0x1e1e1e, hub: 0xb8bec4, window: 0x9fc3d9, headlight: 0xfff3b0, taillight: 0xd00000,
  rock: [0x8e8e8a, 0x9c9a94, 0x7f7d78], moss: 0x6b8f3e, red: 0xd62828, brass: 0xc9a227,
};
export const CAR_COLORS = [0xe63946, 0x3a86ff, 0xffbe0b, 0x2a9d8f, 0xf1f1f1, 0x6a4c93];

// ---------------------------------------------------------------- voxel grid
const OFF = 600, DIM = 1200, YOFF = 100;
const key = (i, j, k) => ((i + OFF) * DIM + (j + YOFF)) * DIM + (k + OFF);
// face corners (unit cube) – counter‑clockwise seen from outside
const FACES = [
  { d: [1, 0, 0], n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], sh: 0.92 },
  { d: [-1, 0, 0], n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], sh: 0.92 },
  { d: [0, 1, 0], n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], sh: 1.0 },
  { d: [0, -1, 0], n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sh: 0.7 },
  { d: [0, 0, 1], n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], sh: 0.96 },
  { d: [0, 0, -1], n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], sh: 0.96 },
];
const tmpC = new THREE.Color();

export class VoxelGrid {
  constructor(size, seed = 1) { this.s = size; this.m = new Map(); this.seed = seed; this.r = mulberry32(seed * 9973 + 7); this.tags = new Map(); }
  set(i, j, k, c, tag) { const K = key(i, j, k); if (c == null) { this.m.delete(K); this.tags.delete(K); } else { this.m.set(K, c); if (tag) this.tags.set(K, tag); else this.tags.delete(K); } }
  get(i, j, k) { return this.m.get(key(i, j, k)); }
  has(i, j, k) { return this.m.has(key(i, j, k)); }
  col(c, i, j, k) { return typeof c === 'function' ? c(i, j, k) : c; }
  box(i0, j0, k0, i1, j1, k1, c, tag) {
    for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j++) for (let k = Math.min(k0, k1); k <= Math.max(k0, k1); k++) { const cc = this.col(c, i, j, k); if (cc !== undefined) this.set(i, j, k, cc, tag); }
  }
  ellipsoid(cx, cy, cz, rx, ry, rz, c, rough = 0, tag) {
    for (let i = Math.floor(cx - rx - 1); i <= Math.ceil(cx + rx + 1); i++) for (let j = Math.floor(cy - ry - 1); j <= Math.ceil(cy + ry + 1); j++) for (let k = Math.floor(cz - rz - 1); k <= Math.ceil(cz + rz + 1); k++) {
      const d = ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 + ((k - cz) / rz) ** 2;
      if (d <= 1 + (hash3(i, j, k, this.seed) - 0.5) * rough && j >= 0) { const cc = this.col(c, i, j, k); if (cc !== undefined) this.set(i, j, k, cc, tag); }
    }
  }
  disc(cx, cz, r, j0, j1, c, inner = -1, tag) {
    const R = Math.ceil(r) + 1;
    for (let i = -R; i <= R; i++) for (let k = -R; k <= R; k++) {
      const d2 = (i + 0) ** 2 + (k + 0) ** 2; if (d2 > r * r + r * 0.6) continue; if (inner >= 0 && d2 < inner * inner + inner * 0.6) continue;
      for (let j = j0; j <= j1; j++) { const cc = this.col(c, cx + i, j, cz + k); if (cc !== undefined) this.set(cx + i, j, cz + k, cc, tag); }
    }
  }
  cylX(i0, i1, cy, cz, r, c) {
    const R = Math.ceil(r) + 1;
    for (let j = -R; j <= R; j++) for (let k = -R; k <= R; k++) { const d2 = (j + 0.5) ** 2 + (k + 0.5) ** 2; if (d2 > r * r) continue; for (let i = i0; i <= i1; i++) this.set(i, cy + j, cz + k, typeof c === 'function' ? c(i, cy + j, cz + k, d2) : c); }
  }
  line(a, b, c, thick = 0, tag) {
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])) * 2) + 1;
    for (let t = 0; t <= n; t++) {
      const x = Math.round(a[0] + (b[0] - a[0]) * t / n), y = Math.round(a[1] + (b[1] - a[1]) * t / n), z = Math.round(a[2] + (b[2] - a[2]) * t / n);
      this.set(x, y, z, this.col(c, x, y, z), tag);
      if (thick) { this.set(x + 1, y, z, this.col(c, x + 1, y, z), tag); this.set(x, y, z + 1, this.col(c, x, y, z + 1), tag); this.set(x + 1, y, z + 1, this.col(c, x + 1, y, z + 1), tag); }
    }
  }
  exposed(K) {
    const k = K % DIM - OFF, t = Math.floor(K / DIM), j = t % DIM - YOFF, i = Math.floor(t / DIM) - OFF;
    return !this.has(i + 1, j, k) || !this.has(i - 1, j, k) || !this.has(i, j + 1, k) || !this.has(i, j, k + 1) || !this.has(i, j, k - 1);
  }
  // recolour a fraction of exposed voxels carrying a tag (apples, flowers, moss …)
  sprinkle(tag, prob, colors) {
    for (const [K, tg] of this.tags) if (tg === tag && this.exposed(K) && this.r() < prob) this.m.set(K, Array.isArray(colors) ? colors[Math.floor(this.r() * colors.length)] : colors);
  }
  get count() { return this.m.size; }
  // builds a BufferGeometry with only the visible faces; x/z centred on voxel 0, y starts at 0
  toGeometry(jit = 0.07) {
    const s = this.s; let faces = 0;
    const list = [];
    for (const [K, c] of this.m) {
      const k = K % DIM - OFF, t = Math.floor(K / DIM), j = t % DIM - YOFF, i = Math.floor(t / DIM) - OFF;
      let mask = 0;
      for (let f = 0; f < 6; f++) { const d = FACES[f].d; if (!this.m.has(key(i + d[0], j + d[1], k + d[2]))) { mask |= 1 << f; faces++; } }
      if (mask) list.push(i, j, k, c, mask);
    }
    const pos = new Float32Array(faces * 18), nor = new Float32Array(faces * 18), col = new Float32Array(faces * 18);
    let p = 0;
    for (let q = 0; q < list.length; q += 5) {
      const i = list[q], j = list[q + 1], k = list[q + 2], c = list[q + 3], mask = list[q + 4];
      tmpC.set(c); const jv = 1 + (hash3(i, j, k, 77) - 0.5) * 2 * jit;
      for (let f = 0; f < 6; f++) {
        if (!(mask & (1 << f))) continue; const F = FACES[f]; const sh = F.sh * jv;
        const r = tmpC.r * sh, g = tmpC.g * sh, b = tmpC.b * sh;
        for (const vi of [0, 1, 2, 0, 2, 3]) {
          const cc = F.c[vi];
          pos[p] = (i - 0.5 + cc[0]) * s; pos[p + 1] = (j + cc[1]) * s; pos[p + 2] = (k - 0.5 + cc[2]) * s;
          nor[p] = F.n[0]; nor[p + 1] = F.n[1]; nor[p + 2] = F.n[2];
          col[p] = r; col[p + 1] = g; col[p + 2] = b; p += 3;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    geo.userData = { voxels: this.m.size, faces, voxelSize: s };
    return geo;
  }
  // the same with merged faces (greedy meshing): neighbouring faces of one colour become one quad –
  // far fewer triangles (the colour jitter is per merged quad, not per voxel)
  toGeometryGreedy(jit = 0.07) {
    const s = this.s, slices = FACES.map(() => new Map()), B = 4096;
    for (const [K, c] of this.m) {
      const k = K % DIM - OFF, t = Math.floor(K / DIM), j = t % DIM - YOFF, i = Math.floor(t / DIM) - OFF, v = [i, j, k];
      for (let f = 0; f < 6; f++) {
        const d = FACES[f].d; if (this.m.has(key(i + d[0], j + d[1], k + d[2]))) continue;
        const a = f >> 1, u = (a + 1) % 3, w = (a + 2) % 3;
        let sl = slices[f].get(v[a]); if (!sl) slices[f].set(v[a], (sl = new Map()));
        sl.set((v[u] + 2000) * B + v[w] + 2000, c);
      }
    }
    const quads = [];
    for (let f = 0; f < 6; f++) {
      const a = f >> 1, u = (a + 1) % 3, w = (a + 2) % 3;
      for (const [sv, sl] of slices[f]) {
        const done = new Set();
        for (const q0 of [...sl.keys()].sort((A, Bq) => A - Bq)) {
          if (done.has(q0)) continue; const c = sl.get(q0);
          let nw = 1; while (sl.get(q0 + nw) === c && !done.has(q0 + nw)) nw++;
          let nu = 1; grow: for (;;) { for (let x = 0; x < nw; x++) { const q = q0 + nu * B + x; if (sl.get(q) !== c || done.has(q)) break grow; } nu++; }
          for (let y = 0; y < nu; y++) for (let x = 0; x < nw; x++) done.add(q0 + y * B + x);
          const o = [0, 0, 0], ext = [1, 1, 1]; o[a] = sv; o[u] = Math.floor(q0 / B) - 2000; o[w] = q0 % B - 2000; ext[u] = nu; ext[w] = nw;
          quads.push(f, o[0], o[1], o[2], ext[0], ext[1], ext[2], c);
        }
      }
    }
    const faces = quads.length / 8, pos = new Float32Array(faces * 18), nor = new Float32Array(faces * 18), col = new Float32Array(faces * 18);
    let p = 0;
    for (let q = 0; q < quads.length; q += 8) {
      const F = FACES[quads[q]], i = quads[q + 1], j = quads[q + 2], k = quads[q + 3], ex = quads[q + 4], ey = quads[q + 5], ez = quads[q + 6];
      tmpC.set(quads[q + 7]); const sh = F.sh * (1 + (hash3(i, j, k, 77) - 0.5) * 2 * jit);
      const r = tmpC.r * sh, g = tmpC.g * sh, b = tmpC.b * sh;
      for (const vi of [0, 1, 2, 0, 2, 3]) {
        const cc = F.c[vi];
        pos[p] = (i - 0.5 + cc[0] * ex) * s; pos[p + 1] = (j + cc[1] * ey) * s; pos[p + 2] = (k - 0.5 + cc[2] * ez) * s;
        nor[p] = F.n[0]; nor[p + 1] = F.n[1]; nor[p + 2] = F.n[2];
        col[p] = r; col[p + 1] = g; col[p + 2] = b; p += 3;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    geo.userData = { voxels: this.m.size, faces, voxelSize: s };
    return geo;
  }
  palette(n = 8) {
    const cnt = new Map(); for (const c of this.m.values()) cnt.set(c, (cnt.get(c) || 0) + 1);
    return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
  }
}

// ---------------------------------------------------------------- builders
const pickH = (arr, h) => arr[Math.floor(h * arr.length) % arr.length];

function oak(seed) {
  const g = new VoxelGrid(0.15, seed), r = g.r;
  const H = 12 + Math.floor(r() * 3);
  for (let j = 0; j <= H; j++) for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) {
    if (Math.abs(i) === 1 && Math.abs(k) === 1 && j > 1) continue;
    g.set(i, j, k, hash3(i, j, k, seed) < 0.3 ? PAL.barkDark : (hash3(j, i, k, 3) < 0.15 ? PAL.barkLight : PAL.bark));
  }
  for (const [i, k] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { g.set(i, 0, k, PAL.barkDark); if (r() < 0.6) g.set(i, 1, k, PAL.bark); }
  const top = H + 7;
  const leafC = (i, j, k) => { const h = hash3(i, j, k, seed + 5); const up = (j - (H + 1)) / 10; return PAL.leaf[clamp(Math.floor(up * 2 + h * 1.6), 0, 3)]; };
  const blobs = [[0, top, 0, 7 + r(), 5.2 + r(), 7 + r()]];
  const n = 4 + Math.floor(r() * 2);
  for (let b = 0; b < n; b++) {
    const a = b / n * Math.PI * 2 + r() * 0.8, dist = 4.2 + r() * 2.2, h = H + 4 + r() * 5;
    const bx = Math.cos(a) * dist, bz = Math.sin(a) * dist;
    g.line([0, H - 2, 0], [Math.round(bx * 0.75), Math.round(h - 1), Math.round(bz * 0.75)], PAL.bark);
    blobs.push([bx, h, bz, 4.2 + r() * 2, 3.4 + r() * 1.6, 4.2 + r() * 2]);
  }
  for (const b of blobs) g.ellipsoid(b[0], b[1], b[2], b[3], b[4], b[5], leafC, 0.45, 'leaf');
  if (seed % 2 === 0) g.sprinkle('leaf', 0.025, PAL.apple);
  return g;
}
function pine(seed) {
  const g = new VoxelGrid(0.15, seed), r = g.r;
  for (let j = 0; j <= 7; j++) g.box(-1, j, 0, 1, j, 0, PAL.barkDark), g.box(0, j, -1, 0, j, 1, PAL.bark);
  const tiers = 7, R0 = 8 + r() * 1.4;
  for (let t = 0; t < tiers; t++) {
    const base = 4 + Math.round(t * 3), R = Math.max(1.4, R0 - t * (R0 - 1.2) / tiers);
    for (let dj = 0; dj < 4; dj++) {
      const rr = R - dj * (R / 3.2); if (rr < 0.6) break;
      const RR = Math.ceil(rr) + 1;
      for (let i = -RR; i <= RR; i++) for (let k = -RR; k <= RR; k++) {
        const d = Math.hypot(i, k); if (d > rr + (hash3(i, base + dj, k, seed) - 0.5) * 1.6) continue;
        const h = hash3(i, base + dj, k, seed + 9); const shade = dj === 0 ? 0 : clamp(Math.floor(h * 2.5 + dj * 0.5), 0, 3);
        g.set(i, base + dj, k, PAL.pine[shade], 'needle');
      }
    }
  }
  const tipY = 4 + Math.round((tiers - 1) * 3) + 3;
  for (let j = tipY; j < tipY + 3; j++) g.set(0, j, 0, PAL.pine[3]);
  g.sprinkle('needle', 0.012, 0x7a4a24);
  return g;
}
function birch(seed) {
  const g = new VoxelGrid(0.15, seed), r = g.r; const H = 17 + Math.floor(r() * 4);
  for (let j = 0; j <= H; j++) for (let i = 0; i <= 1; i++) for (let k = 0; k <= 1; k++) g.set(i, j, k, hash3(i, j, k, seed) < 0.16 ? PAL.birchMark : PAL.birch);
  const leafC = (i, j, k) => pickH(PAL.leafBirch, hash3(i, j, k, seed + 2) * 0.8 + (j - H) / 30);
  const blobs = [[0.5, H + 4, 0.5, 4.4, 6.4, 4.4]];
  for (let b = 0; b < 4; b++) { const a = r() * Math.PI * 2, d = 2.5 + r() * 2, h = H - 2 + r() * 6; blobs.push([Math.cos(a) * d, h, Math.sin(a) * d, 3 + r(), 4 + r(), 3 + r()]); g.line([0, H - 4 + Math.round(r() * 3), 0], [Math.round(Math.cos(a) * d * 0.7), Math.round(h - 1), Math.round(Math.sin(a) * d * 0.7)], PAL.birch); }
  for (const b of blobs) g.ellipsoid(b[0], b[1], b[2], b[3], b[4], b[5], leafC, 0.7, 'leaf');
  return g;
}
function bush(seed) {
  const g = new VoxelGrid(0.1, seed), r = g.r;
  const leafC = (i, j, k) => PAL.leaf[clamp(Math.floor(hash3(i, j, k, seed) * 2 + j / 6), 0, 3)];
  g.ellipsoid(0, 4, 0, 6 + r() * 1.5, 4.5, 5.5 + r(), leafC, 0.4, 'leaf');
  for (let b = 0; b < 2; b++) { const a = r() * 6.28; g.ellipsoid(Math.cos(a) * 3, 3 + r() * 2, Math.sin(a) * 3, 3.5 + r(), 3.5, 3.5 + r(), leafC, 0.4, 'leaf'); }
  if (seed % 2 === 1) g.sprinkle('leaf', 0.07, [0xff6b8b, 0xffffff, 0xffd23f]);
  return g;
}
function flowerBed(seed, w = 1.6, d = 1.6) {
  const g = new VoxelGrid(0.08, seed), r = g.r;
  const W = Math.round(w / 0.08 / 2), D = Math.round(d / 0.08 / 2);
  for (let i = -W; i <= W; i++) for (let k = -D; k <= D; k++) {
    const edge = Math.abs(i) >= W - 1 || Math.abs(k) >= D - 1;
    if (edge) { for (let j = 0; j <= 2; j++) g.set(i, j, k, ((Math.abs(i) + Math.abs(k)) % 7 === 0 || j === 2 && (i + k) % 2 === 0) ? PAL.frameDark : PAL.frame); }
    else { g.set(i, 0, k, PAL.soil); g.set(i, 1, k, hash3(i, 1, k, seed) < 0.2 ? 0x5e4330 : PAL.soil); }
  }
  const F = PAL.flowers, c1 = F[(seed * 3) % F.length], c2 = F[(seed * 5 + 2) % F.length];
  for (let i = -W + 3; i <= W - 3; i += 3) for (let k = -D + 3; k <= D - 3; k += 3) {
    const h = 2 + Math.floor(hash3(i, 0, k, seed) * 3), top = 2 + h;
    for (let j = 2; j < top; j++) g.set(i, j, k, PAL.stem);
    if (hash3(k, 1, i, seed) < 0.5) g.set(i + 1, 3, k, 0x4fa046);
    const bc = ((i + k) / 3) % 2 === 0 ? c1 : c2;
    g.set(i, top, k, hash3(i, 2, k, seed) < 0.5 ? 0xffd23f : 0xffffff);
    g.set(i + 1, top, k, bc); g.set(i - 1, top, k, bc); g.set(i, top, k + 1, bc); g.set(i, top, k - 1, bc); g.set(i, top + 1, k, bc);
  }
  return g;
}
function bench(seed) {
  const g = new VoxelGrid(0.05, seed);
  const kUp = (j) => -4 - Math.floor((j - 8) / 5);
  for (const fx of [[-19, -18], [17, 18]]) for (const i of fx) {
    for (let j = 0; j <= 7; j++) { g.set(i, j, 4, PAL.metal); g.set(i, j, -4, PAL.metal); }
    for (let k = -4; k <= 4; k++) g.set(i, 7, k, PAL.metal);
    for (let j = 8; j <= 18; j++) g.set(i, j, kUp(j), PAL.metal);
    for (const k of [3, 4, 5, -5, -4, -3]) g.set(i, 0, k, PAL.metal);
    for (let k = -4; k <= 3; k++) g.set(i, 12, k, PAL.metal);
    for (let j = 8; j <= 11; j++) g.set(i, j, 3, PAL.metal);
  }
  const slats = [[-4, -3], [-1, 0], [2, 3], [4, 5]];
  slats.forEach(([k0, k1], n) => { const base = PAL.wood[(n + seed) % 3]; g.box(-22, 8, k0, 21, 8, k1, (i) => (Math.abs(i) >= 21 ? PAL.woodDark : base)); });
  for (const [j0, n] of [[10, 0], [13, 1], [16, 2]]) { const base = PAL.wood[(n + seed + 1) % 3]; for (let j = j0; j <= j0 + 1; j++) g.box(-22, j, kUp(j), 21, j, kUp(j), (i) => (Math.abs(i) >= 21 ? PAL.woodDark : base)); }
  return g;
}
function bin(seed) {
  const g = new VoxelGrid(0.05, seed);
  g.disc(0, 0, 4.4, 0, 13, (i, j, k) => (j === 0 ? PAL.binDark : (Math.floor((Math.atan2(k, i) + Math.PI) / (Math.PI / 6)) % 2 ? PAL.binDark : PAL.binGreen)));
  g.disc(0, 0, 3.2, 2, 13, null); // hollow
  for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= 11) g.set(i, 11, k, 0x1d1d1d);
  g.disc(0, 0, 5, 13, 14, PAL.lid, 3.6);
  g.box(-1, 7, 5, 1, 9, 5, 0xf0f0f0); g.set(0, 8, 5, 0x2f7d4f);
  return g;
}
function lamp(seed) {
  const g = new VoxelGrid(0.05, seed); const D = PAL.lampDark;
  g.disc(0, 0, 3.4, 0, 1, D); g.disc(0, 0, 2.4, 2, 5, D);
  g.disc(0, 0, 1, 6, 55, D); g.disc(0, 0, 2, 28, 29, 0x3c4248); g.disc(0, 0, 2.2, 53, 56, D);
  g.box(-3, 57, -3, 3, 58, 3, D);
  g.box(-2, 59, -2, 2, 66, 2, (i, j, k) => (Math.abs(i) === 2 && Math.abs(k) === 2 ? D : PAL.glass));
  g.box(-3, 67, -3, 3, 67, 3, D); g.box(-2, 68, -2, 2, 68, 2, D); g.box(-1, 69, -1, 1, 69, 1, D); g.box(0, 70, 0, 0, 72, 0, D);
  return g;
}
function fountain(seed) {
  const g = new VoxelGrid(0.1, seed);
  const block = (i, j, k) => (Math.floor((Math.atan2(k, i) + Math.PI) / (Math.PI / 14)) % 2 ? PAL.stone : PAL.stone2);
  g.disc(0, 0, 26, 0, 5, block, 22); g.disc(0, 0, 26.6, 6, 6, PAL.stoneLight, 21.4);
  g.disc(0, 0, 22, 0, 0, (i, j, k) => ((i + k) & 1 ? PAL.tile : PAL.tile2));
  g.disc(0, 0, 3.5, 1, 13, (i, j, k) => (j % 4 === 0 ? PAL.stoneLight : PAL.stone2));
  g.disc(0, 0, 9, 13, 14, PAL.stone); g.disc(0, 0, 9, 15, 15, PAL.stoneLight, 7.5);
  g.disc(0, 0, 2, 15, 20, PAL.stone2);
  g.disc(0, 0, 4.5, 20, 20, PAL.stone); g.disc(0, 0, 4.5, 21, 21, PAL.stoneLight, 3.5);
  g.disc(0, 0, 1, 21, 24, PAL.stoneLight);
  return g;
}
function fenceSeg(seed) {
  const g = new VoxelGrid(0.05, seed);
  g.box(0, 0, -1, 2, 21, 1, PAL.fence); g.box(-1, 22, -2, 3, 22, 2, PAL.fence);
  g.box(3, 7, 0, 29, 7, 0, PAL.fenceRail); g.box(3, 19, 0, 29, 19, 0, PAL.fenceRail);
  for (let i = 6; i <= 29; i += 4) { g.box(i, 8, 0, i, 18, 0, PAL.fenceBar); g.set(i, 20, 0, PAL.fenceBar); }
  return g;
}
function fencePost(seed) { const g = new VoxelGrid(0.05, seed); g.box(-1, 0, -1, 1, 21, 1, PAL.fence); g.box(-2, 22, -2, 2, 22, 2, PAL.fence); return g; }
function car(seed, color) {
  const g = new VoxelGrid(0.1, seed); const C = color ?? CAR_COLORS[seed % CAR_COLORS.length];
  const dark = new THREE.Color(C).multiplyScalar(0.7).getHex();
  for (let i = -8; i <= 8; i++) for (let k = -18; k <= 17; k++) for (let j = 2; j <= 6; j++) {
    if (Math.abs(i) === 8 && (k <= -17 || k >= 16)) continue;
    if (j === 6 && (k > 10 || k < -14) && Math.abs(i) === 8) continue;
    g.set(i, j, k, j === 4 && Math.abs(i) === 8 ? dark : C);
  }
  for (let i = -7; i <= 7; i++) for (let k = -10; k <= 7; k++) for (let j = 7; j <= 12; j++) {
    const side = Math.abs(i) === 7, front = k === 7, rear = k === -10, pillar = k === -10 || k === 7 || k === -2;
    if (j === 12) { g.set(i, j, k, C); continue; }
    if (!(side || front || rear)) continue;
    g.set(i, j, k, (side && !pillar && j >= 8) || ((front || rear) && Math.abs(i) < 6 && j >= 8) ? PAL.window : C);
  }
  for (const wk of [-11, 11]) for (const s of [-1, 1]) g.cylX(s > 0 ? 7 : -9, s > 0 ? 9 : -7, 3, wk, 2.6, (i, j, k, d2) => (d2 < 1.2 ? PAL.hub : PAL.tire));
  g.box(-8, 2, 18, 8, 3, 18, 0x3a3a3a); g.box(-8, 2, -19, 8, 3, -19, 0x3a3a3a);
  g.box(-2, 3, 19, 2, 3, 19, 0xffffff); g.box(-2, 3, -20, 2, 3, -20, 0xffffff);
  for (const s of [-1, 1]) { g.box(s * 5, 4, 17, s * 7, 5, 17, PAL.headlight); g.box(s * 5, 4, -18, s * 7, 5, -18, PAL.taillight); g.set(s * 9, 9, 6, C); g.set(s * 9, 8, 6, 0x222222); }
  return g;
}
function rock(seed) {
  const g = new VoxelGrid(0.1, seed), r = g.r;
  const rc = (i, j, k) => (j >= 3 && hash3(i, j, k, seed) < 0.35 ? PAL.moss : pickH(PAL.rock, hash3(i, j, k, seed + 1)));
  g.ellipsoid(0, 1, 0, 4 + r() * 2, 3 + r(), 3.5 + r() * 1.5, rc, 0.5);
  if (r() < 0.7) g.ellipsoid(3 + r() * 2, 0.5, 2, 2.2, 2, 2, rc, 0.5);
  return g;
}
function bikeRack(seed) {
  const g = new VoxelGrid(0.05, seed);
  g.box(-20, 0, -1, 20, 0, 1, 0x7d858c);
  for (const x of [-15, -5, 5, 15]) { g.box(x - 3, 1, 0, x - 3, 14, 0, PAL.steel); g.box(x + 3, 1, 0, x + 3, 14, 0, PAL.steel); g.box(x - 2, 15, 0, x + 2, 15, 0, PAL.steel); }
  return g;
}
function drinkFountain(seed) {
  const g = new VoxelGrid(0.05, seed);
  g.box(-3, 0, -3, 3, 17, 3, (i, j) => (j % 5 === 0 ? PAL.stoneLight : PAL.stone2));
  g.box(-5, 18, -5, 5, 19, 5, PAL.stone); g.box(-4, 19, -4, 4, 19, 4, null); g.box(-4, 18, -4, 4, 18, 4, 0x8fc9e6);
  g.box(0, 20, -1, 0, 22, -1, PAL.brass); g.set(0, 22, 0, PAL.brass); g.box(-1, 12, 4, 1, 13, 4, PAL.brass);
  return g;
}
function hydrant(seed) {
  const g = new VoxelGrid(0.05, seed);
  g.disc(0, 0, 3.6, 0, 1, 0xa61e1e); g.disc(0, 0, 2.8, 2, 12, PAL.red); g.disc(0, 0, 3.2, 9, 9, 0xa61e1e);
  g.disc(0, 0, 2.2, 13, 13, PAL.red); g.disc(0, 0, 1.4, 14, 14, PAL.red); g.set(0, 15, 0, 0xe0e0e0);
  g.box(3, 7, -1, 4, 8, 0, 0xe0e0e0); g.box(-4, 7, -1, -3, 8, 0, 0xe0e0e0); g.box(-1, 6, 3, 0, 8, 4, 0xe0e0e0);
  return g;
}
function picnicTable(seed) {
  const g = new VoxelGrid(0.05, seed); const w = PAL.wood[seed % 3];
  g.box(-18, 14, -8, 18, 15, 8, (i, j, k) => (k % 4 === 0 ? PAL.woodDark : w));
  for (const s of [-1, 1]) { g.box(-18, 8, s * 10, 18, 8, s * 13, w); for (const x of [-14, 14]) { g.line([x, 0, s * 13], [x, 13, s * 2], PAL.woodDark); g.line([x, 7, -13], [x, 7, 13], PAL.woodDark); } }
  return g;
}
function grassTuft(seed) {
  const g = new VoxelGrid(0.05, seed), r = g.r; const n = 5 + Math.floor(r() * 5);
  for (let b = 0; b < n; b++) { const i = Math.floor(r() * 5) - 2, k = Math.floor(r() * 5) - 2, h = 2 + Math.floor(r() * 4); for (let j = 0; j < h; j++) g.set(i, j, k, [0x4f9a3a, 0x5aa846, 0x6cb84f][(b + j) % 3]); }
  return g;
}
function wildFlower(seed) {
  const g = new VoxelGrid(0.05, seed), r = g.r; const c = PAL.flowers[seed % PAL.flowers.length];
  for (let f = 0; f < 3; f++) { const i = Math.floor(r() * 5) - 2, k = Math.floor(r() * 5) - 2, h = 3 + Math.floor(r() * 3); for (let j = 0; j < h; j++) g.set(i, j, k, PAL.stem); g.set(i, h, k, 0xffd23f); g.set(i + 1, h, k, c); g.set(i - 1, h, k, c); g.set(i, h, k + 1, c); g.set(i, h, k - 1, c); }
  return g;
}

// ---------------------------------------------------------------- catalogue
// collider: circle {r,h} or box {hx,hz,h} (in local, un-rotated metres)
export const CATALOG = [
  { id: 'oak', name: 'Lombos fa', cat: 'Növények', variants: 4, build: oak, collider: { r: 0.25, h: 3 }, desc: 'Vastag, 3 voxel széles törzs gyökérfelfutással, 4–5 ág, egymásba olvadó lombgömbök. A páros változatokon alma van.', use: 'Park, utcák mentén' },
  { id: 'pine', name: 'Fenyő', cat: 'Növények', variants: 4, build: pine, collider: { r: 0.2, h: 3 }, desc: 'Hat szintes, csipkés szélű kúp, alul sötétebb tűlevelekkel és néhány tobozzal.', use: 'Park, épületek körül' },
  { id: 'birch', name: 'Nyírfa', cat: 'Növények', variants: 4, build: birch, collider: { r: 0.18, h: 3 }, desc: 'Karcsú fehér törzs fekete foltokkal, laza, világoszöld lomb.', use: 'Park, pálya mögött' },
  { id: 'bush', name: 'Bokor', cat: 'Növények', variants: 4, build: bush, collider: { r: 0.5, h: 0.8 }, desc: 'Három összenőtt lombgömb. A páratlan változatok virágoznak.', use: 'Pálya széle, ház előtt' },
  { id: 'bed_square', name: 'Virágágyás (négyzet)', cat: 'Növények', variants: 3, build: (s) => flowerBed(s, 1.6, 1.6), collider: { hx: 0.8, hz: 0.8, h: 0.4 }, desc: 'Fa keretes ágyás földdel, sorokba ültetett virágokkal (szár, levél, szirom, porzó).', use: 'Szökőkút körül' },
  { id: 'bed_long', name: 'Virágágyás (hosszú)', cat: 'Növények', variants: 3, build: (s) => flowerBed(s, 2.2, 1.0), collider: { hx: 1.1, hz: 0.5, h: 0.4 }, desc: 'Hosszúkás változat a sétányok mellé.', use: 'Sétányok mellett' },
  { id: 'bed_small', name: 'Virágágyás (kicsi)', cat: 'Növények', variants: 2, build: (s) => flowerBed(s, 1.4, 0.8), collider: { hx: 0.7, hz: 0.4, h: 0.4 }, desc: 'Kis ágyás a társasház bejárata mellett.', use: 'Társasház' },
  { id: 'grass', name: 'Fűcsomó', cat: 'Növények', variants: 6, build: grassTuft, collider: null, noShadow: true, desc: '5–9 eltérő magasságú fűszál, hogy a gyep ne legyen sima.', use: 'Az egész térképen szórva' },
  { id: 'wildflower', name: 'Vadvirág', cat: 'Növények', variants: 7, build: wildFlower, collider: null, noShadow: true, desc: 'Három apró virág szárral, sárga közepű, színes szirmokkal.', use: 'Park gyepe' },
  { id: 'bench', name: 'Pad', cat: 'Utcabútor', variants: 3, build: bench, collider: { hx: 1.1, hz: 0.3, h: 0.9 }, desc: 'Öntöttvas oldalváz karfával, négy ülő- és három háttámla-léc hézagokkal. Ülésmagasság 45 cm.', use: 'Park, a család padja a pályánál' },
  { id: 'bin', name: 'Szemetes', cat: 'Utcabútor', variants: 1, build: bin, collider: { r: 0.26, h: 0.8 }, desc: 'Bordázott, kerek, zöld kuka nyitott tetővel, zsákkal és matricával.', use: 'Padok mellett' },
  { id: 'lamp', name: 'Kandeláber', cat: 'Utcabútor', variants: 1, build: lamp, collider: { r: 0.15, h: 4 }, desc: 'Lépcsős talp, díszgyűrűs oszlop, üvegezett lámpaház tetővel és csúcsdísszel. 3,6 m magas.', use: 'Sétányok, utca' },
  { id: 'picnic', name: 'Piknikasztal', cat: 'Utcabútor', variants: 2, build: picnicTable, collider: { hx: 0.9, hz: 0.7, h: 0.8 }, desc: 'Asztallap két rögzített paddal és X-lábakkal.', use: 'Park nyugati része' },
  { id: 'bikerack', name: 'Kerékpártámasz', cat: 'Utcabútor', variants: 1, build: bikeRack, collider: { hx: 1.0, hz: 0.08, h: 0.8 }, desc: 'Négy fordított U alakú acél kengyel közös talpon.', use: 'Pálya bejárata' },
  { id: 'drink', name: 'Ivókút', cat: 'Utcabútor', variants: 1, build: drinkFountain, collider: { r: 0.25, h: 1.1 }, desc: 'Kő oszlop medencével és réz csappal. Ide jár inni Petyus.', use: 'Pálya kapuja mellett' },
  { id: 'hydrant', name: 'Tűzcsap', cat: 'Utcabútor', variants: 1, build: hydrant, collider: { r: 0.18, h: 0.8 }, desc: 'Piros föld feletti tűzcsap oldalsó csonkokkal.', use: 'Járda' },
  { id: 'fountain', name: 'Szökőkút', cat: 'Park', variants: 1, build: fountain, collider: { r: 2.65, h: 0.65 }, water: [{ r: 2.2, y: 0.42 }, { r: 0.75, y: 1.5 }, { r: 0.35, y: 2.12 }], desc: 'Kőtömbös medence csempézett aljjal, kétszintes tál, középső kifolyó. A víz külön, áttetsző réteg.', use: 'Park közepe' },
  { id: 'rock', name: 'Kő', cat: 'Park', variants: 4, build: rock, collider: { r: 0.4, h: 0.4 }, desc: 'Szabálytalan szikla, a tetején mohával.', use: 'Park, szökőkút környéke' },
  { id: 'fence', name: 'Kerítéselem (1,5 m)', cat: 'Pálya', variants: 1, build: fenceSeg, collider: null, desc: 'Oszlop sapkával, két vízszintes korlát és pálcák. Hosszirányban nyújtva illeszkedik a vonalhoz.', use: 'Focipálya körül' },
  { id: 'fencepost', name: 'Kerítésoszlop', cat: 'Pálya', variants: 1, build: fencePost, collider: null, desc: 'Záróoszlop a kerítésvonal végére.', use: 'Focipálya' },
  { id: 'car', name: 'Személyautó', cat: 'Utca', variants: 6, build: car, collider: null, desc: 'Karosszéria övvonallal, üvegezett utastér oszlopokkal, kerekek agytárcsával, lámpák, lökhárító, rendszám, tükrök.', use: 'Az úton közlekedik' },
];
CATALOG.push(...HOME_CATALOG);   // the flat's furniture (2. rész) – voxels-home.js
const geoCache = new Map();
// greedy: merged faces (far fewer triangles – for the many props of the 2. rész's outdoors)
export function getGeometry(id, variant = 0, greedy = false) {
  const K = id + ':' + variant + (greedy ? ':g' : ''); if (geoCache.has(K)) return geoCache.get(K);
  const def = CATALOG.find((d) => d.id === id); if (!def) throw new Error('Ismeretlen objektum: ' + id);
  const grid = def.build(variant + 1); const geo = greedy ? grid.toGeometryGreedy() : grid.toGeometry();
  geo.userData.palette = grid.palette(10);
  geoCache.set(K, geo); return geo;
}
export const voxelMaterial = () => new THREE.MeshLambertMaterial({ vertexColors: true });
