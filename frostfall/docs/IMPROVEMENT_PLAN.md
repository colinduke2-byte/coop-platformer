# Frostfall: the improvement plan (from the 8-area audit, 2026-10-15)

Eight reviewers each audited one part of the game, read-only. Their full reports, with the files, numbers and suggested
fix for every item, are in `docs/audit/`:

| Area | Report | Items | Fixes / polish | Upgrades | Needs Colin |
|---|---|---|---|---|---|
| Combat, enemies, bosses | `combat.md` (CB) | 28 | 20 | 8 | 15 |
| Progression, loot, economy | `progression.md` (PR) | 26 | 16 | 10 | 10 |
| World, exploration, quests | `world.md` (WQ) | 27 | 16 | 11 | 5 |
| Story, dialogue, writing | `story.md` (ST) | 25 | 18 | 7 | 13 |
| Visuals, animation, effects | `visuals.md` (VX) | 27 | 18 | 9 | 12 |
| Audio and music | `audio.md` (AU) | 24 | 16 | 8 | 6 |
| First hour, clarity | `onboarding.md` (NP) | 27 | 19 | 8 | 9 |
| Code health | `code.md` (CH) | 20 | 20 | 0 | 0 |
| **Total** | | **204** | **143** | **61** | **70** |

The plan has four waves:
- **Wave 0** makes the code safe for several agents at once.
- **Wave 1** fixes everything that is plainly broken, with no design decisions.
- **Wave 2** builds the upgrades you approve.
- **Wave 3** rebalances and ships.

## The worst things found (fix first, whatever else happens)

| | What | Where |
|---|---|---|
| 1 | An arena trial follows you out of the arena, and even into another save: waves spawn in the village and pay gold | CH1 |
| 2 | Closing a shop inside a conversation unfreezes the world while the dialogue is still up | CH2 |
| 3 | 31 scene fields leak from map to map; one throws an error on the next overworld | CH3 |
| 4 | Infinite gold: Ash Iron costs 36g and sells for 45g; lockpicks the same | PR-03 |
| 5 | Generated Legendaries never roll their 3 affixes (a loop bug); 37% of Rares roll only 1 | PR-02 |
| 6 | Gem and crit bonuses land on the wrong weapon; one set bonus does nothing; Legendaries sell without asking | PR-05/06/07 |
| 7 | Any hit (even a 6-damage dagger poke) cancels a troll's attack, so big enemies can be stun-locked forever | CB1 |
| 8 | Button presses during hit-stop are thrown away (a roll tapped on a greatsword hit never happens) | CB2 |
| 9 | Three-phase bosses get *slower* in their last phase | CB7 |
| 10 | Arrows and spells only fly in 8 directions, so they miss locked targets that aren't on a 45° line | CB6 |
| 11 | Every region outside the Reach pays starter-tier rewards from its events, traders and digs | WQ1 |
| 12 | Two quest markers point at an empty spot; side-quest markers pick the first place, not the nearest; kill/collect steps have none | WQ2/4/5 |
| 13 | Blizzards in the desert (logic, picture and sound) | WQ3, VX-12, AU20 |
| 14 | Tutorial instructions arrive one step late; the quest tracker is drawn on top of the clock | NP1/2 |
| 15 | Trees, rocks and roofs show as white squares in nine snowless regions | VX-01 |
| 16 | Without WebGL, boss danger zones turn white and hits stop flashing (tints are dropped) | VX-03 |
| 17 | Repair and Reforge are silent (a sound name with no sound) | AU01 |
| 18 | The story has two different "Hollow Kings", and Chapter 1 ends on "THE END" with New Game+ | ST1/3 |

## Decisions for Colin (needed before Wave 2)

Wave 0 and Wave 1 don't need any of these. Each question has my recommendation; the ids point to the details.

**Combat**
1. **Heavy enemies resist stagger** (CB1, CB9). Trolls, giants, golems and mini-bosses keep winding up through light
   hits, and mini-bosses can't be one-shot from stealth or executed at 28%. *Recommend: yes.*
2. **Heavy weapons wind up** (CB3, CB4, CB24). Each weapon style gets its own hit timing (a hammer lands later and harder);
   only combo finishers count as "heavy"; each class gets its own heavy attack. *Recommend: yes. This is the biggest
   feel change, so we would try it on one weapon first.*
3. **Parry has a cooldown** (CB10) and **a parry deflects projectiles** (CB25). *Recommend: yes to both.*
4. **Fairer enemy tells** (CB12). Every attack gives at least 0.4 s of warning. Unblockable attacks also get their own
   flash, but that is a plain fix (CB13, Wave 1). *Recommend: yes.*
5. **Perfect dodge slows enemies, not you** (CB27). *Recommend: yes.*
6. **Smarter late enemies, a second attack for key enemies, a signature move per boss** (CB21-23). *Recommend: yes,
   in Wave 2.*
7. **Hard difficulty** (CB26). Hard adds faster tells and more aggression, not just more damage. Then smooth the
   mid-game wall (Blight Mother, Ashen Sovereign) and add a late-game spike (CB28). *Recommend: yes.*
8. **Controller layout** (CB17). Block moves off the stick click. *Recommend: yes, with the old layout kept as an
   option.*

**Progression and economy**

9. **Magic scales with gear** (PR-01). Staff upgrades and the forge raise spell damage, as they do for swords.
   *Recommend: yes (mage builds currently die after region one).*
10. **Perk forks with a respec** (PR-18), **mastery rewards at skill 15 and 20** (PR-20), and **transfer a temper**
    between items at the smith (PR-19). *Recommend: yes to all three.*
11. **Endgame gear leaves the starting village** (PR-11), **repairs cost by tier, and ranged and magic gear wears too**
    (PR-12), and **no skill XP for casting at nothing** (PR-15). *Recommend: yes.*
12. **New Game+ with things to earn** (PR-17, PR-24, PR-26). Bosses scale in NG+, NG+-only loot, an upgrade cap
    above +10, arena-exclusive rewards and a rarity-raising sink at the Great Anvil. *Recommend: yes, as one package.*

**World and quests**

13. **Weather per region** (WQ19, VX-19, AU20). Sandstorms in the Sunscorch, fog in the Fens, ash fall on the Peaks,
    each with its own look and sound. *Recommend: yes.*
14. **The world changes back** (WQ20, WQ26). Cleared camps get reoccupied, every hub has a bounty board, and regions
    show what you did. *Recommend: yes.*
15. **New quest shapes** (WQ21). One quest per region that isn't kill, fetch or boss: an escort, a mystery, a trail
    (WQ22). *Recommend: yes. I'd write a one-line pitch per region for you first.*
16. **Move three towns nearer their gates** (WQ7) and **hub people keep hours** (WQ25). *Recommend: yes to WQ7. WQ25
    is optional.*

**Story** (the most personal ones; I'd send you the actual text before anything goes in)

17. **One lore canon** (ST25, ST1, ST2). Rename Chapter 1's boss so there's only one Hollow King, and fix the Heart and
    chain lore. *Recommend: yes. I'd draft the canon page for your edit.*
18. **Chapter 1 doesn't say THE END** (ST3, ST4, ST12). It becomes "Chapter 1 complete", with the endings reworded.
    *Recommend: yes.*
19. **Pay off the Dreamer and make the Hollow King the real last chapter** (ST19, ST20). *Recommend: yes. This is the
    biggest story win.*
20. **Earlier choices colour the ending; a better Chapter 3 seal hunt; companions talk across the story** (ST21-23),
    plus **Ragna's backstory** (ST6) and **renames for clashing names** (ST9). *Recommend: yes, one at a time.*
21. **The shout says "FUS!"**, which is Skyrim's word (NP13). *Recommend: replace it with our own word. Pick one, or
    I'll suggest a few.*

**First hour**

22. **A starter quest, an always-on "next step" line** (NP3, NP20), and **an optional first-steps round at Bjorn's**
    (NP22). *Recommend: yes.*
23. **No wolf pack at the village exit, and no nemesis from your first death** (NP10, NP11, NP25). *Recommend: yes.*
24. **Show danger without locking on** (NP24), and **reorder the title menu for a first-time player** (NP27).
    *Recommend: yes.*

**Look and sound**

25. **Native art for the first three bosses** (VX-02), **a real werewolf** (VX-10), **golem bodies** (VX-27) and **a
    silhouette kit for humanoids** (VX-20). *Recommend: yes.*
26. **Presentation**: region title cards, a stronger title screen, pictures for the intro and the endings (VX-23 to
    VX-26). *Recommend: yes, after everything else.*
27. **Dusk, dawn and aurora** (VX-15), **natural borders** (VX-16) and **more props** (VX-22). *Recommend: yes.*
28. **Music variety**: night versions per region, longer and varied loops, separate dungeon and boss tracks, drums
    in phase 1, music that reacts to death and big events, and a fix for the out-of-key melody notes (AU14, AU15,
    AU17-19, AU24). *Recommend: yes, but you'd need to listen to each before it goes live.*

## How the work is split

Everything below runs as **agents in parallel, each in its own git worktree and branch**. I act as the integrator:
I merge in a fixed order, run the full suite, and publish. Each agent:
- runs only its own tests while working (`node test/run.mjs --only=<its tests> --jobs=1`), plus lint;
- hands back a branch, a list of `old -> new` numbers, and how you can try the change.

**Why Wave 0 must come first.** `GameScene.js`, `state.js`, `HudScene.js`, `tuning.js`, `config.js` and `run.mjs`
are touched by almost every feature (`code.md`, section D). Run agents in parallel before that's fixed and they'll
fight over the same lines.

### Wave 0: foundation (1 agent, no visible change)

| Agent | Items | Owns |
|---|---|---|
| **F: Foundation** | CH1, CH2, CH3 (the three real bugs); CH9 (spawner/ticker/listener registries in GameScene); CH13 (HUD listen helper); CH10 + CH11 (id and mixin collision checks, tile ids from one allocator); CH20 (tests auto-discovered); CH5 (every save field declared + a save round-trip test); CH4, CH6, CH7, CH8, CH12 (import cycles), CH17, CH19; AU02 (a test that every sound name exists) | GameScene, state.js, ui.js, HudScene listeners, config.js tile ids, run.mjs |

**Done when:**
- the suite and lint are green;
- adding a feature means registering it from its own file, not editing GameScene's switch.

### Wave 1: fixes (7 agents at once, no design changes)

Each agent owns its files outright. A shared file goes through its owner; anyone else sends a bus event or asks the
owner.

| Agent | Items | Owns |
|---|---|---|
| **C: Combat** | CB2, CB6, CB7, CB8, CB11, CB13, CB14, CB15, CB16, CB18, CB19, CB20 | Player.js, playerCombat/Bow/Magic, Enemy.js, Boss.js, Guardians*, PatternBoss |
| **E: Economy** | PR-02 to PR-07, PR-09, PR-10, PR-13, PR-14, PR-16, PR-21, PR-22, PR-25; CH14 (gold through addGold) | items*, genloot, stats, upgrades, sockets, sets, services*, shops data |
| **W: World** | WQ1 to WQ6, WQ8 to WQ14 (WQ13 includes NP4 fast travel); weather logic for WQ3, whose picture and sound go to art and audio | world/* (livingworld, events, regions*, weather), quest-marker logic, landmarks (Reach hash owner) |
| **S: Story text** | ST4, ST5, ST7, ST8, ST13, ST14 (+ NP12: key names from bindings), ST15, ST16, ST17, ST18, ST24 | data/*_story, npcs, lore, barks, dialogue text |
| **H: HUD and first hour** | NP1, NP2, NP5 to NP9, NP14 to NP19, NP21 (Field Guide), NP23, NP26; VX-05, VX-13, VX-14 | HudScene, MenuScene + tabs, tips, title |
| **A: Art** | VX-01, VX-03, VX-04, VX-06, VX-07, VX-08, VX-09, VX-11, VX-12 (picture), VX-17, VX-18 | art/* (sprites, anim, fx, native), lighting, snow/weather visuals, art baseline |
| **U: Audio** | AU01, AU03 to AU13, AU16, AU20 (beds), AU21, AU22, AU23 | audio/* |

**Merge order:** F, then E, C, W, S, H, A, U. Economy and combat go first because the balance pass in Wave 3 depends
on them.

**Hand-offs inside the wave**, through bus events defined in Wave 0, so no file is shared:
- the combat agent emits `status:on/off`; the art agent draws status effects on the enemy (VX-06), and the audio
  agent gives them sounds (AU13);
- the world agent emits `weather`; art and audio react to it.

### Wave 2: approved upgrades (same owners, after your answers)

| Agent | Items (only the ones you approve) |
|---|---|
| C: Combat | CB1, CB3, CB4, CB5, CB9, CB10, CB12, CB17, CB21 to CB27 |
| E: Economy | PR-01, PR-08 (upgrades stored per item), PR-11, PR-12, PR-15, PR-17 to PR-20, PR-23, PR-24, PR-26 |
| W: World | WQ7, WQ15 to WQ27 |
| S: Story | ST1 to ST3, ST6, ST9 to ST12, ST19 to ST23, ST25, NP13 |
| H: First hour | NP3, NP10, NP11, NP20, NP22, NP24, NP25, NP27 |
| A: Art | VX-02, VX-10, VX-15, VX-16, VX-19 to VX-27 |
| U: Audio | AU14, AU15, AU17, AU18, AU19, AU24, plus sounds for the new weather and bosses |

The 7 agents can run in two halves, so tests don't swamp the machine's 4 cores:
- first C, E, W and S, which change the most game logic;
- then H, A and U, which mostly touch presentation.

### Wave 3: balance and ship (integrator)

1. Balance bot before and after (CB28, PR-22's economy budget test), with `old -> new` for every number touched.
2. CH15, CH16 (split the largest files), CH18 (test gaps), and the rest of the lint warnings.
3. Full regression, docs (GUIDE, CHANGELOG, this file ticked), then publish to Pages and the artifact.

## What you'll be able to try after each wave

- **After Wave 0:** nothing looks different. The arena bug and the frozen-dialogue bug are gone.
- **After Wave 1:**
  - combat feels tighter: no dropped inputs, arrows and spells hit what you're locked on to, and bosses get harder in
    their last phase instead of easier;
  - loot is worth picking up, and gold can no longer be farmed;
  - quest markers point the right way, and warm regions have no blizzards;
  - the tutorial reads in order;
  - no white squares in warm regions;
  - every action has a sound.
- **After Wave 2:** the upgrades you chose.
- **After Wave 3:** a balanced, published build.
