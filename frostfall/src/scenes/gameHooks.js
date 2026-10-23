// CH9: GameScene's extension points. A feature registers from its own file instead of editing GameScene:
//   registerSpawner('geyser', (sc, e, wx, wy) => { ... });       // a map entity { t: 'geyser', x, y, ... }; wx/wy = tile centre in px
//   registerTicker('geysers', (sc, dt) => { ... }, 1450);          // every unfrozen frame, sorted by `order` (see CORE_ORDER)
//   registerListener('weather', (sc, kind, region) => { ... });    // a bus event, wired on every map load, removed on shutdown
// Put the file in src/features/ and it is loaded automatically (import.meta.glob in GameScene.js); no other edit is needed.
// The core registrations are in gameSpawners.js and gameTickers.js. Every name is unique: registering one twice throws.
// Pure module (no Phaser), so it can be unit-tested in Node.

export const SPAWNERS = new Map();            // entity type -> fn(scene, e, wx, wy)
export const TICKERS = [];                    // { name, fn(scene, dt), order }, kept sorted by order
export const LISTENERS = [];                  // { ev, fn(scene, ...args), name }

export function registerSpawner(type, fn) {
  if (typeof fn !== 'function') throw new Error(`registerSpawner('${type}'): not a function`);
  if (SPAWNERS.has(type)) throw new Error(`registerSpawner: entity type '${type}' already has a spawner`);
  SPAWNERS.set(type, fn);
}

export function registerTicker(name, fn, order) {
  if (typeof fn !== 'function') throw new Error(`registerTicker('${name}'): not a function`);
  if (!Number.isFinite(order)) throw new Error(`registerTicker('${name}'): order must be a number (see CORE_ORDER in gameTickers.js)`);
  if (TICKERS.some((t) => t.name === name)) throw new Error(`registerTicker: '${name}' is already registered`);
  const same = TICKERS.find((t) => t.order === order);
  if (same) throw new Error(`registerTicker('${name}'): order ${order} is taken by '${same.name}'; pick a free number between two others`);
  TICKERS.push({ name, fn, order });
  TICKERS.sort((a, b) => a.order - b.order);
}

export function registerListener(ev, fn, name = ev) {
  if (typeof fn !== 'function') throw new Error(`registerListener('${ev}'): not a function`);
  LISTENERS.push({ ev, fn, name });
}

// for tests and the F3 overlay: the update order as a list of names
export const tickerOrder = () => TICKERS.map((t) => `${t.order}:${t.name}`);
