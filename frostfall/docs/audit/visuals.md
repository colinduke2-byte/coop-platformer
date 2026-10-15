# Frostfall audit: visuals, animation and effects (VX)

Reviewer area: pixel scale and palette consistency, animation coverage, hit and spell VFX, tiles per region, lighting/day-night/weather, region identity, clutter in big fights, title/intro/ending.

**Method.** I read GUIDE, CHANGELOG, NATIVE_PIXELS_AUDIT and RUN_AND_UI_IMPROVEMENTS, then the art code (`src/art/sprites.js`, `anim.js`, `fx.js`, `snow.js`, `native*.js`, `native/*`), lighting/ambient (`src/world/lighting.js`, `ambient.js`), and how enemies are drawn (`src/entities/Enemy.js`, `Boss.js`, `PatternBoss.js`, `Grimfang.js`). I took 50 screenshots with `test/harness.mjs` (scratch scripts in the session scratchpad; nothing in the repo changed). Every screenshot is in `test/out/vx_*.png`.
**Caveat:** the harness forces `renderer=canvas`, and Phaser's Canvas renderer ignores tints. Two shots (`vx_gl_*`) use WebGL to show what tinted creatures really look like. VX-03 is about exactly this difference.

---

## Fixes and polish (ranked)

### VX-01 Snow-backed object tiles show up as white squares in every snowless region
- **What's wrong:** the game draws a single tile layer (`GameScene.js:117-119`), so scenery tiles carry their own ground. In `drawTile` (`src/art/sprites.js`), PINE, ROCK, STUMP, DEADTREE, BOULDER, FENCE, GRAVE, TUFT and FROSTBLOOM are drawn over `snow()`, and PILLAR, BRAZIER and SARCO over the slate `cfloor()`.
  - The regions place these tiles anyway. ROCK is the cliff and pillar tile in regions2/3. Stumps, dead trees and pines come from worldgen, landmarks and hubs.
  - Result: pale snow squares around stumps and dead trees in the Ashen Peaks and the Old Kingdom, pines in white boxes across the green Glasswood, and blue slate squares under the braziers on Greenhollow's and Amberwell's roads.
  - The left border of the Ashen Peaks, Coast, Kingdom, Fens, Highlands, Glasswood, Underdeep and Lanternfall uses the same snowy ROCK wall.
  - Emberhold's and the hubs' roofs are the snowy ROOF tile.
- **Why it matters:** this is the most visible artifact in the game. Every region past the first looks pasted together, and it undercuts each region's identity.
- **Change:** draw props with a transparent background and composite them at `buildTiles` time onto each region's ground. That gives per-region variants: ROCK_ASH, PINE_GLASS, BRAZIER_SAND and so on, chosen from the region def (`ground`) when the grid is built. The other way is a second, sparse "deco" tile layer over the ground layer. Each region needs its own roof (slate for Emberhold, thatch for Greenhollow, sandstone for Amberwell).
- **Screenshots:** `test/out/vx_map_ashen.png`, `vx_map_kingdom.png`, `vx_more_kingdom_23.png`, `vx_map_glasswood.png`, `vx_more_glasswood_23.png`, `vx_map_greenhollow.png`, `vx_map_amberwell.png`, `vx_map_emberhold.png`, `vx_more_lanternfall_12.png`.
- **Impact:** H. **Effort:** M.
- **Files:** `src/art/sprites.js` (drawTile, buildTiles), `src/config.js` (TILE, TILE_COUNT, SOLID_TILES), `src/world/regions2.js`/`regions3.js`/`regions4.js`, `worldgen.js`, `landmarks.js`, `src/data/hubs*.js`, `emberhold_map.js`. art_baseline will need a refresh.

### VX-02 The first three bosses are still stretched sprites (2x, 1.9x, 3x)
- **What's wrong:** these are the bosses a new player meets first, and they are still stretched 16px sprites:
  - **Jarl Valdrek** (`Boss.js:23` `setScale(2)`, kind `boss`).
  - **Grimfang** (`Grimfang.js:20` `setScale(1.9)`).
  - **the Rime Wyrm** (`RimeWyrm.js:7` `scale: 3`, sheet `spr_wyrm` with three side frames and no attack, hurt or death pose).
  - None of the three is registered in `native_registry`. I confirmed this in-page: scaleX 2 / 1.9 / 3, native false.
  - NATIVE_PIXELS_AUDIT.md says Grimfang and the Wyrm are "at scale 1" and lists `boss` under "stay 16". Both claims are wrong.
- **Why it matters:** the Wyrm shows 3x3 blocks right before the player sees the clean native Tidemother and Hrolf. Grimfang's 1.9 scale gives uneven pixel columns. Chapter 1's climax is the worst-looking boss in the game.
- **Change:** register native art for all three.
  - Jarl: humanoid boss_kit, 32px, 24 frames.
  - Rime Wyrm: bespoke 48px serpent with coil, breath, hurt and death frames, like `special.js` does for the Tidemother.
  - Grimfang: a 30px native wolf with clips.
  - Then correct the audit doc.
- **Screenshots:** `vx_boss_crypt_fight.png`, `vx_boss_maw_fight.png`, `vx_boss_pass_fight.png`. Compare `vx_boss_keep_fight.png` and `vx_boss_chapel_fight.png`.
- **Impact:** H. **Effort:** M. **DESIGN** (new boss looks).
- **Files:** `src/art/native/bosses_*.js`, `special.js`, `animals.js`, `Boss.js`, `Grimfang.js`, `RimeWyrm.js`, `test/stage66_native.mjs`.

### VX-03 Tints carry key visuals, and the Canvas renderer drops all of them
- **What's wrong:** a lot of the game's visual meaning rides on `setTint`/`setTintFill`, and Phaser's Canvas renderer ignores tints:
  - the hit flash (`Enemy.finish` `setTintFill(0xffffff)`);
  - the windup warning blink (`0xff8080`) and the slowed tint;
  - every boss danger disc and ring (`disc`/`ring`.setTint(C[11]) in `Boss.js`, `PatternBoss.js`, `Grimfang.js`);
  - all spell rings (`playerMagic.js` passes hex tints to `fx.ring`);
  - every tinted creature variant: Ash, Bog and Frost variants, Jackal, Thunderbird, Crystal Golem, Glass Stag, Lodeling, Gloomcap, Glimmerkin, Glass Prism, Rime Reaver and Rime Knight.
  - `main.js` uses `Phaser.AUTO`, so a machine without WebGL (a case the changelog optimises for) gets Canvas. There, telegraphs are white, hits don't flash, and the variants look like their base creature (compare `vx_lineup_a.png` with `vx_gl_tints.png`).
  - Even under WebGL, multiply-tinting produces off-palette, muddy colours. The olive Thunderbird in `vx_gl_tints.png` is one. That breaks the rule in `config.js` that every pixel comes from the palette.
- **Why it matters:** missing telegraphs and hit feedback are gameplay-readability bugs, not just cosmetics.
- **Change:**
  - Bake variants at build time with a palette remap (a `remap: {from: to}` per variant, applied to the 16px or native sheet).
  - Ship pre-coloured `ring_red`/`disc_red`/`ring_cyan` textures.
  - Do the hit flash with a white-silhouette sheet (one extra canvas per texture, built lazily).
  - Keep tint only as a WebGL extra.
- **Impact:** H. **Effort:** M.
- **Files:** `src/entities/Enemy.js` (finish), `src/data/enemies.js`/`enemies4.js` (tint -> remap), `src/art/sprites.js` (buildFx), `src/art/fx.js` (ring), `Boss.js`, `PatternBoss.js`, `Grimfang.js`, `playerMagic.js`.

### VX-04 Seven creature sheets have hurt and death frames that are never shown
- **What's wrong:** `animalSheet` builds side0-2 + hurt0 + death0 for `spr_werewolf`, `spr_ashhound`, `spr_leech`, `spr_spider`, `spr_slime`, `spr_crab` and `spr_barnacle`. None of them is in `ANIM_CLIPS` (`src/art/anim.js`), so `Enemy.finish` falls into the sideOnly branch. That branch shows only side0/side1, a 2-frame shuffle with no hurt pose, and on death the sprite is rotated 90 degrees.
  - Affected creatures: Werewolf, Ash Hound, Fen Leech, Cave Weaver, Thornling and Scorpion (spr_spider), Slimeling, Wreck Crab, Lodeling, Frost Barnacle.
  - Related gaps:
    - Clips are looked up by `cfg.tex`, not by native key. The native newfauna creatures (Meadow Hornet, Dew Sprite, Dust Devil on `spr_wisp`; Sand Burrower on `spr_worm`; Blightbloom on `spr_shroom`; Thornling and Scorpion on `spr_spider`) also have hurt0 and death0 frames that are never shown.
    - `make(..., ['side'])` sheets (wisp, worm, mimic, shroom, wyrm) have no hurt or death frame.
    - The native wyvern/thunderbird sheet (`native/animals.js:82`) has side0-2 only.
- **Why it matters:** these creatures read as stiff next to the wolves and bears, which react to every hit.
- **Change:**
  - Add the seven keys to `ANIM_CLIPS` (one line each).
  - Look clips up by `texKey` as well, so `nat_*` sheets get the animal clip. Check that the frame exists first, because the 16px `spr_wisp` has no hurt0.
  - Add jolt/flip hurt and death frames to the `make(['side'])` sheets and the native wyvern sheet, the same way `animalSheet` does.
- **Impact:** H. **Effort:** S.
- **Files:** `src/art/anim.js`, `src/art/sprites.js`, `src/art/native/animals.js`, `test/art_baseline.mjs` baseline.

### VX-05 Big fights bury the action under numbers, labels and bars
- **What's wrong:** each hit spawns a floating number plus a WEAK, RESIST or ARMORED label at nearly the same offset (`Enemy.takeHit`: y-21 and y-22, plus y-24 for STAGGERED). Every damaged enemy also gets an HP bar.
  - With ten foes and one Ember Nova, labels and numbers pile into unreadable stacks over the sprites.
  - The tutorial hint plate sits across the upper middle of the screen during combat.
- **Why it matters:** you can't see the telegraphs you're told to roll through.
- **Change:**
  - Merge hits on the same target within ~0.3 s into one rising number.
  - Fold WEAK and RESIST into the number (colour, or a `!`/`-` suffix) instead of a second text.
  - Cap concurrent combat texts at ~12.
  - Show enemy bars only for the locked or last-hit target, plus anything hit in the last 2 s.
  - Dock tutorial hints at the bottom during combat.
- **Screenshots:** `vx_fx_nova.png`, `vx_fx_embernova.png`, `vx_fx_melee.png`.
- **Impact:** H. **Effort:** S-M.
- **Files:** `src/art/fx.js` (text), `src/entities/Enemy.js` (takeHit, target bar), `src/scenes/HudScene.js` (hint).

### VX-06 Status effects are invisible on enemies
- **What's wrong:** burn, poison, bleed, chill stacks, shock and root on an enemy show only a small coloured tick number and a 0.05 s flash (`Enemy.statusHit`). Frozen enemies only freeze in their hurt pose (`Enemy.js:185`). There are no flames, drips, frost crust or crackle.
- **Why it matters:** the guide sells elements and the chill-to-freeze build, but the player can't see whether a burn took or how close a foe is to freezing.
- **Change:**
  - Add a low-rate status emitter per enemy: 1-2 `p12`/`p11` pixels rising for burn, `p8` drips for poison, `p11` for bleed, `p15` flecks for chill, 1 px `p13` arcs for shock.
  - Use a pale palette-remapped sheet (VX-03) plus a 2 px ice outline for frozen.
  - Add a pip row (1-3 dots) for chill stacks under the target bar.
- **Impact:** H. **Effort:** M.
- **Files:** `src/systems/status.js`, `src/entities/Enemy.js`, `src/art/fx.js`.

### VX-07 Ground tiles repeat pixel-for-pixel and draw their own grid lines
- **What's wrong:** `speckle()` is seeded by tile id, so every SAND, MEADOW or PATH tile is identical.
  - Several ground tiles paint a 1 px dark edge row: MEADOW `o(7,0,15,16,1)`, MOSS, PATH, ASH, SHINGLE, DUNE.
  - PATH2 has a full-width line at y 7 and a full-height line at x 6.
  - On screen these form horizontal stripes every 16 px across the Vale's fields and a repeating "+" grid on every road.
- **Why it matters:** large areas read as wallpaper, and regions with only 2-3 ground tiles look repetitive (Sunscorch, Fens, Underdeep).
- **Change:**
  - Remove the edge rows from ground tiles (keep them only on walls and paving).
  - Randomly set `tile.flipX`/`flipY` per ground cell when the layer is created, using a hash of x,y. This costs nothing at runtime.
  - Add one or two more speckle seeds per region ground.
- **Screenshots:** `vx_map_vale.png`, `vx_map_greenhollow.png`, `vx_map_forest.png`, `vx_village.png`, `vx_map_fens.png`.
- **Impact:** M-H. **Effort:** S.
- **Files:** `src/art/sprites.js` (drawTile), `src/scenes/GameScene.js` (layer creation), `src/config.js` if new tiles are added.

### VX-08 Every hit sparks gold and cyan, whatever the element
- **What's wrong:** `Enemy.takeHit` calls `fx.spark(..., em >= 1.2 ? 12 : 13)`, so a fire, frost, shock or poison hit, an arrow and a sword all throw the same gold-and-cyan sparks. Only the damage-number colour differs.
- **Why it matters:** magic should feel distinct at the moment of impact. Right now an element only shows in the projectile.
- **Change:**
  - Pick the spark palette from `info.element`/`info.src`: fire 12/11/13, frost 15/6 plus short shards, shock 13/6 plus a 1-frame fork, poison 8/7.
  - Give heavy and crit hits a 1-frame 3x3 white "pop" at the contact point.
- **Impact:** M. **Effort:** S.
- **Files:** `src/entities/Enemy.js`, `src/art/fx.js` (spark).

### VX-09 Frost and white effects disappear against snow
- **What's wrong:** the ring textures are pure white (colour 6) with no edge. On the main backgrounds (colours 5 and 6) the Frost Nova ring, Ward ring, frost bolt and Glacier Spear trail barely show. Under Canvas (VX-03) every ring is white.
- **Why it matters:** the frost spells are the weakest-reading spells, in a game that is mostly snow.
- **Change:**
  - Draw the `ring`, `ring_small` and `disc` textures with a 1 px dark rim (colour 2 or 3) on both sides.
  - Give the frost projectiles a steel (3) outline.
  - Use colour 3, not 15, for frost damage numbers when the tile under the target is snowy.
- **Screenshot:** `vx_fx_nova.png`.
- **Impact:** M. **Effort:** S.
- **Files:** `src/art/sprites.js` (buildFx: ring, frostbolt), `src/art/fx.js`.

### VX-10 The Werewolf is a brown wolf
- **What's wrong:** `spr_werewolf` is `wolfFrame` with the wood palette, at scale 1.25. The guide's night headline ("after dark wolves become werewolves") turns into a slightly bigger brown wolf, with the 2-frame walk from VX-04. The wolf archetype is also already shared by Alpha, Ash Hound, Grimfang and three tinted variants.
- **Change:** draw a native 20-24 px hunched, two-legged werewolf: claws raised in the windup, a howl frame for the alert, and clips.
- **Impact:** M. **Effort:** M. **DESIGN.**
- **Files:** `src/art/native/` (new), `native_registry`, `src/data/enemies.js`.

### VX-11 Non-integer and below-1 scales still break the pixel grid
- **What's wrong:** with nearest-neighbour scaling, these creatures get uneven pixel columns or pixels smaller than the hero's:
  - Werewolf 1.25, Spore Mother and Gloomcap 1.3, Glass Prism 1.2, Cave Weaver 1.2, Lodeling 1.2, Sun Sentinel 1.35 (`enemies4.js:60`);
  - the minis Red Sula 1.25 and Captain Karrow 1.3 (`enemies4.js:150-151`);
  - Bear Cub 0.65, Cinder Imp 0.85, Slimeling 0.7.
  - The native audit deliberately left these alone.
  - The FX rings scale continuously from 0.1 to 3 (`fx.ring`), and boss discs use `r/32`, so FX pixels range from sub-pixel to 3x in one frame.
- **Change:**
  - Snap each creature's scale to 1 (and convey size with a tier marker or bigger native art), or make it native.
  - Draw rings as native-size textures cached per radius bucket (8/16/24/32/48/64 px).
- **Impact:** M. **Effort:** M.
- **Files:** `src/data/enemies.js`, `enemies4.js`, `src/art/native/*`, `src/art/fx.js`, `Boss.js`, `PatternBoss.js`.

### VX-12 Snowless regions roll blizzards and whiteouts
- **What's wrong:** `lighting.updateClock` rolls snow, blizzard, whiteout and aurora for every map with `snow` or `outdoors`, including the Sunscorch, Vale, Fens, Kingdom, Glasswood and Ashen Peaks.
  - In those regions the player gets "A BLIZZARD ROLLS IN" and a blue-grey ambient wash, plus the stealth and arrow-wind changes.
  - No particles appear, because `SnowFx` is only created when `def.snow` (`GameScene.js:228`).
  - The result is a snowstorm toast in the desert with nothing on screen to match it.
- **Change:**
  - Short term: limit blizzard, whiteout and aurora to snow maps and keep the other regions clear or overcast.
  - Long term: give each region its own weather (VX-19).
- **Screenshot:** `vx_sunscorch_blizzard.png`.
- **Impact:** M. **Effort:** S.
- **Files:** `src/world/lighting.js`, `src/data/maps.js`.

### VX-13 The boss intro card stacks five layers of text
- **What's wrong:** during the 2.6 s letterbox, these are all on screen at once:
  - the boss title on the top bar and the area name on the bottom bar;
  - the boss-bar title, half visible under the bottom letterbox;
  - the boss's subtitle line;
  - an orange "FAR BEYOND YOU. GEAR UP FIRST." danger toast.
- **Change:** hide the boss bar and queue toasts and danger warnings until the card has finished. Put the subtitle in the bottom bar, not above it.
- **Screenshots:** `vx_boss_maw_intro.png`, `vx_boss_crypt_intro.png`.
- **Impact:** M. **Effort:** S.
- **Files:** `src/scenes/HudScene.js` (onBossIntro, toasts).

### VX-14 The region name on arrival is nearly invisible
- **What's wrong:** `HudScene.onArea` draws the map name in colour 5 (pale ice) at y 36 with no plate. Over snow, ice, marble and Emberhold's roofs it vanishes, and over the dark regions it is low-contrast grey.
- **Change:** put a dark plate or 1 px shadow behind it, or replace it with the title card in VX-23.
- **Screenshots:** `vx_map_coast.png`, `vx_map_emberhold.png`, `vx_map_glasswood.png`.
- **Impact:** M. **Effort:** S.
- **Files:** `src/scenes/HudScene.js`.

### VX-15 Dusk and dawn barely change the screen; the aurora is hard to see
- **What's wrong:**
  - `ambientNow` mixes the dusk colour `0x3a1a2a` at `dusk*0.5` into a layer whose alpha is only ~0.2 at 19:00. Dusk reads as slightly grey day.
  - Night is the same navy (`0x0b1536`) in the desert, the fens and the snow.
  - The aurora ribbons (`ambient.js:119-133`) are alpha 0.12-0.2 bands at y 8-26, under the HUD bars. In `vx_forest_aurora.png` I can't see them.
- **Change:**
  - Add a warm dusk ramp (alpha up to 0.3, mixing toward orange 12 then purple 14) and a cool dawn.
  - Give each region a night tint (indigo desert, green-black fens).
  - Draw the aurora lower (y 20-60), at higher alpha and with palette steps 15/8/14.
- **Screenshots:** `vx_forest_dusk.png`, `vx_forest_night.png`, `vx_sunscorch_night.png`.
- **Impact:** M. **Effort:** S. **DESIGN.**
- **Files:** `src/world/lighting.js`, `src/world/ambient.js`.

### VX-16 The Glasswood, Vale and Kingdom borders are regimented grids
- **What's wrong:** forest edges are placed as solid blocks of one tile: BIRCH in straight columns in the Vale and Greenhollow, pines in white squares in the Glasswood. Stamped repeats in straight lines read as walls of wallpaper, not woods.
- **Change:** jitter the edge mask, mix in 2-3 tree variants per region (with VX-01), and scatter bushes and stumps.
- **Screenshots:** `vx_map_vale.png`, `vx_map_greenhollow.png`.
- **Impact:** M. **Effort:** S-M. **DESIGN.**
- **Files:** `src/world/regions*.js`, `src/data/hubs4.js`, `src/art/sprites.js`.

### VX-17 Companions walk on a 2-frame cycle
- **What's wrong:** `Follower.js:79` alternates frames 1 and 2. The player and enemies use the four-beat walk from Round 9 (`walkFrame`). The Pony shows side frames only.
- **Change:** use `walkFrame(this.phase)` in Follower.
- **Impact:** L. **Effort:** S.
- **Files:** `src/entities/Follower.js`, `src/entities/Pony.js`.

### VX-18 Lightning is on screen for 130 ms (guess)
- **What's wrong:** `fx.bolt` clears after 130 ms. My shot 60 ms after casting Lightning showed no bolt (`vx_fx_shock.png`), possibly because of timing in `castShock`. Unverified.
- **Change:** draw the bolt for 2-3 frames, fading in palette steps (13, then 6, then gone), and add a 1-frame white pop on each target.
- **Impact:** L. **Effort:** S.
- **Files:** `src/art/fx.js`, `src/entities/playerMagic.js` (castShock).

---

## Upgrades and new work

### VX-19 Weather and ambient life for each region
- **Today:** besides the Stormcrown's lightning flash, every region gets the same ravens and frost motes (`ambient.js`), and the only weather particle is white snow.
- **Change:** use the `color` parameter `SnowFx` already has, plus per-region modes:
  - Ashen Peaks: falling ash (colour 2) with ember motes (12/13).
  - Fens: rain streaks and ground mist.
  - Sunscorch: sandstorm (10/13 horizontal streaks; it can reuse the whiteout stealth rules).
  - Vale: pollen by day, fireflies at night.
  - Glasswood: glints (15/6 twinkles).
  - Underdeep: drifting spores and drips.
  - Kingdom: pale ghost-lights at night.
  - Swap ravens for gulls on the Coast and vultures in the Sunscorch.
- **Impact:** H. **Effort:** M. **DESIGN.**
- **Files:** `src/art/snow.js`, `src/world/ambient.js`, `src/world/lighting.js`, `src/data/maps.js` (a `weather` table per map).

### VX-20 A silhouette kit for the 16px humanoid enemies
- **Today:** about 60 humanoids share one 16px template (`humanoid()`, STYLES). Draugr, Warden, Knight, Rime Reaver, Rime Knight, Sentinel and Hollowed Delver are all blue-grey armoured figures that look the same at a glance (`vx_lineup_b.png`, the bottom row of `vx_gl_tints.png`). Held weapons only appear during the windup (`Enemy.updateBlade`).
- **Change:** add role marks drawn into the sheet: a kite shield for knights and wardens, a two-hander over the shoulder for reavers, a bow on the back for archers, a staff for casters, a spear for sentinels, a lantern for delvers. Show the weapon at rest too, at a low angle.
- **Why it matters:** players learn enemy roles by shape.
- **Impact:** H. **Effort:** M-L. **DESIGN.**
- **Files:** `src/art/sprites.js` (humanoid, STYLES), `src/art/gear.js`, `src/entities/Enemy.js`.

### VX-21 Terrain transition tiles
- **Today:** every boundary (snow/path, moss/marble, sand/sandstone, glade/glass-moss, bog/boardwalk) is a hard 16 px square edge.
- **Change:** a small 4-bit edge and corner overlay set for the 6-8 most common pairs, chosen from a neighbour mask when the map is built. It could go on a second layer, together with VX-01.
- **Impact:** M-H. **Effort:** L.
- **Files:** `src/art/sprites.js`, `src/scenes/GameScene.js`, `src/world/worldgen.js`.

### VX-22 More props for each region
- **Today:** each region has only 2-4 tiles of its own. The Sunscorch has SAND, DUNE, a cactus and a glyph road (the whole Amberwell approach is one repeated glyph tile, `vx_map_amberwell.png`). The Fens are wall-to-wall boardwalk (`vx_map_fens.png`). The Kingdom has big marble plazas.
- **Change:** add 3 scatter props per region:
  - Sunscorch: bones, pots, palms, fallen column.
  - Ashen: steam vent, obsidian, slag.
  - Fens: mossy snag, lantern post, reed tuft.
  - Kingdom: statue, broken arch, banner.
  - Underdeep: stalagmite, crystal cluster.
  - Glasswood: shard tree, prism stone.
  - Vale: bush, log, beehive.
- **Impact:** M. **Effort:** M. **DESIGN.**
- **Files:** `src/art/sprites.js`, `src/world/landmarks.js` (scatter), `src/config.js`.

### VX-23 A title card for each region
- **Today:** a new region announces itself with only the faint area text (VX-14).
- **Change:** on first arrival, reuse the boss-intro letterbox: region name in the region's colour, a one-line motto from `regions.js`, and a short palette flourish (ash for the Peaks, glass glints, and so on). Show it once per save, with a quiet re-show on later entries.
- **Impact:** M. **Effort:** S-M. **DESIGN.**
- **Files:** `src/scenes/HudScene.js`, `src/data/regions.js`.

### VX-24 A stronger title screen
- **Today:** `TitleScene.create` scales the UI font 4x for the logo and draws two flat bands of mountains plus snow (`vx_title.png`). There is no hero, no landmark and no motion besides the snow.
- **Change:**
  - A hand-pixelled logo: icy letters with a 6/5/4 ramp, a cyan rim and a frost drip.
  - A small native hero on a ridge with a flapping cloak.
  - A campfire glow or slow aurora, and 2-layer parallax.
  - Optional: rotate the backdrop to the region of the player's last save.
- **Impact:** M. **Effort:** M. **DESIGN.**
- **Files:** `src/scenes/TitleScene.js`, `src/art/font.js`.

### VX-25 Pictures for the intro
- **Today:** the intro (`IntroScene.js`) is three typed lines on black (`vx_intro.png`).
- **Change:** three simple pixel vignettes under the lines: a blizzard with a fallen figure, black with a single lantern, then Sigrid's silhouette in a doorway. Then fade from white into the village.
- **Why it matters:** this is the player's first impression.
- **Impact:** M. **Effort:** M. **DESIGN.**
- **Files:** `src/scenes/IntroScene.js`.

### VX-26 Ending tableaux
- **Today:** all 36+ endings are a 2x title over typed text on black (`EndingScene.js`, `vx_ending.png`).
- **Change:** build a small tableau per Winter outcome (thaw: green village; warden: the throne; crown: blizzard) and per final choice. Compose them from existing tiles and sprites in a 320x80 strip above the text, and add the epilogue's key characters as sprites.
- **Impact:** M. **Effort:** M-L. **DESIGN.**
- **Files:** `src/scenes/EndingScene.js`, `src/data/story.js`.

### VX-27 Separate bodies for the golem family (known, still open)
- **Today:** NATIVE_PIXELS_AUDIT lists this as a follow-up and it is still true: the Bridge Troll, Rime Golem, Crystal Golem and Stone Giant share one native body (`vx_lineup_a.png`).
- **Change:**
  - Troll: hunched, long arms, club.
  - Stone Giant: boulder shoulders.
  - Crystal Golem: faceted spikes.
- **Impact:** L-M. **Effort:** M. **DESIGN.**
- **Files:** `src/art/native/creatures_humanoid.js`, `humanoid.js`.

---

## Screenshots
All are in `test/out/`:
- **Regions and towns:** `vx_map_<id>.png` (forest, ashen, coast, kingdom, fens, highlands, glasswood, vale, sunscorch, underdeep, emberhold, reedwick, greenhollow, amberwell) and `vx_more_*.png` (night and dungeon).
- **Creature line-ups:** `vx_lineup_a/b/c.png` (Canvas) and `vx_gl_tints.png` (WebGL).
- **Effects:** `vx_fx_*.png`.
- **Bosses:** `vx_boss_*.png`.
- **Lighting and weather:** `vx_forest_night`, `_dusk`, `_blizzard`, `_aurora`, `vx_sunscorch_blizzard`, `_night`.
- **Title, intro, ending:** `vx_title`, `vx_intro`, `vx_ending`.

## Top 5
1. **VX-01:** fix the snow-backed tiles. White and slate squares around trees, rocks, stumps and braziers show up in nine regions and are the most visible flaw in the game.
2. **VX-02:** give Jarl Valdrek, the Rime Wyrm and Grimfang native art. They are the first three bosses, and they are still stretched 2x, 3x and 1.9x.
3. **VX-03:** don't rely on tints for telegraphs, hit flashes and variants. They vanish on the Canvas fallback and produce off-palette colours on WebGL; bake palette-remapped textures instead.
4. **VX-04:** add seven sheets to ANIM_CLIPS (one line each). Ten creatures get the hurt and death frames they already have.
5. **VX-05 + VX-06:** make crowd fights readable. Merge damage numbers and labels, show fewer enemy bars, and make status effects visible on the enemy.
