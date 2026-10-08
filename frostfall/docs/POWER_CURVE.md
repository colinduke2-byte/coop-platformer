# Power curve and difficulty

The numbers behind "levels never make you overpowered". Generated from `src/systems/powercurve.js` (run `node tools/power_table.mjs`) and checked by `test/unit/power.mjs`.

## The rule
Power comes mostly from **gear** (weapon tier, armour tier, upgrades, enchants, sockets) and **preparation** (potions, food, elixirs). Levels add a modest amount:
- Skills give **+5% damage per level** (was 7%, originally 10%), so a level 20 skill is under double a level 1 skill.
- Character level comes **one per three skill levels** (was one per two), capped at 25, and each gives **+6** to one attribute (was +10).
- Armour has **diminishing returns**: the first 40% counts in full, beyond that half, and nothing passes 70% (so stacking cannot make you immune).
- Skill levels themselves are slow to earn (XP per level `25 + 12 x level^1.6`).

## What a regular fight costs
A "regular fight" is two ordinary enemies of a region tier. The cost is the share of your health the fight takes (calibrated so the expected strength in the first tier costs a third on Normal).

| Region tier | Expected gear | Level | Normal | Easy | Hard | +5 levels | -5 levels | Gear -1 | Gear +1 |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Iron +0 | 3 | 33% | 15% | 58% | 24% | 44% | 73% | 22% |
| 1 | Steel +1 | 7 | 36% | 16% | 64% | 27% | 52% | 54% | 25% |
| 2 | Nordic +2 | 12 | 39% | 18% | 69% | 30% | 53% | 57% | 22% |
| 3 | Forged +3 | 15 | 31% | 14% | 55% | 25% | 41% | 54% | 22% |

Max level (20) in starter gear against each tier (Normal):
tier 0: 28%   tier 1: 71%   tier 2: 169%   tier 3: 301%
Level 1 with Forged gear +3 against each tier (Normal):
tier 0: 8%   tier 1: 20%   tier 2: 46%   tier 3: 83%


How to read it:
- **Normal** at the expected gear and level costs about a third of your health in every region.
- **Easy** costs about half as much; **Hard** costs about twice as much, so on Hard you need better gear, upgrades and potions than the region "expects".
- **+5 levels** only brings the cost down by about a quarter: comfortable, never trivial. **-5 levels** raises it by about a third.
- **One tier of gear** (+1) lowers the cost more than five levels do, and **one tier worse** (-1) pushes you into "dangerous" (over half your health).
- A **level 20 character in starter gear** is still in trouble from the second tier on; a **level 1 character in the best gear** can survive mid-tier fights.

## Difficulty levels (data/tuning.js, TUNE.difficulty)
| | Easy | Normal | Hard |
|---|---|---|---|
| Damage you take | 0.6x | 1x | 1.35x |
| Enemy health | 0.75x | 1x | 1.3x |
| Health regeneration | 1.8x | 1x | 0.6x |
| Enemy telegraph length (non-boss) | 1.25x | 1x | 0.85x |
| Enemy chase speed (non-boss) | 0.92x | 1x | 1.08x |
| Elite and champion frequency | 0.6x | 1x | 1.5x |
| Food and potion drops | 1.5x | 1x | 0.7x |
| Shop buy prices | 0.85x | 1x | 1.2x |
| Gear durability | off | your option | on |

No difficulty skips boss phases or removes telegraphs.

## Danger readability
- The target bar colours the enemy's name by how dangerous it is for **you right now** (green, white, yellow, orange, red) and adds DEADLY or HOPELESS for the worst two.
- The bestiary shows "danger to you now" for every creature you have fought.
- Arriving somewhere a tier or more beyond what your gear and level are ready for shows a one-time warning ("DANGEROUS FOR YOU. PREPARE." / "FAR BEYOND YOU. GEAR UP FIRST.").

## Limits of this model
It is a model: it assumes two ordinary enemies, typical gear per tier, and a fixed hit rate. Round 19 of the plan checks it against the real bots (hundreds of fights per difficulty, region, boss and arena hero).
