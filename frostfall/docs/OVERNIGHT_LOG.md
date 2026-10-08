# Overnight log

Started: the "start all rounds" instruction after the 19-round plan (docs/POLISH_PLAN.md). One entry per round: what shipped, what was reverted, what to playtest, the numbers to tweak.

## Round 1: power curve, difficulty levels, danger - DONE
Shipped: see CHANGELOG round 27 and docs/POWER_CURVE.md. Numbers to tweak: `TUNE.difficulty` (tuning.js), the 0.05 skill slopes in systems/skills.js, `charLevelFor` and the attribute +6 in damage.js and GameScene.askStat, `armorEffect` in damage.js, the model constants in systems/powercurve.js.
To playtest: start a new game on each difficulty; check that a wolf pack on Normal with starter gear feels risky, and that the warning toast appears when you go far from the village early.

## Round 2: world scale and spacing - DONE (with a scoped-down spacing target)
Shipped: see CHANGELOG round 28. The plan's aspiration was a typical neighbour 12 to 15 seconds apart; packing maths (about 60 places in a 204k-tile map) gives about 10 seconds, with the closest pairs 6 seconds. More distance needs a bigger map or fewer places; round 6 adds regions instead, which spreads content further.
Numbers to tweak: `gap` and `majorGap` per region def in worldgen.js, REACH_W/H, tierAt bands, PONY_SPEED and PONY_DRAIN in entities/Pony.js, the pony price in data/dialogue.js.
To playtest: walk from the village to the Winter Throne: is there something to see along the way? Do the waystone signs help? Is the pony worth 420 gold?


## Round 3: discovery and exploration - DONE (landmarks/vistas and unmarked quests deferred)
Shipped: see CHANGELOG round 29. Tweak: reward formula in world/discovery.js (4+4*tier, hidden 20+12*tier), hidden-place gaps in worldgen.js. Playtest: wander off the road: do banners and the compass make you want to look further?

## Round 4: a living world - DONE (partial: events, camps, delivery jobs)
Shipped: see CHANGELOG round 30. Tweak: `RESETTLE` in systems/bless.js, event odds in `rollEvent` (world/livingworld.js), event timer 150-300 s in world/events.js. Deferred: storm cold, town children/animals, escort/lost-item jobs, second home.

## Round 5: day, night and the moon - DONE (core; herbs/ghost merchant/silver/night quest deferred)
Shipped: see CHANGELOG round 31. Tweak: `wolfChance`/`ghostChance` and moon cycle in systems/moon.js, werewolf/ghost stats in data/enemies.js, lantern radius in world/lighting.js, 1.25 lantern detect in Player.detectMult. Playtest: use a fire to wait until dusk; at night look for werewolves around wolf dens; wait to day 4 (full moon).

## Round 6: new regions - DONE for the first two (Weeping Fens, Stormcrown Highlands); Glasswood, Underdeep, Saltmarket NOT started
Shipped: see CHANGELOG round 32. The three remaining regions from the plan stay as follow-ups: the framework (`world/regions2.js`, `data/hubs2.js`, `data/regions2_story.js`, `minesgen.js` boss delves) is now a copy-and-edit recipe. Tweak: region tier base in `base1()` (regions2.js), creature stats in data/enemies.js, boss numbers in data/tuning.js (miremother, stormgiant). Playtest: walk the south-west road from the Reach to the Fens at level 1 and read the warning; then go back after gearing up.

## Rounds 7 and 8: settlements/services and dungeons - DONE (scoped)
Shipped: see CHANGELOG round 33. Round 7 deferred: guild rank-ups and faction gear beyond Emberhold, tailor, per-hamlet inns. Round 8 deferred: collapsing bridges, key puzzles, boss-variety pass (the two new bosses reuse the pattern kit). Tweak: spike timing `PHASE` and damage in world/setpieces.js and world/roomkinds.js; mire slow 0.55 in `mireMul`; room-kind odds in the `R() * 7` line of barrowgen/minesgen.
