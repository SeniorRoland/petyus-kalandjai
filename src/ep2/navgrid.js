// Petyus kalandjai – 2. rész: útkeresés a lakásban (Karcsi szökése: a tengerimalac és a négykézláb kergető apa).
// A grid over the flat (15 cm cells, the flat's own frame: x 0 … XE, z 0 … ZS). A cell is blocked when it lies in a tall
// collider (walls, closed doors, wardrobes, the fridge, kitchen units – h ≥ 0.85 m); low furniture (beds, the sofa, the
// table, the armchair, the desk) can be crawled under – those are the hiding places. Breadth-first search, rebuilt per query
// (the doors open and close); the path is thinned to every few cells.
import { colliders } from '../world.js';
import { ROOMS, XE, ZS } from './home.js';

// the grid covers the flat and its two balconies (OX, OZ: its corner); a cell outside every room (the air round the house) is
// blocked, so no way leads out over a balcony's railing
const C = 0.15, OX = -0.3, OZ = -2.1, NX = Math.ceil((XE + 3.0 - OX) / C), NZ = Math.ceil((ZS + 0.3 - OZ) / C), PAD_PIG = 0.07, PAD_PERSON = 0.24;
const idx = (i, j) => j * NX + i;
const gx = (x) => Math.floor((x - OX) / C), gz = (z) => Math.floor((z - OZ) / C), cx = (i) => OX + (i + 0.5) * C, cz = (j) => OZ + (j + 0.5) * C;
const cellOf = (x, z) => [Math.max(0, Math.min(NX - 1, gx(x))), Math.max(0, Math.min(NZ - 1, gz(z)))];
let outside = null;
function outsideCells() {
  if (outside) return outside;
  outside = new Uint8Array(NX * NZ); const e = 0.14;   // (half a wall more: the doorways)
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = cx(i), z = cz(j); if (!ROOMS.some((r) => x >= r.x0 - e && x <= r.x1 + e && z >= r.z0 - e && z <= r.z1 + e)) outside[idx(i, j)] = 1; }
  return outside;
}
// pass: colliders to ignore (closed doors for somebody who opens them on the way – Angi looking for her keys)
// pad: the walker's half width (Karcsi: thin; the parents: a person – they would brush into the walls with less)
function blockedGrid(pass = null, PAD = PAD_PIG) {
  const g = outsideCells().slice();
  for (const c of colliders) {
    if (c.h < 0.85 || (pass && pass.has(c))) continue;   // low furniture (or an open door: h = −1): passable
    if (c.box) {
      const i0 = gx(c.x0 - PAD), i1 = gx(c.x1 + PAD), j0 = gz(c.z0 - PAD), j1 = gz(c.z1 + PAD);
      for (let j = Math.max(0, j0); j <= Math.min(NZ - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) g[idx(i, j)] = 1;
    } else {
      const r = c.r + PAD, i0 = gx(c.x - r), i1 = gx(c.x + r), j0 = gz(c.z - r), j1 = gz(c.z + r);
      for (let j = Math.max(0, j0); j <= Math.min(NZ - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++)
        if (Math.hypot(cx(i) - c.x, cz(j) - c.z) < r) g[idx(i, j)] = 1;
    }
  }
  return g;
}
// the nearest free cell to a point (a target inside furniture that is too tall, or right on a wall)
function nearestFree(g, i, j) {
  if (!g[idx(i, j)]) return [i, j];
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
    if (!g[idx(a, b)]) return [a, b];
  }
  return [i, j];
}
// a path from (x0, z0) to (x1, z1): [[x, z], …] (the last point exact), or null when it cannot be reached
export function findPath(x0, z0, x1, z1, pass = null) { return pathOn(blockedGrid(pass), x0, z0, x1, z1); }
function pathOn(g, x0, z0, x1, z1) {
  const [si, sj] = nearestFree(g, ...cellOf(x0, z0)), [ti, tj] = nearestFree(g, ...cellOf(x1, z1));
  const prev = new Int32Array(NX * NZ).fill(-1), start = idx(si, sj), goal = idx(ti, tj);
  const q = [start]; prev[start] = start;
  for (let h = 0; h < q.length; h++) {
    const k = q[h]; if (k === goal) break;
    const i = k % NX, j = (k - i) / NX;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = idx(a, b); if (g[n] || prev[n] >= 0) continue;
      if (di && dj && (g[idx(i + di, j)] || g[idx(i, j + dj)])) continue;   // no cutting corners
      prev[n] = k; q.push(n);
    }
  }
  if (prev[goal] < 0) return null;
  const cells = []; for (let k = goal; k !== start; k = prev[k]) cells.push(k); cells.reverse();
  const out = [];
  cells.forEach((k, n) => { if (n % 3 === 2 || n === cells.length - 1) { const i = k % NX; out.push([cx(i), cz((k - i) / NX)]); } });
  if (out.length) out[out.length - 1] = [x1, z1];
  return out;
}
export function walkable(x, z) { const g = blockedGrid(); const [i, j] = cellOf(x, z); return !g[idx(i, j)]; }

// a walk given as points (the scripted ones: dressing, the creamy coffee, mum's jobs …) made safe: a leg that would cross a
// wall or tall furniture is replaced by a found path round it (closed doors count as open: the walker opens them – ep2.js)
const passDoorsOf = (doors) => new Set(doors.filter((d) => d.pivot && d.kind !== 'locked').map((d) => d.col));
function lineFree(g, x0, z0, x1, z1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.07)), [ei, ej] = cellOf(x1, z1), [si, sj] = cellOf(x0, z0);
  for (let k = 1; k < n; k++) {
    const [i, j] = cellOf(x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n);
    if ((i === si && j === sj) || (i === ei && j === ej)) continue;   // (the start or the goal itself may be in a chair / at the bowl)
    if (g[idx(i, j)]) return false;
  }
  return true;
}
export function navRoute(x, z, pts, doors) {
  const g = blockedGrid(passDoorsOf(doors), PAD_PERSON), out = [];
  for (const p of pts) {
    if (lineFree(g, x, z, p[0], p[1])) out.push(p);
    else { const q = pathOn(g, x, z, p[0], p[1]); if (q && q.length) out.push(...q); else out.push(p); }
    x = p[0]; z = p[1];
  }
  return out;
}
