// Petyus kalandjai – 2. rész: Petyus nővére a testvér szobájában (zárva). Reggel még alszik a franciaágyban, betakarózva;
// időnként forgolódik a takaró alatt (a takaró vele együtt púposodik, susog). (Az ágy és a takaró: sleep.js)
import { noise, soundAt } from '../audio.js';
import { rigs } from '../state.js';
import { layDown, makeBed, makeBlanket, updateBed } from './sleep.js';

// the bed: bed_double at (1.12, 6.8), headboard on the west wall (x 0.04); mattress top 0.46
export const sis = { bed: null, s: null };

export function buildSister() {
  const rig = rigs.nover; if (!rig) return;
  sis.bed = makeBed({ x: 0.08, z: 6.8, rotY: 0, len: 2.04, width: 1.62, top: 0.46 });
  sis.s = layDown(sis.bed, rig, -0.14);
  sis.s.toss = true;
  sis.s.onToss = () => soundAt(1.1, 6.66, () => { noise(0.7, 900, 0.4, 0.07); noise(0.5, 2600, 0.6, 0.03, 0.3); }, 0.9);   // the blanket rustles
  makeBlanket(sis.bed, 0x9fc6e8, 0xf3f6fb);
}
export function updateSister(dt) { if (sis.bed) updateBed(sis.bed, dt); }
