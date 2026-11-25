// Petyus kalandjai – 2. rész: az iskola falára kerülő képek, vászonra (canvas) rajzolva: írók és költők arcképei (stilizált,
// régi fényképszerű portrék, névvel és évszámokkal), szorzótábla, Magyarország térképe, órarend, a tábla krétaírása, falióra.
import * as THREE from 'three';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// ---------------------------------------------------------------- portraits: a sepia "photo" of a face, the name and the years
// look: hair colour, bald (a high forehead), beard / moustache, glasses, side parting
export const WRITERS = [
  { name: 'Petőfi Sándor', years: '1823–1849', hair: '#2a1c12', beard: 'full', mous: true },
  { name: 'Arany János', years: '1817–1882', hair: '#d9d4cc', bald: true, beard: 'full', mous: true },
  { name: 'József Attila', years: '1905–1937', hair: '#2b2018', part: true },
  { name: 'Ady Endre', years: '1877–1919', hair: '#1e1610', mous: true },
  { name: 'Móra Ferenc', years: '1879–1934', hair: '#8f8a82', mous: true, glasses: true },
  { name: 'Weöres Sándor', years: '1913–1989', hair: '#6b5a4a', bald: true },
  { name: 'Kosztolányi Dezső', years: '1885–1936', hair: '#3a2a1e', part: true },
  { name: 'Jókai Mór', years: '1825–1904', hair: '#cfc8bd', beard: 'goatee', mous: true },
];
export function portrait(wr) {
  const [c, x] = canvas(256, 340);
  x.fillStyle = '#3a2a1c'; x.fillRect(0, 0, 256, 340);                      // the frame
  x.fillStyle = '#efe3c8'; x.fillRect(14, 14, 228, 312);                     // the mount
  const g = x.createRadialGradient(128, 120, 20, 128, 140, 140); g.addColorStop(0, '#d9c49a'); g.addColorStop(1, '#8a7350');
  x.fillStyle = g; x.fillRect(30, 30, 196, 230);                             // the sepia photo
  // shoulders, coat, collar
  x.fillStyle = '#3b2d22'; x.beginPath(); x.ellipse(128, 262, 92, 60, 0, Math.PI, 0); x.fill();
  x.fillStyle = '#efe6d2'; x.beginPath(); x.moveTo(108, 210); x.lineTo(128, 240); x.lineTo(148, 210); x.closePath(); x.fill();
  x.fillStyle = '#2a1f18'; x.fillRect(122, 214, 12, 26);
  // the face
  x.fillStyle = '#e8c9a0'; x.beginPath(); x.ellipse(128, 140, 46, 58, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#e0bd92'; x.fillRect(116, 186, 24, 26);                     // the neck
  // hair
  x.fillStyle = wr.hair;
  if (wr.bald) { x.beginPath(); x.ellipse(84, 128, 12, 30, 0, 0, Math.PI * 2); x.ellipse(172, 128, 12, 30, 0, 0, Math.PI * 2); x.fill(); }
  else { x.beginPath(); x.ellipse(128, 100, 52, 36, 0, Math.PI, 0); x.fill(); x.fillRect(76, 98, 14, 40); x.fillRect(166, 98, 14, 40); if (wr.part) { x.fillStyle = '#d9b58a'; x.fillRect(104, 70, 3, 26); } }
  // eyes, brows, nose, mouth
  x.fillStyle = '#2a1f18'; x.fillRect(104, 130, 12, 5); x.fillRect(140, 130, 12, 5);
  x.fillStyle = wr.hair; x.fillRect(100, 118, 20, 4); x.fillRect(136, 118, 20, 4);
  x.fillStyle = '#c89c74'; x.fillRect(125, 136, 6, 20);
  x.fillStyle = '#9c5a48'; x.fillRect(116, 168, 24, 4);
  if (wr.glasses) { x.strokeStyle = '#1b1b1b'; x.lineWidth = 3; x.beginPath(); x.arc(110, 132, 11, 0, Math.PI * 2); x.arc(146, 132, 11, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(121, 132); x.lineTo(135, 132); x.stroke(); }
  if (wr.mous) { x.fillStyle = wr.hair; x.beginPath(); x.ellipse(128, 162, 22, 6, 0, 0, Math.PI * 2); x.fill(); }
  if (wr.beard === 'full') { x.fillStyle = wr.hair; x.beginPath(); x.moveTo(86, 150); x.quadraticCurveTo(128, 236, 170, 150); x.lineTo(160, 160); x.quadraticCurveTo(128, 200, 96, 160); x.closePath(); x.fill(); }
  if (wr.beard === 'goatee') { x.fillStyle = wr.hair; x.beginPath(); x.moveTo(112, 172); x.quadraticCurveTo(128, 222, 144, 172); x.closePath(); x.fill(); }
  // the name plate
  x.fillStyle = '#2a1f18'; x.textAlign = 'center'; x.font = 'bold 26px "Patrick Hand", serif'; x.fillText(wr.name, 128, 290);
  x.font = '20px "Patrick Hand", serif'; x.fillText(wr.years, 128, 314);
  return tex(c);
}

// ---------------------------------------------------------------- the multiplication table (10 × 10)
export function timesTable() {
  const [c, x] = canvas(400, 440);
  x.fillStyle = '#fff8e1'; x.fillRect(0, 0, 400, 440); x.strokeStyle = '#e63946'; x.lineWidth = 8; x.strokeRect(4, 4, 392, 432);
  x.fillStyle = '#1d3557'; x.font = 'bold 30px Bangers, sans-serif'; x.textAlign = 'center'; x.fillText('SZORZÓTÁBLA', 200, 40);
  x.font = '17px "Patrick Hand", sans-serif';
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
    const cx = 24 + i * 34, cy = 66 + j * 34;
    if (i === 0 && j === 0) { x.fillStyle = '#e63946'; x.fillText('·', cx + 14, cy + 22); continue; }
    x.fillStyle = i === 0 || j === 0 ? '#ffd166' : (i + j) % 2 ? '#fdf0c4' : '#fff';
    x.fillRect(cx, cy, 32, 32);
    x.fillStyle = i === 0 || j === 0 ? '#1d3557' : '#333'; x.fillText(String(i === 0 ? j : j === 0 ? i : i * j), cx + 16, cy + 22);
  }
  return tex(c);
}
// ---------------------------------------------------------------- the map of Hungary (simplified outline, the Danube and the Tisza)
export function hungaryMap() {
  const [c, x] = canvas(512, 340);
  x.fillStyle = '#cfe6f5'; x.fillRect(0, 0, 512, 340); x.strokeStyle = '#6b4a32'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 330);
  const P = [[40, 150], [70, 120], [110, 112], [150, 80], [200, 86], [250, 70], [300, 60], [350, 52], [410, 40], [450, 70], [470, 110], [440, 150], [430, 190], [390, 230], [350, 262], [300, 280], [250, 286], [200, 290], [150, 282], [110, 250], [80, 230], [60, 200]];
  x.fillStyle = '#b8d98a'; x.beginPath(); x.moveTo(...P[0]); for (const p of P.slice(1)) x.lineTo(...p); x.closePath(); x.fill(); x.strokeStyle = '#7a4a2a'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#9cc46f'; x.beginPath(); x.ellipse(150, 175, 40, 14, -0.3, 0, Math.PI * 2); x.fill();   // the Balaton (green-blue)
  x.fillStyle = '#6fb6e0'; x.beginPath(); x.ellipse(150, 175, 34, 9, -0.3, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#3a86ff'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(90, 108); x.quadraticCurveTo(180, 100, 215, 115); x.quadraticCurveTo(225, 200, 230, 290); x.stroke();   // the Danube
  x.beginPath(); x.moveTo(400, 48); x.quadraticCurveTo(360, 150, 330, 280); x.stroke();                                           // the Tisza
  x.fillStyle = '#e63946'; x.beginPath(); x.arc(220, 130, 7, 0, Math.PI * 2); x.fill(); x.fillStyle = '#1b1b1b'; x.font = 'bold 18px "Patrick Hand", sans-serif'; x.fillText('Budapest', 232, 128);
  x.fillStyle = '#ffca3a'; x.beginPath(); x.arc(217, 150, 5, 0, Math.PI * 2); x.fill(); x.fillStyle = '#1b1b1b'; x.fillText('Tököl', 228, 158);
  x.font = 'bold 26px Bangers, sans-serif'; x.textAlign = 'center'; x.fillText('MAGYARORSZÁG', 256, 324);
  return tex(c);
}
// ---------------------------------------------------------------- the timetable of the 6. b
export function timetable() {
  const [c, x] = canvas(420, 320);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 420, 320); x.strokeStyle = '#2a9d8f'; x.lineWidth = 8; x.strokeRect(4, 4, 412, 312);
  x.fillStyle = '#1d3557'; x.font = 'bold 26px Bangers, sans-serif'; x.textAlign = 'center'; x.fillText('ÓRAREND – 6. B', 210, 36);
  const days = ['H', 'K', 'Sze', 'Cs', 'P'], T = [
    ['Matek', 'Magyar', 'Angol', 'Töri', 'Tesi'], ['Magyar', 'Matek', 'Termtud', 'Matek', 'Magyar'], ['Angol', 'Tesi', 'Matek', 'Magyar', 'Rajz'],
    ['Töri', 'Ének', 'Magyar', 'Angol', 'Matek'], ['Tesi', 'Info', 'Tesi', 'Termtud', 'Ofő']];
  x.font = '16px "Patrick Hand", sans-serif';
  days.forEach((d, i) => { x.fillStyle = '#2a9d8f'; x.fillRect(52 + i * 72, 50, 70, 26); x.fillStyle = '#fff'; x.fillText(d, 87 + i * 72, 69); });
  for (let r = 0; r < 5; r++) {
    x.fillStyle = '#1d3557'; x.fillText(r + 1 + '.', 28, 102 + r * 44);
    for (let i = 0; i < 5; i++) { x.fillStyle = (r + i) % 2 ? '#e9f5f3' : '#fff'; x.fillRect(52 + i * 72, 82 + r * 44, 70, 42); x.fillStyle = '#333'; x.fillText(T[r][i], 87 + i * 72, 108 + r * 44); }
  }
  return tex(c);
}
// ---------------------------------------------------------------- the blackboard's chalk writing
export function boardText(lines) {
  const [c, x] = canvas(640, 180);
  x.fillStyle = '#2f4f3f'; x.fillRect(0, 0, 640, 180); x.fillStyle = '#f2f2ea'; x.font = '36px "Patrick Hand", sans-serif';
  lines.forEach((l, i) => x.fillText(l, 26, 50 + i * 52));
  x.fillStyle = 'rgba(255,255,255,0.08)'; for (let n = 0; n < 30; n++) x.fillRect(Math.random() * 640, Math.random() * 180, 40, 6);   // wiped chalk
  return tex(c);
}
// ---------------------------------------------------------------- the wall clock (redrawn when the game's minute changes)
export function makeClock() {
  const [c, x] = canvas(160, 160), t = tex(c);
  const draw = (min) => {
    x.clearRect(0, 0, 160, 160);
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(80, 80, 74, 0, Math.PI * 2); x.fill(); x.lineWidth = 8; x.strokeStyle = '#2b2d33'; x.stroke();
    x.fillStyle = '#2b2d33'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.fillRect(80 + Math.sin(a) * 58 - 3, 80 - Math.cos(a) * 58 - 3, 6, 6); }
    const h = (min / 60) % 12, m = min % 60;
    const hand = (a, len, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(80, 80); x.lineTo(80 + Math.sin(a) * len, 80 - Math.cos(a) * len); x.stroke(); };
    hand(h / 12 * Math.PI * 2, 36, 7, '#2b2d33'); hand(m / 60 * Math.PI * 2, 54, 4, '#2b2d33');
    x.fillStyle = '#e63946'; x.beginPath(); x.arc(80, 80, 5, 0, Math.PI * 2); x.fill();
    t.needsUpdate = true;
  };
  return { tex: t, draw };
}
