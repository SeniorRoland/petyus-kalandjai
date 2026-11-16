// Petyus kalandjai – world: A világ: voxel-batch, csempék/talaj, ütközők, épületek, pálya, voxel-kellékek (voxels.js), fák.
import * as THREE from 'three';
import { scene } from './scene.js';
import { R, V3, clamp, distSeg, pick, rand } from './util.js';
import { CATALOG, getGeometry } from './voxels.js';

// ---------------------------------------------------------------- voxel batch (merged boxes)
const BOX_T = (() => { const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); return { p: g.attributes.position.array, n: g.attributes.normal.array }; })();
const tmpCol = new THREE.Color();
class Batch {
  constructor() { this.p = []; this.n = []; this.c = []; }
  box(cx, cy, cz, w, h, d, color, rot = 0, jit = 0.05) {
    tmpCol.set(color); const k = 1 + (rand() - 0.5) * 2 * jit;
    const r = tmpCol.r * k, g = tmpCol.g * k, b = tmpCol.b * k;
    const cs = Math.cos(rot), sn = Math.sin(rot); const P = BOX_T.p, N = BOX_T.n;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i] * w, y = P[i + 1] * h, z = P[i + 2] * d;
      this.p.push(cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs);
      const nx = N[i], ny = N[i + 1], nz = N[i + 2];
      this.n.push(nx * cs + nz * sn, ny, -nx * sn + nz * cs);
      this.c.push(r, g, b);
    }
  }
  bx(cx, y0, cz, w, h, d, color, rot = 0, jit = 0.05) { this.box(cx, y0 + h / 2, cz, w, h, d, color, rot, jit); }
  quad(x0, z0, x1, z1, y, color, jit = 0.04) {
    tmpCol.set(color); const k = 1 + (rand() - 0.5) * 2 * jit;
    const v = [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]];
    for (const [x, z] of v) { this.p.push(x, y, z); this.n.push(0, 1, 0); this.c.push(tmpCol.r * k, tmpCol.g * k, tmpCol.b * k); }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  }
  mesh(cast = true, receive = true, mat = vcMat) {
    const m = new THREE.Mesh(this.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m;
  }
}
export const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
export function partMesh(fn) { const b = new Batch(); fn(b); return b.mesh(true, true); }

// ---------------------------------------------------------------- tiles / ground
export const GX0 = -52, GX1 = 62, GZ0 = -38, GZ1 = 32, GW = GX1 - GX0, GH = GZ1 - GZ0;
const T = { GRASS: 0, PARK: 1, PATH: 2, PITCH: 3, ROAD: 4, SIDEWALK: 5, PLAZA: 6 };
const tiles = new Uint8Array(GW * GH);
function tileAt(x, z) { const i = Math.floor(x) - GX0, j = Math.floor(z) - GZ0; if (i < 0 || j < 0 || i >= GW || j >= GH) return T.GRASS; return tiles[j * GW + i]; }
export function groundH(x, z) { const t = tileAt(x, z); return t === T.PATH ? 0.06 : t === T.SIDEWALK ? 0.12 : t === T.PLAZA ? 0.08 : 0; }

// pitch geometry (x along length)
export const PITCH = { x0: 25.5, x1: 51.5, z0: -8.5, z1: 8.5, cx: 38.5, cz: 0 };
export const FENCE = { x0: 24.1, x1: 52.9, z0: -9.9, z1: 9.9, gate0: 29, gate1: 31, h: 1.1 };
export const GOALS = [{ x: PITCH.x0, dir: -1 }, { x: PITCH.x1, dir: 1 }];
export const GOAL_HW = 1.6, GOAL_H = 1.5, GOAL_D = 1.0;
export const FAMILY_BENCH = { x: 33, z: -12.7, rot: 0 };
export const FOUNTAIN = { x: 0, z: 0, r: 2.6 };
const PARK = { x0: -22, x1: 22, z0: -10, z1: 11 };

const PATHS = [
  [[-31, -17.2], [-18, -6]],
  [[-18, -6], [18, -6]], [[18, -6], [18, 6]], [[18, 6], [-18, 6]], [[-18, 6], [-18, -6]],
  [[-18, 0], [-3.4, 0]], [[3.4, 0], [18, 0]], [[0, -6], [0, -3.4]], [[0, 3.4], [0, 6]],
  [[18, -6], [22.5, -11]], [[22.5, -11], [55, -11]],
  [[18, 6], [22, 13]], [[-18, 6], [-22, 13]],
];
function onPath(x, z) {
  for (const [a, b] of PATHS) if (distSeg(x, z, a[0], a[1], b[0], b[1]) < 1.0) return true;
  const r = Math.hypot(x - FOUNTAIN.x, z - FOUNTAIN.z); if (r > 2.7 && r < 4.3) return true;
  return false;
}
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const x = i + GX0 + 0.5, z = j + GZ0 + 0.5; let t = T.GRASS;
  if (z >= 14 && z < 18) t = T.ROAD;
  else if (z >= 13 && z < 14 || z >= 18 && z < 19) t = T.SIDEWALK;
  else if (x >= 24 && x < 53 && z >= -10 && z < 10) t = T.PITCH;
  else if (x >= -36 && x < -26 && z >= -18 && z < -15) t = T.PLAZA;
  else if (onPath(x, z)) t = T.PATH;
  else if (x >= PARK.x0 && x < PARK.x1 && z >= PARK.z0 && z < PARK.z1) t = T.PARK;
  tiles[j * GW + i] = t;
}

// ---------------------------------------------------------------- colliders
export const colliders = [];
function addBoxCol(x0, z0, x1, z1, h = 5, e = 0.6) { colliders.push({ box: true, e, x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h }); }
export function addCircleCol(x, z, r, h = 5, e = 0.6) { colliders.push({ box: false, x, z, r, h, e }); }
// pushes p (x,z) out of colliders; returns callback normal
export function collide(p, rad, yBottom, onHit) {
  for (const c of colliders) {
    if (yBottom > c.h) continue;
    if (c.box) {
      if (p.x < c.x0 - rad || p.x > c.x1 + rad || p.z < c.z0 - rad || p.z > c.z1 + rad) continue;
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1);
      let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= rad * rad) continue;
      let nx, nz, d = Math.sqrt(d2);
      if (d < 1e-6) {
        const pen = [p.x - c.x0, c.x1 - p.x, p.z - c.z0, c.z1 - p.z]; const m = Math.min(...pen); const k = pen.indexOf(m);
        nx = k === 0 ? -1 : k === 1 ? 1 : 0; nz = k === 2 ? -1 : k === 3 ? 1 : 0;
        if (k < 2) p.x = (k === 0 ? c.x0 : c.x1) + nx * rad; else p.z = (k === 2 ? c.z0 : c.z1) + nz * rad;
      } else { nx = dx / d; nz = dz / d; p.x = cx + nx * rad; p.z = cz + nz * rad; }
      onHit && onHit(nx, nz, c);
    } else {
      const dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz); const m = rad + c.r;
      if (d >= m || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d; p.x = c.x + nx * m; p.z = c.z + nz * m; onHit && onHit(nx, nz, c);
    }
  }
}

// ---------------------------------------------------------------- world building
const world = new Batch();   // casting objects
const ground = new Batch();  // ground tiles (receive only)
export const L = (x, z, rot, lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

function buildGround() {
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = i + GX0, z = j + GZ0, t = tiles[j * GW + i];
    switch (t) {
      case T.GRASS: ground.quad(x, z, x + 1, z + 1, 0, rand() < 0.5 ? 0x86bd5c : 0x7db556, 0.05); break;
      case T.PARK: ground.quad(x, z, x + 1, z + 1, 0, rand() < 0.5 ? 0x74c255 : 0x6bb94e, 0.05); break;
      case T.PITCH: {
        const stripe = Math.floor((x - 24) / 2) % 2 === 0;
        ground.quad(x, z, x + 1, z + 1, 0, stripe ? 0x55ad42 : 0x4b9f3a, 0.02); break;
      }
      case T.ROAD: ground.quad(x, z, x + 1, z + 1, 0, 0x5a5d63, 0.04); break;
      case T.SIDEWALK: ground.bx(x + 0.5, 0, z + 0.5, 1, 0.12, 1, (x + z) % 2 ? 0xcfcac2 : 0xc4bfb6, 0, 0.03); break;
      case T.PATH: ground.bx(x + 0.5, 0, z + 0.5, 1, 0.06, 1, 0xe2c99a, 0, 0.06); break;
      case T.PLAZA: ground.bx(x + 0.5, 0, z + 0.5, 1, 0.08, 1, (x + z) % 2 ? 0xbcb4a6 : 0xaea697, 0, 0.03); break;
    }
    // grass tufts & wild flowers (voxel props)
    if ((t === T.GRASS || t === T.PARK) && rand() < 0.22) place('grass', x + R(0.15, 0.85), 0, z + R(0.15, 0.85), rand() * 6.28, R(0.8, 1.3));
    if (t === T.PARK && rand() < 0.07) place('wildflower', x + R(0.2, 0.8), 0, z + R(0.2, 0.8), rand() * 6.28, R(0.9, 1.2));
  }
  // road dashes
  for (let x = GX0; x < GX1; x += 3) ground.bx(x + 0.75, 0, 16, 1.5, 0.02, 0.15, 0xf2f2f2, 0, 0);
  // zebra crossing near park
  for (let k = 0; k < 6; k++) ground.bx(20, 0, 14.35 + k * 0.65, 2.2, 0.02, 0.35, 0xf2f2f2, 0, 0);
}

// ---------------------------------------------------------------- instanced voxel props (voxels.js)
const DEF = Object.fromEntries(CATALOG.map((d) => [d.id, d]));
const instLists = new Map();
function place(id, x, y, z, rot = 0, s = 1, variant = null, opts = {}) {
  const def = DEF[id]; const v = variant ?? Math.floor(rand() * def.variants);
  const K = id + ':' + v; if (!instLists.has(K)) instLists.set(K, []);
  instLists.get(K).push({ x, y, z, rot, s, sx: opts.sx ?? 1 });
  const c = def.collider;
  if (c && !opts.noCollider) {
    if (c.r !== undefined) addCircleCol(x, z, c.r * s, c.h * s);
    else { const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)); const hx = (cs * c.hx + sn * c.hz) * s, hz = (sn * c.hx + cs * c.hz) * s; addBoxCol(x - hx, z - hz, x + hx, z + hz, c.h * s); }
  }
}
function buildInstances() {
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new V3(), ps = new V3();
  for (const [K, list] of instLists) {
    const [id, v] = K.split(':'); const def = DEF[id];
    const mesh = new THREE.InstancedMesh(getGeometry(id, +v), vcMat, list.length);
    list.forEach((it, n) => { eu.set(0, it.rot, 0); qq.setFromEuler(eu); sc.set(it.s * it.sx, it.s, it.s); ps.set(it.x, it.y, it.z); m4.compose(ps, qq, sc); mesh.setMatrixAt(n, m4); });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    mesh.castShadow = !def.noShadow; mesh.receiveShadow = true; scene.add(mesh);
  }
}
const quarter = () => Math.floor(rand() * 4) * Math.PI / 2;
export const TREES = [];   // { x, z, id, v, s } – e.g. for the cat thrown onto a tree top
function tree(x, z, type = 'round', s = 1) {
  const id = type === 'round' ? 'oak' : type, rot = quarter(), v = Math.floor(rand() * DEF[id].variants);   // same rand() order as before
  place(id, x, 0, z, rot, s, v); TREES.push({ x, z, id, v, s, rot });
}
export function treeTop(t) { const g = getGeometry(t.id, t.v); if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.max.y * t.s; }
function bush(x, z, s = 1) { place('bush', x, 0, z, quarter(), s); }
function flowerBed(x, z, w) { place(w >= 2 ? 'bed_long' : (w >= 1.5 ? 'bed_square' : 'bed_small'), x, groundH(x, z), z, 0, 1); }
function bench(x, z, rot) { place('bench', x, 0, z, rot, 1); }
function bin(x, z) { place('bin', x, 0, z, quarter(), 1); }
function lamp(x, z) { place('lamp', x, groundH(x, z), z, 0, 1); }
const FLOWER_C = [0xff4f6d, 0xffd23f, 0xff8c42, 0xc77dff, 0xffffff, 0xff6bcb];
// façade helper: local (u along the wall, y up, w outward) → world box
function facade(alongX, base, out) {
  return (u, y, w, du, h, dw, c, jit = 0) => alongX ? world.bx(u, y, base + out * w, du, h, dw, c, 0, jit) : world.bx(base + out * w, y, u, dw, h, du, c, 0, jit);
}
function detailedWindow(f, u, y, opts = {}) {
  const ww = opts.w ?? 1.1, wh = opts.h ?? 1.3, F = opts.frame ?? 0xf4f1ea;
  const glass = rand() < 0.12 ? 0xffe59a : (rand() < 0.5 ? 0x5d8fb8 : 0x6a9cc4);
  f(u, y - 0.08, 0.04, ww + 0.2, wh + 0.16, 0.12, F);
  f(u, y, 0.08, ww, wh, 0.1, glass, 0.06);
  f(u, y, 0.12, 0.06, wh, 0.04, F); f(u, y + wh * 0.62, 0.12, ww, 0.06, 0.04, F);
  f(u, y - 0.15, 0.2, ww + 0.3, 0.08, 0.3, 0xe6e0d4);
  if (opts.shutters) for (const s of [-1, 1]) { f(u + s * (ww / 2 + 0.33), y - 0.05, 0.06, 0.42, wh + 0.1, 0.06, opts.shutters); for (let k = 0; k < 5; k++) f(u + s * (ww / 2 + 0.33), y + 0.08 + k * 0.24, 0.1, 0.38, 0.04, 0.03, new THREE.Color(opts.shutters).multiplyScalar(0.8).getHex()); }
  const r = rand();
  if (opts.extras !== false && r < 0.2) { f(u, y - 0.08, 0.26, ww, 0.2, 0.22, 0xa0522d); for (let k = 0; k < 5; k++) { f(u - 0.44 + k * 0.22, y + 0.12, 0.26, 0.05, 0.1, 0.05, 0x3f8f2e); f(u - 0.44 + k * 0.22, y + 0.2, 0.26, 0.14, 0.12, 0.14, pick(FLOWER_C), 0.1); } }
  else if (opts.extras !== false && opts.ac && r < 0.3) { f(u, y - 0.8, 0.22, 0.75, 0.48, 0.36, 0xdedede); f(u, y - 0.75, 0.41, 0.55, 0.36, 0.02, 0x7a7a7a); }
}
function apartment(x0, z0, x1, z1, floors, wallC, accentC, opts = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = floors * 3;
  world.bx(cx, 0, cz, w, H, d, wallC, 0, 0.02);
  world.bx(cx, 0, cz, w + 0.1, 0.5, d + 0.1, 0x9a948a, 0, 0.02);
  for (let f = 1; f < floors; f++) world.bx(cx, f * 3 - 0.1, cz, w + 0.12, 0.2, d + 0.12, accentC, 0, 0.02);
  // roof
  world.bx(cx, H, cz, w + 0.3, 0.3, d + 0.3, 0x8d8d8d, 0, 0.02);
  world.bx(cx, H + 0.3, z0 + 0.15, w + 0.3, 0.4, 0.3, 0x9d9d9d); world.bx(cx, H + 0.3, z1 - 0.15, w + 0.3, 0.4, 0.3, 0x9d9d9d);
  world.bx(x0 + 0.15, H + 0.3, cz, 0.3, 0.4, d, 0x9d9d9d); world.bx(x1 - 0.15, H + 0.3, cz, 0.3, 0.4, d, 0x9d9d9d);
  world.bx(cx + w * 0.2, H + 0.3, cz, 2.4, 2.0, 2.4, 0xb3ada3);
  world.bx(cx - w * 0.25, H + 0.3, cz - d * 0.2, 0.1, 2.5, 0.1, 0x555555, 0, 0);
  world.bx(cx - w * 0.25, H + 2.4, cz - d * 0.2, 1.0, 0.08, 0.08, 0x555555, 0, 0);
  const win = (wx, wy, wz, alongX, out) => detailedWindow(facade(alongX, alongX ? wz : wx, out), alongX ? wx : wz, wy, { ac: true });
  for (let x = x0 + 0.6; x < x1; x += 3) world.bx(x, 0, z1 + 0.03, 0.08, H, 0.06, 0x9a948a, 0, 0); // downpipes / lesenes
  for (let f = 0; f < floors; f++) {
    const y = f * 3 + 1.0;
    for (let x = x0 + 1.6; x < x1 - 1; x += 2.6) {
      if (f === 0 && Math.abs(x - (opts.doorX ?? cx)) < 1.6) continue;
      win(x, y, z1, true, 1); win(x, y, z0, true, -1);
    }
    for (let z = z0 + 1.6; z < z1 - 1; z += 2.6) { win(x1, y, z, false, 1); win(x0, y, z, false, -1); }
    // balconies on the south face
    if (opts.balconies && f > 0) for (let x = x0 + 2.9; x < x1 - 2; x += 5.2) {
      const home = opts.home && f === opts.home.floor && Math.abs(x - opts.home.x) < 2.6;
      world.bx(x, f * 3 - 0.05, z1 + 0.6, 2.6, 0.15, 1.2, 0xd8d3c8, 0, 0.02);
      world.bx(x, f * 3 + 0.1, z1 + 1.17, 2.6, 0.9, 0.06, home ? 0xff9f43 : accentC, 0, 0.03);
      world.bx(x - 1.27, f * 3 + 0.1, z1 + 0.6, 0.06, 0.9, 1.2, home ? 0xff9f43 : accentC, 0, 0.03);
      world.bx(x + 1.27, f * 3 + 0.1, z1 + 0.6, 0.06, 0.9, 1.2, home ? 0xff9f43 : accentC, 0, 0.03);
      if (home) {
        for (let k = 0; k < 4; k++) { world.bx(x - 0.9 + k * 0.6, f * 3 + 1.0, z1 + 1.12, 0.36, 0.25, 0.25, 0xb5653a, 0, 0); world.bx(x - 0.9 + k * 0.6, f * 3 + 1.25, z1 + 1.12, 0.32, 0.22, 0.22, pick([0xff4f6d, 0xffd23f, 0xff6bcb]), 0, 0.1); }
        world.bx(x + 0.9, f * 3 + 0.1, z1 + 0.35, 0.5, 0.5, 0.4, 0x3d8bfd, 0, 0); // little chair
      }
    }
  }
  if (opts.doorX !== undefined) {
    const dx = opts.doorX;
    world.bx(dx, 0, z1 + 0.04, 1.8, 2.4, 0.12, 0x6b4226, 0, 0.02);
    world.bx(dx, 0.1, z1 + 0.1, 1.4, 2.0, 0.08, 0x8ec5e8, 0, 0.02);
    world.bx(dx, 2.6, z1 + 0.9, 2.8, 0.15, 1.8, 0x7d7d7d, 0, 0);
    world.bx(dx - 1.3, 0, z1 + 1.7, 0.12, 2.6, 0.12, 0x555555, 0, 0); world.bx(dx + 1.3, 0, z1 + 1.7, 0.12, 2.6, 0.12, 0x555555, 0, 0);
    world.bx(dx + 1.2, 1.3, z1 + 0.08, 0.5, 0.35, 0.06, 0xffffff, 0, 0); // name plate
  }
  addBoxCol(x0, z0, x1, z1, 50);
}
function house(x0, z0, x1, z1, wallC, roofC, h = 4) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const shut = pick([0x2a9d8f, 0x3d5a80, 0x6b8f3e, 0x8a3b2e, 0xffffff]);
  world.bx(cx, 0, cz, w, h, d, wallC, 0, 0.02);
  world.bx(cx, 0, cz, w + 0.08, 0.4, d + 0.08, 0x9a948a, 0, 0.02);
  const dark = new THREE.Color(roofC).multiplyScalar(0.82).getHex();
  for (let k = 0; k < 7; k++) { const ww = d + 0.7 - k * (d / 6.2); if (ww <= 0.2) break; world.bx(cx, h + k * 0.42, cz, w + 0.7, 0.42, ww, k % 2 ? roofC : dark, 0, 0.03); world.bx(cx, h + k * 0.42 + 0.36, cz - ww / 2 + 0.03, w + 0.72, 0.06, 0.06, dark, 0, 0); world.bx(cx, h + k * 0.42 + 0.36, cz + ww / 2 - 0.03, w + 0.72, 0.06, 0.06, dark, 0, 0); }
  for (const zz of [z0 - 0.4, z1 + 0.4]) world.bx(cx, h - 0.12, zz, w + 0.7, 0.12, 0.14, 0x8d8d8d, 0, 0);
  for (const [xx, zz] of [[x0 - 0.3, z0 - 0.4], [x1 + 0.3, z1 + 0.4]]) world.bx(xx, 0, zz, 0.1, h - 0.1, 0.1, 0x8d8d8d, 0, 0);
  const chx = cx + w * 0.25, chz = cz + d * 0.1;
  world.bx(chx, h + 0.4, chz, 0.6, 2.0, 0.6, 0x8c4a3a, 0, 0.04); world.bx(chx, h + 2.4, chz, 0.8, 0.12, 0.8, 0x555555, 0, 0);
  // front (road side): door
  const fN = facade(true, z0, -1);
  fN(cx, 0, 0.03, 1.3, 2.3, 0.08, 0xffffff); fN(cx, 0.05, 0.07, 1.05, 2.1, 0.06, 0x6b4226); fN(cx + 0.35, 1.0, 0.12, 0.08, 0.08, 0.06, 0xc9a227); fN(cx, 0, 0.45, 1.6, 0.12, 0.7, 0xbdb6aa);
  for (const fx of [cx - w * 0.3, cx + w * 0.3]) detailedWindow(fN, fx, 1.2, { w: 1.0, h: 1.1, shutters: shut, extras: false });
  // garden side (faces the camera) and east side
  const fS = facade(true, z1, 1);
  for (const fx of [cx - w * 0.28, cx + w * 0.28]) detailedWindow(fS, fx, 1.2, { w: 1.0, h: 1.1, shutters: shut });
  fS(cx, 0, 0.03, 1.1, 2.1, 0.08, 0xffffff); fS(cx, 0.05, 0.07, 0.9, 1.95, 0.06, 0x8ec5e8);
  const fE = facade(false, x1, 1);
  for (const fz of [cz - d * 0.22, cz + d * 0.22]) detailedWindow(fE, fz, 1.2, { w: 1.0, h: 1.1, shutters: shut });
  addBoxCol(x0, z0, x1, z1, 20);
}
function fenceLine(x0, z0, x1, z1, h = FENCE.h) {
  const len = Math.hypot(x1 - x0, z1 - z0); const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const n = Math.max(1, Math.round(len / 1.5)), seg = len / n, dx = (x1 - x0) / len, dz = (z1 - z0) / len, rot = Math.atan2(-dz, dx);
  for (let k = 0; k < n; k++) place('fence', x0 + dx * seg * k, 0, z0 + dz * seg * k, rot, 1, 0, { sx: seg / 1.5 });
  place('fencepost', x1, 0, z1, 0, 1, 0);
  addBoxCol(x0 - (along ? 0 : 0.08), z0 - (along ? 0.08 : 0), x1 + (along ? 0 : 0.08), z1 + (along ? 0.08 : 0), h);
}
function line(x0, z0, x1, z1, w = 0.1) {
  const len = Math.hypot(x1 - x0, z1 - z0); const rot = -Math.atan2(z1 - z0, x1 - x0);
  world.box((x0 + x1) / 2, 0.012, (z0 + z1) / 2, len, 0.025, w, 0xf7f7f7, rot, 0);
}
function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i <= 64; i += 16) { g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); }
  g.stroke(); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildPitch() {
  const { x0, x1, z0, z1, cx, cz } = PITCH;
  line(x0, z0, x1, z0); line(x0, z1, x1, z1); line(x0, z0, x0, z1); line(x1, z0, x1, z1); line(cx, z0, cx, z1);
  for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, b = (k + 1) / 40 * Math.PI * 2; line(cx + Math.cos(a) * 2.5, cz + Math.sin(a) * 2.5, cx + Math.cos(b) * 2.5, cz + Math.sin(b) * 2.5); }
  world.bx(cx, 0, cz, 0.25, 0.03, 0.25, 0xffffff, 0, 0);
  for (const g of GOALS) {
    const xi = g.x - g.dir * 4; line(g.x, -4, xi, -4); line(g.x, 4, xi, 4); line(xi, -4, xi, 4);
    const xs = g.x - g.dir * 1.5; line(g.x, -2.4, xs, -2.4); line(g.x, 2.4, xs, 2.4); line(xs, -2.4, xs, 2.4);
    world.bx(g.x - g.dir * 3, 0, 0, 0.2, 0.03, 0.2, 0xffffff, 0, 0);
  }
  for (const [fx, fz] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) { world.bx(fx, 0, fz, 0.05, 1.0, 0.05, 0xdddddd, 0, 0); world.bx(fx + 0.15, 0.75, fz, 0.3, 0.22, 0.02, 0xff5c3d, 0, 0); }
  // goals
  const netMat = new THREE.MeshLambertMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
  for (const g of GOALS) {
    const back = g.x + g.dir * GOAL_D;
    for (const s of [-1, 1]) {
      world.bx(g.x, 0, s * GOAL_HW, 0.12, GOAL_H, 0.12, 0xffffff, 0, 0);
      world.bx(back, 0, s * GOAL_HW, 0.06, GOAL_H * 0.85, 0.06, 0xdddddd, 0, 0);
      world.box((g.x + back) / 2, GOAL_H * 0.85, s * GOAL_HW, GOAL_D, 0.05, 0.05, 0xdddddd, 0, 0);
      world.box((g.x + back) / 2, 0.03, s * GOAL_HW, GOAL_D, 0.05, 0.05, 0xdddddd, 0, 0);
      addCircleCol(g.x, s * GOAL_HW, 0.08, GOAL_H);
      addBoxCol(Math.min(g.x, back), s * GOAL_HW - 0.04, Math.max(g.x, back), s * GOAL_HW + 0.04, GOAL_H, 0.1);
    }
    world.box(g.x, GOAL_H + 0.06, 0, 0.12, 0.12, GOAL_HW * 2 + 0.12, 0xffffff, 0, 0);
    world.box(back, GOAL_H * 0.85, 0, 0.06, 0.06, GOAL_HW * 2, 0xdddddd, 0, 0);
    addBoxCol(back - 0.05, -GOAL_HW, back + 0.05, GOAL_HW, GOAL_H, 0.1);
    const mk = (w, h, x, y, z, ry, rx = 0) => { const geo = new THREE.PlaneGeometry(w, h); const tex = netMat.map.clone(); tex.repeat.set(w * 4, h * 4); tex.needsUpdate = true; const m = new THREE.Mesh(geo, netMat.clone()); m.material.map = tex; m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); scene.add(m); };
    mk(GOAL_HW * 2, GOAL_H * 0.85, back, GOAL_H * 0.425, 0, Math.PI / 2);
    for (const s of [-1, 1]) mk(GOAL_D, GOAL_H, (g.x + back) / 2, GOAL_H / 2, s * GOAL_HW, 0);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_D, GOAL_HW * 2), netMat.clone()); const tt = netMat.map.clone(); tt.repeat.set(4, GOAL_HW * 8); tt.needsUpdate = true; top.material.map = tt;
    top.position.set((g.x + back) / 2, GOAL_H * 0.93, 0); top.rotation.x = -Math.PI / 2; top.rotation.z = 0; scene.add(top);
  }
  // fence with a gate on the north side (near the family bench)
  const F = FENCE;
  fenceLine(F.x0, F.z0, F.gate0, F.z0); fenceLine(F.gate1, F.z0, F.x1, F.z0);
  fenceLine(F.x0, F.z1, F.x1, F.z1); fenceLine(F.x0, F.z0, F.x0, F.z1); fenceLine(F.x1, F.z0, F.x1, F.z1);
  world.bx(F.gate0, 0, F.z0, 0.18, 1.7, 0.18, 0x2e6b46, 0, 0); world.bx(F.gate1, 0, F.z0, 0.16, 1.6, 0.16, 0x2e6b46, 0, 0);
  world.bx((F.gate0 + F.gate1) / 2, 1.5, F.z0, 2.1, 0.12, 0.12, 0x2e6b46, 0, 0);
}
function buildFountain() {
  const { x, z } = FOUNTAIN;
  place('fountain', x, 0, z, 0, 1, 0, { noCollider: true });
  const wm = new THREE.MeshLambertMaterial({ color: 0x4fb3e8, transparent: true, opacity: 0.8 });
  for (const w of DEF.fountain.water) { const m = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, 0.06, 32), wm); m.position.set(x, w.y, z); m.receiveShadow = true; scene.add(m); }
  addCircleCol(x, z, FOUNTAIN.r, 0.65); addCircleCol(x, z, 0.5, 3);
}

export const benchSpots = [];
export function buildWorld() {
  buildGround();
  buildPitch();
  buildFountain();
  // the family's apartment block (társasház)
  apartment(-38, -30, -24, -18, 5, 0xf1e3c6, 0xd9785c, { doorX: -31, balconies: true, home: { floor: 2, x: -35.1 } });
  bush(-36.5, -17); bush(-25.5, -17); flowerBed(-28.3, -16.2, 1.4, 0.8); flowerBed(-33.7, -16.2, 1.4, 0.8);
  // other blocks & houses (small town)
  apartment(-14, -34, 2, -24, 4, 0xdfe8ef, 0x6c93b8);
  apartment(8, -36, 20, -26, 3, 0xf3d9d2, 0xb86c5d);
  apartment(30, -36, 44, -27, 4, 0xe9efd8, 0x7d9a5a);
  house(-46, 21, -38, 28, 0xf2d7a6, 0xb5482f, 4); house(-34, 21, -27, 27, 0xdbe8f5, 0x3d5a80, 3.6);
  house(-23, 21, -15, 28, 0xf7e8e1, 0x8a3b2e, 4.2); house(-11, 21, -4, 27, 0xe4f1d9, 0xb5482f, 3.6);
  house(0, 21, 8, 28, 0xfff3c4, 0x6b4c3b, 4);
  house(-48, -30, -42, -22, 0xe8d9f0, 0x6b4c3b, 3.6); house(-48, -14, -42, -6, 0xf2d7a6, 0xb5482f, 3.6);
  // low kiosk & parking south-east (kept low so it never hides the pitch)
  world.bx(30, 0, 23, 4, 2.4, 3, 0xffd166, 0, 0.02); world.bx(30, 2.4, 23, 4.6, 0.25, 3.6, 0xef476f, 0, 0.02); addBoxCol(28, 21.5, 32, 24.5, 3);
  for (let k = 0; k < 4; k++) ground.bx(38 + k * 3, 0, 23, 0.1, 0.02, 4.5, 0xf2f2f2, 0, 0);

  // park benches (x,z,rot) + bins
  const B = [[-12, -7.75, 0], [7, -7.75, 0], [-7, 7.75, Math.PI], [12, 7.75, Math.PI], [-19.75, 2.5, Math.PI / 2], [19.75, -2.5, -Math.PI / 2]];
  for (const [x, z, r] of B) { bench(x, z, r); benchSpots.push({ x, z, rot: r }); const [bx, bz] = L(x, z, r, 1.55, 0); bin(bx, bz); }
  bench(FAMILY_BENCH.x, FAMILY_BENCH.z, FAMILY_BENCH.rot); bin(31.2, -12.75);
  // extra street furniture
  place('picnic', -6.5, 0, -3.2, 0, 1); place('picnic', 6.5, 0, 3.2, 0, 1);
  place('bikerack', 36.6, 0, -13.0, 0, 1); place('drink', 28.3, 0, -12.9, 0, 1);
  for (const x of [-30, 10, 44]) place('hydrant', x, 0, 12.4, 0, 1);
  // lamps
  for (const [x, z] of [[-18.9, -6.9], [18.9, -6.9], [18.9, 6.9], [-18.9, 6.9], [-4.9, -4.9], [4.9, 4.9], [27, -12.4], [39, -12.4], [49, -12.4], [-29, -16], [12, 12.6], [-12, 12.6], [36, 12.6], [50, 12.6]]) lamp(x, z);
  // flower beds around the fountain and along paths
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; flowerBed(Math.cos(a) * 5.8, Math.sin(a) * 5.8, 1.6, 1.6); }
  for (const [x, z] of [[-9, -3], [9, 3], [-9, 3], [9, -3], [-14.5, -8.6], [14.5, 8.6]]) flowerBed(x, z, 2.2, 1.0);
  // trees
  const treePts = [];
  const okTree = (x, z, minD = 2.6) => {
    for (let dx = -1.2; dx <= 1.2; dx += 0.6) for (let dz = -1.2; dz <= 1.2; dz += 0.6) { const t = tileAt(x + dx, z + dz); if (t !== T.GRASS && t !== T.PARK) return false; }
    if (Math.hypot(x, z) < 7.5) return false;
    if (x > -9 && x < 23 && z > -6 && z < 1.5) return false;   // keep the intro route visible
    if (x > 17 && x < 24 && z > -12 && z < 6) return false;
    for (const c of colliders) { if (c.box) { if (x > c.x0 - 1.4 && x < c.x1 + 1.4 && z > c.z0 - 1.4 && z < c.z1 + 1.4) return false; } else if (Math.hypot(x - c.x, z - c.z) < c.r + 1.4) return false; }
    for (const p of treePts) if (Math.hypot(p[0] - x, p[1] - z) < minD) return false;
    return true;
  };
  const plant = (x0, x1, z0, z1, n, types, sMin = 0.9, sMax = 1.2) => {
    let tries = 0, k = 0; while (k < n && tries < n * 60) { tries++; const x = R(x0, x1), z = R(z0, z1); if (!okTree(x, z)) continue; treePts.push([x, z]); tree(x, z, pick(types), R(sMin, sMax)); k++; }
  };
  plant(PARK.x0 + 0.5, PARK.x1 - 0.5, PARK.z0 + 0.5, PARK.z1 - 0.5, 24, ['round', 'round', 'birch', 'pine']);
  plant(-46, -26, -16, 12, 12, ['round', 'pine', 'birch']);
  plant(-22, 56, -24, -14, 18, ['round', 'pine', 'birch'], 0.9, 1.3);
  plant(-50, 20, 20.5, 31, 8, ['round', 'pine'], 0.8, 1.0);
  for (let x = 25; x < 53; x += 3.2) { const z = R(-15.2, -14.2); if (okTree(x, z, 2.2) && Math.abs(x - 33) > 3) { treePts.push([x, z]); tree(x, z, pick(['round', 'birch']), R(0.95, 1.15)); } }
  // low bushes south / east of the pitch (do not hide the field from the camera)
  for (let x = 26; x < 52; x += 2.5) bush(x, R(11, 12), R(0.7, 0.9));
  for (let z = -8; z < 10; z += 2.5) bush(R(54.5, 56), z, R(0.7, 0.9));
  // rocks
  { let k = 0, tries = 0; while (k < 9 && tries < 400) { tries++; const x = R(-21, 21), z = R(-9.5, 10.5); if (!okTree(x, z, 2)) continue; treePts.push([x, z]); place('rock', x, 0, z, quarter(), R(0.7, 1.1)); k++; } }
  buildInstances();

  scene.add(ground.mesh(false, true));
  scene.add(world.mesh(true, true));
}

