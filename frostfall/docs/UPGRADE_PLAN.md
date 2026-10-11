# Gear upgrades to +10: plan

Status: PLAN ONLY. Nothing here is built yet.

## Why

Enemies now get stronger with progress (`docs/ENEMY_SCALING_PLAN.md`). Player power has to grow with them. Today the only way to grow a piece of gear is the smith: three steps, each +2 damage or +2% armour, only for weapons and body armour. That is about +6 on a 22-damage Nordic Blade, so it hardly matters. A deeper upgrade ladder lets the enemy scaling stay steep, while a player who explores and invests keeps pace.

## What you decided

- **Ladder:** +10, in tiers, each tier needing materials from a later region.
- **Upgradable:** weapons (every type), body armour and helmets, shields and bows. (Charms and rings stay as they are.)
- **Cost:** gold plus region materials.
- **Late game:** upgrades do most of the work, plus a small trim to the enemy scaling: end-of-game ordinary enemies about **3.5x health and 2.2x damage** (today's committed build has 3x / 2x; the original was 4x / 2.5x). The trim lands together with the upgrades.

## The ladder

| Levels | Tier | Where | Materials | Gold per step |
|---|---|---|---|---|
| +1 to +3 | I | village smith (as today) | Iron Ingot (1, 2, 3) | 50, 90, 140 |
| +4 to +6 | II | Emberhold smith | Ash Iron (2, 3, 4) | 220, 300, 400 |
| +7 to +10 | III | Emberhold Anvil Court forge (needs Anvil Court reputation 45) | Ember Ore (2, 3, 4, 5) plus one Heart Shard each for +9 and +10 | 550, 700, 900, 1200 |

- Tier I is exactly today's cost, so nothing changes for early players.
- The **Heart Shard** is new: each region boss drops one. It is the "you have explored" gate for the last two steps.
- Upgrading never fails and never destroys gear. You can't downgrade; swapping a weapon loses nothing already spent on the old one.

## What each level gives

Percent of the item's own base, so a cheap sword and a legendary one both get better, but the better base still wins.

| Slot | Tier I per level | Tier II per level | Tier III per level | Total at +10 |
|---|---|---|---|---|
| Weapons and bows (damage) | +5% | +6% | +8% | +65% |
| Body armour (armour value) | +1.5% points | +2% | +2.5% | +20% points |
| Helmets (armour value) | +0.5% points | +0.7% | +1% | +7.6% points |
| Shields (block) | +1.5% points | +1.5% | +1.5% | +15% points (capped at 90%) |

Armour has diminishing returns above 40% already (it counts half), so +20% points of armour is about +10% effective. Today's flat +2 damage / +2% armour per level goes away; old saves keep their level and simply use the new formula.

## Where it plugs in

1. **New `systems/upgrades.js`**: `UPGRADE_TABLE` (levels, costs, materials, gains) and `upgradeBonus(kind, level, base)`. Pure maths, easy to test.
2. **`stats.js`**: replace the flat `upg * 2`, `upg * 0.02`, `upg * 1.5` terms with `upgradeBonus`, and add helmet and shield handling.
3. **Smith screens**: pick a slot (Weapon, Off-hand/Shield, Bow, Armour, Helmet). The screen shows the next level's gain, cost and materials, and which smith can do it (village up to +3, Emberhold up to +6, Anvil Court up to +10). The village smith says where to go for more.
4. **Materials**: audit where Iron Ingot, Ash Iron and Ember Ore come from and make sure there is enough for one maxed set (see "Material budget" below). Add the Heart Shard drop to the region bosses.
5. **Names and tooltips**: items already show `+N`; add the total bonus in the item description.
6. **Durability**: already scales with upgrade level (+12 per level).
7. **Power model (`powercurve.js`)**: replace the per-upgrade flat bonus with the new percent bonus and move the expected upgrade level per tier, so `docs/POWER_CURVE.md` stays true.
8. **Enemy scaling trim**: `TUNE.scaling.hp = 2.5`, `dmg = 1.2` (3.5x / 2.2x at full progress).

## Expected upgrade level by region tier

| Region tier | Expected upgrade level |
|---|---|
| 0 (start) | +0 to +2 |
| 1 | +3 |
| 2 | +6 |
| 3 | +9 to +10 |

The balance model should find that, at the expected gear and upgrade level, an ordinary fight costs about a third to 45% of your health on Normal in every tier; with no upgrades at all it should clearly cost more (40% to 70%), so upgrading is worth it but skipping it is not impossible.

## Material budget (to check in the build)

One fully upgraded set (weapon, shield, armour, helmet) to +10 needs roughly: 6 Iron Ingots per piece for +1 to +3, 9 Ash Iron per piece for +4 to +6, 14 Ember Ore and 2 Heart Shards per piece for +7 to +10. Across four pieces that is about 24 Iron Ingots, 36 Ash Iron, 56 Ember Ore, 8 Heart Shards, and about 13,000 gold. If the world doesn't supply that over a full playthrough, the costs get trimmed, not the tiers.

## Tests

- Table: every level has a cost, material, gain; levels are strictly increasing.
- Maths: `upgradeBonus` for each slot and tier gives the totals above; shields never exceed 90%.
- Stats: an upgraded weapon, bow, shield, armour and helmet change the player's damage, block and armour as listed; old +3 saves load.
- Smith: the right smith offers the right levels; materials and gold are taken; can't buy beyond the smith's tier.
- Drops: region bosses drop a Heart Shard.
- Model: expected cost per tier within the band; unupgraded cost is clearly higher.

## Order of work

1. Upgrade table and maths with tests.
2. Stats wiring for all five slots, and old-save compatibility.
3. Smith screens (slot picker, cost display, tier gating) and the Heart Shard drop.
4. Material audit and balance of drops/prices.
5. Power model, enemy scaling trim, balance bot checkpoints at each tier with and without upgrades.
6. Docs, regression, publish when you want it.

Each step is its own publish so you can feel it as we go.

## Still open

- Heart Shard: new item dropped by region bosses (recommended), or reuse an existing material for the last two steps?
- Should the village smith be able to offer more than +3 once you've been to Emberhold, or is the trip to Emberhold part of the point? (Recommended: part of the point.)
- Should bosses also scale gently with the player's upgrades, or stay as tuned? (Recommended: stay as tuned.)
