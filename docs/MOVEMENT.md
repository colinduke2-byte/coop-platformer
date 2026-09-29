# Movement reference (generated)

Measured by `tools/measure_moves.tscn` from `player/tuning/player_default.tres`.
Re-run after changing tuning: `godot --headless --path . res://tools/measure_moves.tscn`.
Use these when building levels: gaps a bit *under* a number are fair, gaps over it
need a helper (pad, updraft, swing, wall, glide).

| Move | Result |
|---|---|
| Tap jump height | 45 px |
| Full jump height (hold) | 195 px |
| Running jump distance (hold) | 301 px |
| Sprinting jump distance (hold) | 427 px |
| Long jump distance (slide + jump) | 366 px |
| Running jump + glide distance (same height) | 776 px |
| Glide: horizontal distance per 100 px of drop | 345 px |
| Ground-pound jump height | 303 px |
| Air uppercut extra height (at the apex) | 53 px |
| Wall jump: height gained per kick (2 walls 160 px apart) | 146 px |
| Wall run height (sprint into a wall) | 144 px |
| Stomp bounce height (tap / hold jump) | 96 / 187 px |
| Run speed / sprint speed | 430 / 610 px/s |
| Fall speed / fast fall / glide fall | 1150 / 1500 / 110 px/s |
| Ledge grab window (above feet) | 34 - 80 px |
| Corner correction / ledge bump | 16 / 16 px |
| Crouch height (fits gaps taller than) | 34 px |
| BouncePad default (plain / hold / pound) | 420 / 546 / 714 px |

Rules of thumb: a single-block step (full jump) should be at most ~80% of the full
jump height; must-make gaps ~80% of the running jump; secrets can ask for the max.
