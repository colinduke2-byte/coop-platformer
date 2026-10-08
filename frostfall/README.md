# FROSTFALL

A top-down, 8-bit, Skyrim-inspired action RPG for the browser.
**Phaser 3 + Vite**, 320x180 internal resolution, `pixelArt` mode, 16x16 tiles, a fixed 16-colour snowy palette.
**There are no asset files**: every sprite, tile, icon, font glyph and sound is generated in code.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm test           # unit + browser tests for every system (needs Chromium via Playwright)
npm run test:unit  # pure-logic tests only (no browser)
npm run balance    # balance bot: fights each encounter several times
npm run monkey     # random-input stress test on every map
```

Dev URL flags: `?scene=game` skips the title, `&map=village|forest|crypt|pass|hall|lodge|shop`, `&spawn=...`,
`?renderer=canvas` forces Canvas, `?touch=1` shows the touch controls. In the console `__ff.S` is the live game state. F3 shows FPS / entity counts; F4 copies a debug report (seed, map, recent errors) to the clipboard for bug reports.

## World

Hollowfrost Village (four enterable houses, a bounty board) -> **the Hollow Reach**, a seeded open world (540x378 tiles: camps,
dens, ruins, standing stones, hamlets, watchtowers, champions, procedural barrow dungeons, a travelling trader) with the
Crypt of the Hollow King (Jarl Valdrek) and Frostwind Pass (Grimfang). Beyond the Reach lie five more seeded regions,
three opened by the story and two you can walk to from the start (if you dare): the **Ashen Peaks** (lava, foundries, the forge-city **Emberhold** with its three factions:
the Anvil Court, the Delvers' Guild and the Ember Wardens), the **Frozen Coast** (wrecks, lighthouses, the drowned Tidebreak Hall)
the **Old Kingdom** (courtyards, the Sepulchre), the **Weeping Fens** (a drowned bog; the stilt village Reedwick; the Mire Mother) and the **Stormcrown Highlands** (storm, clans, giants; Skarn Hold; the Storm Giant). Chapter 3, "The Ember Crown", is needed for the full ending
(36 ending variants). A 12-minute day/night cycle, an eight-phase moon and changing weather change who lives in the world: wolves become werewolves, the dead become ghosts, a blood moon brings a great wolf. Three difficulty levels (Easy, Normal, Hard) and optional challenge modifiers.
Bosses: Valdrek, Grimfang, the Frost Wyrm, Kragnar, the Ashen Sovereign, Admiral Veyl, the Hollow King, the Mire Mother, the Storm Giant. See `docs/GUIDE.md` for the player's guide and `CHANGELOG.md` for everything added.
See `docs/EMBERHOLD.md`, `docs/CHAPTER3.md`, `docs/world_map.png`, `docs/creatures.png`.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move (8 directions). Ice is slippery. |
| Space | Dodge roll (brief invincibility, costs stamina) |
| J | Sword. Tap 3 times for a combo with a heavy finisher |
| K (hold, release) | Bow: hold to charge, release to fire |
| L | Cast the selected spell. Q / Tab swaps (locked spells are skipped) |
| U | Heavy attack (slow, staggers, breaks guards) |
| T | Lock on / drop target (faces the foe, aims the bow) |
| 4 5 6 7 8 9 0 - | Quick-cast the 8 spells in order (Fireball, Frost, Lightning, Healing, Ward, Blink, Frost Nova, Spirit Wolf) |
| V | Switch arrows (plain / fire / barbed) |
| R | Shout (Force by default; G swaps to a shout you earned from a Heart) "FUS": pushes enemies back, shakes the screen (12 s cooldown) |
| F (hold) | Block with a shield. Raise it just before a hit to parry |
| C / Shift (hold) | Sneak: sneak attacks x3 (melee) / x2 (bow). Also: E on a villager = pickpocket |
| E / Enter | Talk, open, read, gather, rest, sleep, pick locks |
| 1 / 2 / 3 | Health / Mana / Stamina potion |
| I / O / M / Esc | Pack and perks / journal / map / pause menu |
| Mouse (option) | click = sword, right-click = bow, middle = spell, wheel = swap, aims at the pointer |
| Touch | on-screen stick and buttons on touch devices |
| Gamepad (on a phone held upright, the picture turns sideways while the controller is in use; Pause > System > Rotate view) | left stick / d-pad move, A roll, X sword, Y bow, B interact, RB spell, LB swap, RT shout, LT sneak, L3 block, R3 lock-on, Back swaps shout, Start pause (the map is a tab in the pause menu); right stick up = heavy attack, down = switch arrows, left / right = health / mana potion. Any layout (8BitDo in X-input, Switch or D-input mode) can be re-learned in **Pause > System > Controller** |

All keyboard keys can be rebound in **Pause > System > Controls**.

## Systems at a glance

* **Combat**: sword combo, shields (block / parry), two-handed and dual-wield, bow with charge and recoverable arrows,
  spells (incl. Ember Nova, Glacier Spear, Cinderstep, Hearthcall), shouts, crossbows and warhammers, gem and rune sockets, enchantments, elemental weaknesses, enemy telegraphs, crowd tactics, 35 enemy types, 9 bosses.
* **Progression**: 5 skills that level by use (Archery, One-Handed, Destruction, Restoration, Sneak), character level,
  15 perks, attribute choices, forge upgrades, alchemy, lockpicking, pickpocketing, shops, a hireable follower, Emberforged masterwork crafting.
* **Story**: three chapters, dozens of quests with real choices (the Frostheart, Asta's locket, Grimfang, the Ember Crown), faction reputation, recruitable companions (Ragna, Pell), 36 endings.
* **Life in the wild**: ice fishing, campfire cooking with meal buffs, treasure maps, a frost hound companion, the Hollow Arena wave challenge, 26 trophies, hares/foxes/bears/lynx/boar and a real dragon.
* **Arena Mode** (title screen): quick play with six fixed heroes or your own, five modes (Survival, Boon Trial, Gauntlet, Boss Rush, Daily), four rooms, orbs, combo and wave twists. Never touches your save.
* **UX**: quest tracking with map/HUD markers, one-time tooltips, filterable inventory, fog-of-war map, lore and bestiary,
  3 save slots with backups and mid-boss saves, difficulty, screen-shake and flash options, integer scaling.

See [CHANGELOG.md](CHANGELOG.md) for everything added in detail and [IMPROVEMENTS.md](IMPROVEMENTS.md) for what is left.

## Code layout

```
src/
  main.js, config.js   Phaser config (320x180, pixelArt, FIT scaling), palette, key bindings
  art/                 sprites.js (characters, tiles, icons, props), font.js (5x7 pixel font), fx.js (pooled particles), snow.js
  audio/sfx.js         Web Audio SFX, music sequencer (sections, combat layer, stinger), ambience
  data/                tuning.js (all feel numbers), maps.js + mapkit.js, items, enemies, quests, perks, lore, dialogue + services
  entities/            Player (+ playerMagic), Enemy, Boss, Grimfang, Projectile, Pickup, Chest, Npc, Follower, Breakable, Props
  systems/             state, damage (pure maths), skills, stats, inventory, quests, save, settings, keys, tips, bus, dialogue
  world/               GameScene mixins: pathing, fog, loot, zones, lighting (day/night, weather, darkness layer)
  scenes/              Boot, Title, Intro, Game, Hud, Menu (+ tabs), Ending
  ui/touch.js          on-screen touch controls
test/                  unit/, stage1..14, death, webgl, monkey, balance (see `npm test`)
```

## Notes and known limits

* Base art uses only the 16 palette colours. Lighting, fades, hit tints and the darkness layer blend them, so in-between shades appear on screen.
* Feel and balance numbers live in `src/data/tuning.js` and `src/data/enemies.js`. The balance bot is a crude auto-player
  (it reacts to telegraphs after 0.28 s): treat its numbers as a sanity check, not as a substitute for playtesting.
* **Not verified**: Firefox and Safari (only Chromium was available), a physical gamepad (tested with a simulated pad),
  touch on a real device (tested with synthetic pointer events), and the GitHub Actions workflow (written, not run).
* The 5x7 pixel font is uppercase only; at very small window sizes use the integer-scaling or fullscreen options.
