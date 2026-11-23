// Petyus kalandjai – audio: WebAudio szintetizált hangok, térhangzás (soundAt), park-alapzaj.
import { camTarget } from './scene.js';
import { G } from './state.js';
import { R, clamp, rand } from './util.js';

// ---------------------------------------------------------------- audio
export let actx = null, master = null, outNode = null, ambBed = null, outBus = null;
let masterVol = 0.5;
// the overall volume (part 2 is indoors, its sounds are small: louder)
export function setMasterVol(v) { masterVol = v; if (master) master.gain.value = v; }
// phones (iOS) suspend the audio when the page is in the background or a call comes in: resume it on the next touch / when visible
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!actx) return; if (document.hidden) actx.suspend().catch(() => {}); else actx.resume().catch(() => {}); });
  window.addEventListener('touchend', () => { if (actx && actx.state !== 'running' && !document.hidden) actx.resume().catch(() => {}); }, { passive: true });
}
export function initAudio() {
  if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = masterVol; master.connect(actx.destination);
    outBus = actx.createGain(); outBus.connect(master); startAmbience(); } catch (e) { actx = null; }
}
// constant park ambience: wind in the leaves (slowly swelling) + far-away traffic rumble
function startAmbience() {
  const s = actx.createBufferSource(); s.buffer = noiseBuf(4); s.loop = true;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.5;
  const g1 = actx.createGain(); g1.gain.value = 0.06; const g2 = actx.createGain(); g2.gain.value = 0.014;
  const lfo = actx.createOscillator(); lfo.frequency.value = 0.11; const lg = actx.createGain(); lg.gain.value = 0.011; lfo.connect(lg); lg.connect(g2.gain);
  s.connect(lp); lp.connect(g1); s.connect(bp); bp.connect(g2);
  ambBed = actx.createGain(); ambBed.gain.value = G.muted ? 0 : 1; g1.connect(ambBed); g2.connect(ambBed); ambBed.connect(outBus);
  s.start(); lfo.start();
}
// play the sounds made inside fn() as if they came from world point (x, z): stereo pan + distance falloff (relative to the camera)
export function soundAt(x, z, fn, vol = 1, bus = master) {
  if (!actx || G.muted) return;
  const dx = x - camTarget.x, dz = z - camTarget.z, d = Math.hypot(dx, dz);
  const sp = actx.createStereoPanner(); sp.pan.value = clamp((dx - dz) / Math.SQRT2 / 16, -0.9, 0.9);   // screen-x (camera right = (1,0,-1)/√2)
  const g = actx.createGain(); g.gain.value = vol * clamp(1.15 - d / 38, 0.12, 1);
  sp.connect(g); g.connect(bus || master); outNode = sp; try { fn(); } finally { outNode = null; }
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
// --- prologue: dramatic sting, tyre screech, electric-motor hum
export const sSting = (low = false) => {
  const f = low ? 49 : 73.4;
  for (const m of [1, 1.5, 2, 3]) tone('sawtooth', f * m, f * m * 0.985, 1.7, 0.09 / m);
  tone('sine', 62, 36, 1.0, 0.4); noise(0.7, 170, 0.7, 0.22);
};
export const sScreech = () => { tone('sawtooth', 1900, 1250, 1.15, 0.03); tone('square', 2450, 1650, 1.05, 0.012); noise(1.15, 3200, 1.6, 0.14); };
// --- snoring (the dozing dad): a rattling in-breath (the soft palate flutters → amplitude-modulated sawtooth through a lowpass),
// a breathy out-breath, and the big snort: a sudden, loud, gurgling burst with a „pfff” after it
function rattle(t, dur, f0, f1, flutter, cutoff, peak, attack) {
  const out = outNode || master;
  const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
  const am = actx.createGain(); am.gain.value = 0.55;
  const lfo = actx.createOscillator(); lfo.type = 'triangle'; lfo.frequency.setValueAtTime(flutter, t); lfo.frequency.linearRampToValueAtTime(flutter * 0.8, t + dur);
  const lg = actx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 4;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(am); am.connect(lp); lp.connect(g); g.connect(out);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}
export function sSnore(big = false) {
  if (!actx || G.muted) return;
  const t = actx.currentTime;
  if (!big) {
    rattle(t, 1.35, 92, 108, 27, 620, 0.32, 0.8);              // hrrrr… (slowly swelling)
    noise(1.35, 480, 1.1, 0.14);                                // the air through the nose
    noise(1.0, 1050, 0.7, 0.07, 1.55);                          // …pfff (out-breath)
    tone('sine', 820, 460, 0.6, 0.025, 1.6);
  } else {
    rattle(t, 0.8, 84, 58, 18, 950, 0.9, 0.05);                 // HRRRK! – sudden and loud
    rattle(t + 0.04, 0.7, 126, 90, 23, 1300, 0.35, 0.05);       // a second, higher layer for the gurgle
    noise(0.75, 330, 1.4, 0.55);
    noise(0.12, 2400, 0.8, 0.25, 0.72);                         // the „k” at the end
    noise(1.1, 1150, 0.7, 0.16, 0.9);                           // pfff…
    tone('sine', 900, 420, 0.7, 0.04, 0.95);
  }
}
export function startHum() {
  if (!actx) return { set() {}, stop() {} };
  const o = actx.createOscillator(), o2 = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
  o.type = 'sawtooth'; o2.type = 'sine'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0;
  o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(); o2.start();
  return {
    set(v) { const t = actx.currentTime; o.frequency.setTargetAtTime(70 + v * 28, t, 0.08); o2.frequency.setTargetAtTime(140 + v * 56, t, 0.08); g.gain.setTargetAtTime(G.muted ? 0 : 0.012 + v * 0.005, t, 0.1); },
    stop() { const t = actx.currentTime; g.gain.setTargetAtTime(0, t, 0.15); o.stop(t + 0.8); o2.stop(t + 0.8); },
  };
}
export const sBell =() => { for (const d of [0, 0.17]) { tone('sine', 2350, 2330, 0.55, 0.11, d); tone('sine', 5640, 5600, 0.3, 0.035, d); tone('triangle', 1175, 1170, 0.4, 0.04, d); } };
export const sHorn = (twice) => { for (const d of twice ? [0, 0.3] : [0]) { tone('square', 330, 326, twice ? 0.2 : 0.45, 0.05, d); tone('square', 415, 411, twice ? 0.2 : 0.45, 0.045, d); } };


// part 2, the creamy coffee: a stomach growl (low, wobbling) and farts (a buzzing low reed + a puff of noise; len 0.3 … 1.6 s)
export function sGrowl(vol = 1) {
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) { const d = i * 0.22 + Math.random() * 0.05; tone('sawtooth', 62 + Math.random() * 25, 40 + Math.random() * 15, 0.3, 0.07 * vol, d); noise(0.28, 140, 4, 0.12 * vol, d); }
  tone('sine', 95, 55, n * 0.22 + 0.3, 0.06 * vol);
}
export function sFart(len = 0.6, pitch = 1, vol = 1) {
  const n = Math.max(2, Math.round(len / 0.07));
  for (let i = 0; i < n; i++) {
    const d = i * (len / n), f = (95 + Math.random() * 40) * pitch * (1 - i / n * 0.35);
    tone('sawtooth', f, f * 0.8, len / n * 1.3, 0.09 * vol, d); tone('square', f * 0.5, f * 0.45, len / n * 1.2, 0.035 * vol, d);
  }
  noise(len, 260 * pitch, 1.5, 0.22 * vol); noise(0.25, 900, 0.8, 0.06 * vol, len * 0.9);
}

// the world outside (part 2): the ambience bed and the yard / street sounds go through outBus – faded out indoors in the
// first-person view (level 0 … 1, smooth). Play an outdoor sound: soundOut(x, z, fn, vol).
export function setOutdoor(level) { if (outBus) outBus.gain.setTargetAtTime(level, actx.currentTime, 0.25); }
export const soundOut = (x, z, fn, vol = 1) => soundAt(x, z, fn, vol, outBus);
// a footstep in slippers: a soft thud (wood, carpet) or a dry tap (tiles, stone, the balcony); hard: running
export function sStep(kind = 'wood', hard = 0) {
  const v = 1 + hard * 0.6, f = { wood: 260, wood2: 260, tile: 900, kitchen: 800, stone: 700, balcony: 1100 }[kind] || 400;
  noise(0.05, f * (0.9 + Math.random() * 0.2), 1.4, 0.05 * v);
  tone('sine', 95 + Math.random() * 20, 60, 0.05, 0.035 * v);
}

// ---------------------------------------------------------------- voices: a babble when Petya, Angi or Petyus speaks
// Not words – a quick run of sung syllables in the speaker's own voice, so you hear who talks: Petya deep and buzzy, Angi
// mid and soft, Petyus high and chirpy (and quick). One syllable per vowel of the line (at most 14, and it fits the bubble's
// time); a shout is louder and higher, a mutter quiet and low, a question goes up at the end. From where the speaker stands.
const VOICES = {
  Petya: { f: 112, type: 'sawtooth', syl: 0.11, vol: 0.045, spread: 0.22, over: 0.012 },
  Angi: { f: 245, type: 'triangle', syl: 0.1, vol: 0.085, spread: 0.32, over: 0.02 },
  Petyus: { f: 370, type: 'square', syl: 0.078, vol: 0.03, spread: 0.36, over: 0.01 },
};
const VOWELS = /[aáeéiíoóöőuúüű]/gi;
export function hasVoice(who) { return !!VOICES[who]; }
export function sVoice(who, text, kind = 'normal', dur = 3) {
  const v = VOICES[who]; if (!v || !actx || G.muted) return;
  const shout = kind === 'shout', mutter = kind === 'mutter';
  let f = v.f * (shout ? 1.28 : mutter ? 0.86 : 1), vol = v.vol * (shout ? 1.7 : mutter ? 0.5 : 1), syl = v.syl * (shout ? 0.92 : mutter ? 1.15 : 1);
  const n = Math.max(1, Math.min(14, (text.match(VOWELS) || []).length, Math.floor(dur * 0.75 / syl)));
  const ask = /\?\s*$/.test(text);
  let t = 0;
  for (let i = 0; i < n; i++) {
    const k = i / Math.max(1, n - 1);
    // the phrase falls a little towards its end (a question rises instead); each syllable wobbles round it
    const contour = ask && k > 0.7 ? 1 + (k - 0.7) * 1.1 : 1 - k * 0.12;
    const p = f * contour * (1 + (Math.random() - 0.5) * v.spread), d = syl * (0.75 + Math.random() * 0.5);
    tone(v.type, p, p * (0.93 + Math.random() * 0.1), d * 0.85, vol, t);
    tone('sine', p * 2.01, p * 1.9, d * 0.7, vol * 0.35 + v.over, t);           // a little brightness on top (a 'vowel')
    if (Math.random() < 0.45) noise(0.025, 2600 + Math.random() * 1800, 1.2, vol * 0.6, t);   // a consonant now and then
    t += d + (Math.random() < 0.18 ? syl * 0.6 : 0);                           // short pauses between 'words'
  }
}
