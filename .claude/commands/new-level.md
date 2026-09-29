---
description: Build a new grey-box level
argument-hint: <theme, length, which mechanics it teaches>
---
Build a new level: $ARGUMENTS

Copy the structure of `levels/test_level.tscn` (root with `level.gd`,
SpawnPoint, Players, CoopCamera with limits, KillZone, HUD, Background).
Use `world/block.tscn` for geometry (origin = top-left; `one_way` for ledges).
Check reachability with the tuning numbers: full jump height is
`jump_height`, horizontal jump distance is about
`max_run_speed * (jump_time_to_peak + jump_time_to_fall)`, and glide gaps need
a height drop. Introduce each mechanic safely first, then test it, then
combine it. Include a checkpoint every 30–60 seconds of play and Lum trails
that hint at the route. Write the level as a short ASCII sketch plus a list of
beats in your summary. Run `bash tools/check.sh`.
