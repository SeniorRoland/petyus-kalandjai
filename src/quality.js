// Petyus kalandjai – quality: grafikai minőség (asztal / telefon) és automatikus visszaváltás lassú eszközön.
// Szintek: 2 = teljes (asztali gép) · 1 = mobil (kisebb felbontás, nincs élsimítás, kisebb árnyéktérkép, fele annyi részecske)
// · 0 = minimális (1× felbontás, árnyék nélkül, negyed annyi részecske). Telefonon/tableten 1-ről indul; ha a játék
// tartósan 25 kép/mp alatt fut, egy szinttel lejjebb vált (`watchFrame`). URL-ből felülírható: ?quality=high|mobile|low.
// Only reads browser globals at load time (no imports from the game) – scene.js builds the renderer with it.
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const touchy = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
export const MOBILE = coarse || (touchy && Math.min(screen.width, screen.height) < 820);
const forced = { high: 2, mobile: 1, low: 0 }[new URLSearchParams(location.search).get('quality')];
export const Q = {
  level: forced ?? (MOBILE ? 1 : 2),
  forced: forced !== undefined,
  get pixelRatio() { const dpr = window.devicePixelRatio || 1; return this.level >= 2 ? Math.min(dpr, 2) : this.level === 1 ? Math.min(dpr, 1.25) : 1; },
  get antialias() { return this.level >= 2; },
  get shadowSize() { return this.level >= 2 ? 2048 : this.level === 1 ? 1024 : 0; },
  get fxKeep() { return this.level >= 2 ? 1 : this.level === 1 ? 0.5 : 0.25; },   // share of the particles actually spawned
  get maxFx() { return this.level >= 2 ? 600 : this.level === 1 ? 160 : 70; },     // live particles at most
};
// fewer particles on weaker devices (Math.random, not the seeded rand(): the world stays deterministic)
export const fxAllowed = (alive) => alive < Q.maxFx && (Q.fxKeep >= 1 || Math.random() < Q.fxKeep);

let applyFn = null;
// scene.js registers how to apply a level to the renderer / sun (resolution, shadows)
export function onQualityChange(fn) { applyFn = fn; fn(Q); }

// frame-time watchdog: a slow moving average of the frame time; sustained slowness → one level down
let avg = 1 / 60, slowT = 0, graceT = 4;
export function watchFrame(dtReal, active, notify) {
  if (Q.forced || Q.level === 0 || !active) { slowT = 0; return; }
  if ((graceT -= dtReal) > 0) return;                  // let it settle after loading / a level change
  avg += (dtReal - avg) * 0.05;
  slowT = avg > 1 / 25 ? slowT + dtReal : Math.max(0, slowT - dtReal);
  if (slowT > 4) {
    Q.level--; slowT = 0; graceT = 5; avg = 1 / 40;
    if (applyFn) applyFn(Q);
    if (notify) notify(Q.level);
  }
}
