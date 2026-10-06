// The village bounty board: a few fresh contracts every day, aimed at places in the generated open world.
import { S } from '../systems/state.js';
import { today } from '../systems/bless.js';
import { getReach } from './maps.js';
import { makeGenItem } from '../systems/genloot.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { listScreen } from '../scenes/ShopScene.js';
import { START } from '../world/worldgen.js';

const KIND = {
  camp: { verb: 'Clear the bandit camp', short: 'CLEAR CAMP' },
  den: { verb: 'Drive the wolves from their den', short: 'CLEAR DEN' },
  ruin: { verb: 'Cleanse the haunted ruin', short: 'CLEAR RUIN' },
  champion: { verb: 'Slay the champion', short: 'KILL CHAMPION' },
  tower: { verb: 'Retake the watchtower', short: 'RETAKE TOWER' },
  barrow: { verb: 'Defeat the barrow guardian', short: 'BARROW BOSS' },
};
const ORDER = ['camp', 'den', 'ruin', 'champion', 'tower', 'barrow'];

function dirWord(dx, dy) {
  const v = Math.abs(dy) > Math.abs(dx) * 2 ? (dy < 0 ? 'NORTH' : 'SOUTH') : Math.abs(dx) > Math.abs(dy) * 2 ? (dx < 0 ? 'WEST' : 'EAST') : (dy < 0 ? 'NORTH' : 'SOUTH') + '-' + (dx < 0 ? 'WEST' : 'EAST');
  return v;
}

export function ensureContracts() {
  const day = today();
  if (S.contracts && S.contracts.day === day) return S.contracts;
  const keepActive = (S.contracts?.active || []).filter((id) => !S.contracts.done?.[id]);
  const pois = getReach().pois.filter((p) => ORDER.includes(p.kind) && !S.bounty[p.id]);
  const picked = [];
  let h = (S.seed ^ (day * 2654435761)) >>> 0;
  const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 3266489917) >>> 0; return h / 4294967296; };
  const pool = [...pois];
  for (const id of keepActive) { const p = pois.find((q) => q.id === id); if (p) { picked.push(p); pool.splice(pool.indexOf(p), 1); } }
  while (picked.length < 4 && pool.length) picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  S.contracts = {
    day, active: keepActive, done: {},
    offers: picked.map((p) => ({ id: p.id, kind: p.kind, x: p.x, y: p.y, tier: p.tier, gold: 50 + 45 * p.tier + (p.kind === 'champion' || p.kind === 'barrow' ? 40 : 0), gear: p.tier + (p.kind === 'champion' || p.kind === 'barrow' ? 1 : 0) })),
  };
  return S.contracts;
}

export const contractName = (o) => `${KIND[o.kind].short} (T${o.tier + 1})`;

export function acceptContract(o) {
  const c = ensureContracts();
  if (!c.active.includes(o.id)) c.active.push(o.id);
  S.flags.waypoint = { map: 'forest', x: o.x, y: o.y };
}

// Called when something in the world is cleared; pays any active contract for it.
export function completeContract(poiId, scene) {
  const c = S.contracts;
  if (!c || !c.active.includes(poiId) || c.done[poiId]) return false;
  const o = c.offers.find((x) => x.id === poiId);
  if (!o) return false;
  c.done[poiId] = true;
  c.active = c.active.filter((x) => x !== poiId);
  S.gold += o.gold;
  if (scene) scene.pickups.push(new scene.PickupClass(scene, scene.player.x, scene.player.y - 12, { type: 'item', id: makeGenItem(o.gear, Math.random, o.gear > 1 ? 1 : null) }));
  bus.emit('toast', `CONTRACT DONE  +${o.gold} GOLD`, 13);
  if (S.flags.waypoint && S.flags.waypoint.x === o.x && S.flags.waypoint.y === o.y) delete S.flags.waypoint;
  sfx.play('quest');
  return true;
}

export async function boardMenu() {
  const c = ensureContracts();
  await listScreen({
    title: 'BOUNTY BOARD', hint: 'E TAKE CONTRACT   ESC DONE',
    empty: 'NO CONTRACTS TODAY',
    rows: () => c.offers.map((o) => {
      const done = c.done[o.id], act = c.active.includes(o.id);
      const dx = o.x - START.x, dy = o.y - START.y;
      return {
        id: null, name: contractName(o), tag: done ? 'DONE' : act ? 'TAKEN' : o.gold + 'G', tagCol: done ? 4 : act ? 8 : 13, ok: !done,
        sub: done ? 'COMPLETED' : act ? 'ACTIVE' : 'OPEN',
        desc: `${KIND[o.kind].verb}. ${dirWord(dx, dy)} of the village gate, about ${Math.round(Math.hypot(dx, dy))} paces. Danger ${o.tier + 1} of 4.`,
        lines: [[`REWARD ${o.gold} GOLD`, 13], [o.gear > 1 ? 'AND GOOD GEAR' : 'AND A PIECE OF GEAR', 15], [act ? 'MARKED ON YOUR MAP' : 'TAKE IT TO MARK THE MAP', 4]],
      };
    }),
    onSelect: (i, ui) => {
      const o = c.offers[i];
      if (c.done[o.id]) { ui.say('ALREADY DONE', 4); return; }
      if (c.active.includes(o.id)) { ui.say('YOU HAVE ALREADY TAKEN THIS ONE', 4); return; }
      if (c.active.length >= 3) { ui.say('YOU CAN CARRY THREE CONTRACTS', 11); sfx.play('nostamina'); return; }
      acceptContract(o); sfx.play('quest'); ui.say('CONTRACT TAKEN - WAYPOINT SET', 8);
    },
  });
}
