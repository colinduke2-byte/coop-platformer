// Baked tints (VX-03). Phaser's Canvas renderer ignores setTint / setTintFill, and under WebGL a multiply tint makes
// colours that are not in the palette. So every tint asked of an Image or a Sprite whose texture is our own drawn art is
// turned into a palette-remapped copy of that texture, built once the first time that (texture, tint) pair is used:
//   setTint(c)      each palette colour of the art -> the palette colour nearest to (colour x c)
//   setTintFill(c)  every opaque pixel but the dark outline -> the palette colour nearest to c (hit flashes, death fades)
//   clearTint()     back to the original texture
// The copy keeps the frame names of the original, so setFrame keeps working, and a later setTexture keeps the tint (as Phaser
// does). The result looks the same on Canvas and WebGL. Gradient tints (four corners), text and render textures keep the
// renderer's own tint. A copy is named '~<mode><hex>~<key>' and is never touched by the art baseline.
import Phaser from 'phaser';
import { PAL } from '../config.js';

const RGB = PAL.map((h) => parseInt(h.slice(1), 16));
const PAL_INDEX = new Map(RGB.map((c, i) => [c, i]));
const near = new Map();
// nearest palette colour (weighted RGB distance, "redmean")
export function nearestPal(rgb) {
  let k = near.get(rgb);
  if (k !== undefined) return k;
  const r = rgb >> 16, g = (rgb >> 8) & 255, b = rgb & 255;
  let best = 0, bd = Infinity;
  for (let i = 0; i < 16; i++) {
    const c = RGB[i], dr = r - (c >> 16), dg = g - ((c >> 8) & 255), db = b - (c & 255), rm = (r + (c >> 16)) / 2;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  near.set(rgb, best);
  return best;
}
const mul = (a, t) => ((((a >> 16) * (t >> 16)) / 255) << 16) | (((((a >> 8) & 255) * ((t >> 8) & 255)) / 255) << 8) | (((a & 255) * (t & 255)) / 255);
// palette index -> palette index for a multiply tint. Hand-picked remaps for tints where the nearest colour would lose the
// variant (the art looked like its base creature): see REMAPS.
export const REMAPS = {};
// The palette colours a tint of this hue may land on (the outline 0 is always kept). Choosing among them, not among all 16,
// stops a tan tint from turning brown fur green or a blue one from turning steel purple.
const FAMILY = [
  [15, [11, 12, 9, 1, 13]], [40, [12, 11, 13, 9, 10, 1]], [70, [13, 10, 9, 12, 1, 6]], [165, [8, 7, 1, 2, 10, 5]],
  [195, [15, 5, 6, 4, 3, 2, 1]], [250, [6, 5, 4, 3, 2, 1]], [330, [14, 4, 2, 1, 5, 6]], [361, [11, 12, 9, 1, 14]],
];
function hueOf(c) {
  const r = (c >> 16) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.02) return -1;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const sqd = (a, b) => { const dr = (a >> 16) - (b >> 16), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255); return 2 * dr * dr + 4 * dg * dg + 3 * db * db; };
export function tintRemap(tint) {
  if (REMAPS[tint]) return REMAPS[tint];
  const hue = hueOf(tint);
  if (hue < 0) return RGB.map((c) => nearestPal(mul(c, tint) | 0));          // grey tints only darken
  const fam = FAMILY.find(([h]) => hue < h)[1];
  return RGB.map((c, i) => {
    if (i === 0) return 0;
    const want = mul(c, tint) | 0;
    let best = fam[0], bd = Infinity;
    for (const k of fam) { const d = sqd(RGB[k], want); if (d < bd) { bd = d; best = k; } }
    return best;
  });
}

export const baked = (mode, col, key) => `~${mode}${col.toString(16)}~${key}`;

// Build the remapped copy of texture `key` (null if it cannot be baked: not our drawn art).
export function bakeTexture(textures, key, mode, col) {
  const vkey = baked(mode, col, key);
  if (textures.exists(vkey)) return vkey;
  const tex = textures.get(key);
  if (!tex || key.startsWith('__') || tex.source.length !== 1 || tex instanceof Phaser.Textures.DynamicTexture) return null;
  const src = tex.source[0].image;
  if (!(src instanceof HTMLCanvasElement || src instanceof HTMLImageElement)) return null;
  const cv = document.createElement('canvas');
  cv.width = src.width; cv.height = src.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
  const map = mode === 'm' ? tintRemap(col) : null, fill = mode === 'f' ? RGB[nearestPal(col)] : 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let to;
    if (map) {
      const rgb = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2], pi = PAL_INDEX.get(rgb);
      to = RGB[pi !== undefined ? map[pi] : nearestPal(mul(rgb, col) | 0)];
    } else to = ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) === RGB[0] && d[i + 3] === 255 ? RGB[0] : fill;     // a flash keeps its dark outline
    d[i] = to >> 16; d[i + 1] = (to >> 8) & 255; d[i + 2] = to & 255;
  }
  ctx.putImageData(img, 0, 0);
  const out = textures.addCanvas(vkey, cv);
  for (const name of tex.getFrameNames()) {
    const f = tex.get(name);
    const nf = out.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
    if (f.customPivot) nf.setPivot?.(f.pivotX, f.pivotY);
  }
  return vkey;
}

const ON = { enabled: true };
export const setBakedTints = (on) => { ON.enabled = !!on; };

function patch(proto) {
  if (proto.__baked) return;
  proto.__baked = true;
  const { setTint, setTintFill, clearTint, setTexture } = proto;
  // switch this object to the baked copy for (mode, col); false if this texture cannot be baked
  const apply = function (mode, col) {
    const base = this._bakeBase || this.texture.key;
    if (this._bakeMode === mode && this._bakeCol === col && this._bakeBase === base && this.texture.key === this._bakeKey) return true;
    const mgr = this.texture.manager;
    const vkey = bakeTexture(mgr, base, mode, col);
    if (!vkey) return false;
    const fr = this.frame.name;
    this._baking = true;
    setTexture.call(this, vkey, fr);
    this._baking = false;
    this._bakeBase = base; this._bakeMode = mode; this._bakeCol = col; this._bakeKey = vkey;
    if (this.isTinted) clearTint.call(this);
    return true;
  };
  const restore = function () {
    if (!this._bakeBase) return;
    const base = this._bakeBase, fr = this.frame.name;
    this._bakeBase = this._bakeMode = this._bakeCol = this._bakeKey = null;
    this._baking = true;
    setTexture.call(this, base, fr);
    this._baking = false;
  };
  proto.setTint = function (tl = 0xffffff, tr, bl, br) {
    const flat = tr === undefined || (tr === tl && bl === tl && br === tl);
    if (ON.enabled && flat) {
      if (tl === 0xffffff) { restore.call(this); return setTint.call(this, tl); }      // (Phaser's clearTint is setTint(white))
      if (apply.call(this, 'm', tl)) return this;
    }
    restore.call(this);
    return setTint.call(this, tl, tr, bl, br);
  };
  proto.setTintFill = function (tl = 0xffffff, tr, bl, br) {
    const flat = tr === undefined || (tr === tl && bl === tl && br === tl);
    if (ON.enabled && flat && apply.call(this, 'f', tl)) return this;
    restore.call(this);
    return setTintFill.call(this, tl, tr, bl, br);
  };
  proto.clearTint = function () { restore.call(this); return clearTint.call(this); };
  proto.setTexture = function (key, frame, ...rest) {
    if (this._baking || !this._bakeBase) return setTexture.call(this, key, frame, ...rest);
    const mode = this._bakeMode, col = this._bakeCol;
    this._bakeBase = this._bakeMode = this._bakeCol = this._bakeKey = null;
    setTexture.call(this, key, frame, ...rest);
    if (!apply.call(this, mode, col)) (mode === 'f' ? setTintFill : setTint).call(this, col);       // keep the tint, like Phaser does
    return this;
  };
}
patch(Phaser.GameObjects.Image.prototype);
patch(Phaser.GameObjects.Sprite.prototype);
// the key an object was made with, whatever tint it wears now (pools key their objects by it)
export const baseKey = (o) => o._bakeBase || o.texture.key;
