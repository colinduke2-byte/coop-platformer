# World expansion: plan

Status: PLAN ONLY. Nothing here is built. It follows Colin's answers: fresh monsters, new tricks, region variants and roaming mini-bosses; terrain variety and landmarks; two new regions that look different from the snowy ones but make sense with the story; side quest chains and a branching ending; a few new spells; armour classes and carry weight (recommended set); build it to completion, test it and publish this week.

## Principles

- Mechanics stay as they are. New content uses the existing systems (enemy specs, region framework, setpieces, quest/dialogue data, balance bot, power curve).
- Every step ends with `npm test` green, balance-bot checks for new fights, and a publish only when Colin asks (default: one publish at the end of each phase so he can play).
- Art stays procedural pixel art, original designs, 16x16 hero scale.
- New enemies are tuned with the balance bot against the gear a player has in that region (same rule as the last pass).

## Phase 1: Armour classes and carry weight (from ARMOR_WEIGHT_PLAN.md, recommended set)

- Light / medium / heavy armour: light is faster and quieter (stealth bonus), heavy has more armour and -8% speed, medium in between. Existing armours get a class.
- Carry weight: soft cap (over it you are slowed, never blocked). Stamina counts toward carry strength. Arrows and potions weigh almost nothing. Shown in the inventory screen and tooltips.
- Tests for speed, cap, and old saves loading. Balance bot confirms nothing breaks.

## Phase 2: Two new regions

Story fit: the Long Winter spreads from the north. The two new places are where life held on, and each holds a clue about why.

1. **The Embergreen Vale (working name)** - a green, warm valley kept alive by an old grove spirit; meadows, flowering trees, ponds, mossy ruins, butterflies, warm light. Story: the grove's heartwood is failing as the winter creeps in; the player learns the Vale protected one of the seeds that can end the winter. Enemies: living plants, bees/wasp swarms, boars and stags, thorn knights, bandits who raided the grove. Boss: the Blight Mother (rot spreading from inside the grove).
2. **The Sunken Dunes / Sunscorch Reach (working name)** - a warm sandy region of dunes, oases and buried ruins, bleached stone and red rock; the ruined capital of a people who fled the cold long ago. Story: they sealed a weapon against the winter in a buried vault and the player has to decide what to do with it (feeds the branching ending). Enemies: sand burrowers, scorpions, mummy-like sentinels, dust devils, desert raiders. Boss: the Vault Sovereign (an ancient guardian).

Each region gets: a hub town with shop, smith, inn and quests; 3 dungeons or caves; 6+ landmarks; a roaming world boss; its own music mood and palette; entry via the existing region unlock flags; 1 signature mini-boss; region variants of familiar enemies.

Decision for Colin: confirm or rename these two. Alternatives if you prefer: a moonlit archipelago, an autumn forest of red leaves, or a volcano-glass badlands.

## Phase 3: Enemies

- **Fresh monsters (about 12):** burrowers, swarms (small enemies that act as one), ghostly things, living plants, bats, scorpions, dust devils, sentinels, a mimic-style ambusher per new region.
- **New tricks:** summoners that call weaker allies, healers who revive others, shield-bearers needing a guard break, thieves who steal gold and run (kill to get it back), ambushers hiding in terrain, enemies that buff each other.
- **Region variants (about 10):** familiar enemies re-skinned and re-tuned per region with a different element or move (ash wolf, bog wolf, sand wolf; frost, fen and dune versions of bandits).
- **Roaming mini-bosses (about 8):** named, tougher patrols or camp guards with a unique drop each; a harder version appears after the story advances.
- Each has bestiary entry, weakness, drops, sprite, and danger-warning data. Tuned with the bot per region.

## Phase 4: Scenery and landmarks

- **Terrain variety:** new ground and plant looks inside every existing region (meadows, birch groves, cliffs, ponds, flower fields, ruins, mushroom patches) placed by the world generator, kept consistent per seed.
- **Landmarks:** 20+ distinct things visible from far away (giant tree, leaning tower, statue, waterfall, wreck, fallen giant, standing stones), each with a small secret or lore reward so they are worth walking to. Placement keeps the existing spacing rules (no two within the spacing tests).
- Performance: stay inside the existing draw/streaming limits and the art baseline test.

## Phase 5: Quests and the branching ending

- **Side quest chains (about 8 chains, 3-5 steps each):** tied to the new regions, landmarks and mini-bosses; unique rewards, including unique gear and upgrade materials.
- **Branching ending:** three choices carried through the game (what to do with the Vault weapon, what to do with the grove's heartwood, whether to spare or defeat a late rival), with different epilogues. Existing main story beats stay as they are.
- Companion and faction reactions to the choices where cheap.

## Phase 6: A few new spells

- 3-4 new spells (candidates: a healing-over-time ward, a thorn snare that roots enemies, a sandstorm blind, a spark chain) with icons, mana costs, perks hooks, and tests. No change to the casting controls.

## Phase 7: Balance, test, publish

- Balance-bot scenarios for each new region's patrols and bosses with the expected gear.
- Full regression, art baseline update, monkey test, new stage tests for each phase, docs (GUIDE, POWER_CURVE, bestiary), then publish to the artifact and the GitHub copy when Colin says so.

## Order and timing

Phases 1, 2 and 3 are the heaviest. Suggested order: 1 (small) -> 2 and 3 together per region (so each region ships with its enemies) -> 4 -> 5 -> 6 -> 7. I publish a build to play after phase 2 (first new region), after phase 4, and at the end.

## Open questions

- Region names and themes above: confirm or swap.
- How hard should the new regions be relative to the endgame: slot them in the middle of the progression (recommended) or after the Long Winter as post-game?
- Should the branching ending change the final boss fight itself, or only the epilogue (recommended: only the epilogue and one boss variant)?
