// Petike a parkban – ui: Szövegbuborékok, toast, nagy felirat.
import { camera } from './scene.js';
import { G } from './state.js';
import { $, V3 } from './util.js';

// ---------------------------------------------------------------- UI helpers
const bubbles = [];
export function say(actor, text, dur = 2.8, name = actor.name) {
  for (const b of bubbles.filter((b) => b.actor === actor)) b.t = 0;
  const el = document.createElement('div'); el.className = 'bubble'; el.innerHTML = (name ? `<b>${name}</b>` : '') + text; $('bubbles').appendChild(el);
  bubbles.push({ actor, el, t: dur });
}
const tmpV = new V3();
export function updateBubbles(dt) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    (b.actor.headWorld ? b.actor.headWorld(tmpV) : tmpV.copy(b.actor.root.position).add(new V3(0, 0.9, 0)));
    tmpV.project(camera);
    b.el.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    b.el.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    b.el.style.opacity = Math.min(1, b.t * 3);
  }
}

export function toast(html, dur = 4) { $('toast').innerHTML = html; $('toast').classList.add('show'); G.toastT = dur; }

export function bigText(txt, dur = 2) { $('big').textContent = txt; $('big').classList.add('show'); G.bigT = dur; }

