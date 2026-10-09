// Graphics quality. Standard draws the 320 x 180 picture. High draws the same picture at 640 x 360: the art is the same pixel art
// (every pixel exactly doubled), but lighting, shadows, text edges and motion are finer. Chosen at launch (Options, or ?gfx=high).
const KEY = 'frostfall_settings';
export const GFX_MODES = ['auto', 'standard', 'high'];
// auto: High on a computer with WebGL, Standard on touch devices and anywhere WebGL is missing
function autoZ() {
  try {
    if (new URLSearchParams(location.search).get('renderer') === 'canvas') return 1;
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) return 1;
    const c = document.createElement('canvas');
    return c.getContext('webgl2') || c.getContext('webgl') ? 2 : 1;
  } catch { return 1; }
}
export const zFor = (mode) => (mode === 'high' ? 2 : mode === 'standard' ? 1 : autoZ());
function pick() {
  try {
    const q = new URLSearchParams(location.search).get('gfx');
    if (q) return q === 'high' ? 2 : 1;
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return zFor(s.graphics || 'auto');
  } catch { return 1; }
}
export const Z = pick();
// Screen-fixed objects inside the game scene (snow, darkness overlay) are placed with this offset so that logical (0,0) is the corner.
export const FIX = { x: (Z - 1) * 160, y: (Z - 1) * 90 };
// Call first thing in a scene's create(). world = the game scene (follows the player, culls by worldView): default camera origin;
// every other scene: origin at the top-left so logical (0,0) is the corner of the picture.
export function fitCam(scene, world = false) {
  if (Z === 1) return;
  const cam = scene.cameras.main;
  cam.setZoom(Z);
  if (!world) cam.setOrigin(0, 0);
  // pointer handlers in the menus and title are written in logical units: hand them converted positions
  const on = scene.input.on.bind(scene.input);
  scene.input.on = (ev, fn, ctx) => (/^pointer(move|down|up)$/.test(ev) ? on(ev, (p, ...r) => fn.call(ctx, lp(p), ...r)) : on(ev, fn, ctx));
}
// A pointer position in logical (320 x 180) units.
export const lp = (p) => ({ x: p.x / Z, y: p.y / Z, event: p.event, button: p.button, rightButtonDown: p.rightButtonDown?.bind(p), leftButtonDown: p.leftButtonDown?.bind(p), isDown: p.isDown });
