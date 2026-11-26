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
// ---------------------------------------------------------------- the people's way: through the middle of the rooms
// The shortest way hugs the walls and the corners (and passes every door). People walk down the middle of a corridor: a way
// near a wall costs more (Dijkstra on the clearance – the distance to the nearest blocked cell), then the corners are cut
// where a straight line keeps at least as far from the walls as the found way did.
function clearance(g) {   // in cells (8-neighbour steps) to the nearest blocked cell
  const D = new Float32Array(NX * NZ).fill(1e9), q = [];
  for (let k = 0; k < g.length; k++) if (g[k]) { D[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % NX, j = (k - i) / NX;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = idx(a, b); if (D[n] > D[k] + 1) { D[n] = D[k] + 1; q.push(n); }
    }
  }
  return D;
}
const COMFY = 0.8;   // (m: closer to a wall than this, a step costs more – up to 5×)
function pathMiddle(g, x0, z0, x1, z1) {
  const [si, sj] = nearestFree(g, ...cellOf(x0, z0)), [ti, tj] = nearestFree(g, ...cellOf(x1, z1));
  const D = clearance(g), start = idx(si, sj), goal = idx(ti, tj);
  const cost = new Float32Array(NX * NZ).fill(Infinity), prev = new Int32Array(NX * NZ).fill(-1);
  const heap = [[0, start]]; cost[start] = 0;
  const push = (it) => { heap.push(it); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  while (heap.length) {
    const [c0, k] = pop(); if (c0 > cost[k]) continue; if (k === goal) break;
    const i = k % NX, j = (k - i) / NX;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = idx(a, b); if (g[n]) continue;
      if (di && dj && (g[idx(i + di, j)] || g[idx(i, j + dj)])) continue;
      const step = (di && dj ? 1.414 : 1) * (1 + 4 * Math.max(0, 1 - D[n] * C / COMFY));
      if (c0 + step < cost[n]) { cost[n] = c0 + step; prev[n] = k; push([cost[n], n]); }
    }
  }
  if (prev[goal] < 0 && goal !== start) return null;
  const cells = []; for (let k = goal; k !== start && k >= 0; k = prev[k]) cells.push(k); cells.push(start); cells.reverse();
  // straighten: from each kept cell, jump to the farthest one the straight line reaches without coming nearer to a wall
  const ij = (k) => [k % NX, (k - (k % NX)) / NX];
  const lineOk = (a, b, minD) => {
    const [ai, aj] = ij(cells[a]), [bi, bj] = ij(cells[b]), n = Math.max(Math.abs(bi - ai), Math.abs(bj - aj)) * 2;
    for (let t = 1; t < n; t++) { const k = idx(Math.round(ai + (bi - ai) * t / n), Math.round(aj + (bj - aj) * t / n)); if (g[k] || D[k] < minD) return false; }
    return true;
  };
  const keep = [0];
  for (let a = 0; a < cells.length - 1;) {
    let best = a + 1, minD = D[cells[a + 1]];
    for (let b = a + 2; b < cells.length; b++) { minD = Math.min(minD, D[cells[b]]); if (lineOk(a, b, Math.min(minD, D[cells[a]]))) best = b; }
    keep.push(best); a = best;
  }
  const out = keep.slice(1).map((n) => { const [i, j] = ij(cells[n]); return [cx(i), cz(j)]; });
  if (out.length) out[out.length - 1] = [x1, z1]; else out.push([x1, z1]);
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
// pad: the walker's half width – dad with his arms ≈ 0.5 m, mum ≈ 0.3 m. Through each door a narrow corridor across the
// middle of the opening stays open (dad tucks his arms in there – ep2.js).
const DOOR_MID = 0.07;   // (the way runs through the middle of the opening: dad, his arms tucked in, just fits the 1.05 m doors)
export function doorCorridors(doors) {
  const out = [];
  for (const d of doors) {
    if (!d.pivot || d.kind === 'locked' || !d.col || !d.col.box) continue;
    const c = d.col, alongX = c.x1 - c.x0 > c.z1 - c.z0;
    const mx = (c.x0 + c.x1) / 2, mz = (c.z0 + c.z1) / 2;
    out.push(alongX ? { x0: mx - DOOR_MID, x1: mx + DOOR_MID, z0: mz - 0.8, z1: mz + 0.8, alongX, d, lo: c.x0, hi: c.x1 }
      : { x0: mx - 0.8, x1: mx + 0.8, z0: mz - DOOR_MID, z1: mz + DOOR_MID, alongX, d, lo: c.z0, hi: c.z1 });
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
    else { const q = pathMiddle(g, x, z, p[0], p[1]); if (q && q.length) out.push(...q); else out.push(p); }
    x = p[0]; z = p[1];
  });
  return out;
}
