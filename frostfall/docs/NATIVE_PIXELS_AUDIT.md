# Native pixels audit

Status: phase 1 of the native-pixels plan. Generated from `test/audit_sizes.mjs` (data in `test/out/audit_sizes.json`).

Goal: the hero stays 16x16. Every creature drawn larger than that on screen gets its own native-size texture shown at scale 1, so every pixel on screen is the same size as the hero's. On-screen size and hitbox stay the same.

## Tiers used

- **boss**: the 14 guardians (13 scaled 2.4-3.0 plus Skaldrath, drawn on a 48x32 cell at 1.9).
- **native**: ordinary creatures with scale 1.4 or more (about 24 px or taller on screen). Each is redrawn natively.
- **smaller**: scale below 1. Their pixels are currently *smaller* than the hero's, which also breaks the pixel match. Decision needed (see risks).
- **stays 16**: scale 1.0-1.3 and every hero-size humanoid. No change.

## Bosses (14)

| kind | name | texture | cell | scale | on screen | shares texture / tint |
|---|---|---|---|---|---|---|
| warlord | Hrolf Ironmarch | spr_warlord | 16x16 | 2.4 | 38x38 |  |
| admiral | Admiral Veyl | spr_admiral | 16x16 | 2.5 | 40x40 |  |
| hollowking | The Hollow King | spr_hollowking | 16x16 | 2.8 | 45x45 |  |
| sovereign | The Ashen Sovereign | spr_sovereign | 16x16 | 2.8 | 45x45 |  |
| kragnar | Kragnar | spr_kragnar | 16x16 | 2.6 | 42x42 |  |
| tide | The Tidemother | spr_tide | 16x16 | 3 | 48x48 |  |
| root | The Ashen Root | spr_root | 16x16 | 3 | 48x48 |  |
| winter | The Long Winter | spr_winter | 16x16 | 3 | 48x48 |  |
| dragon | Skaldrath | spr_dragon | 48x32 | 1.9 | 91x61 |  |
| miremother | The Mire Mother | spr_miremother | 16x16 | 2.6 | 42x42 |  |
| stormgiant | The Storm Giant | spr_stormgiant | 16x16 | 2.8 | 45x45 |  |
| hartking | The Hartking | spr_hartking | 16x16 | 2.6 | 42x42 |  |
| lodecolossus | The Lode Colossus | spr_lodecolossus | 16x16 | 3 | 48x48 |  |
| brinegut | Captain Brinegut | spr_brinegut | 16x16 | 2.4 | 38x38 |  |

## Native-size candidates (9)

| kind | name | texture | cell | scale | on screen | shares texture / tint |
|---|---|---|---|---|---|---|
| elk | Winter Elk | spr_elk | 16x16 | 1.9 | 30x30 | glassstag |
| troll | Bridge Troll | spr_troll | 16x16 | 2 | 32x32 |  |
| bear | Snow Bear | spr_bear | 16x16 | 1.5 | 24x24 | bearcub, mammoth |
| golem | Rime Golem | spr_golem | 16x16 | 1.7 | 27x27 | crystalgolem |
| frostworm | Frost Worm | spr_worm | 16x16 | 1.4 | 22x22 |  |
| wyvern | Ash Wyvern | spr_wyvern | 16x16 | 1.5 | 24x24 | thunderbird |
| mammoth | Wild Mammoth | spr_bear | 16x16 | 2 | 32x32 | bearcub, bear (tinted) |
| stonegiant | Stone Giant | spr_stonegiant | 16x16 | 2.2 | 35x35 |  |
| crystalgolem | Crystal Golem | spr_golem | 16x16 | 1.6 | 26x26 | golem (tinted) |

## Smaller than hero (3)

| kind | name | texture | cell | scale | on screen | shares texture / tint |
|---|---|---|---|---|---|---|
| bearcub | Bear Cub | spr_bear | 16x16 | 0.65 | 10x10 | bear, mammoth |
| imp | Cinder Imp | spr_imp | 16x16 | 0.85 | 14x14 |  |
| slimeling | Slimeling | spr_slime | 16x16 | 0.7 | 11x11 | magmaslime |

## Stay 16x16 (52)

grimfang (x1), wyrm (x1), draugr (x1), wolf (x1), werewolf (x1.25), ghost (x1), bandit (x1), archer (x1), wight (x1), boss (x1), warden (x1), alpha (x1), chief (x1), conjurer (x1), deer (x1), hare (x1), fox (x1), lynx (x1), boar (x1), necro (x1), shroom (x1.3), wisp (x1), mimic (x1), reaver (x1), knight (x1), fencer (x1), ashhound (x1), cindersmith (x1), magmaslime (x1), lavawraith (x1), harpooner (x1), wreckcrab (x1), tidehag (x1), barnacle (x1), phantom (x1), herald (x1), sentinel (x1), stalker (x1), bogwraith (x1), boghag (x1), leech (x1), mudlurker (x1), thunderbird (x1.3), nomad (x1), nomadshaman (x1), prism (x1.2), glimmerkin (x1), glassstag (x1.2), caveweaver (x1.2), lodeling (x1.2), deepdelver (x1), gloomcap (x1.3)

## Findings that change the plan

1. **Sprites are shared between kinds.** `spr_bear` is the Bear Cub (0.65), Snow Bear (1.5) and Wild Mammoth (2.0, tinted). `spr_golem` is the Rime Golem (1.7) and Crystal Golem (1.6). `spr_wyvern` is the Ash Wyvern (1.5) and Thunderbird (1.3). `spr_elk` is the Winter Elk (1.9) and Glass Stag (1.2). Native textures must therefore be keyed per enemy kind, not per `tex`, and a tinted variant needs its own size.
2. **Boss scale lives in Guardians.js, not enemies.js.** `PatternBoss` calls `setScale(info.scale)` after the Enemy constructor has set the body, so the body is scaled by Phaser. A native boss has to reproduce that exact world-space box.
3. **Most bosses are humanoid sheets**: 8 poses by 3 frames (down, up, side, three attack poses, hurt, dead). A native boss therefore needs about 24 frames, not one picture. A parametric native humanoid renderer (the hero 32 px sample scaled to any size, with style options like helm, horns, crown, cape, glow) would cover Warlord, Admiral, Hollow King, Sovereign, Kragnar, Long Winter, Brinegut and the golems consistently.
4. **Animals use clips** (`ANIM_CLIPS` in art/anim.js): side0-2, hurt0, death0. Native animal sheets need those frame names. The Skaldrath dragon uses its own clip table.
5. **Non-humanoid bosses need bespoke art**: Tidemother, Ashen Root, Mire Mother, Storm Giant, Hartking, Lode Colossus, and Skaldrath (already 48x32).
6. **Grimfang and the Rime Wyrm** are bosses at scale 1 (16x16). They are not stretched, so they are not part of this change unless Colin wants them bigger.

## Things that assume 16px cells (check in phase 2)

- Hitbox: `Enemy` calls `body.setSize(bw, bh).setOffset(ox, oy)` in texture pixels, and Phaser multiplies by the sprite scale. Native art has to set the world-space box directly.
- `this.shadow` image, the target bar and `this.marker` (Enemy.js ~584 offsets by `scaleX > 1`) use scale as a size proxy.
- Telegraph and ground-burst positions in Guardians.js / PatternBoss.js use `this.x/y` and fixed radii, so they are not tied to the texture, but verify visually.
- Death animation tweens `angle`/`y` on the sprite and uses `dead0` / `death` clips.
- Bestiary and boss-bar portraits draw sprites by texture key (check src/scenes/menuSystem.js and the HUD).
- Tests: stage26_guardians, stage28_poses, stage29_bestiary, stage30_dragon and art_baseline (pixel baselines in test/baseline) will change when a creature is swapped.

## Risks and open decisions

- **Sizes that are not whole pixels.** 16 x 2.4 = 38.4. Native size is rounded to a whole pixel (38), so a boss can be up to half a pixel off today's on-screen size. Hitbox stays exact.
- **Scale below 1** (Bear Cub 0.65, Imp 0.85, Slimeling 0.7). These look smaller-pixeled than the hero. Options: leave as is, or draw natively at 10x10, 14x14 and 11x11. Recommend: leave as is for now.
- **Scale 1.2-1.3** (Werewolf 1.25, Spore Mother 1.3, Caveweaver 1.2, Lodeling 1.2, Glass Stag 1.2, Prism 1.2, Gloomcap 1.3) is left at 16 to keep the cut-off simple. Say if you want the cut-off lowered.
- Tinted variants (Mammoth, Crystal Golem, Thunderbird, Glass Stag) share art with a base kind. If they get their own native art they will no longer look related; recommend native art per base kind plus tint where the sizes match, and separate art where they do not (Mammoth should not be a recoloured bear).

## Status (done)

Native-pixel art is live for 25 creatures: all 14 bosses plus Bridge Troll, Rime and Crystal Golem, Stone Giant, Ash Wyvern, Thunderbird, Frost Worm, Snow Bear, Wild Mammoth, Winter Elk and Glass Stag.
- Registry: `src/art/native_registry.js`; art in `src/art/native/` (bosses_a/b/c = hand-designed bosses on `boss_kit.js`, special.js = Tidemother, Ashen Root, Skaldrath, animals.js, creatures_humanoid.js).
- `test/stage66_native.mjs` checks size, hitbox and frames for each against the stretched sprite.
- Still on the old stretched art by choice: Bear Cub, Imp, Slimeling (scale below 1) and everything at scale 1.0-1.3.
- Follow-up: Bridge Troll, both golems and Stone Giant still share one body shape.
- Dev tools: `test/native_sheet.mjs` (preview), `test/native_compare.mjs` (old vs new image), `test/old_sheet.mjs`.
