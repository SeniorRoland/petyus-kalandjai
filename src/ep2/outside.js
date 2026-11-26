// Petyus kalandjai – 2. rész: a ház és környéke. A lakás a társasház 2. emeletén van (home.js, FY); itt: a ház alsó
// szintjei és a szomszéd lakás/lépcsőház, a déli bejárat, a parkoló autókkal, a nagy füves udvar (nyugat, észak, kelet)
// fákkal, trambulinnal a ház mögött, drótkerítés körben, garázssor nyugaton, a szomszéd társasházak; gyerekek, kutyák, macskák.
// Coordinates: as in home.js (the flat's inner NW corner is (0, 0)); the ground is y = 0.
import { Actor, animLegs, makeCat, makeDog } from '../actors.js';
import { makePerson } from '../rigs.js';
import * as THREE from 'three';
import { scene } from '../scene.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { R, V3, clamp, dampAngle, pick } from '../util.js';
import { partMesh, vcMat } from '../world.js';
import { getGeometry } from '../voxels.js';
import { Q } from '../quality.js';
import { noise, sBark, soundAt, soundOut, tone } from '../audio.js';
import { FY, put } from './home.js';

// our block: the flat (x −0.25 … 15.85) + the stairwell and the neighbours' flat to the west; ground floor + 1st floor below
const HB = { x0: -6.25, x1: 15.85, z0: -0.25, z1: 9.45 }, FLOOR = 3;
const DOOR_X = (HB.x0 + HB.x1) / 2;   // the entrance: in the middle of the south side (between two window columns, none cut)
const FENCE = { x0: -24, x1: 34, z0: -22, z1: 17 };
// the house after the photo: white render, a pinkish-brown plinth, white windows with brown roller-blind boxes,
// a red tiled hipped roof with dormers and brick chimneys, a dark-framed glass entrance
const C = { facade: 0xeeece6, facade2: 0xe6e3dc, plinth: 0xb49a8c, band: 0xf7f6f2, glass: 0x4d6a85, frame: 0xf8f7f3, blind: 0x7a4a32, roofCut: 0xb7aea0,
  tile: [0xa3402e, 0x963a2a, 0xae4733], brick: 0xa9503a, doorFrame: 0x3b2f2a,
  grass: [0x7db556, 0x86bd5c, 0x78b052], asphalt: 0x5d6066, line: 0xf2f2f2, walk: 0xcfc8bb, path: 0xd9c7a3, gravel: 0xb3ada2, gravel2: 0xa6a094, curb: 0xd6d2ca };

// ---------------------------------------------------------------- buildings
// every window of the other flats and houses (for the evening: some of them lit) – { x, y, z, w, h, nx, nz }
export const WINDOWS = [];
// a block with window rows on every side; skip(side, x) → no window there (the entrance)
function block(b, x0, z0, x1, z1, y0, floors, col, opt = {}) {
  const h = floors * FLOOR, w = x1 - x0, d = z1 - z0;
  b.bx((x0 + x1) / 2, y0, (z0 + z1) / 2, w, h, d, col, 0, 0.02);
  b.bx((x0 + x1) / 2, y0, (z0 + z1) / 2, w + 0.06, Math.min(0.6, h), d + 0.06, C.plinth, 0, 0.02);
  const step = opt.step || 1.8;
  for (let f = 0; f < floors; f++) {
    const fy = y0 + f * FLOOR;
    if (f > 0) b.bx((x0 + x1) / 2, fy - 0.06, (z0 + z1) / 2, w + 0.04, 0.12, d + 0.04, C.band, 0, 0);
    const win = (cx, cz, alongX, out) => {
      if (opt.skip && opt.skip(cx, cz, f)) return;
      const ww = opt.winW || 1.1, wh = 1.3, wy = fy + 0.9;
      const bl = opt.blinds ? 0.22 : 0;   // the roller-blind box above the window (some blinds half down)
      WINDOWS.push({ x: cx, y: wy + wh / 2, z: cz, w: ww, h: wh * (opt.blinds ? 0.5 : 1) - 0.04, yb: opt.blinds ? wy + wh * 0.25 : wy + wh / 2, nx: alongX ? 0 : out, nz: alongX ? out : 0 });
      if (alongX) {
        b.bx(cx, wy - 0.05, cz + out * 0.03, ww + 0.12, wh + 0.1, 0.08, C.frame, 0, 0); b.bx(cx, wy, cz + out * 0.05, ww, wh, 0.06, C.glass, 0, 0.03);
        if (bl) { b.bx(cx, wy + wh + 0.05, cz + out * 0.06, ww + 0.12, bl, 0.1, C.blind, 0, 0); b.bx(cx, wy + wh * 0.5, cz + out * 0.08, ww, wh * 0.5, 0.03, 0x8a5a40, 0, 0.02); }   // blinds half down
      } else {
        b.bx(cx + out * 0.03, wy - 0.05, cz, 0.08, wh + 0.1, ww + 0.12, C.frame, 0, 0); b.bx(cx + out * 0.05, wy, cz, 0.06, wh, ww, C.glass, 0, 0.03);
        if (bl) { b.bx(cx + out * 0.06, wy + wh + 0.05, cz, 0.1, bl, ww + 0.12, C.blind, 0, 0); b.bx(cx + out * 0.08, wy + wh * 0.5, cz, 0.03, wh * 0.5, ww, 0x8a5a40, 0, 0.02); }
      }
    };
    for (let x = x0 + step / 2 + 0.3; x < x1 - 0.6; x += step) { win(x, z0, true, -1); win(x, z1, true, 1); }
    for (let z = z0 + step / 2 + 0.3; z < z1 - 0.6; z += step) { win(x0, z, false, -1); win(x1, z, false, 1); }
  }
  if (opt.roof !== false) b.bx((x0 + x1) / 2, y0 + h, (z0 + z1) / 2, w + 0.3, 0.25, d + 0.3, opt.roofCol || 0x8c8478, 0, 0.02);
}
function buildHouse(b) {
  // ground floor + 1st floor under the flat and the stairwell part (no roof: the flat sits on it)
  block(b, HB.x0, HB.z0, HB.x1, HB.z1, 0, 2, C.facade, { roof: false, blinds: true, skip: (x, z, f) => f === 0 && z === HB.z1 && Math.abs(x - DOOR_X) < 1.9 });
  // 2nd floor west of the flat: the stairwell and the neighbours' flat, cut open at the top like the rest of the floor
  block(b, HB.x0, HB.z0, -0.25, HB.z1, FY, 1, C.facade2, { roof: false, step: 2.2, blinds: true });
  b.bx((HB.x0 - 0.25) / 2, FY + 2.6, (HB.z0 + HB.z1) / 2, -0.25 - HB.x0, 0.08, HB.z1 - HB.z0, C.roofCut, 0, 0);
  // stacked balconies below ours (1st floor): north and east
  const balc = (cx, cz, w, d, y, rails) => {
    b.bx(cx, y - 0.22, cz, w, 0.22, d, 0xd0c7ba, 0, 0.02);
    for (const [ax, az, bx2, bz] of rails) {
      const len = Math.hypot(bx2 - ax, bz - az), n = Math.max(2, Math.round(len / 0.15));
      for (let i = 0; i <= n; i++) b.bx(ax + (bx2 - ax) * i / n, y, az + (bz - az) * i / n, 0.03, 0.95, 0.03, 0x5c6670, 0, 0);
      b.bx((ax + bx2) / 2, y + 0.95, (az + bz) / 2, Math.abs(bx2 - ax) + 0.05, 0.05, Math.abs(bz - az) + 0.05, 0x3f474f, 0, 0);
    }
  };
  balc(13.66, -1.075, 3.98, 1.65, FLOOR, [[11.7, -1.9, 15.6, -1.9], [11.7, -1.9, 11.7, -0.3], [15.6, -1.9, 15.6, -0.3]]);
  balc(16.975, 6.76, 2.25, 4.88, FLOOR, [[18.1, 4.3, 18.1, 9.25], [15.9, 4.3, 18.1, 4.3], [15.9, 9.25, 18.1, 9.25]]);
  // the entrance: a two-wing glass door in a dark frame with glass side panels, canopy, steps, the house number, a downpipe
  b.bx(DOOR_X, 0, HB.z1 + 0.04, 2.6, 2.5, 0.1, C.doorFrame, 0, 0);
  for (const [x, w] of [[-0.95, 0.55], [-0.33, 0.6], [0.33, 0.6], [0.95, 0.55]]) b.bx(DOOR_X + x, 0.08, HB.z1 + 0.1, w - 0.06, 2.3, 0.04, 0x5f7f99, 0, 0.02);
  b.bx(DOOR_X - 0.06, 0.95, HB.z1 + 0.13, 0.04, 0.3, 0.04, 0xc9a227, 0, 0); b.bx(DOOR_X + 0.06, 0.95, HB.z1 + 0.13, 0.04, 0.3, 0.04, 0xc9a227, 0, 0);
  for (const x of [HB.x0 + 0.15, 1.25, HB.x1 - 0.15]) b.bx(x, 0, HB.z1 + 0.1, 0.1, 9.0, 0.1, 0x8c8c8c, 0, 0);   // downpipes (between the windows)
  b.bx(DOOR_X, 2.6, HB.z1 + 0.7, 2.4, 0.15, 1.4, 0x6d6a66, 0, 0);
  for (let i = 0; i < 3; i++) b.bx(DOOR_X, 0, HB.z1 + 0.5 + i * 0.32, 2.2, 0.16 - i * 0.05, 0.36, 0xbdb6aa, 0, 0);
  b.bx(DOOR_X + 1.6, 2.0, HB.z1 + 0.06, 0.35, 0.3, 0.04, 0x2f5f9e, 0, 0); b.bx(DOOR_X + 1.6, 2.06, HB.z1 + 0.09, 0.12, 0.18, 0.02, 0xffffff, 0, 0);
}
// the roof (after the photo): red tiled, hipped (stepped tile courses), dormers on the long sides, brick chimneys, an aerial.
// From close up it would hide the flat: it fades in only when zoomed out (updateOutside).
const RY = FY + 2.6 + 0.35;   // the eaves, on top of the 2nd floor
export let roof = null;
function buildRoof() {
  const mesh = partMesh((b) => {
    const x0 = HB.x0 - 0.5, x1 = HB.x1 + 0.5, z0 = HB.z0 - 0.5, z1 = HB.z1 + 0.5, step = 0.42, rise = 0.32;
    b.bx((HB.x0 + HB.x1) / 2, FY + 2.6, (HB.z0 + HB.z1) / 2, HB.x1 - HB.x0, 0.35, HB.z1 - HB.z0, C.facade, 0, 0);   // the wall top under the eaves
    b.bx((x0 + x1) / 2, RY - 0.12, (z0 + z1) / 2, x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1, 0x6e4a36, 0, 0);               // the eaves board
    for (let n = 0; ; n++) {
      const ix = n * step, w = x1 - x0 - 2 * ix, d = z1 - z0 - 2 * ix;
      if (d < 0.5) { b.bx((x0 + x1) / 2, RY + n * rise, (z0 + z1) / 2, w, 0.2, 0.4, 0x7a2f22, 0, 0); break; }   // the ridge
      b.bx((x0 + x1) / 2, RY + n * rise, (z0 + z1) / 2, w, rise, d, C.tile[n % 3], 0, 0.03);
    }
    // dormers: white front, small window, a red cap – three on the south side, three on the north side
    for (const x of [-2.5, 4.8, 12.0]) for (const s of [1, -1]) {
      const zf = s > 0 ? z1 - 1.4 : z0 + 1.4;
      b.bx(x, RY + 0.3, zf, 1.6, 1.25, 1.4, C.facade, 0, 0);
      b.bx(x, RY + 0.55, zf + s * 0.71, 1.0, 0.75, 0.04, C.glass, 0, 0); b.bx(x, RY + 0.5, zf + s * 0.72, 1.12, 0.06, 0.04, C.frame, 0, 0);
      b.bx(x, RY + 1.5, zf, 1.9, 0.18, 1.7, C.tile[0], 0, 0); b.bx(x, RY + 1.68, zf - s * 0.1, 1.3, 0.16, 1.4, C.tile[1], 0, 0);
    }
    // chimneys and the aerial
    for (const [x, z, h] of [[0.5, 3.0, 4.0], [6.5, 5.5, 3.6], [11.0, 3.8, 3.8]]) { b.bx(x, RY, z, 0.6, h, 0.6, C.brick, 0, 0.04); b.bx(x, RY + h, z, 0.75, 0.12, 0.75, 0x8d8d8d, 0, 0); }
    b.bx(3.0, RY + 2.5, 4.6, 0.06, 3.2, 0.06, 0x9a9a9a, 0, 0);
    for (let k = 0; k < 4; k++) b.bx(3.0, RY + 4.2 + k * 0.35, 4.6, 0.9 - k * 0.15, 0.04, 0.04, 0x9a9a9a, 0, 0);
  });
  mesh.material = vcMat.clone(); mesh.material.transparent = true; mesh.material.opacity = 0; mesh.visible = false;
  roof = mesh; scene.add(mesh);
}

// the neighbourhood (after the aerial photo): across the street to the south a row of family houses with orange tiled roofs
// and gardens; to the west two long four-storey blocks (flat roofs, balconies on the east side) with parking between them;
// behind them (north-west) the garage row; north of our yard a long meadow with a track and a few cars at its far end,
// small houses beyond it; to the east a dense strip of trees, and past it (north-east) a ploughed field.
function familyHouse(b, cx, cz, w, d, roofCol, wall = 0xf1ece2) {
  b.bx(cx, 0, cz, w, 3.0, d, wall, 0, 0.02); b.bx(cx, 0, cz, w + 0.06, 0.45, d + 0.06, 0xb7a596, 0, 0.02);
  for (const x of [-w / 3, 0, w / 3]) {   // windows on the street side (north) and the garden side (south)
    for (const s of [-1, 1]) { b.bx(cx + x, 0.95, cz + s * (d / 2 + 0.03), 1.0, 1.15, 0.06, 0xf8f7f3, 0, 0); b.bx(cx + x, 1.0, cz + s * (d / 2 + 0.06), 0.85, 1.0, 0.04, C.glass, 0, 0.03); WINDOWS.push({ x: cx + x, y: 1.5, yb: 1.5, z: cz + s * (d / 2 + 0.06), w: 0.85, h: 0.96, nx: 0, nz: s }); }
  }
  b.bx(cx + w / 3 + 0.9, 0, cz - d / 2 - 0.04, 0.95, 2.1, 0.08, 0x7a4a32, 0, 0);   // the front door
  for (let n = 0; ; n++) {   // gable roof (ridge along x), stepped tile courses
    const dd = d + 0.8 - 2 * n * 0.42;
    if (dd < 0.5) { b.bx(cx, 3.0 + n * 0.3, cz, w + 0.8, 0.18, 0.4, 0x8a3a22, 0, 0); break; }
    b.bx(cx, 3.0 + n * 0.3, cz, w + 0.8, 0.3, dd, n % 2 ? roofCol : (roofCol & 0xfefefe) - 0x0a0604, 0, 0.03);
  }
  b.bx(cx - w / 4, 3.8, cz + 0.8, 0.5, 2.0, 0.5, C.brick, 0, 0.04);
}
function buildNeighbours(b) {
  // family houses south of the street (gardens with a low fence along the sidewalk)
  const ROOFS = [0xd9662f, 0xc9552a, 0xe0743a, 0xb84f2c];
  [[-58, 33, 9, 10], [-40, 32, 10, 9], [-22, 33, 9, 9], [-4, 32, 10, 10], [14, 33, 9, 9], [32, 32, 11, 10], [50, 33, 9, 9], [68, 32, 10, 9]]
    .forEach(([x, z, w, d], n) => familyHouse(b, x, z, w, d, ROOFS[n % 4], n % 3 ? 0xf1ece2 : 0xe9e1cf));
  for (let x = -70; x < 80; x += 2) if ((x + 70) % 18 > 3) { b.bx(x, 0, 25.6, 0.08, 1.1, 0.08, 0x6b4f35, 0, 0); b.bx(x + 1, 0.8, 25.6, 2, 0.06, 0.04, 0x8a6a4a, 0, 0); }
  // the two long blocks to the west: white, flat grey roofs with vents, orange balcony strips on the east side
  for (const [x0, x1] of [[-36, -29], [-58, -51]]) {
    block(b, x0, -26, x1, 8, 0, 4, 0xeeeeea, { roofCol: 0x8d8d8a, step: 2.4 });
    for (let f = 1; f < 4; f++) { b.bx(x1 + 0.5, f * FLOOR, -9, 1.0, 0.1, 31, 0xbdb6aa, 0, 0); b.bx(x1 + 0.98, f * FLOOR + 0.1, -9, 0.06, 0.95, 31, 0xd9732f, 0, 0.03); }
    for (let z = -22; z < 6; z += 6) b.bx((x0 + x1) / 2, 12.25, z, 1.2, 0.6, 1.2, 0x6f6f6c, 0, 0);
  }
  // the garage row behind them (north-west), doors facing south
  const GC = [0xb24a3a, 0xf1f1ee, 0xb24a3a, 0x8a9aa8, 0xf1f1ee, 0xb24a3a, 0x6f8f6f, 0xf1f1ee, 0xa8805e, 0xb24a3a, 0xf1f1ee];
  b.bx(-44, 0, -37, 33, 2.6, 6, 0xeeebe4, 0, 0.02); b.bx(-44, 2.6, -37, 33.4, 0.18, 6.3, 0x9a948a, 0, 0);
  for (let n = 0; n < 11; n++) { const x = -58.5 + n * 2.95; b.bx(x, 0.05, -33.97, 2.4, 2.15, 0.06, GC[n], 0, 0.04); for (let k = 1; k < 6; k++) b.bx(x, 0.05 + k * 0.36, -33.93, 2.4, 0.03, 0.03, 0x555555, 0, 0); }
  // small houses beyond the meadow (north-west)
  [[-48, -62, 9, 9], [-30, -64, 10, 9], [-12, -68, 9, 8]].forEach(([x, z, w, d], n) => familyHouse(b, x, z, w, d, ROOFS[(n + 1) % 4]));
}

// ---------------------------------------------------------------- ground, parking, fence
function buildGround(b) {
  // grass everywhere, in patches of three greens
  for (let x = -100; x < 135; x += 5) for (let z = -105; z < 60; z += 5) {
    const meadow = z < -22 && x >= -24 && x < 34, woods = x >= 36 && x < 60 && z < 18, field = x >= 62 && z < -8;
    if (field) continue;
    b.quad(x, z, x + 5, z + 5, -0.005, woods ? pick([0x5f8f45, 0x588a40]) : meadow ? pick([0x9dc46a, 0xa6ca72, 0x94bd62]) : pick(C.grass), 0.05);
  }
  // the ploughed field (north-east): brown, furrows along x
  b.bx(98, -0.02, -56.5, 72, 0.02, 97, 0x8a5a3a, 0, 0.02);
  for (let z = -104; z < -8; z += 1.2) b.bx(98, 0, z, 72, 0.05, 0.45, 0x74482c, 0, 0.05);
  // the track across the meadow to the cars at its end
  b.bx(9, 0, -53, 3, 0.02, 62, 0xc9b58f, 0, 0.05);
  // the street south of the fence, sidewalks, the parking lot in front of the house, the drive to the garages, paths
  b.bx(0, 0, 21, 190, 0.02, 5, C.asphalt, 0, 0.02);
  for (let x = -90; x < 95; x += 4) b.bx(x + 1, 0.02, 21, 2, 0.01, 0.15, C.line, 0, 0);
  b.bx(0, 0, 18, 190, 0.1, 1.2, C.walk, 0, 0.02); b.bx(0, 0, 24.1, 190, 0.1, 1.2, C.walk, 0, 0.02);
  // the parking lot in front of the house (z 10.6 … 16.6): gravelled concrete in patches, concrete curbs marking the bays
  // concrete slabs (3 × 3 m) with joints
  b.bx(-2, 0, 13.6, 30, 0.03, 6, 0xc4c1ba, 0, 0.015);
  for (let x = -17; x <= 13; x += 3) b.bx(x, 0.031, 13.6, 0.04, 0.005, 6, 0x9d9a93, 0, 0);
  b.bx(-2, 0.031, 13.6, 30, 0.005, 0.04, 0x9d9a93, 0, 0);
  for (let k = 0; k <= 9; k++) b.bx(-15.5 + k * 3.0, 0.03, 15.9, 0.25, 0.08, 1.0, C.curb, 0, 0.02);
  b.bx(-26.4, 0, -6.6, 3.6, 0.03, 49, C.asphalt, 0, 0.02);  // the lane west of our fence: street → garages
  b.bx(-44, 0, -31.5, 36, 0.03, 5, C.asphalt, 0, 0.02);       // in front of the garages
  // parking between the two blocks: a grass-paver lot (grass in a concrete grid)
  b.bx(-43.5, 0, -8, 13, 0.025, 30, 0x7fab58, 0, 0.04);
  for (let x = -50; x <= -37; x += 0.65) b.bx(x, 0.026, -8, 0.12, 0.006, 30, 0xa9a69c, 0, 0.02);
  for (let z = -23; z <= 7; z += 0.65) b.bx(-43.5, 0.026, z, 13, 0.006, 0.12, 0xa9a69c, 0, 0.02);
  b.bx(-43.5, 0, 13.5, 4, 0.03, 11, C.asphalt, 0, 0.02);      // its drive from the street
  b.bx(-20.8, 0, 13.6, 7.6, 0.03, 4.2, C.gravel2, 0, 0.02);  // drive: parking → the lane (meeting it edge to edge: no overlapping, flickering faces)
  b.bx(DOOR_X, 0, 10.0, 1.6, 0.05, 1.3, C.path, 0, 0.03);
  b.bx(-16.5, 0, 17.0, 5, 0.03, 0.8, C.asphalt, 0, 0.02);  // the gate for cars (between the slabs and the sidewalk, not over them)
  b.bx(DOOR_X, 0, 17, 1.6, 0.05, 1.2, C.path, 0, 0.03);   // the gate for people
  // a path round the house (gravel strip)
  b.bx((HB.x0 + HB.x1) / 2, 0, HB.z0 - 0.6, HB.x1 - HB.x0 + 2.4, 0.03, 1.2, C.path, 0, 0.04);
  b.bx(HB.x0 - 0.6, 0, (HB.z0 + HB.z1) / 2, 1.2, 0.03, HB.z1 - HB.z0, C.path, 0, 0.04);
  b.bx(HB.x1 + 0.6 + 2.3, 0, (HB.z0 + HB.z1) / 2, 1.2, 0.03, HB.z1 - HB.z0, C.path, 0, 0.04);
}
// the yard's details: sandbox, clothes dryer, bins, stepping stones to the trampoline, a garden table, flower edging
function buildYard(b) {
  // sandbox (2 × 2 m, wooden frame, a bucket and a spade)
  const sx = -14, sz = -6;
  for (const [x, z, w, d] of [[0, -1, 2.1, 0.12], [0, 1, 2.1, 0.12], [-1, 0, 0.12, 2.1], [1, 0, 0.12, 2.1]]) b.bx(sx + x, 0, sz + z, w, 0.28, d, 0xb5793f, 0, 0.04);
  b.bx(sx, 0, sz, 1.9, 0.18, 1.9, 0xe8d39a, 0, 0.05); b.bx(sx + 0.4, 0.18, sz - 0.3, 0.6, 0.12, 0.5, 0xdcc488, 0, 0.05);
  b.bx(sx - 0.4, 0.18, sz + 0.3, 0.18, 0.2, 0.18, 0xe63946, 0, 0); b.bx(sx - 0.1, 0.18, sz + 0.45, 0.06, 0.03, 0.4, 0x3a86ff, 0, 0);
  // clothes dryer: two T-posts, four lines, washing on it
  const cx = 20, cz = -12;
  for (const x of [-2, 2]) { b.bx(cx + x, 0, cz, 0.08, 1.8, 0.08, 0x6b7378, 0, 0); b.bx(cx + x, 1.8, cz, 0.08, 0.08, 1.4, 0x6b7378, 0, 0); }
  for (const z of [-0.6, -0.2, 0.2, 0.6]) b.bx(cx, 1.84, cz + z, 4, 0.015, 0.015, 0xdddddd, 0, 0);
  const cl = [0xffffff, 0x4f8fd6, 0xe63946, 0xffca3a, 0x8ac926, 0xf3a9c0];
  [[-1.4, -0.6, 0.5, 0.6], [-0.5, -0.6, 0.7, 0.4], [0.6, -0.2, 0.4, 0.5], [1.3, -0.2, 0.5, 0.7], [-1.0, 0.2, 0.9, 0.5], [0.4, 0.6, 0.5, 0.6]].forEach(([x, z, w, h], n) => b.bx(cx + x, 1.84 - h, cz + z, w, h, 0.03, cl[n], 0, 0.03));
  // three black wheelie bins by the gate (as on the photo)
  for (let n = 0; n < 3; n++) { const x = -7.4 + n * 0.75; b.bx(x, 0, 16.2, 0.6, 1.0, 0.7, 0x26282b, 0, 0.03); b.bx(x, 1.0, 16.17, 0.64, 0.06, 0.76, 0x1c1d20, 0, 0); b.bx(x, 0.12, 16.58, 0.5, 0.08, 0.06, 0x3a86ff, 0, 0); }
  // stepping stones from the back of the house to the trampoline
  for (let n = 0; n < 8; n++) b.bx(6 + Math.sin(n * 0.9) * 0.25, 0, -2.6 - n * 0.75, 0.5, 0.04, 0.4, pick([0xbdb6aa, 0xc8c2b6, 0xb0a99c]), n * 0.4, 0.04);
  // a low brick edging round the flower beds along the house's east side
  b.bx(19.4, 0, 2.0, 0.1, 0.15, 5.5, 0xa9503a, 0, 0.04);
}
// wire fence round the yard: posts, top and bottom wires, a wire mesh grid; two openings on the south side
function buildFence(b) {
  const P = 0x3c5a46, W = 0xa9b0b5, H = 1.6;
  const gaps = [[-19, -14], [DOOR_X - 0.8, DOOR_X + 0.8]];
  const side = (ax, az, bx2, bz) => {
    const len = Math.hypot(bx2 - ax, bz - az), ux = (bx2 - ax) / len, uz = (bz - az) / len;
    for (let t = 0; t <= len + 0.001; t += 0.2) {
      const x = ax + ux * t, z = az + uz * t;
      if (az === FENCE.z1 && bz === FENCE.z1 && gaps.some(([g0, g1]) => x > g0 && x < g1)) continue;
      const post = Math.abs(t / 2.5 - Math.round(t / 2.5)) < 0.04;
      if (post) b.bx(x, 0, z, 0.07, H + 0.1, 0.07, P, 0, 0);
      else b.bx(x, 0.05, z, 0.015, H - 0.05, 0.015, W, 0, 0);
    }
    // the horizontal wires: one piece per stretch between the openings
    const cuts = az === FENCE.z1 && bz === FENCE.z1 ? gaps : [];
    let t0 = 0;
    for (const t1 of [...cuts.flatMap(([g0, g1]) => [g0 - ax, -(g1 - ax)]), len]) {
      if (t1 >= 0 && t1 > t0) for (const y of [0.05, 0.45, 0.85, 1.25, H]) b.bx(ax + ux * (t0 + t1) / 2, y, az + uz * (t0 + t1) / 2, Math.abs(ux) * (t1 - t0) + 0.015, 0.015, Math.abs(uz) * (t1 - t0) + 0.015, y === H ? P : W, 0, 0);
      if (t1 < 0) t0 = -t1;
    }
  };
  side(FENCE.x0, FENCE.z0, FENCE.x1, FENCE.z0); side(FENCE.x0, FENCE.z1, FENCE.x1, FENCE.z1);
  side(FENCE.x0, FENCE.z0, FENCE.x0, FENCE.z1); side(FENCE.x1, FENCE.z0, FENCE.x1, FENCE.z1);
}

// the lamps (the park's candelabra from part 1): by the door, round the house in the yard, along both sidewalks of the street
export const LAMPS = [[-9, 10.2], [6, 10.2], [-17, -6], [-4, -14], [14, -13], [24, -6], [24, 8], [-16, 6]];
for (let x = -60; x <= 70; x += 13) { LAMPS.push([x, 17.55]); LAMPS.push([x + 6.5, 24.55]); }

// ---------------------------------------------------------------- the evening (part 2, home in the afternoon–evening): dark
// outside, the lamps on (a glowing lamp house and a pool of light on the ground; real lights only for the few nearest the house),
// in the other flats' and houses' windows lights going on and off
const eve = { on: false, win: null, list: [], t: 0 };
export function setEvening() {
  eve.on = true;
  for (const l of carLights) l.visible = true;   // the cars drive with their lights on
  // the lit windows: one instanced quad each, in front of the glass; an unlit one is scaled to nothing
  const geo = new THREE.PlaneGeometry(1, 1), mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const im = new THREE.InstancedMesh(geo, mat, WINDOWS.length); im.frustumCulled = false; scene.add(im); eve.win = im;
  const cols = [0xffd58a, 0xffe2a8, 0xffc56e, 0xf7f1d0, 0xbfd4ff];
  WINDOWS.forEach((w, i) => {
    eve.list.push({ ...w, on: Math.random() < 0.45, t: R(3, 20) });
    im.setColorAt(i, new THREE.Color(pick(cols)));
    setWin(i);
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  // the lamps: the lamp house glows, a soft pool of light under it; the three nearest the house get a real light
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff0b8 }), pool = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.22, depthWrite: false });
  // (instanced: all the lamps' glowing houses in one draw call, all the pools of light in another)
  const gGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2), pGeo = new THREE.CircleGeometry(3.2, 24); pGeo.rotateX(-Math.PI / 2);
  const gi = new THREE.InstancedMesh(gGeo, glow, LAMPS.length), pi = new THREE.InstancedMesh(pGeo, pool, LAMPS.length), m4 = new THREE.Matrix4();
  LAMPS.forEach(([x, z], i) => { gi.setMatrixAt(i, m4.makeTranslation(x, 3.15, z)); pi.setMatrixAt(i, m4.makeTranslation(x, 0.06, z)); });   // (the pools: clear of the paving and its joints – no flickering)
  pi.renderOrder = 1; gi.frustumCulled = pi.frustumCulled = false; scene.add(gi, pi);
  const near = [...LAMPS].sort((a, b) => Math.hypot(a[0] - 4, a[1] - 6) - Math.hypot(b[0] - 4, b[1] - 6)).slice(0, Q.level >= 2 ? 2 : 1);   // (every light costs on every pixel: on phones only one)
  for (const [x, z] of near) { const l = new THREE.PointLight(0xffd9a0, 14, 12, 1.6); l.position.set(x, 3.0, z); scene.add(l); }
}
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new V3(), tmpP = new V3(), UP = new V3(0, 1, 0);
function setWin(i) {
  const w = eve.list[i];
  tmpP.set(w.x + w.nx * 0.09, w.yb, w.z + w.nz * 0.09); tmpQ.setFromAxisAngle(UP, Math.atan2(w.nx, w.nz));
  tmpS.set(w.on ? w.w : 0, w.on ? w.h : 0, 1);
  eve.win.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
}
// now and then a light goes on or off somewhere
function updateEvening(dt) {
  if (!eve.on) return;
  let changed = false;
  for (let i = 0; i < eve.list.length; i++) {
    const w = eve.list[i];
    if ((w.t -= dt) <= 0) { w.t = R(6, 30); if (Math.random() < 0.5) { w.on = !w.on; setWin(i); changed = true; } }
  }
  if (changed) eve.win.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- props (voxel catalogue, instanced via home.js put)
export function placeOutsideProps() {
  const g = { ground: true };
  // parked cars in front of the house (some bays empty)
  [0, 1, 2, 4, 5, 7, 8].forEach((k, n) => put('car', -14 + k * 3.0, 12.4, n % 2 ? Math.PI : 0, (n * 5) % 6, g));
  put('car', -41, 7, Math.PI, 3, g);   // (the street has moving traffic: buildTraffic)
  [[-46, -18, 0], [-41, -14, Math.PI], [-46, -6, 0], [-41, 0, Math.PI], [-46, 4, 0]].forEach(([x, z, r], n) => put('car', x, z, r, (n * 3 + 1) % 6, g));   // between the blocks
  [[7, -76, 0.3], [11, -79, -0.4], [14, -75, 1.2]].forEach(([x, z, r], n) => put('car', x, z, r, (n + 2) % 6, g));   // at the far end of the meadow
  // (the woods to the east and the trees further away are simple low-poly trees: buildFarTrees)
  // trees in the yard and outside
  const T = [['oak', -18, -12], ['oak', -20, 5], ['birch', -13, -18], ['pine', -21, -19], ['oak', 2, -17], ['birch', 9, -19], ['oak', 22, -16], ['pine', 30, -19],
    ['oak', 27, -5], ['birch', 30, 6], ['oak', 25, 13], ['birch', -16, 0], ['pine', 32, 14]];
  T.forEach(([id, x, z], n) => put(id, x, z, n * 1.7, n % 4, { ground: true, s: 0.9 + (n % 3) * 0.12 }));
  for (const [x, z] of [[-10, -5], [-8, 14.5], [3, 14.6], [20, -10], [26, 0], [-22, 12]]) put('bush', x, z, x, Math.abs(x) % 4, g);
  // the trampoline behind the house (north), a bench and a bin by the door
  put('trampoline', 6, -9, 0, 0, g);
  put('bench', DOOR_X - 3.2, 10.4, Math.PI, 0, g); put('bin', DOOR_X + 2.8, 10.3, 0, 0, g);
  for (const [x, z] of LAMPS) put('lamp', x, z, 0, 0, g);   // the yard's and the street's lamps (lit in the evening: setEvening)
  // blossoming trees in front of the house (as on the photo), flower beds, hedges along the fence, a garden table, bike rack
  put('birch', 12.8, 12.2, 0.4, 1, { ground: true, s: 1.15 }); put('oak', -10.2, 10.3, 1.1, 2, { ground: true, s: 0.85 }); put('birch', 17.5, 11.5, 2.0, 3, { ground: true, s: 1.05 });
  put('bed_long', 19.0, 0.6, Math.PI / 2, 0, g); put('bed_long', 19.0, 3.6, Math.PI / 2, 1, g); put('bed_square', -8.5, -3.0, 0, 2, g); put('bed_small', 8.0, 10.05, 0, 0, g);
  for (let x = -21; x <= 31; x += 3.4) put('bush', x, -21.2, x, Math.abs(Math.round(x)) % 4, { ground: true, s: 0.8 });
  for (let z = -18; z <= 12; z += 3.6) { put('bush', 33.2, z, z, Math.abs(Math.round(z)) % 4, { ground: true, s: 0.8 }); put('bush', -23.2, z + 1.8, z, Math.abs(Math.round(z + 1)) % 4, { ground: true, s: 0.8 }); }
  put('picnic', -16, 8, 0.3, 0, g); put('bikerack', DOOR_X - 5.4, 10.1, 0, 0, g);
  for (const [x, z] of [[-12, -15], [24, -3], [-19, -1]]) put('rock', x, z, x, Math.abs(x) % 4, g);
  // grass tufts and wild flowers on the lawns (seeded, so the same every time)
  for (let n = 0; n < 180; n++) { const a = AREAS[n % 3], x = R(a.x0, a.x1), z = R(a.z0, a.z1); put(n % 6 ? 'grass' : 'wildflower', x, z, n, n % 6, { ground: true, s: R(0.8, 1.3) }); }
}

// ---------------------------------------------------------------- life in the yard: children, dogs, cats
const AREAS = [{ x0: -22, x1: -9, z0: -20, z1: 15 }, { x0: -5, x1: 32, z0: -20, z1: -5 }, { x0: 20, x1: 32, z0: -4, z1: 15 }];   // west, north, east lawns
const randIn = () => { const a = pick(AREAS); return new V3(R(a.x0, a.x1), 0, R(a.z0, a.z1)); };
const TRAMP = { x: 6, z: -9 };
const kids = [], pets = [];
// kids: only when they are out (not in the early morning – part 2 starts at 6:00)
function buildLife(withKids = false) {
  // two on the trampoline, two playing tag on the lawn
  const looks = [{ shirt: 0xe63946, pants: 0x1d3557, hair: 0x5a3825 }, { shirt: 0xffca3a, pants: 0x3d405b, hair: 0xd8b45c, dress: true }, { shirt: 0x8ac926, pants: 0x264653, hair: 0x2b1d14 }, { shirt: 0xff70a6, pants: 0x6b705c, hair: 0x8a5a2b, longHair: true }];
  if (withKids) looks.forEach((o, n) => {
    const a = new Actor(makePerson({ ...o, scale: 0.68, hat: false, glasses: false }), ['Bence', 'Lili', 'Marci', 'Zsófi'][n]); a.stride = 7;
    if (n < 2) { a.place(TRAMP.x + (n ? 0.6 : -0.6), TRAMP.z + (n ? 0.3 : -0.2), n ? -2 : 1); kids.push({ a, tramp: true, ph: n * 1.7 }); }
    else { const p = randIn(); a.place(p.x, p.z, 0); kids.push({ a, tramp: false, target: randIn(), wait: R(0, 2), it: n === 2 }); }
  });
  // dogs (one big, one small) and two cats
  for (const [ca, cb, s] of [[0xe6c27a, 0xb08850, 1.2], [0x3b2f2a, 0xe9e2d6, 0.85]]) { const d = makeDog(ca, cb, s); scene.add(d.root); const p = randIn(); pets.push({ a: d, pos: p, heading: 0, target: randIn(), wait: 0, speed: R(1.4, 2.0), phase: 0, type: 'dog' }); }
  for (const [c1, c2] of [[0x2b2b2b, 0xffffff], [0xe08a3c, 0xf3d1a6]]) { const c = makeCat(c1, c2); scene.add(c.root); const p = randIn(); pets.push({ a: c, pos: p, heading: 0, target: randIn(), wait: R(3, 8), speed: 0.8, phase: 0, type: 'cat' }); }
}
// the house (with its balconies) and the parked cars are in the way: pushed out to the nearest side
const BLOCKED = [{ x0: HB.x0 - 0.4, x1: 18.5, z0: -2.3, z1: HB.z1 + 1.5 }, { x0: -17, x1: 13, z0: 10.6, z1: 16.6 }];
function keepOut(p) {
  for (const b of BLOCKED) {
    if (p.x < b.x0 || p.x > b.x1 || p.z < b.z0 || p.z > b.z1) continue;
    const d = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z], m = Math.min(...d), k = d.indexOf(m);
    if (k === 0) p.x = b.x0; else if (k === 1) p.x = b.x1; else if (k === 2) p.z = b.z0; else p.z = b.z1;
  }
}
let chatT = 6;
export function updateOutside(dt) {
  updateEvening(dt);
  updateTraffic(dt);
  // the roof: hidden from close up (the flat must be seen), fades in as the player zooms out (and never in the first-person view)
  if (roof) { const o = G.fps ? 0 : clamp((G.zoom - 1.35) / 0.4, 0, 1); roof.material.opacity = o; roof.visible = o > 0.02; roof.material.depthWrite = o > 0.98; }
  for (const k of kids) {
    const a = k.a;
    if (k.tramp) {   // bouncing: up and down on the mat (0.6 m), arms up at the top
      k.ph += dt * 3.2; const up = Math.abs(Math.sin(k.ph));
      a.animate(dt, false, 0); a.rig.sh[0].rotation.x = a.rig.sh[1].rotation.x = -2.4 * up; a.rig.sh[0].rotation.z = -0.3; a.rig.sh[1].rotation.z = 0.3;
      a.rig.knee[0].rotation.x = a.rig.knee[1].rotation.x = 0.6 * (1 - up); a.heading += dt * 0.4;
      a.sync(); a.rig.root.position.y = 0.62 + up * 1.1;
      continue;
    }
    // tag: the one who is "it" runs after the other, who wanders; now and then they swap
    const other = kids.find((o) => !o.tramp && o !== k);
    let tx = k.target.x, tz = k.target.z, sp = 1.7;
    if (k.it && other) { tx = other.a.pos.x; tz = other.a.pos.z; sp = 2.6; }
    const dx = tx - a.pos.x, dz = tz - a.pos.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (k.it && d < 0.6) { k.it = false; other.it = true; k.target = randIn(); say(a, pick(['Megvagy!', 'Te vagy a fogó!', 'Haha!']), 1.6); }
    else if (d > 0.3 && (k.it || k.wait <= 0)) { a.pos.x += dx / d * sp * dt; a.pos.z += dz / d * sp * dt; a.targetHeading = Math.atan2(dx, dz); moving = true; }
    else { k.wait -= dt; if (k.wait <= -2) { k.target = randIn(); k.wait = R(0, 1.5); } }
    keepOut(a.pos);
    a.heading = dampAngle(a.heading, a.targetHeading, 9, dt); a.animate(dt, moving, sp); a.sync(); a.rig.root.position.y = 0;   // on the ground (groundH is the flat's floor under the house)
  }
  for (const p of pets) {
    const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z, d = Math.hypot(dx, dz); let moving = 0;
    if (d > 0.3) { p.pos.x += dx / d * p.speed * dt; p.pos.z += dz / d * p.speed * dt; p.heading = dampAngle(p.heading, Math.atan2(dx, dz), 6, dt); moving = 1; }
    else { p.wait -= dt; if (p.wait <= 0) { p.target = p.type === 'dog' && kids.length > 2 && Math.random() < 0.4 ? kids[2 + (Math.random() < 0.5 ? 0 : 1)].a.pos.clone() : randIn(); p.wait = p.type === 'cat' ? R(4, 10) : R(1, 4); } }
    p.pos.x = clamp(p.pos.x, FENCE.x0 + 0.5, FENCE.x1 - 0.5); p.pos.z = clamp(p.pos.z, FENCE.z0 + 0.5, FENCE.z1 - 0.5); keepOut(p.pos);
    p.phase += dt * p.speed * (p.type === 'cat' ? 9 : 7); animLegs(p.a, p.phase, moving);
    p.a.tail.rotation.z = Math.sin(G.clockT * (p.type === 'cat' ? 2 : 12)) * (p.type === 'cat' ? 0.25 : 0.5);
    if (p.type === 'cat' && !moving) { p.a.legs[2].rotation.x = -1.2; p.a.legs[3].rotation.x = -1.2; p.a.body.rotation.x = -0.3; } else p.a.body.rotation.x = 0;
    p.a.root.position.set(p.pos.x, 0, p.pos.z); p.a.root.rotation.y = p.heading;
  }
  // now and then a sound from the yard (only shown when it is in the picture)
  if ((chatT -= dt) <= 0) {
    chatT = R(7, 14);
    const p = pick(pets);
    if (p) {
      say({ headWorld: (v) => v.set(p.pos.x, p.type === 'dog' ? 1.0 : 0.7, p.pos.z) }, p.type === 'dog' ? pick(['Vau!', 'Vau-vau!']) : pick(['Miaú!', 'Mrrr…']), 1.3, '');
      // the dog is heard indoors too (even in the first-person view); the cat only outside
      if (p.type === 'dog') soundAt(p.pos.x, p.pos.z, sBark, G.fps ? 0.7 : 1.2);
      else soundOut(p.pos.x, p.pos.z, () => tone('triangle', 700, 520, 0.35, 0.05));
    }
  }
}

// ---------------------------------------------------------------- far trees: a handful of boxes each (performance)
// The detailed voxel trees have ~4000 triangles each; the 100+ trees of the woods and the neighbourhood would be over a million
// per frame (and again for the shadows). Far away a few stacked boxes look the same: trunk + a crown of three blocks (oak /
// birch) or three shrinking tiers (pine). They are one merged mesh and cast no shadow (they are outside the shadow area).
function farTree(b, x, z, s, kind, n) {
  const leaf = [[0x3f8f3a, 0x4a9c42, 0x58ab4c], [0x24603a, 0x2c6f42, 0x367d4a], [0x7dbb40, 0x8cc84b, 0x9fd25a]][kind];
  b.bx(x, 0, z, 0.35 * s, 1.6 * s, 0.35 * s, kind === 2 ? 0xeeeee6 : 0x6e4a2b, n * 0.7, 0.05);
  if (kind === 1) { for (let t = 0; t < 3; t++) b.bx(x, (1.0 + t * 1.0) * s, z, (2.6 - t * 0.75) * s, 1.1 * s, (2.6 - t * 0.75) * s, leaf[t], n * 0.7 + t * 0.4, 0.06); return; }
  b.bx(x, 1.5 * s, z, 2.6 * s, 1.6 * s, 2.4 * s, leaf[0], n * 0.7, 0.06);
  b.bx(x + 0.3 * s, 2.6 * s, z - 0.2 * s, 2.0 * s, 1.2 * s, 2.1 * s, leaf[1], n * 0.7 + 0.5, 0.06);
  b.bx(x - 0.2 * s, 3.4 * s, z + 0.1 * s, 1.3 * s, 0.8 * s, 1.3 * s, leaf[2], n * 0.7 + 0.2, 0.06);
}
function buildFarTrees(b) {
  let n = 0;
  for (let x = 38; x < 60; x += 4.2) for (let z = -78; z < 16; z += 4.4) { const k = Math.round(x * 3 + z); farTree(b, x + R(-1.2, 1.2), z + R(-1.2, 1.2), R(1.4, 2.1), k % 3 ? 0 : 1, n++); }
  for (const [kind, x, z] of [[0, -27, -18], [0, -27, 4], [2, -38, 10], [0, -60, 12], [0, -50, 42], [2, -30, 41], [0, 0, 42], [0, 22, 41], [2, 42, 42], [0, 60, 41], [1, -66, -50], [0, -40, -55]]) farTree(b, x, z, 1.2, kind, n++);
}

// the props go in with the flat's furniture (home.js buildHome(placeOutsideProps)); this builds the rest
// ---------------------------------------------------------------- traffic on the street (right-hand: eastbound on the
// south lane, westbound on the north lane), different speeds, back to the other end when they leave the map; a soft
// whoosh when one passes the house
const traffic = [];
const CAR_LAMP = new THREE.BoxGeometry(0.3, 0.14, 0.06), HEAD_MAT = new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), TAIL_MAT = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const CAR_BEAM = new THREE.PlaneGeometry(2.0, 4.4).rotateX(-Math.PI / 2), BEAM_MAT = new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.18, depthWrite: false });
const carLights = [];
function buildTraffic() {
  const lanes = [{ z: 22.2, dir: 1 }, { z: 19.8, dir: -1 }];
  [[0, -70, 8.5], [0, -10, 7.0], [0, 45, 9.5], [1, 60, 8.0], [1, 5, 6.5], [1, -50, 9.0], [1, -85, 7.5]].forEach(([l, x, v], n) => {
    const m = new THREE.Mesh(getGeometry('car', (n * 2 + 1) % 6, true), vcMat); m.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(m); grp.rotation.y = lanes[l].dir > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(grp);
    // the lights (front: +z of the model, white; back: red) and, in the evening, a pool of light on the road ahead
    const lit = new THREE.Group(); lit.visible = false; grp.add(lit);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(CAR_LAMP, HEAD_MAT); h.position.set(s * 0.62, 0.62, 1.78); lit.add(h);
      const t = new THREE.Mesh(CAR_LAMP, TAIL_MAT); t.position.set(s * 0.62, 0.66, -1.88); lit.add(t);
    }
    const beam = new THREE.Mesh(CAR_BEAM, BEAM_MAT); beam.position.set(0, 0.05, 4.2); lit.add(beam);
    carLights.push(lit);
    traffic.push({ grp, x, z: lanes[l].z, dir: lanes[l].dir, v, sound: 0 });
  });
}
function updateTraffic(dt) {
  for (const c of traffic) {
    c.x += c.dir * c.v * dt;
    if (c.x > 100) c.x = -100; else if (c.x < -100) c.x = 100;
    c.grp.position.set(c.x, 0, c.z);
    const near = Math.abs(c.x - (G.petike ? G.petike.pos.x : 0)) < 2;
    if (near && c.sound <= 0) { soundOut(c.x, c.z, () => noise(1.1, 260, 0.7, 0.05)); c.sound = 3; }
    c.sound -= dt;
  }
}

export function buildOutside() {
  // separate meshes, so each is culled on its own and only what needs to casts a shadow (the shadow pass draws casters again)
  const add = (fn, cast) => { const m = partMesh(fn); m.castShadow = cast; scene.add(m); return m; };
  add((b) => buildGround(b), false);
  add((b) => { buildHouse(b); buildYard(b); }, true);
  add((b) => buildNeighbours(b), false);
  add((b) => buildFence(b), false);
  add((b) => buildFarTrees(b), false);
  buildRoof(); buildTraffic();
  buildLife();
}
