# Frostfall changelog: everything added since the first playable version

The first version (stages 1-8) was the core game: village, forest and crypt, melee / bow / magic / shout,
skills, inventory, 3 NPCs, 2 quests, one boss, save/load, sound. This list covers everything added on top of it.

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
