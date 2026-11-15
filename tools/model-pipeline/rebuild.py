"""Petya, Angi és a focista Petike: T-pose + rig újragenerálása a models/source/ eredetiekből.
Használat:  python rebuild.py            → models/build/*_tpose.glb, *_rigged.glb
            python rebuild.py --install  → a riggelt modelleket a public/ mappába is bemásolja (a játék ezeket tölti be)"""
import numpy as np, shutil
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'models', 'source'); BUILD = os.path.join(ROOT, 'models', 'build'); PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(BUILD, exist_ok=True)
sys.path.insert(0, HERE)
exec(open(os.path.join(HERE, 'tpose.py'), encoding='utf-8').read().split('# arm config')[0])   # acc, voxelize, fill, FACES, write, S
import rig as RG
from pygltflib import GLTF2

ARMX = {'petya': 0.345, 'angi': 0.265, 'petike_foci': 0.265}
ARMY = {'petya': (0.77, 1.42), 'angi': (0.95, 1.6), 'petike_foci': (0.58, 1.27)}
BODY = {  # torso / leg landmarks: hip = top of the trousers/shorts, knee just below the shorts (or mid-leg for long trousers)
 'petya':       dict(hip=0.76, hipsTop=0.92, spineTop=1.12, spine1Top=1.32, neck=1.52, head=1.60, top=2.0, legX=0.15, legInner=0.06, knee=0.44, ankle=0.12, toeZ=0.2),
 'angi':        dict(hip=0.96, hipsTop=1.08, spineTop=1.20, spine1Top=1.36, neck=1.52, head=1.56, top=2.04, legX=0.12, legInner=0.02, knee=0.56, ankle=0.12, toeZ=0.2),
 'petike_foci': dict(hip=0.68, hipsTop=0.80, spineTop=0.92, spine1Top=1.08, neck=1.24, head=1.32, top=1.80, legX=0.12, legInner=0.06, knee=0.40, ankle=0.12, toeZ=0.2),
}
# Shin widening (y range, raw model metres): the footballer Petike's shin is only 2 voxels wide in the source
# (shorts and shoes are 4), so it looked thinner than the scooter Petike's. One extra column on the inner side → 3 voxels.
SHIN_WIDEN = {'petike_foci': (0.12, 0.44)}

def widen_shins(vox, ctr, legInner, y0, y1):
    add = {}
    for k, col in vox.items():
        x, y, z = ctr(k)
        if not (y0 < y < y1) or abs(x) < legInner: continue
        n = (k[0] - 1 if x > 0 else k[0] + 1, k[1], k[2])   # inner neighbour (towards x = 0)
        if n not in vox and abs(ctr(n)[0]) > legInner: add[n] = col
    vox.update(add); return len(add)

def snap(x, base): return round((x - base) / S) * S + base

def bone_at(p, c):
    """bone owning a voxel centre (never on a seam plane)"""
    x, y, z = p; s = 'Left' if x > 0 else 'Right'; ax = abs(x)
    if c['armBot'] <= y <= c['armTop'] and ax >= c['shoulderX']:
        return s + ('Arm' if ax < c['elbow'] else 'ForeArm' if ax < c['wrist'] else 'Hand')
    if y <= c['hip'] and ax >= c['legInner']:
        return s + ('Foot' if y < c['ankle'] else 'Leg' if y < c['knee'] else 'UpLeg')
    for lim, b in [(c['hipsTop'], 'Hips'), (c['spineTop'], 'Spine'), (c['spine1Top'], 'Spine1'), (c['neck'], 'Spine2'), (c['head'], 'Neck')]:
        if y < lim: return b
    return 'Head'

def greedy(vox, keyfn):
    pos, nor, col, idx = [], [], [], []
    for F in FACES:
        n = F[0]; a = [abs(t) for t in n].index(1); s = n[a]; u, v = (a + 1) % 3, (a + 2) % 3
        planes = {}
        for p, c in vox.items():
            q = list(p); q[a] += s
            if tuple(q) in vox: continue
            planes.setdefault(p[a], {})[(p[u], p[v])] = (c, keyfn(p))
        for pl, cells in planes.items():
            done = set()
            for (u0, v0) in sorted(cells):
                if (u0, v0) in done: continue
                key = cells[(u0, v0)]; w = 1
                while (u0 + w, v0) in cells and (u0 + w, v0) not in done and cells[(u0 + w, v0)] == key: w += 1
                h = 1
                while all((u0 + t, v0 + h) in cells and (u0 + t, v0 + h) not in done and cells[(u0 + t, v0 + h)] == key for t in range(w)): h += 1
                for t in range(w):
                    for r in range(h): done.add((u0 + t, v0 + r))
                lo = [0, 0, 0]; ln = [1, 1, 1]; lo[a] = pl; lo[u] = u0; lo[v] = v0; ln[u] = w; ln[v] = h
                b = len(pos)
                for cc in F[1]:
                    pos.append([(lo[d] + cc[d] * ln[d] - 0.5) * S + OFFS[d] for d in range(3)]); nor.append(n); col.append(key[0])
                idx += [b, b + 1, b + 2, b, b + 2, b + 3]
    return np.array(pos, np.float32), np.array(nor, np.float32), np.array(col, np.float32), np.array(idx, np.uint32)

for name in ['petya', 'angi', 'petike_foci']:
    src_path = os.path.join(SRC, f'{name}.glb')
    g0 = GLTF2().load(src_path); P0 = acc(g0, g0.meshes[0].primitives[0].attributes.POSITION); mn = P0.min(0)
    OFFS = np.array([(mn[0] % S) + S / 2, (mn[1] % S) + S / 2, (mn[2] % S) + S / 2])
    g, vox = voxelize(src_path); fill(vox)
    ctr = lambda k: np.array(k) * S + OFFS
    if name in SHIN_WIDEN: print(f'{name}: lábszár szélesítve, +{widen_shins(vox, ctr, BODY[name]["legInner"], *SHIN_WIDEN[name])} voxel')
    arms = {'R': [], 'L': []}
    for k in vox:
        x, y, z = ctr(k)
        if ARMY[name][0] <= y <= ARMY[name][1]:
            if x < -ARMX[name]: arms['R'].append(k)
            elif x > ARMX[name]: arms['L'].append(k)
    moved = {}; info = {}
    for side, ks in arms.items():
        cs = np.array([ctr(k) for k in ks]); xs = cs[:, 0]; top = cs[:, 1].max() + S / 2; w = xs.max() - xs.min() + S
        inner = (xs.max() + S / 2) if side == 'R' else (xs.min() - S / 2)
        px = inner - w / 2 if side == 'R' else inner + w / 2; py = top - w / 2
        for k in ks:
            x, y, z = ctr(k); dx, dy = x - px, y - py
            nx, ny = (px + dy, py - dx) if side == 'R' else (px - dy, py + dx)
            moved[tuple(np.round((np.array([nx, ny, z]) - OFFS) / S).astype(int))] = vox[k]
        info[side] = dict(w=w, top=top, inner=abs(inner), length=cs[:, 1].max() - cs[:, 1].min() + S)
    for side in arms:
        for k in arms[side]: vox.pop(k)
    clash = sum(1 for k in moved if k in vox); vox.update(moved)
    # arm landmarks in T-pose
    L = info['L']; c = dict(BODY[name])
    c['shoulderX'] = L['inner']; c['tip'] = L['inner'] + L['length']; c['armTop'] = L['top']; c['armBot'] = L['top'] - L['w']; c['armY'] = L['top'] - L['w'] / 2; c['armW'] = L['w']
    xb = OFFS[0] - S / 2   # x of a voxel boundary
    c['wrist'] = snap(c['tip'] - 0.08, xb); c['elbow'] = snap((c['shoulderX'] + c['wrist']) / 2, xb)
    # unskinned T-pose with merged faces (no bone key needed, but keep bone split so it matches the rig)
    keyfn = lambda p: bone_at(ctr(p), c)
    pos, nor, col, ind = greedy(vox, keyfn)
    write(g0, os.path.join(BUILD, f'{name}_tpose.glb'), pos, nor, col, ind)
    J = RG.skeleton(c); names = [n for n, _, _ in J]
    Jn, Wn = RG.weights_voxel(pos, c, names)
    RG.write_skinned(os.path.join(BUILD, f'{name}_rigged.glb'), g0.meshes[0].name or name, pos, nor, col, ind, J, Jn, Wn, g0.materials[0])
    print(f"{name:12s} arm w={L['w']:.2f} shoulderX={c['shoulderX']:.2f} elbow={c['elbow']:.2f} wrist={c['wrist']:.2f} tip={c['tip']:.2f} armY={c['armBot']:.2f}..{c['armTop']:.2f} clash={clash}  verts {len(pos)}  tris {len(ind)//3}")
    if '--install' in sys.argv: shutil.copy(os.path.join(BUILD, f'{name}_rigged.glb'), os.path.join(PUBLIC, f'{name}.glb')); print('   → public/' + name + '.glb')
