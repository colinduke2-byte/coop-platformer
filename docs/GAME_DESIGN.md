# Game Design — working title: *TBD*

> Colin owns this doc. Claude reads it before building features and asks before
> changing the pillars. Fill in the TODOs over time; defaults are placeholders.

## Pitch
A bright, hand-painted, 1–4 player local co-op platformer on one screen,
where movement feels fluid and floaty-but-precise, levels flow at speed,
and friends save each other constantly. (TODO: Colin, one sentence in your words.)

## Pillars
1. **Movement is the joy.** Running and jumping alone should feel good in an empty room.
2. **Co-op is chaotic and generous.** Nobody waits long; bubbles, revives, drop-in/out.
3. **Flow over punishment.** Frequent checkpoints, fast restarts, collectibles reward mastery.
4. TODO

## Players & characters
- 1–4 players, keyboard (2 layouts) or gamepads, join anytime.
- Characters (original, "goofy dreamers"; see `characters/*.tres`, preview in `characters/character_gallery.tscn`):
  - **P1 Mumbleby**: sleepy wizard, purple robe, bent star hat, big white beard. Casts spells only in his sleep.
  - **P2 Sir Dinkworth**: tiny knight lost inside a huge bucket helm with a red plume. Never sees where he's going.
  - **P3 Tootle**: bard in a green tunic, red beret with a yellow feather, fluttering scarf. Knows one song, about himself.
  - **P4 Gribble**: portly bandit, orange coat, eye mask, pink polka-dot bandana. Steals only things nobody wanted.
  - Glide: each one's headwear twirls like a propeller.
  - Idle quirks (stand still ~2.5 s): Mumbleby snores, Dinkworth wags his plume, Tootle hums, Gribble's eyes dart.
- Do all characters play the same? (Default: yes, cosmetic difference only.)

## Moveset (current)
| Move | Input | Notes |
|---|---|---|
| Run | stick / WASD / arrows | analog speed on sticks |
| Jump | A / Space / Enter | variable height, coyote time, jump buffer, apex hang |
| Glide | `glide_mode` (PlayerTuning, default HOLD_THROUGH) | slow fall, strong air steering. HOLD_THROUGH: keep holding jump past the apex (~0.12 s), or press jump again in the air to (re)start a glide - a tap never glides. SECOND_PRESS: fresh jump press in air + hold. SEPARATE_BUTTON: hold G / Right Ctrl / RB in air. Release ends the glide |
| Wall slide / wall jump | push into wall, jump | |
| Punch | X or B / F / Shift | tap = quick jab (72 px reach); HOLD = charge, release = mega punch (1.6x reach, bigger hitbox, 1.8x knockback, breaks iron crates); pops teammate bubbles |
| Stomp | land on enemy | bounces; hold jump to bounce higher |

World toys: wooden crates (any punch), iron crates (charged punch), updrafts (lift gliders).
Ideas backlog: sprint, swimming, swinging, ground pound, air dash. TODO: pick.

## Co-op rules
- Hit once = bubble. Teammate touches or punches bubble = revived.
- Everyone bubbled = restart at checkpoint. Checkpoint also frees bubbles.
- Fall off-screen behind the group for 1.5 s = bubble.
- Shared Lum counter (TODO: per-player scores? end-of-level ranking?)
- Friendly fire: off. TODO: slap teammates for fun?

## World & levels
- Structure: TODO (hub world with painting-style portals? linear worlds?)
- Level types: TODO (standard, chase/escape, music levels, boss)
- Target level length: TODO (default 3–5 min)

## Collectibles & progression
- Lums (common), TODO: rare collectible per level, unlocks (characters, levels)

## Art & audio direction
- Hand-painted look, layered parallax backgrounds, cutout-animated characters
  (Godot Skeleton2D or Spine). TODO: color palette, mood board links.
- Music: TODO

## Open questions for Colin
- Name of the game and characters?
- Difficulty target: kid-friendly, or tough optional challenges?
- Any online play ever, or strictly couch co-op?
