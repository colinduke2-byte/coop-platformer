# New weapons: daggers, staves, halberds

Status: daggers, staves and halberds built. The section "How each region hands them out" below is the original plan; the tables above are what is in the game. Written so each weapon family has a full ladder of versions, every version has its own look, and every region hands out something new.

## Where they fit
- Today: swords (no style), axes, spears, maces, greatswords, hammers, bows, shields. `hunting_knife` already has `style: 'dagger'` and a four-hit combo in `TUNE.player.styles.dagger`, but no sneak bonus and only one design.
- Gear tiers (docs/POWER_CURVE.md): tier 0 Iron (Hollow Reach), tier 1 Steel (Fens, Highlands), tier 2 Nordic (Glasswood, Ashen Peaks, Frozen Coast), tier 3 Forged (Old Kingdom, Underdeep, Emberhold forge, Long Winter). One tier of gear matters more than five levels, so each family must have an upgrade at every tier.
- Damage ladder to match: one-handed 9 / 13 / 17 / 22 (rusty to Nordic), uniques 26-38. Two-handed 21 / 31, uniques 36-54.

## Rules for all three
1. Every version has its own silhouette (not a recolour). Three to four icon and held-sprite shapes per family, with colour and ornament varying inside a shape.
2. Every region offers at least one version of each family, from a shop, a chest, a camp or a boss.
3. Each family gets a "first find" in the opening hours so the build can start early, a mid-game pick, and an endgame unique.
4. Procedural loot (`genloot.js` BASES) learns the three bases so rarity and affixes roll on them too.
5. Forge: every family gets an Emberforged version at the Emberhold smith, and normal upgrades (+1 to +3), sockets and enchants work as for other weapons.

## Daggers (one-handed, `style: 'dagger'`): BUILT
Role: fast, cheap, quiet. A stealth and crit weapon, the natural off-hand for dual wield.
Rules in the game now (`TUNE.player.dagger`, `playerCombat.swordHit`):
- Sneak attacks with a dagger get **+1.0x** on top of the usual 3x (stacks with Sneak skill, Backstab and Assassin perks).
- A hit on an enemy that is **facing away** (not sneaking needed) deals **x1.4** and shows BACKSTAB.
- The fourth combo hit **pierces 35% of armour** (`styles.dagger[3].pierce`); the Court Misericorde pierces 50%.
- Item fields: `inflict` (bleed or poison, optionally only on sneak attacks), `sneakBonus`, `pierce`, `assassinate` (sneak attack kills any non-boss), `wearMul` (wears out faster), plus the existing `crit`, `elem`, `sockets`.
- Eleven blade shapes drawn in code from one profile each (icon and held sprite share it): knife, shiv, dirk, stiletto, clan, glass, kris, misericorde, ember, night, bite.

| # | Dagger | Dmg | Twist | Where it is found |
|---|---|---|---|---|
| 1 | Hunting Knife | 6 | plain | Starter gear |
| 2 | Skinning Knife | 10 | 5% crit | Hilda's daily stock |
| 3 | Bone Shiv | 11 | bleeds | 10% from Draugr Wardens, 4% from draugr |
| 4 | Grimfang's Bite | 17 | 10% crit, +0.5x sneak | Grimfang (first boss) |
| 5 | Reedwick Stiletto | 19 | poison on sneak attack | Sunken Hollow (Fens delve) boss chest |
| 6 | Clan Dirk | 21 | bleeds (60%) | Stormspire (Highlands delve) boss chest |
| 7 | Smuggler's Knife | 22 | 14% crit | Smugglers' Guild armoury (existing; now a true dagger) |
| 8 | Glass Dagger | 24 | 18% crit, wears out 2x faster | Hart Spire (Glasswood delve) boss chest |
| 9 | Tide Kris | 26 | frost | Tidebreak Cavern (Frozen Coast delve) boss chest |
| 10 | Court Misericorde | 29 | 4th hit pierces 50% armour | Hollow Sepulchre (Old Kingdom delve) boss chest |
| 11 | Emberforged Dagger | 30 | fire, 8% crit | Emberforge (needs Smugglers 20 rep, ash iron and ember ore) |
| 12 | Nightshade | 34 | sneak attack kills any non-boss; +1.0x sneak | Lode Chasm (Underdeep delve) boss chest |
Dagger bases also roll in generated loot (`Dagger` in `genloot.js`).

## Staves (one-handed, `style: 'staff'`): BUILT
Role: the mage's weapon. A weak two-hit poke in melee, and the stat line is the point.
Rules in the game now:
- Item fields: `spellMul` (all spells), `elemMul` (one element), `spellCost` (per-spell cost multipliers), `manaCostMul`, `mpRegenMul` (mana regeneration), `spellCrit`, `chainAdd` (lightning chains further), `slowAdd` and `rootChance` (frost bolts), `wardMul` and `wardTime`, `freeEvery` (every Nth cast is free), `bolt` (the element of the heavy attack).
- **Heavy attack with a staff** fires a weak free bolt of the staff's element: it costs stamina (18), not mana.
- `player.spellPow()` combines skill, the staff's multipliers and spell crit; spell costs and regeneration read the staff as well.
- Twelve head shapes drawn in code, each unique: burl, fork, ice spire, reed tuft, iron fork with spark, crystal cluster, caged ember, shell ring, gold crown scepter, rock head with amber, tall winter spire, flame.

| # | Staff | Melee | Spell bonus and twist | Where it is found |
|---|---|---|---|---|
| 1 | Walking Staff | 5 | none | Mirra's stock |
| 2 | Hazel Staff | 6 | spells +8% | Mirra's stock |
| 3 | Frostbirch Staff | 6 | +12%, frost and Frost Nova cost 15% less, frost slows longer | Dropped by the Rime Wyrm |
| 4 | Reed-Warden's Staff | 7 | +15%, mana regen +25%, 30% of frost bolts root | Bog Hags (10%) |
| 5 | Stormcrown Rod | 7 | +18%, lightning costs 10% less and chains one further | Clan shamans (10%) |
| 6 | Prism Staff | 7 | +20%, 8% spell crit (x1.6) | Glimmerkin (8%) |
| 7 | Cinder Staff | 8 | +22%, fire, Ember Nova and Meteor cost less, fire +10% | Conjurers (6%) |
| 8 | Tidecaller's Staff | 8 | +20%, Ward 20% stronger and 50% longer | Tide Guild armoury (75 rep) |
| 9 | Sovereign's Scepter | 9 | +28%, every 4th cast free, fire +10% | The Forge boss chest (Ashen Sovereign) |
| 10 | Delver's Lodestaff | 9 | +25%, mana regen +45% | Dropped by the Lode Colossus |
| 11 | Staff of the Long Winter | 10 | +35%, Frost Nova half price, frost +10% | Dropped by the Long Winter |
| 12 | Emberforged Staff | 8 | +30%, fire +30% | Emberforge (ash iron, ember ore) |
Staves also roll in generated loot (`Staff` base).

## Halberds (two-handed, `style: 'halberd'`): BUILT
Role: a heavy polearm for crowds. Slow, long, wide.
Rules in the game now: three-step combo: **sweep**, **reverse sweep** (hit boxes 1.8x wider than long, so they catch foes off to the side), then an **overhead plant** (guard breaker, stagger 0.8 s, pierces 40% armour). Item fields: `pull` (hook drags small foes in), `vsUndead`, `plantStun`, `swingGuard` (less damage taken while swinging), `pierce` (extra plant armour pierce), `killFreeze` (a killing blow freezes nearby foes), `inflict`, `elem`, `crit`.
Eleven head shapes: bill hook, axe and spike, curved glaive, broad leaf, crescent bardiche, harbour glaive, faceted voulge, court halberd with tassel, flame blade, stone-and-amber glaive, the Reaper's scythe.

| # | Halberd | Dmg | Twist | Where it is found |
|---|---|---|---|---|
| 1 | Woodsman's Bill | 16 | hook pulls small foes in | Hilda's stock |
| 2 | Iron Halberd | 22 | none | Hilda's stock |
| 3 | Warden's Glaive | 28 | +15% vs undead | Draugr Wardens (5%) and wights (4%) |
| 4 | Clan Glaive | 31 | bleeds (50%) | Clan raiders (5%) |
| 5 | Ironwatch Bardiche | 36 | plant stuns 0.5 s longer | Dropped by Hrolf Ironmarch |
| 6 | Harbour Glaive | 36 | frost | Seaweed Cove boss chest (Brinegut) |
| 7 | Glass Voulge | 38 | 10% crit | Crystal golems (5%) |
| 8 | Court Halberd | 42 | 30% less damage while swinging | Bone Sentinels (5%) |
| 9 | Emberforged Halberd | 46 | fire | Emberforge (needs Anvil Court 20) |
| 10 | Lode Glaive | 48 | plant pierces 50% armour | Lode Chasm boss chest |
| 11 | Reaper of the Long Winter | 56 | frost, kills freeze nearby foes | Dropped by the Long Winter |
Halberds also roll in generated loot (`Halberd` base).

## How each region hands them out
| Region (tier) | Dagger | Staff | Halberd |
|---|---|---|---|
| Starter village / Hollow Reach (0) | Hunting Knife, Skinning Knife, Bone Shiv, Grimfang's Fang (boss) | Walking, Hazel, Frostbirch | Woodsman's Bill, Iron Halberd |
| Weeping Fens (1) | Reedwick Stiletto | Reed-Warden's Staff | none (crypt Warden's Glaive in the Reach) |
| Stormcrown Highlands (1) | Clan Dirk | Stormcrown Rod | Clan Glaive |
| Glasswood (2) | Glass Dagger | Prism Staff | Glass Voulge |
| Ashen Peaks / Emberhold (2-3) | Emberforged Dagger | Cinder Staff, Emberforged Staff | Emberforged Halberd |
| Frozen Coast (2) | Tide Kris | Tidecaller's Staff | Harbour Glaive |
| Old Kingdom (3) | Court Misericorde | none | Court Halberd |
| Underdeep (3) | Nightshade | Delver's Lodestaff | Lode Glaive |
| Final (3) | none | Staff of the Long Winter | Reaper of the Long Winter |

Boss drops: Grimfang (dagger), Hrolf Ironmarch (halberd), Ashen Sovereign (staff), Lode Colossus (staff), Long Winter (staff, halberd).
Shops: Hilda (daggers, halberds), Mirra (staves), Emberhold smith and mage (Emberforged, Cinder), Skarn Hold weaponsmith (Clan weapons), Reedwick smugglers (stiletto).
Forge recipes: Emberforged dagger, staff and halberd (ember ore plus a boss core).
Generated loot: `Dagger` (exists), `Staff`, `Halberd` added to `BASES`, so chests and elites roll rarity and affixes on them from tier 0.

## Art plan
- Icons: new drawers `dagger` (4 silhouettes: shiv, dirk, stiletto, kris), `staff` (4 heads: gnarled, crystal, orb-and-prongs, scepter), `halberd` (4 heads: bill-hook, axe-and-spike, crescent glaive, ornate court). Each item picks a silhouette plus colours.
- Held sprites: `buildHeld` gets `dagger`, `staff`, `halberd` shapes (same silhouette family as the icon).
- Equipment sheet script `test/native_equipment.mjs` already renders every item, so new weapons show up there for review.

## Build order
1. **Foundation**: `style` rules for `staff` and `halberd` (combo tables, hit feel, reach, sneak bonus for dagger), `genloot` bases, stat plumbing for spell power, mana cost and mana regen on weapons, icons and held sprites for all three, tests for each rule.
2. **Daggers** (12 items plus loot placement and sprites). Sample image first.
3. **Staves** (12 items), including the heavy-attack bolt. Sample image first.
4. **Halberds** (11 items). Sample image first.
5. **Placement**: shops, boss drops, chests, forge recipes, quest rewards, bestiary and lore lines.
6. **Balance and publish**: balance bots with each family, full regression, equipment image, republish.

## Tuning knobs (so feel can be changed in plain words)
- Dagger: `swing`, `costMul`, sneak bonus, armour pierce on hit four.
- Staff: melee damage multiplier, `spellMul`, `manaCostMul`, `mpRegenMul`, bolt damage.
- Halberd: reach, sweep arc, `swing`, `costMul`, overhead stagger time.
All live in `TUNE.player.styles` and the item rows, so a change is one number.

## Open questions
- Should staves also work as the off-hand "tome" slot with a shield, or only as the main hand? (Plan: main hand only.)
- One free dagger sneak-kill per fight on non-bosses (Nightshade) might be too strong in the arena; plan: arena heroes cannot use it.

## Gear art pass (done)
Every other weapon, shield, armour and charm now has its own hand-built shape instead of a recoloured template (`src/art/gear.js`, helpers in `src/art/cells.js`):
- Swords 11 + greatswords 5: one blade profile each (rusty notches, fullered steel, winged Nordic, jagged Grave-Brand, flame blade, hooked Drowned Hook, basket-hilt cutlasses, crystal Shardblade, bone, wolf-pommel Packbreaker, crowned King's Blade).
- Axes, picks, hammers, maces and spears 16: their own heads.
- Bows 6 (including two crossbows) and shields 5, each with a held sprite for shields.
- Armour 21: a different garment each. Charms 25: rings, pendants, brooches, crowns, a lamp, a banner, a collar.
- Generated loot bases now use the same shapes, so random chest gear no longer looks like old templates.
`test/stage69_gear_art.mjs` checks that all 124 pieces of gear have distinct icons and that weapons and shields have distinct held sprites.
