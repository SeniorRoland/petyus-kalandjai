// Petike a parkban – objektum design terv (3D katalógus). Ugyanazt a voxels.js-t használja, mint a játék.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { CATALOG, getGeometry } from './voxels.js';

const CHARS = [
  { id: 'petya', name: 'Petya (apa)', file: 'petya.glb', scale: 0.93, desc: 'Az apa. T-pose-ban riggelt modell, 27 Mixamo-nevű csonttal; a játék a csontokat mozgatja (séta, ülés, ujjongás).', use: 'Nyitójelenet, a családi padon ül' },
  { id: 'angi', name: 'Angi (anya)', file: 'angi.glb', scale: 0.86, desc: 'Az anya, rózsaszín felsőben. Petyához hasonlóan riggelt, T-pose-ban álló modell.', use: 'Nyitójelenet, a családi padon ül' },
  { id: 'petike-roller', name: 'Petike (rolleres ruha)', file: 'petike_roller.glb', scale: 1.045, desc: 'Sisakos, rolleres öltözet, riggelt T-pose modell. A rolleren két lábbal a deszkán áll, és fogja a kormányt.', use: 'Nyitójelenet' },
  { id: 'petike-foci', name: 'Petike (focista ruha)', file: 'petike_foci.glb', scale: 0.77, desc: 'Riggelt T-pose modell; ebben a ruhában irányítja a játékos: fut, cselez és rúg.', use: 'Játékmenet' },
  { id: 'roller', name: 'Elektromos roller', file: 'roller_kicsi.glb', scale: 0.72, rotY: Math.PI / 2, desc: 'Gyerekméretű elektromos roller. A nyitójelenet végén Petike a padhoz támasztja.', use: 'Nyitójelenet, a pad mellett' },
];
const ORDER = ['Növények', 'Utcabútor', 'Park', 'Pálya', 'Utca', 'Karakterek'];
const items = [...CATALOG.map((d) => ({ ...d, kind: 'voxel' })), ...CHARS.map((c) => ({ ...c, cat: 'Karakterek', kind: 'glb', variants: 1 }))];
const slug = (id) => id.replace(/_/g, '-');
const fmt = (n, d = 2) => n.toLocaleString('hu-HU', { minimumFractionDigits: d, maximumFractionDigits: d });
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---------- renderer & stage
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
scene.add(new THREE.HemisphereLight(0xeef7ff, 0x6f8f4a, 1.4));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3); sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
const plate = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshLambertMaterial({ color: 0x86bd5c })); plate.rotation.x = -Math.PI / 2; plate.receiveShadow = true; scene.add(plate);
let grid = null; const holder = new THREE.Group(); scene.add(holder);
const vmat = new THREE.MeshLambertMaterial({ vertexColors: true });
// 1.8 m reference figure
const fig = new THREE.Group(); { const m = new THREE.MeshLambertMaterial({ color: 0x8e9aa3, transparent: true, opacity: 0.55 });
  const b = (w, h, d, x, y) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y + h / 2, 0); me.castShadow = true; fig.add(me); };
  b(0.17, 0.8, 0.2, -0.11, 0); b(0.17, 0.8, 0.2, 0.11, 0); b(0.44, 0.6, 0.25, 0, 0.8); b(0.12, 0.6, 0.14, -0.29, 0.78); b(0.12, 0.6, 0.14, 0.29, 0.78); b(0.32, 0.36, 0.3, 0, 1.44); }
scene.add(fig);

function themeColors() { const cs = getComputedStyle(document.documentElement); scene.background = new THREE.Color(cs.getPropertyValue('--stage').trim() || '#e4ece2'); }
themeColors(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeColors);
new MutationObserver(themeColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
function resize() { const r = stage.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage);

// ---------- GLB characters (public/*.glb)
const loader = new GLTFLoader(); const glbCache = new Map();
async function loadChar(c) {
  if (glbCache.has(c.id)) return glbCache.get(c.id);
  let g;
  g = await loader.loadAsync(import.meta.env.BASE_URL + c.file);
  g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  glbCache.set(c.id, g); return g;
}

// ---------- build an item into a group, return stats
async function buildObject(it, v) {
  const grp = new THREE.Group(); let st = {};
  if (it.kind === 'voxel') {
    const geo = getGeometry(it.id, v); const m = new THREE.Mesh(geo, vmat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
    if (it.water) for (const w of it.water) { const wm = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, 0.06, 32), new THREE.MeshLambertMaterial({ color: 0x4fb3e8, transparent: true, opacity: 0.8 })); wm.position.y = w.y; grp.add(wm); }
    st = { voxels: geo.userData.voxels, faces: geo.userData.faces, tris: geo.userData.faces * 2, voxel: geo.userData.voxelSize, palette: geo.userData.palette };
  } else {
    const g = await loadChar(it); const sc = cloneSkinned(g.scene); sc.scale.setScalar(it.scale); if (it.rotY) sc.rotation.y = it.rotY; grp.add(sc);
    // SkeletonUtils.clone: a plain clone() keeps the original skeleton, so the scale would be ignored.
    // Fresh skeleton: compute bone matrices before measuring, otherwise the bounds are 0 and the mesh gets culled
    grp.updateMatrixWorld(true);
    sc.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); o.computeBoundingSphere(); } });
    let tris = 0; const cols = new Map();
    sc.traverse((o) => { if (!o.isMesh) return; const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3;
      const ca = gg.attributes.color, mc = o.material.color || new THREE.Color(1, 1, 1);
      if (ca) for (let i = 0; i < ca.count; i += 6) { const c = new THREE.Color(ca.getX(i), ca.getY(i), ca.getZ(i)).multiply(mc).getHex(); cols.set(c, (cols.get(c) || 0) + 1); }
      else cols.set(mc.getHex(), (cols.get(mc.getHex()) || 0) + 50); });
    st = { tris: Math.round(tris), voxel: 0.04 * it.scale, palette: [...cols.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map((e) => e[0]), scale: it.scale };
  }
  const bb = new THREE.Box3().setFromObject(grp); st.size = bb.getSize(new THREE.Vector3()); st.box = bb;
  return { grp, st };
}

// ---------- list
const nav = document.getElementById('list'); const buttons = new Map();
for (const cat of ORDER) {
  const its = items.filter((i) => i.cat === cat); if (!its.length) continue;
  const h = document.createElement('h2'); h.innerHTML = `<span>${cat}</span><span>${its.length}</span>`; nav.appendChild(h);
  for (const it of its) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-' + slug(it.id);
    b.innerHTML = `<img class="thumb" alt=""><span><span class="nm">${it.name}</span><br><span class="vx">${it.kind === 'voxel' ? (it.variants > 1 ? it.variants + ' változat' : '1 változat') : 'GLB modell'}</span></span>`;
    b.onclick = () => { location.hash = slug(it.id); }; nav.appendChild(b); buttons.set(it.id, b);
  }
}

// ---------- selection
let cur = null, curV = 0;
const info = document.getElementById('info');
async function select(it, v = 0) {
  cur = it; curV = v;
  for (const [id, b] of buttons) b.setAttribute('aria-current', id === it.id ? 'true' : 'false');
  const { grp, st } = await buildObject(it, v);
  if (cur !== it || curV !== v) return;
  holder.clear(); holder.add(grp);
  const R = Math.max(st.size.x, st.size.z) / 2;
  const span = Math.max(st.size.x, st.size.y, st.size.z, 1);
  fig.position.set(st.box.max.x + 0.75, 0, 0); fig.visible = document.getElementById('fig').getAttribute('aria-pressed') === 'true';
  const pr = Math.max(R + 1.4, 1.8, span * 0.9);
  plate.scale.setScalar(pr);
  if (grid) scene.remove(grid);
  const gs = Math.ceil(pr * 2); grid = new THREE.GridHelper(gs, gs, 0x5b7f4a, 0x5b7f4a); grid.material.transparent = true; grid.material.opacity = 0.35; grid.position.y = 0.002;
  grid.visible = document.getElementById('grid').getAttribute('aria-pressed') === 'true'; scene.add(grid);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -pr * 1.2; sun.shadow.camera.right = sun.shadow.camera.top = pr * 1.2; sun.shadow.camera.far = 60; sun.shadow.camera.updateProjectionMatrix();
  const centerY = st.size.y * 0.5;
  fitView(span, centerY, false);
  document.getElementById('vLabel').textContent = `${v + 1} / ${it.variants}`;
  document.getElementById('prevV').disabled = document.getElementById('nextV').disabled = it.variants < 2;
  const col = it.collider ? (it.collider.r !== undefined ? `kör, r = ${fmt(it.collider.r)} m` : `doboz ${fmt(it.collider.hx * 2)} × ${fmt(it.collider.hz * 2)} m`) + `, ${fmt(it.collider.h, 1)} m magas` : 'nincs';
  const rows = it.kind === 'voxel' ? [
    ['Méret (sz × m × mé)', `${fmt(st.size.x)} × ${fmt(st.size.y)} × ${fmt(st.size.z)} m`], ['Voxelméret', `${fmt(st.voxel)} m`],
    ['Voxelek száma', st.voxels.toLocaleString('hu-HU')], ['Látható lapok', st.faces.toLocaleString('hu-HU')], ['Háromszögek', st.tris.toLocaleString('hu-HU')],
    ['Ütköző (labda, Petike)', col], ['Árnyékot vet', it.noShadow ? 'nem' : 'igen'] ] : [
    ['Játékbeli méret', `${fmt(st.size.x)} × ${fmt(st.size.y)} × ${fmt(st.size.z)} m`], ['Méretezés a játékban', `× ${fmt(st.scale)}`],
    ['Voxelméret a játékban', `${fmt(st.voxel, 3)} m`], ['Háromszögek', st.tris.toLocaleString('hu-HU')], ['Forrás', it.file] ];
  info.innerHTML = `
    <div><div class="cat">${it.cat}</div><h2>${it.name}</h2></div>
    <p>${it.desc}</p>
    <div class="use"><b>Hol van a játékban:</b> ${it.use}</div>
    <table><tbody>${rows.map((r) => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table>
    <div><h3>Fő színek</h3><div class="swatches">${st.palette.slice(0, 10).map((c) => `<span class="sw"><i style="background:${hex(c)}"></i>${hex(c)}</span>`).join('')}</div></div>
    ${it.id === 'car' ? '<div class="note">A 6 változat 6 karosszériaszín. Az autók az úton közlekednek, a térkép szélén visszafordulnak.</div>' : ''}
    ${it.kind === 'voxel' && it.variants > 1 && it.id !== 'car' ? `<div class="note">A ${it.variants} változat ugyanazzal a szabállyal, más véletlenmaggal készül. A játékban véletlenszerűen keverednek, 90°-os elforgatással és ±15% méretezéssel.</div>` : ''}
    ${it.id === 'fence' ? '<div class="note">A kerítéselemet a játék hosszirányban nyújtja, hogy pontosan kitöltse a pálya oldalát. A végére kerítésoszlop kerül.</div>' : ''}`;
}
function fitView(span, cy, iso) {
  const d = span * (iso ? 2.9 : 2.6) + 1.4;
  const dir = iso ? new THREE.Vector3(1, 0.85, 1).normalize() : new THREE.Vector3(0.9, 0.55, 1.2).normalize();
  controls.target.set(0, cy, 0); cam.position.copy(dir.multiplyScalar(d)).add(controls.target); cam.near = 0.02; cam.far = d * 10; cam.updateProjectionMatrix(); controls.update();
}
function fromHash() { const h = location.hash.slice(1); const it = items.find((i) => slug(i.id) === h) || items[0]; if (it !== cur) select(it, 0); }
window.addEventListener('hashchange', fromHash);

// ---------- toolbar
const toggle = (id, fn) => { const b = document.getElementById(id); b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); fn(on); }; };
toggle('rot', (on) => { controls.autoRotate = on; });
toggle('fig', (on) => { fig.visible = on; });
toggle('grid', (on) => { if (grid) grid.visible = on; });
document.getElementById('prevV').onclick = () => select(cur, (curV - 1 + cur.variants) % cur.variants);
document.getElementById('nextV').onclick = () => select(cur, (curV + 1) % cur.variants);
document.getElementById('iso').onclick = () => { const b = new THREE.Box3().setFromObject(holder); const s = b.getSize(new THREE.Vector3()); fitView(Math.max(s.x, s.y, s.z, 1), s.y * 0.5, true); };
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { controls.autoRotate = false; document.getElementById('rot').setAttribute('aria-pressed', 'false'); }

// ---------- loop
resize(); fromHash();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, cam); });

// ---------- thumbnails (rendered once, off-screen)
(async () => {
  const tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); tr.setSize(104, 104); tr.setPixelRatio(1);
  const ts = new THREE.Scene(); ts.add(new THREE.HemisphereLight(0xeef7ff, 0x6f8f4a, 1.5)); const tl = new THREE.DirectionalLight(0xfff0d8, 2.2); tl.position.set(-4, 9, 6); ts.add(tl);
  const tc = new THREE.PerspectiveCamera(30, 1, 0.02, 200);
  for (const it of items) {
    try {
      const { grp, st } = await buildObject(it, 0); ts.add(grp);
      const span = Math.max(st.size.x, st.size.y, st.size.z, 0.3); const cy = st.size.y / 2;
      tc.position.set(1, 0.75, 1).normalize().multiplyScalar(span * 2.1).add(new THREE.Vector3(0, cy, 0)); tc.lookAt(0, cy, 0);
      tr.render(ts, tc); buttons.get(it.id).querySelector('img').src = tr.domElement.toDataURL('image/png'); ts.remove(grp);
    } catch (e) { console.warn('thumb', it.id, e); }
    await new Promise((r) => setTimeout(r, 0));
  }
  tr.dispose();
})();
