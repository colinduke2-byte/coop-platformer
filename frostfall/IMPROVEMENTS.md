# Frostfall: backlog

Almost everything from the first backlog is built (see CHANGELOG.md). What is left, honestly:

## Needs a human or other hardware
- Play-test the feel: roll length, bow charge, telegraph lengths, boss pacing. All numbers are in `src/data/tuning.js` / `enemies.js`.
- Test in Firefox and Safari (audio autoplay, canvas), on a real gamepad and on a real touch device.
- Run the GitHub Actions workflow once and fix anything that differs from the sandbox.
- Re-run `npm run balance` after balance changes and compare with a human's results.

## Partly done
- **Animation**: weapons swing and enemies telegraph, but characters still use 3 walk frames per direction.
  Dedicated attack / hurt / death poses (arm extended, crouch, collapse) would make fights read better.
- **Music**: songs have two sections and a combat layer, but each loop is still short (about 30-60 s).
- **Code health**: `GameScene` is smaller (pathing, fog, loot, zones, lighting are mixins) but still owns entity spawning and the update loop;
  `Player` could be split further (movement / melee / ranged / magic).
- **UI scale**: integer scaling and fullscreen exist, but text size is tied to the 320x180 canvas.
- **Mouse**: gameplay works, menus are keyboard / gamepad / touch-button only.

## Ideas not started
- More zones (frozen lake village, mountain monastery), a third boss, a hard-mode NPC-escort quest.
- Armour weight classes, a second perk page, spell tomes found in the world, potion crafting with side effects.
- Mounts, fast travel between campfires, a proper bounty / crime system for pickpocketing.
- Localisation (the font would need lowercase and accented glyphs).
- Replace procedural SFX with layered recordings if the "no asset files" rule is ever relaxed.
