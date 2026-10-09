# Level Building

Levels are **generated from short Python scripts** in `tools/levelgen/levels/`.
Each script uses the `LevelKit` (`tools/levelgen/kit.py`) to place pieces, then
writes a `.tscn` into `levels/`. You can still open and tweak a generated scene in
the Godot editor. Every piece is `@tool`, so it previews live. But the script is
the source of truth: regenerating it overwrites those manual edits.

```bash
python3 tools/levelgen/levels/w1_3.py      # regenerate one level
bash tools/check.sh                        # always, afterwards
```

## Anatomy of a level script

```python
from kit import LevelKit
from tscn import C

L = LevelKit("MossyHollow", "Mossy Hollow", theme="hollow", horizon=0, scenery="cave",
             backdrop={"light_shafts": True})
L.ambience("fireflies", 1.0, darkness=0.55)     # darkness adds CanvasModulate + player lights

L.land([(-300, 0), (900, 0), (1100, -120), ...])  # the walkable ground profile, filled down to `bottom`
L.sign(80, 0, "Welcome!", 400)
L.enemy("puffcap", 1400, 0, phase=0.3)
L.lums(300, -110, 950, -110, 6)
L.checkpoint(1320, 0)
L.gem(1680, -420); L.secret(1600, -500, 200, 160)
L.snoozling(2300, -250, hanging=True)
L.goal(5200, 0)

L.dress(-250, 5200, "cave", seed=31, skip=[(1400, 2400)])   # scatter scenery on the tops
L.finish(spawn=(0, -2), left=-360, right=5260, bottom=800, kill_y=1100)
L.save(".../levels/w1_3_mossy_hollow.tscn")
```

Coordinates are world pixels. **y grows downward**, so a ledge 300 px above the
ground at y=0 sits at y=-300. Unless a piece's notes say otherwise, the origin
is the top-left corner for boxes, and the bottom (the floor point) for things
that stand on the ground.

After adding a level, register it in `levels/level_catalog.gd`. For World 1,
give it a `world` value, a `map` position and a `music` track.

## Design rules of thumb (learned from the W1 bots)

- Jump reach (full table in `docs/MOVEMENT.md`): a full jump rises about 195 px,
  a running jump clears about 300 px and a sprint jump about 425 px (a glide
  adds far more). Space rocks and islands about 210 px apart for an easy hop.
- Keep landing spots **clear of hazards**: no acorn droppers or stalactites
  directly over where a jump comes down.
- Put a checkpoint every 1000–1500 px and before every new idea.
- Each level carries 3 gems (at least one behind a `secret`), 1 Snoozling cage,
  and 80–150 Lums.
- Teach, test, twist: introduce a piece safely, then over a pit, then combine it.
- Every W1 level has a **bot test** in `tests/run_tests.gd` that runs it
  start-to-goal. If you move something, run the bot (`-- only=w1_3`).
- **Signs place themselves.** `sign(x, y, text)` is a wish: `finish()` slides the
  board up to ±700 px (and rewraps the text) until it stands on ground, clear of
  terrain, checkpoints, the goal, water, hazards, props and Lum trails. It prints
  `note: no clear spot` if it can't; move the sign by hand then.
- **Explain each enemy or obstacle once.** A sign teaches something the first time it
  appears in play order (1-1 to 4-6; each bonus level counts on its own). Later levels
  just use it - no repeat tips. Level-title signs and secret hints are fine.
- **One ground piece per stretch.** Two `land()` pieces meeting at the same point
  leave a seam players snag on; the kit warns about it. Merge them into one profile.
- **Exactly one goal** per level.
- **Audit:** `godot --headless --path . res://tools/level_audit.tscn [-- --level=res://levels/x.tscn]`
  flags signs cut by terrain / floating / covering things, buried Lums, gems,
  cages and enemies, floating checkpoints and goal count. The test suite runs it
  on every level (`test_every_level_passes_the_layout_audit`).

## Kit reference

### Ground and shape
| Call | What |
|---|---|
| `land(profile, bottom=1400)` | Terrain filled from a polyline of `(x, y)` down to `bottom`. Main ground. |
| `ceiling(profile, top=-2600)` | Same, filled upward (cave roofs). |
| `terrain(points, rounding=14, lip=True)` | Any closed polygon (rocks, overhangs). Grass lip on up-facing edges. |
| `island(x0, x1, y, depth, bumps, seed)` | Floating earth island with a rounded belly. |
| `tree_platform(x0, x1, y, trunk_x, ...)` | Canopy deck on a trunk. |
| `block(x, y, w, h, one_way, slippery, conveyor)` / `ground(...)` / `wall(x, top, bottom)` / `ledge(x, y, w)` | Box geometry. `ledge` = one-way wooden plank. |
| `slope(x, bottom, w, h, rising_right)` | Ramp (at most 45°). |
| `backwall(x, y, w, h, shade)` | Dark scenery wall behind the action (tower interiors). |
| `surface_y(x)` | Height of the ground at x (for placing things on hills). |

### Traversal toys
`pad` (bounce mushroom) · `ring` (swing ring) · `moving(..., waypoints, rider=True)` ·
`crumble` · `wheel` (ferris platforms) · `water(current=)` · `vine` · `net` ·
`cannon(rotation, auto, sweep)` · `wind` · `updraft` · `bumper` · `zipline` ·
`balloon` · `door` + `link_doors` · `dandelion` (parachute) · `geyser` ·
`seesaw` · `bridge(x, y, ex, ey, broken=())` (sagging rope bridge) ·
`snowpile(x, y, max_radius=)` (punch it: a growing snowball rolls out) · `gondola(x, y, waypoints, rider=True)` (ski-lift chair) ·
`bell(x, y, duration=10)` (Dream Bell: touch or punch it for a Lum Rush, when every Lum counts double; put one just before a long Lum trail) ·
`pendulum(rope, width, spiked=False)` · `leaf` (sinks under you) · `raft`
(drifts on water with the current; `travel=0, current=0` = a floating stepping stone) ·
`liana(x, y, length, sway, phase)` (jungle vine hanging from x, y: jump into its lower half and swing;
bots chain them up to ~480 px apart) · `waterfall(x, y, w, h)` (scenery curtain) ·
`beat(x, y, w, h, group, beat)` (tick-tock block: group 0 pink / 1 blue take turns being solid every
`beat` s (1.6); they blink 0.4 s before a swap and never turn solid inside a player. Bots: 150 px up /
200 px across per step, or a flat row 240 px apart).
`bubbles(x, y, w, h, rise)` (bubble column: swimmers inside get lifted `rise` px/s - put one in a
sea-well to carry players up to a ledge) · `clam(x, y, open_time, closed_time, phase, height)` (giant clam:
a bounce pad that only launches while open; `height=640` reaches a ledge 540 up) ·
`tide(x, y, w, h, amplitude, period)` (water whose surface rises and falls; `y` is high tide - keep low
tide within ~70 px of anything swimmers must climb out onto) · `kelp(x, top, length)` (= `vine`; climb to
the top, then jump: a ledge ~110 px below the kelp's top is reachable).
Water rule: a swimmer can leap out onto a bank at most ~70 px above the surface.

### Hazards
`spikes` · `pop_spikes` · `spikeball` · `saw` · `crusher` · `flame(steam=)` ·
`stalactite` · `lava` (rising, chase) · `brambles(x, y, w, h)` (thorn tangle) ·
`acorns(x, y, interval)` (acorn dropper) · `pit_kill(x0, x1, y)` ·
`avalanche(x, y, distance, speed, height, depth)` (chase; start it with a `zone`, it
rubber-bands to stay on screen and restarts behind mid-chase checkpoints).
`snaptrap(x, y)` (flytrap: snaps shut 0.45 s after someone steps in - run across or jump).
`zap(x, y, ex, ey, on, off, phase)` (electric arc between two posts: flickers for 0.5 s, then zaps for
`on` s; hurts within 26 px of the line).
Icy ground: `terrain(..., slippery=True)` or `block(..., slippery=True)`.

### Logic
`gate` · `switch(targets)` · `plate(targets, required)` ·
`zone(targets, everyone, send_on)` · `arena(x, y, targets, enemies)` (DefeatTrigger:
opens the targets when its enemies die) · `spawner` · `key` + `key_door`.

### Pickups and progress
`lum` · `lums(x, y, ex, ey, count, arc)` · `lum_block` · `crate(iron=)` ·
`breakable` · `secret` · `gem` (3 per level) · `snoozling(hanging=, fur=)` ·
`checkpoint` · `goal` · `sign(text, arrow=)` · `pedestal(character)`.

### Looks
| Call | What |
|---|---|
| `LevelKit(..., theme=, scenery=, horizon=, backdrop={})` | Palette (`world/themes/*.tres`) + parallax scenery. |
| scenery | `hills`, `forest`, `cave`, `canopy`, `river`, `castle`, `candy`, `ice`, `jungle`, `ruins`, `factory`, `ocean`, `deep`, `nebula` |
| `ambience(kind, density, darkness, tint)` | `pollen`, `leaves`, `fireflies`, `spores`, `petals`, `embers`, `snow`, `rain`, `bubbles`, `stars` |
| `glow(x, y, color, radius)` | Soft light (for dark levels). |
| `deco(kind, x, y, size, front)` | grass, flowers, bush, tree, pine, mushrooms, rock, fence, crystals, candy_cane, lollipop, reeds, fern, log, stump, giant_mushroom, hanging_vines, lilypads, big_flower, roots, hut, lantern, snowman, icicles (on a ceiling), igloo, skis, palm, big_leaf, totem, bromeliad, gear, pipes, clock, toyblocks, coral, seaweed, shell, anchor, starfish, chest |
| `dress(x0, x1, style, spacing, seed, skip)` | Scatter deco along the ground tops. Styles: meadow, forest, cave, river, thorn, snow, icecave, jungle, ruins, swamp, factory, beach, reef, wreck, dream |
| `extra(path, **props)` | Any other scene or script (e.g. `world/waterfall.gd`). |

## Enemy catalogue (`L.enemy(kind, x, y, facing=-1, **props)`)

| kind | Name | How it behaves / how to beat it |
|---|---|---|
| `grunt` | Grumblet | Patrols, "!" hop, short charge. Stomp, punch or slide. The basic enemy. |
| `flapjack` | Flapjack | Flying pancake: hover / patrol / swoop. |
| `spitpod` | Spitpod | Rooted, spits seeds. Punch the seed back. `lob` arcs them. |
| `shieldbug` | Shieldbug | Front shield: hit from behind, stomp, or use a charged punch. |
| `spikeroo` | Spikeroo | Spiky back, so don't stomp. Punch or slide. |
| `bonkhorn` | Bonkhorn | Charges. Dizzy after it hits a wall. |
| `boingo` | Boingo | Balloon fish: a huge bounce, then it regrows. |
| `shellbert` | Shellbert | Snail. Hit it and it hides; kick the shell and it bowls through enemies. |
| `bumblebonk` | Bumblebonk | Bee flying a figure-eight. Shivers (the tell), then dashes. |
| `diggle` | Diggle | Mole: pops up, lobs dirt, ducks. Hit it while it's up. |
| `ribbiton` | Ribbiton | Frog that hops at you. A stomp launches you high (living trampoline). Punch twice. |
| `prickleroll` | Prickleroll | Hedgehog. Curls and rolls, so jump it. Dizzy after a wall. |
| `puffcap` | Puffcap | Mushroom spore ring on a timer. Use `phase` to ripple a row. |
| `wispet` | Wispet | Ghost that moves only while your back is turned. Face it, then punch. |
| `slidgewick` | Slidgewick | Penguin: flaps (tell), then toboggans at you. Stomp stops it; a front punch clanks. |
| `snowl` | Snowl | Snowy owl gliding overhead; drops snowballs on anyone below (punch them back). |
| `yetling` | Yetling | Little yeti lobbing snowballs in arcs; keeps its distance; 2 hits. |
| `grumblefrost` | Grumblefrost | World 2 boss: boulders (punch them back to knock him down), belly-slide charge, bellow + icicle rain, leap slam. |
| `cocobonk` | Cocobonk | Monkey on a ledge lobbing coconuts (raises it overhead first; punch them back); 2 hits. |
| `swoopbeak` | Swoopbeak | Toucan flapping overhead; squawks (tell), dives at you, flaps back. Stomp or punch. |
| `nibblefin` | Nibblefin | Piranha: place on the water surface; bubbles (tell), then leaps `leap_height` out. `phase` desyncs. |
| `chamelia` | Chamelia | World 3 boss: tongue lash (sticks in a wall = stompable), invisible sneak (phase 2+), leap + seed fan (phase 3). |
| `windup` | Windup | Wind-up tin soldier patrolling. First hit knocks its key off and it races about at double speed; 2 hits. |
| `sparkbot` | Sparkbot | Electric drone flying along `travel` (`speed`, `phase`). Don't stomp it (zap!) - punch it. |
| `springbot` | Springbot | Coiled robot: crouches (tell), then hops at you (`hop_height`). Stomp or punch. |
| `cuckoolossus` | Cuckoolossus | World 4 boss: chime + pendulum sweep (jump), brass gears, cuckoo lunge (sticks in the floor = stomp/punch the bird; phase 3 twice + gear rain). |
| `pufferfin` | Pufferfin | Fish swimming along `travel`; every `puff_every` s it puffs into a spiky ball (can't stomp, punches bounce off). Pop it while it's small. |
| `crabbit` | Crabbit | Crab patrolling sideways; the claw blocks punches from the front. Stomp it or hit it from behind. |
| `jellybob` | Jellybob | Bobbing jellyfish (`bob`, `phase`). Its top is a trampoline (bounce ~350 px); the tendrils sting from the side or below. |
| `eelectra` | Eelectra | Eel in a hole: crackles (tell), lunges `reach` px out toward you, slides back. Only hittable while out. Place it at the hole's mouth facing the open side. |
| `anglerling` | Anglerling | Deep-sea fish with a real light on its lure; drifts toward anyone within `sight`. Stomp or punch. Great in dark levels. |
| `inkabella` | Inkabella | World 5 boss: tentacle slam (shadow tell; sticks in the floor = stomp/punch the tip), ink blobs (punch them back), phase 3 double slams and floods `flood` (a Water NodePath). |
| `king_grumblo` | King Grumblo | Boss (bonus levels): slam shockwaves. |
| `baron_bristleback` | Baron Bristleback | World 1 boss. Rolls (bounces off walls, count = phase), quill volley, leap slam, acorn rain. Stomp him while he's DAZED. |

Bosses go inside `arena(...)` with `{"asleep": True}` and are woken by a
`zone(..., everyone=True)`. The HUD boss bar and music come from
`EventBus.boss_changed`.

## Checking a level visually

```bash
# screenshot of any scene (run under xvfb with --rendering-driver opengl3)
godot --path . res://tools/scene_shot.tscn -- --scene=res://levels/w1_3_mossy_hollow.tscn --players=2 --wait=2 --out=/tmp/x.png
# draw calls at a camera x, and which nodes cost the most
godot --path . res://tools/bench.tscn -- --level=res://levels/w1_3_mossy_hollow.tscn --drawcalls --x=2400
godot --path . res://tools/bench.tscn -- --level=res://levels/w1_3_mossy_hollow.tscn --blame --x=2400
```

Performance budget: keep the draw calls on screen under about 600. Static art
bakes into one mesh through `MeshPainter`. Animated pieces call
`View.redraw(self)`, so they only redraw while the camera can see them.


## World 6 kit (gravity flips)
Levels are a corridor: walkable floor (y = 0) and ceiling (underside y = -540, `carnival.H`). `from carnival import corridor`.
- `L.ceiling_land(profile, top)` / `L.ceiling_block(x, y_under, w, h, conveyor=)`: ground hanging from above (mirrored, lip underneath)
- Switches: `L.flip_lever(x, y, ceiling=)` (punch), `L.flip_pad(x, y, ceiling=)` (plate), `L.flip_bumper(x, y)`, `L.flip_gate(x, y, "up"|"down", height=)` (sets gravity)
- `L.kill_top(x0, x1, y)` and `L.finish(..., top=, kill_top=)` for falling UP; `L.wheel(..., solid=True)` for standable-from-both-sides platforms
- `L.deco(kind, x, y, mirror=True)`, `L.dress(x0, x1, "carnival", ceiling=True)`, `L.snoozling(..., ceiling=True)`, `L.switch(..., ceiling=True)`
- Enemies start on the FLOOR (they fall with gravity); `balloonatic` / `marionette` don't care. Gems on the ceiling go at `y = -H + 45` (walk) or hang from `ceiling_block`s (land on them by flipping beside them)
- Bots: `_pull(p, lever_x)`, `_walk_to(p, x)` in tests/run_tests.gd are flip-aware
