// sfx.play(name [, source]): play one effect recipe from sounds.js.
//   - the same name at most once per TUNE.audio.rateMs (a crowd hit at once does not stack forty copies)
//   - AU05: a little random pitch and volume on every play (wider for steps and hits, none for UI and jingles)
//   - AU21: with a source that has x, y and scene (an enemy, a projectile, a trap), the sound is quieter with distance
//     from the camera centre and panned left / right; player and UI sounds pass no source and stay centred
//   - AU08: past TUNE.audio.voices live voices, only urgent sounds (hurt, warnings) still play
// Helpers that pick a name (sfx.swing, sfx.hitOn, sfx.voice, sfx.talk) return a name for sfx.play.
import { settings } from '../systems/settings.js';
import { TUNE } from '../data/tuning.js';
import { ac, nodes, shape, voices, isHidden } from './core.js';
import { SOUNDS, SWING_STYLE, talk as talkVoice } from './sounds.js';

const A = () => TUNE.audio;
const NO_VARY = new Set(['select', 'move', 'back', 'equip', 'levelup', 'skill_up', 'quest', 'quest_start', 'quest_update', 'quest_done', 'discover', 'achievement', 'char_level', 'save', 'ending', 'chest', 'deny', 'buy', 'forge', 'blip', 'heartbeat', 'nostamina']);
const WIDE = /^(step|hit|sword|swing_|kill|bark_|arrowhit|block|smash|crit_hit|tick_)/;
const URGENT = new Set(['hurt', 'die', 'telegraph', 'telegraph_boss', 'alert', 'parry', 'heartbeat', 'guardbreak']);
const lastPlayed = new Map();
const warned = new Set();
let stepAlt = false;
export const audioLog = { lastTalk: -1e9, plays: 0, last: null, recent: [] };     // for tests: the last few plays

function positional(src) {
  const cam = src.scene?.cameras?.main;
  const v = cam?.worldView;
  if (!v || !Number.isFinite(src.x) || !Number.isFinite(src.y)) return { g: 1, pan: 0 };
  const w = v.width || 320, cx = v.x + w / 2, cy = v.y + (v.height || 180) / 2;
  const d = Math.hypot(src.x - cx, src.y - cy), near = A().near, far = Math.max(near + 1, A().far * w);
  const k = d <= near ? 1 : Math.max(0, 1 - (d - near) / (far - near));
  return { g: k * k, pan: Math.max(-A().pan, Math.min(A().pan, (src.x - cx) / (w / 2))) };
}

export const sfx = {
  play(name, src = null) {
    if (settings.volume <= 0 || isHidden()) return;
    const fn = SOUNDS[name];
    if (!fn) {
      if (!warned.has(name)) { warned.add(name); try { if (import.meta.env?.DEV) console.warn('[audio] no sound named', name); } catch { /* ignore */ } }
      return;
    }
    const now = performance.now();
    if (now - (lastPlayed.get(name) || -1e9) < A().rateMs) return;
    if (voices.n > A().voices && !URGENT.has(name)) return;
    const a = ac(); if (!a) return;
    let dest = null;
    if (src && src.scene) {
      const p = positional(src);
      if (p.g < 0.02) return;
      const g = a.createGain(); g.gain.value = p.g;
      if (a.createStereoPanner) { const pn = a.createStereoPanner(); pn.pan.value = p.pan; g.connect(pn); pn.connect(nodes.sfxBus); setTimeout(() => { try { pn.disconnect(); } catch { /* ignore */ } }, 4000); }
      else g.connect(nodes.sfxBus);
      setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 4000);
      dest = g;
    }
    lastPlayed.set(name, now);
    const V = A().vary;
    let pitch = 1, vol = 1;
    if (!NO_VARY.has(name)) {
      const wide = WIDE.test(name), pr = wide ? V.widePitch : V.pitch, vr = wide ? V.wideVol : V.vol;
      pitch = 1 + (Math.random() * 2 - 1) * pr;
      vol = 1 - Math.random() * vr;
      if (name.startsWith('step')) { stepAlt = !stepAlt; pitch *= stepAlt ? 1 + V.step : 1 - V.step; }     // left / right foot
    }
    shape.pitch = pitch; shape.vol = vol; shape.dest = dest;
    audioLog.plays++; audioLog.last = { name, pitch, vol, gain: dest ? dest.gain.value : 1 };
    audioLog.recent.push(name); if (audioLog.recent.length > 24) audioLog.recent.shift();
    try { fn(); } catch { /* audio is best-effort */ } finally { shape.pitch = 1; shape.vol = 1; shape.dest = null; }
  },
  has: (name) => !!SOUNDS[name],
  names: () => Object.keys(SOUNDS),
  // AU10: the swing for a weapon (an item def or a style name); heavy = the combo finisher or the heavy attack
  swing(w, heavy = false) {
    const style = typeof w === 'string' ? w : (w?.style || (w?.type === 'weapon2h' ? 'great' : 'sword'));
    return 'swing_' + (SWING_STYLE[style] || 'sword') + (heavy ? '_heavy' : '');
  },
  // AU12: an enemy's voice: 'bark' | 'alert' | 'kill' -> bark_construct, alert_spirit, kill_slime...
  voice(cfg, what = 'bark', kind = '') { return what + '_' + voiceOf(cfg, kind); },
  // AU12: what a melee blow sounds like on this target (flesh, bone, stone, metal)
  hitOn(e) {
    const cfg = e?.cfg || {};
    if (cfg.armored) return 'hit_metal';
    const v = voiceOf(cfg, e?.kind);
    if (v === 'construct') return 'hit_stone';
    if (v === 'undead' && !FLESHY.has(texOf(cfg))) return 'hit_bone';
    return 'hit';
  },
  // AU23: the dialogue blip in this speaker's voice (pitch and waveform from the name)
  talk(who) {
    const n = String(who || '').toUpperCase();
    let h = 7; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const kind = /KING|SOVEREIGN|MOTHER|WARLORD|COLOSSUS|GIANT|WYRM|DRAGON|ALPHA|ADMIRAL|KRAGNAR|THE LONG/.test(n) ? 'boss'
      : /CHILD|BOY|GIRL|KID|LITTLE|PIP|YOUNG/.test(n) ? 'high'
        : /ELDER|OLD |GRAN|HERMIT|MONK|PRIEST|SAGE|GRANDF|GRANDM/.test(n) ? 'low'
          : ['mid', 'soft', 'low', 'mid', 'soft'][h % 5];
    talkVoice.pitch = 0.88 + (h % 25) / 100;
    audioLog.lastTalk = performance.now();
    return 'talk_' + kind;
  },
};

// enemy voice from its data: an explicit `voice`, else from its sprite and kind, else from its bark
const TEX_VOICE = { golem: 'construct', stonegiant: 'construct', stormgiant: 'construct', sentinel: 'construct', lodecolossus: 'construct', mimic: 'construct',
  spider: 'crawler', worm: 'crawler', crab: 'crawler', barnacle: 'crawler', leech: 'crawler',
  ghost: 'spirit', wisp: 'spirit', phantom: 'spirit', lavawraith: 'spirit', bogwraith: 'spirit', herald: 'spirit',
  slime: 'slime', shroom: 'slime' };
const FLESHY = new Set(['troll', 'imp', 'necro', 'conjurer', 'tidehag', 'boghag', 'miremother', 'admiral', 'wyrm', 'root', 'tide']);
const texOf = (cfg) => String(cfg?.tex || '').replace(/^spr_/, '');
export function voiceOf(cfg, kind = '') {
  if (cfg?.voice && SOUNDS['bark_' + cfg.voice]) return cfg.voice;
  const k = String(kind || cfg?.kind || '');
  if (/prism|glimmer|crystal/.test(k)) return 'construct';
  const t = TEX_VOICE[texOf(cfg)];
  if (t) return t;
  const b = cfg?.bark;
  return b === 'undead' || b === 'human' || b === 'wolf' ? b : 'wolf';
}
