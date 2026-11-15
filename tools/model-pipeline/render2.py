"""Gyors előnézet: python render2.py a.glb b.glb …  → preview.png (elölről, oldalról, hátulról)"""
import numpy as np,sys,json,struct
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
from pygltflib import GLTF2
import trimesh.transformations as tt
def acc(g,i):
    a=g.accessors[i]; bv=g.bufferViews[a.bufferView]; data=g.binary_blob()
    comp={5126:('f4',4),5123:('u2',2),5125:('u4',4),5121:('u1',1)}[a.componentType]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a.type]
    off=(bv.byteOffset or 0)+(a.byteOffset or 0); stride=bv.byteStride or comp[1]*n
    raw=np.frombuffer(data,dtype=np.uint8,count=bv.byteLength,offset=bv.byteOffset or 0)
    arr=np.lib.stride_tricks.as_strided(np.frombuffer(data,dtype=comp[0],offset=off,count=1) ,shape=(1,),strides=(1,)) # dummy
    out=np.zeros((a.count,n),dtype=np.float64)
    for k in range(a.count):
        out[k]=np.frombuffer(data,dtype=comp[0],count=n,offset=off+k*stride)
    if a.normalized or a.componentType!=5126:
        if a.componentType==5121: out/=255
        if a.componentType==5123 and n>1: out/=65535
    return out
def nodemat(n):
    if n.matrix: return np.array(n.matrix).reshape(4,4).T
    M=np.eye(4)
    if n.scale: M=np.diag(list(n.scale)+[1])@M
    if n.rotation: q=n.rotation; M=tt.quaternion_matrix([q[3],q[0],q[1],q[2]])@M
    if n.translation: M=tt.translation_matrix(n.translation)@M
    return M
def collect(p):
    g=GLTF2().load(p); V=[];F=[];C=[]
    def walk(ni,P):
        n=g.nodes[ni]; M=P@nodemat(n)
        if n.mesh is not None:
            for pr in g.meshes[n.mesh].primitives:
                v=acc(g,pr.attributes.POSITION); v=(M@np.c_[v,np.ones(len(v))].T).T[:,:3]
                if pr.attributes.COLOR_0 is not None: c=acc(g,pr.attributes.COLOR_0)[:,:3]
                else:
                    mt=g.materials[pr.material]; c=np.tile(mt.pbrMetallicRoughness.baseColorFactor[:3],(len(v),1))
                    if pr.material is not None and False: pass
                if pr.material is not None:
                    bf=np.array(g.materials[pr.material].pbrMetallicRoughness.baseColorFactor[:3]); c=c*bf
                idx=acc(g,pr.indices).astype(int).reshape(-1,3)
                F.append(idx+sum(len(x) for x in V)); V.append(v); C.append(c)
        for ch in n.children or []: walk(ch,M)
    for r in g.scenes[g.scene or 0].nodes: walk(r,np.eye(4))
    return np.vstack(V),np.vstack(F),np.vstack(C)
files=sys.argv[1:]
fig,axs=plt.subplots(3,len(files),figsize=(5*len(files),15))
for col,p in enumerate(files):
    v,f,c=collect(p); c=c**(1/2.2)
    for row,view in enumerate(['+z','+x','-z']):
        ax=axs[row][col]
        if view=='+z': P=v[:,[0,1]]; d=v[:,2]
        elif view=='+x': P=v[:,[2,1]]*[-1,1]; d=v[:,0]
        else: P=v[:,[0,1]]*[-1,1]; d=-v[:,2]
        tri=P[f]; dd=d[f].mean(1); o=np.argsort(dd)
        ax.add_collection(PolyCollection(tri[o],facecolors=np.clip(c[f].mean(1)[o],0,1),edgecolors='none'))
        ax.autoscale(); ax.set_aspect('equal'); ax.set_title(p.split('/')[-1]+' from '+view)
plt.tight_layout(); plt.savefig('preview.png',dpi=55); print('preview.png kész')
