// User options, persisted separately from save games.
const KEY = 'frostfall_settings';
export const settings = {
  volume: 0.6, music: true,
  musicVol: 1, sfxVol: 1, ambVol: 1,   // per-channel mixes (0..1) on top of the master volume
  difficulty: 'normal',   // easy | normal | hard
  challenge: null,        // an optional modifier applied to the next NEW GAME (see data/mods.js)
  shake: 1,               // 0 | 0.5 | 1  (screen shake strength)
  durability: false,      // gear wears out and needs repairs (optional; Normal difficulty)
  durabilityHard: true,   // the same switch for Hard, where gear wear starts on
  dmgNumbers: true,       // floating damage numbers
  hitStop: true,          // brief freeze on landed hits
  padLayout: 'modern',    // CB17: 'modern' (LB block, RB heavy) or 'classic' (L3 block, right stick heavy)
  flashes: true,          // screen flashes
  intScale: false,        // integer pixel scaling
  mouse: false,           // mouse controls (click = sword, right-click = bow)
  sneakToggle: false,     // sneak key toggles instead of hold
  holdChain: true,        // holding the sword key keeps chaining the combo
  cvd: 'off',             // colour-blind assist: off | deutan | protan | tritan
  largeUi: false,         // bigger HUD bars and text
  reduceMotion: false,    // still markers, no blinking or pulsing, lighter snow
  highContrast: false,    // brighter text on dark panels (hints, locked rows, empty slots)
  hudNumbers: false,      // numbers on the health / magic / stamina bars
  textSpeed: 'normal',    // dialogue typing speed: slow | normal | fast | instant
  fpsCap: 0,              // 0 = match the screen, else 60 or 30 (saves battery)
  deadzone: 0.45,         // how far a stick must move before it counts (0.2 - 0.7)
  autoRotate: true,       // phone held upright + controller in use: turn the picture sideways to fill the screen
  slot: 1,                // active save slot (1-3)
  padMap: null,           // learned controller map { inputId: keyCode } (null = defaults)
  keys: {},               // custom key bindings { action: [codes] }
};
// Stored settings are checked field by field: a damaged value falls back to the default instead of breaking audio or saves.
const DEFAULTS = JSON.parse(JSON.stringify(settings));
const RANGES = { volume: [0, 1], musicVol: [0, 1], sfxVol: [0, 1], ambVol: [0, 1], shake: [0, 1], slot: [1, 3], deadzone: [0.2, 0.7] };
const CHOICES = { difficulty: ['easy', 'normal', 'hard'], cvd: ['off', 'deutan', 'protan', 'tritan'], textSpeed: ['slow', 'normal', 'fast', 'instant'], fpsCap: [0, 30, 60] };
export function sanitiseSettings(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (!(k in DEFAULTS)) { out[k] = v; continue; }
    const d = DEFAULTS[k];
    if (RANGES[k]) { if (Number.isFinite(v)) out[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], k === 'slot' ? Math.round(v) : v)); }
    else if (CHOICES[k]) { if (CHOICES[k].includes(v)) out[k] = v; }
    else if (typeof d === 'boolean') { if (typeof v === 'boolean') out[k] = v; }
    else if (k === 'keys' || k === 'padMap') { if (v === null || (typeof v === 'object' && !Array.isArray(v))) out[k] = v ?? DEFAULTS[k]; }
    else if (d === null || typeof v === typeof d) out[k] = v;
  }
  return out;
}
try { Object.assign(settings, sanitiseSettings(JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || '{}'))); } catch { /* ignore */ }
export const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
