// Five side-quest chains woven into the main road, given by the people of Hollowfrost and answered by the open world:
// visit the hamlets, pray at the standing stones, clear barrows, dens and towers. Each wraps the giver's normal talk, so a
// quest offer or a report comes first and everything else is unchanged. Imported once by GameScene.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { SCRIPTS } from './dialogue.js';
import { QUESTS, TARGETS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addItem, addGold } from '../systems/inventory.js';
import { heartsHeld } from './hearts.js';
import { getReach } from './maps.js';

const cleared = (re) => Object.keys(S.bounty || {}).filter((k) => re.test(k) && S.bounty[k]).length;
const prayed = () => Object.keys(S.shrines || {}).filter((k) => /standing/.test(k)).length;
const met = () => ['Trapper', 'Fisher', 'Prospector'].filter((w) => S.flags['met' + w]).length;

export const SIDE = {
  hamlets: { count: met, need: 3, giver: 'bjorn', reward: () => { addGold(300); addItem('gem_topaz', 1, true); } },
  circles: { count: prayed, need: 3, giver: 'sigrid', reward: () => { addGold(250); addItem('gem_amber', 2, true); } },
  barrows3: { count: () => cleared(/^barrow\d$/), need: 3, giver: 'mirra', reward: () => { addGold(250); addItem('berserker_draught', 2, true); } },
  denmother: { count: () => cleared(/^den\d+$/), need: 3, giver: 'bjorn', reward: () => { addGold(200); addItem('ash_spear'); } },
  towerwatch: { count: () => cleared(/^tower\d+$/), need: 3, giver: 'guard', reward: () => { addGold(350); addItem('gem_onyx', 1, true); } },
};
const mk = (id, title, giver, desc, what) => {
  QUESTS[id] = {
    title, giver, desc,
    short: () => `${what} ${Math.min(SIDE[id].need, SIDE[id].count())}/${SIDE[id].need}`,
    objectives: (q) => [{ t: `${what} (${Math.min(SIDE[id].need, SIDE[id].count())}/${SIDE[id].need})`, done: SIDE[id].count() >= SIDE[id].need || q.status === 'done' }, { t: `Report to ${giver}`, done: q.status === 'done' }],
  };
};
mk('hamlets', 'Hamlet Rounds', 'Bjorn the Hunter', 'The hamlets scattered across the Reach have not been checked since the Winter began. Bjorn wants someone to walk the rounds: speak with a trapper, a fisher and a prospector.', 'Visit a trapper, fisher and prospector');
mk('circles', 'Stones That Hum', 'Elder Sigrid', 'The Kings raised circles of standing stones where the roads cross. Sigrid wants to know whether they still bless. Pray at three of them.', 'Pray at standing stones');
mk('barrows3', 'The Restless Barrows', 'Mirra the Alchemist', 'The barrows are stirring, and Mirra needs what grows only on the graves of the unquiet dead. Clear three barrows.', 'Clear barrows');
mk('denmother', "The Den-Mother's Debt", 'Bjorn the Hunter', 'With Grimfang gone, the wolf dens have no master and no mercy. Bjorn asks you to drive three dens from the Reach before the flocks are lost.', 'Clear wolf dens');
mk('towerwatch', 'Retake the Watch', 'Guard Haldor', 'The old watchtowers once saw trouble coming for a day. Haldor would like that again. Retake three towers.', 'Retake watchtowers');

// markers: the nearest place you have not cleared yet
const nearest = (re, kind) => () => {
  const left = getReach().pois.filter((p) => p.kind === kind && !S.bounty[p.id]);
  const p = left[0]; return p ? { map: 'forest', x: p.x, y: p.y } : null;
};
TARGETS.hamlets = nearest(null, 'hamlet'); TARGETS.circles = nearest(null, 'standing');
TARGETS.barrows3 = nearest(null, 'barrow'); TARGETS.denmother = nearest(null, 'den'); TARGETS.towerwatch = nearest(null, 'tower');

const OFFER = {
  hamlets: { when: () => S.quests.wolves.status === 'done', lines: ['The hamlets are not on any map I trust. Walk the rounds for me: a trapper, a fisher, a prospector. Say that Bjorn sent you.'], yes: 'I will walk the rounds.' },
  denmother: { when: () => !!S.flags.grimfangDone, lines: ['Grimfang is down, and the dens are leaderless. Leaderless wolves are worse than led ones. Clear three dens across the Reach, and I will make it worth your while.'], yes: 'I will clear them.' },
  circles: { when: () => heartsHeld() >= 1 && S.quests.king.status === 'done', lines: ['Dreamer. Something has been bothering me since the Heart. The old standing stones, where the roads cross. If they still bless, the Kings are not wholly gone. Pray at three of them for me.'], yes: 'I will pray at three.' },
  barrows3: { when: () => S.quests.herbs.status === 'done', lines: ['The barrows are waking, and what grows on the unquiet dead is the best remedy I know. Clear three barrows and I will brew you something that bites.'], yes: 'I will clear them.' },
  towerwatch: { when: () => S.quests.wolves.status === 'done', lines: ['The old watchtowers have been dark since before my father. Retake three of them and the Reach will have eyes again.'], yes: 'I will retake them.' },
};
const WHO = { hamlets: 'Bjorn', denmother: 'Bjorn', circles: 'Sigrid', barrows3: 'Mirra', towerwatch: 'Haldor' };

// wrap the givers' scripts: a finished quest is reported first, then an offer, then the normal talk
for (const giver of ['bjorn', 'sigrid', 'mirra', 'guard']) {
  const orig = SCRIPTS[giver];
  if (!orig) continue;
  SCRIPTS[giver] = async () => {
    for (const [id, d] of Object.entries(SIDE)) {
      if (d.giver !== giver) continue;
      const q = S.quests[id];
      if (q.status === 'active' && d.count() >= d.need) {
        await say(WHO[id], 'You did it. All of it. Here, this is yours, and my thanks.');
        d.reward(); finishQuest(id); return;
      }
    }
    for (const [id, d] of Object.entries(SIDE)) {
      if (d.giver !== giver || S.quests[id].status !== 'inactive' || !OFFER[id].when()) continue;
      for (const l of OFFER[id].lines) await say(WHO[id], l);
      const c = await choose([OFFER[id].yes, 'Not now.']);
      if (c === 0) { startQuest(id); await say(WHO[id], 'Good. Come back when it is done.'); }
      return;
    }
    return orig();
  };
}
