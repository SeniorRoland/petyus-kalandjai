// Petyus kalandjai – 2. rész: útkeresés a lakásban (Karcsi szökése: a tengerimalac és a négykézláb kergető apa).
// A grid over the flat (15 cm cells, the flat's own frame: x 0 … XE, z 0 … ZS). A cell is blocked when it lies in a tall
// collider (walls, closed doors, wardrobes, the fridge, kitchen units – h ≥ 0.85 m); low furniture (beds, the sofa, the
// table, the armchair, the desk) can be crawled under – those are the hiding places. Breadth-first search, rebuilt per query
// (the doors open and close); the path is thinned to every few cells.
import { colliders } from '../world.js';
import { XE, ZS } from './home.js';

const C = 0.15, NX = Math.ceil(XE / C), NZ = Math.ceil(ZS / C), PAD = 0.07;
const idx = (i, j) => j * NX + i;
const cellOf = (x, z) => [Math.max(0, Math.min(NX - 1, Math.floor(x / C))), Math.max(0, Math.min(NZ - 1, Math.floor(z / C)))];
// pass: colliders to ignore (closed doors for somebody who opens them on the way – Angi looking for her keys)
function blockedGrid(pass = null) {
  const g = new Uint8Array(NX * NZ);
  for (const c of colliders) {
    if (c.h < 0.85 || (pass && pass.has(c))) continue;   // low furniture (or an open door: h = −1): passable
    if (c.box) {
      const i0 = Math.floor((c.x0 - PAD) / C), i1 = Math.floor((c.x1 + PAD) / C), j0 = Math.floor((c.z0 - PAD) / C), j1 = Math.floor((c.z1 + PAD) / C);
      for (let j = Math.max(0, j0); j <= Math.min(NZ - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) g[idx(i, j)] = 1;
    } else {
      const r = c.r + PAD, i0 = Math.floor((c.x - r) / C), i1 = Math.floor((c.x + r) / C), j0 = Math.floor((c.z - r) / C), j1 = Math.floor((c.z + r) / C);
      for (let j = Math.max(0, j0); j <= Math.min(NZ - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++)
        if (Math.hypot((i + 0.5) * C - c.x, (j + 0.5) * C - c.z) < r) g[idx(i, j)] = 1;
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
  cells.forEach((k, n) => { if (n % 3 === 2 || n === cells.length - 1) { const i = k % NX; out.push([(i + 0.5) * C, ((k - i) / NX + 0.5) * C]); } });
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
  const g = blockedGrid(passDoorsOf(doors)), out = [];
  for (const p of pts) {
    if (lineFree(g, x, z, p[0], p[1])) out.push(p);
    else { const q = pathOn(g, x, z, p[0], p[1]); if (q && q.length) out.push(...q); else out.push(p); }
    x = p[0]; z = p[1];
  }
  return out;
}
