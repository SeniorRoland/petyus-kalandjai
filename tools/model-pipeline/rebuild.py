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

ARMX = {'petya': 0.345, 'angi': 0.22, 'petike_foci': 0.265}   # angi: her slimmer torso (reshape_angi) ends at 0.20
ARMY = {'petya': (0.77, 1.42), 'angi': (0.95, 1.52), 'petike_foci': (0.58, 1.27)}
BODY = {  # torso / leg landmarks: hip = top of the trousers/shorts, knee just below the shorts (or mid-leg for long trousers)
# (every landmark on a voxel boundary – a multiple of S = 0.04 –, or the faces of a limb would be torn between two bones)
# legBox (optional): the leg column (|x| from … to, z from … to, above y): there, whatever is outside it belongs to the body
 'petya':       dict(hip=0.76, hipsTop=0.92, spineTop=1.12, spine1Top=1.32, neck=1.52, head=1.60, top=2.0, legX=0.15, legInner=0.06, knee=0.44, ankle=0.12, toeZ=0.2),
 'angi':        dict(hip=0.88, hipsTop=1.08, spineTop=1.20, spine1Top=1.36, neck=1.52, head=1.56, top=2.04, legX=0.10, legInner=0.02, knee=0.48, ankle=0.12, toeZ=0.2),   # lower body rebuilt: reshape_angi
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

# Angi's body, rebuilt on the voxel grid. The source had a wide, deep block from 0.64 to 0.94 (jeans + a white band) on thin
# legs – it looked like a nappy –, a broad, thick torso and arms thicker than the legs. Now: a slimmer top (bust ±0.20, waist
# ±0.16, 5 voxels deep, a little bust in front), thin arms (2 wide, 3 deep – thinner than the legs), hips as wide as the bust,
# plain grey shorts down to mid-thigh, the legs part at 0.86 (longer legs), the thighs taper into the existing shins.
GREY, GREY_D = (0.25, 0.255, 0.27), (0.16, 0.165, 0.18)   # vertex colours are linear: a mid grey on screen
def reshape_angi(vox, OFFS):
    I = lambda x: int(round((x - OFFS[0]) / S)); J = lambda y: int(round((y - OFFS[1]) / S)); K = lambda z: int(round((z - OFFS[2]) / S))
    SKIN, SKIN_E = vox[(I(0.08), J(0.40), K(-0.02))], vox[(I(0.12), J(0.40), K(0.02))]   # the shin's edge and middle colours
    def colr(c): return tuple(float(v) for v in c)
    C = lambda x, y, z: vox[(I(x), J(y), K(z))]
    TOP_F, TOP_B, TOP_S = C(0, 1.30, 0.06), C(0, 1.30, -0.10), C(0.24, 1.30, 0.02)      # the top: front, back, sides
    HEM_F, HEM_B, HEM_S = C(0, 1.02, 0.06), C(0, 1.02, -0.10), C(0.24, 1.02, 0.02)      # its darker hem
    ARM_O, ARM_F, ARM_B, HAND = C(0.40, 1.30, 0.02), C(0.32, 1.30, 0.06), C(0.32, 1.30, -0.06), C(0.32, 1.02, 0.02)
    for k in [k for k in vox if 0.63 < k[1] * S + OFFS[1] < 1.56]: vox.pop(k)          # hips, torso and the hanging arms: rebuilt
    def top(y, hw, front, back, side, z0=-0.10, z1=0.06):
        for xi in range(I(-hw), I(hw) + 1):
            for zi in range(K(z0), K(z1) + 1):
                vox[(xi, J(y), zi)] = colr(side if xi in (I(-hw), I(hw)) else front if zi * S + OFFS[2] > -0.01 else back)
    for y in (1.54, 1.50, 1.46, 1.42, 1.38, 1.34, 1.30, 1.26): top(y, 0.20, TOP_F, TOP_B, TOP_S)   # shoulders, bust
    for y in (1.42, 1.38, 1.34):                                                                        # the bust, in front
        for xi in range(I(-0.12), I(0.12) + 1): vox[(xi, J(y), K(0.10))] = colr(TOP_F)
    for y in (1.22, 1.18, 1.14, 1.10, 1.06): top(y, 0.16, TOP_F, TOP_B, TOP_S)                       # the waist
    for y in (1.02, 0.98): top(y, 0.20, HEM_F, HEM_B, HEM_S)                                            # the hem
    for sg in (1, -1):                                                                                  # the arms, hanging
        for xi in (I(sg * 0.24), I(sg * 0.28)):
            for y in [1.02 + 0.04 * n for n in range(13)]:
                for zi in range(K(-0.06), K(0.02) + 1):
                    z = zi * S + OFFS[2]
                    vox[(xi, J(y), zi)] = colr(HAND if y < 1.04 else ARM_O if xi == I(sg * 0.28) else ARM_F if z > 0 else ARM_B)
    def box(x0, x1, y, z0, z1, c, edge=None):
        for xi in range(I(x0), I(x1) + 1):
            for zi in range(K(z0), K(z1) + 1):
                e = edge is not None and (xi in (I(x0), I(x1)))
                vox[(xi, J(y), zi)] = colr(edge if e else c)
    for y in (0.94, 0.90): box(-0.20, 0.20, y, -0.14, 0.06, GREY)                       # hips (shorts' seat)
    for sg in (1, -1):
        lo, hi = sorted((sg * 0.04, sg * 0.20)); box(lo, hi, 0.86, -0.12, 0.06, GREY)     # the shorts' legs part
        lo, hi = sorted((sg * 0.04, sg * 0.16))
        for y in (0.82, 0.78): box(lo, hi, y, -0.10, 0.06, GREY)
        box(lo, hi, 0.74, -0.10, 0.06, GREY_D)                                            # the hem
        for y in (0.70, 0.66): box(lo, hi, y, -0.06, 0.06, SKIN_E, SKIN)                  # bare thighs into the shins
    # the hair: in a bun. The locks hanging down the sides to the shoulders go (below the ears), the back of the head gets
    # hair (in the source it was bare skin), and a bun sits high on the back of the head with a pink scrunchie.
    HAIR, HAIR_D = C(-0.24, 1.82, 0.02), C(0, 1.90, -0.10)
    for k in [k for k in vox if 1.56 < k[1] * S + OFFS[1] < 1.72 and abs(k[0] * S + OFFS[0]) > 0.22]: vox.pop(k)
    for y in [1.66 + 0.04 * n for n in range(8)]:
        for xi in range(I(-0.24), I(0.24) + 1):
            if (y < 1.72 and abs(xi * S + OFFS[0]) > 0.22): continue
            vox[(xi, J(y), K(-0.14))] = colr(HAIR_D if y > 1.85 else HAIR)
    def bun(z, hx, y0, y1, c, round_=False):
        for xi in range(I(-hx), I(hx) + 1):
            for y in [y0 + 0.04 * n for n in range(int(round((y1 - y0) / 0.04)) + 1)]:
                if round_ and abs(xi * S + OFFS[0]) > hx - 0.01 and (y < y0 + 0.01 or y > y1 - 0.01): continue   # cut the corners
                vox[(xi, J(y), K(z))] = colr(c)
    bun(-0.18, 0.08, 1.86, 1.94, TOP_F)                 # the scrunchie
    bun(-0.22, 0.08, 1.82, 1.98, HAIR, True)            # the bun
    bun(-0.26, 0.04, 1.86, 1.94, HAIR_D)                # its back
    return vox

def snap(x, base): return round((x - base) / S) * S + base

def in_leg(ax, y, z, c):
    b = c.get('legBox')
    return b is None or y < b[4] or (b[0] <= ax <= b[1] and b[2] <= z <= b[3])

def bone_at(p, c):
    """bone owning a voxel centre (never on a seam plane)"""
    x, y, z = p; s = 'Left' if x > 0 else 'Right'; ax = abs(x)
    if c['armBot'] <= y <= c['armTop'] and ax >= c['shoulderX']:
        return s + ('Arm' if ax < c['elbow'] else 'ForeArm' if ax < c['wrist'] else 'Hand')
    if y <= c['hip'] and ax >= c['legInner'] and in_leg(ax, y, z, c):
        return s + ('Foot' if y < c['ankle'] else 'Leg' if y < c['knee'] else 'UpLeg')
    for lim, b in [(c['hipsTop'], 'Hips'), (c['spineTop'], 'Spine'), (c['spine1Top'], 'Spine1'), (c['neck'], 'Spine2'), (c['head'], 'Neck')]:
        if y < lim: return b
    return 'Head'

def parts(a, b):   # a thigh voxel next to a body voxel: both get a face (closed shells when the leg turns)
    return a != b and ((a.endswith('UpLeg') and b == 'Hips') or (b.endswith('UpLeg') and a == 'Hips'))

def greedy(vox, keyfn):
    pos, nor, col, idx, vb = [], [], [], [], []
    for F in FACES:
        n = F[0]; a = [abs(t) for t in n].index(1); s = n[a]; u, v = (a + 1) % 3, (a + 2) % 3
        planes = {}
        for p, c in vox.items():
            q = list(p); q[a] += s
            if tuple(q) in vox and not parts(keyfn(p), keyfn(tuple(q))): continue
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
                    pos.append([(lo[d] + cc[d] * ln[d] - 0.5) * S + OFFS[d] for d in range(3)]); nor.append(n); col.append(key[0]); vb.append(key[1])
                idx += [b, b + 1, b + 2, b, b + 2, b + 3]
    greedy.bones = vb
    return np.array(pos, np.float32), np.array(nor, np.float32), np.array(col, np.float32), np.array(idx, np.uint32)

for name in ['petya', 'angi', 'petike_foci']:
    src_path = os.path.join(SRC, f'{name}.glb')
    g0 = GLTF2().load(src_path); P0 = acc(g0, g0.meshes[0].primitives[0].attributes.POSITION); mn = P0.min(0)
    OFFS = np.array([(mn[0] % S) + S / 2, (mn[1] % S) + S / 2, (mn[2] % S) + S / 2])
    g, vox = voxelize(src_path); fill(vox)
    if name == 'angi': reshape_angi(vox, OFFS)
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
    # the legs (and the body's faces down there) move rigidly with the bone of their face: no 50/50 rings at the hip, knee and
    # ankle (they collapse when the joint bends far – sitting), and nothing torn between two bones (the game adds joint fillers)
    bi = {n: i for i, n in enumerate(names)}
    for n, b in enumerate(greedy.bones):
        if pos[n][1] <= c['hip'] + 1e-4 and (b.endswith(('UpLeg', 'Leg', 'Foot')) or b == 'Hips'):
            Jn[n] = (bi[b], 0, 0, 0); Wn[n] = (1, 0, 0, 0)
    RG.write_skinned(os.path.join(BUILD, f'{name}_rigged.glb'), g0.meshes[0].name or name, pos, nor, col, ind, J, Jn, Wn, g0.materials[0])
    print(f"{name:12s} arm w={L['w']:.2f} shoulderX={c['shoulderX']:.2f} elbow={c['elbow']:.2f} wrist={c['wrist']:.2f} tip={c['tip']:.2f} armY={c['armBot']:.2f}..{c['armTop']:.2f} clash={clash}  verts {len(pos)}  tris {len(ind)//3}")
    if '--install' in sys.argv: shutil.copy(os.path.join(BUILD, f'{name}_rigged.glb'), os.path.join(PUBLIC, f'{name}.glb')); print('   → public/' + name + '.glb')
