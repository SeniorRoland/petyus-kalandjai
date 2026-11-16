// Petike a parkban – state: Közös játékállapot (G) és a fő objektumok (labda, roller, listák).
import * as THREE from 'three';
import { V3 } from './util.js';

// shared, reassigned-from-anywhere game state (was module-level 'let's in game.js)
export const G = {
  clockT: 0,   // util.js
  viewSize: 9,   // scene.js
  viewSizeTarget: 9,   // scene.js
  zoomOverride: 0,   // scene.js
  muted: false,   // audio.js
  toastT: 0,   // ui.js
  bigT: 0,   // ui.js
  kickPressed: false,   // input.js
  kickReleased: false,   // input.js
  petya: undefined,   // state.js
  angi: undefined,   // state.js
  petike: undefined,   // state.js
  rollerModel: undefined,   // state.js
  mode: 'loading',   // state.js – loading | title | intro | play
  score: 0,   // state.js
  goalLock: 0,   // state.js
  charging: false,   // player.js
  kickPower: 0,   // player.js
  kickDone: false,   // player.js
  pstate: 'free',   // activities/drinking.js
  usePressed: false,   // activities/drinking.js
  drinkT: 0,   // activities/drinking.js
  gulpT: 0,   // activities/drinking.js
  rollerCol: null,   // activities/drinking.js
  lastKick: null,   // activities/drinking.js
  qPressed: false,   // activities/juggle.js
  petyaMode: 'bench',   // dad.js
};

// ---------------------------------------------------------------- game state
export let rigs = {};
export const roller = { group: new THREE.Group(), pos: new V3(), heading: 0, path: null, speed: 1.6, t: 0, rider: null, lean: 0, weaveAmp: 0 };
export const ball = { mesh: null, pos: new V3(0, -10, 0), vel: new V3(), r: 0.17, active: false, scale: 1, hitCd: 0 };

export const npcs = [], animals = [], pigeons = [], cars = [];

