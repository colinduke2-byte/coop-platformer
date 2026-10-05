# Frostfall changelog: everything added since the first playable version

The first version (stages 1-8) was the core game: village, forest and crypt, melee / bow / magic / shout,
skills, inventory, 3 NPCs, 2 quests, one boss, save/load, sound. This list covers everything added on top of it.

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
