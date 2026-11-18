// Petyus kalandjai – ambience: Környezeti hangok: madarak, biciklicsengő, autódudálás, kutyaugatás.
import { actx, sBark, sBell, sBird, sHorn, soundAt } from './audio.js';
import { camTarget } from './scene.js';
import { G, animals, cars } from './state.js';
import { say } from './ui.js';
import { R, pick, rand } from './util.js';
import { TREES } from './world.js';

// ---------------------------------------------------------------- ambience (birds, bike bells, car horns, dogs)
const amb = { bird: 1.5, bell: 12, horn: 8, dog: 6 };
export function updateAmbience(dt) {
  if (!actx || G.muted) return;
  amb.bird -= dt; amb.bell -= dt; amb.horn -= dt; amb.dog -= dt;
  if (amb.bird <= 0) {
    // a bird in one of the trees near the camera, sometimes answered by another
    amb.bird = R(1.0, 3.2);
    const near = TREES.filter((t) => Math.hypot(t.x - camTarget.x, t.z - camTarget.z) < 32);
    const t = near.length ? pick(near) : { x: camTarget.x + R(-20, 20), z: camTarget.z + R(-20, 20) };
    soundAt(t.x, t.z, () => sBird(), 1.2);
    if (rand() < 0.35) { const u = near.length ? pick(near) : t; soundAt(u.x, u.z, () => sBird(R(0.35, 0.7)), 1.1); }
  }
  if (amb.bell <= 0) {   // a cyclist rings on the street
    amb.bell = R(12, 26); const x = camTarget.x + R(-18, 18);
    soundAt(x, 16, sBell, 1.3);
  }
  if (amb.horn <= 0 && cars.length) {   // an impatient driver
    amb.horn = R(9, 20); const c = pick(cars), twice = rand() < 0.5;
    soundAt(c.x, c.z, () => sHorn(twice), 1.4);
    if (Math.abs(c.x - camTarget.x) < 26) say({ headWorld: (v) => v.set(c.x, 1.7, c.z) }, twice ? 'Tütü!' : 'TÜÜÜT!', 1.2, '');
  }
  if (amb.dog <= 0) {
    amb.dog = R(7, 15); const dogs = animals.filter((a) => a.type === 'free' || a.type === 'leashed');
    if (dogs.length) { const d = pick(dogs); soundAt(d.pos.x, d.pos.z, sBark, 1.4); if (Math.hypot(d.pos.x - camTarget.x, d.pos.z - camTarget.z) < 22) say({ headWorld: (v) => v.set(d.pos.x, 1.0, d.pos.z) }, pick(['Vau! Vau!', 'Vaú!', 'Vau-vau-vau!']), 1.3, ''); }
  }
}

