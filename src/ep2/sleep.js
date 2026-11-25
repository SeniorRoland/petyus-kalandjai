// Petyus kalandjai – 2. rész: alvás az ágyban. Egy ágy saját kerettel (a fejvégtől a lábvég felé +x, keresztben z), benne
// hanyatt fekvő szereplők (forgolódnak: oldalra fordulnak; fel tudnak ülni), fölöttük takaró, ami a testük szerint púposodik.
import * as THREE from 'three';
import { R, damp } from '../util.js';
import { homeRoot } from './home.js';

// bed: { x, z } = the middle of the head end (at the headboard), rotY: the frame's turn (0: head to the west, −π/2: head to
// the north), len, width, top: the mattress, colors: the blanket's two stripes
export function makeBed(o) {
  const frame = new THREE.Group(); frame.position.set(o.x, 0, o.z); frame.rotation.y = o.rotY || 0; homeRoot.add(frame);
  return { ...o, frame, sleepers: [], blanket: null };
}
// lay a rig on its back in the bed, `across` from the bed's middle line; the head on the pillow
export function layDown(bed, rig, across, headAt = 0.12) {
  const sc = rig.S ? rig.S.scale.y : 1;
  const wrap = new THREE.Group(); wrap.position.set(0, bed.top + 0.225 * sc, across); bed.frame.add(wrap);   // rolls about the body's axis
  const orient = new THREE.Group(); orient.rotation.y = Math.PI / 2; wrap.add(orient);                       // the body along +x, head first
  rig.root.position.set(0, 0, headAt + rig.height); rig.root.rotation.set(-Math.PI / 2, 0, 0); orient.add(rig.root);
  const s = { rig, wrap, across, sc, headAt, roll: 0, rollTo: 0, sit: 0, sitTo: 0, sitSpd: 2, arms: null };
  bed.sleepers.push(s); pose(s);
  return s;
}
// back out of the bed: the rig goes back to the scene, standing (the caller places it)
export function getUp(bed, s, scene) {
  bed.sleepers.splice(bed.sleepers.indexOf(s), 1);
  scene.add(s.rig.root); s.rig.root.rotation.set(0, 0, 0); s.rig.inner.rotation.set(0, 0, 0); s.rig.inner.position.set(0, 0, 0);
  for (const h of s.rig.hip) h.rotation.set(0, 0, 0);
  bed.frame.remove(s.wrap);
  shapeBlanket(bed);
}
export function removeBed(bed) { homeRoot.remove(bed.frame); }

// sitting up = bending forward at the hips by up to ~85° (the legs stay stretched out under the blanket)
function pose(s) {
  const r = s.rig, th = s.sit * 1.48, h = r.hipH || 0.6;
  r.inner.rotation.set(th, 0, 0); r.inner.position.set(0, h * (1 - Math.cos(th)), -h * Math.sin(th));
  for (const hp of r.hip) hp.rotation.set(-th, 0, 0);
  for (const k of r.knee) k.rotation.set(0, 0, 0);
  if (r.foot) for (const f of r.foot) f.rotation.set(0, 0, 0);
  if (s.arms) s.arms(r); else { r.sh[0].rotation.set(0, 0, -0.05); r.sh[1].rotation.set(0, 0, 0.05); }
  if (r.apply) r.apply();
  s.wrap.rotation.x = -s.roll * (1 - s.sit);
}

export function makeBlanket(bed, c1 = 0x9fc6e8, c2 = 0xf3f6fb) {
  const x0 = bed.headAt0 ?? 0.44, L = bed.len - x0, W = bed.width + 0.16, NX = 30, NZ = Math.max(12, Math.round(W * 14));
  const geo = new THREE.PlaneGeometry(L, W, NX, NZ); geo.rotateX(-Math.PI / 2); geo.translate(x0 + L / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const col = new Float32Array(geo.attributes.position.count * 3), a = new THREE.Color(c1), b = new THREE.Color(c2);
  for (let i = 0; i < geo.attributes.position.count; i++) { const c = Math.floor((base[i * 3] - x0) / 0.18) % 2 ? a : b; col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.castShadow = mesh.receiveShadow = true; bed.frame.add(mesh);
  bed.blanket = { mesh, base, x0 }; shapeBlanket(bed);
}
// the height of the blanket: flat over the mattress, a hump along each body (higher and narrower on the side), sliding down
// to the waist when someone sits up; hanging down over the sides and the foot end
function shapeBlanket(bed) {
  const bl = bed.blanket; if (!bl) return;
  const P = bl.mesh.geometry.attributes.position, b = bl.base, flat = bed.top + 0.08;
  for (let i = 0; i < P.count; i++) {
    const x = b[i * 3], z = b[i * 3 + 2];
    let y = flat;
    for (const s of bed.sleepers) {
      const side = Math.abs(Math.sin(s.roll)) * (1 - s.sit);
      const zc = s.across + Math.sin(s.roll) * 0.1 * (1 - s.sit), w = (0.36 - side * 0.06) * Math.max(0.75, s.sc * 1.1), top = bed.top + (0.415 + side * 0.1) * s.sc;
      const start = s.headAt + 0.38 * s.sc + s.sit * 0.55 * s.sc + 0.08, k = (x - start) / 0.16;
      const along = Math.min(1, k) * (x > start + 0.9 ? Math.max(0, 1 - (x - start - 0.9) * 0.45) : 1);
      const dz = (z - zc) / w;
      y = Math.max(y, flat + (top - flat) * Math.exp(-dz * dz) * Math.max(0, along));
    }
    const over = Math.abs(z) - bed.width / 2;
    if (over > 0) y = Math.min(y, bed.top + 0.04 - over * 2.2);
    if (x > bed.len - 0.02) y -= (x - bed.len + 0.02) * 2;
    P.setY(i, y);
  }
  P.needsUpdate = true; bl.mesh.geometry.computeVertexNormals();
}

// every frame: rolls and sitting up glide; the blanket follows. tossing: turn over now and then by itself
export function updateBed(bed, dt) {
  let moved = false;
  for (const s of bed.sleepers) {
    if (s.toss) { s.tossT = (s.tossT ?? R(4, 8)) - dt; if (s.tossT <= 0) { s.tossT = R(7, 14); const o = [0, 1.25, -1.25].filter((a) => Math.abs(a - s.rollTo) > 0.1); s.rollTo = o[Math.floor(Math.random() * o.length)]; if (s.onToss) s.onToss(s); } }
    const r0 = s.roll, s0 = s.sit;
    s.roll = damp(s.roll, s.rollTo, 2.2, dt); s.sit = damp(s.sit, s.sitTo, s.sitSpd, dt);
    if (Math.abs(s.roll - r0) > 1e-4 || Math.abs(s.sit - s0) > 1e-4 || s.arms) { pose(s); moved = true; }
  }
  if (moved) shapeBlanket(bed);
}
