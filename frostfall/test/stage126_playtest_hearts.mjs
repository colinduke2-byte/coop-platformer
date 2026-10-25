// Playtest pass: the four Heart dungeons ask for the kit a player can have before Emberhold.
// The village smith stops at +3 and no forged gear exists before Chapter 3, so every Heart dungeon's guards are at most tier 2
// (the balance bot's careful profile went 0/4 in the Rootvault's tier-3 halls with Nordic +3 kit, 4/4 at tier 2 with
// 7.5 potions a fight; docs/BALANCE_TABLE.md, playtest pass). The Winter Throne, after the four Hearts, stays tier 3.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.frames(20);
const tiers = await h.ev(async () => {
  const { MAPS } = await import('/src/data/maps.js');
  const out = {};
  for (const id of ['maw', 'keep', 'chapel', 'rootvault', 'throne']) {
    const b = MAPS[id].build();
    const ts = b.entities.filter((e) => e.t === 'enemy').map((e) => e.tier || 0);
    out[id] = { max: Math.max(...ts), n: ts.length };
  }
  return out;
});
console.log('  ' + JSON.stringify(tiers));
for (const id of ['maw', 'keep', 'chapel', 'rootvault']) check(`${id}: its guards are at most tier 2`, tiers[id].n > 0 && tiers[id].max <= 2, JSON.stringify(tiers[id]));
check('the Winter Throne keeps its tier-3 guards', tiers.throne.max === 3, JSON.stringify(tiers.throne));
// and in the running game: the Rootvault's foes come out at tier 2
await h.open('scene=game&map=rootvault&spawn=entry');
await h.frames(30);
const live = await h.ev(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => !e.isBoss).map((e) => e.tier));
check('the Rootvault spawns its guards at tier 2', live.length > 0 && live.every((t) => t === 2), JSON.stringify(live));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PLAYTEST HEARTS FAILED' : 'PLAYTEST HEARTS PASSED');
process.exit(failCount() ? 1 : 0);
