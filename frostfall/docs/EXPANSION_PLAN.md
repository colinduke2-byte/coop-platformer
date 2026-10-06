# Frostfall expansion plan: bigger world, second city, more story

Decisions so far (from Colin): new regions beyond the Reach (Reach stays as is, old saves keep working);
second city is a **mountain forge-city**; story grows in all three ways (Chapter 3 after the Winter decision,
a longer middle, and factions whose choices matter); order of work is whatever builds the best game fastest.

## Approach: vertical slice first
Build the framework, one region, the city and the first part of Chapter 3 end to end (Phases 9-11), play it,
then spend the remaining effort where it pays off most. Each phase ends green (tests, balance, perf) and republished.

## Phase 9 - Region framework (foundation, no new content yet)
- Generalise `buildReach` into data-driven region definitions: size, biome palette/tiles, mob tier table, POI set, weather, music, ambience, travel gates.
- Regions are separate maps joined by passes/roads (the Reach is unchanged), each streamed like the Reach. Fast travel works between regions.
- World map tab: a region switcher; fog of war per region; waypoints.
- Save compatibility: all new state lives under new keys with defaults, so old saves load.
- Perf budget and a "every seed builds every region" world test.

## Phase 10 - Emberhold, the forge-city (vertical slice)
- A real city map: districts (Forge Row, Delvers' Quarter, the Hall, market, barracks, a mine gate), ~20 named NPCs with schedules, barks and a few lines of backstory each.
- Services: master smithing (new gear tier, reforging, set bonuses), gem and rune socketing, a guild board with contracts, new shops, a rest inn, a house you can buy.
- Three factions with reputation: the Anvil Court (rulers), the Delvers' Guild (miners), the Ember Wardens (soldiers). Reputation unlocks gear, quests and ending branches.
- First dungeon: the Deep Mines (new tileset, mining hazards, ore veins, a mine boss).

## Phase 11 - Chapter 3 story spine
- Opens after the Winter decision. Consequences differ per ending (Hearth / Winter King / Cold Bargain): who greets you, what the road looks like, which faction hates you.
- Main chain of about 10 quests across Emberhold and the first new region, with a mid-chapter reveal, a companion arc and a new boss.
- Epilogue and ending variants for Chapter 3 driven by faction standing and earlier choices.

## Phase 12 - New regions (3 total, ~160x120 each)
- Ashen Peaks (volcanic mountains around Emberhold): lava, ash storms, wyverns, a forge-giant boss.
- The Frozen Coast (ice shelf, wrecks, tide caves): new fishing, smugglers, a sea dungeon.
- The Old Kingdom (ruins of the Hollow Kings' capital): lore-heavy, ghost court, big late dungeon and final Chapter 3 confrontation.
- Each: 15-20 POIs, 2 dungeons, 1 roaming boss, unique loot, new wildlife.

## Phase 13 - Lengthen the existing campaign
- Quests and lore between the four Hearts, a travelling companion you can recruit, rival and nemesis story beats, side-quest chains for each village NPC.
- Reasons to revisit the Reach after Chapter 3 (changed world state, new events).

## Phase 14 - Breadth: new things to do
- ~12 new enemies, 3 new bosses, new weapon class (hammers/crossbow), new spells and shouts, rune and gem system, mining and smithing mini-games, mounts or faster travel, more music tracks and ambience, more cooking and potions.
- New game modes: boss rush, faction challenges, extra daily modifiers.

## Phase 15 - Balance, polish, docs
- Level and gear scaling across the whole game, New Game+ for the new content, accessibility pass, README and docs, full regression, monkey, publish.

## Estimates and risks
- Biggest risks: save size and load time with several large maps (mitigated by streaming and Phase 9 perf budget), content volume (mitigated by generators and shared tiles), and difficulty curve (balance bot per region).
- Effort ranking (largest first): Phase 12, 10, 11, 14, 13, 9, 15.

## Questions still open
1. Name and flavour of the forge-city and its three factions (I can propose names).
2. Chapter 3 tone: same epic/mythic, or darker and more political?
3. Should Chapter 3 be required to see a "true" ending, or optional content after the credits?
