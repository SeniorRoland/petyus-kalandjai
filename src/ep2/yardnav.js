// Petyus kalandjai – 2. rész: útkeresés az iskola udvarán (a gyerekek ne fussanak át az épületeken).
// The yard people (children, the PE teacher) are walked by straight walkTo segments. Here a 0.5 m grid over the campus:
// blocked are the buildings' footprints and the tall colliders (trees, the playground's frames; 0.3 m round them). A segment
// whose two ends are both outdoors and whose straight line is blocked becomes an A* route (straightened by line of sight);
// segments with an end indoors (a room, the corridor: those routes are laid out by hand, through the doors) stay as they are.
// routeYard(a, pts) → the new point list; wrapYard(actor) makes its walkTo use it.
import { colliders } from '../world.js';
import { Actor } from '../actors.js';

const CELL = 0.5, PAD = 0.3;
let G = null;   // { x0, z0, nx, nz, blk: Uint8Array, rooms: [{x0,z0,x1,z1}] }

// bounds: the campus { x0, z0, x1, z1 }; rooms: the buildings' footprints (indoors)
export function initYard(bounds, rooms) { G = { bounds, rooms, blk: null }; }

function build() {
  const { bounds: b, rooms } = G, nx = Math.ceil((b.x1 - b.x0) / CELL), nz = Math.ceil((b.z1 - b.z0) / CELL), blk = new Uint8Array(nx * nz);
  const fill = (x0, z0, x1, z1) => {
    const i0 = Math.max(0, Math.floor((x0 - b.x0) / CELL)), i1 = Math.min(nx - 1, Math.floor((x1 - b.x0) / CELL));
    const j0 = Math.max(0, Math.floor((z0 - b.z0) / CELL)), j1 = Math.min(nz - 1, Math.floor((z1 - b.z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) blk[j * nx + i] = 1;
  };
  for (const r of rooms) fill(r.x0 - PAD, r.z0 - PAD, r.x1 + PAD, r.z1 + PAD);
  for (const c of colliders) {
    if (c.h < 1.2 || c.soft) continue;
    if (c.box) { if (c.x1 - c.x0 > 30 || c.z1 - c.z0 > 30) continue; fill(c.x0 - PAD, c.z0 - PAD, c.x1 + PAD, c.z1 + PAD); }   // (not the long fences)
    else {
      const r = c.r + PAD, i0 = Math.floor((c.x - r - b.x0) / CELL), i1 = Math.floor((c.x + r - b.x0) / CELL), j0 = Math.floor((c.z - r - b.z0) / CELL), j1 = Math.floor((c.z + r - b.z0) / CELL);
      for (let j = Math.max(0, j0); j <= Math.min(nz - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i1); i++) {
        const cx = b.x0 + (i + 0.5) * CELL, cz = b.z0 + (j + 0.5) * CELL; if (Math.hypot(cx - c.x, cz - c.z) <= r) blk[j * nx + i] = 1;
      }
    }
  }
  Object.assign(G, { nx, nz, blk });
}

const indoor = (x, z) => G.rooms.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
const cellOf = (x, z) => [Math.floor((x - G.bounds.x0) / CELL), Math.floor((z - G.bounds.z0) / CELL)];
const inside = (i, j) => i >= 0 && j >= 0 && i < G.nx && j < G.nz;
const free = (i, j) => inside(i, j) && !G.blk[j * G.nx + i];
const centre = (i, j) => [G.bounds.x0 + (i + 0.5) * CELL, G.bounds.z0 + (j + 0.5) * CELL];
function clearLine(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.4));
  for (let k = 1; k < n; k++) { const t = k / n, [i, j] = cellOf(ax + (bx - ax) * t, az + (bz - az) * t); if (inside(i, j) && G.blk[j * G.nx + i]) return false; }
  return true;
}
function nearestFree(i, j) {   // a blocked end (next to a wall, at a toy): the closest free cell
  if (free(i, j)) return [i, j];
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && free(i + di, j + dj)) return [i + di, j + dj];
  return null;
}
function astar(s, g) {
  const { nx, nz } = G, N = nx * nz, gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [], push = (f, n) => { heap.push([f, n]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = (i, j) => { const dx = Math.abs(i - g[0]), dz = Math.abs(j - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const S = s[1] * nx + s[0], T = g[1] * nx + g[0]; gs[S] = 0; push(h(s[0], s[1]), S);
  while (heap.length) {
    const [, n] = pop(); if (closed[n]) continue; closed[n] = 1; if (n === T) break;
    const i = n % nx, j = (n / nx) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const a = i + di, b = j + dj; if (!free(a, b)) continue;
      if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;   // no squeezing past a corner
      const m = b * nx + a, c = gs[n] + (di && dj ? 1.414 : 1); if (c < gs[m]) { gs[m] = c; from[m] = n; push(c + h(a, b), m); }
    }
  }
  if (from[T] < 0 && S !== T) return null;
  const cells = []; for (let n = T; n !== -1; n = from[n]) cells.push(n); cells.reverse();
  return cells.map((n) => centre(n % nx, (n / nx) | 0));
}
function detour(ax, az, bx, bz) {   // the points between a and b (without a, with b)
  if (clearLine(ax, az, bx, bz)) return [[bx, bz]];
  const s = nearestFree(...cellOf(ax, az)), g = nearestFree(...cellOf(bx, bz)); if (!s || !g) return [[bx, bz]];
  const cells = astar(s, g); if (!cells) return [[bx, bz]];
  const out = []; let cx = ax, cz = az, k = 0;   // string pulling: the farthest cell still in sight, again and again
  while (k < cells.length) { let f = k; for (let m = cells.length - 1; m > k; m--) if (clearLine(cx, cz, cells[m][0], cells[m][1])) { f = m; break; } out.push(cells[f]); [cx, cz] = cells[f]; k = f + 1; }
  out.push([bx, bz]);   // (the very point asked for – a seat, a toy – even if it is next to something)
  return out;
}
export function routeYard(from, pts) {
  if (!G) return pts; if (!G.blk) build();
  const out = []; let ax = from.x, az = from.z;
  for (const p of pts) {
    const bx = p[0], bz = p[1];
    if (indoor(ax, az) || indoor(bx, bz)) out.push([bx, bz]); else out.push(...detour(ax, az, bx, bz));
    ax = bx; az = bz;
  }
  return out;
}
export function wrapYard(a) { a.walkTo = (pts, speed, keep) => Actor.prototype.walkTo.call(a, routeYard(a.pos, pts), speed, keep); }
