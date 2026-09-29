---
description: Adjust game feel from a plain-English description
argument-hint: <what feels off, e.g. "jump is too floaty">
---
Playtest feedback: $ARGUMENTS

Map this to specific fields in `player/tuning/player_default.tres` (defaults
live in `player_tuning.gd`; put overrides in the .tres). Make a moderate change
(roughly 10–25%) rather than a huge one. Then:
- Run `bash tools/check.sh`; if a feel test's expectation legitimately changed,
  update it and say so.
- Report a table: field | old | new | what it changes.
- Suggest the next knob to try if it's still not right.
