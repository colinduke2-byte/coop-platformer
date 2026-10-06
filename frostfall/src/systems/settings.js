// User options, persisted separately from save games.
const KEY = 'frostfall_settings';
export const settings = {
  volume: 0.6, music: true,
  difficulty: 'normal',   // easy | normal | hard
  shake: 1,               // 0 | 0.5 | 1  (screen shake strength)
  flashes: true,          // screen flashes
  intScale: false,        // integer pixel scaling
  mouse: false,           // mouse controls (click = sword, right-click = bow)
  sneakToggle: false,     // sneak key toggles instead of hold
  holdChain: true,        // holding the sword key keeps chaining the combo
  largeUi: false,         // bigger HUD bars and text
  slot: 1,                // active save slot (1-3)
  padMap: null,           // learned controller map { inputId: keyCode } (null = defaults)
  keys: {},               // custom key bindings { action: [codes] }
};
try { Object.assign(settings, JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || '{}')); } catch { /* ignore */ }
export const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
