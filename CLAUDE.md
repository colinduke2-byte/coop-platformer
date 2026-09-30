# CLAUDE.md — Co-op Platformer

Local co-op (1–4 players, one screen) 2D platformer with Rayman Legends-style
feel, built in **Godot 4.7 / GDScript**. Colin is the designer and director;
you are the engineer. Runs on his Windows PC and M-series MacBook.

Read `docs/GAME_DESIGN.md` (what the game is) and `docs/ROADMAP.md` (what's next)
before starting any feature.

## Commands

- Verify everything: `bash tools/check.sh` (import + boot main scene + tests).
  Needs `GODOT` env var if Godot isn't on PATH (see top of the script).
- Tests only: `$GODOT --headless --path . res://tests/test_runner.tscn`
  (add `-- only=<substring>` to run matching tests, e.g. `-- only=w1_4`)
- Play: open the folder in the Godot editor and press F5, or `$GODOT --path .`.
  F5 = title -> character select -> World 1 map. Any level opens alone via F6.
- Regenerate a level: `python3 tools/levelgen/levels/w1_3.py`
- Windows build: `$GODOT --headless --export-release "Windows" build/windows/DreamersPlayground.exe`

You cannot see or play the game. `tools/check.sh` and the tests are your eyes:
**run the check after every change and don't report a task done until it passes.**

## Architecture

```
core/        Autoloads: EventBus (global signals), InputRouter (devices -> slots),
             GameManager (join, checkpoints, lums, gems, snoozlings, scene flow),
             Vfx, Audio (music + SFX driven by EventBus). SaveData (records),
             View (static camera rect: View.sees / View.redraw for cheap culling)
player/      player.gd (body + shared helpers), states/*.gd (one move per file:
             ground, jump, fall, glide, wall_slide, wall_run, ledge_hang, crouch,
             slide, ground_pound, punch, climb, swim, swing, zipline, cannon,
             bubble, victory), tuning/player_tuning.gd + player_default.tres
characters/  CharacterDef .tres + CharacterRig (procedural vector cutout)
camera/      coop_camera.gd - frames all living players, zooms, shake, updates View
world/       Geometry (block, terrain, slope, back_wall), toys (bounce_pad, swing_ring,
             zipline, dandelion, geyser, seesaw, rope_bridge, pendulum, leaf_platform,
             log_raft, platform_wheel...), hazards (spikes, brambles, saw_blade,
             acorn_dropper...), logic (activation, gate, switches, zone/defeat triggers),
             looks (backdrop, ambience, glow_light, waterfall, level_theme + themes/),
             mesh_painter.gd (bakes static art to one ArrayMesh = one draw call)
decor/       deco.gd (baked scenery props, sway via skew), signpost
enemies/     enemy.gd base + 17 enemies + 3 bosses (king_grumblo, baron_bristleback, grumblefrost)
collectibles/ lum, gem, snoozling_cage, dream key
levels/      level.gd (every level root), level_catalog.gd (worlds, order, unlocks),
             w1_*/w2_*.tscn (Worlds 1-2 - GENERATED, see below), bonus levels, demo_level
ui/          title -> character_select -> world_map (one per world, gates between) -> level -> results;
             hud (boss bar, banners, F3 debug), pause_menu, level_select (bonus)
tools/       check.sh, levelgen/ (Python level kit + level scripts), bench (draw
             calls / blame), scene_shot + shots.sh (screenshots), audio/ (music gen)
tests/       run_tests.gd (feel, pieces, enemies, bots that play each W1 level)
docs/        GAME_DESIGN, ROADMAP, LEVEL_BUILDING, CONTROLS, MOVEMENT
```

**Levels are generated.** Edit `tools/levelgen/levels/<level>.py` and run it;
don't hand-edit `levels/w1_*.tscn` / `w2_*.tscn` (changes get overwritten). See
`docs/LEVEL_BUILDING.md` for the kit and the enemy/piece catalogue.

**Performance (target 120 fps).** Static art goes through `MeshPainter` and is
baked once. Animated `_draw()` pieces call `View.redraw(self)` (or
`View.redraw_rect`) from `_process` instead of `queue_redraw()`, so off-screen
pieces cost nothing. Check with `tools/bench.tscn -- --drawcalls`.

## Golden rules

1. **Feel numbers live in `PlayerTuning`**, never as literals in states. New
   mechanic = new `@export` in the right group + use it via `player.tuning`.
2. **One move = one state file** in `player/states/`, extending `PlayerState`,
   plus a same-named child node under `StateMachine` in `player.tscn`.
   Always `return` right after `machine.transition_to()`.
3. **Input only through `player.input`** (PlayerInput). Never call `Input` or
   hardcode keys in gameplay code. New action -> add to `InputRouter.ACTIONS`
   and bind it for all three device kinds.
4. **Cross-system communication goes through `EventBus` signals.** Don't make
   the HUD, camera, audio, or VFX reach into players or each other.
5. **Co-op first.** Every feature must work with 1 and with 4 players. Death in
   co-op = bubble (see `states/bubble.gd`), not instant respawn.
6. Static typing everywhere (`var x: int`, `-> void`), tabs for indentation,
   `snake_case` files, `PascalCase` class_names, `&"StringName"` for state names.
7. Physics/state changes triggered inside physics callbacks (body_entered etc.)
   must be deferred (`set_deferred`, `call_deferred`).
8. All characters, names, and art must be **original**; don't copy Rayman
   assets, characters, or names. Art is procedural (vector shapes + LevelTheme
   palettes), no image files needed.
9. Small, playable steps. Prefer a working simple version Colin can try today
   over a big system he can't test for a week.

## Collision layers

| # | Name     | Who is on it                        |
|---|----------|-------------------------------------|
| 1 | world    | Blocks, level geometry              |
| 2 | players  | Player bodies (0 while bubbled)     |
| 3 | enemies  | Enemy bodies                        |
| 4 | pickups  | Lums and other collectibles         |
| 5 | bubbles  | Player BubbleArea (punch to revive) |
| 6 | triggers | Kill zones, checkpoints             |

Bitmask values: 1, 2, 4, 8, 16, 32. PunchArea mask = enemies+bubbles = 20.

## Definition of done

- `bash tools/check.sh` prints ALL CHECKS PASSED.
- Any new mechanic that affects feel has a test in `tests/run_tests.gd`
  (`func test_<name>()`, use `add_player`, `press`, `frames`, `check`).
- `docs/ROADMAP.md` updated (tick the box, add follow-ups you discovered).
- Tell Colin exactly how to try it: which level, which buttons, what to look for,
  and which tuning values to play with.

## Working with Colin

- When he describes feel ("floatier", "too slippery", "punch feels weak"), map it
  to specific `PlayerTuning` fields, change them, and report `field: old -> new`
  so he can revert. Suggest what to adjust next if it's still off.
- Don't change the design pillars in `docs/GAME_DESIGN.md` without asking him.
- If a request is ambiguous about how something should *feel* or *look*, ask one
  focused question rather than guessing big.

## Gotchas (Godot 4.7)

- Scripts run with `godot -s` compile before autoloads exist. That's why tests
  run as a scene (`tests/test_runner.tscn`). Keep it that way.
- The headless viewport is 1920x1920, so camera framing in tests differs from
  the real 16:9 window. Don't assert on exact camera positions in tests.
- `is_on_floor()` / `is_on_wall()` reflect the previous `move_and_slide()`.
- Don't edit `.godot/` or `*.uid` files by hand; Godot regenerates them.
- Don't `preload()` a scene that preloads you back (player.gd <-> lum.tscn):
  cyclic preloads break instancing silently. Use `load()` at call time.
- Pieces moving riders should be AnimatableBody2D; many small separate bodies
  in a row (e.g. planks) make players snag on the seams - use one body.
