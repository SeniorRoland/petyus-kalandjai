// Petike a parkban – ui: Szövegbuborékok, toast, nagy felirat.
import { camera } from './scene.js';
import { G } from './state.js';
import { $, V3, clamp, damp } from './util.js';

// ---------------------------------------------------------------- UI helpers
// Comic speech bubbles. Kinds: speech · shout ("!!" or capitals) · mutter (ends with "…") · sfx (animals, cars: lettering only).
// Each frame: anchor above the speaker's head → bubbles pushed apart so they don't cover each other → tail drawn to the head.
const bubbles = [];
const SVGNS = 'http://www.w3.org/2000/svg';
const SFX_COLORS = ['#ff5c3d', '#ffd23f', '#4dabf7', '#7ddc5a', '#ff7ad9'];
function kindOf(actor, text) {
  if (!actor.rig) return 'sfx';
  const letters = text.replace(/[^A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]/g, ''), upper = letters.replace(/[^A-ZÁÉÍÓÖŐÚÜŰ]/g, '').length;
  if (/!!/.test(text) || (letters.length >= 3 && upper / letters.length > 0.6)) return 'shout';
  if (/…$/.test(text.trim()) && !/!/.test(text)) return 'mutter';
  return 'speech';
}
export function say(actor, text, dur = 2.8, name = actor.name) {
  for (const b of bubbles) if (b.actor === actor) b.t = 0;   // one bubble per speaker: the new line replaces the old
  const kind = kindOf(actor, text), named = !!name && kind !== 'sfx';
  const el = document.createElement('div'); el.className = 'bubble ' + kind + (named ? ' named' : '');
  const inner = document.createElement('div'); inner.className = 'in'; inner.textContent = text;
  if (named) { const w = document.createElement('span'); w.className = 'who'; w.textContent = name; inner.appendChild(w); }
  el.appendChild(inner); $('bubbles').appendChild(el);
  if (kind === 'sfx') { el.style.setProperty('--sfx', SFX_COLORS[Math.floor(Math.random() * SFX_COLORS.length)]); el.style.setProperty('--rot', (Math.random() * 16 - 8).toFixed(1) + 'deg'); }
  let g = null, fill = null, edge = null;
  if (kind !== 'sfx') {
    g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', kind);
    fill = document.createElementNS(SVGNS, 'path'); fill.setAttribute('class', 'fill');
    edge = document.createElementNS(SVGNS, 'path'); edge.setAttribute('class', 'edge');
    g.append(fill, edge); $('tails').appendChild(g);
  }
  bubbles.push({ actor, el, g, fill, edge, kind, t: dur, w: 0, h: 0, x: 0, y: 0, tx: 0, ty: 0, ax: 0, ay: 0, placed: false });
}
const tmpV = new V3();
const GAP = 8, TAIL = 24, TAIL_MAX = 150;
export function updateBubbles(dt) {
  const W = window.innerWidth, H = window.innerHeight;
  // 1. timers, anchors (speaker's head on screen), sizes
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0) { b.el.remove(); if (b.g) b.g.remove(); bubbles.splice(i, 1); continue; }
    (b.actor.headWorld ? b.actor.headWorld(tmpV) : tmpV.copy(b.actor.root.position).add(new V3(0, 0.9, 0)));
    tmpV.project(camera);
    b.ax = (tmpV.x * 0.5 + 0.5) * W; b.ay = (-tmpV.y * 0.5 + 0.5) * H;
    b.w = b.el.offsetWidth; b.h = b.el.offsetHeight;
    b.tx = b.ax - b.w / 2; b.ty = b.ay - b.h - (b.kind === 'sfx' ? 4 : TAIL);
  }
  // 2. no covering: place the bubbles one by one in the order they appeared (older ones keep their spot);
  //    each goes to its ideal spot above the head, or the nearest free spot around it (up first, then sideways, then down)
  const placed = [];
  const fits = (x, y, b) => placed.every((p) => x + b.w + GAP <= p.tx || p.tx + p.w + GAP <= x || y + b.h + GAP <= p.ty || p.ty + p.h + GAP <= y);
  const inScreen = (b, x, y) => [clamp(x, 6, Math.max(6, W - 6 - b.w)), clamp(y, 6, Math.max(6, H - 6 - b.h))];
  for (const b of bubbles) {
    let [x, y] = inScreen(b, b.tx, b.ty), found = fits(x, y, b);
    for (let r = 10; !found && r <= 900; r += 10) {
      for (const [cx, cy] of [[0, -r], [-r, 0], [r, 0], [-r, -r], [r, -r], [0, r], [-r, r], [r, r]]) {
        const [nx, ny] = inScreen(b, b.tx + cx, b.ty + cy);
        if (fits(nx, ny, b)) { x = nx; y = ny; found = true; break; }
      }
    }
    b.tx = x; b.ty = y; placed.push(b);
  }
  // 3. follow the speaker instantly; only the push-aside offset glides (and snaps if gliding would mean overlapping)
  for (const b of bubbles) {
    const bx = b.ax - b.w / 2, by = b.ay - b.h - (b.kind === 'sfx' ? 4 : TAIL), ox = b.tx - bx, oy = b.ty - by;
    if (!b.placed) { b.ox = ox; b.oy = oy; b.placed = true; } else { b.ox = damp(b.ox, ox, 14, dt); b.oy = damp(b.oy, oy, 14, dt); }
    b.x = bx + b.ox; b.y = by + b.oy;
  }
  for (let i = 0; i < bubbles.length; i++) for (let j = i + 1; j < bubbles.length; j++) {
    const A = bubbles[i], B = bubbles[j];
    if (Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > 0 && Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > 0) for (const C of [A, B]) { C.x = C.tx; C.y = C.ty; C.ox = C.tx - (C.ax - C.w / 2); C.oy = C.ty - (C.ay - C.h - (C.kind === 'sfx' ? 4 : TAIL)); }
  }
  for (const b of bubbles) {
    const op = Math.min(1, b.t * 3);
    b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`; b.el.style.opacity = op;
    if (b.g) { b.g.setAttribute('opacity', op); drawTail(b); }
  }
}
// wedge from the bubble's edge (the side facing the speaker) to just above the head; its white fill covers the border where it joins
function drawTail(b) {
  const { x, y, w, h } = b; let tipX = b.ax, tipY = b.ay - 4;
  let bx, by, px, py, ix, iy;                      // base centre on the border, unit vector along the border, inward normal
  if (tipY >= y + h - 6 || (tipX >= x && tipX <= x + w)) { bx = clamp(tipX, x + 22, x + w - 22); by = y + h - 1.5; px = 1; py = 0; ix = 0; iy = -1; }
  else if (tipX < x) { bx = x + 1.5; by = clamp(tipY, y + 16, y + h - 16); px = 0; py = 1; ix = 1; iy = 0; }
  else { bx = x + w - 1.5; by = clamp(tipY, y + 16, y + h - 16); px = 0; py = 1; ix = -1; iy = 0; }
  const d = Math.hypot(tipX - bx, tipY - by);
  if (d > TAIL_MAX) { tipX = bx + (tipX - bx) / d * TAIL_MAX; tipY = by + (tipY - by) / d * TAIL_MAX; }
  const hw = Math.min(9, Math.max(5, d * 0.35));   // base half-width
  const l = [bx - px * hw, by - py * hw], r = [bx + px * hw, by + py * hw], li = [l[0] + ix * 4, l[1] + iy * 4], ri = [r[0] + ix * 4, r[1] + iy * 4];
  const f = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1), t = tipX.toFixed(1) + ' ' + tipY.toFixed(1);
  b.fill.setAttribute('d', `M${f(li)} L${f(l)} L${t} L${f(r)} L${f(ri)} Z`);
  b.edge.setAttribute('d', `M${f(l)} L${t} L${f(r)}`);
}

export function toast(html, dur = 4) { $('toast').innerHTML = html; $('toast').classList.add('show'); G.toastT = dur; }

export function bigText(txt, dur = 2) { $('big').textContent = txt; $('big').classList.add('show'); G.bigT = dur; }

