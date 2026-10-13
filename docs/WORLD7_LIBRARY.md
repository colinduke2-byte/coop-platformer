# World 7 - The Hushed Library ("Echoes")

A moonlit library that remembers everything. (The first plan called for a clockwork reliquary; World 4 is already the
Clockwhirl Works, so the setting became a library - echoes are memories.) The secret Nightmare Nebula is now World 8.

## The spin: echoes
Step on a glowing RECORD pad and your next moves are recorded (a ring over your head shows the time left, 8-14 s). Step on
a STOP pad - usually the square on a plate - and a ghost of your route is left standing where it ended. It:
- counts as one dreamer on pressure plates (a HEAVY plate `required=2` wants echo + you),
- punches punchable things (levers, switches) at the moments you punched,
- with a LOOPING pad repeats the route forever (plates pulse, a timed lever keeps being punched).
One echo per dreamer (4 players = 4 echoes); a new recording replaces the old one; respawning at a checkpoint clears echoes.
Pads on a player's path start a recording by accident, so level layouts keep them off the main route.

## Pieces
| Piece | How it works |
|---|---|
| `RecordPad` | start (default), `stop_only` (stop pad), `loop` (the echo repeats) |
| Echo-aware `PressurePlate` | echoes weigh as a dreamer; `required` makes heavy plates |
| `Gate.need` | AND gate: lamps on top show how many triggers are on |
| `Activation.send` | calls `set_input(from, on)` on targets that have it |

## Levels
1. Inkwell Foyer (echo on a plate, an echo-run bridge platform, a heavy plate) 2. Card Catalog Corridor (AND gate, echo lift)
3. The Reading Room (a looping echo punches a timed lever; shushlings) 4. The Forbidden Stacks (a pulsing plate, timed lever,
candlewicks, book bridge) 5. Belfry of Bookmarks (two echo lifts, three storeys) 6. The Great Library (boss).

Enemies (original): Blotty (spits ink), Wormwick (book armour when shut), Pagebat (dives), Shushling (only creeps while you
stand still), Candlewick (can't be stomped; punch to snuff).
Boss **The Archivist**: a ward nothing penetrates until BOTH seal plates are held at once (an echo on one, you on the other);
then he sinks to the floor for two hits. Pages, floor-shockwaves, and from phase 2 ERASE (he wipes your echoes); phase 3 adds
inkblots and shorter openings (7 / 6 / 4.5 s).

## Phases (all done)
0. Echo prototype + tests (record, replay, plate, lever) 1. Pieces + kit 2. Look + sound 3. Enemies + boss
4. Levels 7-1..7-6 with bots 5. Map, catalog, secret world -> 8, save migration v3 6. Docs, full check, deploy, gallery
