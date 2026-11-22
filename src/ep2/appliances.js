// Petyus kalandjai – 2. rész: kapcsolható és nyitható eszközök a lakásban.
// Hűtő (két ajtó, belül polcok, ételek, fény) · mikró (nyitható ajtó, forgótányér, kijelző, pohár és tányér berakható) ·
// vízforraló · tűzhely · mosogatócsap · Petyus számítógépe (monitor, billentyűzet, egér, hangfalak, gépház; képernyőn indulás,
// asztal, játék) · a szülők tévéje (mese) · kádcsap · zuhany · mosógép.
// Each device: a hotspot (x, z, r) – the nearest one within reach is used (ep2.js interactHome): E = label/use, and for some
// a second action on Space (alt). Coordinates: the flat's frame (homeRoot); every device group faces +z locally (rot turns it).
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { noise, tone } from '../audio.js';
import { G } from '../state.js';
import { say } from '../ui.js';
import { V3, damp } from '../util.js';
import { VoxelGrid } from '../voxels.js';
import { addBoxCol, vcMat } from '../world.js';
import { FY, homeRoot } from './home.js';

export const devices = [];

// ---------------------------------------------------------------- helpers
// a box of voxels: every voxel whose centre lies in x0…x1, y0…y1, z0…z1 (metres); c: colour, null (remove) or (x, y, z) => colour
function B(g, s, x0, x1, y0, y1, z0, z1, c) {
  for (let i = Math.ceil(x0 / s - 1e-6); i <= Math.floor(x1 / s + 1e-6); i++)
    for (let j = Math.ceil(y0 / s - 0.5 - 1e-6); j <= Math.floor(y1 / s - 0.5 + 1e-6); j++)
      for (let k = Math.ceil(z0 / s - 1e-6); k <= Math.floor(z1 / s + 1e-6); k++) {
        const col = typeof c === 'function' ? c(i * s, (j + 0.5) * s, k * s) : c;
        if (col !== undefined) g.set(i, j, k, col);
      }
}
function vox(s, build, seed = 3) {
  const g = new VoxelGrid(s, seed); build(g, s);
  const m = new THREE.Mesh(g.toGeometry(0.03), vcMat); m.castShadow = true; m.receiveShadow = true; return m;
}
function group(x, z, rot, y = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; homeRoot.add(g); return g; }
const toWorld = (grp, x, y, z) => grp.localToWorld(new V3(x, y, z));   // a point of a device in the world (FY included)
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
function canvasScreen(w, h, pw, ph) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex }));
  return { c, ctx: c.getContext('2d'), tex, m };
}
function stream(len, r = 0.012) {   // a falling water jet (top at y 0)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, len, 8, 1, true), glow(0x9fd8f5, 0.7));
  m.geometry.translate(0, -len / 2, 0); m.visible = false; return m;
}
const click = () => tone('square', 1300, 900, 0.03, 0.04);
let rnd = 1; const R = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

// ---------------------------------------------------------------- the fridge (wide, two doors, west wall of the kitchen)
function buildFridge(x, z, rot) {
  const s = 0.025, grp = group(x, z, rot), WALL = 0xf4f6f8, OUT = 0xdfe3e6;
  grp.add(vox(s, (g) => {
    B(g, s, -0.45, 0.45, 0, 1.85, -0.32, 0.27, (x, y, z) => {
      const inside = Math.abs(x) < 0.41 && y > 0.07 && y < 1.78 && z > -0.28;
      if (!inside) return z > 0.25 ? 0xcfd4d8 : OUT;
      if (Math.abs(x) < 0.02) return WALL;                                          // the divider
      if (x > 0 && z < 0.15 && [0.5, 0.9, 1.3].some((Y) => Math.abs(y - Y) < 0.013)) return 0xcfe8f3;   // glass shelves
      return undefined;
    });
    // the inside: walls lighter (the shell above is the outer colour; repaint the inner faces' voxels next to the cavity)
    B(g, s, -0.41, 0.41, 0.06, 0.07, -0.28, 0.25, WALL); B(g, s, -0.41, 0.41, 1.78, 1.8, -0.28, 0.25, WALL); B(g, s, -0.41, 0.41, 0.07, 1.78, -0.3, -0.28, WALL);
    B(g, s, 0.1, 0.32, 1.74, 1.77, -0.15, 0.0, 0xfff3c0);                                  // the lamp
    // fridge side (x > 0): milk, cheese, eggs, jam, bottles, a crisper with vegetables
    B(g, s, 0.08, 0.14, 0.92, 1.1, -0.12, -0.06, (x, y) => (y > 1.05 ? 0x3a86ff : 0xffffff));
    B(g, s, 0.2, 0.32, 0.92, 0.97, -0.1, 0.02, 0xffd23f); B(g, s, 0.22, 0.38, 0.52, 0.58, -0.18, -0.04, 0xd9c7a3);
    for (const ex of [0.24, 0.28, 0.32, 0.36]) B(g, s, ex, ex, 0.58, 0.6, -0.15, -0.08, 0xf3efe6);
    B(g, s, 0.08, 0.12, 0.52, 0.62, -0.05, 0.0, 0xc62828);
    for (const [bx, c] of [[0.1, 0x2f7d3a], [0.18, 0x7a4a24], [0.26, 0x9fd0ea]]) B(g, s, bx, bx + 0.04, 1.32, 1.55, -0.2, -0.16, c);
    B(g, s, 0.05, 0.38, 0.08, 0.3, -0.25, 0.12, (x, y, z) => (y > 0.28 || Math.abs(z - 0.12) < 0.013 || Math.abs(x - 0.05) < 0.013 || Math.abs(x - 0.38) < 0.013 ? 0xdbeaf2 : (Math.floor(x * 30 + z * 20) % 3 ? 0xd9453a : 0x58ab4c)));
    // freezer side (x < 0): two drawers, ice cream, peas
    for (const [y0, y1] of [[0.08, 0.5], [0.55, 0.95]]) B(g, s, -0.38, -0.05, y0, y1, -0.25, 0.12, (x, y, z) => (z > 0.1 || y > y1 - 0.02 ? 0xbfe0ef : undefined));
    B(g, s, -0.3, -0.12, 0.1, 0.25, -0.2, -0.02, 0xf3a9c0); B(g, s, -0.3, -0.12, 0.57, 0.65, -0.15, 0.05, 0x5fae6a);
    B(g, s, -0.35, -0.1, 1.2, 1.26, -0.2, 0.05, 0xcfe8f3);
  }));
  // the doors: hinged at the outer edges, opening outwards
  const door = (side) => {
    const pv = new THREE.Group(); pv.position.set(side * 0.45, 0, 0.33); grp.add(pv);
    pv.add(vox(s, (g) => {
      const x0 = side < 0 ? 0 : -0.445, x1 = side < 0 ? 0.445 : 0;
      B(g, s, x0, x1, 0.02, 1.83, -0.05, 0, (x) => (Math.abs(x) > 0.43 ? 0xcfd4d8 : OUT));
      const hx = side < 0 ? 0.4 : -0.4;   // the handle, by the middle seam
      B(g, s, hx - 0.012, hx + 0.012, 0.6, 1.5, 0.0, 0.05, 0xb8bfc6);
      if (side < 0) { B(g, s, 0.12, 0.32, 1.05, 1.35, 0.0, 0.0, 0x2c2f33); B(g, s, 0.18, 0.26, 1.15, 1.2, 0.0, 0.0, 0x7fb6e8); }   // dispenser
      // the inner side: door bins with bottles
      for (const by of [0.35, 0.85, 1.3]) {
        B(g, s, x0 + 0.04, x1 - 0.04, by, by + 0.12, -0.13, -0.06, (x, y, z) => (z < -0.1 && y > by + 0.03 ? undefined : 0xf2f4f6));
        for (let n = 0; n < 3; n++) { const bx = x0 + 0.1 + n * 0.11; B(g, s, bx, bx + 0.03, by + 0.03, by + 0.2, -0.11, -0.08, [0xd9453a, 0xf4a261, 0x7fb6e8][(n + (side > 0 ? 1 : 0)) % 3]); }
      }
    }));
    return pv;
  };
  const L = door(-1), Rr = door(1);
  // the collider: the body (turned with the device)
  const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)), hx = c * 0.45 + sn * 0.33, hz = sn * 0.45 + c * 0.33;
  addBoxCol(x - hx, z - hz, x + hx, z + hz, 1.9);
  const st = { open: false, t: 0 };
  const front = toWorld(grp, 0, 0, 0.7); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 0.75, label: () => (st.open ? 'E – hűtő becsukása' : 'E – hűtő kinyitása'),
    use: () => { st.open = !st.open; tone('sine', st.open ? 220 : 160, st.open ? 180 : 120, 0.12, 0.08); if (!st.open) noise(0.08, 400, 1, 0.12); },
    update: (dt) => { st.t = damp(st.t, st.open ? 1 : 0, 6, dt); L.rotation.y = -st.t * 1.9; Rr.rotation.y = st.t * 1.9; } });
}

// ---------------------------------------------------------------- the microwave (on the counter): door, turntable, display, a cup and a plate
function buildMicrowave(x, z, rot, y) {
  const s = 0.0125, grp = group(x, z, rot, y), BODY = 0xe6e8ea, DARK = 0x1c1e22;
  grp.add(vox(s, (g) => {
    B(g, s, -0.25, 0.25, 0, 0.3, -0.19, 0.17, (x, y, z) => {
      if (x > -0.225 && x < 0.095 && y > 0.025 && y < 0.275 && z > -0.165) return undefined;   // the cavity
      if (x > 0.1 && z > 0.15) return DARK;                                                      // the control panel's face
      return BODY;
    });
    B(g, s, -0.225, 0.095, 0.0125, 0.025, -0.165, 0.17, 0xf2f0e8);    // cavity floor / walls lighter
    B(g, s, -0.225, 0.095, 0.025, 0.275, -0.18, -0.165, 0xf2f0e8);
    B(g, s, -0.2, -0.17, 0.2, 0.25, -0.17, -0.165, 0xb8bcc0);         // the mica plate
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) B(g, s, 0.125 + c * 0.04, 0.135 + c * 0.04, 0.09 + r * 0.03, 0.1 + r * 0.03, 0.175, 0.18, 0x9aa3ab);   // number buttons
    B(g, s, 0.125, 0.15, 0.05, 0.06, 0.175, 0.18, 0x5fae6a); B(g, s, 0.2, 0.225, 0.05, 0.06, 0.175, 0.18, 0xd9453a);   // start / stop
    B(g, s, 0.15, 0.2, 0.02, 0.035, 0.175, 0.185, 0x6b7378);            // the door-open button
    for (const vx of [-0.2, -0.1, 0.0, 0.1, 0.2]) B(g, s, vx, vx + 0.04, 0.29, 0.3, -0.15, -0.05, 0xc4c8cc);   // vents on top
    for (const fx of [-0.21, 0.21]) for (const fz of [-0.15, 0.13]) B(g, s, fx, fx, -0.0125, 0, fz, fz, 0x333333);   // feet
  }));
  // display (canvas) on the panel
  const disp = canvasScreen(64, 24, 0.11, 0.04); disp.m.position.set(0.175, 0.24, 0.1715); grp.add(disp.m);
  // turntable + items; interior glow
  const tt = new THREE.Group(); tt.position.set(-0.065, 0.03, 0.0); grp.add(tt);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 28), new THREE.MeshLambertMaterial({ color: 0xd9eef5, transparent: true, opacity: 0.75 })); tt.add(glass);
  const glowBox = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.24, 0.33), glow(0xffd98a, 0.0)); glowBox.position.set(-0.065, 0.15, 0.0); grp.add(glowBox);
  // the door: hinged on the left, a window (see-through, dotted) and a handle
  const pv = new THREE.Group(); pv.position.set(-0.25, 0, 0.17); grp.add(pv);
  pv.add(vox(s, (g) => {
    B(g, s, 0, 0.355, 0.0125, 0.29, 0, 0.0125, (x, y) => (x > 0.04 && x < 0.3 && y > 0.05 && y < 0.25 ? undefined : DARK));
    B(g, s, 0.33, 0.345, 0.06, 0.24, 0.025, 0.0375, 0x9aa3ab);         // the handle
  }));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.21), (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 48; const x = c.getContext('2d');
    x.fillStyle = 'rgba(25,30,36,0.55)'; x.fillRect(0, 0, 64, 48); x.fillStyle = 'rgba(0,0,0,0.6)';
    for (let i = 0; i < 64; i += 3) for (let j = 0; j < 48; j += 3) x.fillRect(i, j, 1.4, 1.4);
    const t = new THREE.CanvasTexture(c); return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  })());
  win.position.set(0.17, 0.15, 0.007); pv.add(win);
  // a plate and a cup: on the counter next to it, or on the turntable
  const plate = new THREE.Group(); plate.add(new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.07, 0.016, 24), new THREE.MeshLambertMaterial({ color: 0xfafaf6 })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.006, 6, 24), new THREE.MeshLambertMaterial({ color: 0x3a86ff })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.008; plate.add(rim);
  const cup = new THREE.Group();
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.085, 18, 1, true), new THREE.MeshLambertMaterial({ color: 0xd9453a, side: THREE.DoubleSide })); cupBody.position.y = 0.0425; cup.add(cupBody);
  const cupIn = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshLambertMaterial({ color: 0x6b3a1e })); cupIn.rotation.x = -Math.PI / 2; cupIn.position.y = 0.06; cup.add(cupIn);   // cocoa
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: 0xd9453a })); handle.rotation.z = -Math.PI / 2; handle.position.set(0.036, 0.045, 0); cup.add(handle);
  const onCounter = () => { grp.add(plate); plate.position.set(0.4, 0.008, 0.02); grp.add(cup); cup.position.set(0.4, 0.016, 0.02); };
  onCounter();
  const st = { open: false, t: 0, items: 0, run: 0, done: 0, hum: 0 };   // items: 0 none inside, 1 plate, 2 plate + cup
  const drawDisp = (txt) => { const d = disp.ctx; d.fillStyle = '#0b1a10'; d.fillRect(0, 0, 64, 24); d.fillStyle = '#5dff8a'; d.font = 'bold 18px monospace'; d.textAlign = 'center'; d.fillText(txt, 32, 18); disp.tex.needsUpdate = true; };
  drawDisp('6:00');
  const front = toWorld(grp, 0, 0, 0.65); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 0.7,
    label: () => (st.open ? 'E – mikró becsukása' : st.run > 0 ? 'E – (fut)' : 'E – mikró kinyitása'),
    use: () => { if (st.run > 0) { st.run = 0; tone('sine', 880, 880, 0.08, 0.05); } st.open = !st.open; click(); noise(0.06, 900, 1, 0.08); },
    alt: {
      label: () => (st.open ? ['Szóköz – tányér berakása', 'Szóköz – pohár berakása', 'Szóköz – tányér és pohár kivétele'][st.items] : st.run > 0 ? 'Szóköz – leállítás' : 'Szóköz – indítás (10 mp)'),
      short: () => (st.open ? (st.items < 2 ? 'BERAK' : 'KIVESZ') : st.run > 0 ? 'STOP' : 'START'),
      use: () => {
        if (st.open) {
          st.items = (st.items + 1) % 3; click();
          if (st.items === 1) { tt.add(plate); plate.position.set(0, 0.012, 0); }
          else if (st.items === 2) { plate.add(cup); cup.position.set(0.0, 0.008, 0.0); }
          else onCounter();
        } else if (st.run > 0) { st.run = 0; tone('sine', 700, 700, 0.1, 0.05); drawDisp('STOP'); }
        else { st.run = 10; st.done = 0; tone('sine', 1000, 1000, 0.08, 0.06); }
      },
    },
    update: (dt) => {
      st.t = damp(st.t, st.open ? 1 : 0, 8, dt); pv.rotation.y = -st.t * 1.75;
      if (st.run > 0) {
        st.run = Math.max(0, st.run - dt); tt.rotation.y += dt * 1.2;
        if ((st.hum -= dt) <= 0) { st.hum = 0.5; noise(0.5, 180, 0.8, 0.03); }
        drawDisp('0:' + String(Math.ceil(st.run)).padStart(2, '0'));
        if (st.run === 0) { for (let i = 0; i < 3; i++) tone('sine', 1760, 1760, 0.18, 0.08, i * 0.35); drawDisp('KÉSZ'); st.done = 3; say({ headWorld: (o) => o.copy(toWorld(grp, 0, 0.45, 0)) }, 'DING!', 1.4); }
      } else if (st.done > 0) { st.done -= dt; if (st.done <= 0) drawDisp('6:00'); }
      glowBox.material.opacity = st.run > 0 ? 0.35 : st.open ? 0.18 : 0;
    } });
}

// ---------------------------------------------------------------- the kettle (on the counter): blue light, it boils, clicks off
function buildKettle(x, z, rot, y) {
  const s = 0.0125, grp = group(x, z, rot, y), STEEL = 0xc9ced3;
  grp.add(vox(s, (g) => {
    B(g, s, -0.09, 0.09, 0, 0.02, -0.09, 0.09, (x, y, z) => (x * x + z * z < 0.0081 ? 0x2c2f33 : undefined));
    B(g, s, -0.075, 0.075, 0.02, 0.25, -0.075, 0.075, (x, y, z) => { const r = x * x + z * z; if (r > 0.075 ** 2 - y * 0.003) return undefined; return (x > 0.045 && Math.abs(z) < 0.015 && y > 0.06 && y < 0.2) ? 0x7fb6e8 : STEEL; });
    B(g, s, -0.05, 0.05, 0.25, 0.265, -0.05, 0.05, (x, y, z) => (x * x + z * z < 0.0025 ? 0x2c2f33 : undefined));
    B(g, s, -0.01, 0.01, 0.265, 0.28, -0.01, 0.01, 0x2c2f33);
    B(g, s, -0.12, -0.075, 0.07, 0.23, -0.0125, 0.0125, (x, y) => (x < -0.105 || y > 0.215 || y < 0.085 ? 0x2c2f33 : undefined));   // handle
    B(g, s, 0.07, 0.1, 0.2, 0.24, -0.0125, 0.0125, STEEL);                                                                         // spout
  }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.088, 24), glow(0x3aa0ff, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.021; grp.add(ring);
  const st = { on: false, t: 0, steamT: 0 };
  const front = toWorld(grp, 0, 0, 0.6); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 0.6, label: () => (st.on ? 'E – vízforraló kikapcsolása' : 'E – vízforraló bekapcsolása'),
    use: () => { st.on = !st.on; st.t = 0; click(); },
    update: (dt) => {
      ring.material.opacity = st.on ? 0.95 : 0;
      if (!st.on) return;
      st.t += dt;
      if (st.t > 2 && (st.steamT -= dt) <= 0) { st.steamT = 0.12; noise(0.2, 300 + st.t * 60, 0.7, 0.02); spawnFx(toWorld(grp, 0.1, 0.25, 0), new V3(0.05 + R() * 0.1, 0.5, (R() - 0.5) * 0.1), 0xf5f7fa, 0.03, 1.0, -0.15); }
      if (st.t > 8) { st.on = false; tone('square', 1500, 1100, 0.04, 0.06); say({ headWorld: (o) => o.copy(toWorld(grp, 0, 0.5, 0)) }, 'KATT!', 1.2); }
    } });
}

// ---------------------------------------------------------------- the cooktop: glowing rings, steam from the pot (mum is cooking)
function buildCooktop(x, z, rot, y) {
  const grp = group(x, z, rot, y), rings = [];
  for (const [rx, rz] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.062, 24), glow(0xff3b1f, 0)); m.rotation.x = -Math.PI / 2; m.position.set(rx, 0.016, rz); grp.add(m); rings.push(m);
  }
  const st = { on: true, heat: 1, steamT: 0 };
  const front = toWorld(grp, 0, 0, 0.75); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 0.8, label: () => (st.on ? 'E – tűzhely kikapcsolása' : 'E – tűzhely bekapcsolása'),
    use: () => { st.on = !st.on; click(); if (!st.on && G.angi) say(G.angi, 'Hé! Most főzök!', 2.2); },
    update: (dt) => {
      st.heat = damp(st.heat, st.on ? 1 : 0, 1.2, dt);
      rings.forEach((m, i) => { m.material.opacity = st.heat * (i === 3 ? 0.9 : i === 0 ? 0.6 : 0.15); });
      if (st.heat > 0.6 && (st.steamT -= dt) <= 0) { st.steamT = 0.25; spawnFx(toWorld(grp, 0.15, 0.18, 0.12), new V3((R() - 0.5) * 0.1, 0.4, (R() - 0.5) * 0.1), 0xf5f7fa, 0.035, 1.2, -0.1); }
    } });
}

// ---------------------------------------------------------------- taps: the kitchen sink, the bath tap, the shower
function buildTap(x, z, rot, y, name, len, hot) {
  const grp = group(x, z, rot, y), jet = stream(len); grp.add(jet);
  const st = { on: false, sndT: 0 };
  const front = toWorld(grp, hot.x, 0, hot.z); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: hot.r, label: () => (st.on ? `E – ${name} elzárása` : `E – ${name} megnyitása`),
    use: () => { st.on = !st.on; click(); },
    update: (dt) => {
      jet.visible = st.on;
      if (st.on) { jet.scale.x = jet.scale.z = 0.9 + Math.sin(G.clockT * 40) * 0.15; if ((st.sndT -= dt) <= 0) { st.sndT = 0.35; noise(0.4, 1800, 0.6, 0.035); } }
    } });
}
function buildShowerWater(x, z, y) {   // the head over the bath: falling drops while on
  const grp = group(x, z, 0, y), drops = [];
  const mat = glow(0x8fd0f0, 0.85), geo = new THREE.BoxGeometry(0.014, 0.11, 0.014);
  for (let i = 0; i < 36; i++) { const d = new THREE.Mesh(geo, mat); d.userData = { ox: (R() - 0.5) * 0.12, oz: (R() - 0.5) * 0.12, t: R() }; d.visible = false; grp.add(d); drops.push(d); }
  const st = { on: false, sndT: 0 };
  devices.push({ x: 1.05, z: 1.3, r: 0.5, label: () => (st.on ? 'E – zuhany elzárása' : 'E – zuhany megnyitása'),
    use: () => { st.on = !st.on; click(); },
    update: (dt) => {
      for (const d of drops) {
        d.visible = st.on; if (!st.on) continue;
        const u = d.userData; u.t = (u.t + dt * 1.6) % 1;
        d.position.set(u.ox * (1 + u.t * 2.5), -u.t * 1.45, u.oz * (1 + u.t * 2.5));
      }
      if (st.on && (st.sndT -= dt) <= 0) { st.sndT = 0.3; noise(0.35, 3000, 0.5, 0.03); }
    } });
}

// ---------------------------------------------------------------- the washing machine: the drum turns behind the glass
function buildWasher(x, z, rot) {
  const grp = group(x, z, rot);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x2 = c.getContext('2d');
  x2.fillStyle = '#7f9fb4'; x2.fillRect(0, 0, 64, 64);
  [['#e63946', 0], ['#3a86ff', 1.3], ['#ffca3a', 2.6], ['#8ac926', 3.9], ['#ffffff', 5.1]].forEach(([col, a]) => { x2.fillStyle = col; x2.beginPath(); x2.ellipse(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14, 12, 7, a, 0, Math.PI * 2); x2.fill(); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const drum = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), new THREE.MeshLambertMaterial({ map: tex })); drum.position.set(0, 0.425, 0.33); grp.add(drum);
  const st = { on: false, sndT: 0 };
  const front = toWorld(grp, 0, 0, 0.62); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 0.55, label: () => (st.on ? 'E – mosógép leállítása' : 'E – mosógép indítása'),
    use: () => { st.on = !st.on; tone('sine', 660, 990, 0.12, 0.06); },
    update: (dt) => {
      if (!st.on) return;
      drum.rotation.z -= dt * 7;
      grp.position.x = x + Math.sin(G.clockT * 37) * 0.004;
      if ((st.sndT -= dt) <= 0) { st.sndT = 0.45; noise(0.45, 140, 0.9, 0.05); }
    } });
}

// ---------------------------------------------------------------- TV (the parents' room): a cartoon on the screen
function buildTV(x, z, rot) {
  const grp = group(x, z, rot), scr = canvasScreen(256, 144, 1.1, 0.61);
  scr.m.position.set(0, 0.935, -0.02); grp.add(scr.m);
  const st = { on: false, t: 0, frame: 0, sndT: 0 };
  const draw = () => {
    const c = scr.ctx, t = st.t;
    if (!st.on) { c.fillStyle = '#0c0f14'; c.fillRect(0, 0, 256, 144); scr.tex.needsUpdate = true; return; }
    c.fillStyle = '#8fd3ff'; c.fillRect(0, 0, 256, 144);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(215, 28, 16, 0, 7); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const cx = ((t * 18 + i * 95) % 300) - 30; c.beginPath(); c.ellipse(cx, 25 + i * 12, 22, 8, 0, 0, 7); c.fill(); }
    c.fillStyle = '#5fbf4a'; c.beginPath(); c.moveTo(0, 144); for (let x = 0; x <= 256; x += 8) c.lineTo(x, 108 + Math.sin(x / 30 + t * 0.4) * 8); c.lineTo(256, 144); c.fill();
    const bx = 128 + Math.sin(t * 1.3) * 90, by = 100 - Math.abs(Math.sin(t * 3)) * 55;   // a bouncing red ball with a face
    c.fillStyle = '#e63946'; c.beginPath(); c.arc(bx, by, 13, 0, 7); c.fill(); c.fillStyle = '#111'; c.fillRect(bx - 5, by - 4, 3, 3); c.fillRect(bx + 3, by - 4, 3, 3);
    c.fillStyle = '#ffffffcc'; c.font = 'bold 13px sans-serif'; c.fillText('MESE', 8, 136);
    scr.tex.needsUpdate = true;
  };
  draw();
  const front = toWorld(grp, 0, 0, 0.75); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 1.0, label: () => (st.on ? 'E – tévé kikapcsolása' : 'E – tévé bekapcsolása'),
    use: () => { st.on = !st.on; st.t = 0; click(); draw(); if (st.on) say({ headWorld: (o) => o.copy(toWorld(grp, 0, 1.4, 0)) }, '♪ Lalala-lala! ♪', 2); },
    update: (dt) => { if (!st.on) return; st.t += dt; if ((st.frame -= dt) <= 0) { st.frame = 1 / 12; draw(); } if ((st.sndT -= dt) <= 0) { st.sndT = 0.6; tone('triangle', 520 + Math.floor(R() * 4) * 130, 520, 0.18, 0.015); } } });
}

// ---------------------------------------------------------------- Petyus's computer (on his desk): monitor, keyboard, mouse, speakers, webcam, tower
function buildComputer(x, z, rot) {
  const s = 0.0125, grp = group(x, z, rot), D = 0x1c1e22, D2 = 0x2c2f33, KEY = 0x4a4f57, KEYT = 0x6b7078;
  grp.add(vox(s, (g) => {
    // monitor: base, neck, a thin-bezel screen; webcam on top; power LED (dark until on – the glow is separate)
    B(g, s, -0.1, 0.1, 0.77, 0.78, -0.22, -0.08, D2);
    B(g, s, -0.025, 0.025, 0.78, 0.97, -0.18, -0.15, D2);
    B(g, s, -0.3, 0.3, 0.9, 1.25, -0.16, -0.13, D);
    B(g, s, -0.2, 0.2, 0.95, 1.2, -0.18, -0.16, D2);   // the back bump
    B(g, s, -0.025, 0.025, 1.25, 1.27, -0.155, -0.13, D); B(g, s, -0.006, 0.006, 1.255, 1.265, -0.13, -0.125, 0x3a86ff);
    // keyboard: a dark base, rows of keys (WASD orange), a long space bar, a few function keys
    B(g, s, -0.22, 0.22, 0.77, 0.785, 0.0, 0.16, D);   // the keyboard's base
    // keys: one voxel each with a voxel's gap, on top of the base (row 0: function keys, WASD orange, a long space bar)
    const jy = Math.round(0.79 / s - 0.5);
    for (let r = 0; r < 6; r++) for (let i = -16; i <= 16; i += 2) {
      const k = 2 + r * 2;
      if (r === 5 && Math.abs(i) < 8) continue;
      const wasd = (r === 3 && (i === -12 || i === -10 || i === -8)) || (r === 2 && i === -10);
      g.set(i + (r % 2), jy, k, wasd ? 0xf08a24 : r === 0 ? KEYT : KEY);
    }
    for (let i = -7; i <= 7; i++) g.set(i, jy, 12, KEY);   // the space bar
    // mouse pad + mouse (scroll wheel, a light strip)
    B(g, s, 0.25, 0.45, 0.77, 0.775, 0.0, 0.18, 0x1d3557);
    B(g, s, 0.32, 0.37, 0.775, 0.795, 0.06, 0.13, (x, y, z) => (Math.abs(x - 0.345) < 0.007 && z < 0.08 ? 0x9aa3ab : (z > 0.12 ? 0xff70a6 : D2)));
    // speakers: two little towers with cones
    for (const sx of [-0.4, 0.4]) { B(g, s, sx - 0.05, sx + 0.05, 0.77, 0.94, -0.2, -0.12, D2); B(g, s, sx - 0.03, sx + 0.03, 0.8, 0.86, -0.12, -0.115, 0x6b7378); B(g, s, sx - 0.018, sx + 0.018, 0.88, 0.92, -0.12, -0.115, 0x6b7378); }
    // headphones on a hook under the desk's edge, a can of soda, a notebook
    B(g, s, 0.48, 0.52, 0.6, 0.72, 0.27, 0.3, D); B(g, s, 0.47, 0.53, 0.58, 0.62, 0.25, 0.32, 0xe63946);
    B(g, s, -0.5, -0.46, 0.77, 0.87, 0.05, 0.09, 0x3a86ff);
    B(g, s, -0.48, -0.3, 0.77, 0.785, -0.12, 0.0, 0xffca3a);
    // the tower on the floor (under the left end): side window, front panel, power button, fans (glow separate)
    B(g, s, -0.55, -0.35, 0.0, 0.46, -0.22, 0.2, (x, y, z) => (x > -0.365 && y > 0.05 && y < 0.42 && z > -0.2 && z < 0.18 ? 0x3d4148 : D));
    B(g, s, -0.47, -0.43, 0.4, 0.42, 0.2, 0.21, 0x9aa3ab);
  }));
  // glowing bits (on): the screen, the fans, the keyboard underglow
  const scr = canvasScreen(256, 144, 0.56, 0.315); scr.m.position.set(0, 1.075, -0.1285); grp.add(scr.m);
  const fans = [0.12, 0.3].map((fy) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.06, 20), glow(0x00e5ff, 0)); m.position.set(-0.45, fy, 0.206); grp.add(m); return m; });
  const kbGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.18), glow(0x7b2ff7, 0)); kbGlow.rotation.x = -Math.PI / 2; kbGlow.position.set(0, 0.772, 0.08); grp.add(kbGlow);
  const st = { on: false, t: 0, frame: 0 };
  // the screen: off → start-up (logo + bar) → desktop → a little jump-and-run game
  const draw = () => {
    const c = scr.ctx, t = st.t;
    if (!st.on) { c.fillStyle = '#050608'; c.fillRect(0, 0, 256, 144); scr.tex.needsUpdate = true; return; }
    if (t < 2.2) {
      c.fillStyle = '#101828'; c.fillRect(0, 0, 256, 144); c.fillStyle = '#ffd23f'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('Petyus OS', 128, 66);
      c.fillStyle = '#334'; c.fillRect(68, 86, 120, 8); c.fillStyle = '#3a86ff'; c.fillRect(68, 86, 120 * Math.min(1, t / 2), 8);
    } else if (t < 3.4) {
      c.fillStyle = '#2a9d8f'; c.fillRect(0, 0, 256, 144);
      for (let i = 0; i < 4; i++) { c.fillStyle = ['#ffca3a', '#e63946', '#3a86ff', '#8ac926'][i]; c.fillRect(12, 12 + i * 28, 20, 20); }
      c.fillStyle = '#1d3557'; c.fillRect(0, 130, 256, 14); c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.textAlign = 'right'; c.fillText('6:00', 250, 141);
      c.fillStyle = '#ffffffdd'; c.fillRect(70, 40, 120, 60); c.fillStyle = '#1d3557'; c.textAlign = 'center'; c.font = 'bold 12px sans-serif'; c.fillText('Indul a játék…', 130, 74);
    } else {   // the game: scrolling hills, a blocky hero hopping over crates, coins
      const k = t - 3.4, scroll = k * 60;
      c.fillStyle = '#87ceeb'; c.fillRect(0, 0, 256, 144);
      c.fillStyle = '#6cbf58'; for (let x = 0; x < 256; x += 4) { const h = 20 + Math.sin((x + scroll * 0.4) / 25) * 10; c.fillRect(x, 110 - h, 4, h); }
      c.fillStyle = '#8b5a2b'; c.fillRect(0, 112, 256, 32); c.fillStyle = '#5fbf4a'; c.fillRect(0, 110, 256, 4);
      for (let i = 0; i < 4; i++) { const cx = ((i * 90 - scroll) % 360 + 360) % 360 - 20; c.fillStyle = '#b07a45'; c.fillRect(cx, 94, 16, 16); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(cx + 45, 70, 5, 0, 7); c.fill(); }
      const jump = Math.max(0, Math.sin(k * 4.7)) * 34;
      c.fillStyle = '#3a86ff'; c.fillRect(56, 88 - jump, 14, 18); c.fillStyle = '#f1c9a5'; c.fillRect(57, 78 - jump, 12, 10); c.fillStyle = '#5a3825'; c.fillRect(57, 76 - jump, 12, 4);
      c.fillStyle = '#fff'; c.font = 'bold 11px monospace'; c.textAlign = 'left'; c.fillText('PONT: ' + Math.floor(k * 37), 8, 16);
    }
    scr.tex.needsUpdate = true;
  };
  draw();
  const front = toWorld(grp, 0, 0, 0.6); front.y -= FY;
  devices.push({ x: front.x, z: front.z, r: 0.8, label: () => (st.on ? 'E – számítógép kikapcsolása' : 'E – számítógép bekapcsolása'),
    use: () => { st.on = !st.on; st.t = 0; click(); if (st.on) tone('sine', 523, 784, 0.5, 0.05, 0.2); draw();
      if (st.on && G.petya) setTimeout(() => say(G.petya, 'Petyus! Reggel nincs gépezés!', 2.6), 2500); },
    update: (dt) => {
      const on = st.on ? 1 : 0; fans.forEach((m) => { m.material.opacity = on * 0.9; m.rotation.z += dt * 8 * on; }); kbGlow.material.opacity = on * 0.55;
      if (!st.on) return; st.t += dt; if ((st.frame -= dt) <= 0) { st.frame = 1 / 12; draw(); }
      if (st.t > 3.4 && Math.floor(st.t * 4.7 / Math.PI) !== Math.floor((st.t - dt) * 4.7 / Math.PI) && Math.sin(st.t * 4.7) > 0) tone('square', 660, 990, 0.06, 0.02);   // jump blips
    } });
}

// ---------------------------------------------------------------- build all, update all
export function buildAppliances() {
  const P = Math.PI, E = P / 2, W = -P / 2;
  buildFridge(5.76, 1.5, E);
  buildMicrowave(6.45, 0.25, 0, 0.93);
  buildKettle(9.3, 0.22, 0, 0.93);
  buildCooktop(7.6, 0.31, 0, 0.93);
  buildTap(8.6, 0.31, 0, 0, 'mosogatócsap', 0.36, { x: 0, z: 0.65, r: 0.7 });
  { const t = homeRoot.children[homeRoot.children.length - 1]; t.children[0].position.set(0, 1.15, -0.1); }   // the kitchen jet: from the spout into the basin
  buildTap(0.4, 1.15, E, 0, 'kádcsap', 0.42, { x: -0.7, z: 0.65, r: 0.5 });
  { const t = homeRoot.children[homeRoot.children.length - 1]; t.children[0].position.set(-0.72, 0.72, 0); }   // the bath jet (the tap's end, in the bath's frame)
  buildShowerWater(0.2, 1.4, 1.74);
  buildWasher(1.45, 0.33, 0);
  buildTV(8.3, 8.95, P);
  buildComputer(15.28, 1.45, W);
}
export function updateAppliances(dt) { for (const d of devices) if (d.update) d.update(dt); }
