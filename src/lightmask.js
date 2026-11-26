// Petyus kalandjai – a lámpák fénye csak a saját helyiségükben (2. rész: a lakás mennyezeti lámpái).
// The flat's ceiling lamps are spot lights with shadows; their shadow maps are coarse (a very wide cone), and the filtering lets
// some light through thin things – the bottom of a wall, a closed door's panels. So each spot light also has a room: in the
// shader its light is cut off outside that box (floor plan; a little over the wall's inner face, so the lit room's own walls
// and the near face of a door get it, the next room's faces do not). The shadows stay; nothing shines through any more.
// It is a ShaderChunk addition (every program has it); the uniforms come from one shared object, given to the Lambert materials
// by a prototype-level onBeforeCompile (the pajamas' own hook calls lightMaskUniforms). A box with x1 ≤ x0 means: no limit
// (the default – the park, the school and every material without the uniforms are not affected).
import * as THREE from 'three';

export const MAX_SPOTS = 4;
const U = { uSpotRoom: { value: Array.from({ length: MAX_SPOTS }, () => new THREE.Vector4(0, 0, 0, 0)) } };   // x0, z0, x1, z1
export function lightMaskUniforms(sh) { Object.assign(sh.uniforms, U); }

THREE.ShaderChunk.common += `
varying vec3 vMaskPos;`;
THREE.ShaderChunk.project_vertex += `
#ifdef USE_INSTANCING
  vMaskPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vMaskPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`;
THREE.ShaderChunk.lights_pars_begin += `
uniform vec4 uSpotRoom[${MAX_SPOTS}];
float spotRoomMask(vec4 r) {
  if (r.z <= r.x) return 1.0;
  return step(r.x, vMaskPos.x) * step(vMaskPos.x, r.z) * step(r.y, vMaskPos.z) * step(vMaskPos.z, r.w);
}`;
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace(
  'getSpotLightInfo( spotLight, geometryPosition, directLight );',
  'getSpotLightInfo( spotLight, geometryPosition, directLight );\n\t\tdirectLight.color *= spotRoomMask( uSpotRoom[ i ] );');
THREE.MeshLambertMaterial.prototype.onBeforeCompile = function (sh) { lightMaskUniforms(sh); };

// the room of spot light i (in scene order – they are the only spot lights): { x0, z0, x1, z1 } in the world, or null (no limit)
export function setSpotRoom(i, r) { if (i < MAX_SPOTS) { if (r) U.uSpotRoom.value[i].set(r.x0, r.z0, r.x1, r.z1); else U.uSpotRoom.value[i].set(0, 0, 0, 0); } }
