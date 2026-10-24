// Accessibility helpers: colour-blind assist filter and controller-aware button prompts.
import { settings } from './settings.js';
import { padActive, padMap, inMenu, getPadInfo, codeName, actionOfDefault } from './keys.js';
import { BINDINGS } from '../config.js';

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
// The key the player actually uses for what `code` did by default (rebinding and keyboard layouts both honoured).
export function keyLabel(code) {
  const act = actionOfDefault(code);
  if (act && BINDINGS[act]?.[0]) return codeName(BINDINGS[act][0]);
  return codeName(code);
}
// In menus a standard pad confirms with A and backs out with B, whatever the gameplay map says (see keys.js).
const MENU_LABEL = { KeyE: 'A', Enter: 'A', Escape: 'B' };
// Pack, journal and map have no button of their own: START opens the menu on the last tab used.
const VIA_START = { KeyI: 'START', KeyO: 'START', KeyM: 'START' };
export function padLabel(code) {
  if (inMenu() && getPadInfo().mapping !== 'non-standard' && MENU_LABEL[code]) return MENU_LABEL[code];
  const m = padMap();
  const id = Object.keys(m).filter((k) => m[k] === code).sort((a, b) => (/^b\d+$/.test(a) ? 0 : 1) - (/^b\d+$/.test(b) ? 0 : 1))[0];
  return id ? (PAD_NAME[id] || id.toUpperCase()) : VIA_START[code] || null;
}
// What to show the player for a virtual key right now: the pad button if a controller was used last, else the key.
export function prompt(code) { return (padActive() && padLabel(code)) || keyLabel(code); }
// Text with {KeyC}-style tokens (speech, item descriptions) filled in with the keys the player actually uses.
export const keyText = (s) => String(s).replace(/\{(\w+)\}/g, (_, c) => prompt(c));

// Keyboard hints like "E USE  F OFFHAND  ESC CLOSE" or "E: TALK", rewritten for the controller when it was used last:
// each hint's leading key becomes the button that sends it ("A USE  X OFFHAND  START CLOSE"). Mouse-only hints are dropped.
const PAIR = { 'W/S': 'UP/DOWN', 'A/D': 'LEFT/RIGHT', 'WASD': 'L-STICK', 'W/S/A/D': 'D-PAD' };
const PAIR_FOR = (tok, rest) => (tok === 'A/D' && /^\s*TAB/.test(rest) && inMenu() ? 'LB/RB' : PAIR[tok]);
const codeOf = (tok) => (tok === 'ESC' ? 'Escape' : tok === 'SPACE' ? 'Space' : tok === 'ENTER' ? 'Enter' : /^[A-Z]$/.test(tok) ? 'Key' + tok : /^[0-9]$/.test(tok) ? 'Digit' + tok : null);
const SHORT = (n) => n.replace('R-STICK ', 'RS ').replace('D-PAD ', 'DP ').replace(/\b(UP|DOWN|LEFT|RIGHT)$/, (d) => d[0]);
export function padKey(tok, short = false) {
  if (PAIR[tok]) return PAIR[tok];
  if (tok.includes('/')) return tok.split('/').map((t) => padKey(t, short)).join('/');
  const c = codeOf(tok), n = (c && padLabel(c)) || tok;
  return short ? SHORT(n) : n;
}
// max: characters that fit; a long pad line first shortens stick names ("RS D"), then closes the gaps, then drops hints off the end.
// Keyboard: hints written with default letters ("E USE") follow the player's bindings and layout ("F USE" after rebinding).
function kbHint(text) {
  if (!text) return text;
  const tr = (tok) => tok.split('/').map((t) => { const c = codeOf(t); if (!c) return t; const act = actionOfDefault(c); return act && BINDINGS[act]?.[0] ? codeName(BINDINGS[act][0]) : t; }).join('/');
  if (/^[A-Z0-9]+: /.test(text)) { const i = text.indexOf(':'); return tr(text.slice(0, i)) + text.slice(i); }
  return text.split(/(\s{2,})/).map((seg) => { if (/^\s+$/.test(seg)) return seg; const m = seg.match(/^(\S+)(\s.*)$/); return m && !PAIR[m[1]] && codeOf(m[1].split('/')[0]) ? tr(m[1]) + m[2] : seg; }).join('');
}
export function padHint(text, max = Infinity) {
  if (!text) return text;
  if (!padActive()) return kbHint(text);
  if (/^[A-Z0-9]+: /.test(text)) { const i = text.indexOf(':'); return padKey(text.slice(0, i)) + text.slice(i); }     // "E: TALK"
  const segs = (short) => text.split(/\s{2,}/).filter((seg) => seg && !/^OR CLICK$|^CLICK OK$/.test(seg)).map((seg) => {
    const m = seg.match(/^(\S+)(\s.*)$/);
    if (m && PAIR_FOR(m[1], m[2]) !== PAIR[m[1]]) return PAIR_FOR(m[1], m[2]) + m[2];
    return m && (PAIR[m[1]] || codeOf(m[1].split('/')[0])) ? padKey(m[1], short) + m[2] : seg;
  });
  let list = segs(false), gap = '  ';
  if (list.join(gap).length > max) list = segs(true);
  if (list.join(gap).length > max) gap = ' ';
  while (list.length > 1 && list.join(gap).length > max) list.pop();
  return list.join(gap);
}
