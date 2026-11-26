// Petyus kalandjai – 2. rész: útkeresés a lakásban (Karcsi szökése: a tengerimalac és a négykézláb kergető apa).
// A grid over the flat (15 cm cells, the flat's own frame: x 0 … XE, z 0 … ZS). A cell is blocked when it lies in a tall
// collider (walls, closed doors, wardrobes, the fridge, kitchen units – h ≥ 0.85 m); low furniture (beds, the sofa, the
// table, the armchair, the desk) can be crawled under – those are the hiding places. Breadth-first search, rebuilt per query
// (the doors open and close); the path is thinned to every few cells.
import { colliders } from '../world.js';
import { ROOMS, XE, ZS } from './home.js';

// the grid covers the flat and its two balconies (OX, OZ: its corner); a cell outside every room (the air round the house) is
// blocked, so no way leads out over a balcony's railing
const C = 0.075, OX = -0.3, OZ = -2.1, NX = Math.ceil((XE + 3.0 - OX) / C), NZ = Math.ceil((ZS + 0.3 - OZ) / C), PAD_PIG = 0.07;
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
  for (let r = 1; r < 16; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
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
  cells.forEach((k, n) => { if (n % 4 === 3 || n === cells.length - 1) { const i = k % NX; out.push([cx(i), cz((k - i) / NX)]); } });
  if (out.length) out[out.length - 1] = [x1, z1];
  return out;
}
export function walkable(x, z) { const g = blockedGrid(); const [i, j] = cellOf(x, z); return !g[idx(i, j)]; }

// a walk given as points (the scripted ones: dressing, the creamy coffee, mum's jobs …) made safe: a leg that would cross a
// wall or tall furniture is replaced by a found path round it (closed doors count as open: the walker opens them – ep2.js)
const passDoorsOf = (doors) => new Set(doors.filter((d) => d.pivot && d.kind !== 'locked').map((d) => d.col));
// skipStart / skipEnd: only the walk's very first and very last point may lie in a blocked cell (he gets up from a chair, he
// sits down at the bowl) – every other point of the walk must be free (a leg's ends too: a found path of short legs)
function lineFree(g, x0, z0, x1, z1, skipStart, skipEnd) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.07)), [ei, ej] = cellOf(x1, z1), [si, sj] = cellOf(x0, z0);
  for (let k = 0; k <= n; k++) {
    const [i, j] = cellOf(x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n);
    if ((skipStart && i === si && j === sj) || (skipEnd && i === ei && j === ej)) continue;
    if (g[idx(i, j)]) return false;
  }
  return true;
}
// pad: the walker's half width – dad with his arms ≈ 0.5 m, mum ≈ 0.3 m. A doorway is narrower than dad: through the doors
// (a corridor across each opening, up to its jambs' depth) the grid stays open – there they turn sideways (ep2.js).
const DOOR_DEPTH = 0.27;   // (a sideways walker's half depth – chest / back – plus a little: the way runs through the middle)
export function doorCorridors(doors) {
  const out = [];
  for (const d of doors) {
    if (!d.pivot || d.kind === 'locked' || !d.col || !d.col.box) continue;
    const c = d.col, alongX = c.x1 - c.x0 > c.z1 - c.z0;
    out.push(alongX ? { x0: c.x0 + DOOR_DEPTH, x1: c.x1 - DOOR_DEPTH, z0: (c.z0 + c.z1) / 2 - 0.8, z1: (c.z0 + c.z1) / 2 + 0.8, alongX, d }
      : { x0: (c.x0 + c.x1) / 2 - 0.8, x1: (c.x0 + c.x1) / 2 + 0.8, z0: c.z0 + DOOR_DEPTH, z1: c.z1 - DOOR_DEPTH, alongX, d });
  }
  return out;
}
export function navRoute(x, z, pts, doors, pad = 0.3) {
  const g = blockedGrid(passDoorsOf(doors), pad), base = blockedGrid(passDoorsOf(doors), 0.02);
  for (const r of doorCorridors(doors)) for (let j = Math.max(0, gz(r.z0)); j <= Math.min(NZ - 1, gz(r.z1)); j++) for (let i = Math.max(0, gx(r.x0)); i <= Math.min(NX - 1, gx(r.x1)); i++) {
    const k = idx(i, j), inX = cx(i) >= r.x0 && cx(i) <= r.x1, inZ = cz(j) >= r.z0 && cz(j) <= r.z1;
    if (inX && inZ && !base[k]) g[k] = 0;   // (only what the padding closed: never a wall or furniture itself)
  }
  // the points that need not be free: the start and the goal; any other point in a blocked cell is dropped (the found path
  // replaces the stretch round it)
  const last = pts[pts.length - 1], keep = pts.filter((p, k) => k === pts.length - 1 || !g[idx(...cellOf(p[0], p[1]))]);
  const out = [];
  keep.forEach((p, k) => {
    if (lineFree(g, x, z, p[0], p[1], k === 0, p === last)) out.push(p);
    else { const q = pathOn(g, x, z, p[0], p[1]); if (q && q.length) out.push(...q); else out.push(p); }
    x = p[0]; z = p[1];
  });
  return out;
}
