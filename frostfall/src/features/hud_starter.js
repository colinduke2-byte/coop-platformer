// H: HUD and first hour (NP3, NP20). A small starter quest that begins when the tutorial ends: meet Bjorn and Mirra, then
// go back to Sigrid. It ends in a short vision, and Sigrid's own talk then offers the story quest (`king`, the Frostsworn).
// The givers' scripts are wrapped, as data/sidequests.js does, so no dialogue file changes.
import { S, EXTRA_QUEST_IDS } from '../systems/state.js';
import { QUESTS, TARGETS } from '../data/quests.js';
import { SCRIPTS } from '../data/dialogue.js';
import { say, dialogue } from '../systems/dialogue.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { settings } from '../systems/settings.js';
import { bus } from '../systems/bus.js';
import { registerListener } from '../scenes/gameHooks.js';
import { sfx } from '../audio/sfx.js';

const ID = 'starter';
if (!EXTRA_QUEST_IDS.includes(ID)) EXTRA_QUEST_IDS.push(ID);
S.quests[ID] ||= { status: 'inactive' };
const q = () => (S.quests[ID] ||= { status: 'inactive' });
const step = (s) => (!s.bjorn ? 'bjorn' : !s.mirra ? 'mirra' : 'sigrid');

QUESTS[ID] = {
  title: 'A Stranger in Hollowfrost',
  giver: 'Elder Sigrid',
  desc: 'Sigrid pulled you out of the snow. Before she tells you more, she wants you to meet the village: Bjorn the hunter at his lodge, and Mirra at her stall.',
  short: (s) => ({ bjorn: 'Speak to Bjorn at the lodge', mirra: "Visit Mirra's stall", sigrid: 'Return to Elder Sigrid' })[step(s)],
  objectives: (s) => [
    { t: 'Speak to Bjorn at the lodge', done: !!s.bjorn },
    { t: "Visit Mirra's stall", done: !!s.mirra },
    { t: 'Return to Elder Sigrid', done: s.status === 'done' },
  ],
};
// where each of them stands in the village (live position when you are there)
const HOME = { bjorn: { x: 7, y: 11 }, mirra: { x: 32, y: 10 }, sigrid: { x: 20, y: 9 } };
TARGETS[ID] = (s) => {
  const who = step(s), gs = dialogue.hud?.gs;
  const n = gs?.mapId === 'village' && gs.npcs?.find((m) => m.id === who && !m.away);
  return n ? { map: 'village', x: Math.floor(n.ix / 16), y: Math.floor(n.iy / 16) } : { map: 'village', ...HOME[who] };
};

// the tutorial's last step starts it
export function startStarter() {
  if (q().status !== 'inactive' || S.quick || S.daily || S.quests.king?.status !== 'inactive') return;
  startQuest(ID);
  S.tracked = ID;
}

const wrap = (id, fn) => { const orig = SCRIPTS[id]; if (orig) SCRIPTS[id] = async () => { if (await fn()) return; return orig(); }; };
const met = (who) => async () => {
  const s = q();
  if (s.status !== 'active' || s[who]) return false;
  s[who] = true;
  bus.emit('toast', 'QUEST UPDATED: ' + QUESTS[ID].short(s).toUpperCase(), 13); sfx.play('quest');
  return false;                      // their usual talk follows
};
wrap('bjorn', met('bjorn'));
wrap('mirra', met('mirra'));
wrap('sigrid', async () => {
  const s = q();
  if (s.status !== 'active') return false;
  if (step(s) !== 'sigrid') {
    await say('Sigrid', s.bjorn ? 'Mirra next, at her stall on the east side. Then come back to me.' : 'Bjorn first, at his lodge on the west side. Then Mirra. Then come back to me.');
    return true;
  }
  finishQuest(ID);
  // the hook: one beat of what is calling the Dreamer, before Sigrid tells the story
  if (settings.flashes !== false) dialogue.hud?.gs?.cameras.main.flash(500, 200, 230, 255);
  await say('A cold voice', 'Dreamer. You woke at last. I kept your name for you, down in the dark under the pines. Come and take it back.');
  await say('Sigrid', 'You have gone pale. You heard it too, then. Sit, and listen.');
  return false;                      // Sigrid's own talk offers the story quest
});
registerListener('tutorial:done', () => startStarter());
