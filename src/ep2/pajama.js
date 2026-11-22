// Petyus kalandjai – 2. rész: pizsama. A meglévő (skinnelt) modellek ruhája átszínezve, mintával (csík, kocka, pötty).
// The clothes are recoloured in the vertex colours (everything below the neck except the hands; the soles become slippers),
// and a pattern attribute (stripe colour + kind) tells the material where to draw the pattern. The pattern is computed from
// the bind-pose position, so it moves with the body when the bones turn (stripes on the sleeves follow the arm).
import * as THREE from 'three';

// neck: the top of the shirt in model units (above it: face, hair – unchanged); kind: 1 stripes, 2 checks, 3 dots
export const PAJAMAS = {
  petyus: { neck: 1.29, base: 0x86bdf0, pat: 0x2f5f9e, kind: 1, slipper: 0x3a6fc4 },
  petya: { neck: 1.53, base: 0x4c607e, pat: 0x8597b5, kind: 2, slipper: 0x6b4f35 },
  angi: { neck: 1.53, base: 0xf3a9c0, pat: 0xffffff, kind: 3, slipper: 0xfafafa },
};

let mat = null;
function pajamaMaterial() {
  if (mat) return mat;
  mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });   // double-sided like the plain character material (rigs.js)
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 pat;\nvarying vec4 vPat;\nvarying vec3 vPP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPat = pat; vPP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPat;\nvarying vec3 vPP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      if (vPat.w > 0.5) {
        float m = 0.0;
        if (vPat.w < 1.5) m = step(0.62, fract((vPP.x + vPP.z) * 7.0));                                   // stripes
        else if (vPat.w < 2.5) m = 0.5 * (step(0.5, fract((vPP.x + vPP.z) * 5.0)) + step(0.5, fract(vPP.y * 5.0)));             // gingham checks
        else { vec3 q = fract(vPP * 8.0) - 0.5; m = 1.0 - step(0.27, length(q)); }                      // dots
        diffuseColor.rgb = mix(diffuseColor.rgb, vPat.rgb, m);
      }`);
  };
  mat.customProgramCacheKey = () => 'pajama';
  return mat;
}

// recolours a rig's meshes (once; the original colours are kept, see undress)
export function dressPajama(rig, who) {
  const p = PAJAMAS[who], base = new THREE.Color(p.base), pc = new THREE.Color(p.pat), sl = new THREE.Color(p.slipper);
  rig.root.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.color) return;
    const g = o.geometry, pos = g.attributes.position, col = g.attributes.color;
    if (!g.userData.origColor) g.userData.origColor = col.array.slice();
    let maxX = 0; for (let i = 0; i < pos.count; i++) maxX = Math.max(maxX, Math.abs(pos.getX(i)));
    const handX = maxX - 0.13, pat = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      if (y > p.neck || Math.abs(x) > handX) continue;              // head, hands: unchanged
      if (y < 0.13) { col.setXYZ(i, sl.r, sl.g, sl.b); continue; }  // shoes → slippers
      col.setXYZ(i, base.r, base.g, base.b);
      pat[i * 4] = pc.r; pat[i * 4 + 1] = pc.g; pat[i * 4 + 2] = pc.b; pat[i * 4 + 3] = p.kind;
    }
    col.needsUpdate = true;
    g.setAttribute('pat', new THREE.BufferAttribute(pat, 4));
    o.material = pajamaMaterial();
  });
}
