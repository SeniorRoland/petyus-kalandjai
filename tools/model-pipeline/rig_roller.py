"""A rolleres Petike riggelése (a roller_tpose.py kimenetéből).
Használat:  python roller_tpose.py && python rig_roller.py [--install]"""
import numpy as np, shutil
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'models', 'source'); BUILD = os.path.join(ROOT, 'models', 'build'); PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(BUILD, exist_ok=True)
sys.path.insert(0, HERE)
from rig import acc, skeleton, write_skinned
from pygltflib import GLTF2, Material, PbrMetallicRoughness
import trimesh.transformations as tt
g = GLTF2().load(os.path.join(BUILD, 'petike_roller_tpose.glb'))
def local(n):
    if n.matrix: return np.array(n.matrix).reshape(4, 4).T
    M = np.eye(4)
    if n.scale: M = np.diag(list(n.scale) + [1]) @ M
    if n.rotation: q = n.rotation; M = tt.quaternion_matrix([q[3], q[0], q[1], q[2]]) @ M
    if n.translation: M = tt.translation_matrix(n.translation) @ M
    return M
parts = []  # (node index, ancestors set, P, N, C, I)
def walk(i, M, anc):
    n = g.nodes[i]; W = M @ local(n)
    if n.mesh is not None:
        for pr in g.meshes[n.mesh].primitives:
            P = acc(g, pr.attributes.POSITION).astype(float); Nn = acc(g, pr.attributes.NORMAL).astype(float)
            P = (W @ np.c_[P, np.ones(len(P))].T).T[:, :3]; Nn = (np.linalg.inv(W[:3, :3]).T @ Nn.T).T; Nn /= np.linalg.norm(Nn, axis=1, keepdims=True)
            C = acc(g, pr.attributes.COLOR_0)[:, :3].astype(float) if pr.attributes.COLOR_0 is not None else np.ones((len(P), 3))
            C = C * np.array(g.materials[pr.material].pbrMetallicRoughness.baseColorFactor[:3])
            I = acc(g, pr.indices).astype(np.uint32).ravel()
            parts.append((i, anc | {i}, P, Nn, C, I))
    for ch in n.children or []: walk(ch, W, anc | {i})
for r in g.scenes[0].nodes: walk(r, np.eye(4), set())
c = dict(hip=0.53, hipsTop=0.58, spineTop=0.70, spine1Top=0.82, neck=0.93, head=1.0, top=1.316, armY=0.914, shoulderX=0.148, elbow=0.288, armW=0.032, wrist=0.472, tip=0.532, legX=0.076, knee=0.36, ankle=0.14, toeZ=0.13)
J = skeleton(c); names = [n for n, _, _ in J]; ix = {n: i for i, n in enumerate(names)}
ARM = {46: 'RightArm', 47: 'RightForeArm', 48: 'RightHand', 50: 'LeftArm', 51: 'LeftForeArm', 52: 'LeftForeArm', 53: 'LeftHand'}
Ps, Ns, Cs, Is, Js, Ws = [], [], [], [], [], []; off = 0; used = {}
for (node, anc, P, Nn, C, I) in parts:
    jn = np.zeros((len(P), 4), np.uint16); wn = np.zeros((len(P), 4), np.float32); wn[:, 0] = 1
    cy = (P[:, 1].min() + P[:, 1].max()) / 2; cx = (P[:, 0].min() + P[:, 0].max()) / 2
    if 90 in anc: b = 'Head'
    elif node == 56: b = 'Neck'
    elif node == 26: b = 'Hips'
    elif node in ARM: b = ARM[node]
    elif 11 in anc or 25 in anc:
        s = 'Left' if cx > 0 else 'Right'; b = s + ('Foot' if cy < c['ankle'] else 'Leg' if cy < c['knee'] else 'UpLeg')
    elif 45 in anc: b = None
    else: raise Exception(f'unassigned node {node}')
    if b: jn[:, 0] = ix[b]; used[b] = used.get(b, 0) + len(P)
    else:
        for k, y in enumerate(P[:, 1]):
            bb_ = 'Spine' if y < c['spineTop'] else 'Spine1' if y < c['spine1Top'] else 'Spine2'; jn[k, 0] = ix[bb_]; used[bb_] = used.get(bb_, 0) + 1
    Ps.append(P); Ns.append(Nn); Cs.append(C); Is.append(I + off); Js.append(jn); Ws.append(wn); off += len(P)
mat = Material(name='VoxelVertexColorMaterial', pbrMetallicRoughness=PbrMetallicRoughness(baseColorFactor=[1, 1, 1, 1], metallicFactor=0.05, roughnessFactor=0.75))
write_skinned(os.path.join(BUILD, 'petike_roller_rigged.glb'), 'PetikeRoller', np.vstack(Ps), np.vstack(Ns), np.vstack(Cs), np.concatenate(Is), J, np.vstack(Js), np.vstack(Ws), mat)
print('roller rigged, verts', off, 'bones used', len(used), dict(sorted(used.items())))
if '--install' in sys.argv: shutil.copy(os.path.join(BUILD, 'petike_roller_rigged.glb'), os.path.join(PUBLIC, 'petike_roller.glb')); print('   → public/petike_roller.glb')
