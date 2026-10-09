# New weapons: daggers, staves, halberds

Status: daggers built; staves and halberds still to do. Written so each weapon family has a full ladder of versions, every version has its own look, and every region hands out something new.

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

## Staves (one-handed, new `style: 'staff'`)
Role: the mage's weapon. Today a caster has no weapon that suits them; the staff turns the spell loadout into a build.
Feel: melee is a weak two-hit poke (dmg x0.5, short reach, quick recover) so it is a fallback, not an attack option. The value is on the stat line: **spell damage +8% to +35%, spell mana cost -5% to -25%, mana regen +10% to +60%**, one signature spell effect per staff. Heavy attack on a staff = a free, weak magic bolt (no mana) so a caster is never helpless.
Skills: Destruction (spell power), plus the existing perks. Works with a shield or a tome off-hand; blocked by the two-hand rule only for halberds.

| # | Staff | Tier | Spell bonus | Signature | Where it is found |
|---|---|---|---|---|---|
| 1 | Walking Staff | 0 | none | nothing, a stick | Starter chest; Mirra gives one |
| 2 | Hazel Staff | 0 | +8% spells | none | Mirra's stock (daily) |
| 3 | Frostbirch Staff | 0 | +12%, frost -15% mana | frost spells slow longer | Hollow Reach shrine chest |
| 4 | Reed-Warden's Staff | 1 | +15%, mana regen +25% | bog spells root | Weeping Fens: Reedwick elder quest reward |
| 5 | Stormcrown Rod | 1 | +18%, shock chains to 1 extra | shock arcs | Stormcrown Highlands: Skarn Hold shaman |
| 6 | Prism Staff | 2 | +20%, +8% spell crit | Blink leaves a decoy | Glasswood: crystal vault; Hartking's drop |
| 7 | Cinder Staff | 2 | +22%, fire -15% mana | burning ground | Ashen Peaks: Emberhold mage shop |
| 8 | Tidecaller's Staff | 2 | +20%, Ward lasts +50% | Ward reflects 15% | Frozen Coast: Tidemother's cove chest |
| 9 | Sovereign's Scepter | 3 | +28%, free meteor every 4th cast | meteor | Dropped by the Ashen Sovereign |
| 10 | Delver's Lodestaff | 3 | +25%, mana regen +45% | mana from ore veins | Underdeep: Lode Colossus drop |
| 11 | Staff of the Long Winter | 3 | +35%, frost nova costs half | freezing wake | Dropped by the Long Winter (final boss) |
| 12 | Emberforged Staff | 3 | +30% fire | ember burst | Emberhold forge recipe |

## Halberds (two-handed, new `style: 'halberd'`, type `weapon2h`)
Role: a heavy polearm for crowds. Slow, long, wide.
Feel: reach x1.45 of a sword, swing 1.25, stamina cost x1.4. Combo: a **wide sweeping cut** (hits a 150 degree arc), a **reverse sweep**, then an **overhead plant** that staggers and knocks back (finisher). Heavy attack = a thrust through the whole line. Slower than a spear, hits more than a greatsword, cannot be dual wielded. Sweeps count as shield-breaking against guarding enemies.
Skills: Two-Handed. Optional perk "Reach": +10% reach.

| # | Halberd | Tier | Dmg | Twist | Where it is found |
|---|---|---|---|---|---|
| 1 | Woodsman's Bill | 0 | 16 | hooks, pulls small enemies 1 tile | Hilda's stock; woodcutter camps |
| 2 | Iron Halberd | 0 | 22 | none | Hilda's stock (rarer) |
| 3 | Warden's Glaive | 1 | 28 | +15% vs undead | Draugr crypt chest (Hollow Reach) |
| 4 | Clan Glaive | 1 | 31 | sweep bleeds | Skarn Hold weaponsmith (Highlands) |
| 5 | Ironwatch Bardiche | 2 | 36 | overhead plant stuns 0.5 s longer | Dropped by Hrolf Ironmarch (Ironwatch Keep) |
| 6 | Harbour Glaive | 2 | 36 | frost, wide sweep | Frozen Coast: Brinegut's flagship chest |
| 7 | Glass Voulge | 2 | 38 | crit sweeps | Glasswood crystal vault |
| 8 | Court Halberd | 3 | 42 | blocks 30% while the sweep is out | Old Kingdom court guards (rare) |
| 9 | Emberforged Halberd | 3 | 46 | fire sweep | Emberhold forge recipe |
| 10 | Lode Glaive | 3 | 48 | smashes ore veins in one plant | Underdeep: Lode Colossus gate chest |
| 11 | Reaper of the Long Winter | 3 | 56 | legendary: killing blows freeze nearby enemies | Dropped by the Long Winter, final boss, New Game+ |

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
