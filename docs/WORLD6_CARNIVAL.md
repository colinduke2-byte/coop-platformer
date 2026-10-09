# World 6 - the Midnight Carnival ("Topsy-Turvy Fair")

A moonlit fairground of tents, rides and fairy lights where everything is upside-down.
Spin: **gravity flips**, always triggered by a PHYSICAL switch in the level (never a
controller button). The secret Nightmare Nebula moves to World 7.

## Switches (all physical)
| Piece | How it works |
|---|---|
| Flip lever | Punch (or stomp) it: gravity toggles. Cranks over, shows the current arrow. |
| Flip pad | Pressure plate: stepping on toggles; re-arms when you step off. |
| Bumper | Pinball bumper: bounce off it and gravity flips (timed puzzles). |
| Gravity gate | Glowing arch: walk through and gravity is set to a fixed direction. |

Rules: flips are GLOBAL (players + enemies); ~0.6 s switch cooldown; ~0.2 s weightless float
on a flip (no cheap deaths); jump height / speed identical both ways; falling off the top or
bottom kills; no water in this world; the camera stays upright.

## Levels
1. Ticket Booth Promenade (intro, one lever) 2. Carousel Crossing 3. Hall of Mirrors (floor
route + ceiling route, co-op) 4. Rollercoaster Ruckus (gravity gates timed to loops)
5. Ferris Wheel Heights (vertical, wheel carries switches) 6. Big Top (boss: Madame
Topsy-Turvy slams the arena's own switches).

Enemies (original): Jack-in-the-bonk (spring box), Unicyclops (rides the "down" surface),
Popcorn pufflet (pop projectiles), Balloonatic (drifts against gravity), Marionette (hangs
on strings, swings).

## Phases (each ends: full check green, screenshots/gallery sent)
1. Gravity foundation + lever prototype (level gravity, player up-direction, mirrored rig,
   all move states gravity-relative, enemies/projectiles/pads/kill zones both ways; mirrored
   movement tests prove parity)
2. Switch pieces + level-kit commands (lever, pad, bumper, gate; ceiling-terrain helpers;
   online relay)
3. Carnival look + sound (backdrop, themes, music, map)
4. Enemies + boss
5. Levels 6-1..6-5 with bots; level audit checks both gravity directions
6. Boss level, secret world -> World 7, save data, docs, deploy
