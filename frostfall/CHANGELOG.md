# Frostfall changelog: everything added since the first playable version

The first version (stages 1-8) was the core game: village, forest and crypt, melee / bow / magic / shout,
skills, inventory, 3 NPCs, 2 quests, one boss, save/load, sound. This list covers everything added on top of it.

## Round 12: items, economy and home (Phase 5)
- **Hollow Relics:** eight relics (Frozen Signet, Cracked War Horn, Black Mirror Shard, Ember Seed, Wardens' Lantern, Antler Circlet, Troll Tooth Charm, Star Chart) found by digging (10%), in chests (7%), from world bosses (guaranteed), nemeses and arena milestones. Each is a lore entry. 3 relics: +10 max health; 6: +15 max mana; all 8: **The Hollow Crown** charm (+30 health and mana, +20 stamina, +5% crit).
- **Elixirs** (brewed at a cauldron, drunk from the Items tab, one at a time, stack with meals): **Berserker Draught** (+30% damage, take +20%), **Quicksilver Tonic** (+18% speed, take +10%), **Nightsight Elixir** (night turns pale, harder to spot), **Ironhide Brew** (take -25%, move -7%), **Frostward Tonic** (immune to chill, freeze and slow). Shown in the status row with a timer.
- **Spell tomes:** read once to learn a spell at any skill level (Blink, Lightning, Frost Nova, Spirit Wolf) plus a spell nothing else teaches: **Meteor** (48 mana, a ring marks the spot, a star lands 0.9 s later: big area damage and burn). Sold by Mirra in rotation.
- **Daily shop rotation:** Hilda and Mirra each carry three rotating extra wares that change every in-game day (and per run seed): new weapons, tomes, elixirs. **Buy back** at both shops: the last 8 things you sold, at 120% of what you got.
- **Hilda's menu** is now Forge (upgrade, enchant), **Repair, reforge, buy back**, Fletch, Buy, Sell. **Reforge** re-rolls the affixes of a found item in place (same slot, base and rarity; 50+60/rarity gold and ingots).
- **Optional durability** (Pause > System > DURABILITY, off by default): weapons wear per hit, armour per hit taken, shields per block; broken gear works at 60% (weapons) or 50% (armour, shields) until repaired at Hilda.
- **Home furnishings** (Furnish at the cottage ledger): **Stash Chest** (store and take items), **Herb Garden** (2-4 snowberries and frost lilies once per in-game day), **Trophy Wall** (+5 max health per 3 trophies), **Cooking Pot** (the campfire cook menu at home).
- **Five more recipes:** Fish Stew, Frostberry Tart (+30 max mana), Spiced Venison (+10% damage), Ember Chowder (+10% speed, +20 stamina), Glass Pike Feast.
- Tests: `stage38_items` (relics, elixirs, tomes and Meteor, stock rotation, buy-back, durability, reforge, recipes, home furnishings, repair/reforge/buy-back screens).

## Round 11: world and creatures (Phase 4)
- **Bear dens:** a new point of interest with a **mother bear** and two **cubs**, a cache chest and a bounty. Hurt a cub and the mother is alerted and **enraged** (+30% speed and damage); she crushes shields. When she falls the surviving cubs are orphaned and you can **adopt a cub**.
- **Two companions:** the **bear cub** follows you, bites for a little and soothes your wounds; the **frost hound** still hunts. Own both and an item, the **Pet Whistle** (E in the Items tab), swaps between them.
- **Roaming world bosses:** **Frostbrow, the Winter Elk** (a charging giant) and **Grungnir, the Bridge Troll** (slow, huge, regenerating) each walk a closed loop between points of interest, even while you are far away, leaving **tracks** in the snow along the route. Where one is at any moment is a function of the play clock, so the tracks always lead to it. Each drops a legendary item and gold; once dead they stay dead. New bestiary entries and first-sight tips.
- **Hot springs:** new points of interest. **E: Soak** for about 4 seconds to heal fully, clear every ailment and get **Spring Warmth** (health regeneration and +15 stamina for 4 minutes).
- **Frozen Mine and Beast Warren:** two new barrow themes (golems, frost worms, imps and necromancers; bears, boars, lynx and alphas).
- **Whiteout and aurora weather:** a blizzard can build into a **whiteout** (bright veil, sight halved, a strong wind that bends arrows sideways). On clear nights there is a chance of an **aurora**: shimmering ribbons, **spells cost 20% less**, and a pack of spirit wisps drifts in (they carry elite loot). Predators still hunt by scent in a storm.
- **Ambient life:** ravens perch in the snow by day and scatter (with a caw) when you approach; frost motes drift in the dark; **you leave footprints** in the snow that fade (faster in a storm).
- **A bigger world:** the Hollow Reach grew from 176x128 to 200x144 tiles because the extra points of interest did not fit; a unit test checks that 25 seeds get every kind of site.
- Tests: `stage37_world4` (dens, rage, adoption, pets, roaming bosses, springs, ravens, footprints, whiteout, aurora, wind).

## Round 10: combat depth (Phase 3)
- **New weapon families** (each with its own 2-3 hit move set, held sprite, icon and hit feel): **axes** (Hand Axe, Bearded Axe: two heavy chops), **spears** (Hunting Spear, Ash Spear: long narrow reach, jab-jab-thrust, works with a shield), **maces** (Iron Mace, War Mace: slow, **breaks shield guards**, and chews through armoured knights instead of bouncing). Hilda sells the starter ones; generated loot can roll them too.
- **Riposte:** a successful parry arms a 1.1 s window; your next sword blow hits x1.8, staggers hard and shows RIPOSTE (status row shows the timer).
- **Guard crush:** bears, golems, boars, knights, reavers, warlords and boss slams/charges/leaps smash through a raised shield (22 stamina and a short stun, you still take 80%). Only a perfectly timed parry beats them.
- **Winded:** trying to act with an empty stamina bar (or spending the last of it) leaves you winded: 25% slower for 1.8 s and slower stamina recovery.
- **Armour weight classes:** every armour is light, medium or heavy. Light: rolls cost 20% less, 10% faster stamina, but you are shoved 25% further. Heavy: rolls cost 30% more, 15% slower stamina, but knockback is nearly halved. Shown in item stats (`weights` in `tuning.js`).
- **Smarter enemies:** wolves, alphas, lynx and fencers **flank** (circle to opposite sides) and **pounce together**; **knights and wardens form a shield wall** (-25% damage taken when two stand together); bandits and fencers **slip away at low health and drink a healing draught** (40% health, once).
- **Nemesis:** whatever finishes you off in the open world waits where you fell (one rank stronger, elite, with a waypoint). Each time it wins it grows (+25% health, +12% damage). Beat it for gold and a rare (or legendary after three losses) item. New trophy: Settled Scores.
- Tests: `stage36_combat3` (weapons, reach, mace guard break, riposte, crush, winded, weights, flanking, shield wall, drinking, nemesis).

## Round 9: art and feel (Phase 2)
- **Dedicated animal art:** the **deer** (long legs, antlers), **shadow lynx** (tufted ears, ruff, spots, stub tail), **ember fox** (white-tipped brush, black socks), **snow hare** (long ears, hops) and the **boar** and **bear** now each have their own drawn sheet instead of recoloured wolves. Every animal, including the wolves, has a **hurt** frame (jolted) and a **death** frame (on its back, legs in the air).
- **Humanoid death pose:** bandits, draugr, archers, guardians and you now collapse into a lying-down pose instead of rotating sideways. Everything uses the clip system from Round 8.
- **Smoother walking:** humanoids use a four-beat walk (stride, pass, stride, pass) for you and for enemies; footsteps sound on the strides.
- **Weapon-weight hit feel:** hit-stop and camera shake now depend on the weapon: dagger 0.025 s, sword 0.05 s, axe 0.07 s, greatsword 0.09 s; heavy attacks x1.6, crits x1.25 (`hitFeel` in `tuning.js`).
- **New options (Pause > System):** HIT STOP on/off and DAMAGE NUMBERS on/off.
- **Boss intro card:** engaging any boss slides in letterbox bars with the boss's full title on top and the area name below (2.6 s; the fight starts during its roar as before).
- **Dragon:** fire puffs at the jaw on each breath volley; the sprite now uses the full six-frame clip set.
- **World fix:** since chapter two crowded the map with dungeons, most seeds had **no champions and no groves** at all (champion bounties and the champion fights never appeared). Champions now place before the common camps, points of interest may sit a little closer together, and a unit test checks 25 seeds. The travelling trader also finds a spot in dense woodland now.
- Tests: `stage35_polish`, art baseline refreshed, `test/sheet.mjs` dumps any sprite sheet at 6x for eyeballing.

## Round 8: foundations (hardening + shared systems)
**Hardening**
- `stress_transitions.mjs`: hammers rapid scene changes with text, toasts and random key presses in flight (120 changes, clean). The one-off `null reading 'chars'` / `'scaleX'` errors were traced to a real bug: the HUD cached text objects on the scene instance, and when the HUD was stopped and restarted the cached texts were already destroyed. The HUD now clears them on create, and the stress test relaunches the HUD to guard it.
- **F4 copies a debug report** (seed, map, player state, enemy counts, flags, status effects, last 12 errors, browser) for bug reports. `src/systems/debug.js`.
- **Art regression test** (`art_baseline.mjs`): every generated sprite sheet and icon is hashed against `test/baseline/sprites.json` (121 textures). Intentional art change: `UPDATE=1 node test/art_baseline.mjs`.
- Monkey test: `ONLY=<map>` runs one map, `STACK=1` prints stack traces.

**Shared systems**
- **Status effects** (`src/systems/status.js`): burn, bleed, poison, chill (stacks to 3, then freeze), freeze, shock (+25% damage taken), fear (enemies flee), slow, root. One system for enemies and the player: damage over time, speed and action limits, immunities, cures (health potions clear bleed/poison/burn, resting clears all), HUD labels. Fire thaws ice; ice puts fires out; bosses are only slowed by freeze. Creatures now inflict statuses (`INFLICTS` / `IMMUNE` tables in `enemies.js`): bears and lynx bleed, imps and the dragon burn, wisps shock, frost worms chill, spore mothers poison. Frost hits now chill (three in a row freeze), shock hits can shock. The old `slow` and `dot` fields still work.
- **Animation clips** (`src/art/anim.js`, `buildSheet`): any sheet can define idle, walk, windup, attack, hurt and death clips with any frame size. The dragon now has all six: breathing idle, jaw-wide attack with fire, eyes-shut hurt, and a roll-onto-its-back death.
- **Data layer** (`src/data/registry.js`): validation of every enemy, item and spawn table (unit-tested, so a typo in content now fails a test), and **content packs**: JSON files that add creatures, items and spawn entries, loaded with `__ff.loadPack({...})` or `?pack=<url>`; bad entries are rejected with a reason.
- **Audio mixer and layers:** separate Music / Effects / Ambience levels in Pause > System (ambience no longer disappears when music is off); footsteps differ on snow, ice, stone and wood; distant wolf howls on snowy nights, campfire crackle near fires, creaking wood indoors; boss phases speed the music 7% per phase and keep the drum layer on.
- The pause menu's controls cheat sheet no longer overflows its panel.
- Tests: `stage33_status`, `stage34_audio`, plus new unit tests (data validation, packs, statuses, clips, arena pools).

## Round 7: the long list (a real dragon, life in the wild, and things to do between fights)
- **Skaldrath redrawn.** The Ember Wyrm now has its own 48x32 sprite: a horned, fanged head on an S-curved neck, a barrel chest with golden belly plates and a spiked back, two bat wings that beat in three frames (the far wing is darker for depth), clawed legs and a spiked tail, with fire licking from the jaw. Body and hitbox were resized to match (`enemies.js` body, `Guardians.js` scale 1.9).
- **Wildlife:** **Snow Hares** (tiny, very fast, drop venison) and **Ember Foxes** (russet, fast, drop hide and fangs) bound away as you approach, like deer. Bestiary entries included.
- **Fishing:** frozen lakes have **ice holes**. E to cast, wait, and press E again the moment `! BITE !` shows (0.9 s window; too early spooks it). Catches: Frost Trout, rare Glass Pike, Ember Eel (past the first region). 5% of casts hook a soggy treasure map.
- **Cooking and food buffs:** at any campfire, E now offers *Rest* or *Cook a meal*. Grilled Trout (+20 max health, heals), Smoked Pike (+30 max stamina), Eel Roast (+8% move speed), Hunter's Stew (venison + snowberry: health regeneration). One meal at a time, 5 minutes of play time, shown in the status row. Eat from the Items tab with E.
- **Treasure maps:** found while digging (12%) or fishing (5%). Reading one (E in Items) marks a far-away dig site in the Reach with a waypoint; dig there for two generated items (one guaranteed uncommon+) and gold.
- **Frost hound companion:** a starving hound waits beside the first road in every seed. Share venison (or a cooked meal) and it joins you for good: follows through every map, hunts what hunts you (bite damage grows with your level) and cannot be killed.
- **The Hollow Arena:** a stone gate in the village's east plaza. Endless waves with rising budgets and tiers; every fifth wave brings an elite champion. Each wave pays gold, every third/fifth drops generated gear. Your best wave is saved; yield any time to leave with your winnings.
- **Feats tab:** 26 trophies (kills, bosses, Hearts, fishing, cooking, treasure, arena, hound...) that unlock on their own, with a toast. The menu tab bar was tightened so all eight tabs fit.
- **Music:** three new tracks: *cavern* (sparse, for the Glacial Maw and the lair approaches), *throne* (grand and slow for the Winter Throne boss and the arena) and *dragon* (fast and fierce for Skaldrath).
- **Blizzards:** predators (wolves, bears, lynx, boar) now hunt by scent in a blizzard: their detection is boosted to cancel the stealth bonus the snow gives you against everything else.
- **Fewer wolves:** the wild spawn tables were wolf-heavy (two thirds wolves in the first region). Wolves are now one of several: boars and cinder imps in the first region, lynx and snow bears from the second, more bears deeper in. Wolf dens and packs are unchanged.
- Tests: `stage31_life.mjs` (fishing, cooking, food, maps, feats, music) and `stage32_arena.mjs` (arena waves, hound). The flaky Spore Mother check and the monkey scene-change check were made timing-tolerant.

## Round 6: a wilder world (predators, strange foes, dragons)
- **Predators:** the **Snow Bear** (huge, slow swipes), the **Shadow Lynx** (fades into the snow, pounces from range), the **Tusk Boar** (straight-line charge). They join the wild spawn tables by region; bears and lynxes appear further out.
- **Strange foes:** **Cinder Imp** (sprints at you and bursts), **Grave Caller** (raises draugr every few seconds), **Spore Mother** (rooted, seeds the ground with a pattern of bursts), **Rime Golem** (armoured ice giant), **Pale Wisp** (flies over walls, blinks away), **Frost Worm** (tunnels unseen and untouchable, marks the spot, then surfaces and bites), and the **Mimic** (some chests in the open world are not chests).
- **Dragonkind:** **Ash Wyverns** circle overhead and dive (flyers ignore walls), and **Skaldrath, the Ember Wyrm**: an optional dragon in the **Ember Nest** (an entrance in every world, deep in the far regions). Sweeping triple breath, falling stars, crashing dives, three phases, wyvern hatchlings. Rewards: **Dragonscale Mail**, the **Dragonbone Greatsword**, and the **Dragonfire** shout (a burning cone).
- Every new creature has a bestiary entry and a first-sight tip.

## Round 5: chapter two, "The Four Hearts"
- **New main quest** (from Sigrid once you have dealt with the Frostheart): the Hollow Kings bound the Long Winter with five Hearts and set a guardian over each. Epic, mythic tone; the Frostheart was only the first. Sigrid reads one more faded map after each Heart.
- **Four new dungeons, each a different kind of place, each in every seed's open world:**
  - **The Glacial Maw** (ice cave, slippery floors, frozen-lake chamber) - boss **the Rime Wyrm** (tail, frost breath cone, erupting spikes, lunge; calls frost wights). Reward: **Rime Heart** (+20 stamina; a perfect dodge freezes everything near you).
  - **Ironwatch Keep** (fortress with a courtyard garrison, barricades, archers on the walls, barracks, a locked armoury) - boss **Hrolf Ironmarch** (sweeps, slams, leaps, volleys, rallies the dead garrison). Reward: **Iron Heart** (+8% armour, +10% melee damage).
  - **The Drowned Chapel** (flooded temple, sunken pews, a rune puzzle that opens a sealed chapel) - boss **the Tidemother** (water jet, tentacle eruptions, tail ring). Reward: **Tide Heart** (rolls cost 35% less, stamina returns 25% faster).
  - **The Rootvault** (twisting blight passages, the Wound) - boss **the Ashen Root** (slow and huge; the arena fills with eruptions and spore volleys). Reward: **Root Heart** (slow health regeneration, potions heal 25% more).
- **The Winter Throne:** opens only to someone holding all four Hearts. A hall of the Kings, a gallery of the Hearts, then the final boss **the Long Winter** in three faces (the Crowned, the Storm, the Hunger).
- **Three endings for chapter two:** let the Winter go (*The Long Thaw*), bind it again as its warden (*The New Warden*) or take its crown (*The Crown of Rime*). New Game+ still carries your Hearts.
- All guardians share a new boss kit (tail ring, breath cone, spikes, leap, charge, nova, phase minions; two or three phases).
- Quest marker, journal entries (one per Heart, then the Throne and the choice), bestiary entries, map exit labels.

### New powers
- **Shouts from Hearts.** Force is always known. **Frost Breath** (Rime), **Battle Cry** (Iron: +35% damage for 8s and scares foes), **Tidal Surge** (Tide: a line of water that hurls foes), **Verdant Grasp** (Root: roots and drains everything near you). **G** swaps shout (Back on a pad); each has its own cooldown.
- **Three new spells:** **Blink** (teleport a short way, untouchable, Sneak 4), **Frost Nova** (a ring of ice, Destruction 7), **Spirit Wolf** (a spectral ally that hunts for 14s, Restoration 5). Quick-cast with 9, 0 and -.
- **Weapon styles:** daggers chain a fast four-hit flurry; axes have a heavy two-hit combo; greatswords sweep in a three-hit arc; swords keep the three-hit combo.

### Animation
- Every humanoid (the player, bandits, draugr, bosses, NPCs) now has **attack poses** (windup, strike, recover), a **hurt pose**, and a small lean into the blow. Casting and drawing the bow have their own stance.

## Round 4: the open world (replayability and fun fighting)

### The Hollow Reach (open world)
- **The Pine Forest is now a 176x128-tile open world**, the old forest sitting in its north-west corner with the same coordinates (quests, exits and signs still work). Lakes of walkable ice, mountain walls, tundra, pine forest and the dead-tree Blightwood; roads join everything.
- **Every New Game rolls a seed** that lays out the whole world: about 30 points of interest (bandit camps, wolf dens, haunted ruins, watchtowers, groves, champion sites, travellers' fires, barrow entrances) in different places each time. `?seed=123` in the URL pins a seed.
- **Danger grows with distance** from the village in four tiers. Enemies there have more health and hit harder, and the further regions bring the Rime Reaver, Knight and Fencer.
- **Streaming.** Enemies only exist while you are near (spawn at 300px, leave at 520px), so the big map stays cheap. Camps, champions and elites stay dead once beaten; wanderers come back the next day.
- **Procedural barrow dungeons** (three per world, four themes): a chain of fight rooms, a rune-plate trap room (random order, shown on a sign), a treasure room and a champion boss with a rare chest.

### Things to do
- **Camp and den bounties:** clear every enemy of a camp, den, ruin, tower or champion site and a bounty pays gold and a piece of gear.
- **Bounty board** in the village plaza: four fresh contracts per day aimed at real places in your world (reward gold + gear, sets a map waypoint, max three active).
- **Shrines** in the ruins: pray for one of three daily offers, a blessing (Wolf, Bear, Raven, Fox) or a risky pact (Blood, Glass, Hunger). One is active at a time and it changes how you play.
- **Ore nodes** to mine, **buried treasure** to dig up (a cache, coin, or something digs back), **deer** to hunt for venison and hides.
- **Random events:** ambushes (undead at night) and a **travelling trader** selling generated gear, with a waypoint to find them.
- **Fast travel** between campfires you have found: open the map, E for the cursor, F on a found fire. The map now shows shrines, fires and unfinished sites.

### Loot
- **Generated gear:** every weapon, bow, shield, armour and charm can roll a rarity (common / magic / rare / legendary, drawn in cyan, gold and purple with a glow on the ground) and 0 to 3 affixes: Keen, Vampiric (lifesteal), crit chance, fire / frost / storm damage, Swift, Light, Hardy, Arcane, Vigorous, of the Bear, of Shadows, of Plenty. Higher tiers roll stronger bases.
- Chests, champions, elites, bounties, buried caches and the trader all drop it.

### Fighting
- **Poise and stagger:** every hit chips poise (shown as a thin bar); break it and the enemy staggers for 1.5s, takes 35% more damage and its armour opens up.
- **Heavy attack (U):** a slow, telegraphed overhead blow with big poise damage that breaks shields.
- **Perfect dodge:** roll in the last moment before a hit lands: slow motion, stamina back, the attacker reels, and your next hit does +60% (COUNTER on the status row).
- **Elite enemies:** random affixes (Swift, Brutal, Juggernaut, Vampiric, Regenerating, Explosive, Summoner) with their own tint and name; **champions** carry two affixes and guaranteed rare loot.
- **Crit** chance and **lifesteal** from gear and blessings.

### Replayability
- **New Game+:** after an ending the title screen offers NEW GAME+: keep level, skills, perks, gear and gold; new seed, harder enemies (+40% health, +15% damage per cycle).
- A run record (kills, camps, barrows, champions) is kept in the save.

## Round 3: controls, UI and gameplay (the "do all of it" pass)

### Controls
- **Lock-on (T, R3 on a pad, LOCK on touch).** Picks the nearest foe, makes you face it while it lives (including for the bow), shows gold target brackets and a name + health bar at the top. Press again to drop it; it also drops when the target dies or gets far away.
- **Hold the sword key to keep chaining the combo** (option: HOLD TO CHAIN).
- **Roll cancel.** You can dodge out of the recovery half of a swing. Rolling with no direction held goes the way you face.
- **Sneak toggle** option (SNEAK MODE: HOLD / TOGGLE).
- **Quick-cast keys 4-8** cast Fireball / Frost / Lightning / Healing / Ward directly.
- **Overcast.** Chained casts raise the mana cost (up to +105%) and cool down again; a heat bar under the spell icon shows it.
- **Simplified touch layout.** ROLL, HIT, E, LOCK and a pause button; everything else (bow, magic, swap, shout, block, sneak, ammo, pack, map) lives in a ring that opens from MORE.
- **Menus use the mouse.** Hover and click tabs, rows, shop lists, the title screen; right-click goes back.

### UI
- **Shop, forge, enchant, alchemy and fletching list screens** with item icons, prices, greyed-out unaffordable rows, a detail pane and a "need X more" line. Selling has sell-one / sell-all.
- **Status row** under the bars: ward timer, enchant, sneak, guard, well-rested. **Shout cooldown number** on the shout icon.
- **Large UI option** (bigger bars). **Damage numbers merge** in crowds and are capped.
- **Map:** Q cycles 1x/2x/3x zoom, E starts a cursor and places or removes a **waypoint** (shown in the world with a green marker), exits are labelled with where they lead.

### Gameplay
- **First-minute tutorial taught by doing**: walk, roll, then a lone weakened wolf that teaches lock-on, swinging and rolling its lunge.
- **Combat variety.** *Rime Reaver* waits out your roll and strikes as you land. *Rime Knight* is armoured (only a parry or an elemental hit gets through). *Snow Fencer* sidesteps your swing. Each has a first-sight tip and a bestiary entry.
- **Stealth with a cost.** Shouts, explosions and smashed pots wake sleepers nearby; bandit archers sound the alarm for the whole camp.
- **Bow limits and ammo.** Quiver capped at 30; Hilda fletches **fire arrows** (burn) and **barbed arrows** (bleed); V switches ammo.
- **Crypt puzzle.** Three rune plates (Moon, Crown, Wolf, in that order) open a hidden vault with a Nordic Shield and special arrows. A **checkpoint brazier** before the boss gate means a retry no longer starts at the entrance.
- **Armour sets.** Hunter's Leathers (fast, stealthy), Frostweave Robe (mana, cheaper spells), Bulwark Plate (heavy, 34% absorb, slower).
- **Snowdrift Cottage.** Buy it (300G), sleep for a Well Rested bonus, furnish it (table, shelves, bookshelf, a home cauldron, a home anvil).
- **Companion revive.** If you have hired Ragna she drags you up once every two minutes with 40% health.

## Combat
- **Shields, blocking and parrying.** Hold F with a shield equipped. A frontal hit is reduced by the shield's
  absorb value (60/72/82%) and costs stamina. Raising the shield just before a hit is a **parry**: no damage, and the
  attacker is staggered. A broken guard (out of stamina) stuns you. Hits from behind are never blocked.
- **Two-handed weapons** (Iron / Nordic Greatsword): slower, wider, much heavier. Equipping one clears the off-hand.
- **Dual wielding.** A one-handed weapon in the off-hand adds 60% of its damage to each swing (and costs 30% more stamina).
- **Finishing blows.** A staggered enemy under 28% health is executed outright (slow-motion hit-stop, "FINISHER").
- **Three new spells.** Lightning (chains through up to 3 foes, Destruction 4), Healing and Ward (Restoration).
  Spells unlock with skill level; Q skips locked ones. New skill: **Restoration** (5 skills now).
- **Elemental weaknesses and resistances.** Draugr burn, wights resist frost, and fire / lightning
  go straight past a warden's shield. "WEAK" / "RESIST" pop up on hits.
- **Weapon enchantments** (Flame, Frost, Storm) add elemental damage on every hit.
- **Four new enemy types**: Draugr Warden (shield; a heavy blow breaks its guard), Wolf Alpha (howls to call every wolf nearby),
  Bandit Chief (rallies bandits), Hexcaster (marks the ground, blast lands a second later).
- **Group tactics.** At most two melee enemies commit to an attack at once; the others circle you. Wounded bandits
  and archers retreat.
- **Enemy barks.** Spoken lines and growls on alert and retreat (text + synthesised voice).
- **Arrow recovery.** Missed arrows (55%) and arrows stuck in enemies (60% each) can be picked up again.
- **Slow health regeneration** out of combat.
- **Difficulty setting** (Easy / Normal / Hard) scaling enemy health, damage taken and regeneration.
- **Enemy balance pass** driven by the balance bot (about +15% enemy damage, +10-15% wolf/bandit health, tougher Grimfang).
- **Melee swing animations.** Held-weapon sprites sweep through the arc for the player; enemies raise their weapon
  during the telegraph and swing on the attack.

## Character progression (Skyrim systems)
- **Character level** from skill-ups (2 skill-ups = 1 level), with a +10 Health / Magic / Stamina choice.
- **15 perks** (3 per skill, with prerequisites) bought with perk points on the new **Perks** tab.
- **Selling**: Mirra and Hilda buy loot at half value, sell-all supported.
- **Blacksmith Hilda**: upgrade weapons and armour (+3 levels, gold + iron ingots), enchant weapons, buy gear.
- **Alchemy**: gather snowberries / frost lilies / wolf fangs / bone dust, brew 5 potion recipes (incl. Greater potions)
  at Mirra's stall or the cauldron in the lodge.
- **Lockpicking** minigame (easy / medium / hard locks, wider zone with Sneak skill) and lockpicks (shop, loot).
- **Pickpocketing**: sneak up and press E. Chance rises with Sneak skill and when the target faces away; failure angers them and costs gold.
- **Hireable follower** (Ragna the archer, 150 gold) who follows and shoots.
- Quick-slot potions fall back to Greater potions automatically.

## World and story
- **Five quests** (was two): Wolves at the Gate, The Hollow King, **Mirra's Remedy**, **Asta's Locket**, **The Pale Alpha**.
  Choices that matter: the Frostheart ending (3 variants), the locket (return it for a charm or sell it), and Grimfang (kill or spare).
- **New zone: Frostwind Pass** (slippery ice lake, ruined watchtower with a campfire and locked chest, den at the top).
- **Second boss: Grimfang, the Pale Alpha.** Leaps, bites, howls for the pack, enrages in phase 2; at low health he yields and
  you choose to finish him or let him go. Sparing him calms the forest wolves.
- **Arena reacts to boss phases**: the crypt/den turn red and the lights tint when a boss enrages.
- **House interiors** (Elder's Hall, Hunter's Lodge, Mirra's shop) with doors, a hearth, a bed (sleep to morning, heal, save,
  set respawn), furniture, books, a locked chest, a cauldron.
- **Day / night cycle** (12 real minutes per day) with dusk and dawn, **weather** (clear, snow, blizzard), and effects on
  stealth. Villagers go indoors at night (NPC schedules).
- **Real lighting**: a darkness layer with stepped light cut-outs around fires, windows, the player and the follower.
- **Campfire respawn points**: resting sets where you wake after dying (also a brazier at the crypt entrance for boss retries).
- **Slippery ice** on frozen water.
- **Lore and bestiary**: 9 readable books and a bestiary that records what you have seen, how many you defeated, and (after 3 kills) weaknesses.
- **Tile variety**: pebble, tuft and cracked variants, dead trees, stumps, worn paths, cracked floors, mossy walls.
- 2 extra villagers (Haldor the guard, Asta), more pots, barrels and urns, more signs, herbs to gather.

## Presentation and feedback
- **Character outlines**, new item / spell icons, new props (beds, tables, shelves, cauldron, anvil, herbs...).
- **Music**: two sections per song, new songs (Pass, Night, Interior), a **combat layer** (drums + arpeggio) and a **brass stinger** when a fight starts.
- **Staged death animation** (fall, lie there, crumble away). **Particle pooling** for effects.
- **Quest markers**: pin a quest in the journal; a diamond over the objective, an edge arrow when it is off-screen, a label when it is in another area, and a marker on the map.
- **First-time tooltips** (sneaking, stamina, perks, lockpicking, blocking, bow, night, potions, resting).
- **Inventory**: filter (All / Gear / Potion / Misc) and sort (Type / Name / Value), off-hand slot, upgrade levels, enchant info.
- **Map tab** with fog of war; **Lore** tab; **Perks** tab. F3 debug overlay (FPS, entity counts).

## Options, input and saving
- **Options**: difficulty, screen-shake (off / low / full), screen flashes on/off, integer pixel scaling, mouse controls, volume, music, fullscreen.
- **Key rebinding** screen (swap-on-conflict, reset to defaults), stored with the settings.
- **Mouse controls** (click = sword, right-click = bow, middle = spell, wheel = swap, aim at the pointer) and **on-screen touch controls** (virtual stick + action buttons; automatic on touch devices or with `?touch=1`).
- **Gamepad** support (stick / d-pad, face buttons, bumpers/triggers).
- **Three save slots**, a **backup copy** of each, **corruption recovery**, a slot picker on the title screen,
  and **saving in the middle of a boss fight** (the fight resumes with its saved health and phase).

## Code health and tooling
- Feel numbers consolidated in `src/data/tuning.js`; damage / armour / block / element math extracted to `src/systems/damage.js`
  (pure, no Phaser). `GameScene` split into mixins (`world/pathing`, `fog`, `loot`, `zones`, `lighting`).
- Phaser-free event bus so game logic can be unit-tested in Node.
- **Tests**: 15 unit tests, 14 browser stage tests (every system above), a WebGL smoke test, a random-input **monkey test**
  across all 7 maps, and a **balance bot** (`npm run balance`) that fights each encounter several times and reports win rate / HP left.
- **GitHub Actions workflow** (`.github/workflows/frostfall.yml`): build, unit tests, browser tests, screenshot artifacts.

## Round 13 - Story and replay (Phase 6)
- Story: boss taunts and phase lines shown as subtitles, NPC barks, epilogue lines after the ending.
- New quests: Ragna's Company (a veteran companion with a second arrow), The Hunter's Trail (antler bow), The Bridge Troll's Toll (trollbone mace). Asta's hound can be returned or kept.
- Replay: Daily Challenge (seeded world + daily modifiers + local leaderboard), Endless Winter and other mods, arena modes (incl. Gauntlet) with boon trials, trophy cloak colours.
- Tests: stage39_story, stage40_replay.

## Round 14 - UI and accessibility (Phase 7)
- COLOUR MODE (Pause > System): deutan / protan / tritan assist filters.
- Button prompts follow the last device used: tips say "HOLD X" on a controller or "HOLD C" on keyboard, using your learned pad map.
- Lore tab now also holds an item index (every item you have owned) and shows discovery totals.
- Journal shows a NEXT line for each active quest.
- Test: stage41_access.

## Round 15 - Technical debt (Phase 8)
- GameScene split 1081 -> 702 lines: arena runs (`world/arenaRun.js`), pets/allies (`world/companions.js`), kill and boss handlers (`world/kills.js`), world events/quests/finale (`world/events.js`), shared tables (`world/sceneConsts.js`).
- Player split 687 -> 314 lines: combat/blocking/damage (`entities/playerCombat.js`) and bow/ammo/shout/potions (`entities/playerBow.js`).
- New `test/perf.mjs`: 34 enemies on screen, update loop must average under 4 ms (measured ~1 ms) and the scene must stay under 4000 objects.

## Round 16 - Region framework (Phase 9, start of the expansion)
- World generation is now `buildRegion(def, region, seed)`; the Hollow Reach is the `REACH` definition (output verified identical for four seeds by `test/reach_hash.mjs`).
- New `data/regions.js` registry (Reach, Ashen Peaks) with unlock flags; `getRegion(id)` caches per run seed. Maps may set `outdoors: true` to get day/night, weather and time without snowfall.
- The Ashen Peaks (160x120) is the first extra region: entry road, camps, ruins, towers, springs, campfires, champions, wildlife. It is a framework proof for now; its own places and art come in Phase 12. Reach it with `?map=ashen` until the story unlocks it.
- Map tab: **R** switches region, waypoints and fog are per region, fast travel works across regions (loads the other map).
- Tests: `reach_hash`, `stage42_regions` (builds, reachability, registry, map switching, cross-region travel, save/load, time of day, perf budget).

## Round 17 - Emberhold and the Deep Mines (Phase 10)
- **Emberhold**, the forge-city (88x60, five districts, day/night, three rest fires), reached from a gate in the Ashen Peaks. Seven halls: Brannoch's Forge, the Runehouse, the Court of Anvils, the Delvers' Hall, the Last Lantern, the Wardens' Post, and a house for sale (500G).
- **Twenty named people**, each with state-aware dialogue; shops and services: Emberforge, tempering, repair/reforge, enchanting, gem shops, tavern rest, faction goods.
- **Factions** (Anvil Court, Delvers' Guild, Ember Wardens): reputation 0-100 with four tiers; helping one house costs a little with its rival. Standing shows on the Feats tab.
- **Gems and sockets**: seven gems (ruby, sapphire, emerald, topaz, onyx, amber, bloodstone), sockets on weapons/armour/shields/bows, set or removed at Tamsin's.
- **Emberforged gear** (blade, axe, spear, mail, bulwark) forged from Ash Iron and Emberheart Ore after the core is delivered; the axe needs Delvers trust, the spear Wardens trust, the mail and bulwark Anvil trust.
- **The Deep Mines**: three generated floors of ore vaults, rune-plate puzzles, gem chests, ending in **Kragnar the Hollowed** (two-phase guardian with rockfall spikes and summoned golems; drops his core).
- Quests: The Silent Mines, A Core for the Anvil, The Ashen Road.
- Points of interest in non-Reach regions now have region-prefixed ids (`ashen_camp0`) so bounties never collide.
- Try it now: open the game with `?scene=game&map=emberhold&spawn=gate` (the story connects the road in Phase 11).
- Tests: `stage43_emberhold`.

## Round 18 - A much larger Hollow Reach (Phase 10.5)
- The Reach grows from 200x144 to **320x224 tiles** (about 2.5x the area). The forest, village and old quest spots stay in the north-west; danger tiers, lakes, mountains and blight scale with the new size.
- More to find: 9 champions, 9 ruins, 12 camps, 12+ wolf dens, 8 barrows (was 3), 7 towers, 7 groves, 5 bear dens, 5 hot springs, ~16 campfires (more fast-travel points), ~300 wild creatures, 45 small animals, 34 fishing holes, longer roaming-boss routes.
- **New places**: Hamlets (a fire, a trader, a chest, a story; Trapper / Fisher / Prospector) and Standing Stones (a stone circle with a blessing and a lore book).
- **Fixed**: roads could run into the stone front of a dungeon or tower and seal it (and silently delete its contents). Roads to dungeons and towers now arrive from the side and below the entrance.
- **Map screen**: terrain is baked into one texture and cropped to the view, so the big map costs the same to draw as a small one; a new OVERVIEW zoom shows the whole Reach on one screen (Q cycles zoom).
- Tests: `stage44_bigworld` (12 seeds: size, counts, reachability of every place and dungeon door, generation time, hamlet shops, all barrows, map bake and frame cost).

## Round 19 - Chapter 3: The Ember Crown (Phase 11)
- **Chapter Two now ends on a card**: breaking the Winter (thaw / warden / crown) no longer rolls the credits. It closes Chapter 2, opens the **Peak Road** (a new gate in the north-east of the Reach), unlocks the Ashen Peaks and starts the quest *The Ember Crown*. The full ending needs Chapter 3.
- **The story**: the chains that held the Winter were forged from the First Fire, buried under Emberhold. Loosening the Winter woke it. Sigrid sends you north; Matriarch Ysolde reacts to your Winter choice and names three **seals**, one from each house: *The Silent Mines* (Delvers), *A Core for the Anvil* (Anvil Court), *The Ashen Road* (Wardens). Goran, Thessaly and Brannoch reveal the truth as you progress.
- **The Forge of the First Fire**: a sealed dungeon on the Ashen Peaks (opens once all three seals are won): fight rooms, a rune-plate puzzle, then the **Ashen Sovereign**, a three-phase fire boss (the Crowned, the Cinder Storm, the Pyre).
- **Your friends help**: the house you stand best with (45+) joins the fight. Anvil Court: +15% damage dealt. Delvers' Guild: the Sovereign hits 25% softer. Ember Wardens: +25 stamina at every phase change.
- **Three final endings** (Quench the Flame / Wear the Ember Crown / Bind it to the Anvil, which needs a house you trust), each varying with your earlier Winter choice and the strongest house: 36 distinct endings. New items: **The Ember Crown** (charm), **Sovereign's Heart**. Five new trophies.
- Ending screens now page through long text. The quest journal tracks every stage; map markers follow it.
- Tests: `stage45_chapter3`.

## Round 20 - Three new regions (Phase 12)
- **Ten new terrain tiles**: ash, basalt, lava (solid), ice shelf, pack ice (solid), shingle, wreck timber (solid), marble, ruin wall (solid), moss.
- **The Ashen Peaks** now has its own look (ash flats, basalt crags, lava pools you must path around) and its own places: derelict **foundries**, cinder-warren caves, hamlets, and the Forge. Roaming boss: **Cinderjaw, the Magma Golem** (drops the Cinderjaw Maul).
- **The Frozen Coast** (180x130, opens with Chapter 3 via the Coast Road in the Reach's south-east): ice shelf, shingle strand, pack-ice. **Wrecks** locked in the ice, **the Last Light** lighthouse and its keeper Maren, smugglers' camps, fishing hamlets, sea caves, 24 ice-fishing holes. Dungeon: **Tidebreak Cavern**, ending in **Admiral Veyl** (two phases). Roaming boss: **Hrimgar, the Floe Troll** (drops the Floe Harpoon). Quest: *The Drowned Admiral* (reward: Sealskin Mail).
- **The Old Kingdom** (180x130, opens once the First Fire is answered via the Old Road in the Ashen Peaks): moss and marble, ruin walls, haunted **courtyards**, crypt caves. The Scribe's ghost gives *The Hollow King's Rest*. Dungeon: **the Hollow Sepulchre**, ending in the **Hollow King** (three phases: the Court, the Memory), a late superboss. Roaming boss: **Sir Aldric, the Last Knight** (drops the King's Signet).
- New gear: Cinderjaw Maul, Floe Harpoon, Sealskin Mail, Admiral's Cutlass, the Hollow King's Blade, the King's Signet.
- Caves (3-4 per region) are generated per seed with region themes (cinder, sea, royal). The map screen cycles all four regions with R. Three new trophies, epilogue lines.
- Tests: `stage46_regions3` (tiles, 15 builds, reachability, gates, caves, boss dungeons, both bosses, quests, loot, map cycling, per-region perf budget).

## Round 21 - A longer campaign (Phase 13)
- **Fixed**: books in the Reach's ruins and the city's Court pointed at lore entries that did not exist. 14 new books now fill the standing stones, wrecks, courtyards, the foundry and the ruins, each readable and added to the Lore tab. A test now checks every book on every map.
- **Five side-quest chains**, offered by the people of Hollowfrost as the story opens up, answered by the open world: *Hamlet Rounds* (Bjorn; talk to a trapper, a fisher and a prospector), *The Den-Mother's Debt* (Bjorn, after Grimfang; clear 3 wolf dens), *Stones That Hum* (Sigrid, after a Heart; pray at 3 standing stones), *The Restless Barrows* (Mirra; clear 3 barrows), *Retake the Watch* (Haldor; retake 3 towers). Each has map markers and a reward (gold, gems, a spear, draughts).
- **A second companion**: *Pell Quickpick*, the Delvers' scout. Recruit him in Emberhold once the mines are safe. He darts in and stabs (melee, 9 damage), and your gold finds are 10% bigger. One companion at a time: hiring Ragna or Pell replaces the other. Talk to a companion (E) to send them home; they go back to their post.
- **Aftermath**: once the First Fire is decided, Bjorn, Mirra, Hilda and Haldor have new things to say.
- Tests: `stage47_campaign`.

## Round 22 - Breadth (Phase 14)
- **Twelve new creatures** (plus the Slimeling), three or four per region, each with its own trick and sprite: *Ash Hound* (fast, flanks, burns), *Cinder Smith* (armoured, shield-smashing hammer), *Magma Slime* (bursts into two slimelings), *Lava Wraith* (flies over lava, spits embers); *Ice Harpooner* (its harpoon drags you in), *Wreck Crab* (guards its front), *Tide Hag* (raises the drowned), *Frost Barnacle* (a turret that never moves); *Court Phantom* (blinks), *Hollow Herald* (rallies allies: +25% damage), *Bone Sentinel* (guards its post, gives up the chase), *Moss Stalker* (half-hidden ambusher). All have bestiary pages.
- **Two new weapon types**: the **crossbow** (must be fully wound, one heavy bolt that pierces two foes, then a reload; no half-draw) and the **warhammer** (two-handed, slow, guard-breaking, rattles armour).
- **Runes**: a second kind of socket. One per weapon or armour, adding an effect: Ignition, Rime, Storms (burn / chill / shock your blows), Draining (heal 5% of damage), Thorns (strikers take 7), Warding (+5% absorbed). Set them at Tamsin's; they also drop from the new creatures.
- **Two new spells and two new shouts**: *Ember Nova* (a ring of fire that burns) and *Glacier Spear* (a lance of ice through a whole line), both learned from tomes. *Cinderstep* (dash through foes, burning them; after Kragnar) and *Hearthcall* (heal 30% and cleanse; after the Ashen Sovereign).
- **Smithing and mining**: the Great Anvil sometimes forges a *masterwork* (already tempered twice; likelier with the Anvil Court's trust). Pell finds extra ore.
- **Whaler's Skates** (250G from a coast fisher): 30% faster on the ice shelf, and the ice stops throwing you around.
- **Three new daily modifiers** (Ironhide, Cinder Skin, Brittle Bones).
- **Music**: a track for each new region (Ashen Peaks, Frozen Coast, Old Kingdom).
- Not built: boss-rush mode and a summonable sled. Both stay on the list; the skates cover fast travel on ice for now.
- Fixed: the skates' speed bonus was applied after the target speed was computed.
- Tests: `stage48_breadth`.

## Round 23 - Balance and polish (Phase 15)
- **Mastery is earned**: skill levels now come much slower (XP per level `25 + 12 x level^1.6`: level 5 is about 125 sword hits, level 10 about 900, level 20 several thousand) and each skill level adds +7% damage instead of +10% (a level 20 skill is about 2.3x, was 2.9x). Early levelling no longer makes everything a one-hit kill; grinding matters.
- **Balance bot**: new rows for Kragnar, the Ashen Sovereign, Admiral Veyl and the Hollow King (with gear and level fitting where each is met), and it now reports how much boss health was left. Grimfang re-checked over 8 trials (7 wins). The late bosses beat the bot but it gets the Sovereign to 30%; they stay hard on purpose.
- README rewritten for the four regions, Chapter 3 and the new systems.

## Round 24 - Arena Mode, phase 1 (quick play)
- **ARENA** on the title screen: pick a hero and fight endless waves in the Hollow Pit within seconds. No story, no save needed, and **nothing is ever saved** (a test checks the real save file is byte-for-byte unchanged).
- **Six fixed heroes** (Warden, Reaver, Ranger, Frostmage, Pyromancer, Shadow), each a small data table in `src/arena/heroes.js` (gear, skills, perks, tomes, shout), plus **Your Hero**, which uses your current save for a run without changing it.
- Survival uses the Hollow Arena's wave table (a champion every 5 waves). Falling ends the run and shows a results card: waves cleared, foes, champions, time and score (`waves x100 + foes x10 + champions x40`), with a personal best per hero on this device. **E** plays again, **H** changes hero, **Esc** returns to the title.
- The pause menu hides Save and Load during a quick run.
- Tests: `stage49_arena` (every hero's items, perks, spells and shouts exist; run starts, counts, ends; records; the real save is untouched).
- Not yet (later phases): more arenas, pickups and combo meter, wave twists, new boons, Boss Rush, daily arena, unlocks. See `docs/ARENA_MODE.md`.

## Round 25 - Arena Mode, phases 2 to 4
- **Four rooms**, picked with **Q** on the hero screen: *Hollow Pit*, *Frozen Lake* (everything is ice, so nothing stops when you do), *Ember Foundry* (lava, and telegraphed embers fall near you), *Old Court* (pillars to fight around). The three new rooms open as you reach waves 5, 8 and 10 in any mode.
- **Five modes**, picked with **A/D**: *Survival*, *Boon Trial* (pick one of three boons between waves), *Gauntlet* (a champion every wave), *Boss Rush* (ten bosses from the Rime Wyrm to the Hollow King, then again, tougher; a boon and 35% health between bosses, no hearts or endings) and *Daily Arena* (the day's fixed room, a seeded wave order and the day's two modifiers).
- **Orbs** drop from foes (health, stamina and mana, rage for +40% damage for 12 s, bomb) and a health orb appears at the end of each wave. Champions always drop two.
- **Combo**: chain kills within 3 seconds for a score multiplier up to x3; it breaks when you are hit. The HUD shows wave, score, combo and rage.
- **Wave twists** from wave 3: Fast Foes, Armoured Foes, Blood Moon, Darkness, Swarm, Double Champions, announced as the wave starts.
- **Eight new boons**: Vampiric, Thornmail, Berserk, Giant, Arcane Flow, Vanguard, Reaper, Scavenger (they also appear in the Hollow Arena's Boon Trial).
- **Records** are kept per hero and mode on this device and shown on the hero screen. Score is waves x100 (Boss Rush: bosses x500) plus combo-weighted kill points plus champions x40.
- **Balance**: `node test/balance_arena.mjs [trials] [hero] [seconds]` plays each hero with a crude policy for its style. Findings drove a few changes: the Frostmage now starts with Glacier Spear (Frost Bolt does a third of a Fireball's damage), the Ranger gets Piercing Shot and a higher bow skill, the Shadow gets Keen Edge and more One-Handed.
- Tests: `stage50_arena2` (rooms, orbs, combo, twists, boons, Boss Rush, daily, setup keys).

## Round 26 - Controller fixes and a world fix
- **Controller vs on-screen buttons**: the touch buttons now hide while a controller is in use and return when you touch the screen. A key-up from another source (a brushed on-screen button) can no longer cancel a direction or button the controller is still holding. Test in `stage24_pad`.
- **World**: a hamlet next to the old forest area could put a pot or sign inside a house wall or tree on about 1 seed in 100. Those are now dropped.
- Phone speed was measured with a throttled CPU (a 30-foe forest is the worst case); see the notes in the chat history. No change made.
- **Phone with a controller**: if the phone is held upright and a controller is in use, the picture turns sideways to fill the long edge of the screen (about 1.8x bigger on a typical phone). Touch the screen, or turn the phone to landscape, and it goes back. Pause > System > ROTATE VIEW (AUTO / OFF). Test: `stage51_rotate`.
- **Death screen could stick**: a death that happened under an open menu or a hit-stop freeze, a health of zero that was never announced, or a checkpoint in a map that does not exist left you on YOU DIED forever. The death timer now always runs, a missing checkpoint map falls back to the village, and the fade-out has a timer as a backup. Test: `stage52_death` (it fails on the old code).

## Round 27 - Overnight Round 1: power curve, difficulty levels, danger
- **Levels no longer make you strong by themselves**: skill damage +5% per level (was 7%), character level one per three skill levels (was two) and capped at 25, attribute choices +6 (was +10), armour has diminishing returns (full value to 40%, half beyond, 70% cap). Gear tier, upgrades and preparation are where power comes from.
- **Three difficulty levels as real tables** (`TUNE.difficulty`): Easy (take 0.6x, enemies 0.75x health, faster regeneration, longer enemy telegraphs, fewer elites, more food and potion drops, cheaper shops, no durability), Normal, Hard (take 1.35x, enemies 1.3x health, slower regeneration, shorter telegraphs, more elites, fewer drops, dearer shops, durability on). Bosses keep their own timing.
- **Power model** (`src/systems/powercurve.js`, `docs/POWER_CURVE.md`, `tools/power_table.mjs`, `test/unit/power.mjs`): on Normal the expected gear and level costs a third of your health in every region; +5 levels is comfortable but not trivial; one gear tier beats five levels; a maximum-level character in starter gear still struggles later.
- **Danger readability**: target-bar names coloured by danger to you, DEADLY and HOPELESS labels, "danger to you now" in the bestiary, and a once-only warning when you arrive somewhere beyond your strength.
- Tests: `unit/power`, `stage53_danger`; older tests updated to the new numbers.

## Round 28 - Overnight Round 2: world scale and spacing
- **Measured before**: the typical place was 16 tiles (about 3.5 seconds of walking) from its nearest neighbour. **Now**: the Hollow Reach is 540x378 (was 320x224) and the typical nearest neighbour is about 45 tiles (10 seconds); the closest pairs are 25+ tiles (6 seconds) instead of 10; major places (dungeon entrances, cities, region gates) are at least 75 tiles apart. Ashen Peaks 240x180, Frozen Coast and Old Kingdom 260x190, with spacing of 7 to 8 seconds typical.
- The generator has a spacing rule per kind of place (`gap`, `majorGap`, small gaps for campfires and springs) that relaxes in steps instead of dropping a place; danger tiers widened to match (the same walk through each tier as before, scaled up), region gates moved, wildlife counts scaled.
- **Waystones**: signs beside every long road say what lies ahead and how far ("NORTH-EAST: A BANDIT CAMP, ABOUT 45 PACES"): 38 in the Reach.
- **Pony**: the smith sells a Pony Whistle (420 gold). The pony follows you outdoors; stand beside it and press E to ride (1.55x speed, free on roads, drains stamina off them). Fighting, rolling or being hit gets you off; no pony in dungeons or buildings.
- Load time of the big Reach: about 0.4 s on this machine, 0.8 s with a CPU 6x slower; memory about 120 to 170 MB.
- Tests: `unit/spacing`, `stage54_pony`; world snapshot re-recorded on purpose; older size expectations updated.

## Round 29 - Overnight Round 3: discovery and exploration
- **Discovery**: walking up to any place (camp, ruin, den, tower, hamlet, dungeon mouth...) names it with a banner and pays a small gold reward that grows with danger; the map marks discovered places and shows how many you have found.
- **Hidden places**: caches, hermits, ancient sites and springs sit away from roads, have no waystone and keep their distance from other places. Hermits trade rumours that point you at them.
- **Compass strip** on the HUD (setting COMPASS), with quest and discovery markers; ROTATE VIEW setting.
- **Fast travel costs time**: hours pass and the toast says so. Trophies for wandering and exploring.
- Deferred: landmarks and vistas, unmarked quests (later rounds). Tests: `stage55_discovery`, spacing unit test extended.

## Round 30 - Overnight Round 4: a living world
- **New wandering events** (replace the old ambush/trader coin flip): a *wounded traveller* (give a health potion for gold and gear; the wolves that hurt him are still near), *wolves hunting a deer* (kill the wolves, save the deer, get venison and thanks), *raiders attacking a hamlet* (clear them for gold and loot; they find you if you get close), plus the existing ambushes and travelling trader.
- **Camps are reoccupied** six in-game days (72 minutes of play) after you clear them; retaking one pays a little gold. Champions, elites and bosses stay dead.
- **Radiant delivery jobs** on the bounty board: carry a package to a hamlet.
- Deferred: cold from storms, children and animals in towns, second home (see later rounds).
- Test: `stage56_living`.

## Round 31 - Overnight Round 5: day, night and the moon
- **Calendar and moon**: the game counts days and runs an eight-phase moon (HUD clock and moon disc outdoors). Full moon every 8 days; every third full moon is a *blood moon*.
- **Night changes who lives here**: wolves become **werewolves** (bigger, faster, hit harder; nine in ten on a full moon), the restless dead of old places turn to **ghosts** (translucent, ranged; more on a new moon), bandit crews are asleep (they notice you at half range), the full moon makes ambushes werewolf packs. Chosen once per spawn from the seed and day so it is stable.
- **Blood moon**: once per blood night a great wolf (a champion werewolf with two packmates) hunts you; big gold and gear bounty.
- **Wait at campfires**: wait until dusk or dawn (time passes, no healing, no save). Beds, fast travel and the clock all count days properly.
- **Hooded Lantern** (smith, 150 gold): see much further at night, but creatures notice you 25% sooner.
- Deferred: night herbs, ghost merchant, silver weapons, dawn weakening the undead, night-only quests (later rounds).
- Test: `stage57_night`.
