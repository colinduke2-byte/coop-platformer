# Arena Mode (quick play): plan

**Goal:** from the title screen, pick ARENA, pick a hero build, and be fighting inside 10 seconds. No story, no save file, no grinding. Runs of 5 to 15 minutes. Nothing carries into the main game and nothing from the main game is needed.

## What already exists (and what is wrong with it)
- The Hollow Arena is a door in Hollowfrost. It uses your real character (`S`), so it needs a save, and your gear and levels decide how it goes.
- `world/arena.js` (wave tables), `world/arenaRun.js` (waves, boons, gauntlet), `data/mods.js` (modifiers, boons), `systems/daily.js` (scoring, local board), `systems/achievements.js` (trophies).
- Reuse all of it. The new part is the **standalone entry, the loadouts and the arena maps**.

## The player's path
1. Title: new **ARENA** entry (above Daily Challenge).
2. **Pick a hero**: 6 premade loadouts, no menus to dig through.
3. **Pick a mode** and a **map**, or press "Surprise me".
4. Fight. Pause menu has Restart and Quit to title.
5. Results screen: score, wave reached, kills, best streak, unlocks, **Play again** (one key).

## Loadouts (fixed gear and levels, so it is fair and instant)
| Hero | Kit | Playstyle |
|---|---|---|
| Warden | Iron sword, shield, Force shout | Block, parry, steady |
| Reaver | Greatsword, Battle Cry | Slow, huge hits |
| Ranger | Bow, fire arrows, Blink | Kite and shoot |
| Frostmage | Frost Bolt, Nova, Ward | Control and burst |
| Pyromancer | Fireball, Ember Nova, Meteor | Area damage |
| Shadow | Daggers, sneak bonus, Cinderstep | Burst and escape |
Each hero is a small data table (equipment, skill levels, perks, spells). The game builds a fresh temporary state from it, so the real save is never touched. More heroes unlock from trophies and records.

## Modes
- **Survival** (default): endless waves with a boss every 5. One life, finish when you die.
- **Gauntlet**: a champion every wave (exists).
- **Boon Trial**: pick one of three boons between waves (exists). This becomes the best mode for variety.
- **Boss Rush**: all bosses in sequence, a short rest between. (This was on the "not built" list.)
- **Daily Arena**: same seed and two modifiers for everyone that day, with the local board (exists for the main game; make it arena-native).
- Later: **Horde** (survive 3 minutes against a stream) and **Co-op**-ready structure, but no co-op now.

## Arenas (maps)
Four small, readable maps with their own hazards, so a run does not feel the same:
- **Hollow Pit** (existing look): open floor.
- **Frozen Lake**: ice makes movement slippery; cracks open over time.
- **Ember Foundry**: lava edges and falling embers.
- **Old Court**: pillars to hide behind, sentinels as terrain.
Each is one generated room (like the barrow generator), fixed size so the camera never moves. Easy to add more.

## Making it fun fast (the part that matters)
- **Instant pace**: waves start 3 seconds after the last kill. Potions drop from enemies so there is no shop.
- **Pickups**: health, stamina, a temporary damage orb, a bomb. Fewer pauses, more decisions.
- **Boons**: reuse the 8 existing ones and add about 8 new, including a few build-defining ones ("your arrows split", "dodge leaves a fire trail").
- **Combo meter**: kills in quick succession build a multiplier. It raises the score and breaks if you get hit.
- **Mutators per wave** (a banner at the start): Fast Foes, Armoured, Darkness, Double Elites. Telegraphed so it feels fair.
- **Score and records**: a score board per hero and mode on this device, plus "personal best" call-outs.
- **Unlocks**: heroes, arenas and cloak colours come from reaching wave and score milestones. No gold or grind.

## Scope and phases
1. **Core loop** (smallest playable): title entry, hero pick (3 heroes), Survival on the existing Pit map, results screen, restart. Tests: starts without a save, does not alter the save, results appear on death.
2. **Content**: remaining 3 heroes, 3 more arenas, Boon Trial and Gauntlet wired to the new screens, pickups and combo meter.
3. **Variety**: wave mutators, 8 new boons, Boss Rush, Daily Arena.
4. **Polish**: records, unlocks, music and banner polish, balance bot rows per hero, Playwright test per mode, monkey run, documentation and a guide page.

Phase 1 is about a day of work in session terms and can be played right away. I would stop and have you try it after phase 1 before going further.

## Risks and answers
- **Balance across six heroes**: the existing balance bot can run each hero against waves 1, 5, 10 and 15. Targets: every hero reaches wave 8+ with a competent bot, and none reaches wave 20.
- **Shared state**: the main game is built around one global `S`. The arena builds a temporary state and restores the real one on exit, with a test that proves the save file is unchanged.
- **Code size**: new code lives in `src/arena/` (heroes, maps, modes, results) so `GameScene` does not grow.
- **Feel**: nobody has played the existing arena by hand. I would like your reaction to phase 1 before building the rest.

## Questions for you (my default in bold)
1. Heroes: **six fixed loadouts** or your normal character as an extra option?
2. Start with **Survival only** in phase 1, or also Boss Rush?
3. Keep scores **local only** (default) or do you want online boards later?
