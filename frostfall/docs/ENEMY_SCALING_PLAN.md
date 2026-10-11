# Enemy scaling with progress: plan

Status: BUILT (first version). After building, the power model showed that 4x health / 2.5x damage made the late game too punishing even with the best gear (an ordinary fight in the last region cost 73% of your health on Normal), so the slopes were eased to **3x health and 2x damage at full strength** (`TUNE.scaling.hp = 2.0`, `dmg = 1.0`). With that, an ordinary fight with the expected gear costs about 32% / 35% / 39% / 45% of your health in region tiers 0 to 3 on Normal, and one gear tier better still costs 19% to 26%. The tables below show the original 4x/2.5x numbers; the live numbers are in `src/data/tuning.js`.

## Why

Once the player has a decent sword and armour, ordinary enemies (bandits, wolves, draugr, bears...) die too fast and hurt too little. Today ordinary enemies scale only by region tier (+28% health, +13% damage per tier, four tiers), which is gentle and ignores how far through the story you are.

## What you decided

- Driver: **region and story together.**
- Steepness: an ordinary enemy at the end of the game has about **4x the health and 2.5x the damage** of the same enemy at the start.
- Revisiting early areas with late gear: **a bit tougher, never trivial.**
- Who scales: **ordinary enemies only** (everything that is not a boss and not a passive animal). Bosses keep their hand-tuned numbers.

## The formula

Two inputs, both from 0 to 1:

- **r, the region fraction:** the area's tier (0 to 3) divided by 3. Starting woods and village roads are 0, the last region is 1.
- **s, the story fraction:** main-story milestones completed divided by the total.

One blended progress value per enemy:

    f = 0.7 * r + 0.3 * s

    health multiplier  = 1 + 3.0 * f      (4.0x at f = 1)
    damage multiplier  = 1 + 1.5 * f      (2.5x at f = 1)

This **replaces** the existing per-tier numbers (1 + 0.28 tier, 1 + 0.13 tier) rather than stacking on them, so nothing is counted twice. The difficulty setting and the ordinary-monster bonus (x1.3 health, x1.15 damage) still multiply on top, and so does New Game+.

What that gives (health multiplier / damage multiplier):

| Where you are, how far you are | f | Health | Damage |
|---|---|---|---|
| Starting woods, game just begun | 0.00 | 1.0x | 1.0x |
| Starting woods, game finished (revisiting) | 0.30 | 1.9x | 1.45x |
| Middle region, halfway through the story | 0.50 | 2.5x | 1.75x |
| Last region, game just begun (you rushed ahead) | 0.70 | 3.1x | 2.05x |
| Last region, game finished | 1.00 | 4.0x | 2.5x |

Revisiting an early area at the end is 1.9x health and 1.45x damage: clearly easier than new ground, never trivial.

Example, a bandit on Normal (base 37 health, 13 damage, difficulty x1.65, monster bonus x1.3 health / x1.15 damage):

| | Health | Damage per hit (before armour) |
|---|---|---|
| Start of the game | about 79 | about 15 |
| Starting woods after the story | about 150 | about 21 |
| Last region, end | about 316 | about 37 |

## Story milestones (the s value)

Counted from flags that already exist, so no new quest data:
- the first crypt boss (Jarl Valdrek) defeated
- each of the four Hearts taken (Rime, Iron, Tide, Root)
- the Ember Crown chapter bosses (Kragnar, the Ashen Sovereign)
- the other region bosses (Admiral, Hollow King, Mire Mother, Storm Giant, Hartking, Lode Colossus)
- the Long Winter (final boss)

About a dozen in all; each counts the same. The exact list is fixed in implementation by reading the real flags.

## Where it plugs in

1. **New `systems/enemyscale.js`**: pure functions `progressFraction(tier, story)`, `hpMul(f)`, `dmgMul(f)`, and a `storyFraction()` that counts milestones from state. No game objects, so it is unit-testable.
2. **`Enemy.js` constructor**: use the new multipliers instead of the tier formulas. Skip bosses (`cfg.title`) and passive animals as now.
3. **Spawners**: camps, dens, streamed open-world enemies and raised/summoned minions already pass a `tier`; audit that every spawn path sets one. For the open world, tier comes from distance to the village or the region it belongs to (needs checking; any spawn without a tier is treated as 0, which would stay easy).
4. **Loot and XP**: gold already scales with tier (+50% per tier); tie it to f so rewards match the harder fights. XP gets a matching bump so levelling keeps pace.
5. **Danger system and bestiary**: the danger warnings and the bestiary danger names read enemy base stats; they must use the scaled numbers so the warnings stay honest.
6. **Power model (`powercurve.js`, `docs/POWER_CURVE.md`)**: update the enemy table to the new curve so the "expected fight cost" targets still describe the game.

## How we will know it is balanced

Reuse the existing fight-cost model: an ordinary fight should cost the expected player about a third of their health with the gear they are expected to have at that point.

- **Expected gear stays hard enough:** with the kit the game expects for a region, an ordinary fight costs 25-40% of health.
- **Good gear should not erase the challenge:** with one gear tier better than expected, it should still cost at least 15% (the "one-shotting everything" complaint).
- **Bad gear is dangerous but not impossible:** one tier worse than expected costs under about 75%, so a careful player can still win.
- Balance bot checkpoints: Starter, Iron, Steel, Nordic, Forged and Legendary kits against the matching region tiers, and a rush check (Starter kit in the last region should be clearly unsafe).
- Tests: curve values for every (region, story) pair above, bosses unaffected, passive animals unaffected, scaled health shows up on a spawned enemy, danger names use scaled values, old saves load.

## Order of work

1. Pure curve module and its unit tests.
2. Wire into `Enemy.js` and audit spawners so every enemy has a tier.
3. Gold, XP, danger and bestiary updates.
4. Power model and docs; balance bot checkpoints; tune the 0.7/0.3 blend and the 3.0/1.5 slopes against the targets.
5. Playtest pass with you, then adjust the numbers (they all sit in one tuning block).

Each step is its own publish, so you can feel it as we go.

## Still open (small, I'd like your call)

- **XP and gold:** scale them with f (recommended), or leave rewards as they are?
- **Elite and champion enemies:** also appear more often at high f (e.g. up to 1.5x as often), or leave their rate alone?
- **Extra tiers:** the world has four region tiers (0-3). Do we want the very last regions to have a fifth tier, so the top end can climb above 4x?
- **New Game+:** still stacks on top (+40% health per run). Fine as is?

## Risks

- Late enemies hit for about 2.5x: with armour at the soft cap, damage per hit is still manageable, but check against the player's health pool in the balance bot.
- Enemies that spawn without a tier would quietly stay easy; the audit in step 2 closes that.
- Long fights get boring if health is the only lever; if the numbers feel spongey we move some of the difficulty into damage, attack speed or more elites instead.
