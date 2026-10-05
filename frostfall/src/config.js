// Core constants: resolution, tile size, the 16-colour snowy palette.
export const W = 320;
export const H = 180;
export const T = 16;

// 16-colour palette. Every pixel in the game comes from here.
export const PAL = [
  '#0b0e1a', // 0  night
  '#1c2338', // 1  deep navy
  '#2e3a5c', // 2  slate
  '#4a5c86', // 3  steel
  '#7b8fb5', // 4  frost
  '#b4c7e0', // 5  pale ice (snow)
  '#eaf2f8', // 6  snow white
  '#2a4a3a', // 7  pine dark
  '#3f7050', // 8  pine
  '#6a4a38', // 9  wood
  '#a07850', // 10 tan / light wood
  '#c8383c', // 11 blood red
  '#f08a30', // 12 fire orange
  '#f4d460', // 13 gold
  '#8a5aa8', // 14 arcane purple
  '#5cc8d8', // 15 frost cyan
];
export const C = PAL.map((h) => parseInt(h.slice(1), 16));

// Tile ids in the generated tileset (see art/sprites.js).
export const TILE = {
  SNOW: 0, SNOW2: 1, ICE: 2, STONE: 3, PINE: 4, PATH: 5, WOODFLOOR: 6,
  WOODWALL: 7, ROOF: 8, CFLOOR: 9, CWALL: 10, ROCK: 11, PILLAR: 12,
  BRAZIER: 13, STAIRS: 14, FENCE: 15, RUG: 16, DOOR: 17, FIRE: 18,
  WINDOW: 19, GRAVE: 20, SARCO: 21,
  SNOW3: 22, SNOW4: 23, PATH2: 24, CFLOOR2: 25, CWALL2: 26, DEADTREE: 27, STUMP: 28, ICE2: 29, TUFT: 30,
};
export const SOLID_TILES = [
  TILE.STONE, TILE.PINE, TILE.WOODWALL, TILE.ROOF, TILE.CWALL, TILE.ROCK,
  TILE.PILLAR, TILE.BRAZIER, TILE.FENCE, TILE.DOOR, TILE.FIRE, TILE.WINDOW,
  TILE.GRAVE, TILE.SARCO, TILE.CWALL2, TILE.DEADTREE, TILE.STUMP,
];
export const TILE_COUNT = 31;

// Keyboard actions -> KeyboardEvent.code
export const BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  roll: ['Space'],
  sword: ['KeyJ'],
  bow: ['KeyK'],
  spell: ['KeyL'],
  swap: ['KeyQ', 'Tab'],
  shout: ['KeyR'],
  block: ['KeyF'],
  sneak: ['KeyC', 'ShiftLeft'],
  interact: ['KeyE', 'Enter'],
  potion1: ['Digit1'],
  potion2: ['Digit2'],
  potion3: ['Digit3'],
  inventory: ['KeyI'],
  journal: ['KeyO'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
};
