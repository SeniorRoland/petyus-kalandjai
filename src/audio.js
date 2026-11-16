// Petike a parkban – audio: WebAudio szintetizált hangok, térhangzás (soundAt), park-alapzaj.
import { camTarget } from './scene.js';
import { G } from './state.js';
import { R, clamp, rand } from './util.js';

// ---------------------------------------------------------------- audio
export let actx = null, master = null, outNode = null, ambBed = null;
export function initAudio() {
  if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination); startAmbience(); } catch (e) { actx = null; }
}
// constant park ambience: wind in the leaves (slowly swelling) + far-away traffic rumble
function startAmbience() {
  const s = actx.createBufferSource(); s.buffer = noiseBuf(4); s.loop = true;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.5;
  const g1 = actx.createGain(); g1.gain.value = 0.06; const g2 = actx.createGain(); g2.gain.value = 0.014;
  const lfo = actx.createOscillator(); lfo.frequency.value = 0.11; const lg = actx.createGain(); lg.gain.value = 0.011; lfo.connect(lg); lg.connect(g2.gain);
  s.connect(lp); lp.connect(g1); s.connect(bp); bp.connect(g2);
  ambBed = actx.createGain(); ambBed.gain.value = G.muted ? 0 : 1; g1.connect(ambBed); g2.connect(ambBed); ambBed.connect(master);
  s.start(); lfo.start();
}
// play the sounds made inside fn() as if they came from world point (x, z): stereo pan + distance falloff (relative to the camera)
export function soundAt(x, z, fn, vol = 1) {
  if (!actx || G.muted) return;
  const dx = x - camTarget.x, dz = z - camTarget.z, d = Math.hypot(dx, dz);
  const sp = actx.createStereoPanner(); sp.pan.value = clamp((dx - dz) / Math.SQRT2 / 16, -0.9, 0.9);   // screen-x (camera right = (1,0,-1)/√2)
  const g = actx.createGain(); g.gain.value = vol * clamp(1.15 - d / 38, 0.12, 1);
  sp.connect(g); g.connect(master); outNode = sp; try { fn(); } finally { outNode = null; }
}
function noiseBuf(dur) { const b = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
export function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
  if (!actx || G.muted) return; const t = actx.currentTime + delay; const o = actx.createOscillator(); const g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, 0.01, vol, dur); o.connect(g); g.connect(outNode || master); o.start(t); o.stop(t + dur + 0.05);
}
export function noise(dur, freq, q, vol, delay = 0, type = 'bandpass') {
  if (!actx || G.muted) return; const t = actx.currentTime + delay; const s = actx.createBufferSource(); s.buffer = noiseBuf(dur + 0.05);
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = actx.createGain();
  env(g, t, Math.min(0.08, dur * 0.3), vol, dur); s.connect(f); f.connect(g); g.connect(outNode || master); s.start(t); s.stop(t + dur + 0.1);
}
export const sKick = (p) => { tone('sine', 160, 45, 0.18, 0.5 + p * 0.3); noise(0.06, 1800, 1, 0.25 + p * 0.2); };
export const sBounce = (v) => tone('sine', 120, 60, 0.08, clamp(v * 0.05, 0.02, 0.2));
export const sThunk = (v) => { tone('square', 90, 50, 0.07, clamp(v * 0.02, 0.01, 0.08)); noise(0.08, 900, 2, clamp(v * 0.03, 0.02, 0.15)); };
export const sPoof = () => noise(0.5, 2500, 0.6, 0.25, 0, 'highpass');
export const sWhistle = () => { for (let i = 0; i < 3; i++) { tone('sine', 2400, 2600, i === 2 ? 0.6 : 0.15, 0.12, i * 0.22); tone('sine', 2470, 2550, i === 2 ? 0.6 : 0.15, 0.06, i * 0.22); } };
export const sCheer = () => { noise(1.8, 1200, 0.5, 0.25); noise(1.5, 600, 0.7, 0.18, 0.1); };
export const sBark = () => { tone('sawtooth', 520, 260, 0.12, 0.12); tone('sawtooth', 500, 250, 0.12, 0.12, 0.18); };
export const sMeow = () => tone('triangle', 700, 1000, 0.35, 0.08);
const sChirp = () => { const f = R(2800, 4200); for (let i = 0; i < 3; i++) tone('sine', f, f * 1.35, 0.07, 0.04, i * 0.11); };
export const sPop = () => tone('sine', 600, 1200, 0.12, 0.15);
export const sFlap = () => noise(0.3, 800, 0.8, 0.08);
// --- ambience voices
export function sBird(d = 0) {   // four kinds of songbird
  const k = Math.floor(rand() * 4), f = R(2600, 4400), v = R(0.05, 0.09);
  if (k === 0) for (let i = 0; i < 3; i++) tone('sine', f, f * 1.35, 0.07, v, d + i * 0.11);                                  // chirp-chirp-chirp
  else if (k === 1) { const n = 6 + Math.floor(rand() * 6); for (let i = 0; i < n; i++) tone('sine', f * 1.1, f * 0.9, 0.035, v * 0.8, d + i * 0.045); }   // trill
  else if (k === 2) { tone('sine', f * 1.2, f * 0.8, 0.16, v, d); tone('sine', f * 1.2, f * 0.8, 0.16, v, d + 0.24); }       // tsee-u, tsee-u
  else { for (let i = 0; i < 4; i++) tone('triangle', f * (1 + (i % 2) * 0.25), f * (1.1 + (i % 2) * 0.2), 0.09, v * 0.7, d + i * 0.1); }   // warble
}
export const sBell = () => { for (const d of [0, 0.17]) { tone('sine', 2350, 2330, 0.55, 0.11, d); tone('sine', 5640, 5600, 0.3, 0.035, d); tone('triangle', 1175, 1170, 0.4, 0.04, d); } };
export const sHorn = (twice) => { for (const d of twice ? [0, 0.3] : [0]) { tone('square', 330, 326, twice ? 0.2 : 0.45, 0.05, d); tone('square', 415, 411, twice ? 0.2 : 0.45, 0.045, d); } };

