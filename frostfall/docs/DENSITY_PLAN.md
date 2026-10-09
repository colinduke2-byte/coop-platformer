> **Status: dropped by Colin.** The painted look was rejected; a sharper-pixels build with smoother lighting was prototyped (branch deleted) and he preferred the original stepped, ringed lighting. The game stays at 320 x 180. The spike notes in `DENSITY_SPIKE.md` are kept in case the idea returns.

# Plan: sharper pixels (2x density)

Decided with Colin: same chunky Frostfall charm, richer; a palette per region (about 32 colours each); crisp HUD text redrawn at the new size; first slice = the Dreamer and the village, reviewed before the rest; Standard (today) and High (new) quality with auto-detect.

## What "2x density" means here
Same world, same speeds, same hit boxes, same field of view. The game draws 640 x 360 instead of 320 x 180, so every object has 4x the pixels (32 x 32 where a sprite was 16 x 16). Nothing about gameplay, maps or tuning changes. Standard keeps today's picture.

## The technical heart (decided by a spike first)
The world code uses 16-unit tiles and 16-pixel sprites everywhere. To avoid touching it, high-density art has to display at the *old* logical size. Two ways, tried in this order in Phase 0:
1. **Texture-density trick**: build textures at 2x but register them so the engine believes they are 1x (UV coordinates are normalised, so a 32-pixel image drawn into a 16-unit quad just works in WebGL). The tile layer is simpler: a 32-pixel tileset on a layer scaled 0.5.
2. **Scale patch**: a small patch so any object using a high-density texture is drawn at half its pixel size (also covers the canvas renderer the tests use).
Phase 0 proves one of them on the Dreamer in both renderers, measures frame time on a phone-class budget, and only then do we commit. If neither is clean, we stop and report instead of rewriting the world.

## Spike result (done)
GO. See `docs/DENSITY_SPIKE.md`: the texture-density trick works for sprites in WebGL, tiles use a 32 px tileset on a half-scaled layer, cameras are straightforward, speed is fine. High requires WebGL; canvas stays Standard.

## Phases
**0. Spike (small).** Prove the density mechanism (WebGL and canvas), 640 x 360 canvas with every camera zoomed 2x, Retina scaling on the Mac, and a first frame-time measurement. Output: a one-page result and a go / no-go.

**1. Engine.** A single density constant; helpers for creating high-density textures; `High` and `Standard` quality in Options with a launch speed test that picks one and a frame-rate watcher that drops a tier instead of stuttering; test harness runs both. Light and fog layers, particles and screen effects rebuilt at 2x. All existing tests keep passing on Standard.

**2. Art kit.** The sprites are drawn in code, so the kit is code: outline and rim-light helpers, 3-tone shading, dithering, fur/cloth/metal/ice/crystal brushes, a palette-per-region system (swap by region, plus night and weather tints). Every drawing routine takes a scale so one description produces both sizes where it can.

**3. First slice (checkpoint).** The Dreamer (four directions, walk, roll, attack, hurt, death, armour variants), the village (all village tiles, houses, props, snow, fire and light), a few villagers, the HUD and menu text at crisp size. Published as a High-quality build for Colin to judge. **We stop here and Colin decides whether to continue and what to change.**

**4. Everything else, in the order a player meets it.** Common enemies (about 25), animals, region tiles and scenery by region (Reach, Ashen Peaks, Coast, Old Kingdom, Fens, Highlands, Glasswood, Underdeep, Saltmarket), dungeons, bosses (about 25, largest scale), items and icons (about 250), effects, title, map, menus, endings.

**5. Performance and phones.** Budget on a mid phone and on the M-series Mac; sprite atlas packing; cap on lights and particles per tier; texture memory check (4x the pixels).

**6. Polish and release.** Art review passes, rebuild the art baseline test, visual regression shots for every region, update guide and field guide pictures, republish.

## Tests
Standard stays byte-for-byte as today until the last phase; the art baseline is rebuilt only for High. New tests: density mechanism on both renderers, quality switch, auto-detect fallback, HUD text bounds at both sizes, frame-time budget, a screenshot per region on High.

## Risks and how they are handled
- **Engine trick fails** -> found in Phase 0, nothing else started.
- **Look drifts between artists-in-code** (me, over many sessions) -> the kit and palettes come first, and the slice is approved before the rest.
- **Phones too slow** -> Standard stays; auto-detect decides; High never forced.
- **Size**: the single-file build grows (more art code, more textures at boot). Boot time is measured; textures are built lazily per region if it matters.
- **Scope**: this is a long job (the slice is one long session; the rest is several). Each phase ends with a passing full regression and a published build, so there is always a good version.

## What this plan does not do
No change to gameplay, maps, difficulty, quests or audio. No new regions. No painted or smooth look (that was the other option).
