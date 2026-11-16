// Petyus kalandjai – state: Közös játékállapot (G) és a fő objektumok (labda, roller, listák).
import * as THREE from 'three';
import { V3 } from './util.js';

// the series: 12 episodes, one per month, starting with August. Only the `ready` ones can be played (for now: August).
// art = one panel of a 2×2 season image (public/evszak-nyar.webp: cycling · mountain hike / beach · scooters in the park;
// public/evszak-osz-tel.webp: autumn hike · autumn cycling / sledding · ice skating); without art: a month icon on a seasonal gradient.
// The start screen's background is the cover image (public/kezdokep.webp).
export const SERIES = 'Petyus kalandjai';
const NYAR = 'evszak-nyar.webp', OSZTEL = 'evszak-osz-tel.webp';
export const EPISODES = [
  { n: 1, month: 'Augusztus', day: 'Vasárnap', sub: 'Vasárnap a parkban', art: { img: NYAR, col: 1, row: 1 }, ready: true },
  { n: 2, month: 'Szeptember', art: { img: NYAR, col: 0, row: 0 } },
  { n: 3, month: 'Október', art: { img: OSZTEL, col: 0, row: 0 } },
  { n: 4, month: 'November', art: { img: OSZTEL, col: 1, row: 0 } },
  { n: 5, month: 'December', art: { img: OSZTEL, col: 0, row: 1 } },
  { n: 6, month: 'Január', art: { img: OSZTEL, col: 1, row: 1 } },
  { n: 7, month: 'Február', icon: '🎭', c: ['#c58ee6', '#6b3fa0'] },
  { n: 8, month: 'Március', icon: '🌷', c: ['#ffb3c7', '#e0607e'] },
  { n: 9, month: 'Április', icon: '🐣', c: ['#fff1a6', '#9fd36a'] },
  { n: 10, month: 'Május', icon: '🌼', c: ['#fff3a0', '#7cc96b'] },
  { n: 11, month: 'Június', art: { img: NYAR, col: 1, row: 0 } },
  { n: 12, month: 'Július', art: { img: NYAR, col: 0, row: 1 } },
];
export const EPISODE = EPISODES[0];   // the one this build plays

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

