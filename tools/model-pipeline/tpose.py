"""Voxel-segédfüggvények: GLB → voxelrács (felület + kitöltés), hálóépítés, GLB írás.
A rebuild.py használja; önmagában nem kell futtatni."""
import os, sys, struct, json, numpy as np
from pygltflib import GLTF2, Buffer, BufferView, Accessor, Mesh, Primitive, Attributes, Node, Scene, Material, PbrMetallicRoughness, Asset
S = 0.04
def acc(g, i):
    a = g.accessors[i]; bv = g.bufferViews[a.bufferView]; blob = g.binary_blob()
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a.componentType]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a.type]
    off = (bv.byteOffset or 0) + (a.byteOffset or 0)
    arr = np.frombuffer(blob, dtype=dt, count=a.count * n, offset=off).reshape(a.count, n) if not bv.byteStride else None
    return arr

def voxelize(path):
    g = GLTF2().load(path); p = g.meshes[0].primitives[0]
    P = acc(g, p.attributes.POSITION).astype(np.float64); N = acc(g, p.attributes.NORMAL).astype(np.float64); C = acc(g, p.attributes.COLOR_0)[:, :3]
    I = acc(g, p.indices).reshape(-1, 3)
    vox = {}
    for t in I:
        c = P[t].mean(0); n = N[t[0]]
        ctr = c - n * S / 2       # tri centroid lies on the face; step half a voxel inwards
        # snap: x,z centres at 0.02+0.04k? find grid: voxel centre = face centre region
        key = tuple(np.round((ctr - OFFS) / S).astype(int))
        col = tuple(np.round(C[t].mean(0), 5))
        vox.setdefault(key, {})[col] = vox.get(key, {}).get(col, 0) + 1
    vox = {k: max(v.items(), key=lambda e: e[1])[0] for k, v in vox.items()}
    return g, vox

def fill(vox):
    keys = np.array(list(vox.keys())); lo = keys.min(0); hi = keys.max(0)
    occ = set(vox.keys()); new = {}
    # index lines for fast ray queries
    from collections import defaultdict
    lx = defaultdict(list); ly = defaultdict(list); lz = defaultdict(list)
    for (i, j, k) in occ: lx[(j, k)].append(i); ly[(i, k)].append(j); lz[(i, j)].append(k)
    for (i, j, k) in [(i, j, k) for i in range(lo[0], hi[0] + 1) for j in range(lo[1], hi[1] + 1) for k in range(lo[2], hi[2] + 1)]:
        if (i, j, k) in occ: continue
        X = lx.get((j, k), []); Y = ly.get((i, k), []); Z = lz.get((i, j), [])
        if not (any(x < i for x in X) and any(x > i for x in X) and any(y < j for y in Y) and any(y > j for y in Y) and any(z < k for z in Z) and any(z > k for z in Z)): continue
        # colour: nearest surface voxel along z (front/back), else x
        zs = sorted(Z, key=lambda z: abs(z - k)); new[(i, j, k)] = vox[(i, j, zs[0])]
    vox.update(new); return len(new)

FACES = [((1,0,0),[(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),((-1,0,0),[(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),((0,1,0),[(0,1,0),(0,1,1),(1,1,1),(1,1,0)]),((0,-1,0),[(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),((0,0,1),[(0,0,1),(1,0,1),(1,1,1),(0,1,1)]),((0,0,-1),[(0,0,0),(0,1,0),(1,1,0),(1,0,0)])]
def mesh(vox):
    pos = []; nor = []; col = []; idx = []
    for (i, j, k), c in vox.items():
        for n, cs in FACES:
            if (i + n[0], j + n[1], k + n[2]) in vox: continue
            b = len(pos)
            for cc in cs:
                pos.append([(i - 0.5 + cc[0]) * S + OFFS[0], (j - 0.5 + cc[1]) * S + OFFS[1], (k - 0.5 + cc[2]) * S + OFFS[2]]); nor.append(n); col.append(c)
            idx += [b, b + 1, b + 2, b, b + 2, b + 3]
    return np.array(pos, np.float32), np.array(nor, np.float32), np.array(col, np.float32), np.array(idx, np.uint32)

def write(src, out, pos, nor, col, idx):
    blob = b''; views = []; accs = []
    def add(arr, target, typ, ct, mm=False):
        nonlocal blob
        while len(blob) % 4: blob += b'\0'
        off = len(blob); data = arr.tobytes(); blob += data
        views.append(BufferView(buffer=0, byteOffset=off, byteLength=len(data), target=target))
        a = Accessor(bufferView=len(views) - 1, componentType=ct, count=len(arr), type=typ)
        if mm: a.min = arr.min(0).tolist(); a.max = arr.max(0).tolist()
        accs.append(a); return len(accs) - 1
    ip = add(pos, 34962, 'VEC3', 5126, True); inn = add(nor, 34962, 'VEC3', 5126); ic = add(col, 34962, 'VEC3', 5126); ii = add(idx, 34963, 'SCALAR', 5125)
    m0 = src.materials[0]
    g = GLTF2(asset=Asset(version='2.0', generator='Petike T-pose converter'), scene=0, scenes=[Scene(nodes=[0])],
              nodes=[Node(name=src.nodes[0].name + '_TPose', mesh=0)],
              meshes=[Mesh(name=src.meshes[0].name, primitives=[Primitive(attributes=Attributes(POSITION=ip, NORMAL=inn, COLOR_0=ic), indices=ii, material=0, mode=4)])],
              materials=[m0], accessors=accs, bufferViews=views, buffers=[Buffer(byteLength=len(blob))])
    g.set_binary_blob(blob); g.save_binary(out)


if os.path.basename(sys.argv[0]) == 'tpose.py':
    print('Ez egy segédmodul – futtasd a rebuild.py-t.')
