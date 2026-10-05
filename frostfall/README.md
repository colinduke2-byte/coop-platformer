# FROSTFALL

A top-down, 8-bit, Skyrim-inspired action RPG for the browser.
**Phaser 3 + Vite**, 320x180 internal resolution, `pixelArt` mode, 16x16 tiles,
a fixed 16-colour snowy palette. **There are no asset files**: every sprite, tile,
icon, font glyph and sound is generated in code.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (open with any static server)
npm test           # headless-browser tests for every stage (needs Playwright + Chromium)
```

Handy URL flags (dev only): `?scene=game` skips the title, `&map=forest|crypt|village`,
`&spawn=west|crypt|entry|start`, `?renderer=canvas` forces the Canvas renderer.
In the console, `__ff.S` is the live game state (gold, inventory, quests...).

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move (8 directions) |
| Space | Dodge roll (brief invincibility, costs stamina) |
| J | Sword swing (stamina) |
| K (hold, release) | Bow: hold to charge, release to fire (arrows + stamina) |
| L | Cast the selected spell (mana) |
| Q / Tab | Swap spell: Fireball / Frost Bolt (slows) |
| R | Shout "FUS": pushes enemies back, shakes the screen (12 s cooldown) |
| C / Shift (hold) | Sneak: smaller detection radius, x3 sword / x2 bow sneak attacks |
| E / Enter | Talk, open chests, advance dialogue |
| 1 / 2 / 3 | Health / Mana / Stamina potion |
| I / O / Esc | Pack & equipment / Quest journal / Pause (save, load, volume) |

## Code layout

```
src/
  main.js              Phaser config (320x180, pixelArt, FIT scaling), scene list
  config.js            palette (16 colours), tile ids, key bindings
  art/                 sprites.js (characters, tiles, icons, fx), font.js (5x7 pixel font), fx.js, snow.js
  audio/sfx.js         Web Audio chiptune SFX + tiny music sequencer
  data/                maps.js + mapkit.js, items.js, enemies.js, quests.js, dialogue.js (NPC scripts)
  entities/            Player, Enemy (+Boss), Projectile, Pickup, Chest, Npc
  systems/             state (the save object), keys, bus (events), skills, stats, inventory, quests, dialogue, save
  scenes/              Boot, Title, Intro, Game, Hud, Menu (+tabs), Ending
test/                  Playwright tests: stage1..8, death, webgl; run all with `npm test`
```

## What was built, stage by stage (and how to test it by hand)

1. **Setup / room / movement** - `npm run dev`, press Enter, skip the intro with E. Walk with WASD; trees, houses and fences block you; the camera follows and snow falls.
2. **Melee, roll, stamina, enemy** - J swings (watch the SP bar drain and refill), Space rolls (you pass through hits). Draugr telegraph with a red flash and `!` before striking.
3. **Bow, magic, shout** - hold K and release (full charge flashes gold and hits harder, costs more stamina), L casts, Q swaps Fireball / Frost, R shouts.
4. **Enemies and loot** - walk east out of the village into the Pine Forest: wolves lunge after a growl, bandits swing, archers show a red aim line. Kills drop gold, arrows, potions and gear. Open chests with E.
5. **Inventory / skills** - I opens the pack: E equips, unequips or drinks. The Skills tab shows XP bars. Use a skill enough and a level-up banner appears.
6. **Village, NPCs, quests** - Elder Sigrid, Bjorn the hunter, Mirra the merchant. O opens the journal.
7. **Crypt and boss** - the stone gate in the north-east of the forest. Jarl Valdrek has 2 phases (below 50% HP he roars, summons draugr and gains frost nova + charge).
8. **Save/load, pause, sound** - Esc opens the pause menu. Save and Continue use `localStorage` (key `frostfall_save_v1`).

## Story and the choice

Take **Wolves at the Gate** from Bjorn (kill 3 wolves) and **The Hollow King** from Sigrid.
After the boss drops the **Frostheart**, bring it to the village. Sigrid asks you to seal it in the hearth
(**warm ending**) or you can keep it (**cold ending**); Mirra also offers 400 gold for it (**bargain ending**).
The village visuals and NPC dialogue change afterwards.

## Notes

* Base art uses only the 16 palette colours. Lighting, fades, damage tints and the dim overlay in the crypt blend those colours, so transient in-between shades appear on screen.
* Feel numbers live at the top of `src/entities/Player.js` (`P`), `src/entities/Boss.js` (`B`) and `src/data/enemies.js`.
* Skills cap at level 20; bonuses are in `src/systems/skills.js`.
