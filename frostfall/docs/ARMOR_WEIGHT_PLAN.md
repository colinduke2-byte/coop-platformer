# Armour classes, carry weight and enemy health: plan

Status: PLAN ONLY. Nothing here is built yet. Decisions Colin should make are marked **DECIDE**.

## 1. Where we are today

- Armour has three weight classes already (`weight: 'light' | 'medium' | 'heavy'`, 10 / 14 / 13 pieces). The class only changes three things, set in `TUNE.player.weights`:
  - roll stamina cost: light x0.8, medium x1, heavy x1.3
  - knockback taken: light x1.25, medium x1, heavy x0.55
  - stamina regeneration: light x1.1, medium x1, heavy x0.85
- Some single pieces add their own `moveMul` (20 items) or `detectMul`. Heavy armour does not slow you down by class.
- Helmets have a weight class too (light / medium / heavy) but it does nothing yet.
- Only the body armour's class counts (`stats.weight()` reads the armour slot). A heavy helmet on a light robe changes nothing.
- The inventory has no weight and no limit. `addItem` always succeeds. There is a home stash chest (`StashChest`) to store extras.
- Enemy health today on Normal: difficulty x1.65, ordinary monsters x1.3 more (wolf ~60, bandit ~80, bear ~200, Jarl Valdrek ~495).

## 2. Armour classes with real trade-offs

Make light, medium and heavy three clearly different play styles, not just different numbers.

| | Light | Medium | Heavy |
|---|---|---|---|
| Armour value | lowest (about 5-18%) | middle (about 18-32%) | highest (about 28-40%) |
| Move speed | +6% | normal | -8% |
| Roll | cheap, long, fast recover | normal | costly, short, slow recover |
| Stamina regen | +10% | normal | -15% |
| Knockback taken | high (x1.25) | normal | low (x0.55) |
| Stealth | harder to spot (-10% detect) | normal | easier to spot (+15%) |
| Spell cost | cheaper for casters (robes) | normal | +10% mana cost |
| Carry capacity | -10 | normal | +20 |
| Noise | quiet steps | normal | loud steps wake sleepers sooner |

Rules:
- The class bonuses come from the class table in `TUNE`, not from per-item numbers, so changing one number retunes a whole class (golden rule: feel numbers in `tuning.js`).
- Per-item `moveMul`, `detectMul`, `manaCostMul` stay as extra flavour on top.
- Armour class is decided by the **body armour**. A **helmet adds a share**: each helmet contributes half of its own class's speed/regen/roll effect, so a heavy helm on a light robe is a small penalty, not a full one.
- Sets keep working. Matching all pieces of one class gives a small "full set" bonus (idea: light set +3% speed, heavy set +4% armour).
- **DECIDE:** should heavy armour be able to be too slow to roll out of danger (hard cap at -10% speed), or is -8% the right ceiling?

Implementation sketch:
1. Extend `TUNE.player.weights` with `move`, `detect`, `spellCost`, `carry`, `noise` per class.
2. `stats.js`: a `classMix()` helper that blends body armour (full weight) and helmet (half weight) into one multiplier set; use it wherever `stats.weight()` is used now (stamina regen, roll, knockback) and add move speed and detection.
3. `Player.js`: apply the move multiplier in `move()`, the roll feel in the roll state.
4. Item tooltips (`statLines`): show the class and its effects in plain words ("HEAVY: -8% SPEED, +20 CARRY").
5. Re-balance the 21 armours and 16 helmets against the new class table (check none is strictly worse).
6. Tests: each class changes speed, roll cost, regen and knockback as listed; a heavy helm on light armour is half the penalty; unarmoured = medium baseline.

## 3. Carry weight system

Goal: a reason to choose what to carry, without punishing exploration.

Design:
- Every item gets a weight in kg-like "stone" units (small whole numbers). Defaults by type, with overrides for notable items:

| Type | Default weight |
|---|---|
| potion, elixir, tome, note, gem, rune, charm | 0.5 (stack: 0.5 each) |
| food, ingredient | 0.25 each |
| arrows | 0.05 each |
| dagger / staff | 2 |
| sword / axe / mace / spear / bow | 3 to 5 |
| greatsword / halberd / warhammer | 7 to 10 |
| shield | 3 to 8 |
| helmet | 2 to 6 by class |
| armour | light 4, medium 8, heavy 14 |
| quest items | 0 (never weigh you down) |
| gold | 0 |

- Capacity: base 120 + 3 per point of Strength-like attribute (we have health, magic and stamina choices; **DECIDE** whether stamina counts as strength) + class bonus from armour (see above) + a few perks, charms and the Pony (mounted: +60) + home stash and shop storage are free.
- Equipped items count at half weight, so wearing heavy armour is cheaper than hauling it.
- Burden states, shown as a bar in the pack screen and a small icon on the HUD only when it matters:
  - up to 100% of capacity: normal
  - 100% to 125%: **Burdened**: -15% speed, stamina regen -20%, no sprint-style rolls beyond one
  - over 125%: **Overloaded**: -35% speed, can't roll, can't pick up more except gold and quest items
- Never block a pick-up silently. When you would go over the line, show "TOO HEAVY: DROP SOMETHING" and let the player drop (new action in the pack) or sell; quest items always fit.
- Loot pick-ups from chests: leave extra in the chest when over the hard cap rather than deleting anything.
- Selling, stash and drop actions in the pack screen get weight shown next to each item; sorting by weight added to the existing sorts.
- **DECIDE:** hard cap (can't carry more) or soft penalty only (slowdown, never blocked)? Recommended: soft penalty plus a hard cap at 125%.
- **DECIDE:** should arrows and potions have weight at all? Recommended: yes, tiny, so they matter only in bulk.

Implementation sketch:
1. `weight` field on items (data/items.js defaults by type in a single function, so 400+ items need no manual edits); explicit numbers for outliers.
2. New `systems/burden.js`: `carried()`, `capacity()`, `burdenLevel()`; recalculated when the inventory or equipment changes (hook into `recalc()` and `addItem`/`removeItem`).
3. `Player.move()` reads the burden multipliers; roll and regen use them too.
4. Pack screen: weight bar, weight column, a Drop action, a weight sort. HUD: small icon when Burdened/Overloaded only.
5. Generated loot (`genloot`) gets weights from its base type.
6. Save compatibility: no migration needed (weight is derived); existing saves may start Burdened, so on load never remove anything and show a one-time hint.
7. Tests: capacity maths, stack weights, equipped half-weight, each burden level changes speed and blocks as listed, quest items never block, old saves load, sort by weight works.

## 4. Enemy health

Current feel: you said enemies still need more health. Numbers are first guesses.

Proposal in steps, measured each time with the balance bot and your own play:
1. **Step 1 (recommended first):** Normal difficulty health x1.65 -> x2.0, ordinary-monster bonus stays +30%. Wolf ~72, bandit ~96, Jarl ~600.
2. **Step 2:** if fights still feel short, split bosses from monsters: bosses x1.8, monsters x2.0 (bosses take longer to learn, monsters shouldn't just be sponges).
3. **Step 3:** scale with the player: from character level 10 up, +2% enemy health per level above 9, capped at +40%, so a strong sword and good armour stay respectable without trivialising fights. (Optional.)
4. Keep damage as is (you said damage feels ok).
5. Give the sturdiest enemies (bear, troll, golem) their health raised by less than small ones, because they are already tanky, so the gap between a wolf and a bear doesn't vanish.
6. Easy and Hard keep the same proportions to Normal.
7. After each step: balance bot on early fights, then adjust the stage tests that assume health numbers (they now read max health instead of constants).
- The campaign-bot test is still failing from the last health increase; it needs to be taught potions and dodging or have its thresholds reviewed. **DECIDE** when (before or after this work).

## 5. Order of work and sizing

1. Enemy health step 1 (small, one number, measure) - first, since it is quick and you can play it right away.
2. Armour class table (medium): tuning, stats mix, move/roll/regen/detect/spell cost, tooltips, balance pass on 37 pieces, tests.
3. Item weights and capacity (large): data defaults, burden system, pack screen, HUD icon, drop action, tests.
4. Enemy health steps 2-3 once classes and burden change how fights feel.
5. Full regression, balance bot on the early fights, update docs and changelog, publish (artifact and GitHub copy).

Each step is a separate publish so you can feel it before the next one.

## 6. Risks

- Burden can feel bad if loot is plentiful: keep capacity generous and all gold, quest items and ingredients light; the stash and Pony are the pressure valves.
- Speed penalties stack (class x burden x armour piece). Cap the total move multiplier at x0.7 so you are never crawling.
- Heavy armour must stay worth it: more armour, knockback resistance and capacity should clearly beat the lost speed in a duel with a strong enemy.
- Many existing tests assume numbers (health, speed); each step will need small test updates.
