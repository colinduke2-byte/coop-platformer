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
- [ ] Drop out: hold pause ~1 s to leave
- [ ] Controller disconnect via `EventBus.device_lost`: pause the game + "reconnect or press to drop" prompt
- [ ] Pause menu any player can open: resume / restart from checkpoint / quit
- [ ] Playtest with 2–4 real people and retune

## Phase 3 — Game loop
- [ ] Hit feedback: hit-stop, camera shake API on `CoopCamera`, particles on jump/land/punch/stomp/Lum/revive
- [ ] More enemies: flyer, shielded (punch from behind or stomp), stationary shooter
- [ ] Hazards: spikes, moving platforms, crumbling platforms, bounce pads
- [ ] Level end goal + results screen (Lums per player)
- [ ] One rare hidden collectible per level

## Phase 4 — Content pipeline
- [ ] Level template with background / gameplay / foreground layers
- [ ] TileMapLayer-based terrain alongside `Block`
- [ ] Level select / hub
- [ ] Save data (unlocks, best Lum counts)

## Phase 5 — Art & audio
- [x] 4 original characters as vector cutout rigs (`characters/`: CharacterDef + CharacterRig, procedural animation per state)
- [x] Character select screen (`ui/character_select.tscn`, now the main scene) + in-level wardrobe pedestals
- [x] Demo movement playground (`levels/demo_level.tscn`): jump, coyote, one-way, wall-jump shaft, glide canyon, punch/stomp
- [x] Re-glide in midair (HOLD_THROUGH), charged punch, crates (wood / iron), updrafts, idle quirks + expressions; demo sections 6-8
- [ ] Test runner: a test that hits a SCRIPT ERROR mid-test still reports PASS; make run_tests.gd fail it
- [ ] Original character rig (Skeleton2D or Spine) replacing the vector cutout, keeping `CharacterRig.update_pose()` as the hook
- [ ] Animation hooks from state enter/exit (-> AnimationPlayer)
- [ ] Painted parallax backgrounds (original art, no Rayman assets or characters)
- [ ] Audio manager that listens to EventBus for music + SFX

## Phase 6 — Polish & ship to yourself
- [ ] Settings: volume, fullscreen, input rebinding
- [ ] Windows + macOS export presets
