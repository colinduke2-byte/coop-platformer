// Chapter 3, "The Ember Crown": the road to Emberhold, the three seals, the Forge of the First Fire and the last choice.
// Registers its quest into the shared tables (imported once by GameScene).
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { QUESTS, TARGETS } from './quests.js';
import { startQuest } from '../systems/quests.js';
import { runScript, say, choose } from '../systems/dialogue.js';
import { addItem } from '../systems/inventory.js';
import { heartsHeld } from './hearts.js';
import { getReach, getRegion } from './maps.js';
import { bestHelp, FACTIONS } from './factions.js';
import { unlockRegion } from './regions.js';
import { EMBERHOLD } from './emberhold_map.js';

// ---- seals: one from each house, earned by finishing its quest
export const SEAL_QUESTS = { delvers: 'silence', anvil: 'anvilcore', wardens: 'roadwatch' };
export const sealCount = () => Object.values(SEAL_QUESTS).filter((q) => S.quests[q]?.status === 'done').length;

// ---- exits that need something: key -> { ok(), msg() }
export const GATES = {
  hearts4: { ok: () => heartsHeld() >= 4, msg: () => `THE DOOR IS SEALED. HEARTS ${heartsHeld()}/4` },
  chapter3: { ok: () => !!S.flags.chapter3, msg: () => 'THE PEAK ROAD IS DRIFTED SHUT' },
  forgeOpen: { ok: () => !!S.flags.forgeOpen, msg: () => `THE FORGE STAYS SHUT. SEALS ${sealCount()}/3` },
};

// ---- the quest
QUESTS.crown = {
  title: 'The Ember Crown', giver: 'Elder Sigrid',
  desc: 'The Winter is decided, but the chains that held it were forged from the First Fire, and the First Fire is waking under Emberhold. Win the trust of the three houses of the forge-city, open the Forge, and face what wears the crown of cinders.',
  short: () => {
    if (!S.flags.arrivedEmberhold) return 'Climb the Peak Road to Emberhold';
    if (!S.flags.metYsolde) return 'Speak with Matriarch Ysolde';
    if (!S.flags.forgeOpen) return `Win the three seals ${sealCount()}/3`;
    if (!S.flags.sovereignDead) return S.flags.forgeEntered ? 'Defeat the Ashen Sovereign' : 'Enter the Forge of the First Fire';
    return 'Decide the fate of the First Fire';
  },
  objectives: (q) => [
    { t: 'Climb the Peak Road (north-east of the Reach) to Emberhold', done: !!S.flags.arrivedEmberhold || q.status === 'done' },
    { t: 'Speak with Matriarch Ysolde', done: !!S.flags.metYsolde || q.status === 'done' },
    { t: "Win the Delvers' seal (The Silent Mines)", done: S.quests.silence?.status === 'done' },
    { t: "Win the Anvil Court's seal (A Core for the Anvil)", done: S.quests.anvilcore?.status === 'done' },
    { t: "Win the Wardens' seal (The Ashen Road)", done: S.quests.roadwatch?.status === 'done' },
    { t: 'Have Ysolde open the Forge of the First Fire', done: !!S.flags.forgeOpen },
    { t: 'Defeat the Ashen Sovereign', done: !!S.flags.sovereignDead || q.status === 'done' },
    { t: 'Decide the fate of the First Fire', done: !!S.flags.finalChoice || q.status === 'done' },
  ],
};
const poi = (region, kind) => (region === 'reach' ? getReach() : getRegion(region)).pois.find((p) => p.kind === kind);
TARGETS.crown = () => {
  if (!S.flags.arrivedEmberhold) { const p = poi('reach', 'peakroad'); return p ? { map: 'forest', x: p.x, y: p.y + 2 } : null; }
  if (!S.flags.metYsolde || (S.flags.forgeOpen === undefined && sealCount() === 3)) return { map: 'emberhold', x: EMBERHOLD.court.x, y: EMBERHOLD.court.y };
  if (!S.flags.forgeOpen) return { map: 'emberhold', x: EMBERHOLD.plaza.x, y: EMBERHOLD.plaza.y };
  const f = poi('ashen', 'forge'); return f ? { map: 'ashen', x: f.x, y: f.y + 2 } : null;
};

// ---- the end of Chapter 2 opens Chapter 3 (called when the Winter's ending card is dismissed)
export function startChapter3() {
  if (S.flags.chapter3) return false;
  S.flags.chapter3 = true;
  unlockRegion('ashen');
  if (S.quests.crown.status === 'inactive') startQuest('crown');
  bus.emit('toast', 'SMOKE ON THE MOUNTAIN. THE PEAK ROAD IS OPEN.', 12);
  sfx.play('quest');
  return true;
}

// ---- the last choice, after the Ashen Sovereign falls
export const FINAL_CHOICES = ['quench', 'crown', 'bind'];
export function finalChoice() {
  return runScript(async () => {
    await say('The Sovereign', 'You have broken my crown. I am only the first fire now, and the first fire is only a question.');
    await say('The Sovereign', 'Winter was my brother, and you freed him, or bound him, or wore him. What will you do with me?');
    let pick = null;
    while (!pick) {
      const c = await choose(['Quench the Flame.', 'Wear the Ember Crown.', 'Bind it to the Anvil.']);
      if (c === 2 && !bestHelp()) { await say('Ysolde', 'A binding needs hands to hold it. No house of Emberhold yet trusts you that far. Earn it, or choose another way.'); continue; }
      pick = FINAL_CHOICES[c];
    }
    S.flags.finalChoice = pick;
    if (pick === 'crown') addItem('ember_crown');
    S.quests.crown.status = 'done';
    S.flags.ending3 = pick;
    bus.emit('ending', 'c3_' + pick);
  });
}
export const helpNote = () => { const h = bestHelp(); return h ? `${FACTIONS[h].name} stand with you.` : null; };
