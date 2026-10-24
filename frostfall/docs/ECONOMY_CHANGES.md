# Economy pass: changes for Colin

## Changed numbers (old → new)
- **Selling**: bulk goods (ingots, ash iron, ember ore, lockpicks) sell at 0.5 → 0.25 of value. Floe Harpoon value 480 → 420.
- **Gold find**: items multiplied each other, up to about ×3.2 → they add up, capped at +60%. "of Plenty" +25% → 10 / 12.5 / 15% (17.5% from tier 3). The Court set's +15% did nothing → +15%.
- **Crit**: no cap → 50%. Bow crit no longer adds to melee crit.
- **Heavy armour speed**: generated Plate moveMul 0.94 → none, Greathelm 0.97 → none, Deepforged Plate 0.90 → none.
- **Generated loot**:
  - armour × (0.9 + 0.1×rarity mult) → × mult^0.5
  - block + 0 for rarity → × mult^0.25
  - affix strength stops growing at tier 2 → tier 3
  - generated staff spell power flat 1.1 → 1 + (0.1 + 0.12×tier)×mult, at most 1.9
- **Staves**: spell power from Hazel to Long Winter

  | Staff | Old | New |
  |---|---|---|
  | Hazel | 1.08 | 1.1 |
  | Frostbirch | 1.12 | 1.2 |
  | Reed-Warden | 1.15 | 1.4 |
  | Stormcrown | 1.18 | 1.45 |
  | Prism | 1.2 | 1.5 |
  | Cinder | 1.22 | 1.45 |
  | Tidecaller | 1.2 | 1.45 |
  | Sovereign's Scepter | 1.28 | 1.4 |
  | Delver's Lodestaff | 1.25 | 1.9 |
  | Long Winter | 1.35 | 2.1 |
  | Emberforged | 1.3 | 1.5 |

  - A staff's forge levels used to raise its poke → they raise spell power (+65% at +10).
  - A Ruby in a staff gives +4.5% spell power.
- **Repair**: cost per point of wear 0.15 + value/400 → 0.2 + 0.08 per forge level + value/2000 (at most 0.8). A +10 Sunbreaker costs 884 → about 295–340.
- **Wear**: bows 0 → 0.5 per shot, staves 0 → 0.25 per cast.
- **Arena wave gold**: 20 + 12×wave → the same × the story's gold scaling (wave 10: 140 → up to 420).
- **New Game+**: bosses had no NG scaling → +35% health and +12% damage per cycle. Patterned boss attacks only get the existing +6% damage taken. Ordinary enemies get a progress floor of 0.5 + 0.25 per further cycle, and loot rolls +1 tier per cycle. The forge cap is +10 → +12 in NG+.
- **Hilda's shop**: always on sale → gated by story progress (Warhammer 55%, Crossbow and Bulwark pieces 30%, Iron Halberd 10%).
- **Power model**: `readyTier`'s line moved from 0.8 to 0.9 of your health, now that the model counts character level correctly (PR-14).
- **New numbers**:
  - Respec: 150 + 50 per perk.
  - Transfer a temper: 25% of the levels' gold.
  - Ascend: 600 g + 2 ore / 1500 g + 3 ore + a shard / 3000 g + 5 ore + a Winter's Echo.
  - Fusing gems: 60 / 180 gold.
  - Spell XP needs an alerted enemy within 180 px.
  - Every reward amount moved into `TUNE.economy.rewards`.
  - Death keeps 0.9 of your gold (now `TUNE.economy.deathGoldKeep`).

## What is left undone
- **PR-24, partly done.** The campaign arena is done (wave gold that grows with the story, prizes at waves 10, 20 and 30). Arena Mode (quick play) still unlocks nothing from your score.
- **CH14, partly done.**
  - Dig-spot gold (Props.js) already went through addGold via the gold pickup, but its numbers (20 + random 30 + 25×tier) are still written inline, because other agents were editing Props.js.
  - `dialogue.js:314 S.gold += 0` is left as it is (it pays nothing).
  - Every reward now counts gold-find gear; this was decided without asking you. `addGold(n, { mul: false })` exists if you want some to pay flat.

## How to try the top 5
1. **Mage (PR-01)**: wear the Staff of the Long Winter (or Hazel early). At any smith, pick Forge, then WEAPON. The screen now reads "SPELLS +X% -> +Y%". Late enemies fall in about 5–7 Fireballs.
2. **Perk forks (PR-18/20)**: open the Perks tab. At skill 5 and 8 you pick one of two ("OR GUARDIAN"); the other turns grey. Pray at a shrine and choose "Unlearn your perks (N gold)" to respec. The Skills tab shows the next mastery reward from level 10.
3. **NG+ (PR-17/26)**: in Emberhold, at the Great Anvil's smith, choose "Ascend gear" to raise a Magic item to Rare. In NG+, beaten bosses toast "A WINTER'S ECHO LINGERS", Master temper goes to +12, and orange Mythic loot drops.
4. **Comparison and transfer (PR-21/19)**: pack rows show a green up or red down mark, and the details list CRIT, HITS AS FIRE, SOCKETS, set progress and "AT +6". Carry an old +6 weapon to any smith's forge menu and pick "Transfer a temper".
5. **No gold printer (PR-03)**: buy Ash Iron x3 from the Delvers for 36 g; it now sells for 7 g each. The Hollow Arena gives Victor's Token at wave 10.
