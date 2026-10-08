// Round 7: inns, cartographers and full-service smiths for the hubs. Menus built on the shared dialogue and shop screens.
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { say, choose, dialogue } from '../systems/dialogue.js';
import { buyMenu, sellMenu, upgradeMenu, enchantMenu, repairMenu, reforgeMenu, buybackMenu } from './services.js';
import { addItem } from '../systems/inventory.js';
import { saveGame } from '../systems/save.js';
import { advanceTime } from '../systems/moon.js';
import { getRegion } from './maps.js';
import { regionOfMap } from './regions.js';
import { fogDims } from '../scenes/menuMap.js';
import { HIDDEN, placeName } from '../world/discovery.js';

const DIRS8 = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
const gameScene = () => dialogue.hud?.scene?.get('Game');
const pay = (g) => { if (S.gold < g) return false; S.gold -= g; sfx.play('coin'); return true; };

// A rumour: name an undiscovered place nearby, mark it on the map and set a waypoint.
export async function rumour(who, price = 30) {
  const g = gameScene(), reg = getRegion(regionOfMap(S.map));
  const left = (reg.pois || []).filter((p) => !HIDDEN.has(p.kind) && p.kind !== 'rest' && !S.discovered?.[S.map + ':' + p.id]);
  if (!g || !left.length) { await say(who, 'I have told you every place I know in these lands. The rest is for you to find.'); return false; }
  if (!pay(price)) { await say(who, `News costs ${price} gold, friend.`); return false; }
  const px = g.player.x / 16, py = g.player.y / 16;
  left.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  const p = left[Math.min(left.length - 1, Math.floor(Math.random() * 3))];
  const ang = Math.atan2(p.y - py, p.x - px), dir = DIRS8[(Math.round(ang / (Math.PI / 4)) + 8) % 8], paces = Math.round(Math.hypot(p.x - px, p.y - py) / 5) * 5;
  await say(who, `${dir.charAt(0) + dir.slice(1).toLowerCase()}, about ${paces} paces from here: ${placeName(p).toLowerCase()}. I have marked it for you.`);
  g.discover(p, S.map + ':' + p.id, 'A RUMOUR');
  S.flags.waypoint = { map: S.map, x: p.x, y: p.y };
  return true;
}

// A chart: reveals the map around you out to `radius` tiles and marks the places of note inside it.
export function revealChart(g, radius) {
  const px = g.player.x / 16, py = g.player.y / 16, { cw, ch } = fogDims(g.built.w, g.built.h);
  let chunks = 0, places = 0;
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    if (Math.hypot(cx * 2 + 1 - px, cy * 2 + 1 - py) > radius) continue;
    const i = cy * cw + cx;
    if (g.fogArr[i] !== '1') { g.fogArr[i] = '1'; chunks++; }
  }
  S.fog[g.mapId] = g.fogArr.join('');
  S.discovered = S.discovered || {};
  for (const p of g.built.pois || []) {
    if (HIDDEN.has(p.kind) || Math.hypot(p.x - px, p.y - py) > radius) continue;
    const id = g.mapId + ':' + p.id;
    if (!S.discovered[id]) { S.discovered[id] = 1; places++; }
  }
  return { chunks, places };
}
export async function cartographerMenu(who) {
  const g = gameScene();
  await say(who, 'Charts of the surrounding country, drawn from my own steps and from sailors who lied less than most.');
  for (;;) {
    const c = await choose(['Local chart (90G)', 'Wide chart (200G)', 'Leave']);
    if (c === 2 || !g) return;
    const [price, radius] = c === 0 ? [90, 45] : [200, 90];
    if (!pay(price)) { await say(who, 'Paper is expensive. So is ink. So, I find, is honesty.'); continue; }
    const r = revealChart(g, radius);
    bus.emit('toast', `MAP UPDATED: ${r.places} PLACES MARKED`, 13); sfx.play('quest');
    await say(who, r.places ? `There. ${r.places} places of note, marked on your map. Mind the ones with the red dots.` : 'Nothing new to mark in that country. You have been thorough.');
  }
}

// An inn: a bed for the night, a hot meal, and news.
// Sleep through to morning: heals, saves, sets the respawn point. Returns false if you cannot pay.
export async function restRoom(who, price) {
  const g = gameScene();
  if (!pay(price)) { await say(who, 'Beds are not free, even in winter.'); return false; }
  if (!g) return true;
  const cam = g.cameras.main;
  await new Promise((r) => { cam.once('camerafadeoutcomplete', r); cam.fadeOut(900, 0, 0, 0); });
  S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
  advanceTime(S.time >= 7 * 60 ? 1440 - S.time + 7 * 60 : 7 * 60 - S.time);
  S.respawn = { map: g.mapId, x: Math.round(g.player.x), y: Math.round(g.player.y) };
  saveGame(g);
  await g.delay(700);
  bus.emit('toast', 'YOU SLEPT WELL. GAME SAVED', 13);
  await new Promise((r) => { cam.once('camerafadeincomplete', r); cam.fadeIn(900, 0, 0, 0); });
  return true;
}

// A tailor: cloth and leather garments, plus selling.
export async function tailorMenu(who, hello) {
  await say(who, hello || 'Wool, oilcloth, and the occasional coat that is better than it looks.');
  for (;;) {
    const c = await choose(['Buy garments', 'Sell', 'Leave']);
    if (c === 0) await buyMenu(who, [{ id: 'hunter_garb', price: 110, once: true }, { id: 'mage_robe', price: 150, once: true }, { id: 'sea_coat', price: 240, once: true }, { id: 'fur_tunic', price: 40, once: true }]);
    else if (c === 1) await sellMenu(who); else return;
  }
}

export async function innMenu(who, opt = {}) {
  const room = opt.room ?? 25, meal = opt.meal ?? 14, news = opt.news ?? 30;
  await say(who, opt.hello || 'Come in out of the weather. A bed, a bowl, or just the news?');
  for (;;) {
    const c = await choose([`Room for the night (${room}G)`, `Hot meal (${meal}G)`, `News and rumours (${news}G)`, 'Leave']);
    if (c === 3) return;
    const g = gameScene();
    if (c === 1) { if (pay(meal)) { addItem('hunters_stew'); await say(who, 'Hot and heavy. It will keep you warm in a snowstorm, or at least annoyed in one.'); } else await say(who, 'A meal costs coin, traveller.'); continue; }
    if (c === 2) { await rumour(who, news); continue; }
    if (await restRoom(who, room)) return;
    continue;
  }
}

// A smith who does everything: stock, repairs, reforging, upgrades, enchanting, buyback.
export async function smithMenu(who, wares, hello) {
  await say(who, hello);
  for (;;) {
    const c = await choose(['Buy', 'Sell', 'Repair or reforge', 'Upgrade weapon', 'Upgrade armour', 'Enchant', 'Buyback', 'Leave']);
    if (c === 0) await buyMenu(who, wares);
    else if (c === 1) await sellMenu(who);
    else if (c === 2) { const f = await choose(['Repair', 'Reforge', 'Back']); if (f === 0) await repairMenu(who); else if (f === 1) await reforgeMenu(who); }
    else if (c === 3) await upgradeMenu(who, 'weapon');
    else if (c === 4) await upgradeMenu(who, 'armor');
    else if (c === 5) await enchantMenu(who);
    else if (c === 6) await buybackMenu(who);
    else return;
  }
}
