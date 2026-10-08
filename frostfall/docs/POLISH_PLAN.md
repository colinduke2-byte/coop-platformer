# Overnight plan: finish Frostfall and make it full and complete

Colin's direction (his words, summarised; the night-cycle and new-regions requests came later):
1. **Levels must not make you overpowered.** Preparation (gear, upgrades, consumables, some levels) is what makes fights easier; there is no "level 5 and one-shot everything". **Difficulty is a choice, not a fixed wall: three levels (Easy, Normal, Hard)** instead of making the game inherently hard. Everything is balanced at the end across all three.
2. **Performance is fine** (iPhone 13), and **the main machine is a fast M5 Mac**, so the plan spends the extra headroom on quality (detail, lighting, effects) instead of phone speed work. Phone must still run well, through a quality setting.
3. **Skyrim open-world feel**: discovery, a living world, things to stumble on, a reason to wander.
4. **Day and night should change the world**: wolves become werewolves at night, and similar swaps. **Open to a bigger world and new regions**, as long as it feels big, not empty, with distinct areas.
5. **Points of interest must not be on top of each other**: expansive like Skyrim, with real travel between places (round 2). **Fine with a bigger world and higher visual fidelity** (round 12), but **keep the current field of view**: more detail, not more screen.
6. **This plan is meant to finish the game**: full and complete (see the definition below).
7. **More time than one night**: the run can use the overnight stretch *and* all of the following day. So stretch goals are in scope, rounds can be done more thoroughly, and nothing is dropped for time unless a round fails twice.
8. **Something Colin is proud to send to other people**: a stranger should be able to open the link, understand the game in a minute, enjoy the first hour, and never hit a rough edge (round 18).
9. Nothing is cut. Make the list heavy but doable in about a day and a night. All four areas matter: game feel, menus and screens, visuals and audio, story and world. Platforms: **the M5 Mac is where it will be played most** (wired controller or keyboard, Retina display, fullscreen); phone (Bluetooth pad) and other desktops stay supported but come second.

## What "finished and complete" means (the target for this plan)
The game is done when every line below is true. The last round checks this list and reports what is still open.
- **Content complete**: every region has a hub, quests, dungeons, a boss, unique gear and a reason to visit; the main story (three chapters) plus a worthy finale for each region; every enemy has a bestiary page, a telegraphed attack set and a night or day variant where relevant; every item has an icon, a source and a use.
- **Systems complete**: combat, magic, stealth, crafting, alchemy, cooking, enchanting, sockets, factions, companions, housing, fast travel, mounts, time and weather, discovery and the compass all work together, with no stub screens or "coming soon" text.
- **Open world complete**: expansive spacing, discoverable places, a living world with routines and events, day and night that change the world, distinct regions that are full without being crowded.
- **Difficulty complete**: three clear levels (Easy, Normal, Hard), each balanced and verified by the power-curve bot; power comes from gear and preparation, not from level, on all of them; the final balance pass (round 19) is green.
- **Presentation complete**: higher-fidelity art (about 4x the pixels in the same view), lighting and effects; music and sound for every region, fight and menu; consistent UI on every screen, pad, keyboard and touch.
- **Quality complete**: no known stuck states or crashes; every quest finishable; every menu reachable and closable with every input; saves safe; fuzzed worlds clean; docs and the guide up to date.
- **Replay complete**: New Game+, hardcore, daily, arena modes with records.

## How the night runs
- Rounds run in the order below. Each round: **audit, fix, add tests, run the full regression, commit and push, republish the game link, note the changes in CHANGELOG.md**.
- **Stop rules**: if a round's tests still fail after two attempts, revert that round's changes (keep the earlier rounds), write what happened in `docs/OVERNIGHT_LOG.md`, and continue with the next round. Never leave the branch red or unpushed.
- **Nothing is deleted from saves or content**. Old saves do not need to keep working (Colin does not mind) but nothing should crash on load.
- Anything that needs a human eye (does it feel right?) is built with its numbers in `tuning.js` or the data tables, so Colin can adjust it in the morning. Every round ends with "what to try and which numbers to change" in the log.
- Morning report: one page listing what shipped per round, what was reverted, and the top things to playtest.

## Design rules that apply to every round
- **Three difficulty levels, each with a clear promise.** *Easy* is for the story and exploration: forgiving, generous. *Normal* is the intended experience: fair, tense when unprepared, never a wall. *Hard* is for players who want the grind-your-gear game: punishing if under-prepared. No level is the "real" one; each is tuned on purpose and tested.
- **Power comes from gear, preparation and skill, not from level.** Level and skill gains stay small and slow. A max-level character in weak gear still struggles; a well-geared lower-level character can win. Over-levelling never trivialises content.
- **Danger is readable.** The player can tell what is too dangerous before walking in (region danger, creature rating, a warning when entering an area far above you).
- **Every place has a reason to exist**: a reward, a story piece, a threat, or a view. No empty rooms.
- Co-op stays parked. Original names and art only.
- **Higher visual fidelity is welcome** (Colin is fine with changing the art pipeline), as long as the game stays readable and keeps its own look. **The field of view stays as it is now**; only the pixel density and detail go up.
- **Big but not empty, and not crowded**: places are far enough apart to feel like a journey (spacing is a target in seconds of walking, round 2) and the space between them is worth crossing. Both are checked by tools, not by feel.

---

## Round 1: Power curve, difficulty levels and danger (the core request)
Goal: levels never make you overpowered, and difficulty is a menu choice with three well-defined levels. Measure it, do not guess.
- **Three difficulty levels** (chosen at New Game and changeable in the menu; Hard is locked for a hardcore character). Defined as numbers in one table in `tuning.js` so each can be tuned separately:
  - **Easy (story)**: damage you take about 0.6x, enemy health about 0.75x, faster regeneration, kinder enemy timing (longer telegraphs, shorter chases), extra potion and food drops, forgiving stamina, no durability, optional auto-heal when resting. Danger warnings are gentle.
  - **Normal (intended)**: the baseline numbers. A regular fight costs about a third of your health at the right gear, packs and champions are real threats, bosses are tense but beatable first or second try when prepared.
  - **Hard (for the grind)**: damage taken about 1.35x, enemy health about 1.3x, more elites and champions, tighter enemy timing, fewer potion drops, slower regeneration, durability on, prices higher; clearly needs good gear and prepared consumables, and rewards it with better drops.
  - Each level scales *enemy numbers and your recovery*, never skips the rules (no level makes bosses skip phases or removes telegraphs).
- **Power model**: write down the numbers in one table (`docs/POWER_CURVE.md`): player damage, health and armour by level and gear tier; enemy health, damage and armour by region tier. Targets (on **Normal**; Easy and Hard shift them): at the *expected* level and gear for a region, a regular fight costs about 25 to 40% of your health and a pack or champion most of it. Five levels above that is comfortable but never trivial. Five below is dangerous.
- **Flatten level power**: re-check every source of level-based growth (skill damage slope, character level health and stamina, perks) so they add up to a modest curve; move the real growth into gear tiers, upgrades, enchants, sockets and consumables.
- **Enemy scaling**: tougher enemies by region (exists) plus *elite and champion affixes that scale with player gear*, so late content stays threatening for a strong player. No level scaling that makes grinding pointless.
- **Armour and damage formula**: diminishing returns on armour so stacking cannot make you immune; stamina and poise remain the limiting factors.
- **Power-curve bot**: extend the balance bot to simulate "level L with gear tier G" against each region's mobs, bosses and the arena heroes, and print a table. Fail the build if a level-matched player wins too easily or an under-geared one wins too often.
- **Danger readability**: a region and creature danger indicator (skulls or a colour), a "you are far below the recommended strength" warning on entering a harsh area, the bestiary shows a danger rating after the first kill.
- **Progression friction that rewards prep**: potions matter, repairs matter (durability option stays), food buffs matter; a short "prepare" hint at dungeon doors.

## Round 2: World scale and spacing (expansive, not crowded)
**Measured today** (seed 424242): the nearest point of interest to any other is typically **16 tiles away, about 3.5 seconds of walking** (walk speed is 4.5 tiles per second; the closest pairs are 10 to 12 tiles). That is a theme park, not an open world. Fixing it comes before discovery, regions and events, because they all sit on the layout.
- **Spacing is set in seconds of travel, not tiles.** Targets: any two points of interest at least **8 seconds** apart (about 36 tiles); the typical nearest neighbour **12 to 15 seconds** (55 to 70 tiles); *major* places (towns, dungeon entrances, boss lairs, region gates) at least **25 seconds** (about 110 tiles) from each other. Small clusters that belong together (a hamlet with its standing stones) are allowed, but count as one.
- **Make the regions bigger, not the places fewer.** Keep the content, spread it out: the Hollow Reach grows from 320x224 to about **480x336**, and the other regions about 1.4x per side, with the roads, gates, fast-travel points and the Emberhold/city coordinates moved to match. The world generator gets a minimum-distance rule per kind of place, and the layout planner places major places first and fills in around them.
- **Travel must be worth walking.** Between places: roads with signposts, a landmark or vista in view every so often, wildlife and ambient events, the odd lone camp or cairn (small, not a full point of interest), changing terrain, weather and light. Nothing is dead air for long, and nothing is crowded.
- **Faster ways to cross**: fast travel to discovered places (round 3), a **mount** (a horse in the south, a pack mammoth in the highlands) that is faster on roads and costs stamina off-road, plus the existing skates on ice.
- **Tests**: a spacing test measures nearest-neighbour distances per region over many seeds and fails below the targets; a coverage test checks that every place is reachable and that no 100-tile stretch is both empty and featureless; the world-map render is regenerated to eyeball it. The saved-world determinism baseline is re-recorded on purpose.
- **Risks I will manage**: world generation time and memory for the bigger map (streaming already exists), the baked map screen at the new size, every hard-coded coordinate (gate positions, the Emberhold door, quest targets that use fixed spots) moved by one scale rule, and fast-travel/discovery working with the new layout.

## Round 3: Skyrim-style discovery and exploration
- **Discovery system**: every point of interest is *undiscovered* until you see it; discovering shows a banner and chime, adds it to the map and the journal's "Discovered" list, and unlocks fast travel to it.
- **Compass and markers**: a compass strip at the top showing quest targets and discovered places nearby (toggle in settings), plus clearer map legends and filters.
- **Hidden places**: caves, ruins, waterfalls, shrines, ancient trees, unique encounters off the roads, found by looking. Each has a small reward or story.
- **Landmarks and vistas**: towers, giant trees, ruins visible from far away, with distinct silhouettes per region, so you can navigate by sight.
- **Unmarked quests**: some quests start from something you find (a note, a wounded traveller, a dropped item), not from a board.
- **Fast travel rules**: only to discovered places, not mid-combat, costs time (day/night advances), so the world still feels big.
- **Wandering rewards**: every roaming creature, chest and shrine tuned so detours pay off.

## Round 4: A living world
- **NPC routines** in every settlement (work, eat, sleep, tavern, pray), with doors, lights and barks matching the time of day.
- **Dynamic events**: ambushes on the road, a merchant caravan, a wounded traveller, wolves hunting a deer, a bandit raid on a hamlet that you can stop or ignore, a roaming champion, storms with consequences (visibility, cold).
- **Bounty and radiant jobs**: the board generates varied jobs (clear a den, deliver a package, escort, hunt a named beast, find a lost item) scaled to the region, with unique rewards and a "completed" board state.
- **World reacts to you**: defeated camps stay cleared for a while then get reoccupied, guards comment on your deeds, shopkeepers on your faction, children and animals appear in towns.
- **Ecology**: herds, predators and prey, birds, fish, insects, regional wildlife; hunting and gathering matter (food, hides, alchemy).
- **Weather and seasons-lite**: region weather tables, snowstorm cold effect and shelter, fog, aurora, rain on the coast, ash fall on the Peaks.
- **Hearth and home**: more to do with a house (storage, trophies, bed, cooking), a second purchasable home.

## Round 5: Day, night and the moon
The game already has a 12-minute day/night cycle that affects stealth and sends villagers indoors. Now night changes *what lives in the world*, so day and night feel like two different places.
- **Creature swaps at night** (spawns, not just tints): wolves become **werewolves** (bigger, hit harder, howl to call the pack, can be fought with fire or silver-edged weapons), packs hunt in the open; draugr and restless dead walk the roads; frost wights and grave callers haunt barrows and crossroads; **ghosts** drift in graveyards and ruins; shadow lynxes roam more; **night hags** and will-o-wisps in marshes; bats and owls in forests and caves.
- **Day-only life**: deer, hares and birds are out by day; bears hibernate in dens until dusk; bandit camps have sentries by day and sleeping crews at night (a sneak-attack opportunity, and guards wake if you are loud); traders and travellers walk the roads by day only.
- **Moon phases** (a visible moon and a calendar day count): *full moon* = werewolf hunts and rare spawns; *new moon* = the darkest night, shades and ghosts; *blood moon* (rare) = a world event with a roaming alpha and a big bounty.
- **Dawn and dusk**: dawn bells in towns, undead weakened in sunlight, dusk ambushes on the road; shrine blessings that only work at dawn or at night.
- **Night play tools**: a **torch/lantern** item (light radius vs stealth trade-off), campfires and town gates as safe zones, Nightsight elixir (exists), night-blooming herbs (moonpetal, nightshade), night-only dig spots and a ghost merchant.
- **Time controls**: clock display, "wait or rest until..." in inns and at camps, sunrise and sunset grading, weather interacts with time (night fog, dusk storms).
- **Quests with time**: a few quests only make sense at night (a ghost's request, a werewolf hunt, a smuggler's drop).
- Danger ratings, bestiary pages and the guide all show night variants; balance bot runs night encounters too.

## Round 6: New regions and a bigger, fuller world
Goal: a world that feels big but never empty, with regions you could tell apart blindfolded. **Rule: full but never crowded.** Space between places follows round 2 (travel time, not tiles). A region feels full because of what is *between* the places (wildlife, roads, vistas, small finds, weather), not because places are stacked together. Check with the spacing and coverage tests plus the map render.
Each new region gets the full kit (the same recipe used for the Ashen Peaks, Frozen Coast and Old Kingdom): world definition and tiles, a hub settlement with 8 to 10 named people, 4 to 6 quests, 6 to 8 creatures (2 or 3 new sprites, the rest recoloured with their own tricks), 3 new kinds of points of interest, a dungeon, a boss and minions, region music and ambience, unique gear, weather, map and fast-travel integration, and a stage test. Regions open at different times: you *can* walk almost anywhere early (Skyrim style) but the danger tier tells you what you are doing.
Order of building (stop when time runs out; the first two are the target for one night):
1. **The Weeping Fens** (south-west bog): fog banks, lantern paths over black water, stilt village *Reedwick*, sunken barrows, bog wraiths, will-o-wisps, hags, leech swarms, peat fires. Boss: the **Mire Mother**. Poison and cold resist gear, rare alchemy plants. Deadly at night.
2. **The Stormcrown Highlands** (north-west plateau): lightning storms, mammoths, thunderbirds, stone giants, nomad clans around hearth camps (*Skarn Hold*), stone-circle shrines, wind-scoured passes. Boss: the **Storm Giant**. Shock-themed gear and mounts-lite (a pack mammoth for carrying).
3. **The Glasswood** (ancient crystal forest): ice-glazed trees, aurora light at night, glimmerkin (small tricksters), crystal golems, a druid circle hub (*Lantern Glade*), a winter-stag boss (**the Hartking**). Magic gear and unique spells.
4. **The Underdeep** (under Emberhold's mines): a huge cavern region with glowing fungus lakes, cave weavers (spiders, original design), forgotten Delver ruins, an underground ferry, a lode-wyrm boss. Endgame ore and gems.
5. **Saltmarket** (second city on the Frozen Coast): a busy harbour town with boats, a market, guild offices, smugglers and a law-and-order question, plus sea quests.
- **Fullness upgrades for the old regions** (after the spread-out in round 2): wanderers, small finds, vistas and landmarks where the coverage check shows long featureless stretches; no new places closer than the spacing rule.
- **Region identity checklist** per region: colour palette, tile set, weather, music, ambience, creatures, settlement style, gear look, signature mechanic (fog, thunder, lava, tide, ghosts).
- Unlock design: roads and gates in the Reach and between regions; story hooks give reasons to go, but nothing is locked behind a cutscene.

## Round 7: Settlements, shops and services
- Fill every town and hamlet with shops, inns, a smith, a healer and at least one quest or story each; unique shop stock per region; item rarity matches region.
- Inns: rooms (rest through the night), food and rumours that point at undiscovered places.
- Services: fast repair, enchanting, identify/reforge, a tailor or cartographer who sells map pieces to reveal areas.
- Guilds or houses (Emberhold's three factions exist): rank-ups with unique perks and a mid-game questline in each; faction gear.
- Shop UX: buy/sell with comparisons, "sell all junk", sorting, stack handling, buyback.

## Round 8: Dungeons and encounters
- **Dungeon variety**: set pieces (collapsing bridge, flooded hall, sealed vault puzzle, ambush rooms, trap corridors) per theme; a distinct entry vista and exit shortcut.
- **Boss and mini-boss variety**: unique mechanics per fight, an arena identity, and a clear signature drop.
- **Encounter fairness**: every attack is telegraphed; check groups (wolf packs, camps, wights) for unavoidable damage; add "pull and fight" choices (sneak, bow from range, ambush).
- **Loot design**: unique named items with a story line per dungeon and region; tier gating so the best gear needs the hardest places.
- **Traps and secrets**: hidden doors, pressure plates, key puzzles, a lockpicking mini-flow that works with the controller.

## Round 9: Characters, build freedom and crafting
- **Builds**: make each skill path viable (melee, archer, mage, sneak, healer/support), with perks that change how you play, not just numbers.
- **Perks page 2** (the roadmap's second perk page): capstone perks per skill, gated high in the skill.
- **Crafting depth**: smithing tiers, alchemy side effects, enchant combos, cooking buffs; recipes found in the world.
- **Weight and gear identity**: light/medium/heavy armour trade-offs; weapon move styles matter; set bonuses.
- **Companions**: Ragna and Pell get a short personal quest each, commands (wait, follow, aggressive), and reactions.

## Round 10: Game feel pass
- Per weapon and spell: wind-up, hit-stop, knockback, recovery, sound and shake. All numbers in `tuning.js`.
- Dodge, block, parry windows; lock-on in crowds; camera framing for bosses and arenas.
- Enemy hit reactions, death effects, status effect clarity, combat music layers.
- Input polish: buffering of the next action, cancel rules, controller dead zones and pad-specific prompts, button-mash safety, hold-to-repeat in menus.

## Round 11: Menus and screens
- Pause menu: split the 26-row System tab into pages (Game, Display, Audio, Controls, Accessibility) with a one-line hint per row.
- Title screen: settings entry, version stamp, "how to play" card, daily and arena entries kept.
- Inventory, journal, map: filter and sort everywhere, compare with equipped, quest step detail, map legend and declutter, pad and touch parity.
- Tutorials and tips: show once, only when relevant, never in combat, with a controls reminder page.
- Accessibility pass on every screen: text size, contrast, colour-blind modes, input-device-aware prompts.
- Arena Mode: hero preview, how-to-play card, stats page (records per hero and mode).

## Round 12: Visual fidelity (more detail, same field of view)
Colin likes the current field of view, so **the amount of world on screen stays exactly as it is**. What changes is how many pixels are used to draw each thing: the same view, drawn with about **4x the pixels** (2x per side), so characters, creatures, tiles, props, text and effects have real detail. The pixel-art identity stays; it just gets finer and richer. Each step is tested with the art-baseline tool and has its own revert point.
1. **Resolution-density system**: the game canvas goes from 320x180 to **640x360** while the world, physics, camera view and gameplay stay in today's units (the camera zooms 2x, tiles and sprites are drawn at 2x texture size and shown at half size in world units). Nothing about movement, hitboxes, spacing or what you can see changes. Sub-pixel smooth movement replaces whole-pixel snapping. The font, HUD and menus are redrawn crisp at the new density. Quality tiers: **Standard** (320x180, as today, for weak devices), **High** (640x360, the default on a Mac or a modern phone) and **Ultra** (960x540, for fast Macs and Retina screens), chosen automatically from a quick speed test and changeable in the menu.
2. **Procedural art at 2x**: the sprite, tile and icon generators get a density factor, first producing exactly today's art at 2x (nothing looks different yet, a safe checkpoint), then every category is given real detail: outlines and shading, material texture (fur, cloth, metal, bark, stone, snow, ice), faces and hands, armour and weapon pieces, proper highlights and shadows.
3. **Palette**: widen the 16-colour palette to **32 or more** with shading ramps per material, so surfaces have form instead of flat fills.
4. **Sprites**: characters and creatures with more frames (walk, attack, hurt, death, idle), bosses with unique multi-part art, armour and weapons visible by tier.
5. **Tiles and terrain**: smooth biome transitions (snow to rock to grass), cliff and water edges with foam and ice cracks, ground detail (pebbles, tufts, footprints), buildings and ruins with roofs, windows, signage and clutter.
6. **Lighting and atmosphere**: soft dynamic lights and shadows from torches, fire and windows, time-of-day colour grading, fog banks, god rays, bloom on fire and magic, aurora, water shimmer and reflections, layered rain, snow and ash.
7. **Effects and UI**: element-specific hit sparks and trails, status visuals, boss phase transitions, smoother screen transitions; a consistent icon set with rarity frames, a new boss bar and banner design.
8. **Tooling and checks**: a sprite viewer page, the art baseline refreshed per step, screenshot sweeps of every region and screen at phone and desktop sizes (overflow and clipping detector), and a frame-rate check on an emulated phone so the extra pixels do not cost smoothness.
9. **Mac-first rendering**: Retina-aware (the canvas matches the display's real pixels so edges are razor sharp, not blurry), crisp integer scaling in fullscreen and windowed modes, a steady frame rate on 120 Hz screens (a fixed update step with smooth drawing in between), full-screen shader effects (bloom, soft lighting, colour grading) that a fast Mac can afford, and smooth window resizing. Tested in Chrome and Safari on the Mac, with the phone checked through the Standard tier.
Order of work: step 1 and the "identical at 2x" checkpoint first; then characters and creatures, tiles, props, UI and effects in that order, so the game looks better early and every checkpoint is shippable.

## Round 13: Audio
- **Music**: longer loops (several minutes per region), exploration vs combat layers, town themes, boss themes per boss, stingers for discovery and quest events.
- **SFX**: variation (several samples per sound), per-surface footsteps, layered hits, spell sounds per element, UI sounds consistent.
- **Ambience**: regional beds (wind, waves, forge, birds), time-of-day changes, interior reverb feel.
- Mix pass: levels per channel, ducking under dialogue and boss intros.

## Round 14: Story, writing and quests
- **Writing pass**: one voice (epic, mythic, never padded); shorter lines; every important character with a distinct way of speaking.
- **Quest clarity**: every quest step says what to do and where; the journal tracks it; the compass points to it.
- **Quest bot**: a bot walks every quest line start to finish and fails on any blocked step, missing item, unmarked target or unreachable NPC.
- **Side quests with choices and consequences**: at least one memorable quest per region, with a visible result in the world.
- **Lore**: books, carvings and environmental storytelling in each region; a codex view.
- **Endings and epilogue**: pacing of credits, world state after the end, a short "what happened next" per region.
- Faction questlines for the three Emberhold houses reach a proper climax.

## Round 15: Replay, modes and meta
- **New Game+**: scales by gear tier and adds new modifiers; carries trophies; new enemy affixes.
- **Challenge modes** beyond the daily: hardcore (permadeath option), ironman (one save), no-level run.
- **Arena Mode**: extra heroes, boss-rush variants, a horde mode, per-hero stats, unlockable cosmetics.
- **Trophies**: more, with a tracker; cloak and outfit unlocks.
- **Photo mode** (hide HUD, free camera) for screenshots.

## Round 16: Robustness and testing
- **Stuck-state watchdog tests**: every menu/dialogue/transition combination against death, fast travel, saving.
- **Input matrix tests**: keyboard, wired pad, Bluetooth pad, touch, plus mixes in every screen.
- **World generation fuzzing**: hundreds of seeds checked for sealed areas, entities in walls, unreachable quests.
- **Save safety**: autosave rules, slot clarity, corrupt-file recovery check, export/import of a save as a code.
- **Soak tests**: long monkey runs per region and per arena.
- Error log polish (F4 report), no console errors in any covered path.

## Round 17: Release hardening and docs (the final regression and republish are repeated after round 19)
- Firefox and Safari smoke tests where possible; audio autoplay and fullscreen behaviour; iPhone and Mac passes by Colin.
- Run the GitHub Actions workflow for real and fix differences.
- File size and load time budget.
- Update README, `docs/GUIDE.md` and the Field Guide page, CHANGELOG, POWER_CURVE and a short "known issues" list.
- Final regression, balance, monkey; final republish.

---

## Round 18: Share-ready (first-time player experience and presentation)
The goal is that a stranger can be sent the link and have a great time.
- **First minute**: a loading screen with a progress bar and tips, a title screen with a short attract sequence, a clear "how to play" on the first screen (touch, pad and keyboard shown by detected device), and no wall of text before the first fight.
- **First hour**: a scripted but unobtrusive onboarding that teaches movement, roll, attack, block, potions, the map and quests in the first few places; the early game is readable on every difficulty (round 1); the first two quests give a sense of the world; a safe place to learn.
- **Never lost**: always-available "what do I do now" (journal, compass and a hint button), clear markers for the next step, optional hints for stuck puzzles.
- **Settings for everyone**: a first-launch settings step (difficulty, text size, input device, colour-blind mode), remembered per device.
- **Presentation**: a proper credits roll (original work, tools, thanks), a "new game / continue" flow that cannot lose progress, version and build stamp, a small in-game changelog, consistent game name and tagline.
- **Share kit**: a polished one-page landing/guide (the Field Guide, kept current), key screenshots of each region, a short feature list and "how to play" text ready to paste, and a published link that works on phone and desktop. No dev leftovers anywhere: no debug text, placeholder names, broken icons or console errors.
- **Playtest bots as stand-ins for new players**: bots that start a fresh game with no knowledge and try to reach the first dungeon; any place they get lost, stuck or killed repeatedly is a problem to fix.
- **Final acceptance**: the "finished and complete" list is checked line by line and the result written into `docs/OVERNIGHT_LOG.md` along with anything still open.

## Round 19: Final balance pass (last thing before release)
Everything above changes the numbers, so balance is checked again at the very end, after all content, art and systems are in.
- **Balance matrix** (bots, hundreds of trials): every difficulty x level/gear tier x region mobs, every boss, every arena hero and mode, Boss Rush, New Game+, daily modifiers, day versus night, each region's new creatures. Output: one table, pass/fail against the targets for each difficulty (win rate, health left, time, potions used).
- **Targets**: Easy is clearable by a casual player without gear grinding; Normal needs sensible preparation and rewards gear upgrades; Hard needs a good build and consumables. No difficulty is trivialised or walled by over-levelling or under-levelling by more than a few levels; no single weapon, spell, hero or perk dominates (outliers are tuned, not left).
- **Economy sanity**: gold income against prices and upgrades per difficulty; loot rates; XP and skill curve; a "full run" simulation that reports how long each stage takes.
- **Spot checks by hand** (written for Colin): five short fights per difficulty to feel, with the numbers to tweak.
- **Freeze**: after this round only bug fixes; the final republish and the "complete" checklist follow.

## Size and risk
Nineteen rounds across a night and a day. With the extra time, the stretch items are in scope: all five new regions of round 6, mounts, the second city, hardcore and horde modes, photo mode. Time-box: no round gets more than about two hours of attempts; a round that fails twice is reverted and logged. Order of value if something must give: rounds 1 to 5 (with the first two regions of round 6), 10, 12, 14, 16, 18 and 19 first; round 15 and the last three regions of round 6 last. Rounds 2 (scale and spacing) and 12 (visual fidelity) are the riskiest because they touch everything; they run with extra tests and a revert point. After every four rounds the full regression, the balance bots and the fuzzing run, and the game is republished, so there is always a good build to fall back on.

## Colin's morning checklist
0. On the Mac: is the picture crisp (Retina), smooth (frame rate), and does fullscreen scale cleanly? Try the Standard, High and Ultra graphics options.
1. Play 20 minutes from a new game on each difficulty: does Easy feel gentle, Normal fair and Hard demanding? Does grinding gear clearly pay off? Walk out at dusk: is night a different world?
2. Wander without markers: can you walk for a while between places, and is there still something to see along the way? Do you find things, and does the compass help? Visit the new regions: do they look and feel different from each other and from the old ones?
3. Try one dungeon, one boss and one arena run on the controller.
4. Read `docs/OVERNIGHT_LOG.md` for reverted work and the numbers to tweak.
