// Petyus kalandjai – 2. rész: kapcsolható és nyitható eszközök a lakásban.
// Hűtő (két ajtó, belül polcok, ételek, fény) · mikró (nyitható ajtó, forgótányér, kijelző, pohár és tányér berakható) ·
// vízforraló · tűzhely · mosogatócsap · Petyus számítógépe (monitor, billentyűzet, egér, hangfalak, gépház; képernyőn indulás,
// asztal, játék) · a szülők tévéje (mese) · kádcsap · zuhany · mosógép.
// Each device: a hotspot (x, z, r) – the nearest one within reach is used (ep2.js interactHome): E = label/use, and for some
// a second action on Space (alt). Coordinates: the flat's frame (homeRoot); every device group faces +z locally (rot turns it).
import * as THREE from 'three';
import { spawnFx } from '../actors.js';
import { noise, tone } from '../audio.js';
import { G, ROLLER_SCALE } from '../state.js';
import { say } from '../ui.js';
import { V3, damp } from '../util.js';
import { VoxelGrid } from '../voxels.js';
import { addBoxCol, mergeStatic, vcMat } from '../world.js';
import { FY, homeRoot } from './home.js';
import * as F from './food.js';

export const devices = [];
// handles for inventory.js (filled while building): fridge, micro, tv, desk, controller, mug, dairy
export const fx = {};

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
// the point to look at in the first-person view (the flat's frame: y from its floor) – an interaction there needs it aimed at
const loc = (grp, x, y, z) => { grp.updateMatrixWorld(true); const v = toWorld(grp, x, y, z); v.y -= FY; return v; };
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
    // fridge side (x > 0): the crisper's frame (the food on the shelves and in it: food.js, below)
    B(g, s, 0.05, 0.38, 0.08, 0.3, -0.25, 0.12, (x, y, z) => (y > 0.28 || Math.abs(z - 0.12) < 0.013 || Math.abs(x - 0.05) < 0.013 || Math.abs(x - 0.38) < 0.013 ? 0xdbeaf2 : undefined));
    // freezer side (x < 0): two drawers, ice cream, peas
    for (const [y0, y1] of [[0.08, 0.5], [0.55, 0.95]]) B(g, s, -0.38, -0.05, y0, y1, -0.25, 0.12, (x, y, z) => (z > 0.1 || y > y1 - 0.02 ? 0xbfe0ef : undefined));
    B(g, s, -0.3, -0.12, 0.1, 0.25, -0.2, -0.02, 0xf3a9c0); B(g, s, -0.3, -0.12, 0.57, 0.65, -0.15, 0.05, 0x5fae6a);
    B(g, s, -0.35, -0.1, 1.2, 1.26, -0.2, 0.05, 0xcfe8f3);
  }));
  // what is in it (fridge side): carrots, cheese and salami on the first shelf, milk, cream (TEJSZÍN) and whipped cream (TEJSZÍNHAB)
  // on the second (in front, easy to reach), cola, orange soda, a can on the third; apples, oranges and grapes in the crisper.
  // Shelf tops: 0.525, 0.925, 1.325; the floor 0.075.
  // (the first shelf's front: three carrots – inventory.js)
  { const p = F.plate(0xf2c94c, 0.08); F.at(grp, p, 0.13, 0.525, -0.17); F.at(grp, F.cheeseWedge(), 0.13, 0.54, -0.17, 0.4); }
  F.at(grp, F.salamiLog(), 0.3, 0.525, -0.17, 0.2);
  F.at(grp, F.sodaBottle(), 0.1, 1.325, -0.16); F.at(grp, F.sodaBottle(0xf4a261, 0xf77f00, 'NARANCS', '#f77f00'), 0.2, 1.325, -0.16); F.at(grp, F.sodaCan('#c1121f', 'MÁLNA'), 0.32, 1.325, 0.0);
  for (const [fx, fz, f] of [[0.1, -0.15, F.apple()], [0.18, -0.05, F.apple(0x8ac926)], [0.26, -0.16, F.orange()], [0.32, 0.0, F.orange()], [0.12, 0.05, F.grapes()]]) F.at(grp, f, fx, 0.075, fz);
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
        B(g, s, x0 + 0.04, x1 - 0.04, by, by + 0.1, -0.16, -0.06, (x, y, z) => (y > by + 0.03 && z > -0.14 ? undefined : 0xf2f4f6));   // floor + a lip at the far edge
        for (let n = 0; n < 3; n++) { const bx = x0 + 0.1 + n * 0.11; B(g, s, bx, bx + 0.03, by + 0.03, by + 0.2, -0.11, -0.08, [0xd9453a, 0xf4a261, 0x7fb6e8][(n + (side > 0 ? 1 : 0)) % 3]); }
      }
    }));
    return pv;
  };
  const L = door(-1), Rr = door(1);
  // in the right door's lowest bin (they swing out with the door): milk, cream (TEJSZÍN), whipped cream (TEJSZÍNHAB)
  const milk = F.at(grp, F.milkCarton(), 0.1, 0.925, 0.08);
  const cream = (() => { const c = F.creamCarton(); c.scale.setScalar(0.78); return F.at(grp, c, 0.2, 0.925, 0.08); })();
  const whip = F.at(grp, F.whippedCream(), 0.31, 0.925, 0.08);
  // the collider: the body (turned with the device)
  const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)), hx = c * 0.45 + sn * 0.33, hz = sn * 0.45 + c * 0.33;
  addBoxCol(x - hx, z - hz, x + hx, z + hz, 1.9);
  const st = { open: false, t: 0, openT: 0, beepT: 0, capT: 0 };
  const front = toWorld(grp, 0, 0, 0.7); front.y -= FY;
  devices.push({ aim: loc(grp, 0, 1.0, 0.3), size: 0.45, x: front.x, z: front.z, r: 0.75, label: () => (st.open ? 'E – hűtő becsukása' : 'E – hűtő kinyitása'),
    use: () => { st.open = !st.open; tone('sine', st.open ? 220 : 160, st.open ? 180 : 120, 0.12, 0.08); if (!st.open) noise(0.08, 400, 1, 0.12); },
    update: (dt) => {
      st.t = damp(st.t, st.open ? 1 : 0, 6, dt); L.rotation.y = -st.t * 1.9; Rr.rotation.y = st.t * 1.9;
      // open for more than 15 seconds: it beeps (two short beeps every 1.2 s) until it is closed
      st.openT = st.open ? st.openT + dt : 0;
      if (st.openT > 15) {
        if ((st.beepT -= dt) <= 0) { st.beepT = 1.2; tone('square', 2300, 2300, 0.08, 0.05); tone('square', 2300, 2300, 0.08, 0.05, 0.16); }
        if ((st.capT -= dt) <= 0) { st.capT = 3.6; say({ headWorld: (o) => o.copy(toWorld(grp, 0, 1.95, 0.2)) }, 'BÍP-BÍP!', 1.2); }
      } else { st.beepT = 0; st.capT = 0; }
    } });
  // (mum opens and closes it too – ep2.js)
  const setOpen = (v) => { if (st.open === v) return; st.open = v; tone('sine', v ? 220 : 160, v ? 180 : 120, 0.12, 0.08); if (!v) noise(0.08, 400, 1, 0.12); };
  fx.fridge = { grp, door: Rr, isOpen: () => st.open && st.t > 0.6, open: () => st.open, setOpen }; fx.dairy = { milk, cream, whip };
  mergeStatic(grp, new Set([L, Rr, milk, cream, whip]));   // (performance: the fridge and what is fixed in it – one draw call; the doors and the cartons stay apart)
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
  const cupIn = new THREE.Mesh(new THREE.CircleGeometry(0.031, 16), new THREE.MeshLambertMaterial({ color: 0x6b3a1e })); cupIn.rotation.x = -Math.PI / 2; cupIn.position.y = 0.06; cupIn.visible = false; cup.add(cupIn);   // the drink (inventory.js)
  const foam = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xfffdf7 })); foam.position.y = 0.083; foam.scale.y = 0.9; foam.visible = false; cup.add(foam);   // whipped cream on top
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: 0xd9453a })); handle.rotation.z = -Math.PI / 2; handle.position.set(0.036, 0.045, 0); cup.add(handle);
  const onCounter = () => { grp.add(plate); plate.position.set(0.4, 0.008, 0.02); };
  onCounter(); grp.add(cup); cup.position.set(0.4, 0.016, 0.16);
  const st = { open: false, t: 0, items: 0, run: 0, done: 0, hum: 0 };   // items: 0 the plate outside, 1 the plate inside (the cup: inventory.js)
  fx.micro = { grp, tt, isOpen: () => st.open && st.t > 0.6 }; fx.mug = { obj: cup, drink: cupIn, foam };
  const drawDisp = (txt) => { const d = disp.ctx; d.fillStyle = '#0b1a10'; d.fillRect(0, 0, 64, 24); d.fillStyle = '#5dff8a'; d.font = 'bold 18px monospace'; d.textAlign = 'center'; d.fillText(txt, 32, 18); disp.tex.needsUpdate = true; };
  drawDisp('6:00');
  const front = toWorld(grp, 0, 0, 0.65); front.y -= FY;
  devices.push({ aim: loc(grp, 0, 0.15, 0.18), size: 0.2, x: front.x, z: front.z, r: 0.7,
    label: () => (st.open ? 'E – mikró becsukása' : st.run > 0 ? 'E – (fut)' : 'E – mikró kinyitása'),
    use: () => { if (st.run > 0) { st.run = 0; tone('sine', 880, 880, 0.08, 0.05); } st.open = !st.open; click(); noise(0.06, 900, 1, 0.08); },
    alt: {
      label: () => (st.open ? (st.items ? 'Szóköz – tányér kivétele' : 'Szóköz – tányér berakása') : st.run > 0 ? 'Szóköz – leállítás' : 'Szóköz – indítás (10 mp)'),
      short: () => (st.open ? (st.items ? 'KIVESZ' : 'BERAK') : st.run > 0 ? 'STOP' : 'START'),
      use: () => {
        if (st.open) {
          st.items = (st.items + 1) % 2; click();
          if (st.items === 1) { tt.add(plate); plate.position.set(0, 0.012, 0); } else onCounter();
        } else if (st.run > 0) { st.run = 0; tone('sine', 700, 700, 0.1, 0.05); drawDisp('STOP'); }
        else { st.run = 10; st.done = 0; tone('sine', 1000, 1000, 0.08, 0.06); }
      },
    },
    update: (dt) => {
      st.t = damp(st.t, st.open ? 1 : 0, 8, dt); pv.rotation.y = -st.t * 1.75;
      if (st.run > 0) {
        st.run = Math.max(0, st.run - dt); tt.rotation.y += dt * 1.2;
        if ((st.hum -= dt) <= 0) { st.hum = 0.5; noise(0.55, 150, 0.9, 0.09); tone('sawtooth', 100, 100, 0.52, 0.018); tone('sine', 200, 200, 0.52, 0.02); }
        drawDisp('0:' + String(Math.ceil(st.run)).padStart(2, '0'));
        if (st.run === 0) { for (let i = 0; i < 3; i++) tone('sine', 1760, 1760, 0.18, 0.08, i * 0.35); drawDisp('KÉSZ'); st.done = 3; say({ headWorld: (o) => o.copy(toWorld(grp, 0, 0.45, 0)) }, 'DING!', 1.4); }
      } else if (st.done > 0) { st.done -= dt; if (st.done <= 0) drawDisp('6:00'); }
      glowBox.material.opacity = st.run > 0 ? 0.35 : st.open ? 0.18 : 0;
    } });
}

// ---------------------------------------------------------------- the kettle (on the counter): blue light, it boils, clicks off
// ---------------------------------------------------------------- Petyus's scooter (the one from the park) with his helmet on the handlebar
function buildScooterCorner(x, z) {
  if (!G.rollerModel) return;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.set(0, Math.PI, 0.1, 'YXZ');   // handlebar towards the wall (south), leaning on its stand
  const m = G.rollerModel.clone(true); m.scale.setScalar(ROLLER_SCALE); m.rotation.y = Math.PI / 2; m.position.x = 0.07 * ROLLER_SCALE;
  g.add(m); homeRoot.add(g); g.updateMatrixWorld(true);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // the top of the handlebar: the highest vertices' middle (in the group's frame)
  const top = new THREE.Vector3(), v = new THREE.Vector3(), inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); let maxY = -1e9, n = 0;
  m.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (v.y > maxY + 0.02) { maxY = v.y; top.set(0, 0, 0); n = 0; } if (v.y > maxY - 0.03) { top.add(v); n++; } } });
  if (n) top.divideScalar(n);
  // the helmet: a blue shell with an orange stripe, vents, a visor and the straps; hanging on the handlebar
  const helmet = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2f6fd6 })); shell.scale.set(1, 0.9, 1.15); helmet.add(shell);
  const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.132, 18, 10, -0.18, 0.36, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xff7a3d })); stripe.scale.set(1, 0.9, 1.15); helmet.add(stripe);
  for (const a of [-0.6, 0.6]) { const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.09), new THREE.MeshLambertMaterial({ color: 0x1b2a40 })); vent.position.set(Math.sin(a) * 0.1, 0.085, 0); vent.rotation.z = -a; helmet.add(vent); }
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.05), new THREE.MeshLambertMaterial({ color: 0x1b2a40 })); visor.position.set(0, 0.01, 0.15); visor.rotation.x = 0.25; helmet.add(visor);
  for (const s of [-1, 1]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.14, 0.015), new THREE.MeshLambertMaterial({ color: 0x222222 })); strap.position.set(s * 0.1, -0.06, 0.02); strap.rotation.z = s * 0.25; helmet.add(strap); }
  helmet.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  helmet.position.set(top.x, top.y - 0.02, top.z); helmet.rotation.set(0.5, 0.4, 0);
  g.add(helmet);
  mergeStatic(g);   // (performance: the scooter model has ~110 parts – one draw call)
  addBoxCol(x - 0.3, z - 0.5, x + 0.3, z + 0.5, 1.0);
}
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
  devices.push({ aim: loc(grp, 0, 0.14, 0), x: front.x, z: front.z, r: 0.6, label: () => (st.on ? 'E – vízforraló kikapcsolása' : 'E – vízforraló bekapcsolása'),
    use: () => { st.on = !st.on; st.t = 0; click(); tone('square', 1500, 1100, 0.05, 0.1); },
    update: (dt) => {
      ring.material.opacity = st.on ? 0.95 : 0;
      if (!st.on) return;
      st.t += dt;
      if ((st.sndT = (st.sndT || 0) - dt) <= 0) { const k = Math.min(1, st.t / 7); st.sndT = 0.22; noise(0.3, 160 + k * 500, 0.8, 0.03 + k * 0.09); if (k > 0.55) tone('sine', 280 + R() * 500, 200, 0.06, 0.03 * k); }
      if (st.t > 2 && (st.steamT -= dt) <= 0) { st.steamT = 0.12; noise(0.2, 300 + st.t * 60, 0.7, 0.02); spawnFx(toWorld(grp, 0.1, 0.25, 0), new V3(0.05 + R() * 0.1, 0.5, (R() - 0.5) * 0.1), 0xf5f7fa, 0.03, 1.0, -0.15); }
      if (st.t > 8) { st.on = false; tone('square', 1500, 1100, 0.05, 0.14); noise(0.05, 2500, 1, 0.15); say({ headWorld: (o) => o.copy(toWorld(grp, 0, 0.5, 0)) }, 'KATT!', 1.2); }
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
  devices.push({ aim: loc(grp, 0, 0.02, 0), size: 0.25, x: front.x, z: front.z, r: 0.8, label: () => (st.on ? 'E – tűzhely kikapcsolása' : 'E – tűzhely bekapcsolása'),
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
  devices.push({ aim: null, x: front.x, z: front.z, r: hot.r, label: () => (st.on ? `E – ${name} elzárása` : `E – ${name} megnyitása`),
    use: () => { st.on = !st.on; click(); },
    update: (dt) => {
      jet.visible = st.on;
      if (st.on) { jet.scale.x = jet.scale.z = 0.9 + Math.sin(G.clockT * 40) * 0.15; if ((st.sndT -= dt) <= 0) { st.sndT = 0.35; noise(0.4, 1800, 0.6, 0.035); } }
    } });
  return st;
}
function buildShowerWater(x, z, y) {   // the head over the bath: falling drops while on
  const grp = group(x, z, 0, y), drops = [];
  const mat = glow(0x8fd0f0, 0.85), geo = new THREE.BoxGeometry(0.014, 0.11, 0.014);
  for (let i = 0; i < 36; i++) { const d = new THREE.Mesh(geo, mat); d.userData = { ox: (R() - 0.5) * 0.12, oz: (R() - 0.5) * 0.12, t: R() }; d.visible = false; grp.add(d); drops.push(d); }
  const st = { on: false, sndT: 0 };
  devices.push({ aim: new V3(0.2, 1.78, 1.4), size: 0.15, x: 1.05, z: 1.3, r: 0.5, label: () => (st.on ? 'E – zuhany elzárása' : 'E – zuhany megnyitása'),
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
  devices.push({ aim: loc(grp, 0, 0.45, 0.3), size: 0.25, x: front.x, z: front.z, r: 0.55, label: () => (st.on ? 'E – mosógép leállítása' : 'E – mosógép indítása'),
    use: () => { st.on = !st.on; tone('sine', 660, 990, 0.12, 0.06); },
    update: (dt) => {
      if (!st.on) return;
      drum.rotation.z -= dt * 7;
      grp.position.x = x + Math.sin(G.clockT * 37) * 0.004;
      if ((st.sndT -= dt) <= 0) { st.sndT = 0.45; noise(0.45, 140, 0.9, 0.05); }
    } });
}

// ---------------------------------------------------------------- an Xbox Series X and its controller on the TV stand
// the console standing upright (7.5 mm voxels): matt black, the top vent with its green-tinted holes, the glowing logo button,
// the disc slot, a USB port and the pair button on the front; the controller (5 mm voxels) lying in front of the TV:
// two grips, two thumbsticks, the D-pad, A B X Y in their colours, the Xbox button, view / menu, bumpers and triggers
function buildXbox(grp, x, y, z) {
  const s = 0.0075, BLK = 0x121315, BLK2 = 0x1b1c1f;
  const xb = vox(s, (g) => {
    B(g, s, -0.075, 0.075, 0.006, 0.3, -0.075, 0.075, (px, py, pz) => (py > 0.292 ? undefined : ((Math.round(px / s) + Math.round(pz / s)) % 7 ? BLK : BLK2)));
    // the top: a dish of vent holes (green inside), a rim round it
    B(g, s, -0.075, 0.075, 0.292, 0.3, -0.075, 0.075, (px, py, pz) => {
      const r = Math.hypot(px, pz); if (r > 0.066) return BLK;
      const hole = (Math.round(px / s) % 2 === 0) && (Math.round(pz / s) % 2 === 0);
      return hole ? (r < 0.05 ? 0x2e7d32 : 0x1f5d2a) : (py < 0.296 ? BLK2 : undefined);
    });
    B(g, s, -0.06, 0.06, 0.0, 0.006, -0.06, 0.06, 0x0a0a0b);   // the foot
    // front (+z): disc slot, power button ring, USB port, pair button
    B(g, s, -0.045, -0.04, 0.06, 0.24, 0.0775, 0.0775, 0x2c2f33);
    B(g, s, 0.03, 0.06, 0.25, 0.28, 0.0775, 0.0775, 0x2c2f33);
    B(g, s, 0.03, 0.05, 0.035, 0.045, 0.0775, 0.0775, 0x3a3d42); B(g, s, 0.055, 0.06, 0.04, 0.045, 0.0775, 0.0775, 0x6b7078);
  });
  xb.position.set(x, y, z); grp.add(xb);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.009, 16), glow(0xffffff, 0.9)); logo.position.set(x + 0.045, y + 0.265, z + 0.082); grp.add(logo);
  return logo;
}
function buildController(grp, x, y, z, ry) {
  const s = 0.005, BODY = 0x1a1b1e, GRIP = 0x141518, TOP = 0x26282c;
  const c = vox(s, (g) => {
    // the body: a rounded middle and two grips swept back towards the player (+z)
    B(g, s, -0.08, 0.08, 0, 0.04, -0.035, 0.065, (px, py, pz) => {
      const mid = (px / 0.06) ** 2 + ((pz - 0.0) / 0.035) ** 2 <= 1;
      const grip = [-1, 1].some((sd) => ((px - sd * 0.05) / 0.028) ** 2 + ((pz - 0.032) / 0.034) ** 2 <= 1);
      if (!mid && !grip) return undefined;
      const h = grip && !mid ? 0.028 : 0.034; if (py > h) return undefined;
      return py > h - 0.006 ? TOP : (grip && !mid ? GRIP : BODY);
    });
    const cyl = (cx, cz, r, y0, y1, col) => B(g, s, cx - r, cx + r, y0, y1, cz - r, cz + r, (px, py, pz) => (Math.hypot(px - cx, pz - cz) <= r ? col : undefined));
    cyl(-0.035, -0.006, 0.011, 0.034, 0.042, 0x0f1012); cyl(-0.035, -0.006, 0.008, 0.042, 0.05, 0x2c2f33);   // left stick
    cyl(0.018, 0.02, 0.011, 0.034, 0.042, 0x0f1012); cyl(0.018, 0.02, 0.008, 0.042, 0.05, 0x2c2f33);        // right stick
    B(g, s, -0.025, -0.01, 0.034, 0.04, 0.017, 0.022, 0x3a3d42); B(g, s, -0.02, -0.015, 0.034, 0.04, 0.01, 0.03, 0x3a3d42);   // D-pad
    for (const [bx, bz, col] of [[0.04, 0.004, 0x4caf50], [0.05, -0.006, 0xe53935], [0.03, -0.006, 0x1e88e5], [0.04, -0.016, 0xfdd835]]) cyl(bx, bz, 0.0055, 0.034, 0.042, col);   // A B X Y
    B(g, s, -0.01, -0.005, 0.034, 0.038, -0.005, 0.0, 0x6b7078); B(g, s, 0.005, 0.01, 0.034, 0.038, -0.005, 0.0, 0x6b7078);       // view / menu
    B(g, s, -0.07, -0.03, 0.02, 0.034, -0.04, -0.03, 0x3a3d42); B(g, s, 0.03, 0.07, 0.02, 0.034, -0.04, -0.03, 0x3a3d42);       // bumpers
    B(g, s, -0.065, -0.04, 0.0, 0.02, -0.042, -0.033, 0x2c2f33); B(g, s, 0.04, 0.065, 0.0, 0.02, -0.042, -0.033, 0x2c2f33);     // triggers
  });
  c.position.set(x, y, z); c.rotation.y = ry; grp.add(c);
  const btn = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 14), glow(0xffffff, 0.85)); btn.rotation.x = -Math.PI / 2; btn.position.set(0, 0.0355, -0.02); c.add(btn);
  return { c, btn };
}

// ---------------------------------------------------------------- the armchair in front of the TV: E to sit down / stand up
// ep2.js reads seating: while Petyus sits, he does not walk (any movement key stands him up)
export const seating = { on: false, x: 0, z: 0, h: 0, seatH: 0.44 };
function buildArmchair(x, z, rot) {
  const s = 0.025, grp = group(x, z, rot), F1 = 0x6d8b74, F2 = 0x5a7660, WOOD = 0x7a4a24;
  grp.add(vox(s, (g) => {
    B(g, s, -0.42, 0.42, 0.12, 0.38, -0.4, 0.38, (px, py, pz) => (Math.abs(px) > 0.3 || pz < -0.28 ? F2 : F1));            // the base
    B(g, s, -0.3, 0.3, 0.38, 0.46, -0.28, 0.36, (px, py, pz) => (Math.abs(px) < 0.015 ? F2 : 0x7fa086));                      // the seat cushion
    B(g, s, -0.42, 0.42, 0.38, 0.95, -0.42, -0.28, (px, py) => (py > 0.9 && Math.abs(px) > 0.36 ? undefined : F2));         // the back
    B(g, s, -0.3, 0.3, 0.46, 0.85, -0.28, -0.2, 0x7fa086);                                                                   // the back cushion
    // the two arms (the box needs x0 < x1 on both sides)
    for (const sd of [-1, 1]) B(g, s, Math.min(sd * 0.36, sd * 0.42), Math.max(sd * 0.36, sd * 0.42), 0.38, 0.62, -0.28, 0.38, (px, py, pz) => (py > 0.58 && pz > 0.34 ? undefined : F2));
    for (const lx of [-0.36, 0.36]) for (const lz of [-0.34, 0.32]) B(g, s, lx - 0.02, lx + 0.02, 0, 0.12, lz - 0.02, lz + 0.02, WOOD);
    B(g, s, -0.12, 0.12, 0.46, 0.62, -0.2, -0.12, 0xf4a261);                                                                // a little cushion
  }));
  const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)), hx = c * 0.42 + sn * 0.4, hz = sn * 0.42 + c * 0.4;
  addBoxCol(x - hx, z - hz, x + hx, z + hz, 0.95);
  seating.x = x; seating.z = z; seating.h = rot;
  // the hotspot is beside the armchair (in front of it is the TV's)
  devices.push({ aim: new V3(x, 0.5, z), size: 0.35, x: x + Math.cos(rot) * 0.65, z: z - Math.sin(rot) * 0.65, r: 0.75, label: () => (seating.on ? 'E – felállás' : 'E – leülés a fotelbe'),
    use: () => { seating.on = !seating.on; tone('sine', seating.on ? 180 : 240, seating.on ? 120 : 300, 0.15, 0.05); } });
}

// ---------------------------------------------------------------- TV (the parents' room): a cartoon on the screen
function buildTV(x, z, rot) {
  // the picture covers just the screen's voxels (x −0.575 … 0.525, y 0.65 … 1.25), a little inside them
  const grp = group(x, z, rot), scr = canvasScreen(256, 144, 1.06, 0.56);
  scr.m.position.set(-0.025, 0.95, -0.02); grp.add(scr.m);
  // on the stand: the console (right) and the controller (left, in front of the TV)
  const xlogo = buildXbox(grp, 0.6, 0.5, -0.05), ctl = buildController(grp, -0.52, 0.5, 0.06, 0.35), cbtn = ctl.btn;
  const st = { on: false, t: 0, frame: 0, sndT: 0 }, xb = { on: false, t: 0 };
  // the TV programme: a football match, Real Madrid – Barcelona, as on TV (the broadcast camera follows the ball; the stands,
  // the striped pitch, white Madrid shirts, garnet-and-blue Barcelona stripes, the score and the clock in the corner; now and
  // then a goal: GÓÓÓL! and the crowd roars – the sounds: update below)
  const GOALS = [[22, 0], [51, 1], [83, 0], [117, 1], [140, 0]];   // [seconds into the programme, 0 Madrid / 1 Barcelona]
  const score = (t) => { const k = t % 160; let a = 0, b = 0; for (const [g, w] of GOALS) if (k >= g) { if (w) b++; else a++; } return [a, b]; };
  const goalNow = (t) => { const k = t % 160; return GOALS.find(([g]) => k >= g && k < g + 3); };
  const match = (c, t) => {
    const W = 256, H = 144, bx = 200 + Math.sin(t * 0.35) * 170 + Math.sin(t * 1.1) * 40;   // the ball along the pitch (0 … 400)
    const cam = bx - W / 2;
    // the stands: rows of fans (dots), flickering
    c.fillStyle = '#2b2d42'; c.fillRect(0, 0, W, 34);
    for (let y = 4; y < 32; y += 5) for (let x = -((cam * 0.5) % 6); x < W; x += 6) { const h = (Math.floor(x + cam * 0.5) * 7 + y * 13) % 5; c.fillStyle = ['#f1faee', '#e63946', '#1d3557', '#a8dadc', '#ffd166'][h]; if ((h + Math.floor(t * 4)) % 7) c.fillRect(x, y, 3, 3); }
    c.fillStyle = '#457b9d'; c.fillRect(0, 32, W, 4);   // the advertising boards
    // the pitch: mown stripes, the touchline, the halfway line and the centre circle (they move with the camera)
    for (let i = -1; i < 10; i++) { const x = i * 32 - (cam % 64); c.fillStyle = (i + Math.floor(cam / 64)) % 2 ? '#2e7d32' : '#388e3c'; c.fillRect(x, 36, 32, H - 36); }
    c.strokeStyle = '#ffffffcc'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 42); c.lineTo(W, 42); c.stroke();
    const half = 200 - cam; c.beginPath(); c.moveTo(half, 42); c.lineTo(half, H); c.stroke(); c.beginPath(); c.ellipse(half, 92, 30, 16, 0, 0, 7); c.stroke();
    // the players: 6 + 6, near the ball, running (a little bob); Madrid white, Barcelona garnet / blue stripes
    for (let i = 0; i < 12; i++) {
      const team = i % 2, px = bx + Math.sin(t * 0.8 + i * 1.7) * (40 + i * 6) - cam, py = 60 + ((i * 37) % 70) + Math.sin(t * 1.3 + i) * 8;
      const bob = Math.abs(Math.sin(t * 9 + i)) * 2;
      if (team === 0) { c.fillStyle = '#ffffff'; c.fillRect(px - 3, py - 9 - bob, 6, 7); c.fillStyle = '#e9e9e9'; c.fillRect(px - 3, py - 2 - bob, 6, 3); }
      else { c.fillStyle = '#a50044'; c.fillRect(px - 3, py - 9 - bob, 6, 7); c.fillStyle = '#004d98'; c.fillRect(px - 1, py - 9 - bob, 2, 7); c.fillStyle = '#004d98'; c.fillRect(px - 3, py - 2 - bob, 6, 3); }
      c.fillStyle = '#e0ac69'; c.fillRect(px - 2, py - 13 - bob, 4, 4);                      // head
      c.fillStyle = '#222'; c.fillRect(px - 3, py + 1 - bob, 2, 3); c.fillRect(px + 1, py + 1 - bob, 2, 3);   // legs
    }
    const by = 104 + Math.sin(t * 2.3) * 22 - Math.abs(Math.sin(t * 3.1)) * 10;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(W / 2, by, 3, 0, 7); c.fill();
    // the score and the clock (top left), the channel's logo (top right)
    const [a, b] = score(t), mins = 60 + Math.floor((t % 160) / 160 * 30), secs = Math.floor((t * 7) % 60);
    c.fillStyle = '#0b1d3a'; c.fillRect(6, 5, 132, 15); c.fillStyle = '#fff'; c.fillRect(6, 5, 4, 15); c.fillStyle = '#a50044'; c.fillRect(134, 5, 4, 15);
    c.fillStyle = '#fff'; c.font = 'bold 10px sans-serif'; c.textAlign = 'left'; c.fillText(`RMA ${a} – ${b} BAR`, 14, 16);
    c.fillStyle = '#ffd166'; c.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 104, 16);
    c.fillStyle = '#ffffffaa'; c.font = 'bold 9px sans-serif'; c.textAlign = 'right'; c.fillText('SPORT ÉLŐ', W - 6, 14);
    if (goalNow(t)) { c.fillStyle = '#000000aa'; c.fillRect(0, 60, W, 34); c.fillStyle = '#ffd166'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText('GÓÓÓL!', W / 2, 86); }
  };
  const console_ = (c, t) => {
    if (t < 2.5) {   // the start: black, a green orb growing, the name
      c.fillStyle = '#000'; c.fillRect(0, 0, 256, 144);
      const r = Math.min(1, t / 1.2) * 26; const gr = c.createRadialGradient(128, 66, 2, 128, 66, r + 1); gr.addColorStop(0, '#d8ffd0'); gr.addColorStop(0.5, '#3fbf3f'); gr.addColorStop(1, '#0b3d0b');
      c.fillStyle = gr; c.beginPath(); c.arc(128, 66, r, 0, 7); c.fill();
      if (t > 1.3) { c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('XBOX', 128, 118); }
      return;
    }
    if (t < 4.5) {   // the home screen: tiles
      c.fillStyle = '#107c10'; c.fillRect(0, 0, 256, 144);
      const tiles = ['#1e88e5', '#e53935', '#fdd835', '#8e24aa', '#00897b', '#f4511e'];
      tiles.forEach((col, i) => { c.fillStyle = col; c.fillRect(16 + (i % 3) * 78, 30 + Math.floor(i / 3) * 52, 70, 44); });
      c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'left'; c.fillText('Szia, Petyus!', 16, 20); c.fillText('FOCI 25', 22, 66);
      return;
    }
    // the game: a football pitch from above, two teams, the ball, the score
    const k = t - 4.5;
    c.fillStyle = '#2e7d32'; c.fillRect(0, 0, 256, 144);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#2e7d32' : '#338a37'; c.fillRect(i * 32, 0, 32, 144); }
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(8, 8, 240, 128); c.beginPath(); c.moveTo(128, 8); c.lineTo(128, 136); c.stroke(); c.beginPath(); c.arc(128, 72, 18, 0, 7); c.stroke();
    c.strokeRect(8, 46, 22, 52); c.strokeRect(226, 46, 22, 52);
    const ballX = 128 + Math.sin(k * 0.9) * 95, ballY = 72 + Math.sin(k * 1.7) * 45;
    for (let i = 0; i < 5; i++) {
      const hx = 60 + i * 14 + Math.sin(k + i) * 20, hy = 30 + i * 22, ax = 196 - i * 14 + Math.cos(k * 1.1 + i) * 20, ay = 112 - i * 22;
      c.fillStyle = '#e53935'; c.beginPath(); c.arc(hx + (ballX - hx) * 0.15, hy + (ballY - hy) * 0.15, 4, 0, 7); c.fill();
      c.fillStyle = '#1e88e5'; c.beginPath(); c.arc(ax + (ballX - ax) * 0.15, ay + (ballY - ay) * 0.15, 4, 0, 7); c.fill();
    }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ballX, ballY, 3, 0, 7); c.fill();
    c.fillStyle = '#000000aa'; c.fillRect(96, 0, 64, 14); c.fillStyle = '#fff'; c.font = 'bold 11px monospace'; c.textAlign = 'center';
    c.fillText(`${Math.floor(k / 9) % 4} - ${Math.floor(k / 13) % 3}`, 128, 11);
  };
  const draw = () => {
    const c = scr.ctx;
    if (!st.on) { c.fillStyle = '#0c0f14'; c.fillRect(0, 0, 256, 144); }
    else if (xb.on) console_(c, xb.t); else match(c, st.t);
    scr.tex.needsUpdate = true;
  };
  draw();
  const front = toWorld(grp, 0, 0, 0.75); front.y -= FY;
  devices.push({ aim: loc(grp, -0.025, 0.95, -0.02), size: 0.4, x: front.x, z: front.z, r: 1.0, label: () => (st.on ? 'E – tévé kikapcsolása' : 'E – tévé bekapcsolása'),
    use: () => { st.on = !st.on; st.t = 0; st.goal = -1; click(); draw(); if (st.on && !xb.on) say({ headWorld: (o) => o.copy(toWorld(grp, 0, 1.4, 0)) }, 'Real Madrid – Barcelona, élőben!', 2.4); },
    update: (dt) => {
      xlogo.material.opacity = xb.on ? 1 : 0.12; cbtn.material.opacity = xb.on ? 0.95 : 0.12;
      if (xb.on) xb.t += dt;
      if (!st.on) return; st.t += dt; if ((st.frame -= dt) <= 0) { st.frame = 1 / 12; draw(); }
      { const g = !xb.on && goalNow(st.t); if (g && st.goal !== g[0] + Math.floor(st.t / 160) * 1000) {   // a goal: the crowd roars
        st.goal = g[0] + Math.floor(st.t / 160) * 1000; noise(2.4, 800, 0.3, 0.12); noise(1.6, 1600, 0.5, 0.05, 0.3);
        say({ headWorld: (o) => o.copy(toWorld(grp, 0, 1.4, 0)) }, 'GÓÓÓL!', 1.8); } }
      if ((st.sndT -= dt) <= 0) {
        st.sndT = 0.6;
        if (!xb.on || xb.t > 4.5) noise(0.7, 700 + R() * 300, 0.4, 0.025);   // the crowd
        if (!xb.on && R() < 0.06) tone('square', 2900, 2700, 0.25, 0.02);       // the referee's whistle now and then
      }
    } });
  // the console: its own button (E next to it); the start chime; the TV shows it when both are on
  fx.tv = { grp, controller: ctl.c, xboxOn: () => xb.on };
  const xf = toWorld(grp, 0.6, 0, 0.6); xf.y -= FY;
  devices.push({ aim: loc(grp, 0.6, 0.65, -0.05), x: xf.x, z: xf.z, r: 0.6, label: () => (xb.on ? 'E – Xbox kikapcsolása' : 'E – Xbox bekapcsolása'),
    use: () => {
      xb.on = !xb.on; xb.t = 0; click();
      if (xb.on) { for (const [f, d] of [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36]]) tone('sine', f, f, 0.6, 0.04, d); if (!st.on) { st.on = true; st.t = 0; } }   // the TV comes on with it
      draw();
    } });
}

// ---------------------------------------------------------------- Petyus's computer (on his desk): monitor, keyboard, mouse, speakers, webcam, tower
function buildComputer(x, z, rot) {
  const s = 0.0125, grp = group(x, z, rot), D = 0x1c1e22, D2 = 0x2c2f33, KEY = 0x4a4f57, KEYT = 0x6b7078;
  fx.desk = grp;
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
  devices.push({ aim: loc(grp, 0, 1.07, -0.13), size: 0.25, x: front.x, z: front.z, r: 0.8, label: () => (st.on ? 'E – számítógép kikapcsolása' : 'E – számítógép bekapcsolása'),
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
  buildScooterCorner(15.2, 3.72);   // Petyus's scooter and helmet, between the wardrobe and the east wall
  buildCooktop(7.6, 0.31, 0, 0.93);
  fx.sinkTap = buildTap(8.6, 0.31, 0, 0, 'mosogatócsap', 0.36, { x: 0, z: 0.65, r: 0.7 }); devices[devices.length - 1].aim = new V3(8.6, 1.0, 0.2);
  { const t = homeRoot.children[homeRoot.children.length - 1]; t.children[0].position.set(0, 1.15, -0.1); }   // the kitchen jet: from the spout into the basin
  buildTap(0.4, 1.15, E, 0, 'kádcsap', 0.42, { x: -0.7, z: 0.65, r: 0.5 }); devices[devices.length - 1].aim = new V3(0.4, 0.65, 1.88);
  { const t = homeRoot.children[homeRoot.children.length - 1]; t.children[0].position.set(-0.72, 0.72, 0); }   // the bath jet (the tap's end, in the bath's frame)
  buildShowerWater(0.2, 1.4, 1.74);
  buildWasher(1.45, 0.33, 0);
  buildTV(8.3, 8.95, P);
  buildArmchair(8.3, 7.35, 0);   // facing the TV (south)
  buildComputer(15.28, 1.45, W);
}
export function updateAppliances(dt) { for (const d of devices) if (d.update) d.update(dt); }
