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
