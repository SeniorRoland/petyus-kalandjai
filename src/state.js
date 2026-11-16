// Petyus kalandjai – state: Közös játékállapot (G) és a fő objektumok (labda, roller, listák).
import * as THREE from 'three';
import { V3 } from './util.js';

// shared, reassigned-from-anywhere game state (was module-level 'let's in game.js)
// the series: 12 episodes, one per month, starting with August. Only the `ready` ones can be played (for now: August).
// art = panel of the cover image (public/kezdokep.webp: 0 cycling · 1 mountain hike · 2 beach · 3 scooters in the park);
// without art the tile shows a month icon on a seasonal gradient.
export const SERIES = 'Petyus kalandjai';
export const EPISODES = [
  { n: 1, month: 'Augusztus', day: 'Vasárnap', sub: 'Vasárnap a parkban', art: 3, ready: true },
  { n: 2, month: 'Szeptember', icon: '🎒', c: ['#f6c560', '#d9822b'] },
  { n: 3, month: 'Október', art: 1 },
  { n: 4, month: 'November', icon: '🍂', c: ['#c97b3d', '#7a4a2a'] },
  { n: 5, month: 'December', icon: '🎄', c: ['#3f8f5a', '#1d4a32'] },
  { n: 6, month: 'Január', icon: '⛄', c: ['#bfe3f7', '#6fa8d6'] },
  { n: 7, month: 'Február', icon: '🎭', c: ['#c58ee6', '#6b3fa0'] },
  { n: 8, month: 'Március', icon: '🌷', c: ['#ffb3c7', '#e0607e'] },
  { n: 9, month: 'Április', icon: '🐣', c: ['#fff1a6', '#9fd36a'] },
  { n: 10, month: 'Május', art: 0 },
  { n: 11, month: 'Június', icon: '🍓', c: ['#ff9a8a', '#e04b4b'] },
  { n: 12, month: 'Július', art: 2 },
];
export const EPISODE = EPISODES[0];   // the one this build plays

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

