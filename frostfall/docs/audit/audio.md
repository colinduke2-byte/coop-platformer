# Frostfall audit: audio and music (AU)

Reviewer area: SFX coverage and variety, mix, music, positional audio, game-state feedback, ducking.
All findings come from reading `src/audio/sfx.js` (the whole audio engine: 66 SFX recipes, 23 songs, 2 ambience beds)
and every `sfx.play` / `music.*` / `ambience.*` call site (about 500 calls in 62 files). The performance items in
`docs/RUN_AND_UI_IMPROVEMENTS.md` (shared noise buffer, 35 ms rate limit, suspend when hidden, no notes when music is off)
are done and are not repeated here.

How it was checked: a call-site to recipe map (grep), and two scratch scripts that load the `SONGS` table and compute
tempo, key, loop length, shared progressions and out-of-key melody notes. Nothing was listened to. Items marked
**(guess)** are reasoning, not measured.

Impact H/M/L. Effort S (hours), M (a day), L (days). **DESIGN** = changes musical direction; Colin should approve.

---

## Fixes and polish

### AU01 Repair, Repair All and Reforge are silent: `sfx.play('upgrade')` has no recipe
- **What:** `src/data/services.js:390, 396, 416` call `sfx.play('upgrade')`. There is no `upgrade` key in `SOUNDS`, and
  `sfx.play` uses `SOUNDS[name]?.()`, so it fails silently. Every other smith action has a sound; these three, which cost
  gold, give no confirmation.
- **Fix:** add an `upgrade` recipe (an anvil "tink-tink": two short square tones around 1.2-1.6 kHz plus a bright noise
  tick), or point the calls at `equip`.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/data/services.js`.

### AU02 No test catches a missing sound name
- **What:** `test/stage34_audio.mjs` only plays seven hand-picked names and checks for no exceptions. A typo or a missing
  recipe (AU01) passes, because unknown names are silently ignored.
- **Fix:** a unit/static test that collects every `sfx.play('literal')` in `src/` plus the dynamic ones
  (`'bark_' + cfg.bark` for every `bark` value in the enemy data, `stepSound()` results, `changeMap` sound args)
  and asserts each one is a `SOUNDS` key. Also log a one-time `console.warn` in dev builds when `SOUNDS[name]` is
  missing.
- Impact M, Effort S. Files: `test/` (new check), `src/audio/sfx.js`.

### AU03 The combat music layer flaps on and off
- **What:** `GameScene.updateMusic` polls once a second and sets `music.setIntensity(fight && !bossOn)`, where `fight`
  means an alerted enemy within **220 px**. There is no hold time and no fade: `schedule()` either emits the drum notes
  or not. An enemy kiting at about 220 px, an archer backing off, or a wolf circling turns the drums on and off every
  second or two. `this.lastCombat` is recorded but only used for the stinger.
- **Fix:** keep the layer on for about 4-6 s after the last `fight` tick (use `lastCombat`), and route the combat layer
  through its own `combatGain` node that ramps over about 0.8 s instead of switching. Start the layer on a bar boundary
  (`step % 16 === 0`).
- Impact H, Effort S. Files: `src/audio/sfx.js`, `src/scenes/GameScene.js`.

### AU04 Song changes are hard cuts, and boss victory music bounces
- **What:** `music.play()` swaps the song and resets `step = 0` at once. Notes already scheduled for the next 0.6 s
  still play, so the old and new songs overlap briefly, and there is no fade. This happens:
  - at dusk and dawn, when `updateMusic` switches from the zone theme to `night` mid-phrase;
  - on every door (`changeMap`) and boss engagement;
  - on boss victory: `Boss.victory` and `PatternBoss.victory` call `music.play('crypt')`. Within a second
    `updateMusic` sees `boss.dead`, wants `def.music` and plays it from the start. In the ten region dungeons whose music
    is `throne`, you hear about a second of `crypt` and then `throne` restarts.
- **Fix:** give each song its own gain node; `play()` fades the old one out over about 1.5 s and starts the new one
  on the next beat. Allow a `{ fade, wait: 'bar' }` option for day/night changes. For victory, play a short fanfare
  and then let `updateMusic` choose the map's song, with no hard-coded `crypt`.
- Impact H, Effort M. Files: `src/audio/sfx.js`, `src/entities/Boss.js`, `src/entities/PatternBoss.js`,
  `src/scenes/GameScene.js`.

### AU05 Pitch and volume never vary, so repeated sounds wear on the ear
- **What:** only `blip` (random 520-640 Hz) and `crackle` (random length) vary. Footsteps (about 2 per second for the
  whole session), `sword`, `hit`, `block`, `kill`, `pickup`, `coin` and `arrowhit` are exactly the same on every play.
  Footsteps pick a random slice of the noise buffer, but the envelope and filter are fixed, so it sounds like the same
  sample.
- **Fix:** in `sfx.play`, choose one random factor per call (pitch ±4-6%, volume ±10-15%) and pass it through
  `tone`/`noise` (multiply `f0`/`f1`/`lp0`/`lp1` and `vol`). Use wider ranges for steps and hits and none for UI or
  jingles (a `NO_VARY` set). Optionally alternate left and right footsteps with a small fixed pitch offset.
- Impact H, Effort S. Files: `src/audio/sfx.js`.

### AU06 Critical hits sound the same as normal hits
- **What:** `playerCombat.js:165-173` uses `execute` for finishers, `crit` only for **sneak** attacks, and `hit` for
  everything else, including normal critical hits. A crit shows "CRIT" text and harder hit-stop but is silent about it.
- **Fix:** `else if (crit) sfx.play('crit')`. Consider a quieter `crit` for non-sneak crits so sneak attacks stay
  special.
- Impact M, Effort S. Files: `src/entities/playerCombat.js`.

### AU07 Danger cues are among the quietest sounds
- **What:** `telegraph` (enemy and boss wind-up, the meteor and sunbeam warnings) is two 50 ms square blips at volume
  0.06. `alert` (an enemy notices you) is one 80 ms blip at 0.06. Combat sounds around them are 0.16-0.3 (`hit` 0.25
  noise + 0.16, `roar` 0.25, `boom` 0.3). In a crowd fight the cues you need to read are the ones that get masked
  **(guess, from the numbers)**.
- **Fix:** raise `telegraph` and `alert` to about 0.1-0.12 and give them a timbre nothing else uses (for example a
  rising triangle "whoosh" for wind-ups and a two-note "huh?" for alerts). Give boss telegraphs a lower, longer version.
- Impact H, Effort S. Files: `src/audio/sfx.js`.

### AU08 No limiter on the master bus
- **What:** every voice goes straight into `master` and then to `ctx.destination`. A boss death plays `roar` + `die` +
  `boom` + `shake` hits at once (summed gains well over 1.0 before the 0.6 master), and crowd fights stack `hit`, `kill`,
  `boom` and `frost`. The 35 ms per-name limit does not cap different names, so clipping and crackle are likely on big
  moments **(guess: not measured)**.
- **Fix:** put a `DynamicsCompressorNode` (threshold about -10 dB, ratio 8-12, fast attack) between `master` and the
  destination. Optionally cap concurrent SFX voices (about 24) and drop the quietest.
- Impact M, Effort S. Files: `src/audio/sfx.js`.

### AU09 Spells borrow the wrong sounds
- **What** (`src/entities/playerMagic.js`):
  - **Sandstorm** plays `howl`, the wolf howl (line 203).
  - **Thorn Snare** plays `frost` (191).
  - **Blink** plays `roll` (119).
  - **Nova** and **Glacier** play `frost`, and **Ember Nova** plays `fire`: the same sounds as the basic bolts.
  - **Meteor** and **Sunbeam** use `telegraph` and then `fire`.
  - Staff bolts (380) use `fire`/`frost`.
  - Enemy frost attacks (`Enemy.js:165, 283, 550`, `Boss.js:233`, `Guardians.js:114`) use the same `frost` as the
    player's.

  The guide sells "four more spells", but they sound like the old ones.
- **Fix:** add about 6 recipes: `sand` (band-passed noise swirl), `thorns` (crunchy low noise + creak), `blink` (fast
  rising sine + sparkle), `meteor_fall` (long falling whistle into `boom`), `sunbeam` (bright chord swell), `nova_ice`
  (a burst of glassy triangles). Give enemy frost a lower, rougher variant.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/entities/playerMagic.js`, `src/entities/Enemy.js`.

### AU10 Every weapon swings with the same sound, light or heavy
- **What:** `playerCombat.js:70` (combo swings) and `:106` (heavy attack) both play `sword`. The game has 8 weapon
  styles (dagger 14, halberd 12, staff 12, great 8, axe 4, mace 4, spear 4, hammer 1 items), and a dagger flick, a
  greatsword cleave and a heavy finisher all sound alike. The third combo hit (the "heavy finisher" in GUIDE §2) has no
  extra weight.
- **Fix:** `swing(style, heavy)` picks a recipe: dagger (short, high, quiet), sword (current), axe/mace/hammer (lower
  whoosh + more noise), great/halberd (longer, lower whoosh), spear (thin stab), staff (wooden whoosh). Combo hit 3 and
  `U` heavy attacks: lower pitch, longer noise, louder. Do the same for `hit` by target material (AU12).
- Impact M, Effort S-M. Files: `src/audio/sfx.js`, `src/entities/playerCombat.js`.

### AU11 One jingle for many unrelated events
- **What:**
  - `quest` plays from 37 call sites: quest started, quest ready, quest complete, quest updated, area discovered,
    achievement, treasure found, notes, arena wave cleared.
  - `levelup` plays from 18: skill level, character level (fired alongside the skill level, with no fanfare of its own),
    perk bought, forge +N, gem or rune set, resting at the Last Lantern, house bought, camp cleared, raid stopped,
    heart claimed, boss loot.
  - `nostamina` (a 120 Hz buzz) is the "no" for 53 different refusals.

  The player can't tell "quest complete" from "you found a place", and the character level, the biggest progression
  beat, sounds like buying a gem.
- **Fix:** split into `quest_start` (two rising notes), `quest_update` (one bright note), `quest_done` (the current
  four-note phrase plus a chord), `discover` (a soft, open fifth arpeggio), `achievement`, `skill_up` (current
  `levelup`), `char_level` (a longer fanfare that briefly ducks the music, played from the `charlevel` bus event),
  and `buy`/`forge` (a short coin + anvil). Keep `nostamina` for stamina and add `deny` for UI refusals.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/systems/quests.js`, `src/world/discovery.js`,
  `src/systems/achievements.js`, `src/scenes/GameScene.js`, `src/data/services.js`, `src/data/emberhold.js`.

### AU12 Enemies have three voices and one death
- **What:** `bark_` only comes in `wolf`, `undead` and `human`.
  - 40 kinds use `undead`, including golems, crystal golems, wisps, shrooms, prisms, glimmerkin, imps and stone giants.
  - 22 kinds use `wolf`, including the mimic, frostworm, wreckcrab, barnacle, leech, caveweaver, lodeling and
    thunderbird.

  Every non-boss enemy dies with the same `kill` (`Enemy.js:766`) and notices you with the same `alert` blip (only
  werewolves differ). Every body hit is `hit`, whether flesh, bone, stone or armour. Enemies make no footsteps or
  movement sounds, and neither does the pony.
- **Fix:** add a `voice` field (default derived from `bark`): `beast`, `undead`, `human`, `construct` (stone grind,
  crystal ring), `crawler` (chitter/click), `spirit` (airy whisper), `slime` (wet pop). Each voice gets a bark, an
  alert and a death recipe. Choose the `hit` variant from the target's armour or material (flesh, bone, metal, stone).
  Add a quiet hoof clop for the pony (`stepSound` when `S.mounted`).
- Impact M, Effort M. Files: `src/audio/sfx.js`, `src/entities/Enemy.js`, `src/data/enemies.js`,
  `src/data/enemies4.js`, `src/entities/Player.js`.

### AU13 Status effects and some warnings make no sound
- **What:**
  - `playerCombat.statusHit` (burn, bleed and poison ticks) shows damage numbers but plays nothing; applying a status
    plays nothing either (`src/systems/status.js` has no `sfx`).
  - Gear breaking (`durability.js:20`, "YOUR X IS BROKEN") and becoming Burdened or Overloaded (`burden.js:62`) are
    toast-only.
  - A player killed by a status tick gets `die` but no hurt beforehand.
- **Fix:** a soft per-status tick (burn: crackle; poison: a low bubbly blip; bleed: a short wet noise), limited to
  about 1 per second. Add a `status_on` cue per element, a `break` (metal snap) for broken gear and a `heavy` thud
  for overload.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/entities/playerCombat.js`, `src/systems/status.js`,
  `src/systems/durability.js`, `src/systems/burden.js`.

### AU14 Combat drums drown the melody, and a boss's first phase has no drums
- **What:** in `schedule()`, the combat layer's kick is a triangle at **0.13** gain and the snare noise is at 0.08.
  The lead melody is at 0.05, the arpeggio at 0.025 and the bass at 0.09. Once a fight starts, the kick is about 2.6
  times the melody, so every zone theme turns into the same drum loop **(guess, from the gains)**.
  Separately, `updateMusic` passes `fight && !bossOn` and `setIntensity` only forces the layer from phase 2. During a
  boss's first phase the `boss` song (132 bpm) plays with no percussion at all, while an ordinary wolf fight has drums.
- **Fix:** lower the kick to about 0.08 and the snare to about 0.05, and raise the lead to about 0.06 while the layer
  is on. Turn the drum layer on for boss phase 1 too, but lighter (kick only) and full from phase 2, so phases still
  escalate.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/scenes/GameScene.js`. **DESIGN** (how combat should sound).

### AU15 The melody is transposed in parallel, so many notes fall outside the key
- **What:** `schedule()` plays the lead at `song.root + ch[0] + m`. The whole 16-step melody moves up and down with
  each chord's root instead of staying in the key. Measured over A and B sections, the share of melody notes outside the
  song's scale (natural minor or major, judged from the first chord) is:
  - **village 23%**, **forest 20%**, **emberhold 18%**, **sunscorch 26%**, **ashen 31%**, **throne 25%**,
    **night 29%**;
  - even the diatonic major songs: vale 15% and glasswood 16%.

  Example: village bar 2 (F major chord in A minor) turns the melody's 15/14/10 into G#, G and D#, all outside the key.
  Some chromaticism is flavour, but here it is a side effect, and it is the same in every song. Songs built on power
  chords (coast, highlands, skarnhold) and the deliberately diminished crypt were not judged.
- **Fix:** store the melody as scale degrees and map them through the song's scale after adding the chord's degree
  (a diatonic transposition), or keep the melody on the tonic and only snap held notes to chord tones. Listen to
  village and forest before and after.
- Impact M, Effort S-M. Files: `src/audio/sfx.js`. **DESIGN.**

### AU16 The title screen Options has no Ambience slider
- **What:** `TitleScene.optRows` has VOLUME, MUSIC LVL and SFX LVL but not AMBIENT. Pause > System has all three
  channels (`menuSystem.js:78`). A first-time player who finds the wind too loud can't change it before playing.
- **Fix:** add `'AMB LVL'` to the title options, using `setChannel('amb', ...)`.
- Impact L, Effort S. Files: `src/scenes/TitleScene.js`.

---

## Upgrades and new

### AU17 At night every outdoor region plays the same song
- **What:** `updateMusic` and `create()` choose `'night'` whenever `isNight()` is true, and `isNight()` is true for every
  map with `snow` or `outdoors`. That covers the Reach, Pass, Coast, Highlands, Kingdom, Ashen Peaks, Fens, Glasswood,
  Vale, Sunscorch and the hubs Emberhold, Skarn Hold, Saltmarket, Reedwick, Lantern Glade, Greenhollow and Amberwell.
  From dusk to dawn (about half of play time) all of them lose their identity to one 58 bpm triangle tune with three
  melody notes per bar. The night track also uses the same A-section progression as `village`. Since day/night drives
  werewolves, ghosts and moon events, night should be the most distinctive music, not the most generic.
- **Fix:** generate a night version of each region song automatically. `nightOf(song)` gives tempo × 0.8, the lead
  as triangle or sine one octave down, every other melody note dropped, no arpeggio and a slower bass. Keep the
  hand-written `night` for the Reach and village. Full moon and blood moon can add a low drone or a tritone pedal, and
  a blood moon can use a faster, darker variant.
- Impact H, Effort M. Files: `src/audio/sfx.js`, `src/scenes/GameScene.js`. **DESIGN.**

### AU18 Loops are short and very repetitive
- **What:** each section is a **single 16-step (8-beat) melody played 4 times**, transposed over 4 chords. A song is
  therefore 2 phrases of 16 eighth notes. Measured loop lengths:
  - `interior` is **21 s** and has only one section. It is the music for every house, inn, shop and lodge, so it plays
    for long stretches.
  - `dragon` 27 s, `boss` 29 s, `skarnhold` 36 s, `throne` 37 s.
  - Most region songs are 40-55 s, and the slowest (`underdeep`, `night`) 66-69 s.

  Over a multi-hour session in one region, the same 5-second phrase repeats about 700 times an hour. `IMPROVEMENTS.md`
  already notes this, but nothing has changed. Six pairs of songs also share their A-section progression
  (village/night; interior/reedwick/vale; forest/sunscorch; pass/emberhold; highlands/skarnhold; glasswood/saltmarket).
- **Fix** (in order of value for effort):
  1. **Silence:** after 2-3 loops, fade the music out for 30-90 s and leave the ambience (as Skyrim does). This alone
     cuts fatigue a lot.
  2. **Per-pass variation:** on each repeat, randomly lift the melody an octave, drop notes, add passing notes, or
     drop the arpeggio for a pass.
  3. **A third section** (C or bridge) and AABA form for the hub and region songs.
  4. A **longer interior** song, or one per hub (a tavern jig for inns, a quiet one for homes).
  5. **Different progressions** for the songs that share one.
- Impact H, Effort M. Files: `src/audio/sfx.js`. **DESIGN.**

### AU19 Ten dungeons share one song, and so do most bosses
- **What:** the region dungeons all use `music: 'throne'`: Tidebreak Cavern, the Sunken Barrow, the Stormspire, the
  Hart Spire, the Thornroot Hollow, the Sealed Vault, the Lode Chasm, Seaweed Cove, the Sepulchre, the Forge of the
  First Fire, Kragnar's Lode, and the Arena and the Pit too. `throne` was written as "grand and slow" for the Winter
  Throne boss, but here it is the walking music in 13 places.
  Only the Winter Throne and the Ember Nest set `bossMusic`. Every other boss (the four Heart guardians, Kragnar, the
  Sovereign, Veyl, the Mire Mother, the Hartking, the Lode Colossus, the Blight Mother, the Vault Sovereign, Brinegut,
  the Storm Giant, the Hollow King) uses the same `boss` track.
  There is no boss intro sting (the HUD title card is silent) and no victory fanfare beyond the 4-note `levelup`.
- **Fix:**
  - **Dungeons:** play the region song in a "dungeon" variant (minor mode, sawtooth lead, slower, no arpeggio), so the
    Sealed Vault sounds like the Sunscorch.
  - **Bosses:** derive the boss music from the region song too: the region's key and lead with the `boss` rhythm and
    tempo. Give the final bosses (Hollow King, Ashen Sovereign) hand-written themes.
  - Add `boss_intro` (a brass hit when the title card shows) and `victory` (a 3-4 s fanfare that ducks the music; see
    AU04).
- Impact M, Effort M. Files: `src/audio/sfx.js`, `src/data/maps.js`, `src/world/regions*.js`,
  `src/scenes/GameScene.js`. **DESIGN.**

### AU20 Two ambience beds cover 45 maps, and weather doesn't change them
- **What:** `ambience.play` knows only `wind` and `crypt`. Every outdoor map and hub uses the same band-passed wind:
  the warm Embergreen Vale meadows, the Weeping Fens bog, the Frozen Coast and the Saltmarket harbour, the Glasswood of
  "ringing glass trees", the lava of the Ashen Peaks, and the forge-city Emberhold. Every cave, dungeon and arena uses
  the same drone and drips. Interiors have no bed at all.
  Weather (`clear`, `blizzard`, `whiteout`, `aurora`, storms) never reaches the audio: a whiteout sounds like a calm
  day. Day and night only add `howl_far`.
  `POLISH_PLAN.md` asked for "region music and ambience" for each region; the music was done, the ambience wasn't.
- **Fix:** turn `ambience` into layers. Each map lists a bed plus spot sounds:
  - `shore`: slow filtered-noise swells on a 6-9 s cycle, plus gulls by day;
  - `marsh`: frog croaks (pitched square chirps), bubbles, insects at night;
  - `meadow`: bird chirps by day (random FM sine trills), crickets at night;
  - `lava`: low rumble plus occasional bubble pops;
  - `glass`: random high sine chimes tuned to the Glasswood song's key;
  - `town`: murmur noise, plus a forge clank in Emberhold;
  - `interior`: a fireplace crackle bed in inns and houses;
  - `desert`: dry wind with sand hiss.

  Drive the wind gain and filter from `S.weather` (blizzard +6 dB and brighter; whiteout louder still; aurora a faint
  shimmering pad), and cross-fade beds on map change.
- Impact H, Effort M-L. Files: `src/audio/sfx.js`, `src/data/maps.js`, `src/world/regions*.js`,
  `src/world/lighting.js` (weather hook), `src/scenes/GameScene.js`.

### AU21 Audio has no position: every sound is centred at full volume
- **What:** `sfx.play(name)` takes no position. An enemy archer's `shoot`, a fire bolt's `boom` and a spike trap
  across the room play exactly as loud as your own sword, from the centre. The only distance logic in the game is the
  campfire crackle's chance of playing (`ambientTick`); its volume never changes. Players can't tell where a threat is
  or how far away it is by ear.
- **Fix:** `sfx.play(name, { x, y })`. Measure the distance from the camera centre and apply a gain falloff (full volume
  within about 60 px, silent beyond about 1.3 screen widths). Add a `StereoPannerNode` (pan = dx / half screen width,
  clamped to ±0.7). Pass a position from `Enemy`, `Projectile`, `Boss`/`PatternBoss`, `setpieces` (spikes), `Breakable`,
  `Chest` and the campfires. Player and UI sounds stay centred. The global per-name limit should keep the loudest
  instance.
- Impact M, Effort M. Files: `src/audio/sfx.js` plus about 10 entity files.

### AU22 Low health and running out of resources have no sound
- **What:** below 30% HP the only warning is a red pulse at the screen edges (`HudScene.js:571`). It is static when
  REDUCE MOTION or FLASHES is off, so for those players the cue is especially weak. Stamina at zero ("your real health
  bar", GUIDE §3) only buzzes when you try to act. Mana has the same `nostamina` buzz.
- **Fix:** add a soft heartbeat on the SFX bus below 30% HP (two low sine thumps; faster below 15%), and lower the
  music bus filter (a lowpass sweep to about 1.2 kHz) while it plays. Play a one-shot breath sound when stamina first
  hits zero. Add an accessibility toggle for the heartbeat.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/scenes/HudScene.js` or `GameScene.js`.

### AU23 Dialogue doesn't duck the music, and every speaker has the same voice
- **What:** during dialogue, music and ambience continue at full level. The text blip (`HudScene.js:383`, every second
  character, a 520-640 Hz square at 0.035) is the same for Sigrid, a bandit, a boss taunt (`BOSS_TAUNTS` via `onSay`)
  and a child. Pause menus also leave the game audio untouched.
- **Fix:** while `dialogue.hud` has a line open, ramp `musicBus` and `ambBus` to about 50% over 0.3 s and back
  afterwards. Give each speaker a voice: base pitch and waveform from the NPC definition, or a hash of the name (low
  triangle for elders, high square for children, gritty sawtooth for bosses), with ±5% variation per blip. While
  paused, put a lowpass on music and SFX.
- Impact M, Effort S. Files: `src/audio/sfx.js`, `src/scenes/HudScene.js`, `src/systems/dialogue.js`.

### AU24 Death, respawn and big world events have no musical response
- **What:** when you die (`player:dead`) the music carries on, with combat drums if they were on. Respawning just
  continues it. Ambush, blood moon and raid events reuse the same fight stinger as any first alert
  (`music.stinger()` in `events.js`, `livingworld.js`, `setpieces.js`). Discovering a region (`dangerWarning`, area
  banners) is silent beyond `quest`.
- **Fix:** on `player:dead`, fade the music out and play a short falling minor phrase; restart the zone song on
  respawn. Give the blood moon its own low, slow stinger and a drone while it lasts. Play a `region_enter` motif (the
  first 4 notes of the region song) with the region banner.
- Impact L-M, Effort S. Files: `src/audio/sfx.js`, `src/scenes/GameScene.js`, `src/world/livingworld.js`,
  `src/world/discovery.js`. **DESIGN** (for the motifs).

---

## Top 5

1. **AU01 and AU02:** Repair, Repair All and Reforge are silent because `sfx.play('upgrade')` has no recipe. Add it,
   plus a test that every sound name exists, so this can't happen again. Hours.
2. **AU05:** add pitch and volume variation to every sound. Footsteps, swings and hits currently repeat exactly
   thousands of times a session, and one shared change in `sfx.play` fixes all of them. Hours.
3. **AU03 and AU04:** add a hold time and a fade to the combat layer, and crossfade song changes. The drums flap
   around 220 px, dusk and doors cut songs mid-phrase, and boss victories bounce through a second of `crypt`.
4. **AU17 and AU18:** the night song replaces 17 outdoor maps' themes for half of play time, and each song is one
   8-beat phrase repeated (interior is a 21 s loop). Make night variants per region, add silences and vary the
   repeats. **DESIGN.**
5. **AU20:** two ambience beds for 45 maps, with no weather response. Shore, marsh, meadow, lava, glass, town and
   interior beds, plus wind that follows the blizzard, would give each region the identity its music already has.
