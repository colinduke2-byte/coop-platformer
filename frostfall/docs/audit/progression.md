# Audit: progression, loot and economy (prefix PR)

Reviewer area: character level, skills and perks; loot (rarity, affixes, sets, drop rates); gold sources and sinks (shops, forge +10, enchanting, alchemy, selling, repair); carry weight and armour classes; build variety; New Game+ and Arena rewards; pacing.

**Method.** I read the context docs and the code in `src/systems/{genloot,stats,upgrades,powercurve,skills,sets,sockets,durability,burden,relics}.js`, `src/data/{items,items4,perks,stock,services,emberhold,tuning,mods}.js`, `src/entities/{playerCombat,playerMagic,Projectile,Enemy,PatternBoss}.js`, `src/world/{loot,kills,arena,arenaRun}.js` and `src/systems/state.js` (NG+). I checked the numbers with small node scripts that import the real modules (in the scratchpad, not the repo):
- 20,000 `genItem` rolls per tier;
- a buy/sell arbitrage scan of all 147 shop wares;
- the mage-against-melee kill cost from `powercurve.js`;
- the best crit item per slot.

I did not run the browser or the balance bot. Findings marked **(verified)** were checked against code or a script. Findings marked **(estimate)** rest on modelling.

**Headline numbers**
- A generated **Legendary never gets its 3 affixes**: 0 of 20,000 rolls did, and about 12% got only one. About 37% of Rares get one affix instead of two.
- **Infinite gold**: Ash Iron x3 costs 36 g from the Delvers and sells for 45 g.
- **Spells do not scale with gear.** An ordinary tier-3 enemy takes about 30 Fireballs (about 540 mana) to kill, against about 8 sword hits for the expected melee build.
- **New Game+ does not scale bosses** (`!cfg.title`), and the early regions stay near their starting strength.

---

## Fixes and polish

### PR-01 Mage builds stop working after tier 0: spell damage ignores gear and upgrades (verified)
- **Problem.** Spell damage is `base × Destruction skill × staff.spellMul × staff.elemMul` (`playerMagic.js spellPow`, `damage.js spellDamage`). Nothing from the forge, gems, runes, sets or generated loot adds to it. Upgrading a staff at the forge only raises its melee poke (`upgrades.js` treats staves as `weapon`), so a mage spends gold on a stat they never use.
- **The design rule breaks for mages.** The rule is "power comes mostly from gear" (`docs/POWER_CURVE.md`). Melee damage per hit grows about 7x from tier 0 to tier 3, and enemy health about 13x. Spells grow about 2x: skill 1.0 → 1.7, staff 1.08 → 1.35.
- **Cost of one ordinary enemy at the expected level of each tier** (from `powercurve.mobOf`):

| Tier | Mob HP | Melee hits | Fireballs | Mana | Meteors |
|---|---|---|---|---|---|
| 0 | 79 | 4.6 | 4.4 | 80 | 1.8 |
| 1 | 208 | 5.5 | 9.3 | 167 | 3.7 |
| 2 | 550 | 7.7 | 18.9 | 341 | 7.5 |
| 3 | 1027 | 8.0 | 29.8 | 537 | 11.8 |

  An elemental weakness (x1.5) only trims this. A pure mage is not viable past the first region; spells end up as utility for a melee character.
- **Why it matters.** The guide, the arena heroes (Frostmage, Pyromancer) and about 13 staves all present mage as a build. A player who commits to it hits a wall around tier 1 and cannot forge out of it.
- **Fix.**
  1. Give staves their own upgrade kind (`staff`): each level adds spell power (+5/6/8% per tier, the same ladder as weapons) instead of poke damage.
  2. Scale generated staff `spellMul` with tier and rarity (today it is a flat 1.1).
  3. Let rubies in a staff add a percentage of spell power.
  4. Add a staff curve to `powercurve.js` so the model and `test/unit/power.mjs` cover a mage.
- **Impact** H · **Effort** M · **Files** `systems/upgrades.js`, `systems/stats.js`, `entities/playerMagic.js`, `systems/genloot.js`, `systems/powercurve.js`, `data/services.js` (forge text) · **DESIGN** (sets how strong mages are)

### PR-02 Generated Legendaries never roll 3 affixes; Rares often roll 1 (verified)
- **Problem.** In `genloot.js genItem`, an affix that would be a second prefix or a second suffix is skipped (`continue`), but it has already been spliced out of the pool and the attempt counts. No affix is both a prefix and a suffix, so an item can hold at most one of each.
- **Measured over 20,000 rolls at tier 3:**
  - Legendary: 3 affixes 0%, 2 affixes 88%, 1 affix 12%.
  - Rare: 1 affix 37%.
  - So a "Legendary" is a Rare with a x1.45 multiplier, and many Rares are just Magic items.
- **Why it matters.** The rarest drop in the game breaks the promise its colour makes, and reforging cannot fix it, because the reroll uses the same function.
- **Fix.** Draw only from affixes whose name slot is still free. For a third affix, allow a nameless one (shown in the tooltip only) or a combined suffix ("of Embers and Precision"). Add a unit test: `rarity.affixes === affixLines.length` over 1,000 rolls per rarity.
- **Impact** H · **Effort** S · **Files** `systems/genloot.js`, a new unit test

### PR-03 Infinite gold: Ash Iron and lockpicks sell for more than they cost (verified)
- **Problem.** Every item sells for 50% of its `value` (`services.js sellPrice`), but bundled wares are priced by hand.
  - Delvers' guild goods (`emberhold.js`): Ash Iron x3 costs 36 g, or 12 g each. Each sells for 15 g, so every purchase earns 9 g. The quantity picker (1/5/10/ALL) makes this a gold printer. It still pays a little on Hard (x1.2 price) and pays more on Easy (x0.85).
  - Lockpicks x3 at Hilda (`dialogue.js:197`) cost 8 g and sell for 3 x 3 = 9 g.
- **Why it matters.** It breaks the whole gold-sink design: forging to +10, house, pony, tomes.
- **Fix.**
  - Price bundles at or above the full value (Ash Iron x3 ≥ 90 g, or lower Ash Iron's `value` to 10).
  - Better: pay bulk materials and lockpicks a quarter of their value, not half.
  - Add a unit test that scans every ware list for `unitPrice × difficulty.price.easy ≥ sellPrice`. My scan script is a 20-line starting point.
- **Impact** H · **Effort** S · **Files** `data/emberhold.js`, `data/dialogue.js`, `data/items.js` (values), `data/services.js`, a new test

### PR-04 Perks and staff bonuses that do less than their text says (verified)
- **Staff element bonuses (`elemMul`) only reach two spells.** `elemMul` is read by spell id (`w.elemMul?.[S.spell]`), so `{fire: 1.3}` only boosts Fireball and `{frost: 1.1}` only boosts Frost Bolt.
  - Emberforged Staff ("fire spells +30%"), Cinder Staff and Sovereign's Scepter do nothing for Ember Nova or Meteor.
  - The Staff of the Long Winter does nothing for Frost Nova or Glacier Spear.
- **Frostbite** ("Frost slows for 2 seconds longer") only touches Frost Bolt (`Projectile.js:106`). Frost Bolt is the weakest spell (7 damage), and Frost Nova and Glacier Spear ignore the perk. It is a dead perk.
- **The Destruction chain forces a frost mage through Pyromancer**, a fire perk. Frost is the element that the Sovereign and the Sunscorch call for.
- **Backstab and Assassin** read as "Sneak attacks deal +0.5x / +1.0x", but they only apply to melee (`playerCombat.js:136`). Arrows use `2 + sneakAttack × 0.5` (`Projectile.js:87`), so a stealth archer's capstone does nothing for them.
- **Keen Edge** says "Sword damage +15%", but it applies to every melee weapon, staff poke included. The text is wrong, not the effect.
- **Fix.**
  - Map elements to spell families (`fire: [fire, embernova, meteor]`, `frost: [frost, nova, glacier]`, `shock: [shock]`) in both `spellPow` and `spellCost`.
  - Make Frostbite apply to every frost spell.
  - Either make Backstab and Assassin add to bow sneak shots (at half weight) or say "melee" in the text.
  - Reword Keen Edge to "melee damage".
- **Impact** M · **Effort** S · **Files** `entities/playerMagic.js`, `entities/Projectile.js`, `data/perks.js`, `data/items.js` (descriptions)

### PR-05 Gem and crit bonuses leak between slots (verified)
- **Gems.** `sockets.gemBonus('dmg')` adds up the gems in the weapon, off-hand, **bow and armour**, and `stats.weaponDmg` adds that total to the sword. `stats.bowDmg` never adds gems.
  - A ruby in your bow or body armour makes your sword hit harder.
  - A ruby can never make your bow hit harder, so the archer build gets nothing from rubies.
- **Crit.** `stats.sum('crit')` (used for melee crits at `playerCombat.js:150`) includes the **bow's** crit, and the off-hand's crit even when the off-hand is not swinging.
  - A crit bow (gen "of Precision" up to 12%, Antler Bow 6%) adds to sword crits.
  - Rough ceiling (estimate): Sula's dagger 22% + Glass Dagger off-hand 18% + a crit gen bow 12% + Thorn Crown 4% + a crit gen charm 12% + topaz gems + Delver's set 10% is roughly 80%. There is no cap.
- **Fix.**
  - Make gem damage per item: the weapon's gems go to the weapon, the bow's gems to the bow, and armour gems never add damage.
  - Compute melee crit from weapon, off-hand weapon, helmet, charm, set and gems; compute bow crit from the bow instead.
  - Consider a 50% crit cap.
- **Impact** M · **Effort** S · **Files** `systems/sockets.js`, `systems/stats.js`, `entities/playerCombat.js`, `entities/playerBow.js`

### PR-06 Anvil Court Regalia's "+15% gold" does nothing (verified)
- **Problem.** The 3-piece Court bonus `goldMul: 0.15` goes through `setBonus`, but gold uses `stats.mul('goldMul')`, which multiplies the equipped items and never reads set bonuses (`inventory.js addGold`).
- **Fix.** Fold `1 + setBonus('goldMul')` into `stats.mul('goldMul')`.
- **Impact** L · **Effort** S · **Files** `systems/stats.js`

### PR-07 Selling a Legendary or a set piece does not ask for confirmation (verified)
- **Problem.** `services.js sellMenu.precious` checks rarity `'legendary'` and `'epic'`, but generated items use `'legend'`, and no item has a `.set` field (sets live in `systems/sets.js`). Only Rares and upgraded items get the "SELL YOUR LAST ...?" check. The same file uses `'uncommon'` in `durability.js BASE`, which does not exist either: Magic items fall back to 70 durability.
- **Fix.** Use `rarityIndex(it) >= 2 || setOf(id)`, and replace `uncommon` with `magic` in `BASE`.
- **Impact** M · **Effort** S · **Files** `data/services.js`, `systems/durability.js`

### PR-08 Upgrades, enchants, sockets and wear are stored per item type, not per item (verified)
- **Problem.** `S.upgrades[id]`, `S.enchants[id]`, `S.sockets[id]` and `S.dur[id]` are keyed by the item id. Generated items have unique ids; handcrafted items do not. As a result:
  - two Glass Daggers held in both hands share one upgrade level, so you pay for one and get two (`stats.offhandDmg` reads `upg(S.equip.offhand)`);
  - a +10 item you sell and later buy again comes back at +10;
  - an Emberforge "masterwork" (`forgeEmber`) does nothing if you already own that item.
- **Why it matters.** These are small exploits that add up, and they block per-item features (PR-21).
- **Fix (short).** Let the forge refuse to upgrade a second copy, or charge double when both copies are equipped.
- **Fix (long).** Give crafted and bought gear instance ids, as generated items already have, with a save migration.
- **Impact** L · **Effort** S (short) / M (long) · **Files** `systems/upgrades.js`, `data/services.js`, `systems/stats.js`, `data/emberhold.js`

### PR-09 Heavy armour speed is still counted twice on some pieces (verified)
- **Problem.** R15 fixed item `moveMul` stacking with the heavy class for Sunplate, Hulkheart and Verdant. These pieces still stack:
  - Bulwark Plate (`moveMul 0.88`), Deep Plate (0.90), Bulwark Helm (0.97);
  - **every generated Plate (0.94) and Greathelm (0.97)**.
- **What the player sees.** `stats.trait('moveMul')` multiplies the item value with `classMix().move` (0.92 heavy, helmet half). Bulwark Plate with Bulwark Helm comes to about 0.75, so the player is 25% slower while the tooltip says "SPEED -12%". A generated Plate with a Greathelm is about 0.81.
- **Fix.** Remove `moveMul` from the generated heavy bases and from Deep Plate. Keep Bulwark's penalty only if it is deliberate, and then show the total speed (class included) in `statLines`.
- **Impact** M · **Effort** S · **Files** `systems/genloot.js`, `data/items.js`, `data/services.js`

### PR-10 Generated loot falls behind handcrafted gear, and rarity barely matters off weapons (verified)
- **Problem.**
  - **Armour:** rarity multiplies armour by `0.9 + 0.1 × mult`. A tier-3 Legendary Jerkin is 12% armour, the same as a Common one. Plate goes 36% → 38%.
  - **Shields:** rarity does not change block at all.
  - **Staves:** fixed `spellMul 1.1` at every tier and rarity, so a generated staff is never worth equipping (see PR-01).
  - **Affix strength** uses `k = min(2, tier)`, so tier 3, 4 and 5 roll exactly like tier 2.
- **Weapons in numbers.** At tier 3 a Legendary Sword is 29 damage. The Emberforged Blade (29, crit, fire, 2 sockets) and the Tide Blade (30) are at least as good. The real chase drops (Kings' Blade 50, Sunbreaker 58) are fixed items.
- **Why it matters.** From mid-game, rarity colours are vendor-value labels, not excitement.
- **Fix.**
  - Let rarity scale armour and block like damage (for example `armor × (1 + 0.1 × tier) × mult^0.5`).
  - Raise the affix cap to `min(3, tier)`.
  - Scale generated staves (PR-01).
  - Give Legendaries one guaranteed "signature" affix that no fixed item has (on-kill frost burst, +1 socket, Ignore 20% armour...).
- **Impact** M · **Effort** S–M · **Files** `systems/genloot.js`

### PR-11 Endgame gear for sale in the starting village (verified data; estimate on how often it shows)
- **Problem.** Hilda's daily rotation (`data/stock.js POOLS.Hilda`) can offer, in Hollowfrost:
  - **Warhammer**: 46 damage, 2 sockets, about 1,064 g;
  - **Bulwark Plate**: 34% armour, about 544 g;
  - **Hunter's Crossbow**: 24 x 1.6 per bolt, about 576 g.

  The power model expects Iron (13 damage, 18% armour) in tier 0 and Nordic (22) in tier 1. The Warhammer is close to the Kings' Blade (50), and the forge's +65% multiplies that base.
- **Why it matters.** A player who saves about 1,000 g skips tiers 1 and 2 of the weapon curve. That collapses the pacing that `POWER_CURVE.md` and the danger colours are built on.
- **Fix.** Gate the rotation by story progress (`storyFraction()`), or move the Warhammer, Bulwark Plate and Crossbow to later hubs and keep Hilda's pool at tier 0–1 items.
- **Impact** M · **Effort** S · **Files** `data/stock.js` · **DESIGN** (where gear appears)

### PR-12 Durability only taxes melee, and repair cost grows with item value (verified code; estimate on income)
- **How wear works.** `wear()` is called on landed melee hits (weapon) and on hits taken (armour, helmet, or the shield when blocking). Bows and spells never wear.
- **Repair cost** is `(max − cur) × (0.15 + value/400)`. A +10 Sunbreaker (durability 70 + 120) costs about **884 g** for a full repair. A +10 Kings' Blade costs about 550 g.
- **How fast it adds up (estimate).** At about 8 hits per late kill, the weapon breaks after about 24 kills. That is roughly 40–60% of the gold those kills drop (about 40–90 g each late on). On Hard, durability is on by default.
- **Fix.**
  - Base repair cost on tier or upgrade level instead of `value`, about a third of today's late-game figure.
  - Wear bows per shot (0.5) and staves per cast (0.25), so archers and mages share the sink.
- **Impact** M · **Effort** S · **Files** `systems/durability.js`, `entities/playerBow.js`, `entities/playerMagic.js` · **DESIGN** (sink size)

### PR-13 Enchant and element tooltips hide what elements really do (verified)
- **What actually happens.**
  - An elemental weapon tags **the whole hit** with its element (`Enemy.takeHit`: `dmg × weak[element]`).
  - Against armoured foes, an elemental hit keeps 45% of its damage instead of 18%.
  - The `+5` power is a small flat add on top.
- **What the player sees.** "Your sword burns for +5 on every hit" (`services.js ENCHANTS`). In practice a 90 g enchant is the strongest damage purchase in the game, worth 1.5x against a weakness and 2.5x against armour. It can also cut damage to 0.3x (Ember Knight against fire).
- **Hidden replacement.** Enchanting an Emberforged Blade quietly replaces its own fire (`stats.enchant` prefers `S.enchants`).
- **Fix.** Reword the enchant and affix lines ("Your hits count as FIRE: x1.5 against the weak, 2.5x through armour"). Warn before overwriting an item's own element. Show "WEAK/RESIST with your weapon" on the target bar.
- **Impact** M · **Effort** S · **Files** `data/services.js`, `systems/genloot.js` (affix lines; "Keen" always says "+8%+"), `scenes/HudScene.js`

### PR-14 Docs disagree with the code on levelling (verified)
- **GUIDE.md** section 4 says "+7% per level" and "every two skill levels make a character level". The code (`skills.js`, `damage.js charLevelFor`) gives +5% and one level per three skill-ups.
- **`powercurve.playerOf`** assumes the character level equals the main skill level (`cl = 1 + floor(3(level−1)/3)`). That overstates attribute health by about 3x in the model. It is small (+42 HP against about +18 at skill 15), but the danger colours read from it.
- **Fix.** Update the guide table and fix `cl` to `1 + floor((level − 1 + offSkillUps)/3)`.
- **Impact** L · **Effort** S · **Files** `docs/GUIDE.md`, `systems/powercurve.js`, `docs/POWER_CURVE.md`

### PR-15 Skill XP for casting at nothing: farm capstones in town (verified)
- **Problem.**
  - Healing at full health pays 6 Restoration XP; Ward pays 5.
  - Blink pays 5 Sneak XP; Frost Nova into the air pays 6 Destruction XP (`playerMagic.js`).
  - With mana regeneration and 25 g mana potions, a player can reach the Sneak capstone (Assassin) by blinking around Hollowfrost without ever sneaking, or Restoration 12 (Second Wind) without being hurt.
  - Each skill-up also feeds character levels and perk points.
- **Fix.**
  - Heal XP in proportion to the health actually restored.
  - Ward XP when it absorbs damage.
  - Blink and Nova XP only with an alerted enemy nearby.
- **Impact** L · **Effort** S · **Files** `entities/playerMagic.js` · **DESIGN** (light: the guide says grinding is rewarded)

### PR-16 Discovery gold counts challenge modifiers twice (verified)
- **Problem.** `discovery.js:59` calls `addGold(reward × modMul('goldMul'))`, and `addGold` applies `modMul('goldMul')` again. With Pilgrim (x1.3) a discovery pays x1.69.
- **Fix.** Pass the raw reward.
- **Impact** L · **Effort** S · **Files** `world/discovery.js`

---

## Upgrades and new

### PR-17 New Game+ is a victory lap with nothing to earn (verified)
- **What NG+ does today** (`state.js startNgPlus`, `Enemy.js:52`): it keeps the whole kit (+10 gear, gold, perks) and gives ordinary enemies **+40% health and +15% damage per cycle**.
- **Bosses are excluded.** `!cfg.title` skips every boss and named foe, and the player gains +4% damage per cycle.
- **Early regions stay weak.** Story flags reset, so the scaling factor `f` drops back near 0. An NG+1 tier-0 wolf has about 110 HP against a +10 kit hitting for 130 or more. The first 60–70% of the game is one-hit kills, and bosses are as tuned for a fresh character.
- **There is nothing new to win:**
  - generated loot tiers cap at region tier + 2;
  - the forge stops at +10;
  - there are no NG+-only items or affixes;
  - gold piles up with nothing to buy.
- **Fix.**
  1. In NG+, set a floor on progress, `f = max(f, 0.5 + 0.25 × (ng − 1))`, and apply the same multipliers to bosses (`TUNE.bosses` × NG factor).
  2. Raise the loot tier by `ng` (tier 6+ for Legendaries) and add a **Mythic** rarity (3 affixes + signature, NG+ only).
  3. Add "Ascended" tempers +11/+12 at the Great Anvil that need an NG+ material (for example a "Winter's Echo" from the Long Winter).
  4. Give each NG cycle a trophy and cloak colour.
- **Impact** H · **Effort** M–L · **Files** `systems/state.js`, `entities/Enemy.js`, `entities/PatternBoss.js`, `systems/enemyscale.js`, `systems/genloot.js`, `systems/upgrades.js` · **DESIGN**

### PR-18 Perks: linear chains, no real choices, and no tank or two-handed identity (verified)
- **How perks work.** There are 20 perks in five straight lines of 4 (`data/perks.js`), each needing the one before it. A perk point comes every 3 skill-ups. So "choosing" a perk only means "the next one in the line of the skill I use". Most perks are flat +15–35% numbers.
- **Missing builds:**
  - There are no perks for **blocking or shields, heavy or light armour, two-handed weapons, the bow's crossbow, or crafting and bartering**.
  - The tank's main activity, blocking, trains **Restoration** (`playerCombat.js:235`), whose perks are about healing.
  - Every melee weapon, greatswords and halberds included, trains "One-Handed".
- **Fix.** Turn each chain into a fork at skill 5 and 8 (two options, pick one).
  - One-Handed: "Duelist (parry)" or "Bulwark (block costs 25% less stamina, +10% block)".
  - Destruction: "Pyromancer" or "Cryomancer".
  - Sneak: "Backstab" or "Hunter (bow sneak +1x)".
  - Rename One-Handed to "Melee" with a 2H branch ("Cleave: wide hits strike all for full damage").

  Allow a respec at an NPC for gold. That is also a good mid-game gold sink.
- **Impact** H · **Effort** L · **Files** `data/perks.js`, `systems/skills.js`, `scenes/menuPerks.js`, the places in `entities/*` that read each perk · **DESIGN**

### PR-19 Upgrades lock you into your weapon: allow transferring a temper
- **Problem.** By the time a player has put about 2,000 g and 10 materials into a +6 weapon, almost no drop beats it in the pack comparison, which uses upgraded damage (`MenuScene.js` description pane). Ember Blade +6 hits for 38.6; a fresh tier-3 Legendary Sword hits for 29. Loot stops mattering, and switching weapon families (sword to halberd) means starting over.
- **Fix.** Add a smith service, "Transfer temper": move N upgrade levels from one item of the same kind to another for about 25% of the gold already spent, with no materials. It is a gold sink that keeps loot exciting.
- **Impact** H · **Effort** M (simpler once PR-08's instance ids exist) · **Files** `data/services.js`, `systems/upgrades.js`, smith scripts · **DESIGN**

### PR-20 Dead zone from skill 12 to 20 (verified)
- **Problem.** The last perk unlocks at skill 12, the last spell at skill 9, and character levels cap at 25. Going from 12 to 20 costs about 6,600 XP (around 2,200 sword hits) for +5% per level and nothing new.
- **Fix.** Add a "mastery" reward at 15 and 20 per skill. Examples:
  - One-Handed 15: the finisher always staggers;
  - Archery 20: arrows recover 100%;
  - Destruction 15: overcast heat decays twice as fast.

  Or open a second capstone tier. Show the next milestone on the Skills tab.
- **Impact** M · **Effort** M · **Files** `systems/skills.js`, `data/perks.js`, `scenes/MenuScene.js renderSkills` · **DESIGN**

### PR-21 A full comparison on gear: "is this an upgrade?"
- **Problem.** The pack pane shows a DMG or ARMOR delta against the equipped item (upgrades included), but not crit, element, lifesteal, sockets, set progress, or the speed of the armour class. Pickups show no marker.
- **Fix.**
  - Show a ▲/▼ marker on pickup toasts and pack rows when the main stat beats the equipped piece.
  - Add a second pane line listing the changes in affixes (+crit, element change, set n/m).
  - Add an "IF UPGRADED TO +N" hint that ties into PR-19.
- **Impact** M · **Effort** S–M · **Files** `scenes/MenuScene.js`, `entities/Pickup.js`, `data/services.js statLines`

### PR-22 An economy budget tool and test (UPGRADE_PLAN step 4 was never checked)
- **Problem.** `docs/UPGRADE_PLAN.md` asks for a material and gold budget: about 24 iron, 36 ash iron, 56 ember ore, 8 heart shards and about 13,000 g per full set. Nothing checks it.
  - With five upgradable slots (weapon, off-hand, bow, armour, helmet) a full set is **22,750 g, 70 ember ore and 10 shards**.
  - About 17 PatternBoss kills each give one shard. That is enough, but most of them come late (estimate).
  - Ash Iron and Ember Ore can be bought without limit (12 g and 65 g each), so the "material gate" is really a gold gate.
- **Fix.** Add `tools/economy_table.mjs`. It counts guaranteed gold, materials and shards per chapter from the quest, boss and chest tables, plus expected enemy gold from spawn tables × `goldMul(f)`. Print income against sinks per tier, and add a unit test that keeps the totals in a band. That would make the "flood or drought" question measurable instead of guessed.
- **Impact** M · **Effort** M · **Files** a new `tools/economy_table.mjs` and `test/unit/economy.mjs`, reading `data/*`

### PR-23 Gems are flat and fade out (verified)
- **Problem.** A Ruby gives +3 weapon damage, about 2% of a late hit. An Emerald gives +15 health, Onyx +3% armour, Topaz +3% crit, all fixed. Sockets grow to 2–3 on late items, but the gems do not.
- **Fix.** Add gem grades (Chipped / Flawless / Royal, sold or dropped by tier) or make gems a percentage (Ruby +6% weapon damage). Add a "combine 3 into the next grade" service at Tamsin's as a material sink.
- **Impact** M · **Effort** M · **Files** `data/items.js`, `systems/sockets.js`, `data/emberhold.js` (Tamsin)

### PR-24 Arena rewards: flat gold, nothing exclusive (verified)
- **Problem.**
  - The Hollow Arena pays `20 + 12 × wave` gold whatever your progress, so wave 10 pays 140 g, about two late ordinary enemies (`arenaRun.js:61`).
  - Items are tier `min(3, wave/3)` and there is no arena-only item.
  - Arena Mode (quick play) saves nothing by design, so its records lead nowhere.
- **Fix.**
  - Scale wave gold by `goldMul(progress)`.
  - Add milestone rewards at best waves 10, 20 and 30: a unique charm, a cloak colour, an "Arena Champion" weapon skin.
  - In Arena Mode, unlock cosmetic hero palettes or new boons by score (saved in settings, not in the campaign save).
- **Impact** M · **Effort** M · **Files** `world/arenaRun.js`, `arena/*`, `systems/achievements.js` · **DESIGN**

### PR-25 Gold-find stacks without limit, and generated "of Plenty" beats every named gold item (verified)
- **Problem.** `stats.mul('goldMul')` multiplies every equipped item:
  - a generated "of Plenty" (+25%) can sit on armour, helmet and charm;
  - Pell adds +10% and the Fox blessing +30%;
  - together that is about **x3.2** before challenge modifiers.

  The named gold items (Sula's dagger, Court Signet, Pell's charm, Scarab charm) give only 10–15%, so the random affix outclasses all of them.
- **Fix.** Add the gold sources together instead of multiplying them, with a +60% cap. Lower "of Plenty" to +10–15% at low tiers.
- **Impact** L · **Effort** S · **Files** `systems/stats.js`, `systems/genloot.js`

### PR-26 A late gold sink at the Great Anvil: raise rarity
- **Problem.** Reforge (`services.js reforgeMenu`) only rerolls affixes at the same rarity, for 50–230 g and a few ingots. Late game has few sinks once gear is +10.
- **Fix.** At the Great Anvil, "Ascend" a generated item one rarity (Magic → Rare → Legendary) for about 600 / 1,500 g, Ember Ore and a Heart Shard, re-rolling affixes with the higher count (needs PR-02). It gives found gear a path to stay relevant and spends late gold.
- **Impact** M · **Effort** M · **Files** `systems/genloot.js`, `data/services.js`, `data/emberhold.js` · **DESIGN**

---

## Top 5
1. **PR-01: Mages stop working from tier 1.** Spell damage ignores the forge and loot. Late enemies need about 30 Fireballs against 8 sword hits. Let staves upgrade spell power.
2. **PR-03: Infinite gold.** Ash Iron x3 costs 36 g and sells for 45 g (lockpicks too). Fix the bundle prices and add a test that scans every shop for this.
3. **PR-02: Generated Legendaries never get 3 affixes.** 12% get only one, and 37% of Rares get one. A small loop fix in `genloot.js`.
4. **PR-17: New Game+ gives nothing to earn.** Bosses are unscaled, early regions are one-hit kills for a +10 kit, and loot does not go past what you have. Set a floor on progress, scale bosses, and add NG+-only loot or tempers.
5. **PR-18 and PR-19: Perks and upgrades have no choices.** Perks are straight lines with no tank or two-handed identity, and upgrades lock you into one item. Add forks at skill 5 and 8, a respec, and a "transfer temper" smith service.
