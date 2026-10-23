// The economy budget (PR-22): gold and materials coming in per story tier against what the forge and the big purchases cost.
//   node tools/economy_table.mjs          prints the table
// test/unit/economy_budget.mjs keeps the totals inside a band, so "flood or drought" is a number, not a guess.
// Income counted:
//   - quest and side-quest gold: every literal addGold(N) in the story files, by the tier the file belongs to (FILE_TIER);
//   - bosses: each titled enemy's loot gold (midpoint), by the tier where it stands (BOSS_TIER);
//   - ordinary enemies: KILLS_PER_TIER kills of an average ordinary enemy, its gold scaled like the game does (enemyscale.goldMul);
//   - camps and bounties: CAMPS_PER_TIER camp bounties (TUNE.economy.rewards.bounty);
//   - Heart Shards: one per guardian (PatternBoss subclasses), Ember Ore from boss drops.
// Sinks counted: upgrading the five forge slots through each tier's levels (systems/upgrades.js), plus the big one-off buys.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMIES } from '../src/data/enemies.js';
import '../src/data/enemies4.js';
import { TUNE } from '../src/data/tuning.js';
import { UPGRADE_COST, UPGRADE_SLOTS } from '../src/systems/upgrades.js';
import { progress, goldMul } from '../src/systems/enemyscale.js';
import { STORY_AT } from '../src/systems/powercurve.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TIERS = [0, 1, 2, 3];
// Which story tier each file's quests pay out in (the region the file writes).
export const FILE_TIER = { 'dialogue.js': 0, 'sidequests.js': 1, 'emberhold.js': 1, 'companionquests.js': 1, 'regions2_story.js': 1, 'hamlets.js': 2, 'regions3_story.js': 2, 'chapter3.js': 2, 'regions4_story.js': 3 };
// Where each titled enemy stands (the gear the balance bot gives the player who meets it).
export const BOSS_TIER = { boss: 0, grimfang: 0, wyrm: 0, warlord: 1, tide: 1, root: 1, kragnar: 1, sovereign: 1, blightmother: 1, admiral: 2, hollowking: 2, miremother: 2, stormgiant: 2, hartking: 2, vaultsovereign: 2, lodecolossus: 3, brinegut: 3, winter: 3, dragon: 3 };
export const KILLS_PER_TIER = 120, CAMPS_PER_TIER = 6;
// Upgrade levels bought in each tier: +1..+3, +4..+6, +7..+8, +9..+10 (EXPECTED in powercurve: +1, +3, +6, +9 on arrival).
export const LEVELS_IN_TIER = [[1, 2, 3], [4, 5, 6], [7, 8], [9, 10]];
// The big one-off purchases, by tier: houses, the pony, spell tomes (a mage buys a few).
// What a material costs when bought (cheapest shop unit price): the material gate is really a gold gate (PR-22).
export const MAT_PRICE = { iron_ingot: 18, ash_iron: 12, ember_ore: 65, heart_shard: 0 };
export const BUYS = [[['snowdrift cottage', 300]], [['ashfall house', 500], ['pony', 420]], [['two tomes', 1200]], []];

const mid = (g) => (g ? (g[0] + g[1]) / 2 : 0);
function questGold() {
  const out = TIERS.map(() => 0);
  const dir = path.join(ROOT, 'src/data');
  for (const f of fs.readdirSync(dir)) {
    if (!(f in FILE_TIER)) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/addGold\((\d+)\)/g)) out[FILE_TIER[f]] += +m[1];
  }
  return out;
}
export function budget() {
  const quests = questGold();
  const bosses = TIERS.map(() => 0), ore = TIERS.map(() => 0);
  for (const [id, t] of Object.entries(BOSS_TIER)) {
    const e = ENEMIES[id]; if (!e) continue;
    bosses[t] += mid(e.loot?.gold);
    ore[t] += (e.loot?.drops || []).filter(([d]) => d === 'ember_ore').reduce((a, [, p]) => a + Math.min(1, p), 0);
  }
  const mobs = Object.values(ENEMIES).filter((e) => !e.title && e.loot?.gold), mobAvg = mobs.reduce((a, e) => a + mid(e.loot.gold), 0) / mobs.length;
  const kills = TIERS.map((t) => Math.round(KILLS_PER_TIER * mobAvg * goldMul(progress(t, STORY_AT[t]))));
  const B = TUNE.economy.rewards.bounty, camps = TIERS.map((t) => CAMPS_PER_TIER * (B[0] + B[1] * t));
  const slots = UPGRADE_SLOTS.length;
  const lvCost = (lv) => { const c = UPGRADE_COST[lv]; return c.gold + c.n * MAT_PRICE[c.mat] + (c.mat2 ? c.n2 * MAT_PRICE[c.mat2] : 0); };
  const forge = TIERS.map((t) => LEVELS_IN_TIER[t].reduce((a, lv) => a + lvCost(lv), 0) * slots);
  const buys = TIERS.map((t) => BUYS[t].reduce((a, [, g]) => a + g, 0));
  const income = TIERS.map((t) => quests[t] + bosses[t] + kills[t] + camps[t]), sinks = TIERS.map((t) => forge[t] + buys[t]);
  const mats = {};
  for (let lv = 1; lv <= 10; lv++) { const c = UPGRADE_COST[lv]; mats[c.mat] = (mats[c.mat] || 0) + c.n * slots; if (c.mat2) mats[c.mat2] = (mats[c.mat2] || 0) + c.n2 * slots; }
  const guardians = fs.readdirSync(path.join(ROOT, 'src/entities')).reduce((a, f) => a + (fs.readFileSync(path.join(ROOT, 'src/entities', f), 'utf8').match(/extends PatternBoss/g) || []).length, 0);
  return { quests, bosses, kills, camps, income, forge, buys, sinks, mats, shardsIn: guardians, oreFromBosses: ore.reduce((a, b) => a + b, 0), mobAvg };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const b = budget(), r = (x) => String(Math.round(x)).padStart(7);
  console.log('| Tier | Quests | Bosses | Enemies | Camps | INCOME | Forge + bought materials (5 slots) | Buys | SINKS | Income / sinks |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const t of TIERS) console.log(`| ${t} |${r(b.quests[t])} |${r(b.bosses[t])} |${r(b.kills[t])} |${r(b.camps[t])} |${r(b.income[t])} |${r(b.forge[t])} |${r(b.buys[t])} |${r(b.sinks[t])} | ${(b.income[t] / b.sinks[t]).toFixed(2)} |`);
  const ti = b.income.reduce((a, x) => a + x, 0), ts = b.sinks.reduce((a, x) => a + x, 0);
  console.log(`\nWhole campaign: income ${Math.round(ti)} g, sinks ${ts} g (x${(ti / ts).toFixed(2)}).  Average ordinary enemy: ${b.mobAvg.toFixed(1)} g before scaling.`);
  console.log(`Materials for a full +10 set: ${Object.entries(b.mats).map(([k, n]) => `${n} ${k}`).join(', ')}.`);
  console.log(`Heart Shards: ${b.shardsIn} guardians drop one each (${b.mats.heart_shard} needed). Ember Ore from boss drops: ${b.oreFromBosses.toFixed(1)} (the rest is bought from the Delvers, counted in the forge column at ${MAT_PRICE.ember_ore} g each).`);
}
