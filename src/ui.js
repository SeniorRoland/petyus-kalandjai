// Petyus kalandjai – ui: Szövegbuborékok, toast, nagy felirat.
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
  let who = null;
  if (named) { who = document.createElement('span'); who.className = 'who'; who.textContent = name; inner.appendChild(who); }
  el.appendChild(inner); $('bubbles').appendChild(el);
  if (kind === 'sfx') { el.style.setProperty('--sfx', SFX_COLORS[Math.floor(Math.random() * SFX_COLORS.length)]); el.style.setProperty('--rot', (Math.random() * 16 - 8).toFixed(1) + 'deg'); }
  let g = null, fill = null, edge = null;
  if (kind !== 'sfx') {
    g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', kind);
    fill = document.createElementNS(SVGNS, 'path'); fill.setAttribute('class', 'fill');
    edge = document.createElementNS(SVGNS, 'path'); edge.setAttribute('class', 'edge');
    g.append(fill, edge); $('tails').appendChild(g);
  }
  bubbles.push({ actor, el, g, fill, edge, who, name, kind, t: dur, w: 0, h: 0, x: 0, y: 0, tx: 0, ty: 0, bx: 0, by: 0, ax: 0, ay: 0, placed: false, sub: false, hidden: false, arrow: '' });
}
const tmpV = new V3();
const GAP = 8, TAIL = 24, TAIL_MAX = 150, EDGE = 6, MAX_SUBS = 3;
// the visible picture: inside the cutscene / letterbox bars (they animate, so they are measured every frame)
function viewRect(W, H) {
  const top = $('cbarT').offsetHeight, bot = $('cbarB').offsetHeight;
  return { x0: EDGE, x1: W - EDGE, y0: top + EDGE, y1: H - bot - EDGE, bars: top + bot > 0 };
}
export function updateBubbles(dt) {
  const W = window.innerWidth, H = window.innerHeight, V = viewRect(W, H);
  // 1. timers, anchors (speaker's head on screen), in view or not, sizes
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0) { b.el.remove(); if (b.g) b.g.remove(); bubbles.splice(i, 1); continue; }
    (b.actor.headWorld ? b.actor.headWorld(tmpV) : tmpV.copy(b.actor.root.position).add(new V3(0, 0.9, 0)));
    tmpV.project(camera);
    b.ax = (tmpV.x * 0.5 + 0.5) * W; b.ay = (-tmpV.y * 0.5 + 0.5) * H;
    // a speaker outside the picture talks in a subtitle at the bottom (margin + hysteresis: no flicker at the edge)
    const m = b.sub ? 30 : 0, inView = b.ax > V.x0 + m && b.ax < V.x1 - m && b.ay > V.y0 + 10 + m && b.ay < V.y1 - 10 - m;
    if (b.sub === inView) { b.sub = !inView; b.el.classList.toggle('sub', b.sub); b.placed = false; }
    b.hidden = b.sub && b.kind === 'sfx';                    // an off-screen bark / horn is just not shown
    if (b.who) {                                              // ◀ Petya / Petya ▶: which way the speaker is
      const arrow = !b.sub ? '' : b.ax < V.x0 ? 'L' : b.ax > V.x1 ? 'R' : '';
      if (arrow !== b.arrow) { b.arrow = arrow; b.who.textContent = (arrow === 'L' ? '◀ ' : '') + b.name + (arrow === 'R' ? ' ▶' : ''); }
    }
    b.w = b.el.offsetWidth; b.h = b.el.offsetHeight;
    if (!b.sub) { b.bx = b.ax - b.w / 2; b.by = b.ay - b.h - (b.kind === 'sfx' ? 4 : TAIL); }
  }
  // subtitles: centred, stacked upwards from the bottom of the picture (above the prompt / the juggling panel in play)
  let yb = V.bars ? V.y1 - 4 : H - 110;
  if ($('juggle').style.display === 'block') yb = Math.min(yb, $('juggle').getBoundingClientRect().top - GAP);
  // at most 3 at once (the newest; older ones bow out), the newest at the bottom like film subtitles
  const subs = bubbles.filter((b) => b.sub && !b.hidden).reverse();
  subs.forEach((b, i) => { if (i >= MAX_SUBS || yb - b.h < V.y0) { b.hidden = true; return; } yb -= b.h; b.bx = W / 2 - b.w / 2; b.by = yb; yb -= GAP; });
  // 2. no covering: subtitles first, then the bubbles one by one in the order they appeared (older ones keep their spot);
  //    each goes to its ideal spot above the head, or the nearest free spot around it (up first, then sideways, then down)
  const placed = [];
  const fits = (x, y, b) => placed.every((p) => x + b.w + GAP <= p.tx || p.tx + p.w + GAP <= x || y + b.h + GAP <= p.ty || p.ty + p.h + GAP <= y);
  const inScreen = (b, x, y) => [clamp(x, V.x0, Math.max(V.x0, V.x1 - b.w)), clamp(y, V.y0, Math.max(V.y0, V.y1 - b.h))];
  for (const b of bubbles) if (b.sub && !b.hidden) { b.tx = b.bx; b.ty = b.by; placed.push(b); }
  for (const b of bubbles) {
    if (b.sub) continue;
    b.tx = b.bx; b.ty = b.by;
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
  const live = bubbles.filter((b) => !b.hidden);
  for (const b of live) {
    const ox = b.tx - b.bx, oy = b.ty - b.by;
    if (!b.placed) { b.ox = ox; b.oy = oy; b.placed = true; } else { b.ox = damp(b.ox, ox, 14, dt); b.oy = damp(b.oy, oy, 14, dt); }
    [b.x, b.y] = inScreen(b, b.bx + b.ox, b.by + b.oy);   // even while gliding, never under the bars / off the screen
  }
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const A = live[i], B = live[j];
    if (Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > 0 && Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > 0) for (const C of [A, B]) { C.x = C.tx; C.y = C.ty; C.ox = C.tx - C.bx; C.oy = C.ty - C.by; }
  }
  for (const b of bubbles) {
    const op = b.hidden ? 0 : Math.min(1, b.t * 3);
    b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`; b.el.style.opacity = op;
    if (b.g) { b.g.setAttribute('opacity', b.sub ? 0 : op); if (!b.sub) drawTail(b); }   // subtitles have no tail
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

