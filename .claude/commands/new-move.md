---
description: Add a new player move/ability as its own state
argument-hint: <describe the move and how it should feel>
---
Add this player move: $ARGUMENTS

Follow CLAUDE.md. Steps:
1. If how it should *feel* or which button triggers it is unclear, ask me one
   focused question first.
2. Add its feel numbers as a new `@export_group` in `player/tuning/player_tuning.gd`.
3. Create `player/states/<move>.gd` extending `PlayerState`; add the node to
   `StateMachine` in `player/player.tscn`; add transitions in the states that
   should lead into and out of it.
4. Add a placeholder visual hook on `Player` (like `set_glide_visual`).
5. Write at least one test in `tests/run_tests.gd` proving the core behavior.
6. Run `bash tools/check.sh` until it passes, update `docs/ROADMAP.md`, and tell
   me how to try it and which tuning values to play with.
