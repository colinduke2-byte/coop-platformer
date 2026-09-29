# CLAUDE.md — Co-op Platformer

Local co-op (1–4 players, one screen) 2D platformer with Rayman Legends-style
feel, built in **Godot 4.6+ / GDScript**. Colin is the designer and director;
you are the engineer. Runs on his Windows PC and M-series MacBook.

Read `docs/GAME_DESIGN.md` (what the game is) and `docs/ROADMAP.md` (what's next)
before starting any feature.

## Commands

- Verify everything: `bash tools/check.sh` (import + boot main scene + tests).
  Needs `GODOT` env var if Godot isn't on PATH (see top of the script).
- Tests only: `$GODOT --headless --path . res://tests/test_runner.tscn`
- Play: open the folder in the Godot editor and press F5, or `$GODOT --path .`.
  F5 = character select -> demo level. `levels/test_level.tscn` still works via F6.

You cannot see or play the game. `tools/check.sh` and the tests are your eyes:
**run the check after every change and don't report a task done until it passes.**

## Architecture

```
core/        Autoloads: EventBus (global signals), InputRouter (devices -> slots),
             GameManager (join, checkpoints, lums, bubble/respawn rules)
player/      player.gd (body + shared helpers), player.tscn,
             state_machine.gd, states/*.gd (one move per file),
             player_input.gd (per-slot input view),
             tuning/player_tuning.gd + player_default.tres (ALL feel numbers)
characters/  CharacterDef (.tres per character: colours, proportions, headwear),
             CharacterRig (builds + animates the vector cutout), character_gallery.tscn
camera/      coop_camera.gd — frames all living players, zooms, bubbles stragglers
world/       block (grey-box geometry, @tool), kill_zone, checkpoint, wardrobe_pedestal,
             crate (punchable; AnimatableBody2D so areas detect it), updraft (lifts gliders)
enemies/     grunt (patrol; punch or stomp to defeat)
collectibles/lum
levels/      level.gd (every level root), test_level.tscn (template)
ui/          hud, character_select (lobby: join, pick, ready -> next_scene)
tests/       run_tests.gd + test_runner.tscn + test_arena.tscn
docs/        GAME_DESIGN.md, ROADMAP.md
```

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
8. Keep grey-box placeholder visuals until Colin starts the art pass. All
   characters, names, and art must be **original**; don't copy Rayman assets,
   characters, or names.
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

## Gotchas (Godot 4.6)

- Scripts run with `godot -s` compile before autoloads exist. That's why tests
  run as a scene (`tests/test_runner.tscn`). Keep it that way.
- The headless viewport is 1920x1920, so camera framing in tests differs from
  the real 16:9 window. Don't assert on exact camera positions in tests.
- `is_on_floor()` / `is_on_wall()` reflect the previous `move_and_slide()`.
- Don't edit `.godot/` or `*.uid` files by hand; Godot regenerates them.
