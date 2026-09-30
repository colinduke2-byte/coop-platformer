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
- [x] 17 enemies + 3 bosses (see `docs/LEVEL_BUILDING.md` catalogue)
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
- [ ] World 3 ideas: Candy Clouds (expand the Candy Canopy bonus level), or a Clockwork Dream factory

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
- [ ] Settings: volume, fullscreen, input rebinding
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
- [ ] Test on real separate computers (latency feel); tune NetPeer.delay() in core/net.gd if friends look jerky
- [ ] PeerJS path (public hosting e.g. GitHub Pages) is untested - the dev sandbox blocks its server
- [ ] Sync bosses' attack states (only position/health are corrected now)
