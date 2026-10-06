// Accessibility helpers: colour-blind assist filter and controller-aware button prompts.
import { settings } from './settings.js';
import { padActive, padMap } from './keys.js';

export const CVD_MODES = ['off', 'deutan', 'protan', 'tritan'];
// Machado-style simulation matrices; the filter adds the lost colour difference back into the remaining channels.
const SIM = {
  deutan: [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]],
  protan: [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]],
  tritan: [[1.256, -0.077, -0.179], [-0.078, 0.931, 0.148], [0.005, 0.691, 0.304]],
};
const SHIFT = {
  deutan: [[1, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  protan: [[1, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  tritan: [[1, 0, 0.7], [0, 1, 0.7], [0, 0, 1]],
};
export function cvdMatrix(mode) {
  const sim = SIM[mode], sh = SHIFT[mode];
  if (!sim) return [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  const out = [];
  for (let r = 0; r < 3; r++) {
    const row = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      let e = 0;
      for (let k = 0; k < 3; k++) e += sh[r][k] * ((k === c ? 1 : 0) - sim[k][c]);   // C * (I - Ms)
      row[c] = (r === c ? 1 : 0) + e;
    }
    out.push(...row.map((v) => +v.toFixed(4)), 0, 0);
  }
  out.push(0, 0, 0, 1, 0);
  return out;
}
export function applyCvd() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('cvd-filter');
  if (!el) {
    const host = document.createElement('div');
    host.innerHTML = '<svg width="0" height="0" style="position:absolute"><filter id="cvd-filter" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=""/></filter></svg>';
    document.body.appendChild(host);
    el = document.getElementById('cvd-filter');
  }
  el.firstElementChild.setAttribute('values', cvdMatrix(settings.cvd).join(' '));
  document.body.style.filter = settings.cvd && settings.cvd !== 'off' ? 'url(#cvd-filter)' : '';
}

// Controller button names (standard layout) for prompts.
const PAD_NAME = { b0: 'A', b1: 'B', b2: 'X', b3: 'Y', b4: 'LB', b5: 'RB', b6: 'LT', b7: 'RT', b8: 'BACK', b9: 'START', b10: 'L3', b11: 'R3', hu: 'D-PAD UP', hd: 'D-PAD DOWN', hl: 'D-PAD LEFT', hr: 'D-PAD RIGHT', 'a2-': 'R-STICK LEFT', 'a2+': 'R-STICK RIGHT', 'a3-': 'R-STICK UP', 'a3+': 'R-STICK DOWN' };
export function keyLabel(code) {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Space', 'SPACE').replace('Escape', 'ESC').replace('Arrow', '').toUpperCase();
}
export function padLabel(code) {
  const m = padMap();
  const id = Object.keys(m).filter((k) => m[k] === code).sort((a, b) => (/^b\d+$/.test(a) ? 0 : 1) - (/^b\d+$/.test(b) ? 0 : 1))[0];
  return id ? (PAD_NAME[id] || id.toUpperCase()) : null;
}
// What to show the player for a virtual key right now: the pad button if a controller was used last, else the key.
export function prompt(code) { return (padActive() && padLabel(code)) || keyLabel(code); }
