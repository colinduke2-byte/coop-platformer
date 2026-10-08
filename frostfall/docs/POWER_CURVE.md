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

## Round 6 to 19 additions: creatures checked against the model

Cost of two of each creature (tier-scaled) as a share of the expected player's health on Normal, with its danger letter (E easy, F fair, T tough, D deadly, H hopeless). Regenerate with `node tools/enemy_danger.mjs [kinds...]`.

```
creature                       tier0    tier1    tier2    tier3   (expected player of that tier, two of them)
werewolf     hp   52 dmg 16       60% D    38% T    23% F    14% F
ghost        hp   28 dmg 14       28% T    18% F    11% E     6% E
bogwraith    hp   40 dmg 14       41% T    26% F    16% F     9% E
boghag       hp   58 dmg 17       72% D    45% T    28% F    16% F
leech        hp   14 dmg  6        6% E     4% E     2% E     1% E
mudlurker    hp   56 dmg 17       69% D    43% T    27% F    16% F
thunderbird  hp   64 dmg 18       84% D    53% D    32% T    19% F
mammoth      hp  100 dmg 21      152% H    96% H    59% D    34% T
nomad        hp   46 dmg 15       50% D    31% T    19% F    11% E
nomadshaman  hp   44 dmg 17       54% D    34% T    21% F    12% F
stonegiant   hp  200 dmg 26      377% H   237% H   146% H    85% D
wolf         hp   28 dmg 10       20% F    13% F     8% E     5% E
bear         hp   95 dmg 20      138% H    87% D    53% D    31% T
knight       hp   70 dmg 19       96% H    61% D    37% T    22% F
```

Rules applied: night wolves become werewolves less often in the gentle country (35% of the moon's chance in tier 0, 70% in tier 1); the Fens and the Highlands start at tier 1 (there is no gentle end); mammoths and stone giants are world-boss-sized and only appear in the wild lists at the tiers where the expected player can survive them; Greytusk (the roaming mammoth) has 3.2x health. Difficulty and capstone perks: see CHANGELOG rounds 30 to 34.

## Final balance pass (balance bot, 3 trials each)

The bot is a *lower bound* on human skill: it never parries and does not flank. Read these as sanity checks.

| Fight | Normal | Easy | Hard |
|---|---|---|---|
| Wolf pack, starter gear | 3/3 | | 3/3 |
| Bandit camp, iron gear | 3/3 | | 3/3 |
| Crypt hall, steel gear | 0/3 | 3/3 | |
| Jarl Valdrek, iron gear | 3/3 | | |
| Grimfang, iron gear | 3/3 | | |
| Kragnar, ember mail | 1/3 | 3/3 | |
| Ashen Sovereign | 1/3 | | |
| Admiral Veyl | 2/3 | | |
| Hollow King | 0/3 | 1/3 | |

Run it yourself: `DIFF=easy|normal|hard node test/balance.mjs 3 [name]`. Reading: the first dungeon's big hall is tough for a bot on Normal even in steel gear (the plan wants preparation to matter) and comfortable on Easy; every boss has a 'ready' kit that wins on Easy; the last boss is hard on every setting for a bot. Tuning knobs: `TUNE.difficulty` (tuning.js), `GEAR`/`EXPECTED` (powercurve.js).
