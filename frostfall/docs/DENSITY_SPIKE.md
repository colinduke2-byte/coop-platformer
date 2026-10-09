# Density spike: result (GO)

Question: can 2x-density art (32 px sprites, 32 px tiles, a 640 x 360 picture) show at the old logical size without rewriting the world code?

Files: `spike/density.js` (visual), `spike/perf.js` (speed), run with `node test/spike_density.mjs` and `node test/spike_perf.mjs`. Screenshot: `test/out/spike_webgl.png`.

## What works (WebGL)
- **Texture-density trick for sprites.** Build the texture at 2x, then tell the engine the source is 1x (`texture.source[0].width/height` set to half, frames defined in logical coordinates). The sprite reports 16 x 16, draws 32 detailed pixels inside it, and flip, scale (2.6x boss), rotation, tint, frame animation and the physics body (size and offset) all behave exactly as before.
- **Tiles.** Phaser's tile layer reads the real image size, so the trick does not work there. Instead: a 32 px tileset on a layer scaled 0.5. Renders correctly, culling correct.
- **Camera.** Canvas 640 x 360, world camera zoom 2 with the default origin: follow, bounds, worldView (used by lighting and off-screen checks) all stay correct. Only `Player.js` reads `scrollX` directly (mouse aim) and needs `worldX/worldY`.
- **Screen-fixed things.** With zoom 2, anything with `setScrollFactor(0)` lands at 2x minus the screen centre. HUD, menus and other scenes: camera `setZoom(2).setOrigin(0, 0)` (they never follow or cull) puts logical (0,0) at the corner. Screen-fixed objects *inside* the game scene (snow, darkness, aurora; six places) go on a second "UI camera" with the same setup.
- **Speed.** Even with software GL: 300 and 1500 moving sprites hold 59 to 60 fps at both 320x180 1x and 640x360 HD. Fill rate is not the problem at this size; texture memory is 4x (still small).

## What does not work
- **Canvas renderer.** The canvas fallback draws the wrong region of an HD texture. Decision: **High quality requires WebGL** (every real browser has it); canvas stays Standard-only. The automated tests mostly use the canvas renderer, so High needs its own WebGL test run (swiftshader, slower).

## Decisions
1. GO with the plan as written. No gameplay code changes needed.
2. Quality: `Standard` (320 x 180, 1x art, canvas or WebGL) and `High` (640 x 360, 2x art, WebGL only). The title of this setting in Options: Graphics.
3. Phase 1 order: density constant and texture helper, camera setup per scene (main, UI, HUD, menu), tile layer at 2x, then the Dreamer and village slice.
