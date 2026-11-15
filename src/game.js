// =====================================================================
//  Petike a parkban – izometrikus voxel játék (Three.js)
//  Belépési pont: index.html → /src/game.js   (modellek: public/*.glb)
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CATALOG, getGeometry } from './voxels.js';

const V3 = THREE.Vector3;
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- utils
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry32(20261115);
const R = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const smooth = (t) => t * t * (3 - 2 * t);
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
const dampAngle = (a, b, l, dt) => a + angDiff(a, b) * (1 - Math.exp(-l * dt));
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz;
  let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
let clockT = 0;

// ---------------------------------------------------------------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd6f0);

let viewSize = 9, viewSizeTarget = 9, zoomOverride = 0;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
const CAM_OFF = new V3(40, 34, 40);
const camTarget = new V3(0, 0, -6);
function updateProjection() {
  const a = window.innerWidth / window.innerHeight;
  camera.left = -viewSize * a; camera.right = viewSize * a; camera.top = viewSize; camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
}
updateProjection();
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); updateProjection(); });

const hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6f8f4a, 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
const SUN_OFF = new V3(-18, 34, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 120 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

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
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
function partMesh(fn) { const b = new Batch(); fn(b); return b.mesh(true, true); }

// ---------------------------------------------------------------- tiles / ground
const GX0 = -52, GX1 = 62, GZ0 = -38, GZ1 = 32, GW = GX1 - GX0, GH = GZ1 - GZ0;
const T = { GRASS: 0, PARK: 1, PATH: 2, PITCH: 3, ROAD: 4, SIDEWALK: 5, PLAZA: 6 };
const tiles = new Uint8Array(GW * GH);
function tileAt(x, z) { const i = Math.floor(x) - GX0, j = Math.floor(z) - GZ0; if (i < 0 || j < 0 || i >= GW || j >= GH) return T.GRASS; return tiles[j * GW + i]; }
function groundH(x, z) { const t = tileAt(x, z); return t === T.PATH ? 0.06 : t === T.SIDEWALK ? 0.12 : t === T.PLAZA ? 0.08 : 0; }

// pitch geometry (x along length)
const PITCH = { x0: 25.5, x1: 51.5, z0: -8.5, z1: 8.5, cx: 38.5, cz: 0 };
const FENCE = { x0: 24.1, x1: 52.9, z0: -9.9, z1: 9.9, gate0: 29, gate1: 31, h: 1.1 };
const GOALS = [{ x: PITCH.x0, dir: -1 }, { x: PITCH.x1, dir: 1 }];
const GOAL_HW = 1.6, GOAL_H = 1.5, GOAL_D = 1.0;
const FAMILY_BENCH = { x: 33, z: -12.7, rot: 0 };
const FOUNTAIN = { x: 0, z: 0, r: 2.6 };
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
const colliders = [];
function addBoxCol(x0, z0, x1, z1, h = 5, e = 0.6) { colliders.push({ box: true, e, x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h }); }
function addCircleCol(x, z, r, h = 5, e = 0.6) { colliders.push({ box: false, x, z, r, h, e }); }
// pushes p (x,z) out of colliders; returns callback normal
function collide(p, rad, yBottom, onHit) {
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
const L = (x, z, rot, lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

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
function tree(x, z, type = 'round', s = 1) { place(type === 'round' ? 'oak' : type, x, 0, z, quarter(), s); }
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

const benchSpots = [];
function buildWorld() {
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

// ---------------------------------------------------------------- character rigs
const charMat = new THREE.MeshLambertMaterial({ vertexColors: true });
function makeRigShell(scale) {
  const root = new THREE.Group(); const inner = new THREE.Group(); const S = new THREE.Group();
  S.scale.setScalar(scale); root.add(inner); inner.add(S);
  return { root, inner, S, hip: [], knee: [], sh: [] };
}
const CFG = {
  petya:  { scale: 0.93, hipY: 0.758, kneeY: 0.361, split: 0, armX: [-0.345, 0.345], armY: [0.77, 1.42] },
  angi:   { scale: 0.86, hipY: 0.598, kneeY: 0.281, split: 0, armX: [-0.265, 0.265], armY: [0.95, 1.6] },
  foci:   { scale: 0.70, hipY: 0.398, kneeY: 0.201, split: 0, armX: [-0.265, 0.265], armY: [0.58, 1.27] },
  roller: { scale: 0.95, hipY: 0.56, hipPivot: 0.53, kneeY: -1, split: 0.085, armX: [-0.06, 0.22], armY: [0.5, 0.95], perMesh: true },
};
// Rigged (skinned, T-pose, Mixamo bone names) character → same rig interface as the voxel-split one.
// hip/knee are the leg bones; sh[] are proxies with the old "hanging arm" meaning, applied on top of a base
// rotation that brings the T-pose arms down to the body.
function rigFromSkinned(gltf, cfg) {
  const rig = makeRigShell(cfg.scale); const model = gltf.scene; rig.S.add(model);
  let sm = null;
  model.traverse((o) => { if (o.isMesh) { o.material = charMat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.isSkinnedMesh) sm = o; } });
  const bone = (n) => { const b = sm.skeleton.bones.find((x) => x.name.replace(/^mixamorig:?/, '') === n); if (!b) throw new Error('Hiányzó csont: ' + n); return b; };
  rig.hip = [bone('RightUpLeg'), bone('LeftUpLeg')]; rig.knee = [bone('RightLeg'), bone('LeftLeg')];
  rig.armBones = [bone('RightArm'), bone('LeftArm')]; rig.foreBones = [bone('RightForeArm'), bone('LeftForeArm')];
  rig.handBones = [bone('RightHand'), bone('LeftHand')];
  rig.armBase = [1.5, -1.5];                      // T-pose → arms down (slightly away from the body)
  rig.sh = [new THREE.Object3D(), new THREE.Object3D()];
  rig.elbow = [0, 0];                              // optional elbow bend (radians, forward)
  rig.apply = () => {
    for (let i = 0; i < 2; i++) {
      const p = rig.sh[i].rotation; rig.armBones[i].rotation.set(p.x, p.y, p.z + rig.armBase[i]);
      rig.foreBones[i].rotation.set(0, (i === 0 ? 1 : -1) * rig.elbow[i], 0);
    }
  };
  rig.skinned = true;
  rig.root.updateMatrixWorld(true);
  const hp = new V3(); rig.hip[0].getWorldPosition(hp); rig.hipH = hp.y;
  rig.height = new THREE.Box3().setFromObject(rig.root).max.y;
  return rig;
}
function rigFromGLTF(gltf, cfg) {
  let isSkinned = false; gltf.scene.traverse((o) => { if (o.isSkinnedMesh) isSkinned = true; });
  if (isSkinned) return rigFromSkinned(gltf, cfg);
  const src = gltf.scene; src.updateMatrixWorld(true);
  const names = ['body', 'armR', 'armL', 'thighR', 'thighL', 'shinR', 'shinL'];
  const parts = {}; for (const n of names) parts[n] = { p: [], n: [], c: [], min: new V3(1e9, 1e9, 1e9), max: new V3(-1e9, -1e9, -1e9) };
  const classify = (x, y) => {
    if (y < cfg.hipY) { const s = x < cfg.split ? 'R' : 'L'; return (y < cfg.kneeY ? 'shin' : 'thigh') + s; }
    if (y >= cfg.armY[0] && y <= cfg.armY[1]) { if (x < cfg.armX[0]) return 'armR'; if (x > cfg.armX[1]) return 'armL'; }
    return 'body';
  };
  const a = new V3(), b = new V3(), c = new V3(), n = new V3(), e1 = new V3(), e2 = new V3();
  const nm = new THREE.Matrix3(); const col = new THREE.Color(); const white = new THREE.Color(1, 1, 1);
  src.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, ca = g.attributes.color, idx = g.index;
    nm.getNormalMatrix(o.matrixWorld);
    const mc = (o.material && o.material.color) || white;
    let meshPart = null;
    if (cfg.perMesh) { g.computeBoundingBox(); const bb = g.boundingBox.clone().applyMatrix4(o.matrixWorld); const ce = bb.getCenter(new V3()); meshPart = classify(ce.x, ce.y); }
    const tc = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < tc; t++) {
      const ids = idx ? [idx.getX(t * 3), idx.getX(t * 3 + 1), idx.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2];
      a.fromBufferAttribute(pos, ids[0]).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, ids[1]).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(pos, ids[2]).applyMatrix4(o.matrixWorld);
      const part = parts[meshPart || classify((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)];
      if (!nor) { e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2).normalize(); }
      [a, b, c].forEach((v, k) => {
        part.p.push(v.x, v.y, v.z); part.min.min(v); part.max.max(v);
        if (nor) { n.fromBufferAttribute(nor, ids[k]).applyMatrix3(nm).normalize(); }
        part.n.push(n.x, n.y, n.z);
        if (ca) col.setRGB(ca.getX(ids[k]), ca.getY(ids[k]), ca.getZ(ids[k])).multiply(mc); else col.copy(mc);
        part.c.push(col.r, col.g, col.b);
      });
    }
  });
  const center = (p) => p.p.length ? p.min.clone().add(p.max).multiplyScalar(0.5) : new V3();
  const cR = center(parts.thighR), cL = center(parts.thighL);
  const off = new V3((cR.x + cL.x) / 2, 0, (cR.z + cL.z) / 2);
  const rig = makeRigShell(cfg.scale);
  const mk = (part, pivot) => {
    const g = new THREE.BufferGeometry(); const P = part.p.slice();
    const ox = pivot === zero ? off.x : 0, oz = pivot === zero ? off.z : 0; // limbs live in pivot space, only the body is re-centred
    for (let i = 0; i < P.length; i += 3) { P[i] -= pivot.x + ox; P[i + 1] -= pivot.y; P[i + 2] -= pivot.z + oz; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(part.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(part.c, 3));
    const m = new THREE.Mesh(g, charMat); m.castShadow = true; m.receiveShadow = true; return m;
  };
  const zero = new V3();
  rig.S.add(mk(parts.body, zero));
  const hipPY = cfg.hipPivot ?? cfg.hipY;
  for (const s of ['R', 'L']) {
    const th = parts['thigh' + s], sh = parts['shin' + s], arm = parts['arm' + s];
    const ct = center(th); const hipP = new V3(ct.x, hipPY, ct.z);
    const hip = new THREE.Group(); hip.position.set(hipP.x - off.x, hipP.y, hipP.z - off.z); rig.S.add(hip);
    hip.add(mk(th, hipP));
    const knee = new THREE.Group();
    if (sh.p.length) { const cs = center(sh); const kP = new V3(cs.x, cfg.kneeY, cs.z); knee.position.set(kP.x - hipP.x, kP.y - hipP.y, kP.z - hipP.z); knee.add(mk(sh, kP)); }
    hip.add(knee);
    const shoulder = new THREE.Group();
    if (arm.p.length) { const ca = center(arm); const sP = new V3(ca.x, arm.max.y - 0.06, ca.z); shoulder.position.set(sP.x - off.x, sP.y, sP.z - off.z); shoulder.add(mk(arm, sP)); }
    rig.S.add(shoulder);
    rig.hip.push(hip); rig.knee.push(knee); rig.sh.push(shoulder);
  }
  rig.hipH = hipPY * cfg.scale;
  let maxY = 0; for (const k in parts) if (parts[k].p.length) maxY = Math.max(maxY, parts[k].max.y);
  rig.height = maxY * cfg.scale;
  return rig;
}

// procedural voxel people for NPCs
const SKINS = [0xf1c9a5, 0xe0ac84, 0xc68863, 0x8d5a3b, 0xf5d6c0];
const HAIRS = [0x2b1d14, 0x5a3825, 0x8a5a2b, 0xd8b45c, 0x1a1a1a, 0xb0b0b0, 0xe8e8e8, 0xa0402a];
const SHIRTS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x6a4c93, 0xffffff, 0x8ac926, 0xff70a6, 0x1d3557, 0xffca3a];
const PANTS = [0x264653, 0x3d405b, 0x6b705c, 0x1d3557, 0x5e503f, 0x22223b, 0x8d99ae];
function makePerson(o = {}) {
  const rig = makeRigShell(o.scale || 1);
  const skin = o.skin ?? pick(SKINS), hair = o.hair ?? pick(HAIRS), shirt = o.shirt ?? pick(SHIRTS), pants = o.pants ?? pick(PANTS), shoe = o.shoe ?? pick([0x222222, 0xffffff, 0x6b4226, 0xe63946]);
  const dress = o.dress ?? rand() < 0.3;
  const body = partMesh((b) => {
    b.bx(0, 0.74, 0, 0.42, 0.14, 0.24, dress ? shirt : pants, 0, 0);
    b.bx(0, 0.86, 0, 0.44, 0.52, 0.25, shirt, 0, 0);
    if (dress) b.bx(0, 0.5, 0, 0.5, 0.36, 0.3, shirt, 0, 0);
    b.bx(0, 1.38, 0, 0.14, 0.06, 0.14, skin, 0, 0);
    b.bx(0, 1.42, 0, 0.32, 0.32, 0.3, skin, 0, 0);
    b.bx(0, 1.7, -0.01, 0.34, 0.1, 0.33, hair, 0, 0);
    b.bx(0, 1.5, -0.13, 0.34, 0.24, 0.08, hair, 0, 0);
    if (o.longHair ?? rand() < 0.4) b.bx(0, 1.12, -0.15, 0.34, 0.5, 0.08, hair, 0, 0);
    b.bx(-0.07, 1.55, 0.151, 0.05, 0.05, 0.02, 0x222222, 0, 0); b.bx(0.07, 1.55, 0.151, 0.05, 0.05, 0.02, 0x222222, 0, 0);
    b.bx(0, 1.47, 0.151, 0.1, 0.03, 0.02, 0xb5544a, 0, 0);
    if (o.hat ?? rand() < 0.2) { const hc = pick([0x3d405b, 0xe63946, 0xf4a261, 0xffffff]); b.bx(0, 1.74, 0, 0.38, 0.14, 0.36, hc, 0, 0); b.bx(0, 1.74, 0.2, 0.32, 0.04, 0.16, hc, 0, 0); }
    if (o.glasses) { b.bx(0, 1.55, 0.16, 0.26, 0.03, 0.02, 0x222222, 0, 0); }
  });
  rig.S.add(body);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.11, 0.8, 0); rig.S.add(hip);
    hip.add(partMesh((b) => b.bx(0, -0.4, 0, 0.17, 0.4, 0.2, dress ? skin : pants, 0, 0)));
    const knee = new THREE.Group(); knee.position.set(0, -0.4, 0); hip.add(knee);
    knee.add(partMesh((b) => { b.bx(0, -0.32, 0, 0.16, 0.32, 0.19, dress ? skin : pants, 0, 0); b.bx(0, -0.4, 0.03, 0.18, 0.08, 0.26, shoe, 0, 0); }));
    const sh = new THREE.Group(); sh.position.set(s * 0.29, 1.32, 0); rig.S.add(sh);
    sh.add(partMesh((b) => { b.bx(0, -0.22, 0, 0.13, 0.26, 0.15, shirt, 0, 0); b.bx(0, -0.5, 0, 0.12, 0.28, 0.13, skin, 0, 0); }));
    rig.hip.push(hip); rig.knee.push(knee); rig.sh.push(sh);
  }
  // order: [R, L] where R = -x
  rig.hipH = 0.8 * (o.scale || 1); rig.height = 1.8 * (o.scale || 1);
  return rig;
}

function resetPose(r) {
  for (const g of [...r.hip, ...r.knee, ...r.sh]) g.rotation.set(0, 0, 0);
  if (r.elbow) r.elbow[0] = r.elbow[1] = 0;
  r.inner.position.set(0, 0, 0); r.inner.rotation.set(0, 0, 0);
}
function animWalk(r, phase, amt, swing = 0.6) {
  if (amt < 0.001) return;
  const s = Math.sin(phase);
  r.hip[0].rotation.x = s * swing * amt; r.hip[1].rotation.x = -s * swing * amt;
  r.knee[0].rotation.x = Math.max(0, Math.sin(phase + 1.7)) * 0.9 * amt;
  r.knee[1].rotation.x = Math.max(0, Math.sin(phase + Math.PI + 1.7)) * 0.9 * amt;
  r.sh[0].rotation.x = -s * swing * 0.8 * amt; r.sh[1].rotation.x = s * swing * 0.8 * amt;
  r.inner.position.y = Math.abs(Math.cos(phase)) * 0.045 * amt;
}

// ---------------------------------------------------------------- Actor
const actors = [];
class Actor {
  constructor(rig, name) {
    this.rig = rig; this.name = name; this.pos = new V3(); this.heading = 0; this.targetHeading = 0;
    this.path = null; this.speed = 1.5; this.phase = rand() * 6; this.amt = 0; this.stride = 4.4; this.swing = 0.6;
    this.sit = 0; this.sitTarget = 0; this.seatH = 0.45; this.cheer = 0; this.keepHeading = false; this.riding = false;
    this.kickT = -1; this.idleT = rand() * 10; this.solid = true; this.point = 0;
    scene.add(rig.root); actors.push(this);
  }
  setRig(r) { scene.remove(this.rig.root); this.rig = r; scene.add(r.root); this.sync(); }
  walkTo(pts, speed = 1.5, keepHeading = false) { this.path = pts.map((p) => new V3(p[0], 0, p[1])); this.speed = speed; this.keepHeading = keepHeading; }
  place(x, z, h) { this.pos.set(x, 0, z); if (h !== undefined) this.heading = this.targetHeading = h; this.sync(); }
  headWorld(out) { this.rig.root.getWorldPosition(out); out.y += this.rig.height + 0.25 - (this.sit > 0.5 ? this.rig.hipH - this.seatH + 0.0 : 0); return out; }
  update(dt) {
    if (this.riding) return;
    let moving = false;
    if (this.path) {
      const t = this.path[0]; const dx = t.x - this.pos.x, dz = t.z - this.pos.z; const d = Math.hypot(dx, dz); const st = this.speed * dt;
      if (d <= st) { this.pos.x = t.x; this.pos.z = t.z; this.path.shift(); if (!this.path.length) this.path = null; }
      else { this.pos.x += dx / d * st; this.pos.z += dz / d * st; if (!this.keepHeading) this.targetHeading = Math.atan2(dx, dz); }
      moving = true;
    }
    this.heading = dampAngle(this.heading, this.targetHeading, 9, dt);
    this.animate(dt, moving, moving ? this.speed : 0);
    this.sync();
  }
  animate(dt, moving, spd) {
    this.amt = damp(this.amt, moving ? 1 : 0, 9, dt);
    this.phase += dt * spd * this.stride;
    const r = this.rig; resetPose(r);
    const sw = this.swing * clamp(0.75 + spd * 0.12, 0.8, 1.45);
    animWalk(r, this.phase, this.amt * (1 - this.sit), sw);
    if (!moving && this.sit < 0.01) { this.idleT += dt; const b = Math.sin(this.idleT * 2) * 0.04; r.sh[0].rotation.z = -0.05 - b * 0.5; r.sh[1].rotation.z = 0.05 + b * 0.5; }
    this.sit = clamp(this.sit + Math.sign(this.sitTarget - this.sit) * dt * 1.8, 0, 1);
    if (this.sit > 0) {
      const s = smooth(this.sit);
      for (let i = 0; i < 2; i++) { r.hip[i].rotation.x = lerp(r.hip[i].rotation.x, -1.5, s); r.knee[i].rotation.x = lerp(r.knee[i].rotation.x, 1.45, s); r.sh[i].rotation.x = lerp(r.sh[i].rotation.x, -0.35, s); }
      r.inner.position.y = lerp(r.inner.position.y, this.seatH - r.hipH, s);
      r.inner.position.z = lerp(0, -0.05, s);
    }
    if (this.cheer > 0) {
      this.cheer -= dt; const k = Math.min(1, this.cheer * 2); const w = Math.sin(clockT * 16);
      r.sh[0].rotation.x = lerp(r.sh[0].rotation.x, -2.9 + w * 0.2, k); r.sh[1].rotation.x = lerp(r.sh[1].rotation.x, -2.9 - w * 0.2, k);
      r.sh[0].rotation.z = -0.35 * k; r.sh[1].rotation.z = 0.35 * k;
      r.inner.position.y += Math.abs(Math.sin(clockT * 9)) * 0.1 * k;
    }
    if (this.point > 0) { // instructing: left arm forward, finger-wagging
      this.point -= dt; const k = Math.min(1, this.point * 3); const w = Math.sin(clockT * 10) * 0.18;
      r.sh[1].rotation.x = lerp(r.sh[1].rotation.x, -1.6 + w, k); r.sh[1].rotation.z = lerp(r.sh[1].rotation.z, 0.12, k);
    }
  }
  sync() { if (this.rig.apply) this.rig.apply(); this.rig.root.position.set(this.pos.x, this.riding ? 0 : (this.sit > 0 ? 0 : groundH(this.pos.x, this.pos.z)), this.pos.z); this.rig.root.rotation.y = this.heading; }
}

// ---------------------------------------------------------------- animals
function makeDog(colA, colB, s = 1) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0.26 * s, 0, 0.26 * s, 0.24 * s, 0.56 * s, colA, 0, 0);
    b.bx(0, 0.4 * s, 0.32 * s, 0.24 * s, 0.24 * s, 0.24 * s, colA, 0, 0);
    b.bx(0, 0.4 * s, 0.48 * s, 0.14 * s, 0.12 * s, 0.12 * s, colB, 0, 0);
    b.bx(0, 0.45 * s, 0.545 * s, 0.06 * s, 0.05 * s, 0.03 * s, 0x111111, 0, 0);
    b.bx(-0.07 * s, 0.56 * s, 0.445 * s, 0.04 * s, 0.04 * s, 0.02 * s, 0x111111, 0, 0); b.bx(0.07 * s, 0.56 * s, 0.445 * s, 0.04 * s, 0.04 * s, 0.02 * s, 0x111111, 0, 0);
    b.bx(-0.13 * s, 0.48 * s, 0.3 * s, 0.05 * s, 0.18 * s, 0.1 * s, colB, 0, 0); b.bx(0.13 * s, 0.48 * s, 0.3 * s, 0.05 * s, 0.18 * s, 0.1 * s, colB, 0, 0);
    b.bx(0, 0.36 * s, 0.2 * s, 0.27 * s, 0.05 * s, 0.05 * s, 0xe63946, 0, 0);
  }));
  const legs = [];
  for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]]) {
    const p = new THREE.Group(); p.position.set(x * s, 0.28 * s, z * s); body.add(p);
    p.add(partMesh((b) => b.bx(0, -0.28 * s, 0, 0.08 * s, 0.28 * s, 0.08 * s, colA, 0, 0))); legs.push(p);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.36 * s, -0.28 * s); body.add(tail);
  tail.add(partMesh((b) => b.box(0, 0.1 * s, -0.04 * s, 0.06 * s, 0.22 * s, 0.06 * s, colB, 0, 0))); tail.rotation.x = -0.6;
  return { root, body, legs, tail, kind: 'dog', s };
}
function makeCat(col, col2) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0.14, 0, 0.16, 0.15, 0.38, col, 0, 0);
    b.bx(0, 0.22, 0.22, 0.18, 0.16, 0.15, col, 0, 0);
    b.bx(-0.06, 0.38, 0.22, 0.05, 0.06, 0.05, col2, 0, 0); b.bx(0.06, 0.38, 0.22, 0.05, 0.06, 0.05, col2, 0, 0);
    b.bx(-0.045, 0.31, 0.3, 0.035, 0.035, 0.01, 0x7bd389, 0, 0); b.bx(0.045, 0.31, 0.3, 0.035, 0.035, 0.01, 0x7bd389, 0, 0);
    b.bx(0, 0.26, 0.3, 0.03, 0.02, 0.01, 0xff8fab, 0, 0);
  }));
  const legs = [];
  for (const [x, z] of [[-0.05, 0.13], [0.05, 0.13], [-0.05, -0.13], [0.05, -0.13]]) {
    const p = new THREE.Group(); p.position.set(x, 0.14, z); body.add(p); p.add(partMesh((b) => b.bx(0, -0.14, 0, 0.05, 0.14, 0.05, col, 0, 0))); legs.push(p);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.2, -0.18); body.add(tail);
  tail.add(partMesh((b) => { b.box(0, 0.15, -0.02, 0.04, 0.3, 0.04, col, 0, 0); b.box(0, 0.32, -0.02, 0.045, 0.06, 0.045, col2, 0, 0); })); tail.rotation.x = -0.3;
  return { root, body, legs, tail, kind: 'cat', s: 1 };
}
function makePigeon() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  body.add(partMesh((b) => {
    b.bx(0, 0.06, 0, 0.12, 0.11, 0.2, 0x9aa0a8, 0, 0); b.bx(0, 0.06, -0.13, 0.08, 0.04, 0.08, 0x6c7178, 0, 0);
    b.bx(0, 0.06, 0, 0.13, 0.04, 0.12, 0x7e8590, 0, 0);
  }));
  const head = new THREE.Group(); head.position.set(0, 0.15, 0.08); body.add(head);
  head.add(partMesh((b) => { b.bx(0, 0, 0, 0.08, 0.08, 0.08, 0x6a6f8a, 0, 0); b.bx(0, 0.02, 0.05, 0.03, 0.02, 0.04, 0xe8a87c, 0, 0); b.bx(-0.041, 0.04, 0.02, 0.01, 0.02, 0.02, 0xff7b00, 0, 0); b.bx(0.041, 0.04, 0.02, 0.01, 0.02, 0.02, 0xff7b00, 0, 0); }));
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.06, 0.12, 0); body.add(w); w.add(partMesh((b) => b.box(s * 0.08, 0, 0, 0.16, 0.02, 0.14, 0x8a919a, 0, 0))); wings.push(w); }
  return { root, body, head, wings };
}
function animLegs(a, phase, amt) {
  const s = Math.sin(phase) * 0.7 * amt;
  a.legs[0].rotation.x = s; a.legs[3].rotation.x = s; a.legs[1].rotation.x = -s; a.legs[2].rotation.x = -s;
  a.body.position.y = Math.abs(Math.cos(phase)) * 0.025 * amt;
}

// ---------------------------------------------------------------- FX (particles)
const fx = [];
const fxGeo = new THREE.BoxGeometry(1, 1, 1);
function spawnFx(pos, vel, color, size, life, grav = 0, fade = true) {
  const m = new THREE.Mesh(fxGeo, new THREE.MeshLambertMaterial({ color, transparent: fade }));
  m.scale.setScalar(size); m.position.copy(pos); m.rotation.set(rand() * 3, rand() * 3, 0); scene.add(m);
  fx.push({ m, vel: vel.clone(), life, max: life, grav, size, fade });
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.life -= dt;
    if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); fx.splice(i, 1); continue; }
    p.vel.y -= p.grav * dt; p.m.position.addScaledVector(p.vel, dt); p.m.rotation.x += dt * 3; p.m.rotation.y += dt * 2;
    if (p.grav > 0 && p.m.position.y < 0.03) { p.m.position.y = 0.03; p.vel.multiplyScalar(0.5); }
    const k = p.life / p.max; if (p.fade) p.m.material.opacity = Math.min(1, k * 2.5); p.m.scale.setScalar(p.size * (p.fade ? (0.5 + 0.5 * k) : 1));
  }
}
function poof(pos) {
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2, u = R(0.3, 1.6);
    spawnFx(new V3(pos.x + Math.cos(a) * 0.2, R(0.1, 1.2), pos.z + Math.sin(a) * 0.2), new V3(Math.cos(a) * u, R(0.2, 1.5), Math.sin(a) * u), pick([0xffffff, 0xf3f3f3, 0xffe3ef, 0xfff6c9]), R(0.12, 0.26), R(0.6, 1.1));
  }
  for (let i = 0; i < 10; i++) spawnFx(new V3(pos.x, R(0.4, 1.3), pos.z), new V3(R(-1, 1), R(1, 2.5), R(-1, 1)), pick([0xffd166, 0xff70a6, 0x4cc9f0]), 0.08, 1.0, 2);
  sPoof();
}
function confetti(x, z) {
  for (let i = 0; i < 90; i++) spawnFx(new V3(x + R(-1, 1), R(0.5, 2), z + R(-1.5, 1.5)), new V3(R(-3, 3), R(3, 7), R(-3, 3)), pick([0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xffffff]), R(0.07, 0.12), R(1.6, 2.6), 6, false);
}

// ---------------------------------------------------------------- audio
let actx = null, muted = false, master = null;
function initAudio() {
  if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination); } catch (e) { actx = null; }
}
function noiseBuf(dur) { const b = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
  if (!actx || muted) return; const t = actx.currentTime + delay; const o = actx.createOscillator(); const g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, 0.01, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, freq, q, vol, delay = 0, type = 'bandpass') {
  if (!actx || muted) return; const t = actx.currentTime + delay; const s = actx.createBufferSource(); s.buffer = noiseBuf(dur + 0.05);
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = actx.createGain();
  env(g, t, Math.min(0.08, dur * 0.3), vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.1);
}
const sKick = (p) => { tone('sine', 160, 45, 0.18, 0.5 + p * 0.3); noise(0.06, 1800, 1, 0.25 + p * 0.2); };
const sBounce = (v) => tone('sine', 120, 60, 0.08, clamp(v * 0.05, 0.02, 0.2));
const sThunk = (v) => { tone('square', 90, 50, 0.07, clamp(v * 0.02, 0.01, 0.08)); noise(0.08, 900, 2, clamp(v * 0.03, 0.02, 0.15)); };
const sPoof = () => noise(0.5, 2500, 0.6, 0.25, 0, 'highpass');
const sWhistle = () => { for (let i = 0; i < 3; i++) { tone('sine', 2400, 2600, i === 2 ? 0.6 : 0.15, 0.12, i * 0.22); tone('sine', 2470, 2550, i === 2 ? 0.6 : 0.15, 0.06, i * 0.22); } };
const sCheer = () => { noise(1.8, 1200, 0.5, 0.25); noise(1.5, 600, 0.7, 0.18, 0.1); };
const sBark = () => { tone('sawtooth', 520, 260, 0.12, 0.12); tone('sawtooth', 500, 250, 0.12, 0.12, 0.18); };
const sMeow = () => tone('triangle', 700, 1000, 0.35, 0.08);
const sChirp = () => { const f = R(2800, 4200); for (let i = 0; i < 3; i++) tone('sine', f, f * 1.35, 0.07, 0.04, i * 0.11); };
const sPop = () => tone('sine', 600, 1200, 0.12, 0.15);
const sFlap = () => noise(0.3, 800, 0.8, 0.08);

// ---------------------------------------------------------------- UI helpers
const bubbles = [];
function say(actor, text, dur = 2.8, name = actor.name) {
  for (const b of bubbles.filter((b) => b.actor === actor)) b.t = 0;
  const el = document.createElement('div'); el.className = 'bubble'; el.innerHTML = (name ? `<b>${name}</b>` : '') + text; $('bubbles').appendChild(el);
  bubbles.push({ actor, el, t: dur });
}
const tmpV = new V3();
function updateBubbles(dt) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    (b.actor.headWorld ? b.actor.headWorld(tmpV) : tmpV.copy(b.actor.root.position).add(new V3(0, 0.9, 0)));
    tmpV.project(camera);
    b.el.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    b.el.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    b.el.style.opacity = Math.min(1, b.t * 3);
  }
}
let toastT = 0;
function toast(html, dur = 4) { $('toast').innerHTML = html; $('toast').classList.add('show'); toastT = dur; }
let bigT = 0;
function bigText(txt, dur = 2) { $('big').textContent = txt; $('big').classList.add('show'); bigT = dur; }

// ---------------------------------------------------------------- input
const keys = {};
const touch = { active: false, x: 0, y: 0, run: false };
let kickHeld = false, kickPressed = false, kickReleased = false;
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'Space') { kickHeld = true; kickPressed = true; }
  if (e.code === 'Enter' || e.code === 'Escape') skipIntro();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR') resetBallToPlayer();
  if (e.code === 'KeyE') usePressed = true;
  if (e.code === 'KeyH') { const h = $('help'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') { kickHeld = false; kickReleased = true; } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
window.addEventListener('wheel', (e) => { viewSizeTarget = clamp(viewSizeTarget * (e.deltaY > 0 ? 1.1 : 0.9), 5, 24); }, { passive: true });
function toggleMute() { muted = !muted; $('muteBtn').textContent = muted ? '🔇' : '🔊'; }
$('muteBtn').onclick = toggleMute;
$('skipBtn').onclick = () => skipIntro();
// touch joystick
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) {
  const joy = $('joy'), knob = $('joyKnob'); let jid = null, jcx = 0, jcy = 0;
  joy.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); jcx = r.left + r.width / 2; jcy = r.top + r.height / 2; touch.active = true; e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { let dx = (t.clientX - jcx) / 55, dy = (t.clientY - jcy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } touch.x = dx; touch.y = -dy; knob.style.left = (45 + dx * 45) + 'px'; knob.style.top = (45 - touch.y * 45) + 'px'; } }, { passive: false });
  window.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; touch.active = false; touch.x = touch.y = 0; knob.style.left = '45px'; knob.style.top = '45px'; } });
  $('kickBtn').addEventListener('touchstart', (e) => { kickHeld = true; kickPressed = true; e.preventDefault(); }, { passive: false });
  $('kickBtn').addEventListener('touchend', (e) => { kickHeld = false; kickReleased = true; e.preventDefault(); }, { passive: false });
  $('useBtn').addEventListener('touchstart', (e) => { usePressed = true; e.preventDefault(); }, { passive: false });
  $('runBtn').addEventListener('touchstart', (e) => { touch.run = !touch.run; $('runBtn').style.background = touch.run ? 'rgba(255,122,61,.85)' : ''; e.preventDefault(); }, { passive: false });
}

// ---------------------------------------------------------------- game state
let petya, angi, petike, rigs = {}, rollerModel;
const roller = { group: new THREE.Group(), pos: new V3(), heading: 0, path: null, speed: 1.6, t: 0, rider: null, lean: 0, weaveAmp: 0 };
const ball = { mesh: null, pos: new V3(0, -10, 0), vel: new V3(), r: 0.17, active: false, scale: 1, hitCd: 0 };
let mode = 'loading'; // 'intro' | 'play'
let score = 0, goalLock = 0;
const npcs = [], animals = [], pigeons = [], cars = [];

// ---------------------------------------------------------------- ball
function makeBall() {
  const g = new THREE.IcosahedronGeometry(1, 1); const pos = g.attributes.position; const cols = [];
  const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position; const verts = [];
  for (let i = 0; i < ico.count; i++) { const v = new V3().fromBufferAttribute(ico, i).normalize(); if (!verts.some((u) => u.distanceTo(v) < 0.01)) verts.push(v); }
  const c = new V3(), a = new V3(), b = new V3(), d = new V3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); d.fromBufferAttribute(pos, i + 2); c.copy(a).add(b).add(d).normalize();
    const black = verts.some((v) => v.dot(c) > 0.93); const col = black ? [0.03, 0.03, 0.04] : [0.95, 0.95, 0.95];
    for (let k = 0; k < 3; k++) cols.push(...col);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.scale.setScalar(ball.r); m.castShadow = true; m.visible = false; scene.add(m); ball.mesh = m;
}
function spawnBall(x, y, z, vx = 0, vy = 0, vz = 0) {
  ball.pos.set(x, y, z); ball.vel.set(vx, vy, vz); ball.active = true; ball.mesh.visible = true; ball.scale = 0.01; sPop();
}
function resetBallToPlayer() {
  if (mode !== 'play') return;
  const f = new V3(Math.sin(petike.heading), 0, Math.cos(petike.heading));
  spawnBall(petike.pos.x + f.x * 0.7, 0.9, petike.pos.z + f.z * 0.7, f.x * 0.5, 1.5, f.z * 0.5);
}
const axis = new V3(), q = new THREE.Quaternion();
function updateBall(dt) {
  if (!ball.active) return;
  ball.scale = Math.min(1, ball.scale + dt * 5); ball.mesh.scale.setScalar(ball.r * (0.4 + 0.6 * smooth(ball.scale)));
  ball.hitCd -= dt;
  const steps = 3, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    ball.vel.y -= 9.81 * h;
    ball.pos.addScaledVector(ball.vel, h);
    const g = groundH(ball.pos.x, ball.pos.z);
    let onGround = false;
    if (ball.pos.y < g + ball.r) {
      ball.pos.y = g + ball.r;
      if (ball.vel.y < -1.0) { sBounce(-ball.vel.y); ball.vel.y = -ball.vel.y * 0.55; ball.vel.x *= 0.92; ball.vel.z *= 0.92; }
      else { ball.vel.y = 0; onGround = true; }
    }
    const fr = Math.exp(-(onGround ? 0.9 : 0.08) * h); ball.vel.x *= fr; ball.vel.z *= fr;
    if (onGround && Math.hypot(ball.vel.x, ball.vel.z) < 0.06) { ball.vel.x = 0; ball.vel.z = 0; }
    collide(ball.pos, ball.r, ball.pos.y - ball.r, (nx, nz, c) => {
      const vn = ball.vel.x * nx + ball.vel.z * nz;
      if (vn < 0) { const k = 1 + c.e; ball.vel.x -= k * vn * nx; ball.vel.z -= k * vn * nz; if (c.e < 0.3) { ball.vel.x *= 0.5; ball.vel.z *= 0.5; ball.vel.y *= 0.5; } else if (-vn > 1.5) sThunk(-vn); }
    });
    // bounce off people (not Petike)
    if (ball.pos.y < 1.7) for (const a of actors) {
      if (a === petike || !a.solid) continue; const p = a.riding ? roller.pos : a.pos;
      const dx = ball.pos.x - p.x, dz = ball.pos.z - p.z; const d = Math.hypot(dx, dz); const m = 0.3 + ball.r;
      if (d < m && d > 1e-4) {
        const nx = dx / d, nz = dz / d; ball.pos.x = p.x + nx * m; ball.pos.z = p.z + nz * m;
        const vn = ball.vel.x * nx + ball.vel.z * nz;
        if (vn < 0) { ball.vel.x -= 1.5 * vn * nx; ball.vel.z -= 1.5 * vn * nz; if (-vn > 2.5 && ball.hitCd <= 0 && a.sit < 0.5) { ball.hitCd = 2; say(a, pick(['Hé, vigyázz!', 'Hoppá!', 'Jó lövés volt, csak nem felém!', 'Au!']), 2); } }
      }
    }
  }
  // world bounds
  if (ball.pos.x < GX0 + 1 || ball.pos.x > GX1 - 1 || ball.pos.z < GZ0 + 1 || ball.pos.z > GZ1 - 1) { ball.vel.set(0, 0, 0); resetBallToPlayer(); }
  // rolling rotation
  const sp = Math.hypot(ball.vel.x, ball.vel.z);
  if (sp > 0.01) { axis.set(ball.vel.z, 0, -ball.vel.x).normalize(); q.setFromAxisAngle(axis, sp * dt / ball.r); ball.mesh.quaternion.premultiply(q); }
  ball.mesh.position.copy(ball.pos);
  checkGoal(dt);
}
function checkGoal(dt) {
  if (goalLock > 0) {
    goalLock -= dt;
    if (goalLock <= 0) { spawnBall(PITCH.cx, 2.2, PITCH.cz, 0, 0, 0); }
    return;
  }
  if (mode !== 'play') return;
  for (const g of GOALS) {
    const beyond = g.dir < 0 ? ball.pos.x < g.x - ball.r * 0.5 : ball.pos.x > g.x + ball.r * 0.5;
    const inside = g.dir < 0 ? ball.pos.x > g.x - GOAL_D - 0.2 : ball.pos.x < g.x + GOAL_D + 0.2;
    if (beyond && inside && Math.abs(ball.pos.z) < GOAL_HW && ball.pos.y < GOAL_H) { goal(g); break; }
  }
}
function goal(g) {
  score++; $('score').textContent = score; goalLock = 3.2;
  bigText(pick(['GÓÓÓL!', 'GÓÓÓL!', 'BOMBA!', 'GÓL! GÓL!']), 2.2);
  sWhistle(); setTimeout(sCheer, 300);
  confetti(g.x + g.dir * 0.5, 0);
  angi.cheer = 2.6; petike.cheer = 1.6;
  if (petyaMode === 'bench') { petya.point = 1.6; say(petya, pick(GOAL_GRUMBLE), 2.8); dad.talkT = 4.5; }
  setTimeout(() => say(angi, pick(['Ügyes vagy, kicsim!', 'Bravó, Petike!', 'Gyönyörű volt!', 'Juhééé!']), 2.5), 1300);
  for (const n of npcs) if (n.actor.pos.distanceTo(petike.pos) < 18 && rand() < 0.5) setTimeout(() => say(n.actor, pick(['Szép gól!', 'Bravó!', 'Hű!']), 1.8, ''), R(300, 1200));
}

// ---------------------------------------------------------------- player control
const CAM_FWD = new V3(-1, 0, -1).normalize(), CAM_RIGHT = new V3(1, 0, -1).normalize();
const pvel = new V3();
let charge = 0, charging = false, kickPower = 0, kickDone = false;
function updatePlayer(dt) {
  if (pstate === 'riding') return updateRiding(dt);
  if (pstate === 'toDrink' || pstate === 'drinking') return updateDrinking(dt);
  if (interactions()) return;
  const a = petike;
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const il = Math.hypot(wx, wz); if (il > 1) { wx /= il; wz /= il; }
  const sprint = keys.ShiftLeft || keys.ShiftRight || touch.run;
  const maxSp = (sprint ? 5.4 : 3.3) * (charging ? 0.6 : 1);
  pvel.x = damp(pvel.x, wx * maxSp, 10, dt); pvel.z = damp(pvel.z, wz * maxSp, 10, dt);
  a.pos.x += pvel.x * dt; a.pos.z += pvel.z * dt;
  collide(a.pos, 0.26, 0, null);
  a.pos.x = clamp(a.pos.x, GX0 + 1, GX1 - 1); a.pos.z = clamp(a.pos.z, GZ0 + 1, GZ1 - 1);
  const spd = Math.hypot(pvel.x, pvel.z);
  if (il > 0.1) a.targetHeading = Math.atan2(wx, wz);
  a.heading = dampAngle(a.heading, a.targetHeading, 14, dt);
  a.animate(dt, spd > 0.25, spd);

  // kick input
  if (kickPressed) { charging = true; charge = 0; }
  if (charging) { charge = Math.min(1, charge + dt / 0.9); }
  if (kickReleased && charging) { charging = false; kickPower = charge; a.kickT = 0; kickDone = false; }
  kickPressed = kickReleased = false;
  $('charge').style.display = charging ? 'block' : 'none'; $('charge').firstElementChild.style.width = (charge * 100) + '%';

  const fx_ = Math.sin(a.heading), fz_ = Math.cos(a.heading);
  if (a.kickT >= 0) {
    a.kickT += dt; const t = a.kickT / 0.42; const r = a.rig;
    let hp, kn;
    if (t < 0.4) { const k = smooth(t / 0.4); hp = lerp(0, 0.8, k); kn = lerp(0, 1.3, k); }
    else if (t < 0.6) { const k = (t - 0.4) / 0.2; hp = lerp(0.8, -1.3, k); kn = lerp(1.3, 0.05, k); }
    else { const k = smooth(Math.min(1, (t - 0.6) / 0.4)); hp = lerp(-1.3, 0, k); kn = lerp(0.05, 0, k); }
    r.hip[0].rotation.x = hp; r.knee[0].rotation.x = kn; r.hip[1].rotation.x = 0.1; r.knee[1].rotation.x = 0.15;
    r.sh[1].rotation.x = hp * 0.6; r.sh[0].rotation.x = -hp * 0.4; r.sh[0].rotation.z = -0.3; r.sh[1].rotation.z = 0.3;
    if (!kickDone && t >= 0.5) { kickDone = true; tryKick(fx_, fz_); }
    if (t >= 1) a.kickT = -1;
  }

  // dribble / body contact with the ball
  if (ball.active && ball.pos.y < 0.55 + ball.r && goalLock <= 0) {
    const fpX = a.pos.x + fx_ * 0.3, fpZ = a.pos.z + fz_ * 0.3;
    const dx = ball.pos.x - fpX, dz = ball.pos.z - fpZ; const d = Math.hypot(dx, dz);
    if (a.kickT < 0 && d < 0.2 + ball.r && spd > 0.4) {
      const bs = Math.hypot(ball.vel.x, ball.vel.z);
      const want = spd * 1.3 + 0.5;
      if (bs < want) { ball.vel.x = pvel.x / spd * want + dx * 2; ball.vel.z = pvel.z / spd * want + dz * 2; }
    }
    const bx = ball.pos.x - a.pos.x, bz = ball.pos.z - a.pos.z; const bd = Math.hypot(bx, bz); const m = 0.24 + ball.r;
    if (bd < m && bd > 1e-4) {
      const nx = bx / bd, nz = bz / bd; ball.pos.x = a.pos.x + nx * m; ball.pos.z = a.pos.z + nz * m;
      const vn = ball.vel.x * nx + ball.vel.z * nz; const pv = pvel.x * nx + pvel.z * nz;
      if (vn < pv) { ball.vel.x += (pv - vn + 0.3) * nx; ball.vel.z += (pv - vn + 0.3) * nz; }
    }
  }
  a.sync();
}
function tryKick(fx_, fz_) {
  const a = petike; const p = kickPower;
  if (!ball.active || goalLock > 0) { tone('sine', 300, 200, 0.06, 0.05); return; }
  const dx = ball.pos.x - a.pos.x, dz = ball.pos.z - a.pos.z; const d = Math.hypot(dx, dz);
  const facing = d > 1e-3 ? (dx * fx_ + dz * fz_) / d : 1;
  if (d < 1.05 && ball.pos.y < 1.0 && (facing > 0.15 || d < 0.45)) {
    const pow = 4.5 + 13 * p;
    ball.vel.x = fx_ * pow + pvel.x * 0.3; ball.vel.z = fz_ * pow + pvel.z * 0.3;
    ball.vel.y = p > 0.5 ? 2 + (p - 0.5) * 12 : 0.6 + p;
    ball.pos.y = Math.max(ball.pos.y, ball.r + 0.02);
    sKick(p);
    const gx = fx_ > 0 ? PITCH.x1 : PITCH.x0, gdx = gx - ball.pos.x, gdz = -ball.pos.z, gl = Math.hypot(gdx, gdz) || 1;
    lastKick = { t: clockT, power: p, toward: (fx_ * gdx + fz_ * gdz) / gl > 0.9 };
    for (let i = 0; i < 6; i++) spawnFx(new V3(ball.pos.x, 0.1, ball.pos.z), new V3(R(-1, 1), R(0.5, 1.5), R(-1, 1)), 0x6bb94e, 0.06, 0.4, 5);
  } else { tone('sine', 300, 200, 0.06, 0.05); lastKick = { t: clockT, power: -1 }; }
}

// ---------------------------------------------------------------- roller (scooter)
// rider stances: legacy = original petike_roller.glb (has a 0.12 rad yaw baked in), skinned = rigged T-pose model
const RIDE_LEGACY = { x: 0.06, z: 0.16, ry: -0.12, lean: 0.15, front: -0.14, back: 0.22, sh: -0.9, shz: 0.05 };
const RIDE_SKINNED = { x: 0.0, z: 0.14, ry: 0, lean: 0.15, front: -0.14, back: 0.22, sh: -0.6, shz: 0.05, elbow: 0.3 };
function rollerRide(dt) {
  const ro = roller;
  if (ro.path) {
    const t = ro.path[0]; const dx = t.x - ro.base.x, dz = t.z - ro.base.z; const d = Math.hypot(dx, dz); const st = ro.speed * dt;
    if (d <= st) { ro.base.x = t.x; ro.base.z = t.z; ro.path.shift(); if (!ro.path.length) ro.path = null; }
    else { ro.base.x += dx / d * st; ro.base.z += dz / d * st; ro.dir.set(dx / d, 0, dz / d); }
    ro.t += dt;
    ro.weaveAmp = damp(ro.weaveAmp, ro.path && ro.path.length > 1 ? 0.28 : 0, 1.5, dt);
  } else ro.weaveAmp = damp(ro.weaveAmp, 0, 3, dt);
  const w = Math.sin(ro.t * 0.9) * ro.weaveAmp;
  const nx = ro.base.x - ro.dir.z * w, nz = ro.base.z + ro.dir.x * w;
  const mdx = nx - ro.pos.x, mdz = nz - ro.pos.z; const mv = Math.hypot(mdx, mdz);
  if (mv > 1e-4) { const th = Math.atan2(mdx, mdz); const turn = angDiff(ro.heading, th); ro.heading = dampAngle(ro.heading, th, 8, dt); ro.lean = damp(ro.lean, clamp(-turn * 6, -0.25, 0.25), 6, dt); }
  ro.pos.set(nx, 0, nz);
  ro.group.position.set(ro.pos.x, groundH(ro.pos.x, ro.pos.z), ro.pos.z);
  ro.group.rotation.set(0, ro.heading, ro.lean, 'YXZ');
  poseRider(ro);
}
function poseRider(ro) {
  if (ro.rider) {
    // electric scooter: both feet stay on the deck, one in front of the other
    const r = ro.rider.rig; resetPose(r);
    const moving = !!ro.path || Math.abs(ro.speed) > 0.2; const vib = moving ? Math.sin(ro.t * 38) * 0.004 : 0;
    // stance measured against the handlebar grips (±0.2 m, 0.75 m high, 0.46 m ahead of the deck centre)
    const P = r.skinned ? RIDE_SKINNED : RIDE_LEGACY;
    r.inner.rotation.x = P.lean;
    r.hip[1].rotation.x = P.front; r.hip[0].rotation.x = P.back; // front (left) foot / back (right) foot
    r.hip[1].rotation.z = 0.03; r.hip[0].rotation.z = -0.03;
    r.sh[0].rotation.x = P.sh; r.sh[1].rotation.x = P.sh; r.sh[0].rotation.z = -P.shz; r.sh[1].rotation.z = P.shz;
    if (r.elbow) r.elbow[0] = r.elbow[1] = P.elbow || 0;
    r.root.position.set(P.x, 0.15 + vib, P.z); r.root.rotation.y = P.ry;
    if (r.apply) r.apply();
  }
}

// ---------------------------------------------------------------- NPCs & animals
const LOOP = [[-18, -6], [18, -6], [18, 6], [-18, 6]];
const loopSegs = LOOP.map((p, i) => { const b = LOOP[(i + 1) % LOOP.length]; return { a: p, b, len: Math.hypot(b[0] - p[0], b[1] - p[1]) }; });
const LOOP_LEN = loopSegs.reduce((s, x) => s + x.len, 0);
function loopPoint(s) {
  s = ((s % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
  for (const g of loopSegs) { if (s <= g.len) { const t = s / g.len; const dx = (g.b[0] - g.a[0]) / g.len, dz = (g.b[1] - g.a[1]) / g.len; return { x: g.a[0] + (g.b[0] - g.a[0]) * t, z: g.a[1] + (g.b[1] - g.a[1]) * t, dx, dz }; } s -= g.len; }
  return { x: LOOP[0][0], z: LOOP[0][1], dx: 1, dz: 0 };
}
let CAR_IDX = 0;
function buildPeople() {
  for (let i = 0; i < 9; i++) {
    const old = rand() < 0.25;
    const act = new Actor(makePerson(old ? { hair: pick([0xb0b0b0, 0xe8e8e8]), glasses: true, scale: 0.96 } : {}), '');
    act.stride = 4.2; act.solid = true;
    const dir = rand() < 0.5 ? 1 : -1;
    npcs.push({ actor: act, type: 'loop', s: i * LOOP_LEN / 9 + R(0, 4), dir, speed: old ? R(0.7, 0.9) : R(1.0, 1.45), lane: R(0.2, 0.55) * (dir > 0 ? 1 : -1), pause: 0 });
  }
  // sidewalk walkers
  for (let i = 0; i < 4; i++) {
    const act = new Actor(makePerson({}), ''); act.solid = true;
    const z = i % 2 ? 13.5 : 18.5; const x = R(-40, 50);
    npcs.push({ actor: act, type: 'street', x, z, dir: rand() < 0.5 ? 1 : -1, speed: R(1.0, 1.4) });
  }
  // two elderly people sitting on park benches
  for (const bi of [0, 3]) {
    const b = benchSpots[bi]; const act = new Actor(makePerson({ hair: pick([0xd8d8d8, 0xb0b0b0]), glasses: true, hat: bi === 0 }), '');
    const [x, z] = L(b.x, b.z, b.rot, -0.45, -0.05); act.place(x, z, b.rot); act.sit = 1; act.sitTarget = 1;
    npcs.push({ actor: act, type: 'sit', b });
  }
  // dogs: two with owners, one free
  const dogCols = [[0xc68642, 0x8a5a2b], [0x2b2b2b, 0xf0f0f0], [0xe6c27a, 0xb08850], [0xffffff, 0x8a5a2b]];
  for (const owner of [npcs[1], npcs[5]]) {
    const [ca, cb] = pick(dogCols); const d = makeDog(ca, cb, R(0.9, 1.15)); scene.add(d.root);
    const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), new THREE.LineBasicMaterial({ color: 0xc0392b })); scene.add(leash);
    animals.push({ a: d, type: 'leashed', owner: owner.actor, pos: owner.actor.pos.clone(), heading: 0, phase: 0, leash, barkCd: 0 });
  }
  const free = makeDog(0xe6c27a, 0xb08850, 1.2); scene.add(free.root);
  animals.push({ a: free, type: 'free', pos: new V3(-8, 0, 4), heading: 0, phase: 0, target: new V3(-8, 0, 4), wait: 0, speed: 2.4, barkCd: 0 });
  // cats
  for (const [c1, c2, x, z] of [[0xf4a261, 0xffffff, -12, 9], [0x3a3a3a, 0x3a3a3a, 14, -9], [0xd9d9d9, 0x8a8a8a, -20, -2]]) {
    const c = makeCat(c1, c2); scene.add(c.root);
    animals.push({ a: c, type: 'cat', pos: new V3(x, 0, z), heading: rand() * 6, phase: 0, target: new V3(x, 0, z), wait: R(1, 5), speed: 0.7, flee: 0 });
  }
  // pigeons around the fountain
  for (let i = 0; i < 7; i++) {
    const p = makePigeon(); scene.add(p.root); const a = rand() * Math.PI * 2, rr = R(3.2, 4.4);
    pigeons.push({ p, pos: new V3(Math.cos(a) * rr, 0, Math.sin(a) * rr), home: new V3(Math.cos(a) * rr, 0, Math.sin(a) * rr), heading: rand() * 6, state: 'idle', t: R(0, 3), vel: new V3(), y: 0 });
  }
  // cars
  for (const [z, dir, col, x] of [[15, 1, 0xe63946, -30], [17, -1, 0x3a86ff, 20], [15, 1, 0xffbe0b, 30]]) {
    const g = new THREE.Mesh(getGeometry('car', CAR_IDX++ % 6), vcMat); g.castShadow = true; g.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(g); scene.add(grp);
    cars.push({ g: grp, x, z, dir, speed: R(5, 7) });
  }
}
function updateNPCs(dt) {
  for (const n of npcs) {
    const a = n.actor;
    if (n.type === 'loop') {
      if (n.pause > 0) { n.pause -= dt; a.animate(dt, false, 0); a.sync(); continue; }
      n.s += n.dir * n.speed * dt;
      const p = loopPoint(n.s); const fx = p.dx * n.dir, fz = p.dz * n.dir;
      a.pos.set(p.x - p.dz * n.lane, 0, p.z + p.dx * n.lane);
      a.targetHeading = Math.atan2(fx, fz); a.heading = dampAngle(a.heading, a.targetHeading, 5, dt);
      a.animate(dt, true, n.speed); a.sync();
      if (rand() < dt * 0.02) { n.pause = R(1.5, 4); }
    } else if (n.type === 'street') {
      n.x += n.dir * n.speed * dt; if (n.x > 58) n.dir = -1; if (n.x < -48) n.dir = 1;
      a.pos.set(n.x, 0, n.z); a.targetHeading = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2; a.heading = dampAngle(a.heading, a.targetHeading, 4, dt);
      a.animate(dt, true, n.speed); a.sync();
    } else if (n.type === 'sit') { a.animate(dt, false, 0); if (rand() < dt * 0.05) a.rig.sh[0].rotation.x = -0.9; a.sync(); }
  }
}
function threatNear(p, r) {
  if (petike && petike.pos.distanceTo(p) < r) return petike.pos;
  if (ball.active && Math.hypot(ball.pos.x - p.x, ball.pos.z - p.z) < r) return ball.pos;
  return null;
}
function updateAnimals(dt) {
  for (const an of animals) {
    const a = an.a; let moving = 0, spd = 0;
    an.barkCd = (an.barkCd || 0) - dt;
    if (an.type === 'leashed') {
      const o = an.owner; const h = o.heading; const tx = o.pos.x + Math.cos(h) * 0.75 - Math.sin(h) * 0.35, tz = o.pos.z - Math.sin(h) * 0.75 - Math.cos(h) * 0.35;
      const dx = tx - an.pos.x, dz = tz - an.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.08) { spd = Math.min(3.2, d * 3); an.pos.x += dx / d * spd * dt; an.pos.z += dz / d * spd * dt; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 6, dt); moving = 1; }
      const hp = new V3(); o.rig.sh[1].getWorldPosition(hp); hp.y -= 0.45;
      const cp = new V3(an.pos.x + Math.sin(an.heading) * 0.2 * a.s, 0.38 * a.s, an.pos.z + Math.cos(an.heading) * 0.2 * a.s);
      an.leash.geometry.setFromPoints([hp, cp]);
      if (ball.active && an.barkCd <= 0 && Math.hypot(ball.pos.x - an.pos.x, ball.pos.z - an.pos.z) < 3 && Math.hypot(ball.vel.x, ball.vel.z) > 2) { an.barkCd = 6; sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.0, an.pos.z) }, 'Vau! Vau!', 1.4, ''); }
    } else if (an.type === 'free') {
      const th = ball.active && Math.hypot(ball.pos.x - an.pos.x, ball.pos.z - an.pos.z) < 5 && Math.hypot(ball.vel.x, ball.vel.z) > 1.5;
      if (th) { an.target.set(ball.pos.x + R(-1, 1), 0, ball.pos.z + R(-1, 1)); an.wait = 0; if (an.barkCd <= 0) { an.barkCd = 5; sBark(); say({ headWorld: (v) => v.set(an.pos.x, 1.1, an.pos.z) }, 'Vau!', 1.2, ''); } }
      const dx = an.target.x - an.pos.x, dz = an.target.z - an.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.3) { spd = th ? 4 : an.speed; an.pos.x += dx / d * spd * dt; an.pos.z += dz / d * spd * dt; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 6, dt); moving = 1; }
      else { an.wait -= dt; if (an.wait <= 0) { an.target.set(R(-20, 20), 0, R(-9, 10)); if (Math.hypot(an.target.x, an.target.z) < 3.5) an.target.x += 6; an.wait = R(1, 4); } }
      collide(an.pos, 0.3, 0, null);
    } else if (an.type === 'cat') {
      const t = threatNear(an.pos, 2.4);
      if (t) { const dx = an.pos.x - t.x, dz = an.pos.z - t.z; const d = Math.hypot(dx, dz) || 1; an.target.set(an.pos.x + dx / d * 5, 0, an.pos.z + dz / d * 5); an.flee = 1.5; if (an.barkCd <= 0) { an.barkCd = 8; sMeow(); say({ headWorld: (v) => v.set(an.pos.x, 0.8, an.pos.z) }, 'Miaú!', 1.2, ''); } }
      an.flee -= dt;
      const dx = an.target.x - an.pos.x, dz = an.target.z - an.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.2) { spd = an.flee > 0 ? 4.2 : an.speed; an.pos.x += dx / d * spd * dt; an.pos.z += dz / d * spd * dt; an.heading = dampAngle(an.heading, Math.atan2(dx, dz), 7, dt); moving = 1; }
      else { an.wait -= dt; if (an.wait <= 0) { an.target.set(clamp(an.pos.x + R(-5, 5), -21, 21), 0, clamp(an.pos.z + R(-5, 5), -9, 10)); an.wait = R(2, 8); } }
      collide(an.pos, 0.2, 0, null);
    }
    an.phase += dt * spd * (an.type === 'cat' ? 9 : 7);
    animLegs(a, an.phase, moving);
    a.tail.rotation.z = Math.sin(clockT * (an.type === 'cat' ? 2 : 12)) * (an.type === 'cat' ? 0.25 : 0.5);
    if (an.type === 'cat' && !moving) { a.legs[2].rotation.x = -1.2; a.legs[3].rotation.x = -1.2; a.body.rotation.x = -0.3; a.body.position.y = -0.04; } else a.body.rotation.x = 0;
    a.root.position.set(an.pos.x, groundH(an.pos.x, an.pos.z), an.pos.z); a.root.rotation.y = an.heading;
  }
  // pigeons
  for (const pg of pigeons) {
    const p = pg.p; pg.t -= dt;
    if (pg.state === 'idle') {
      p.head.rotation.x = Math.max(0, Math.sin(clockT * 6 + pg.home.x)) * 0.8;
      if (pg.t <= 0) { pg.heading += R(-1.5, 1.5); pg.t = R(0.6, 2.5); }
      pg.pos.x += Math.sin(pg.heading) * 0.15 * dt; pg.pos.z += Math.cos(pg.heading) * 0.15 * dt;
      if (pg.pos.distanceTo(pg.home) > 1.2) pg.heading = Math.atan2(pg.home.x - pg.pos.x, pg.home.z - pg.pos.z);
      const th = threatNear(pg.pos, 2.6) || (animals[2] && animals[2].pos.distanceTo(pg.pos) < 2 ? animals[2].pos : null);
      if (th) { pg.state = 'fly'; pg.t = 6; const a = rand() * Math.PI * 2; pg.vel.set(Math.cos(a) * 4, 3.5, Math.sin(a) * 4); pg.heading = Math.atan2(pg.vel.x, pg.vel.z); if (rand() < 0.3) sFlap(); }
    } else if (pg.state === 'fly') {
      pg.pos.addScaledVector(pg.vel, dt); pg.y += pg.vel.y * dt;
      for (const w of p.wings) w.rotation.z = Math.sin(clockT * 30) * 0.9 * (w.position.x > 0 ? 1 : -1);
      if (pg.t <= 0) { pg.state = 'return'; }
    } else {
      const dx = pg.home.x - pg.pos.x, dz = pg.home.z - pg.pos.z; const d = Math.hypot(dx, dz);
      pg.heading = Math.atan2(dx, dz); const sp = Math.min(5, d * 1.5 + 0.5);
      if (d > 0.1) { pg.pos.x += dx / d * sp * dt; pg.pos.z += dz / d * sp * dt; }
      pg.y = damp(pg.y, 0, 1.5, dt);
      for (const w of p.wings) w.rotation.z = Math.sin(clockT * 30) * 0.9 * (w.position.x > 0 ? 1 : -1);
      if (d < 0.15 && pg.y < 0.05 && !threatNear(pg.home, 3)) { pg.state = 'idle'; pg.y = 0; pg.t = 1; for (const w of p.wings) w.rotation.z = 0; }
    }
    p.root.position.set(pg.pos.x, groundH(pg.pos.x, pg.pos.z) + pg.y, pg.pos.z); p.root.rotation.y = pg.heading;
  }
  for (const c of cars) { c.x += c.dir * c.speed * dt; if (c.x > GX1 + 4) c.x = GX0 - 4; if (c.x < GX0 - 4) c.x = GX1 + 4; c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
}
// fountain water
let jetT = 0;
function updateFountain(dt) {
  jetT -= dt; while (jetT < 0) { jetT += 0.035; const a = rand() * Math.PI * 2; spawnFx(new V3(FOUNTAIN.x, 2.5, FOUNTAIN.z), new V3(Math.cos(a) * R(0.6, 1.0), R(2.2, 3), Math.sin(a) * R(0.6, 1.0)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2]), 0.08, 1.1, 6); }
}

// ---------------------------------------------------------------- cutscene system
const SKIP = { skip: true };
const waiters = [], tweens = [];
const cs = { skip: false, done: false };
function W(t) { return new Promise((res, rej) => waiters.push({ t, res, rej })); }
function until(fn) { return new Promise((res, rej) => waiters.push({ fn, res, rej })); }
function tween(dur, fn) { return new Promise((res, rej) => tweens.push({ t: 0, dur, fn, res, rej })); }
function tickCutscene(dt) {
  for (let i = waiters.length - 1; i >= 0; i--) {
    const w = waiters[i];
    if (cs.skip) { waiters.splice(i, 1); w.rej(SKIP); continue; }
    if (w.fn ? w.fn() : (w.t -= dt) <= 0) { waiters.splice(i, 1); w.res(); }
  }
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (cs.skip) { tweens.splice(i, 1); tw.rej(SKIP); continue; }
    tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
function skipIntro() { if (mode === 'intro' && !cs.done) { cs.skip = true; } }
function offsetPath(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    return [p[0] - dz * d, p[1] + dx * d];
  });
}
const SEAT = { angi: L(FAMILY_BENCH.x, FAMILY_BENCH.z, 0, -0.45, -0.05), petya: L(FAMILY_BENCH.x, FAMILY_BENCH.z, 0, 0.45, -0.05) };
const LEAN = { x: 34.55, z: -12.55, heading: Math.PI, lean: -0.24 };
const PLAY_START = [31, -6.6];

function mountRider() {
  roller.rider = petike; petike.riding = true;
  scene.remove(petike.rig.root); roller.group.add(petike.rig.root); petike.rig.root.rotation.set(0, 0, 0);
}
function dismount(x, z) {
  if (!roller.rider) return;
  const r = petike.rig; roller.group.remove(r.root); scene.add(r.root); resetPose(r);
  roller.rider = null; petike.riding = false; petike.place(x, z, roller.heading);
}

async function introDialog() {
  try {
    await W(1.0); say(petya, 'Milyen szép idő van ma a parkban!', 3);
    await W(3.4); say(angi, 'Petike, ne rollerezz olyan gyorsan!', 3);
    await W(3.3); say(petike, 'Jó, anya! De siessünk, focizni akarok!', 3.2);
    await W(5.0); say(petya, 'Nézd, ott van már a focipálya!', 3);
    await W(4.6); say(angi, 'Ott egy pad, leülünk mellé.', 2.8);
  } catch (e) { /* skipped */ }
}
async function runIntro() {
  mode = 'intro'; $('skipBtn').style.display = 'block';
  toast('Nyomj <b>Entert</b> vagy a <b>Kihagyás</b> gombot a jelenet átugrásához', 4);
  const route = [[-4, -6], [18, -6], [22.5, -11], [33, -11]];
  const pR = offsetPath(route, 0.42), aR = offsetPath(route, -0.42);
  petya.place(pR[0][0], pR[0][1], Math.PI / 2); angi.place(aR[0][0], aR[0][1], Math.PI / 2);
  petya.walkTo(pR.slice(1), 1.55); angi.walkTo(aR.slice(1), 1.55);
  roller.base = new V3(-8.6, 0, -6); roller.pos.copy(roller.base); roller.dir = new V3(1, 0, 0); roller.heading = Math.PI / 2; roller.t = 0;
  roller.path = [...route.slice(1), [35.4, -11.1]].map((p) => new V3(p[0], 0, p[1])); roller.speed = 1.55;
  mountRider();
  introDialog();
  try {
    await until(() => !petya.path && !angi.path);
    angi.walkTo([[SEAT.angi[0], -11.85]], 1.1); petya.walkTo([[SEAT.petya[0], -11.85]], 1.1);
    await until(() => !petya.path && !angi.path);
    angi.targetHeading = 0; petya.targetHeading = 0; await W(0.6);
    angi.walkTo([SEAT.angi], 0.7, true); petya.walkTo([SEAT.petya], 0.7, true);
    await until(() => !petya.path && !angi.path);
    angi.sitTarget = 1; petya.sitTarget = 1;
    await W(0.8); say(angi, 'Végre egy kis pihenő!', 2.4);
    await until(() => !roller.path);
    await W(0.4);
    // Petike steps off and leans the roller against the bench
    dismount(35.4, -11.65);
    say(petike, 'Leteszem a rollert a padhoz!', 2.6);
    petike.walkTo([[35.75, -11.75]], 0.8);
    const r0 = { x: roller.pos.x, z: roller.pos.z, h: roller.heading };
    await tween(1.3, (k) => {
      const s = smooth(k);
      roller.pos.set(lerp(r0.x, LEAN.x, s), 0, lerp(r0.z, LEAN.z, s));
      roller.heading = r0.h + angDiff(r0.h, LEAN.heading) * s; roller.lean = LEAN.lean * s;
      roller.group.position.set(roller.pos.x, 0.03 * s, roller.pos.z); roller.group.rotation.set(0, roller.heading, roller.lean, 'YXZ');
    });
    petike.targetHeading = 0.5; await W(0.7);
    say(petike, 'Most átöltözöm focistának!', 2.2); await W(1.4);
    poof(petike.pos); await W(0.3);
    petike.setRig(rigs.foci); petike.stride = 6.5; petike.swing = 0.7;
    await W(1.0);
    say(petya, 'Nahát, igazi focista lett belőled!', 2.6); petya.cheer = 0.8;
    await W(1.6);
    petike.walkTo([[33.2, -11.1], [30, -10.6], [30, -8.4], PLAY_START], 2.2);
    await until(() => !petike.path);
    petike.targetHeading = Math.PI / 2 + 0.3; await W(0.4);
    say(petike, 'Hol is a labdám?… Megvan!', 2.2);
    await W(0.6);
    const f = new V3(Math.sin(petike.heading), 0, Math.cos(petike.heading));
    spawnBall(petike.pos.x + f.x * 0.35, 1.0, petike.pos.z + f.z * 0.35, f.x * 0.9, 2.4, f.z * 0.9);
    await W(1.4);
  } catch (e) { if (e !== SKIP) console.error(e); }
  finishIntro();
}
function finishIntro() {
  cs.done = true; waiters.length = 0; tweens.length = 0;
  // final, deterministic state (also used when skipping)
  petya.path = angi.path = null; petya.place(SEAT.petya[0], SEAT.petya[1], 0); angi.place(SEAT.angi[0], SEAT.angi[1], 0);
  petya.sit = petya.sitTarget = 1; angi.sit = angi.sitTarget = 1;
  if (roller.rider) dismount(PLAY_START[0], PLAY_START[1]);
  roller.path = null; roller.pos.set(LEAN.x, 0, LEAN.z); roller.heading = LEAN.heading; roller.lean = LEAN.lean;
  roller.group.position.set(LEAN.x, 0.03, LEAN.z); roller.group.rotation.set(0, LEAN.heading, LEAN.lean, 'YXZ');
  addCircleCol(LEAN.x, LEAN.z, 0.3, 1.0); rollerCol = colliders[colliders.length - 1]; roller.speed = 0;
  if (petike.rig !== rigs.foci) { petike.setRig(rigs.foci); petike.stride = 6.5; petike.swing = 0.7; }
  if (cs.skip) { petike.path = null; petike.place(PLAY_START[0], PLAY_START[1], Math.PI / 2 + 0.3); }
  petike.path = null; petike.solid = false;
  if (!ball.active) { const f = new V3(Math.sin(petike.heading), 0, Math.cos(petike.heading)); spawnBall(petike.pos.x + f.x * 0.9, 0.6, petike.pos.z + f.z * 0.9); }
  mode = 'play'; viewSizeTarget = 8.5;
  $('skipBtn').style.display = 'none'; $('hud').style.display = 'block'; $('help').style.display = 'block';
  if (isTouch) { $('touch').style.display = 'block'; $('help').style.display = 'none'; }
  toast('<b>Irányítsd Petikét!</b> Rúgj gólt a kapukba ⚽', 4.5);
}

// ---------------------------------------------------------------- play activities: drinking fountain, scooter, worried dad
const DRINK = { x: 28.3, z: -12.9, stand: [28.3, -12.36] };
let pstate = 'free';            // free | toDrink | drinking | riding
let usePressed = false, drinkT = 0, gulpT = 0, rollerCol = null, lastKick = null;
function setPrompt(txt) {
  const el = $('prompt'); if (el.textContent !== txt) el.textContent = txt;
  el.style.display = txt ? 'block' : 'none';
  if (isTouch) $('useBtn').style.display = txt ? 'block' : 'none';
}
// returns true when the player started an activity this frame
function interactions() {
  const p = petike.pos;
  const dDrink = Math.hypot(p.x - DRINK.x, p.z - DRINK.z), dRoll = Math.hypot(p.x - roller.pos.x, p.z - roller.pos.z);
  const canDrink = dDrink < 1.6, canRide = dRoll < 1.5 && !roller.rider;
  setPrompt(canDrink ? 'E – inni az ivókútból' : canRide ? 'E – felszállni a rollerre' : '');
  if (!usePressed) return false;
  usePressed = false;
  if (canDrink) { startDrink(); return true; }
  if (canRide) { mountScooter(); return true; }
  return false;
}

// ---------- drinking
function startDrink() { pstate = 'toDrink'; pvel.set(0, 0, 0); charging = false; petike.kickT = -1; setPrompt(''); $('charge').style.display = 'none'; }
function updateDrinking(dt) {
  const a = petike;
  if (pstate === 'toDrink') {
    const dx = DRINK.stand[0] - a.pos.x, dz = DRINK.stand[1] - a.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.04) { const st = Math.min(d, 2.4 * dt); a.pos.x += dx / d * st; a.pos.z += dz / d * st; a.targetHeading = Math.atan2(dx, dz); a.heading = dampAngle(a.heading, a.targetHeading, 12, dt); a.animate(dt, true, 2.4); }
    else { pstate = 'drinking'; drinkT = 0; gulpT = 0.5; }
    a.sync(); return;
  }
  drinkT += dt; a.heading = dampAngle(a.heading, Math.PI, 10, dt); a.animate(dt, false, 0);
  const r = a.rig, k = Math.max(0, Math.min(1, drinkT * 3, (3.0 - drinkT) * 3));
  r.inner.rotation.x = 0.5 * k; r.sh[0].rotation.x = -0.85 * k; r.sh[1].rotation.x = -0.85 * k; r.sh[0].rotation.z = -0.3 * k; r.sh[1].rotation.z = 0.3 * k;
  if (drinkT > 0.35 && drinkT < 2.6) {
    if (rand() < 0.7) spawnFx(new V3(DRINK.x + R(-0.02, 0.02), 1.13, DRINK.z - 0.03), new V3(R(-0.05, 0.05), R(0.9, 1.2), R(0.7, 0.95)), pick([0x8fd8ff, 0xc9efff, 0x5ec2f2]), 0.04, 0.35, 6);
    gulpT -= dt; if (gulpT <= 0) { gulpT = 0.42; tone('sine', 260, 140, 0.09, 0.12); }
  }
  if (drinkT >= 3.0) {
    pstate = 'free'; r.inner.rotation.x = 0;
    say(petike, pick(['Ááá, ez jólesett!', 'Glugy-glugy… mehet tovább!', 'Hű, de hideg a víz!']), 2.2);
    if (petyaMode === 'bench' && rand() < 0.8) setTimeout(() => { say(petya, pick(['Ne igyál annyit, megfájdul a hasad!', 'Csak kortyolgasd, ne vedeld!', 'Ivás után ne rohanj rögtön!', 'Megint iszol? Most ittál!']), 2.6); petya.point = 1.2; }, 900);
  }
  a.sync();
}

// ---------- scooter
function mountScooter() {
  pstate = 'riding'; setPrompt(''); charging = false; petike.kickT = -1; pvel.set(0, 0, 0); $('charge').style.display = 'none';
  if (rollerCol) { const i = colliders.indexOf(rollerCol); if (i >= 0) colliders.splice(i, 1); rollerCol = null; }
  poof(petike.pos);
  petike.setRig(rigs.roller); petike.stride = 6.5; petike.swing = 0.6;
  roller.lean = 0; roller.speed = 0; roller.turn = 0; roller.path = null; roller.t = 0;
  mountRider(); petike.pos.copy(roller.pos);
  say(petike, pick(['Juhú, rollerezés!', 'Apa, nézd, milyen gyors vagyok!', 'Indulás!']), 2.2);
  dadStartFollow(); viewSizeTarget = 10;
}
function dismountScooter() {
  const h = roller.heading; roller.speed = 0; roller.turn = 0;
  dismount(roller.pos.x - Math.cos(h) * 0.6, roller.pos.z + Math.sin(h) * 0.6);
  poof(petike.pos); petike.setRig(rigs.foci); petike.stride = 6.5; petike.swing = 0.7;
  roller.lean = 0.1; // resting on its kickstand
  roller.group.position.set(roller.pos.x, groundH(roller.pos.x, roller.pos.z), roller.pos.z); roller.group.rotation.set(0, roller.heading, roller.lean, 'YXZ');
  addCircleCol(roller.pos.x, roller.pos.z, 0.3, 1.0); rollerCol = colliders[colliders.length - 1];
  pstate = 'free'; viewSizeTarget = 8.5; setPrompt('');
  say(petike, pick(['Ennyi volt, megyek focizni!', 'Jó volt! Most foci!']), 2);
  dadReturn();
}
function updateRiding(dt) {
  const ro = roller, a = petike;
  if (usePressed) { usePressed = false; dismountScooter(); return; }
  setPrompt('E – leszállni a rollerről');
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (touch.active) { ix = touch.x; iy = touch.y; }
  let wx = CAM_RIGHT.x * ix + CAM_FWD.x * iy, wz = CAM_RIGHT.z * ix + CAM_FWD.z * iy;
  const il = Math.min(1, Math.hypot(wx, wz));
  const maxSp = (keys.ShiftLeft || keys.ShiftRight || touch.run) ? 5.6 : 3.8;
  ro.turn = 0;
  if (il > 0.1) {
    const diff = angDiff(ro.heading, Math.atan2(wx, wz));
    if (Math.abs(diff) > 2.3 && ro.speed > 0.6) ro.speed = Math.max(0, ro.speed - 6 * dt);       // pulling back = brake
    else {
      const turn = clamp(diff, -2.4 * dt, 2.4 * dt); ro.heading += turn; ro.turn = turn / dt;
      const target = maxSp * il * (1 - Math.min(0.6, Math.abs(diff) / 3));
      ro.speed = ro.speed < target ? Math.min(target, ro.speed + 2.6 * dt) : Math.max(target, ro.speed - 3 * dt);
    }
  } else ro.speed = Math.max(0, ro.speed - 1.5 * dt);
  if (keys.Space || kickHeld) ro.speed = Math.max(0, ro.speed - 7 * dt);
  kickPressed = kickReleased = false;
  const fx = Math.sin(ro.heading), fz = Math.cos(ro.heading);
  ro.pos.x += fx * ro.speed * dt; ro.pos.z += fz * ro.speed * dt;
  let hit = false; collide(ro.pos, 0.35, 0, () => { hit = true; });
  if (hit) { if (ro.speed > 1.6) { sThunk(ro.speed * 2); dadAlarm(); } ro.speed *= 0.35; }
  ro.pos.x = clamp(ro.pos.x, GX0 + 1, GX1 - 1); ro.pos.z = clamp(ro.pos.z, GZ0 + 1, GZ1 - 1);
  ro.lean = damp(ro.lean, clamp(-ro.turn * ro.speed * 0.07, -0.3, 0.3), 6, dt);
  ro.t += dt;
  ro.group.position.set(ro.pos.x, groundH(ro.pos.x, ro.pos.z), ro.pos.z); ro.group.rotation.set(0, ro.heading, ro.lean, 'YXZ');
  poseRider(ro);
  a.pos.copy(ro.pos); a.heading = ro.heading;
  // the scooter nudges the ball
  if (ball.active && goalLock <= 0 && ball.pos.y < 0.5) {
    const dx = ball.pos.x - ro.pos.x, dz = ball.pos.z - ro.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.45 && d > 1e-4) { const nx = dx / d, nz = dz / d; ball.pos.x = ro.pos.x + nx * 0.45; ball.pos.z = ro.pos.z + nz * 0.45; const v = ro.speed * 1.2 + 0.4; ball.vel.x = nx * v + fx * ro.speed * 0.4; ball.vel.z = nz * v + fz * ro.speed * 0.4; }
  }
}

// ---------- dad (Petya)
let petyaMode = 'bench';       // bench | standing | leaving | follow | return | seat
const dad = { talkT: 6, last: '', seatPhase: 0, seatT: 0, alarmT: 0 };
const G_OUT = [30, -10.9], G_IN = [30, -8.7];        // the pitch gate, outside / inside
const inPitch = (x, z) => x > FENCE.x0 && x < FENCE.x1 && z > FENCE.z0 && z < FENCE.z1;
function navTarget(p, to) {
  // stuck behind the family bench → walk round its end first
  const B = FAMILY_BENCH; if (p.z < B.z + 0.2 && Math.abs(p.x - B.x) < 1.5 && to[1] > B.z) return [B.x + (p.x >= B.x ? 1.7 : -1.7), p.z];
  const a = inPitch(p.x, p.z), b = inPitch(to[0], to[1]); if (a === b) return to;
  const first = a ? G_IN : G_OUT, second = a ? G_OUT : G_IN;
  return Math.hypot(p.x - first[0], p.z - first[1]) > 0.35 ? first : second;
}
const petyaFront = () => [SEAT.petya[0], -11.85];
function dadStartFollow() {
  petyaMode = 'standing'; petya.sitTarget = 0; petya.path = null; dad.talkT = 2.5;
  say(petya, pick(['Petike! Várj meg! Sisak rajtad van?!', 'Jaj ne, a roller… Lassan!!', 'Várj, megyek veled!']), 2.4); petya.point = 1.2;
}
function dadReturn() { petyaMode = 'return'; dad.talkT = 1.6; }
function dadAlarm() { if (dad.alarmT > clockT) return; dad.alarmT = clockT + 2; say(petya, pick(['Jaj! Megütötted magad?!', 'Mondtam, hogy vigyázz!', 'Nekimentél! Na tessék!']), 2.2); petya.point = 1.2; dad.talkT = 3; }
function updateDad(dt) {
  const p = petya;
  if (petyaMode === 'standing') { if (p.sit < 0.05) { p.walkTo([petyaFront()], 1.4); petyaMode = 'leaving'; } }
  else if (petyaMode === 'leaving') { if (!p.path) petyaMode = pstate === 'riding' ? 'follow' : 'return'; }
  else if (petyaMode === 'follow') {
    const ro = roller, d = Math.hypot(p.pos.x - ro.pos.x, p.pos.z - ro.pos.z);
    if (d > 2.4) { const t = navTarget(p.pos, [ro.pos.x - Math.sin(ro.heading) * 2, ro.pos.z - Math.cos(ro.heading) * 2]); p.path = [new V3(t[0], 0, t[1])]; p.speed = clamp(1.5 + (d - 2.4) * 1.1, 1.5, 5.2); p.keepHeading = false; }
    else { p.path = null; p.targetHeading = Math.atan2(ro.pos.x - p.pos.x, ro.pos.z - p.pos.z); }
  } else if (petyaMode === 'return') {
    if (pstate === 'riding') { petyaMode = 'follow'; return; }
    const f = petyaFront(), d = Math.hypot(p.pos.x - f[0], p.pos.z - f[1]);
    if (d < 0.25) { p.path = null; petyaMode = 'seat'; dad.seatPhase = 0; dad.seatT = 0.6; p.targetHeading = 0; }
    else { const t = navTarget(p.pos, f); p.path = [new V3(t[0], 0, t[1])]; p.speed = 1.2; p.keepHeading = false; }  // slow, grumpy walk
  } else if (petyaMode === 'seat') {
    if (pstate === 'riding') { petyaMode = 'follow'; return; }
    dad.seatT -= dt;
    if (dad.seatPhase === 0 && dad.seatT <= 0) { p.walkTo([SEAT.petya], 0.7, true); dad.seatPhase = 1; }
    else if (dad.seatPhase === 1 && !p.path) { p.sitTarget = 1; petyaMode = 'bench'; dad.talkT = R(2, 4); }
  }
  // speech
  dad.talkT -= dt;
  if (dad.talkT > 0) return;
  let line = null, gap = R(3, 4.5), point = true;
  if (['standing', 'leaving', 'follow'].includes(petyaMode)) { line = worryLine(); gap = R(2.2, 3.4); }
  else if (petyaMode === 'return' || petyaMode === 'seat') { line = pick(GRUMBLE); gap = R(3.2, 4.8); point = false; }
  else if (pstate === 'free') {
    if (playingFootball()) line = coachLine();
    else { const far = petike.pos.distanceTo(p.pos) > 28; line = far ? null : pick(rand() < 0.6 ? GRUMBLE : BENCH_IDLE); gap = R(6, 9); point = false;
      if (far) { say(angi, pick(['Petike, ne menj túl messzire!', 'Petikééé, gyere vissza a pályára!']), 2.6); } }
  }
  if (line) {
    if (line === dad.last) line = coachFallback(); dad.last = line;
    say(p, line, 2.6); if (point) p.point = 1.2;
    if (petyaMode === 'bench' && rand() < 0.25) setTimeout(() => say(angi, pick(ANGI_DEFEND), 2.4), 1500);
  }
  dad.talkT = gap;
}
function playingFootball() {
  if (!ball.active) return false;
  return inPitch(petike.pos.x, petike.pos.z) || petike.pos.distanceTo(ball.pos) < 4;
}
const coachFallback = () => pick(['Az én időmben ezt mezítláb csináltuk!', 'Figyelj oda, Petike!', 'Nem így! … Vagyis igen, de mégse.', 'Koncentrálj!']);
function coachLine() {
  const sp = Math.hypot(pvel.x, pvel.z), db = petike.pos.distanceTo(ball.pos);
  if (lastKick && clockT - lastKick.t < 2.5) {
    const k = lastKick; lastKick = null;
    if (k.power < 0) return pick(['A labdát kell megrúgni, nem a levegőt!', 'Hol volt a labda? Hát nem ott!']);
    if (k.power < 0.35) return pick(['Erősebben! Nem hallottam a labdát!', 'Ez passz volt vagy simogatás?', 'Rúgd meg rendesen, nem tojás!']);
    if (k.power > 0.8) return pick(['Nem ekkorát! Ez nem rakétakilövés!', 'Pontosság, nem erő, hányszor mondjam!', 'A felhőket akarod eltalálni?']);
    if (!k.toward) return pick(['Kapura, Petike, KAPURA!', 'Rossz irány! A kapu arra van!', 'Ezt meg kinek rúgtad?']);
    return pick(['Közepes. Lehetett volna jobb.', 'Hmm. A térdedet hajlítsd be jobban!', 'Majdnem jó. De csak majdnem.']);
  }
  if (db > 4) return pick(['Menj már a labdára!', 'Mit csinálsz ott? A labda ott van!', 'Ne sétálgass, a labdáért futni kell!']);
  if (sp < 0.3) return pick(['Ne álldogálj! Mozogj!', 'Szobor vagy, vagy focista?', 'Gyerünk, ne aludj el!']);
  if (sp > 4.5) return pick(['Ne rohangálj ennyit, oszd be az erőd!', 'Lassabban, ki fogsz fulladni!', 'Nem a sebesség a lényeg, hanem a fej!']);
  if (db < 1.2) return pick(['Fejet fel! Ne a labdát nézd!', 'Közelebb a lábadhoz a labdát!', 'Használd a bal lábad is!', 'Belsővel, ne spiccel!', 'Testtel takard a labdát!']);
  return pick(['Az én időmben ezt mezítláb csináltuk!', 'Figyeld a kaput, ne engem!', 'Rövidebb lépésekkel!', 'Térdet behajlítani!', 'Nem így! … Vagyis igen, de mégse.']);
}
function worryLine() {
  if (pstate !== 'riding') return pick(['Várj meg!', 'Hová mész?!']);
  const ro = roller, x = ro.pos.x, z = ro.pos.z;
  if (z > 10.5) return pick(['Ne menj az út közelébe!!', 'Ott jönnek az autók, gyere vissza!', 'Az úttest nem játszótér!']);
  if (ro.speed > 4.6) return pick(['Lassíts! LASSÍTS!', 'Nem versenypálya ez!', 'Ha elesel, ne nekem sírj!', 'Fékezz, fékezz!']);
  if (ro.speed > 1) {
    const ax = x + Math.sin(ro.heading) * 2.2, az = z + Math.cos(ro.heading) * 2.2;
    for (const c of colliders) {
      if (c.h < 0.5 || c === rollerCol) continue;
      const d = c.box ? Math.hypot(ax - clamp(ax, c.x0, c.x1), az - clamp(az, c.z0, c.z1)) : Math.hypot(ax - c.x, az - c.z) - c.r;
      if (d < 0.4) return pick(['Vigyázz, ott előtted!', 'Nézz előre, nekimész!', 'Kormányozz el! Jobbra! Vagy balra!']);
    }
  }
  for (const n of npcs) if (Math.hypot(n.actor.pos.x - x, n.actor.pos.z - z) < 2.4) return pick(['Vigyázz a nénire!', 'Csengess! Ja, nincs csengő…', 'Kerüld ki a bácsit!']);
  for (const an of animals) if (Math.hypot(an.pos.x - x, an.pos.z - z) < 2.6) return an.type === 'cat' ? 'Ne üsd el a cicát!' : 'Vigyázz a kutyára!';
  if (Math.abs(ro.turn) > 1.2 && ro.speed > 2) return pick(['Ne kanyarodj ilyen élesen!', 'Óvatosan a kanyarban!']);
  return pick(['Két kézzel fogd a kormányt!', 'Nézz előre, ne hátra!', 'Hajlítsd be a térded!', 'Lassabban, Petike!', 'Sisak rajtad van? Jó.', 'Ne menj túl messzire!', 'Fékezz időben!', 'Jaj, a szívem…']);
}
const GRUMBLE = ['Ez a gyerek egyszer a frászt hozza rám…', 'Minek vettünk neki elektromos rollert…', 'A térdem… mindjárt leszakad.', 'Az én időmben görkorcsolya volt, az is fából.', 'Bezzeg ha én akarnék rollerezni…', 'Na, ennyi volt a nyugodt vasárnap.', 'Ki bírja ezt a sok futkározást?', 'Legközelebb ő hozza a táskát.'];
const BENCH_IDLE = ['Na, mi lesz? Focizni jöttünk vagy nézelődni?', 'Petike, a pálya arra van!', 'A labda nem fog magától gurulni!', 'Ha nem focizol, mehetünk haza is.'];
const ANGI_DEFEND = ['Petya, hagyd már szegény gyereket!', 'Szerintem nagyon ügyes!', 'Ne kiabálj, mindenki minket néz.', 'Te is ilyen voltál kicsiben?', 'Hagyd játszani, Petya!', 'Ügyes vagy, kicsim, ne figyelj apára!'];
const GOAL_GRUMBLE = ['Na jó. De a bal lábaddal is menne?', 'Szerencsés volt. Még egyszer!', 'Ezt a nagymamád is berúgta volna.', 'Gól, gól… de a kapus hol volt?', 'Túl lassú volt a lövés, de mindegy.', 'Rendben, de ünnepelni ráérsz otthon!'];

// ---------------------------------------------------------------- camera
function updateCamera(dt) {
  let tx, tz;
  if (mode === 'intro') {
    const rp = roller.rider ? roller.pos : petike.pos;
    tx = (petya.pos.x + angi.pos.x + rp.x) / 3; tz = (petya.pos.z + angi.pos.z + rp.z) / 3;
    viewSizeTarget = zoomOverride || 7.5;
  } else if (mode === 'play') {
    const bw = pstate === 'riding' ? 0 : 0.25;
    tx = petike.pos.x + (ball.active ? (ball.pos.x - petike.pos.x) * bw : 0); tz = petike.pos.z + (ball.active ? (ball.pos.z - petike.pos.z) * bw : 0);
  } else { tx = 0; tz = -4; }
  camTarget.x = damp(camTarget.x, tx, 3, dt); camTarget.z = damp(camTarget.z, tz, 3, dt);
  camera.position.copy(camTarget).add(CAM_OFF); camera.lookAt(camTarget);
  if (Math.abs(viewSize - viewSizeTarget) > 0.001) { viewSize = damp(viewSize, viewSizeTarget, 4, dt); updateProjection(); }
  // shadow camera follows (snapped to texels to avoid shimmering)
  const step = 64 / 2048; const sx = Math.round(camTarget.x / step) * step, sz = Math.round(camTarget.z / step) * step;
  sun.position.set(sx + SUN_OFF.x, SUN_OFF.y, sz + SUN_OFF.z); sun.target.position.set(sx, 0, sz); sun.target.updateMatrixWorld();
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), chirpT = 5;
const TIME_SCALE = Math.max(1, Math.min(8, +(new URLSearchParams(location.search).get('speed') || 1)));
function frame(now) {
  const dt0 = Math.min(0.05, (now - last) / 1000); last = now;
  for (let i = 0; i < TIME_SCALE; i++) step(dt0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function step(dt) {
  clockT += dt;
  tickCutscene(dt);
  if (mode === 'intro' || mode === 'play') {
    petya.update(dt); angi.update(dt);
    if (mode === 'play') updatePlayer(dt); else petike.update(dt);
    if ((roller.rider || roller.path) && pstate !== 'riding') rollerRide(dt);
    if (mode === 'play') { updateDad(dt); if (petyaMode === 'follow' || petyaMode === 'return') { collide(petya.pos, 0.3, 0, null); petya.sync(); } }
    updateBall(dt);
    usePressed = false;
  }
  updateNPCs(dt); updateAnimals(dt); updateFountain(dt); updateFx(dt);
  updateCamera(dt); updateBubbles(dt);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (bigT > 0) { bigT -= dt; if (bigT <= 0) $('big').classList.remove('show'); }
  chirpT -= dt; if (chirpT < 0) { chirpT = R(4, 10); sChirp(); }
}

// ---------------------------------------------------------------- boot
async function boot() {
  buildWorld();
  makeBall();
  const loader = new GLTFLoader();
  const files = ['petya.glb', 'angi.glb', 'petike_roller.glb', 'petike_foci.glb', 'roller_kicsi.glb'];
  let done = 0; const bar = $('loadbar').firstElementChild;
  let res;
  try {
    res = await Promise.all(files.map((f) => loader.loadAsync(import.meta.env.BASE_URL + f).then((g) => { done++; bar.style.width = (done / files.length * 100) + '%'; return g; })));
  } catch (e) {
    $('err').innerHTML = 'Nem sikerült betölteni a modelleket (' + (e.message || e) + ').<br>Ellenőrizd, hogy a <code>public/</code> mappában valódi .glb fájlok vannak.';
    $('startBtn').textContent = 'Hiba'; console.error(e); return;
  }
  const [gPetya, gAngi, gRoller, gFoci, gScooter] = res;
  rigs.petya = rigFromGLTF(gPetya, CFG.petya);
  rigs.angi = rigFromGLTF(gAngi, CFG.angi);
  rigs.roller = rigFromGLTF(gRoller, CFG.roller);
  rigs.foci = rigFromGLTF(gFoci, CFG.foci);
  // scooter
  rollerModel = gScooter.scene; rollerModel.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const sc = new THREE.Group(); sc.add(rollerModel); rollerModel.scale.setScalar(0.72); rollerModel.rotation.y = Math.PI / 2; rollerModel.position.x = 0.07 * 0.72;
  roller.group.add(sc); scene.add(roller.group);

  petya = new Actor(rigs.petya, 'Petya'); petya.stride = 4.2;
  angi = new Actor(rigs.angi, 'Angi'); angi.stride = 4.5;
  petike = new Actor(rigs.roller, 'Petike'); petike.stride = 6.5;
  buildPeople();
  // initial (pre-start) view
  petya.place(-4, -5.6, Math.PI / 2); angi.place(-4, -6.4, Math.PI / 2);
  roller.base = new V3(-8.6, 0, -6); roller.pos.copy(roller.base); roller.dir = new V3(1, 0, 0); roller.heading = Math.PI / 2; mountRider(); rollerRide(0.016);
  mode = 'title'; camTarget.set(-6, 0, -6);
  const btn = $('startBtn'); btn.disabled = false; btn.textContent = 'Indítás ▶';
  btn.onclick = () => { initAudio(); $('overlay').classList.add('hide'); runIntro(); };
  requestAnimationFrame(frame);
  window.__game = { THREE, scene, camera, renderer, petike: () => petike, petya: () => petya, angi: () => angi, ball, roller, keys, skipIntro, get mode() { return mode; }, get pstate() { return pstate; }, get petyaMode() { return petyaMode; }, use: () => { usePressed = true; }, roller, setZoom: (z) => { zoomOverride = z; viewSizeTarget = z; viewSize = z; updateProjection(); }, camTarget, setKick: (p) => { kickPressed = true; setTimeout(() => { kickReleased = true; }, p); } };
}
boot();
