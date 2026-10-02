# Roadmap

Claude ticks boxes and adds discovered follow-ups. Colin reorders freely.

## Phase 1 — Feel prototype ✅
- [x] Player state machine (Ground, Jump, Fall, Glide, WallSlide, Punch, Bubble)
- [x] Data-driven tuning resource (`player_default.tres`)
- [x] Coyote time, jump buffer, variable jump, apex hang
- [x] Squash & stretch placeholder juice
- [x] Headless feel tests + `tools/check.sh`
- [x] Glide modes (`PlayerTuning.glide_mode`: HOLD_THROUGH / SECOND_PRESS / SEPARATE_BUTTON) - playtest, pick a favourite, maybe drop the others

## Phase 2 — Co-op core ✅ (needs playtesting with real controllers)
- [x] Drop-in join for 2 keyboard layouts + gamepads
- [x] Shared zooming camera + straggler bubbling
- [x] Bubble revive, everyone-bubbled restart, checkpoints
- [x] Drop out: Pause -> "Leave game"
- [x] Controller disconnect via `EventBus.device_lost`: pauses with a "reconnect or Leave" prompt
- [x] Pause menu any player can open: resume / controls / restart / world map / leave
- [ ] Playtest with 2–4 real people and retune

## Phase 3 — Game loop ✅
- [x] Hit feedback: hit-stop, camera shake, dust/puff/star particles, stomp chains (x2 x3 pops)
- [x] 23 enemies + 5 bosses (see `docs/LEVEL_BUILDING.md` catalogue)
- [x] Hazards and toys: spikes, saws, crushers, moving/crumbling platforms, bounce pads, and ~40 more
- [x] Level goal + results screen (time, Lums, gems, Snoozling, records)
- [x] Hidden collectibles: 3 gems + 1 caged Snoozling per level

## Phase 4 — Content pipeline ✅
- [x] Python level kit (`tools/levelgen/`) generating levels from short scripts
- [x] Freeform polygon `Terrain` alongside `Block`
- [x] World map (World 1: The Lullaby Woods) + Bonus Dreams level select
- [x] Save data (unlocks, best times, Lums, gems, Snoozlings)
- [x] Bot tests that play every World 1 level start-to-goal

## World 1 — The Lullaby Woods ✅ (needs Colin's playtest)
- [x] 1-1 Pillow Meadow (basics, Grumblets, Shellbert shell bowling, frog boost, dandelion valley)
- [x] 1-2 Dandelion Drift (sky islands, sinking leaves, updrafts, dandelion chains, Bumblebonks)
- [x] 1-3 Mossy Hollow (dark cave, Puffcaps, Wispets, geyser shaft, underground lake)
- [x] 1-4 Bramble Bridges (treetop village, rope bridges, pendulums, seesaw, trunk climb, ziplines)
- [x] 1-5 Millstream Rush (log rafts, water wheel, rapids, waterfall climb)
- [x] 1-6 Thornwood Keep (castle, haunted tower, boss: Baron Bristleback)
- [ ] Playtest: difficulty curve, is 1-5's rapids section too long? is the Baron too hard with 1 player?
- [ ] More secrets per level (a second cracked wall / hidden room in 1-1 and 1-2)
- [x] World 2 (see below)
- [x] Dream Bell in every level: a Lum Rush (Lums worth double for 10 s)
- [x] Dream Wardrobe: 6 unlockable outfits (gems / Snoozlings), picked on character select

## World 2 — Frostwhistle Peaks ✅ (needs Colin's playtest)
- [x] New pieces: snow piles + growing snowballs (bowl enemies, smash packed ice), ski-lift gondolas, avalanche chase (rubber-banded to stay on screen), slippery icy terrain
- [x] New enemies: Slidgewick (tobogganing penguin), Snowl (drops snowballs), Yetling (lobs snowballs), boss Grumblefrost (punch his boulders back!)
- [x] 2-1 Snowball Slopes, 2-2 Cablecar Cliffs, 2-3 Crystal Caverns, 2-4 Avalanche Alley, 2-5 Hot Spring Hollow, 2-6 Grumblefrost's Summit
- [x] Snowy world map + gondola gate from World 1 (opens after the Baron)
- [ ] Playtest: is Avalanche Alley too scary for new players? (`Avalanche.speed` 450, `catchup_gap` 850)

## Level refinement pass ✅
- [x] Every W1/W2 level 10–25% longer with a new closing section (W1: stream swim + ferry, sky meadow, glowroot bridge + grotto, swing rings + shieldbug tree, lily lagoon, keep courtyard; W2: sledge run + snow hut, frost fort, minecart chasm + crystal chamber, ice floes + yetling camp, steam boardwalk + seesaw hill, frozen tollgate)
- [x] Signs auto-placed clear of terrain / props; layout audit (`tools/level_audit.gd`) runs in the tests
- [x] Fixes: stuck wall-sliding at cliff feet (terrain collision keeps inside corners sharp), rope-bridge end lip, ground-piece seams
- [ ] Bonus levels (Candy, Sunset, Glacier) only got layout fixes - extend them next

## Boss fights
- [x] Dying in an arena no longer locks you out: the entry gate reopens on respawn (ZoneTrigger ignored stale overlaps and slammed it shut again)
- [x] On a full-party respawn the boss walks back to his spot and naps (damage dealt is kept; minions / boulders cleared); boss bar hides until you return
- [x] King Grumblo gets the boss health bar too
- [ ] Playtest: should bosses heal on respawn instead? (set_active(false) in each boss script)

## World 3 - Rainbloom Jungle ✅ (needs Colin's playtest)
- [x] New pieces: lianas (long swinging vines), flytraps (snap shut after you step in), rain ambience, jungle + ruins backdrops, palm / big leaf / totem / bromeliad deco, waterfall helper
- [x] New enemies: Cocobonk (coconut-lobbing monkey), Swoopbeak (diving toucan), Nibblefin (leaping piranha), boss Chamelia (tongue sticks in walls; invisible sneak; seed fan)
- [x] 3-1 Drizzle Thicket, 3-2 Canopy Highway, 3-3 Sunken Temple, 3-4 Rumbletide Rapids, 3-5 Firefly Bog, 3-6 Chamelia's Temple; bot tests for every section
- [x] Jungle world map + gate from the top of World 2's map; 6 new music tracks
- [ ] Playtest: are the liana chains too hard for new players? (`Liana.sway`, spacing 420-480, grab = lower half of the vine)
- [ ] Is Chamelia fair with 1 player? (`tongue_reach` 760, `stuck_time` 2.6)

## World 4 - Clockwhirl Works ✅ (needs Colin's playtest)
- [x] New pieces: tick-tock blocks (pink / blue swap on a shared beat), zap arcs, factory backdrop, gear / pipes / clock / toy-block deco, 6 themes + 6 music tracks
- [x] New enemies: Windup (loses its key, races), Sparkbot (electric drone - punch it), Springbot (hops at you), boss Cuckoolossus (pendulum, gears, the cuckoo sticks in the floor - stomp it)
- [x] 4-1 Cogwheel Courtyard, 4-2 Conveyor Chaos, 4-3 Steam Pipes, 4-4 Tick-Tock Tower, 4-5 Night Shift, 4-6 Cuckoolossus Clocktower; bot tests for every section
- [x] Factory world map + gate from the top of World 3's map
- [ ] Playtest: is the beat (`BeatBlock.beat` 1.6 s) too fast with 4 players? Is Cuckoolossus fair solo (`stuck_time` 2.6)?
- [ ] Ideas for World 5: Candy Clouds (expand the Candy Canopy bonus level)?

## Phase 5 — Art & audio
- [x] 4 original characters as vector cutout rigs (`characters/`: CharacterDef + CharacterRig, procedural animation per state)
- [x] Character select screen + in-level wardrobe pedestals
- [x] Demo movement playground (`levels/demo_level.tscn`)
- [x] Test runner fails tests that hit a SCRIPT ERROR mid-test
- [x] Painted-style parallax backdrops (8 sceneries: hills, forest, cave, canopy, river, castle, candy, ice), aerial haze, light shafts
- [x] Atmosphere: floating pollen / leaves / fireflies / spores / petals / embers / snow, darkness + lights
- [x] Audio manager on EventBus, generated SFX + a music track per level and the map, boss music
- [x] Title screen
- [ ] Original character rig (Skeleton2D or Spine) replacing the vector cutout, keeping `CharacterRig.update_pose()` as the hook
- [ ] Hand-painted texture pass (if Colin wants to go beyond procedural art)

## Phase 6 — Polish & ship to yourself
- [x] Performance: static art baked to meshes, on-screen-only redraws (draw calls 1200–2700 -> 280–530 on the busiest levels)
- [x] Settings: music / SFX volume, fullscreen (Pause -> Settings, saved in user://settings.json)
- [ ] Input rebinding
- [x] Windows export preset (`export_presets.cfg`, single .exe)
- [ ] macOS export preset

## Playtest round 1 (Colin's notes)
- [x] Jumps more consistent: tap = fixed short hop (`jump_min_height`), full jumps never turn into a glide by themselves (glide = press JUMP again, `glide_mode` SECOND_PRESS), sprint no longer kicks in on its own, coyote 0.12 s / buffer 0.15 s
- [x] Simpler wall jumps: JUMP anywhere beside a wall (rising or falling, `wall_jump_reach`); hold toward it = climbing hop (`wall_climb_velocity`)
- [x] Controls key: Pause -> Controls, PAUSE on character select, `docs/CONTROLS.md`
- [x] Punch reach 72 -> 90 px, hitbox 64x46 -> 72x50
- [x] Mumbleby is now a witch-wizard (long hair, lashes: `CharacterDef.has_long_hair / has_lashes / nose_size`)
- [x] Punch = Shift (Left Shift P1, Right Shift P2); sprint = hold Ctrl / RT, or double-tap a direction
- [ ] Playtest round 2: are single-wall climbs too strong for level secrets? (`wall_climb_velocity`)
- [ ] Button rebinding in a settings menu


## Online multiplayer (browser)
- [x] Host / join with 4-letter codes; lobby = character select; host drives menus and levels
- [x] Friends as puppets (interpolated), relayed punches/stomps/revives/doors, level start barrier
- [x] Host corrections for enemies, moving platforms and wheels; hit-stop off online
- [x] Tested on real separate computers (Colin: works fine)
- [x] PeerJS path (GitHub Pages) works with friends
- [ ] Sync bosses' attack states (only position/health are corrected now)
