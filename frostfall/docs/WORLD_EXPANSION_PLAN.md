# World expansion: plan

Status: BUILT (see "What was built" at the end). The plan below is what Colin approved. It follows Colin's answers: fresh monsters, new tricks, region variants and roaming mini-bosses; terrain variety and landmarks; two new regions that look different from the snowy ones but make sense with the story; side quest chains and a branching ending; a few new spells; armour classes and carry weight (recommended set); build it to completion, test it and publish this week.

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


## What was built

- **Armour classes and carry weight** (`src/systems/burden.js`, `TUNE.player.weights`, `TUNE.burden`): light armour is +6% speed, -10% detection, 5% cheaper spells, +10% stamina regen, easier to knock back and -10 carry; heavy armour is -8% speed, +15% detection, +10% spell cost, -15% stamina regen, much harder to knock back and +20 carry; helmets add half of their own class. Carry capacity is 120 plus half a point per stamina above 100, the armour class and the pony. Equipped gear counts at half weight; potions, arrows and quest items weigh almost nothing. Soft limits only: Burdened (over capacity: -15% speed, -20% stamina regen) and Overloaded (over 125%: -35% speed, no rolling). The pack screen shows `WT carried/capacity` and sorts by weight; the HUD shows a status when burdened. Test: `test/stage76_burden.mjs`.
- **The Embergreen Vale** (`src/world/regions4.js`, `src/data/hubs4.js` Greenhollow, `src/data/regions4_story.js`): a green valley, tier 1-2, gate in the Hollow Reach. Meadows, flower fields, birch woods, ponds. Places: hornet hives (Queen Vespera), sacred groves (Grove Warden Moss), thorn patches (Elder Thornwood), flower fields. Boss: **the Blight Mother** in the Thornroot Hollow (roots in behind blight pods, tier 2). Roaming boss: the Mossking.
- **The Sunscorch Reach**: dunes and oases, tier 2-3, gate in the Hollow Reach. Places: oases, raider camps (Captain Karrow), sand pits (the Sandmaw), tomb mouths (Ankhet the Tomb Scorpion), dust spires (Kharn the Dust Lord), thieves' dens (Red Sula). Hub: Amberwell. Boss: **the Vault Sovereign** in the Sealed Vault (sunbeams). Roaming boss: the Sunwyrm.
- **32 new creatures**: 14 fresh monsters with new art (thornling, hornet, blightbloom, dewsprite, hedge knight, mosshulk, sand burrower, scorpion, dust devil, sun sentinel, cutpurse, warchanter, tomb wrapped, dune raider), 10 region variants (ash wolf, bog wolf, dune jackal, thornboar, marsh draugr, sand wight, ember knight, frost bear, mire lynx, sun fencer) and 8 named mini-bosses with a unique prize each. New tricks: dew sprites **heal** allies (`cfg.heals`), cutpurses **steal gold and run** (`cfg.steals`; kill them to get it back), warchanters use the existing **aura** to rally allies.
- **New terrain**: 5 Vale tiles, 7 Sunscorch tiles, 8 scatter tiles for the older regions (snowdrift, frostbloom, boulders, ember blooms, lily pads, mossy marble, glass flowers, spores), placed from hash noise so nothing else moves.
- **25 landmarks** (`src/world/landmarks.js`): frozen waterfall, mammoth bones, the lone giant, a lavafall, a bone hall, a sphinx and so on; each is "sighted" from further away than ordinary places and has a guard, a chest, a lore page and a sign.
- **Quests**: two main quests with a choice (the grove's heart: replant or keep; the vault: Sunbreaker, Winterward, or seal it) and eight chains of three linked quests (hornets, dew, thorns, grove song, water, tombs, raiders, the red purse; the last one asks you to turn Red Sula in or let her go). The choices change the epilogue, and the Long Winter fight (Sunbreaker: fire hurts it 35% more and it strikes faster; Winterward: it hits 15% softer).
- **Four new spells**: Regrowth (heal over six seconds, Restoration 6), Thorn Snare (roots and cuts, Restoration 9), Sandstorm (blinds and scatters, Sneak 9), Sunbeam (a column of light after a beat, tome from the Sealed Vault and Amberwell).
- Tests: `test/stage77_expansion.mjs`.

Where to tune: enemy stat blocks in `src/data/enemies4.js`, boss moves in `TUNE.blightmother` / `TUNE.vaultsovereign`, per-boss health in `TUNE.bosses`, the tier curve in `TUNE.scaling`.
