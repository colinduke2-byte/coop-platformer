# Overnight log

Started: the "start all rounds" instruction after the 19-round plan (docs/POLISH_PLAN.md). One entry per round: what shipped, what was reverted, what to playtest, the numbers to tweak.

## Round 1: power curve, difficulty levels, danger - DONE
Shipped: see CHANGELOG round 27 and docs/POWER_CURVE.md. Numbers to tweak: `TUNE.difficulty` (tuning.js), the 0.05 skill slopes in systems/skills.js, `charLevelFor` and the attribute +6 in damage.js and GameScene.askStat, `armorEffect` in damage.js, the model constants in systems/powercurve.js.
To playtest: start a new game on each difficulty; check that a wolf pack on Normal with starter gear feels risky, and that the warning toast appears when you go far from the village early.

