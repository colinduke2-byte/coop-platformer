# Controls

The same list is in the game: **Pause → Controls**, or press **Pause** on the
character select screen. Bindings live in `core/input_router.gd`; the in-game
card is `ui/controls_card.gd`. Keep all three in sync.

## Buttons

| Action | Player 1 keyboard | Player 2 keyboard | Gamepad |
|---|---|---|---|
| Join | Space | Enter | A |
| Move | W A S D | Arrow keys | Left stick / D-pad |
| Jump | Space | Enter | A |
| Punch | Left Shift | Right Shift | X or B |
| Sprint (hold) | Left Ctrl | Right Ctrl | RT / LT / LB |
| Pause | Esc | Backspace | Start |

## Moves

| Move | How |
|---|---|
| Sprint | Hold SPRINT while running, **or** double-tap a direction and keep holding it |
| Hop / big jump | Tap JUMP for a short hop (always the same height), hold JUMP for the full jump |
| Glide | In the air, press JUMP again and hold it. Let go to drop |
| Wall jump | Press JUMP next to a wall, rising or falling. Hold toward the wall to climb it; tap with no direction to zig-zag between two walls |
| Wall run | Sprint into a wall and jump at it |
| Charged punch | Hold PUNCH, let go to throw it (breaks iron crates) |
| Uppercut | UP + PUNCH (in the air it lifts you, once per jump) |
| Ground pound | DOWN + PUNCH in the air. JUMP right after landing = pound jump |
| Crouch / slide | DOWN. While running = belly slide; JUMP out of a slide = long jump |
| Drop through | DOWN + JUMP on a wooden ledge |
| Ledges | Caught automatically. Hold toward to climb up, JUMP to hop up |
| Stomp | Land on enemies. Hold JUMP to bounce higher |
| Revive | Punch a teammate's bubble |
| Swing / zipline / vines | Fly into rings and ziplines; UP grabs vines; JUMP lets go |

## Dev shortcuts

- **F9** on the world map: unlock every level, world and outfit (this session only; F9 again to undo).
- **F3** in a level: debug overlay (states, speeds, timers).
