"""A rolleres Petike (dobozokból álló modell) T-pose-ba állítása: vállak ±90°, könyök egyenes,
test/fej/lábfej elfordítás nélkül, középre igazítva.  models/source/petike_roller.glb → models/build/petike_roller_tpose.glb"""
from pygltflib import GLTF2
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'models', 'source'); BUILD = os.path.join(ROOT, 'models', 'build'); PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(BUILD, exist_ok=True)

g = GLTF2().load(os.path.join(SRC, 'petike_roller.glb'))
def rot_only(i, rz=None):
    n = g.nodes[i]; t = n.matrix[12:15]
    c, s = (1.0, 0.0) if rz is None else (0.0, rz)
    n.matrix = [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1]
g.nodes[91].matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]   # gyökér: egyenesen előre, origóba
for i in (90, 11, 21, 24): rot_only(i)                                  # fej és lábak egyenesen
rot_only(49, -1.0); rot_only(55, 1.0)                                   # vállak: karok oldalra (±90°)
rot_only(54)                                                            # könyök egyenes
g.asset.generator = 'Petike T-pose converter'
g.save_binary(os.path.join(BUILD, 'petike_roller_tpose.glb'))
print('models/build/petike_roller_tpose.glb kész')
