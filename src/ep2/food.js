// Petyus kalandjai – 2. rész: étel és edény – részletesen (kerek formák, címkék). A reggeliző asztal és a hűtő tartalma.
// Small things are built from three.js shapes (cylinders, spheres, lathe profiles) rather than voxels: plates, glasses and
// fruit need round edges at this size. Every builder returns a Group standing on y = 0 (its footprint centred on x = z = 0).
import * as THREE from 'three';

const M = new Map();
function mat(color, o = {}) {   // shared materials (one per colour / kind)
  const k = color + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshLambertMaterial({ color, ...o })); return M.get(k);
}
const glassMat = (tint = 0xdff3fb, op = 0.32) => mat(tint, { transparent: true, opacity: op, depthWrite: false });
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function grp(...kids) { const g = new THREE.Group(); for (const k of kids) g.add(k); return g; }
// a lathe (turned) shape from [r, y] points
const lathe = (pts, seg = 22) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// a label texture (packaging): background, a stripe, big text
const TEX = new Map();
function label(text, bg, fg = '#ffffff', stripe = null, small = '') {
  const k = text + bg + fg + stripe + small; if (TEX.has(k)) return TEX.get(k);
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 128, 128);
  if (stripe) { x.fillStyle = stripe; x.fillRect(0, 78, 128, 22); }
  x.fillStyle = fg; x.textAlign = 'center'; x.font = `bold ${text.length > 7 ? 18 : 26}px sans-serif`; x.fillText(text, 64, 60);
  if (small) { x.font = 'bold 14px sans-serif'; x.fillText(small, 64, 118); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; TEX.set(k, t); return t;
}
// a box with a label on its front (+z) and back
function labelledBox(w, h, d, bodyColor, tex) {
  const side = mat(bodyColor), face = new THREE.MeshLambertMaterial({ map: tex });
  return mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, face, face], 0, h / 2, 0);
}

// ---------------------------------------------------------------- tableware
export function plate(rimColor = 0x3a86ff, r = 0.11) {
  return grp(mesh(lathe([[0, 0], [r * 0.6, 0], [r * 0.7, 0.006], [r, 0.016], [r, 0.019], [r * 0.95, 0.019], [r * 0.68, 0.009], [0, 0.009]], 28), mat(0xfbfbf7)),
    (() => { const t = mesh(new THREE.TorusGeometry(r * 0.9, 0.0035, 6, 32), mat(rimColor)); t.rotation.x = Math.PI / 2; t.position.y = 0.018; return t; })());
}
export function bowl(color = 0xf3efe6, r = 0.07) {
  return grp(mesh(lathe([[0, 0], [r * 0.55, 0], [r * 0.6, 0.006], [r, 0.05], [r * 0.95, 0.052], [r * 0.55, 0.012], [0, 0.012]], 24), mat(color, { side: THREE.DoubleSide })));
}
export function mug(color = 0xd9453a, drink = 0x6b3a1e) {   // a mug with a handle and a drink in it (tea, cocoa, coffee)
  const g = grp(mesh(lathe([[0, 0], [0.034, 0], [0.036, 0.09], [0.031, 0.09], [0.029, 0.008], [0, 0.008]], 20), mat(color, { side: THREE.DoubleSide })));
  const d = mesh(new THREE.CircleGeometry(0.03, 18), mat(drink), 0, 0.07, 0); d.rotation.x = -Math.PI / 2; g.add(d);
  const h = mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 14, Math.PI), mat(color), 0.036, 0.048, 0); h.rotation.z = -Math.PI / 2; g.add(h);
  return g;
}
export function glass(fill = 0xffffff, level = 0.7) {   // a drinking glass (see-through) with milk / juice / water
  const H = 0.11, g = grp(mesh(lathe([[0, 0], [0.03, 0], [0.034, H], [0.032, H], [0.028, 0.006], [0, 0.006]], 20), glassMat()));
  if (level > 0) g.add(mesh(new THREE.CylinderGeometry(0.03 + 0.003 * level, 0.028, H * level, 18), mat(fill), 0, 0.006 + H * level / 2, 0));
  return g;
}
export function cutlery(side = 1) {   // a knife and a fork next to a plate
  return grp(mesh(new THREE.BoxGeometry(0.012, 0.004, 0.17), mat(0xc9ced3), side * 0.135, 0.002, 0), mesh(new THREE.BoxGeometry(0.014, 0.004, 0.16), mat(0xc9ced3), -side * 0.135, 0.002, 0),
    mesh(new THREE.BoxGeometry(0.026, 0.004, 0.035), mat(0xc9ced3), -side * 0.135, 0.002, -0.08));
}
export function teapot() {
  const g = grp(mesh(lathe([[0, 0], [0.05, 0], [0.075, 0.04], [0.078, 0.07], [0.06, 0.11], [0.03, 0.12], [0, 0.12]], 22), mat(0xfafaf6)));
  g.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), mat(0x3a86ff), 0, 0.128, 0));
  const sp = mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.08, 8), mat(0xfafaf6), 0.09, 0.07, 0); sp.rotation.z = -0.9; g.add(sp);
  const h = mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14, Math.PI), mat(0xfafaf6), -0.075, 0.065, 0); h.rotation.z = Math.PI / 2; g.add(h);
  g.add(mesh(new THREE.TorusGeometry(0.062, 0.004, 6, 24), mat(0x3a86ff), 0, 0.075, 0)); g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------- food
export function salamiSlices(n = 6) {   // overlapping slices (red with white fat dots) on a little plate
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#a7262b'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill(); x.fillStyle = '#f4dcd2';
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 6 + (i * 7) % 22; x.beginPath(); x.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 1.6 + (i % 3) * 0.6, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.MeshLambertMaterial({ map: t }), edge = mat(0x7a1c1f);
  const g = grp();
  for (let i = 0; i < n; i++) { const s = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.004, 20), [edge, top, top], -0.06 + i * 0.024, 0.002 + i * 0.0015, Math.sin(i) * 0.01); s.rotation.z = -0.08; g.add(s); }
  return g;
}
export function salamiLog() {   // the whole salami (a log with its casing tied at the end) + a few slices
  const g = grp();
  const log = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 16), mat(0x8e2a2a), 0, 0.03, 0); log.rotation.z = Math.PI / 2; g.add(log);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9d4c8), s * 0.11, 0.03, 0); e.rotation.z = -s * Math.PI / 2; g.add(e); }
  const sl = salamiSlices(3); sl.position.set(0.04, 0, 0.06); g.add(sl);
  return g;
}
export function cheeseWedge() {   // a yellow wedge with holes (Trappista / Emmentaler)
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.12, 0); s.lineTo(0, 0.08); s.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(-0.04, 0, 0.03);
  const c = mesh(geo, mat(0xf2c94c)); const g = grp(c);
  for (const [hx, hz, r] of [[0.01, 0.005, 0.009], [0.04, -0.01, 0.007], [-0.015, -0.02, 0.006]]) g.add(mesh(new THREE.SphereGeometry(r, 8, 6), mat(0xd9a92f), hx, 0.061, hz));
  return g;
}
export function apple(color = 0xd62828) {
  const g = grp(mesh(new THREE.SphereGeometry(0.038, 16, 12), mat(color), 0, 0.036, 0));
  g.children[0].scale.y = 0.92;
  g.add(mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.018, 5), mat(0x6e4a2b), 0, 0.075, 0));
  const lf = mesh(new THREE.SphereGeometry(0.012, 6, 4), mat(0x58ab4c), 0.01, 0.078, 0); lf.scale.set(1.4, 0.3, 0.7); g.add(lf);
  return g;
}
export function orange() { const g = grp(mesh(new THREE.SphereGeometry(0.04, 16, 12), mat(0xf58a1f), 0, 0.04, 0)); g.add(mesh(new THREE.SphereGeometry(0.006, 6, 4), mat(0x4a8f3a), 0, 0.079, 0)); return g; }
export function banana() {
  const g = grp(); const b = mesh(new THREE.TorusGeometry(0.08, 0.016, 8, 16, Math.PI * 0.7), mat(0xf6d743), 0, 0.016, 0); b.rotation.x = Math.PI / 2; g.add(b);
  g.add(mesh(new THREE.SphereGeometry(0.007, 6, 4), mat(0x5a4632), 0.08, 0.016, 0));
  return g;
}
export function grapes(color = 0x6a2c70) {
  const g = grp(); let n = 0;
  for (let l = 0; l < 4; l++) for (let i = 0; i < 6 - l; i++) { const a = i / (6 - l) * Math.PI * 2 + l; g.add(mesh(new THREE.SphereGeometry(0.013, 8, 6), mat(color), Math.cos(a) * (0.028 - l * 0.005), 0.013 + l * 0.018, Math.sin(a) * (0.028 - l * 0.005) + l * 0.01)); n++; }
  g.add(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 4), mat(0x6e4a2b), 0, 0.085, 0.03));
  return g;
}
export function fruitBowl() {   // a bowl with apples, an orange, a banana and grapes
  const g = grp(); const b = bowl(0xe9c46a, 0.12); g.add(b);
  const a1 = apple(); a1.position.set(-0.04, 0.01, 0.02); g.add(a1); const a2 = apple(0x8ac926); a2.position.set(0.03, 0.01, -0.04); g.add(a2);
  const o = orange(); o.position.set(0.04, 0.012, 0.04); g.add(o);
  const bn = banana(); bn.position.set(-0.02, 0.05, -0.01); bn.rotation.y = 0.6; g.add(bn);
  const gr = grapes(); gr.position.set(0.0, 0.03, 0.06); g.add(gr);
  return g;
}
export function breadBoard() {   // a cutting board, the loaf (crust + crumb) and slices fallen over, a knife
  const g = grp(mesh(new THREE.BoxGeometry(0.34, 0.016, 0.2), mat(0xc8955c), 0, 0.008, 0));
  const loaf = grp(mesh(new THREE.CapsuleGeometry(0.055, 0.12, 6, 14), mat(0xa0622d), 0, 0.06, 0)); loaf.children[0].rotation.z = Math.PI / 2; loaf.children[0].scale.set(1, 1, 0.9);
  const cut = mesh(new THREE.CircleGeometry(0.052, 18), mat(0xf1dfb8), 0.115, 0.06, 0); cut.rotation.y = Math.PI / 2; loaf.add(cut);
  loaf.position.set(-0.05, 0.016, 0); g.add(loaf);
  for (let i = 0; i < 3; i++) {   // slices: crumb with a crust edge, leaning
    const s = grp(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16), [mat(0xa0622d), mat(0xf1dfb8), mat(0xf1dfb8)]));
    s.children[0].scale.z = 0.8; s.position.set(0.1 + i * 0.02, 0.022 + i * 0.006, 0.03 - i * 0.01); s.rotation.set(0.05, 0, 0.12 * i); g.add(s);
  }
  const k = mesh(new THREE.BoxGeometry(0.2, 0.004, 0.02), mat(0xc9ced3), 0.02, 0.018, -0.08); g.add(k); g.add(mesh(new THREE.BoxGeometry(0.08, 0.012, 0.022), mat(0x2c2f33), -0.12, 0.022, -0.08));
  return g;
}
export function milkCarton(text = 'TEJ', small = '2,8%', bg = '#ffffff', fg = '#1d5fbf', stripe = '#3a86ff') {
  const g = grp(labelledBox(0.07, 0.19, 0.07, 0xf5f5f5, label(text, bg, fg, stripe, small)));
  const roof = mesh(new THREE.CylinderGeometry(0.0, 0.05, 0.035, 4, 1), mat(0xf5f5f5), 0, 0.207, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.6); g.add(roof);
  g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 10), mat(0x3a86ff), 0.015, 0.215, 0.012));
  return g;
}
export function creamCarton() {   // TEJSZÍN – a small carton (important!)
  return milkCarton('TEJSZÍN', '30%', '#fff6e0', '#b5651d', '#f4a261');
}
export function whippedCream() {   // TEJSZÍNHAB – a spray can with a red cap and a nozzle (important!)
  const g = grp();
  const body = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.17, 20), [mat(0xe8e8e8), mat(0xd0d0d0), mat(0xd0d0d0)], 0, 0.085, 0);
  const lab = mesh(new THREE.CylinderGeometry(0.0325, 0.0325, 0.11, 20, 1, true), new THREE.MeshLambertMaterial({ map: label('TEJSZÍNHAB', '#ffffff', '#c1121f', '#3a86ff', 'habspray') }), 0, 0.085, 0);
  g.add(body, lab);
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.025, 16), mat(0xd0d0d0), 0, 0.182, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.03, 8), mat(0xfafafa), 0, 0.208, 0));   // the nozzle
  g.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.04, 20, 1, true), mat(0xc1121f, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 0.0, 0.205, 0));   // the red cap
  return g;
}
export function sodaBottle(color = 0x3b1f14, cap = 0xc1121f, text = 'COLA', labelBg = '#c1121f') {
  const g = grp(mesh(lathe([[0, 0], [0.032, 0], [0.034, 0.02], [0.032, 0.16], [0.016, 0.22], [0.012, 0.25], [0, 0.25]], 18), mat(color, { transparent: true, opacity: 0.9 })));
  g.add(mesh(new THREE.CylinderGeometry(0.0345, 0.0345, 0.06, 18, 1, true), new THREE.MeshLambertMaterial({ map: label(text, labelBg) }), 0, 0.1, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.016, 12), mat(cap), 0, 0.256, 0));
  return g;
}
export function sodaCan(colorHex = '#2a9d8f', text = 'NARANCS') {
  const g = grp(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 18), [new THREE.MeshLambertMaterial({ map: label(text, colorHex) }), mat(0xc9ced3), mat(0xc9ced3)], 0, 0.06, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.028, 0.033, 0.008, 18), mat(0xc9ced3), 0, 0.124, 0));
  return g;
}
export function muesliBowl() {   // a bowl of muesli with milk: oats, raisins, nuts, strawberry bits on a white surface
  const g = grp(bowl(0x8ecae6, 0.075));
  g.add(mesh(new THREE.CylinderGeometry(0.066, 0.05, 0.03, 20), mat(0xfaf6ec), 0, 0.03, 0));
  const cols = [0xd9b26a, 0xc8955c, 0x5a3825, 0xe63946, 0xe9d8a6];
  for (let i = 0; i < 46; i++) { const a = i * 2.39996, r = 0.055 * Math.sqrt((i + 0.5) / 46); const p = mesh(new THREE.BoxGeometry(0.009, 0.004, 0.007), mat(cols[i % 5]), Math.cos(a) * r, 0.046 + (i % 3) * 0.002, Math.sin(a) * r); p.rotation.y = a; g.add(p); }
  const sp = mesh(new THREE.BoxGeometry(0.012, 0.004, 0.12), mat(0xc9ced3), 0.04, 0.06, 0.02); sp.rotation.set(0.35, 0.5, 0); g.add(sp);
  return g;
}
export function muesliBox() { return labelledBox(0.1, 0.22, 0.05, 0xf4a261, label('MÜZLI', '#f4a261', '#5a3825', '#ffd166', 'gyümölcsös')); }
export function butterDish() { const g = grp(mesh(new THREE.BoxGeometry(0.14, 0.012, 0.09), mat(0xfafaf6), 0, 0.006, 0)); g.add(mesh(new THREE.BoxGeometry(0.09, 0.03, 0.05), mat(0xffe08a), -0.01, 0.027, 0)); return g; }
export function honeyJar() { const g = grp(mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.08, 16), mat(0xe9a23b, { transparent: true, opacity: 0.85 }), 0, 0.04, 0)); g.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.018, 16), mat(0xd62828), 0, 0.088, 0)); return g; }
export function napkins() { return mesh(new THREE.BoxGeometry(0.1, 0.012, 0.1), mat(0xffd1dc), 0, 0.006, 0); }

// place a built thing (a Group) into a parent at x, y, z, turned ry
export function at(parent, obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; parent.add(obj); return obj; }

// Angi's key ring: two keys (brass and steel), the ring and a pink fob – lying flat
export function keyRing() {
  const g = grp();
  const ring = mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 16), mat(0xb8bfc6), 0, 0.005, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (const [a, c] of [[0.5, 0xc9a227], [-0.4, 0xb8bfc6]]) {
    const k = grp(mesh(new THREE.BoxGeometry(0.055, 0.004, 0.012), mat(c), 0.045, 0.004, 0), mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.005, 10), mat(c), 0.015, 0.004, 0));
    k.rotation.y = a; g.add(k);
  }
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.012, 0.045), mat(0xf28cb1), -0.035, 0.007, 0.01));
  return g;
}
// a carrot (with its leafy green top): Karcsi's favourite – lying on its side, along x; a big one, so it shows on the floor
export function carrot() {
  const g = grp();
  const c = mesh(new THREE.ConeGeometry(0.031, 0.21, 12), mat(0xff7f11), 0, 0.031, 0); c.rotation.z = -Math.PI / 2; g.add(c);   // (the tip to +x: the thick end and the leaves at −x)
  for (const t of [-0.06, -0.01, 0.04]) g.add(mesh(new THREE.TorusGeometry(0.031 * (0.105 - t) / 0.21, 0.0025, 4, 12), mat(0xd96a08), t, 0.031, 0)).children.at(-1).rotation.y = Math.PI / 2;   // rings (on the surface: the cone's radius there)
  for (const a of [-0.55, -0.2, 0.2, 0.55]) { const l = mesh(new THREE.BoxGeometry(0.075, 0.008, 0.016), mat(0x4caf50), -0.14, 0.036, a * 0.03); l.rotation.y = a; g.add(l); }
  return g;
}
// a toilet roll: white paper round a cardboard core (radius 5.5 cm, 10 cm tall, standing; turn it for a holder's arm)
export function toiletRoll() {
  const g = new THREE.Group();
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 22, 1, true), new THREE.MeshLambertMaterial({ color: 0xfafaf6, side: THREE.DoubleSide })); roll.position.y = 0.05; g.add(roll);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.055, 22), new THREE.MeshLambertMaterial({ color: 0xf0f0ea, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; g.add(ring);
  const ring2 = ring.clone(); ring2.position.y = 0.0005; g.add(ring2);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0xb8915e, side: THREE.DoubleSide })); core.position.y = 0.05; g.add(core);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- the bathroom: tubes, jars, cups (the toothpaste swap – toothpaste.js)
// a tube standing on its cap: the cap below, the body flattened, the crimped end on top, a label round it
function tube(text, small, bg, fg, stripe, body, cap) {
  const g = grp();
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.022, 14), mat(cap), 0, 0.011, 0));
  const b = mesh(new THREE.CylinderGeometry(0.021, 0.017, 0.12, 18, 1, true), new THREE.MeshLambertMaterial({ map: label(text, bg, fg, stripe, small), side: THREE.DoubleSide }), 0, 0.082, 0);
  b.scale.set(1.25, 1, 0.62); g.add(b);
  g.add(mesh(new THREE.BoxGeometry(0.054, 0.012, 0.008), mat(body), 0, 0.147, 0));   // the crimped end
  return g;
}
export const toothpasteTube = () => tube('FOGKRÉM', 'mentás', '#ffffff', '#1d5fbf', '#3a86ff', 0xf4f6f8, 0x3a86ff);
// the heel cream: the same tube (white, blue cap) – only the writing differs
export const heelCreamTube = () => tube('SAROKKRÉM', 'lábra', '#ffffff', '#1d5fbf', '#3a86ff', 0xf4f6f8, 0x3a86ff);
export const chiliTube = () => tube('CHILIKRÉM', 'csípős!', '#d62828', '#ffffff', '#2d6a4f', 0xd62828, 0x2d6a4f);
export function faceMaskJar() {   // a pink jar with a golden lid – nothing like toothpaste
  const g = grp(mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.045, 20), mat(0xf4a6c6), 0, 0.0225, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 20), mat(0xd4af37), 0, 0.055, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.0345, 0.0345, 0.02, 20, 1, true), new THREE.MeshLambertMaterial({ map: label('ARCMASZK', '#f4a6c6', '#7a1f4a', '#ffffff', 'éjszakai') }), 0, 0.022, 0));
  return g;
}
// a toothbrush cup with its brush (the brush's colour: whose it is)
export function brushCup(cup, brush) {
  const g = grp(mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.09, 16), mat(cup), 0, 0.045, 0));
  const h = mesh(new THREE.BoxGeometry(0.008, 0.16, 0.012), mat(brush), 0.008, 0.11, 0); h.rotation.z = -0.15; g.add(h);
  g.add(mesh(new THREE.BoxGeometry(0.012, 0.025, 0.016), mat(0xffffff), 0.019, 0.18, 0.004));   // the bristles
  return g;
}
// Angi's things in her cabinet (not to be picked up): small jars, tubes, bottles, a perfume
export function cosmeticBottle(color, h = 0.11, r = 0.016) {
  const g = grp(mesh(new THREE.CylinderGeometry(r, r, h, 12), mat(color), 0, h / 2, 0));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.022, 10), mat(0xf4f4f4), 0, h + 0.011, 0));
  return g;
}
export function perfume() {
  const g = grp(mesh(new THREE.BoxGeometry(0.045, 0.06, 0.03), mat(0xf7d6e0, { transparent: true, opacity: 0.75 }), 0, 0.03, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 10), mat(0xd4af37), 0, 0.069, 0)); return g;
}
export function smallJar(color, lid) {
  const g = grp(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16), mat(color), 0, 0.015, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 16), mat(lid), 0, 0.036, 0)); return g;
}
// the TV remote: a black bar with coloured buttons, lying flat (tvmatch.js)
export function tvRemote() {
  const g = grp(mesh(new THREE.BoxGeometry(0.05, 0.018, 0.16), mat(0x1f2124), 0, 0.009, 0));
  g.add(mesh(new THREE.BoxGeometry(0.014, 0.006, 0.014), mat(0xd62828), 0, 0.02, -0.055));   // the red power button
  for (let i = 0; i < 9; i++) g.add(mesh(new THREE.BoxGeometry(0.009, 0.005, 0.009), mat(i % 4 === 0 ? 0x3a86ff : 0x8d99ae), ((i % 3) - 1) * 0.013, 0.02, -0.02 + Math.floor(i / 3) * 0.018));
  return g;
}
// the rubbish bag: black, tied at the top (ghost.js – dad takes it out)
export function rubbishBag() {
  const g = grp(mesh(new THREE.SphereGeometry(0.17, 12, 9), mat(0x1b1d20), 0, 0.17, 0));
  g.children[0].scale.set(1, 1.15, 0.9);
  g.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 8), mat(0x1b1d20), 0, 0.39, 0));
  return g;
}
