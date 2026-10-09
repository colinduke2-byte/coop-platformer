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
  flashes: true,          // screen flashes
  intScale: false,        // integer pixel scaling
  mouse: false,           // mouse controls (click = sword, right-click = bow)
  sneakToggle: false,     // sneak key toggles instead of hold
  holdChain: true,        // holding the sword key keeps chaining the combo
  cvd: 'off',             // colour-blind assist: off | deutan | protan | tritan
  largeUi: false,         // bigger HUD bars and text
  autoRotate: true,       // phone held upright + controller in use: turn the picture sideways to fill the screen
  slot: 1,                // active save slot (1-3)
  padMap: null,           // learned controller map { inputId: keyCode } (null = defaults)
  keys: {},               // custom key bindings { action: [codes] }
};
try { Object.assign(settings, JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || '{}')); } catch { /* ignore */ }
export const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
