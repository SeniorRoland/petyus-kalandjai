"""Csontváz (Mixamo-nevek), súlyozás és skinnelt GLB írás – a rebuild.py és a roller_rig.py használja."""
import numpy as np
from pygltflib import GLTF2, Buffer, BufferView, Accessor, Mesh, Primitive, Attributes, Node, Scene, Skin, Asset, Material, PbrMetallicRoughness
EPS = 1e-4
def acc(g, i):
    a = g.accessors[i]; bv = g.bufferViews[a.bufferView]; n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a.type]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a.componentType]
    return np.frombuffer(g.binary_blob(), dtype=dt, count=a.count * n, offset=(bv.byteOffset or 0) + (a.byteOffset or 0)).reshape(a.count, n)

def skeleton(c):
    """humanoid joint list (Mixamo names), world positions in T-pose"""
    z = 0.0; J = []
    def j(name, parent, p): J.append((name, parent, np.array(p, float)))
    hm = (c['hip'] + c['hipsTop']) / 2
    j('Hips', None, (0, hm, z)); j('Spine', 'Hips', (0, c['hipsTop'], z)); j('Spine1', 'Spine', (0, c['spineTop'], z)); j('Spine2', 'Spine1', (0, c['spine1Top'], z))
    j('Neck', 'Spine2', (0, c['neck'], z)); j('Head', 'Neck', (0, c['head'], z)); j('HeadTop_End', 'Head', (0, c['top'], z))
    for s, sg in (('Left', 1), ('Right', -1)):
        ay = c['armY']
        aj = c['shoulderX'] + c.get('armW', 0) / 2   # joint in the middle of the arm's root → lowering the arm does not cut into the torso
        j(s + 'Shoulder', 'Spine2', (sg * c['shoulderX'] * 0.45, ay + 0.02, z)); j(s + 'Arm', s + 'Shoulder', (sg * aj, ay, z))
        j(s + 'ForeArm', s + 'Arm', (sg * c['elbow'], ay, z)); j(s + 'Hand', s + 'ForeArm', (sg * c['wrist'], ay, z)); j(s + 'HandEnd', s + 'Hand', (sg * c['tip'], ay, z))
        lx = sg * c['legX']
        j(s + 'UpLeg', 'Hips', (lx, c['hip'], z)); j(s + 'Leg', s + 'UpLeg', (lx, c['knee'], z)); j(s + 'Foot', s + 'Leg', (lx, c['ankle'], z))
        j(s + 'ToeBase', s + 'Foot', (lx, 0.03, c['toeZ'] - 0.06)); j(s + 'Toe_End', s + 'ToeBase', (lx, 0.03, c['toeZ']))
    return J

def weights_voxel(P, c, names):
    idx = {n: i for i, n in enumerate(names)}
    Jn = np.zeros((len(P), 4), np.uint16); Wn = np.zeros((len(P), 4), np.float32)
    on = lambda a, b: abs(a - b) < EPS
    def seg(v, bounds):  # bounds: [(limit, bone)], ascending; returns [(bone,w)]
        for k, (lim, b) in enumerate(bounds):
            if on(v, lim) and k + 1 < len(bounds): return [(b, .5), (bounds[k + 1][1], .5)]
            if v < lim: return [(b, 1.0)]
        return [(bounds[-1][1], 1.0)]
    for n, (x, y, z) in enumerate(P):
        s = 'Left' if x > 0 else 'Right'; ax = abs(x)
        if c['armBot'] - EPS <= y <= c['armTop'] + EPS and ax >= c['shoulderX'] - EPS:
            if on(ax, c['shoulderX']): w = [('Spine2', .5), (s + 'Arm', .5)]
            else: w = seg(ax, [(c['elbow'], s + 'Arm'), (c['wrist'], s + 'ForeArm'), (9, s + 'Hand')])
        elif y <= c['hip'] + EPS and ax >= c['legInner'] - EPS:
            if on(y, c['hip']): w = [('Hips', .5), (s + 'UpLeg', .5)]
            else: w = seg(y, [(c['ankle'], s + 'Foot'), (c['knee'], s + 'Leg'), (c['hip'], s + 'UpLeg')])
        else:
            w = seg(y, [(c['hipsTop'], 'Hips'), (c['spineTop'], 'Spine'), (c['spine1Top'], 'Spine1'), (c['neck'], 'Spine2'), (c['head'], 'Neck'), (99, 'Head')])
        for k, (b, ww) in enumerate(w): Jn[n, k] = idx[b]; Wn[n, k] = ww
    return Jn, Wn

def write_skinned(out, meshname, pos, nor, col, ind, joints, Jn, Wn, material):
    blob = b''; views = []; accs = []
    def add(arr, target, typ, ct, mm=False):
        nonlocal blob
        while len(blob) % 4: blob += b'\0'
        off = len(blob); data = np.ascontiguousarray(arr).tobytes(); blob += data
        views.append(BufferView(buffer=0, byteOffset=off, byteLength=len(data), target=target))
        a = Accessor(bufferView=len(views) - 1, componentType=ct, count=len(arr), type=typ)
        if mm: a.min = arr.min(0).tolist(); a.max = arr.max(0).tolist()
        accs.append(a); return len(accs) - 1
    ip = add(pos.astype(np.float32), 34962, 'VEC3', 5126, True); inn = add(nor.astype(np.float32), 34962, 'VEC3', 5126)
    ic = add(col.astype(np.float32), 34962, 'VEC3', 5126); ij = add(Jn, 34962, 'VEC4', 5123); iw = add(Wn, 34962, 'VEC4', 5126)
    ii = add(ind.astype(np.uint32), 34963, 'SCALAR', 5125)
    names = [n for n, _, _ in joints]; wp = {n: p for n, _, p in joints}
    ibm = np.array([[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1] for _, _, p in joints], np.float32)
    iibm = add(ibm, None, 'MAT4', 5126)
    nodes = [Node(name=meshname, mesh=0, skin=0)]
    for n, par, p in joints:
        t = p - (wp[par] if par else 0)
        nodes.append(Node(name='mixamorig:' + n, translation=[float(v) for v in t]))
    for k, (n, par, p) in enumerate(joints):
        if par: nodes[1 + names.index(par)].children = (nodes[1 + names.index(par)].children or []) + [1 + k]
    g = GLTF2(asset=Asset(version='2.0', generator='Petike rig (Mixamo-compatible humanoid)'), scene=0, scenes=[Scene(nodes=[0, 1])], nodes=nodes,
              meshes=[Mesh(name=meshname, primitives=[Primitive(attributes=Attributes(POSITION=ip, NORMAL=inn, COLOR_0=ic, JOINTS_0=ij, WEIGHTS_0=iw), indices=ii, material=0, mode=4)])],
              skins=[Skin(name=meshname + '_Skeleton', joints=list(range(1, 1 + len(joints))), inverseBindMatrices=iibm, skeleton=1)],
              materials=[material], accessors=accs, bufferViews=views, buffers=[Buffer(byteLength=len(blob))])
    g.set_binary_blob(blob); g.save_binary(out)

