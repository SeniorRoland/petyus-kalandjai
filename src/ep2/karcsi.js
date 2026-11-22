// Petyus kalandjai – 2. rész: Karcsi, a tengerimalac. Petyus szobájában, az északi ablak előtti asztalon egy nagy kalitka:
// alom, kis faház (ajtaja a kalitka közepe felé néz), etető- és itatótál, répa, nyitható kalitkaajtó (E).
// Karcsi vöröses, fehér foltokkal; félénk: ha valaki a kalitka közelébe jön, a házába bújik, és csak kikukucskál az ajtón;
// ha senki sincs a közelben, körbe-körbe mászkál, és időnként megáll a répánál enni.
// Coordinates: the flat's own frame (homeRoot, y from the flat's floor).
import * as THREE from 'three';
import { G } from '../state.js';
import { say } from '../ui.js';
import { clamp, damp, dampAngle } from '../util.js';
import { partMesh } from '../world.js';
import { FY, homeRoot } from './home.js';

// the table (home.js puts a desk here) and the cage on it
export const CAGE = { x: 14.3, z: 0.32, w: 1.0, d: 0.46, y: 0.77, h: 0.48 };
const FLOOR_Y = CAGE.y + 0.125;                   // the top of the bedding (on the tray)
const HOUSE = { x: CAGE.x - 0.34, z: CAGE.z };    // the little house (west end), door towards +x
const CARROT = { x: CAGE.x + 0.12, z: CAGE.z + 0.12 };
const SHY_R = 1.5;                                // closer than this → into the house

const cage = { door: null, open: false, t: 0 };
let pig = null, head = null;
const st = { x: CAGE.x + 0.15, z: CAGE.z - 0.08, h: 0, ang: 0, mode: 'walk', t: 0, lap: 0, eatT: 0, hideT: 0, peek: 0, greeted: false };

function buildCage() {
  const x0 = CAGE.x - CAGE.w / 2, x1 = CAGE.x + CAGE.w / 2, z0 = CAGE.z - CAGE.d / 2, z1 = CAGE.z + CAGE.d / 2, y = CAGE.y, top = y + CAGE.h;
  homeRoot.add(partMesh((b) => {
    // plastic tray, bedding (hay), wire bars, the top grid
    b.bx(CAGE.x, y, CAGE.z, CAGE.w, 0.12, CAGE.d, 0x3a86ff, 0, 0.02);
    b.bx(CAGE.x, y + 0.1, CAGE.z, CAGE.w - 0.03, 0.025, CAGE.d - 0.03, 0xe7d08a, 0, 0.06);
    const bar = (x, z) => b.bx(x, y + 0.12, z, 0.008, CAGE.h - 0.12, 0.008, 0xd0d4d8, 0, 0);
    for (let x = x0; x <= x1 + 1e-3; x += 0.04) { bar(x, z0); if (x < CAGE.x - 0.02 || x > CAGE.x + 0.3) bar(x, z1); }   // the door's gap on the front
    for (let z = z0; z <= z1 + 1e-3; z += 0.04) { bar(x0, z); bar(x1, z); }
    for (let x = x0; x <= x1 + 1e-3; x += 0.05) b.bx(x, top, CAGE.z, 0.008, 0.008, CAGE.d, 0xd0d4d8, 0, 0);
    for (let z = z0; z <= z1 + 1e-3; z += 0.05) b.bx(CAGE.x, top, z, CAGE.w, 0.008, 0.008, 0xd0d4d8, 0, 0);
    for (const yy of [y + 0.12, top]) { b.bx(CAGE.x, yy, z0, CAGE.w, 0.012, 0.012, 0xb8bcc0, 0, 0); b.bx(CAGE.x, yy, z1, CAGE.w, 0.012, 0.012, 0xb8bcc0, 0, 0); }
    // the little wooden house: a door hole towards +x, a sloped roof
    const hx = HOUSE.x, hz = HOUSE.z, fy = FLOOR_Y;
    b.bx(hx, fy, hz - 0.1, 0.26, 0.17, 0.02, 0xb5793f, 0, 0.03); b.bx(hx, fy, hz + 0.1, 0.26, 0.17, 0.02, 0xb5793f, 0, 0.03);
    b.bx(hx - 0.12, fy, hz, 0.02, 0.17, 0.2, 0xa86c35, 0, 0.03);
    b.bx(hx + 0.12, fy + 0.12, hz, 0.02, 0.05, 0.2, 0xa86c35, 0, 0.03);
    b.bx(hx + 0.12, fy, hz - 0.075, 0.02, 0.12, 0.05, 0xa86c35, 0, 0.03); b.bx(hx + 0.12, fy, hz + 0.075, 0.02, 0.12, 0.05, 0xa86c35, 0, 0.03);
    b.bx(hx, fy + 0.17, hz, 0.3, 0.025, 0.24, 0x7a4a24, 0, 0); b.bx(hx, fy + 0.195, hz, 0.24, 0.02, 0.18, 0x8a5a2e, 0, 0);
    // food bowl (pellets), water bowl, the carrot, a few hay strands
    b.bx(CAGE.x + 0.38, fy, CAGE.z - 0.12, 0.11, 0.04, 0.11, 0xe07a3a, 0, 0); b.bx(CAGE.x + 0.38, fy + 0.04, CAGE.z - 0.12, 0.08, 0.01, 0.08, 0x9a7b4f, 0, 0.1);
    b.bx(CAGE.x + 0.38, fy, CAGE.z + 0.08, 0.11, 0.04, 0.11, 0x4f8fd6, 0, 0); b.bx(CAGE.x + 0.38, fy + 0.04, CAGE.z + 0.08, 0.08, 0.008, 0.08, 0xa9d8ee, 0, 0);
    b.bx(CARROT.x, fy, CARROT.z, 0.13, 0.03, 0.03, 0xf08a24, 0, 0); b.bx(CARROT.x - 0.08, fy, CARROT.z, 0.04, 0.04, 0.035, 0x5fae6a, 0, 0);
    for (let k = 0; k < 6; k++) b.bx(CAGE.x - 0.1 + k * 0.05, fy + 0.005, CAGE.z - 0.15 + (k % 3) * 0.04, 0.09, 0.008, 0.01, 0xd9bf6a, k * 0.7, 0);
  }));
  // the cage door (front, hinged at its west edge): bars in a frame, opens outwards
  const door = new THREE.Group(); door.position.set(CAGE.x - 0.02, y + 0.12, z1); homeRoot.add(door);
  door.add(partMesh((b) => {
    const w = 0.32, h = CAGE.h - 0.14;
    for (let x = 0.0; x <= w + 1e-3; x += 0.04) b.bx(x, 0, 0, 0.008, h, 0.008, 0xd0d4d8, 0, 0);
    b.bx(w / 2, 0, 0, w, 0.014, 0.014, 0xb8bcc0, 0, 0); b.bx(w / 2, h, 0, w, 0.014, 0.014, 0xb8bcc0, 0, 0);
    b.bx(w - 0.01, h * 0.5, 0.01, 0.02, 0.05, 0.02, 0x3a86ff, 0, 0);   // the latch
  }));
  cage.door = door;
}

function buildPig() {
  const R = 0xc0622f, W = 0xf6f1e8, D = 0x8a3a1e;   // reddish, white patches
  pig = new THREE.Group(); homeRoot.add(pig);
  pig.add(partMesh((b) => {
    b.bx(0, 0.015, -0.01, 0.13, 0.095, 0.2, R, 0, 0.03);
    b.bx(0.0, 0.065, -0.05, 0.134, 0.05, 0.07, W, 0, 0);    // white saddle
    b.bx(-0.04, 0.02, 0.05, 0.054, 0.06, 0.05, W, 0, 0);    // white patch on the side
    b.bx(0, 0.035, -0.105, 0.11, 0.06, 0.02, D, 0, 0);       // rump
    for (const [x, z] of [[-0.045, 0.06], [0.045, 0.06], [-0.045, -0.07], [0.045, -0.07]]) b.bx(x, 0, z, 0.03, 0.02, 0.035, 0xe9b3a8, 0, 0);
  }));
  head = new THREE.Group(); head.position.set(0, 0.03, 0.09); pig.add(head);
  head.add(partMesh((b) => {
    b.bx(0, 0, 0.035, 0.105, 0.085, 0.075, R, 0, 0.03);
    b.bx(0, 0.035, 0.07, 0.03, 0.05, 0.008, W, 0, 0);       // white blaze
    for (const s of [-1, 1]) { b.bx(s * 0.042, 0.08, 0.02, 0.028, 0.02, 0.022, D, 0, 0); b.bx(s * 0.053, 0.05, 0.045, 0.006, 0.018, 0.018, 0x111111, 0, 0); }
    b.bx(0, 0.025, 0.074, 0.02, 0.014, 0.006, 0xff9aa2, 0, 0);
  }));
  pig.castShadow = true;
}

export function buildKarcsi() { buildCage(); buildPig(); }

// the cage door: E next to the cage (ep2.js)
export const cageFront = () => ({ x: CAGE.x + 0.15, z: CAGE.z + CAGE.d / 2 + 0.25 });
export function cageDoorOpen() { return cage.open; }
export function toggleCageDoor() { cage.open = !cage.open; }

// ---------------------------------------------------------------- behaviour
function moveTo(tx, tz, sp, dt) {
  const dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz);
  if (d < 0.01) return true;
  const k = Math.min(1, sp * dt / d); st.x += dx * k; st.z += dz * k;
  st.h = dampAngle(st.h, Math.atan2(dx, dz), 10, dt);
  return d < 0.02;
}
export function updateKarcsi(dt) {
  if (!pig) return;
  cage.t = damp(cage.t, cage.open ? 1 : 0, 8, dt); cage.door.rotation.y = -cage.t * Math.PI * 0.6;
  // somebody close to the cage?
  let near = 1e9;
  for (const a of [G.petike, G.petya, G.angi]) if (a) near = Math.min(near, Math.hypot(a.pos.x - CAGE.x, a.pos.z - CAGE.z));
  st.t += dt;
  let moving = false, chew = false;
  if (near < SHY_R) {
    // scared: run into the house, then sit just inside the door and peek out
    if (st.mode !== 'hide') { st.mode = 'hide'; st.hideT = 0; }
    st.hideT += dt;
    const inside = { x: HOUSE.x + 0.02, z: HOUSE.z };
    if (st.hideT < 0.1 || Math.hypot(st.x - inside.x, st.z - inside.z) > 0.02) {
      // via the doorway (from the east), quickly
      const atDoor = Math.abs(st.z - HOUSE.z) < 0.03 && st.x < HOUSE.x + 0.215;
      moving = !(atDoor ? moveTo(inside.x, inside.z, 0.9, dt) : moveTo(HOUSE.x + 0.2, HOUSE.z, 0.9, dt));
    } else st.h = dampAngle(st.h, Math.PI / 2, 6, dt);   // facing out of the door (+x)
    if (!st.greeted && G.petike && Math.hypot(G.petike.pos.x - CAGE.x, G.petike.pos.z - CAGE.z) < SHY_R) {
      st.greeted = true; say(G.petike, 'Szia, Karcsi! Ne félj…', 2.4);
    }
  } else {
    if (st.mode === 'hide') { st.mode = 'wait'; st.t = 0; }
    if (st.mode === 'wait') { if (st.t > 1.5) { st.mode = 'walk'; st.ang = 0; } }   // a while before he dares to come out
    else if (st.mode === 'eat') { chew = true; if (st.t > 3.5) { st.mode = 'walk'; st.t = 0; } }
    else {   // round and round the cage (an oval), now and then a stop at the carrot
      st.ang += dt * 0.9;
      const tx = CAGE.x + 0.1 + Math.cos(st.ang) * 0.24, tz = CAGE.z + Math.sin(st.ang) * 0.09;
      moveTo(tx, tz, 0.35, dt); moving = true;
      if (st.ang > Math.PI * 2 * (st.lap + 1)) { st.lap++; if (st.lap % 2 === 1) { st.mode = 'toCarrot'; } }
    }
    if (st.mode === 'toCarrot') { moving = !moveTo(CARROT.x + 0.1, CARROT.z, 0.35, dt); if (!moving) { st.mode = 'eat'; st.t = 0; st.h = -Math.PI / 2; } }
  }
  st.x = clamp(st.x, CAGE.x - CAGE.w / 2 + 0.1, CAGE.x + CAGE.w / 2 - 0.1); st.z = clamp(st.z, CAGE.z - CAGE.d / 2 + 0.08, CAGE.z + CAGE.d / 2 - 0.08);
  const hop = moving ? Math.abs(Math.sin(G.clockT * 16)) * 0.008 : 0;
  pig.position.set(st.x, FLOOR_Y + hop, st.z); pig.rotation.y = st.h;
  head.rotation.x = chew ? 0.25 + Math.sin(G.clockT * 22) * 0.08 : moving ? 0.05 : Math.sin(G.clockT * 1.3) * 0.05;
}
// a wheek: guinea pigs squeal when they hear the fridge (mum at the fridge)
export function wheek() { if (pig) say({ headWorld: (v) => v.set(st.x, FY + FLOOR_Y + 0.35, st.z) }, 'UÍ-UÍ-UÍ!', 1.6, ''); }
