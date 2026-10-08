# Overnight plan: make Frostfall better and more complete

Colin's direction (his words, summarised):
1. **Levels must not make you overpowered.** The game should not be easy unless you grind gear and levels *beforehand*. Preparation is what makes fights easier; there is no "level 5 and one-shot everything".
2. **Performance is fine** (iPhone 13). Phone speed work is dropped from the plan.
3. **Skyrim open-world feel**: discovery, a living world, things to stumble on, a reason to wander.
4. Nothing is cut. Make the list heavy but doable in one night. All four areas matter: game feel, menus and screens, visuals and audio, story and world. Platforms: Mac (wired pad), phone (Bluetooth pad), keyboard.

## How the night runs
- Rounds run in the order below. Each round: **audit, fix, add tests, run the full regression, commit and push, republish the game link, note the changes in CHANGELOG.md**.
- **Stop rules**: if a round's tests still fail after two attempts, revert that round's changes (keep the earlier rounds), write what happened in `docs/OVERNIGHT_LOG.md`, and continue with the next round. Never leave the branch red or unpushed.
- **Nothing is deleted from saves or content**. Old saves do not need to keep working (Colin does not mind) but nothing should crash on load.
- Anything that needs a human eye (does it feel right?) is built with its numbers in `tuning.js` or the data tables, so Colin can adjust it in the morning. Every round ends with "what to try and which numbers to change" in the log.
- Morning report: one page listing what shipped per round, what was reverted, and the top things to playtest.

## Design rules that apply to every round
- **Power comes from gear, preparation and skill, not from level.** Level and skill gains stay small and slow. A max-level character in weak gear still struggles; a well-geared lower-level character can win. Over-levelling never trivialises content.
- **Danger is readable.** The player can tell what is too dangerous before walking in (region danger, creature rating, a warning when entering an area far above you).
- **Every place has a reason to exist**: a reward, a story piece, a threat, or a view. No empty rooms.
- Co-op stays parked. Original names and art only.

---

## Round 1: Power curve and danger (the core request)
Goal: fights are hard at your level, and only grinding makes them easier. Measure it, do not guess.
- **Power model**: write down the numbers in one table (`docs/POWER_CURVE.md`): player damage, health and armour by level and gear tier; enemy health, damage and armour by region tier. Targets: at the *expected* level and gear for a region, a regular fight costs about 25 to 40% of your health and a pack or champion nearly all of it. Five levels above that is comfortable but never trivial. Five below is dangerous.
- **Flatten level power**: re-check every source of level-based growth (skill damage slope, character level health and stamina, perks) so they add up to a modest curve; move the real growth into gear tiers, upgrades, enchants, sockets and consumables.
- **Enemy scaling**: tougher enemies by region (exists) plus *elite and champion affixes that scale with player gear*, so late content stays threatening for a strong player. No level scaling that makes grinding pointless.
- **Armour and damage formula**: diminishing returns on armour so stacking cannot make you immune; stamina and poise remain the limiting factors.
- **Power-curve bot**: extend the balance bot to simulate "level L with gear tier G" against each region's mobs, bosses and the arena heroes, and print a table. Fail the build if a level-matched player wins too easily or an under-geared one wins too often.
- **Danger readability**: a region and creature danger indicator (skulls or a colour), a "you are far below the recommended strength" warning on entering a harsh area, the bestiary shows a danger rating after the first kill.
- **Progression friction that rewards prep**: potions matter, repairs matter (durability option stays), food buffs matter; a short "prepare" hint at dungeon doors.

## Round 2: Skyrim-style discovery and exploration
- **Discovery system**: every point of interest is *undiscovered* until you see it; discovering shows a banner and chime, adds it to the map and the journal's "Discovered" list, and unlocks fast travel to it.
- **Compass and markers**: a compass strip at the top showing quest targets and discovered places nearby (toggle in settings), plus clearer map legends and filters.
- **Hidden places**: caves, ruins, waterfalls, shrines, ancient trees, unique encounters off the roads, found by looking. Each has a small reward or story.
- **Landmarks and vistas**: towers, giant trees, ruins visible from far away, with distinct silhouettes per region, so you can navigate by sight.
- **Unmarked quests**: some quests start from something you find (a note, a wounded traveller, a dropped item), not from a board.
- **Fast travel rules**: only to discovered places, not mid-combat, costs time (day/night advances), so the world still feels big.
- **Wandering rewards**: every roaming creature, chest and shrine tuned so detours pay off.

## Round 3: A living world
- **NPC routines** in every settlement (work, eat, sleep, tavern, pray), with doors, lights and barks matching the time of day.
- **Dynamic events**: ambushes on the road, a merchant caravan, a wounded traveller, wolves hunting a deer, a bandit raid on a hamlet that you can stop or ignore, a roaming champion, storms with consequences (visibility, cold).
- **Bounty and radiant jobs**: the board generates varied jobs (clear a den, deliver a package, escort, hunt a named beast, find a lost item) scaled to the region, with unique rewards and a "completed" board state.
- **World reacts to you**: defeated camps stay cleared for a while then get reoccupied, guards comment on your deeds, shopkeepers on your faction, children and animals appear in towns.
- **Ecology**: herds, predators and prey, birds, fish, insects, regional wildlife; hunting and gathering matter (food, hides, alchemy).
- **Weather and seasons-lite**: region weather tables, snowstorm cold effect and shelter, fog, aurora, rain on the coast, ash fall on the Peaks.
- **Hearth and home**: more to do with a house (storage, trophies, bed, cooking), a second purchasable home.

## Round 4: Settlements, shops and services
- Fill every town and hamlet with shops, inns, a smith, a healer and at least one quest or story each; unique shop stock per region; item rarity matches region.
- Inns: rooms (rest through the night), food and rumours that point at undiscovered places.
- Services: fast repair, enchanting, identify/reforge, a tailor or cartographer who sells map pieces to reveal areas.
- Guilds or houses (Emberhold's three factions exist): rank-ups with unique perks and a mid-game questline in each; faction gear.
- Shop UX: buy/sell with comparisons, "sell all junk", sorting, stack handling, buyback.

## Round 5: Dungeons and encounters
- **Dungeon variety**: set pieces (collapsing bridge, flooded hall, sealed vault puzzle, ambush rooms, trap corridors) per theme; a distinct entry vista and exit shortcut.
- **Boss and mini-boss variety**: unique mechanics per fight, an arena identity, and a clear signature drop.
- **Encounter fairness**: every attack is telegraphed; check groups (wolf packs, camps, wights) for unavoidable damage; add "pull and fight" choices (sneak, bow from range, ambush).
- **Loot design**: unique named items with a story line per dungeon and region; tier gating so the best gear needs the hardest places.
- **Traps and secrets**: hidden doors, pressure plates, key puzzles, a lockpicking mini-flow that works with the controller.

## Round 6: Characters, build freedom and crafting
- **Builds**: make each skill path viable (melee, archer, mage, sneak, healer/support), with perks that change how you play, not just numbers.
- **Perks page 2** (the roadmap's second perk page): capstone perks per skill, gated high in the skill.
- **Crafting depth**: smithing tiers, alchemy side effects, enchant combos, cooking buffs; recipes found in the world.
- **Weight and gear identity**: light/medium/heavy armour trade-offs; weapon move styles matter; set bonuses.
- **Companions**: Ragna and Pell get a short personal quest each, commands (wait, follow, aggressive), and reactions.

## Round 7: Game feel pass
- Per weapon and spell: wind-up, hit-stop, knockback, recovery, sound and shake. All numbers in `tuning.js`.
- Dodge, block, parry windows; lock-on in crowds; camera framing for bosses and arenas.
- Enemy hit reactions, death effects, status effect clarity, combat music layers.
- Input polish: buffering of the next action, cancel rules, controller dead zones and pad-specific prompts, button-mash safety, hold-to-repeat in menus.

## Round 8: Menus and screens
- Pause menu: split the 26-row System tab into pages (Game, Display, Audio, Controls, Accessibility) with a one-line hint per row.
- Title screen: settings entry, version stamp, "how to play" card, daily and arena entries kept.
- Inventory, journal, map: filter and sort everywhere, compare with equipped, quest step detail, map legend and declutter, pad and touch parity.
- Tutorials and tips: show once, only when relevant, never in combat, with a controls reminder page.
- Accessibility pass on every screen: text size, contrast, colour-blind modes, input-device-aware prompts.
- Arena Mode: hero preview, how-to-play card, stats page (records per hero and mode).

## Round 9: Visuals
- **Animation**: more walk frames, attack/hurt/death for every creature, idle life (breathing, blinking, tails, sway), foot dust and snow prints in more terrains.
- **Effects**: hit sparks per element, spell trails, status icons, phase transitions, better respawn and fast-travel transitions.
- **World art**: biome transitions, interior detail, region identity for each region, distinct town silhouettes, props that tell small stories.
- **Lighting and weather visuals**: day/night colour grading, torches and windows lit at night, fog, aurora, ash.
- **UI art**: consistent icon set, item rarity frames, boss bar and banner art.
- Art regression baseline refreshed.

## Round 10: Audio
- **Music**: longer loops (several minutes per region), exploration vs combat layers, town themes, boss themes per boss, stingers for discovery and quest events.
- **SFX**: variation (several samples per sound), per-surface footsteps, layered hits, spell sounds per element, UI sounds consistent.
- **Ambience**: regional beds (wind, waves, forge, birds), time-of-day changes, interior reverb feel.
- Mix pass: levels per channel, ducking under dialogue and boss intros.

## Round 11: Story, writing and quests
- **Writing pass**: one voice (epic, mythic, never padded); shorter lines; every important character with a distinct way of speaking.
- **Quest clarity**: every quest step says what to do and where; the journal tracks it; the compass points to it.
- **Quest bot**: a bot walks every quest line start to finish and fails on any blocked step, missing item, unmarked target or unreachable NPC.
- **Side quests with choices and consequences**: at least one memorable quest per region, with a visible result in the world.
- **Lore**: books, carvings and environmental storytelling in each region; a codex view.
- **Endings and epilogue**: pacing of credits, world state after the end, a short "what happened next" per region.
- Faction questlines for the three Emberhold houses reach a proper climax.

## Round 12: Replay, modes and meta
- **New Game+**: scales by gear tier and adds new modifiers; carries trophies; new enemy affixes.
- **Challenge modes** beyond the daily: hardcore (permadeath option), ironman (one save), no-level run.
- **Arena Mode**: extra heroes, boss-rush variants, a horde mode, per-hero stats, unlockable cosmetics.
- **Trophies**: more, with a tracker; cloak and outfit unlocks.
- **Photo mode** (hide HUD, free camera) for screenshots.

## Round 13: Robustness and testing
- **Stuck-state watchdog tests**: every menu/dialogue/transition combination against death, fast travel, saving.
- **Input matrix tests**: keyboard, wired pad, Bluetooth pad, touch, plus mixes in every screen.
- **World generation fuzzing**: hundreds of seeds checked for sealed areas, entities in walls, unreachable quests.
- **Save safety**: autosave rules, slot clarity, corrupt-file recovery check, export/import of a save as a code.
- **Soak tests**: long monkey runs per region and per arena.
- Error log polish (F4 report), no console errors in any covered path.

## Round 14: Release hardening and docs
- Firefox and Safari smoke tests where possible; audio autoplay and fullscreen behaviour; iPhone and Mac passes by Colin.
- Run the GitHub Actions workflow for real and fix differences.
- File size and load time budget.
- Update README, `docs/GUIDE.md` and the Field Guide page, CHANGELOG, POWER_CURVE and a short "known issues" list.
- Final regression, balance, monkey; final republish.

---

## Size and risk
Fourteen rounds is a heavy night. Rounds 1, 2, 3, 7, 11 and 13 carry most of the value; if time runs short, drop rounds 12 and 9's secondary items first. The riskiest changes (power curve, world events, quest bot) have tests written first.

## Colin's morning checklist
1. Play 20 minutes from a new game: is the early game properly hard? Does grinding clearly pay off?
2. Wander without markers: do you find things, and does the compass help?
3. Try one dungeon, one boss and one arena run on the controller.
4. Read `docs/OVERNIGHT_LOG.md` for reverted work and the numbers to tweak.
