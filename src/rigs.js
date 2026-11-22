// Petyus kalandjai – rigs: Karakter-rigek: skinnelt (Mixamo-csontnevű) és régi felosztós modellek, NPC-k.
import * as THREE from 'three';
import { V3, pick, rand } from './util.js';
import { partMesh } from './world.js';

// ---------------------------------------------------------------- character rigs
// double-sided: where a joint opens up when a limb turns, the inside of the shell shows instead of a see-through hole
const charMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
function makeRigShell(scale) {
  const root = new THREE.Group(); const inner = new THREE.Group(); const S = new THREE.Group();
  S.scale.setScalar(scale); root.add(inner); inner.add(S);
  return { root, inner, S, hip: [], knee: [], sh: [] };
}
export const CFG = {
  petya:  { scale: 0.93, hipY: 0.758, kneeY: 0.361, split: 0, armX: [-0.345, 0.345], armY: [0.77, 1.42] },
  angi:   { scale: 0.86, hipY: 0.598, kneeY: 0.281, split: 0, armX: [-0.265, 0.265], armY: [0.95, 1.6] },
  foci:   { scale: 0.833, hipY: 0.398, kneeY: 0.201, split: 0, armX: [-0.265, 0.265], armY: [0.58, 1.27] },
  roller: { scale: 1.14, hipY: 0.56, hipPivot: 0.53, kneeY: -1, split: 0.085, armX: [-0.06, 0.22], armY: [0.5, 0.95], perMesh: true },
};
// Rigged (skinned, T-pose, Mixamo bone names) character → same rig interface as the voxel-split one.
// hip/knee are the leg bones; sh[] are proxies with the old "hanging arm" meaning, applied on top of a base
// rotation that brings the T-pose arms down to the body.
function rigFromSkinned(gltf, cfg) {
  const rig = makeRigShell(cfg.scale); const model = gltf.scene; rig.S.add(model);
  let sm = null;
  model.traverse((o) => { if (o.isMesh) { o.material = charMat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.isSkinnedMesh) sm = o; } });
  rigidArms(sm);
  const bone = (n) => { const b = sm.skeleton.bones.find((x) => x.name.replace(/^mixamorig:?/, '') === n); if (!b) throw new Error('Hiányzó csont: ' + n); return b; };
  rig.hip = [bone('RightUpLeg'), bone('LeftUpLeg')]; rig.knee = [bone('RightLeg'), bone('LeftLeg')]; rig.foot = [bone('RightFoot'), bone('LeftFoot')];
  rig.armBones = [bone('RightArm'), bone('LeftArm')]; rig.foreBones = [bone('RightForeArm'), bone('LeftForeArm')];
  rig.handBones = [bone('RightHand'), bone('LeftHand')];
  rig.armBase = [1.5, -1.5];                      // T-pose → arms down (slightly away from the body)
  liftShoulders(sm, rig, bone('Neck'));
  rig.sh = [new THREE.Object3D(), new THREE.Object3D()];
  rig.elbow = [0, 0];                              // optional elbow bend (radians, forward)
  rig.apply = () => {
    for (let i = 0; i < 2; i++) {
      const p = rig.sh[i].rotation; rig.armBones[i].rotation.set(p.x, p.y, p.z + rig.armBase[i]);
      rig.foreBones[i].rotation.set(0, (i === 0 ? 1 : -1) * rig.elbow[i], 0);
    }
  };
  rig.skinned = true;
  rig.root.updateMatrixWorld(true);
  const hp = new V3(); rig.hip[0].getWorldPosition(hp); rig.hipH = hp.y;
  rig.knee[0].getWorldPosition(hp); rig.kneeH = hp.y;   // standing knee height ≈ shin + foot length (used for sitting)
  rig.height = new THREE.Box3().setFromObject(rig.root).max.y;
  return rig;
}
// The models blend the joint rings 50/50 between two bones (shoulder: Arm + Spine2, elbow: Arm + ForeArm). The arms always
// turn far (≈ 1.5 rad down from the T-pose, more when pointing), and a 50/50 ring then collapses: the upper arm's faces fold
// over, turn their back to the camera and vanish. Fix: every triangle of an arm moves with one bone only – the one with the
// most weight on its three corners (the mesh is split per triangle for that).
function rigidArms(sm) {
  let g = sm.geometry; if (g.index) g = g.toNonIndexed();
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, names = sm.skeleton.bones.map((b) => b.name.replace(/^mixamorig:?/, ''));
  const arm = new Set(names.map((n, i) => (/Arm|Hand|Shoulder/.test(n) ? i : -1)).filter((i) => i >= 0));
  const sum = new Map();
  for (let t = 0; t < si.count; t += 3) {
    sum.clear(); let isArm = false;
    for (let v = t; v < t + 3; v++) for (let c = 0; c < 4; c++) {
      const w = sw.getComponent(v, c); if (w <= 0.001) continue;
      const b = si.getComponent(v, c); sum.set(b, (sum.get(b) || 0) + w); if (arm.has(b)) isArm = true;
    }
    if (!isArm) continue;
    let best = -1, bw = -1; for (const [b, w] of sum) if (w > bw + 1e-6) { bw = w; best = b; }
    for (let v = t; v < t + 3; v++) { si.setXYZW(v, best, 0, 0, 0); sw.setXYZW(v, 1, 0, 0, 0); }
  }
  si.needsUpdate = true; sw.needsUpdate = true;
  if (g !== sm.geometry) { sm.geometry.dispose(); sm.geometry = g; }
  capArms(sm, arm, names);
}
// The voxel shell is open where an arm meets the body (those faces were inside the T-pose model). With the arm down, the
// open end shows: you can look into the hollow arm from above, and into the body's side. Two caps per side close them:
// one on the arm's end (moves with the arm), one on the body's side (moves with the chest), each in its own colour.
function capArms(sm, arm, names) {
  const g = sm.geometry, P = g.attributes.position, C = g.attributes.color, si = g.attributes.skinIndex;
  const caps = [];
  for (const side of [1, -1]) {
    // the arm's root ring: the innermost arm vertices on this side; the cross-section and colour around it
    let ring = 1e9, armBone = -1;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i) * side; if (x > 0.05 && arm.has(si.getX(i)) && /(Left|Right)Arm$/.test(names[si.getX(i)]) && x < ring) { ring = x; armBone = si.getX(i); } }
    if (armBone < 0) continue;
    let y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9, ac = [0, 0, 0], an = 0, bodyBone = -1, bc = [0, 0, 0], bn = 0;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) * side, b = si.getX(i);
      if (b === armBone && x < ring + 0.06) { y0 = Math.min(y0, P.getY(i)); y1 = Math.max(y1, P.getY(i)); z0 = Math.min(z0, P.getZ(i)); z1 = Math.max(z1, P.getZ(i)); if (C) { ac[0] += C.getX(i); ac[1] += C.getY(i); ac[2] += C.getZ(i); } an++; }
      else if (!arm.has(b) && Math.abs(x - ring) < 0.03) { bodyBone = b; if (C) { bc[0] += C.getX(i); bc[1] += C.getY(i); bc[2] += C.getZ(i); } bn++; }
    }
    if (!an) continue;
    // the winding must agree with the normal (this order faces +x): a reversed one would be lit from below (greenish)
    const quad = (x, nx, bone, col) => { const v = [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z0], [x, y1, z1], [x, y0, z1]]; caps.push({ v: nx > 0 ? v : v.reverse(), n: [nx, 0, 0], bone, col }); };
    quad(side * (ring + 0.006), -side, armBone, ac.map((c) => c / an));
    if (bodyBone >= 0) quad(side * (ring - 0.006), side, bodyBone, bn ? bc.map((c) => c / bn) : ac.map((c) => c / an));
  }
  if (!caps.length) return;
  // append the cap triangles to every attribute (unknown ones get zeros)
  const add = caps.length * 6, n0 = P.count;
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name], arr = new a.array.constructor((n0 + add) * a.itemSize); arr.set(a.array);
    const na = new THREE.BufferAttribute(arr, a.itemSize, a.normalized);
    let k = n0;
    for (const c of caps) for (const v of c.v) {
      if (name === 'position') na.setXYZ(k, v[0], v[1], v[2]);
      else if (name === 'normal') na.setXYZ(k, c.n[0], c.n[1], c.n[2]);
      else if (name === 'color') { if (a.itemSize === 4) na.setXYZW(k, c.col[0], c.col[1], c.col[2], 1); else na.setXYZ(k, c.col[0], c.col[1], c.col[2]); }
      else if (name === 'skinIndex') na.setXYZW(k, c.bone, 0, 0, 0);
      else if (name === 'skinWeight') na.setXYZW(k, 1, 0, 0, 0);
      k++;
    }
    g.setAttribute(name, na);
  }
  g.computeBoundingSphere();
}
// Some models (Petya) have the arm's pivot well below the shoulder line: hanging down, the arm's top is ~12 cm under the top
// of the shoulders, so it looks (and swings) as if it came out of the chest. The arm bone is raised until the hanging arm's
// top meets the shoulder line (just under the neck); a model that already fits (Angi) is left alone.
function liftShoulders(sm, rig, neck) {
  sm.updateMatrixWorld(true);
  const toMesh = (b) => new THREE.Vector3().setFromMatrixPosition(sm.skeleton.boneInverses[sm.skeleton.bones.indexOf(b)].clone().invert());
  const neckY = toMesh(neck).y, P = sm.geometry.attributes.position, si = sm.geometry.attributes.skinIndex;
  for (const ab of rig.armBones) {
    const a = toMesh(ab), side = Math.sign(a.x), bi = sm.skeleton.bones.indexOf(ab);
    let ring = 1e9; for (let i = 0; i < P.count; i++) if (si.getX(i) === bi) ring = Math.min(ring, P.getX(i) * side);
    const top = a.y + (a.x * side - ring);          // the hanging arm's top: pivot + the stub between the ring and the pivot
    const dy = neckY - 0.03 - top;
    if (dy < 0.02) continue;
    const w = new THREE.Vector3(); ab.getWorldPosition(w);
    const up = sm.localToWorld(new THREE.Vector3(0, dy, 0)).sub(sm.localToWorld(new THREE.Vector3()));
    ab.position.copy(ab.parent.worldToLocal(w.add(up)));
    ab.updateMatrixWorld(true);
  }
}
export function rigFromGLTF(gltf, cfg) {
  let isSkinned = false; gltf.scene.traverse((o) => { if (o.isSkinnedMesh) isSkinned = true; });
  if (isSkinned) return rigFromSkinned(gltf, cfg);
  const src = gltf.scene; src.updateMatrixWorld(true);
  const names = ['body', 'armR', 'armL', 'thighR', 'thighL', 'shinR', 'shinL'];
  const parts = {}; for (const n of names) parts[n] = { p: [], n: [], c: [], min: new V3(1e9, 1e9, 1e9), max: new V3(-1e9, -1e9, -1e9) };
  const classify = (x, y) => {
    if (y < cfg.hipY) { const s = x < cfg.split ? 'R' : 'L'; return (y < cfg.kneeY ? 'shin' : 'thigh') + s; }
    if (y >= cfg.armY[0] && y <= cfg.armY[1]) { if (x < cfg.armX[0]) return 'armR'; if (x > cfg.armX[1]) return 'armL'; }
    return 'body';
  };
  const a = new V3(), b = new V3(), c = new V3(), n = new V3(), e1 = new V3(), e2 = new V3();
  const nm = new THREE.Matrix3(); const col = new THREE.Color(); const white = new THREE.Color(1, 1, 1);
  src.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, ca = g.attributes.color, idx = g.index;
    nm.getNormalMatrix(o.matrixWorld);
    const mc = (o.material && o.material.color) || white;
    let meshPart = null;
    if (cfg.perMesh) { g.computeBoundingBox(); const bb = g.boundingBox.clone().applyMatrix4(o.matrixWorld); const ce = bb.getCenter(new V3()); meshPart = classify(ce.x, ce.y); }
    const tc = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < tc; t++) {
      const ids = idx ? [idx.getX(t * 3), idx.getX(t * 3 + 1), idx.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2];
      a.fromBufferAttribute(pos, ids[0]).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, ids[1]).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(pos, ids[2]).applyMatrix4(o.matrixWorld);
      const part = parts[meshPart || classify((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)];
      if (!nor) { e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2).normalize(); }
      [a, b, c].forEach((v, k) => {
        part.p.push(v.x, v.y, v.z); part.min.min(v); part.max.max(v);
        if (nor) { n.fromBufferAttribute(nor, ids[k]).applyMatrix3(nm).normalize(); }
        part.n.push(n.x, n.y, n.z);
        if (ca) col.setRGB(ca.getX(ids[k]), ca.getY(ids[k]), ca.getZ(ids[k])).multiply(mc); else col.copy(mc);
        part.c.push(col.r, col.g, col.b);
      });
    }
  });
  const center = (p) => p.p.length ? p.min.clone().add(p.max).multiplyScalar(0.5) : new V3();
  const cR = center(parts.thighR), cL = center(parts.thighL);
  const off = new V3((cR.x + cL.x) / 2, 0, (cR.z + cL.z) / 2);
  const rig = makeRigShell(cfg.scale);
  const mk = (part, pivot) => {
    const g = new THREE.BufferGeometry(); const P = part.p.slice();
    const ox = pivot === zero ? off.x : 0, oz = pivot === zero ? off.z : 0; // limbs live in pivot space, only the body is re-centred
    for (let i = 0; i < P.length; i += 3) { P[i] -= pivot.x + ox; P[i + 1] -= pivot.y; P[i + 2] -= pivot.z + oz; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(part.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(part.c, 3));
    const m = new THREE.Mesh(g, charMat); m.castShadow = true; m.receiveShadow = true; return m;
  };
  const zero = new V3();
  rig.S.add(mk(parts.body, zero));
  const hipPY = cfg.hipPivot ?? cfg.hipY;
  for (const s of ['R', 'L']) {
    const th = parts['thigh' + s], sh = parts['shin' + s], arm = parts['arm' + s];
    const ct = center(th); const hipP = new V3(ct.x, hipPY, ct.z);
    const hip = new THREE.Group(); hip.position.set(hipP.x - off.x, hipP.y, hipP.z - off.z); rig.S.add(hip);
    hip.add(mk(th, hipP));
    const knee = new THREE.Group();
    if (sh.p.length) { const cs = center(sh); const kP = new V3(cs.x, cfg.kneeY, cs.z); knee.position.set(kP.x - hipP.x, kP.y - hipP.y, kP.z - hipP.z); knee.add(mk(sh, kP)); }
    hip.add(knee);
    const shoulder = new THREE.Group();
    if (arm.p.length) { const ca = center(arm); const sP = new V3(ca.x, arm.max.y - 0.06, ca.z); shoulder.position.set(sP.x - off.x, sP.y, sP.z - off.z); shoulder.add(mk(arm, sP)); }
    rig.S.add(shoulder);
    rig.hip.push(hip); rig.knee.push(knee); rig.sh.push(shoulder);
  }
  rig.hipH = hipPY * cfg.scale;
  let maxY = 0; for (const k in parts) if (parts[k].p.length) maxY = Math.max(maxY, parts[k].max.y);
  rig.height = maxY * cfg.scale;
  return rig;
}

// procedural voxel people for NPCs
const SKINS = [0xf1c9a5, 0xe0ac84, 0xc68863, 0x8d5a3b, 0xf5d6c0];
const HAIRS = [0x2b1d14, 0x5a3825, 0x8a5a2b, 0xd8b45c, 0x1a1a1a, 0xb0b0b0, 0xe8e8e8, 0xa0402a];
const SHIRTS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x6a4c93, 0xffffff, 0x8ac926, 0xff70a6, 0x1d3557, 0xffca3a];
const PANTS = [0x264653, 0x3d405b, 0x6b705c, 0x1d3557, 0x5e503f, 0x22223b, 0x8d99ae];
export function makePerson(o = {}) {
  const rig = makeRigShell(o.scale || 1);
  const skin = o.skin ?? pick(SKINS), hair = o.hair ?? pick(HAIRS), shirt = o.shirt ?? pick(SHIRTS), pants = o.pants ?? pick(PANTS), shoe = o.shoe ?? pick([0x222222, 0xffffff, 0x6b4226, 0xe63946]);
  const dress = o.dress ?? rand() < 0.3;
  const body = partMesh((b) => {
    b.bx(0, 0.74, 0, 0.42, 0.14, 0.24, dress ? shirt : pants, 0, 0);
    b.bx(0, 0.86, 0, 0.44, 0.52, 0.25, shirt, 0, 0);
    if (dress) b.bx(0, 0.5, 0, 0.5, 0.36, 0.3, shirt, 0, 0);
    b.bx(0, 1.38, 0, 0.14, 0.06, 0.14, skin, 0, 0);
    b.bx(0, 1.42, 0, 0.32, 0.32, 0.3, skin, 0, 0);
    b.bx(0, 1.7, -0.01, 0.34, 0.1, 0.33, hair, 0, 0);
    b.bx(0, 1.5, -0.13, 0.34, 0.24, 0.08, hair, 0, 0);
    if (o.longHair ?? rand() < 0.4) b.bx(0, 1.12, -0.15, 0.34, 0.5, 0.08, hair, 0, 0);
    b.bx(-0.07, 1.55, 0.151, 0.05, 0.05, 0.02, 0x222222, 0, 0); b.bx(0.07, 1.55, 0.151, 0.05, 0.05, 0.02, 0x222222, 0, 0);
    b.bx(0, 1.47, 0.151, 0.1, 0.03, 0.02, 0xb5544a, 0, 0);
    if (o.hat ?? rand() < 0.2) { const hc = o.hatColor ?? pick([0x3d405b, 0xe63946, 0xf4a261, 0xffffff]); b.bx(0, 1.74, 0, 0.38, 0.14, 0.36, hc, 0, 0); b.bx(0, 1.74, 0.2, 0.32, 0.04, 0.16, hc, 0, 0); }
    if (o.glasses) { b.bx(0, 1.55, 0.16, 0.26, 0.03, 0.02, 0x222222, 0, 0); }
  });
  rig.S.add(body);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.11, 0.8, 0); rig.S.add(hip);
    hip.add(partMesh((b) => b.bx(0, -0.4, 0, 0.17, 0.4, 0.2, dress ? skin : pants, 0, 0)));
    const knee = new THREE.Group(); knee.position.set(0, -0.4, 0); hip.add(knee);
    knee.add(partMesh((b) => { b.bx(0, -0.32, 0, 0.16, 0.32, 0.19, dress ? skin : pants, 0, 0); b.bx(0, -0.4, 0.03, 0.18, 0.08, 0.26, shoe, 0, 0); }));
    const sh = new THREE.Group(); sh.position.set(s * 0.29, 1.32, 0); rig.S.add(sh);
    sh.add(partMesh((b) => { b.bx(0, -0.22, 0, 0.13, 0.26, 0.15, shirt, 0, 0); b.bx(0, -0.5, 0, 0.12, 0.28, 0.13, skin, 0, 0); }));
    rig.hip.push(hip); rig.knee.push(knee); rig.sh.push(sh);
  }
  // order: [R, L] where R = -x
  rig.hipH = 0.8 * (o.scale || 1); rig.height = 1.8 * (o.scale || 1);
  return rig;
}

export function resetPose(r) {
  for (const g of [...r.hip, ...r.knee, ...r.sh]) g.rotation.set(0, 0, 0);
  if (r.elbow) r.elbow[0] = r.elbow[1] = 0;
  r.inner.position.set(0, 0, 0); r.inner.rotation.set(0, 0, 0);
}
export function animWalk(r, phase, amt, swing = 0.6) {
  if (amt < 0.001) return;
  const s = Math.sin(phase);
  r.hip[0].rotation.x = s * swing * amt; r.hip[1].rotation.x = -s * swing * amt;
  r.knee[0].rotation.x = Math.max(0, Math.sin(phase + 1.7)) * 0.9 * amt;
  r.knee[1].rotation.x = Math.max(0, Math.sin(phase + Math.PI + 1.7)) * 0.9 * amt;
  r.sh[0].rotation.x = -s * swing * 0.8 * amt; r.sh[1].rotation.x = s * swing * 0.8 * amt;
  r.inner.position.y = Math.abs(Math.cos(phase)) * 0.045 * amt;
}

// Seated knee bend: the thigh is horizontal (knee ≈ at seat height); a shin longer than that is angled forward
// so the sole lands on the ground instead of sinking into it (Angi); shorter shins just hang (Petya).
export function sitKnee(r, seatH) {
  if (!r.kneeH) return 1.45;
  const c = (seatH - 0.04) / r.kneeH;           // the seated knee sits a bit below the seat (measured: sole ends at ±0 cm)
  return c >= 1 ? 1.45 : Math.min(1.45, 1.5 - Math.acos(c));
}

