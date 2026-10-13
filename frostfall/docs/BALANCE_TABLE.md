# Balance table (refinement pass)

Measured with the balance bot (`test/balance.mjs`), 20 trials per fight, on Normal, after Normal was made about 10% harder
(`TUNE.difficulty.normal`: damage taken 0.99 -> 1.04, enemy health 1.65 -> 1.73).

**The bot is a lower bound on a human.** It walks straight in, swings, rolls away from telegraphs it has seen for 0.28 s and
drinks a potion below 40% health. It never kites, never uses the bow or spells, never targets a healer or a pod first, and
never learns a pattern. A practised human wins clearly more often. So a bot win rate of 15-50% on a boss means "a few
tries" for a human, and 50-80% on an ordinary fight means "a decent player wins, with some potions".

## Round 1 (all 16 fights)

| Fight | Expected gear | Bot wins | Boss health left on losses | Potions used | Verdict |
|---|---|---|---|---|---|
| Wolf pack | start | 18/20 | | 3.5 | ok (first fight, gentle) |
| Bandit camp | iron | 16/20 | | 6.4 | ok |
| Crypt hall | steel | 16/20 | | 3.8 | ok |
| Tier 1 patrol | nordic +3 | 15/20 | | 4.5 | ok |
| Vale patrol | nordic +4 | 6/20 | | 9.2 | **too hard** (Hedge Knights) |
| Sunscorch patrol | forged +6 | 13/20 | | 5.7 | ok |
| Tier 2 patrol | forged +6 | 20/20 | | 0.4 | too easy (see note) |
| Tier 3 patrol | legendary +9 | 20/20 | | 0 | too easy (see note) |
| Jarl Valdrek | iron | 11/20 | 16% | 8.5 | ok (first boss) |
| Grimfang | iron | 8/20 | 33% | 8.3 | ok |
| Kragnar | ember mail | 4/20 | 20% | 12.6 | ok, hard |
| Admiral Veyl | ember gear | 6/20 | 15% | 11.4 | ok |
| Hollow King | ember mail | 5/20 | 25% | 15.8 | ok, hard |
| Ashen Sovereign | ember mail | 2/20 | 31% | 15.3 | **too hard** |
| Blight Mother | nordic +5 | 0/20 | 42% | 12.8 | **a wall** |
| Vault Sovereign | forged +7 | 5/20 | 32% | 14.8 | ok, hard |

Changes from round 1:
- `TUNE.bosses.blightmother.hp`: 0.45 -> 0.35
- `TUNE.bosses.sovereign.hp`: 0.7 -> 0.62
- Hedge Knight: health 80 -> 72, damage 19 -> 16

**Not changed, flagged for Colin:** ordinary patrols at tier 2 and 3 with the expected gear are trivial for the bot (20/20, almost
no potions), while the new Sunscorch creatures at tier 2 are fair (13/20). The old tier 2/3 creature types (knights, reavers,
conjurers, fencers, wights) fall behind the gear curve late in the game. The knob is `TUNE.scaling` (`hp` 5.2, `dmg` 2.9 at the
end of the game); a step to 5.6 / 3.3 makes them about 10% tougher late on, but it also moves the in-game danger warnings
(the power model in `systems/powercurve.js`), which would need re-tuning together. Left alone because Colin judged the overall
level about right; worth a look if the late game feels easy.

## Round 2 (the three tuned fights)

(filled in below)
