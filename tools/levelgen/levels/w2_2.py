"""World 2-2: CABLECAR CLIFFS - up the mountain on the old ski lifts.
Teaches: riding chairlifts (they wait for a rider), crumbling ice ledges in a
gusty headwind, a Yetling lobbing snowballs at the chair, a slippery ice
staircase, bowling a Slidgewick with a snowball, a long zipline down, then a
third lift up to the Frost Fort: bowl the guards, break the ice gate, dodge
the Yetlings' snowballs.
Secrets: gem 0 above the first lift's cable (jump off the chair!), gem 1 up
over the ice staircase, gem 2 behind the cracked wall at the bottom station;
the Snoozling's cage hangs beside the second lift - punch it open mid-ride.
Regenerate: python3 tools/levelgen/levels/w2_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("CablecarCliffs", "Cablecar Cliffs", theme="gondola", horizon=-200, scenery="ice")
L.ambience("snow", 0.6)

# ---- S0 the base station (x -300..1200) --------------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (1200, 0), (1280, 400)], bottom=1500)
L.sign(90, 0, "CABLECAR CLIFFS. Hop on a chairlift -\nit waits for you!", 400)
L.deco("hut", 520, 0)
L.deco("skis", 700, 0)
L.deco("lantern", 1150, 0)
L.lums(250, -110, 950, -110, 6, 30)

# ---- S1 the first lift (1200..2540) --------------------------------------------------------------
L.pit_kill(1200, 2540, 1300)
L.gondola(1220, 0, waypoints=((1100, -600),), speed=170, wait=0.6, rider=True)
L.lums(1400, -220, 2250, -690, 8)
L.gem(1900, -600)                                  # jump off the chair halfway up

# ---- S2 the gusty ledges (2540..3850) ------------------------------------------------------------
L.land([(2470, 400), (2540, -600), (3000, -600), (3080, 400)], bottom=1500)
L.checkpoint(2600, -600)
L.deco("hut", 2860, -600, 0.8)
L.sign(2700, -600, "Crumbling ice in a headwind!\nKeep moving.", 340)
L.pit_kill(3000, 3850, 1300)
L.wind(3000, -1500, 850, 1300, wind=(-230, 0), gust=2.4)
for x, y in [(3080, -620), (3330, -660), (3590, -640)]:
    L.crumble(x, y, 150, respawn=2.0)
L.enemy("snowl", 3300, -1000)
L.lums(3100, -720, 3700, -740, 6, 40)

# ---- S3 the second lift (3850..5690) -------------------------------------------------------------
L.land([(3780, 400), (3850, -620), (4450, -620), (4530, 400)], bottom=1500)
L.checkpoint(3900, -620)
L.pit_kill(4450, 5690, 1300)
L.gondola(4470, -620, waypoints=((1000, -630),), speed=150, wait=0.8, rider=True)
L.snoozling(5040, -1110, hanging=True, fur=C(1.0, 0.8, 0.5))
L.lums(4650, -820, 5350, -1250, 7)
L.sign(4100, -620, "A Yetling up top throws snowballs\nat the chair. PUNCH them back!", 400)

# ---- S4 the upper station + ice staircase (5690..7700) --------------------------------------------
L.land([(5600, 400), (5690, -1250), (6400, -1250), (6500, 400)], bottom=1500)
L.checkpoint(5760, -1250)
L.enemy("yetling", 6250, -1250)
L.deco("hut", 6050, -1250, 0.9)
for x0, y in [(6520, -1400), (6920, -1550), (7320, -1700)]:
    L.terrain([(x0, y), (x0 + 260, y), (x0 + 250, y + 90), (x0 + 10, y + 90)], rounding=10.0, slippery=True)
L.lums(6560, -1480, 7520, -1780, 9)
L.gem(7450, -1870)                                  # a big jump off the top step
L.pit_kill(6400, 7700, 1300)
L.sign(6200, -1250, "Icy steps: land gently!", 280)

# ---- S5 the summit deck (7700..8700) -------------------------------------------------------------
L.land([(7600, 400), (7700, -1850), (8700, -1850), (8820, 400)], bottom=1500)
L.checkpoint(7760, -1850)
L.snowpile(7880, -1850)
L.bell(8050, -1850)
L.enemy("slidgewick", 8450, -1850)
L.lums(8150, -1950, 8600, -1950, 5)
L.deco("lantern", 8650, -1850)

# ---- S6 the long zipline down (8700..11200) ------------------------------------------------------
L.zipline(8690, -1920, 9950, -1030)
L.lums(8850, -1860, 9800, -1150, 10)
L.pit_kill(8700, 9800, 1300)
L.land([(9720, 400), (9800, -950), (11000, -950), (11250, -950)], bottom=1500)
L.checkpoint(9900, -950)
L.lums(10000, -1050, 10250, -1050, 3, 30)
L.deco("igloo", 10750, -950, 0.8)
# Gem 2: behind the cracked wall at the bottom station.
L.breakable(10960, -1150, 50, 200)
L.block(11010, -1170, 240, 20)
L.block(11250, -1170, 20, 220)
L.gem(11120, -1030)

# ---- S7 the third lift and the Frost Fort (10300..14600) -----------------------------------------
L.sign(10560, -950, "Last lift! Up to\nthe Frost Fort.", 220)
L.gondola(10300, -950, waypoints=((1280, -700),), speed=160, wait=0.8, rider=True)
L.pit_kill(11270, 11800, 1300)
L.lums(10500, -1150, 11500, -1700, 8)
L.enemy("snowl", 11100, -1900)
L.land([(11720, 400), (11780, -1650), (14600, -1650)], bottom=1500)
L.checkpoint(11850, -1650)
L.snowpile(12150, -1650, max_radius=95)
L.sign(11990, -1650, "THE FROST FORT!\nBowl the guards!", 240)
for x in [12450, 12570, 12690]:
    L.enemy("grunt", x, -1650, walk_speed=0.0, sight=0.0)
L.breakable(12900, -1850, 70, 200, iron=True)           # the packed-ice gate
L.block(12880, -1880, 110, 30)
L.lums(12300, -1760, 12800, -1760, 5)
L.checkpoint(13060, -1650)
L.block(13400, -1750, 40, 100)                          # snow walls the Yetlings hide behind
L.enemy("yetling", 13520, -1650)
L.block(13800, -1750, 40, 100)
L.enemy("yetling", 13920, -1650)
L.bell(13150, -1650)
L.lums(13250, -1840, 14100, -1840, 9)
L.sign(13620, -1650, "Yetlings! Punch their\nsnowballs back at them.", 300)
L.goal(14300, -1650)
L.deco("igloo", 14500, -1650, 0.9)
L.deco("lantern", 14150, -1650)
L.wall(14600, -2800, -1650)

L.dress(-250, 14550, "snow", spacing=170, seed=22, skip=[(1180, 2560), (2980, 3880), (4430, 5710), (6380, 7720), (8680, 9820),
        (10280, 11800), (12100, 12950), (13350, 14000)])
L.finish(spawn=(0, -2), left=-360, right=14660, bottom=1300, kill_y=1600)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_2_cablecar_cliffs.tscn"))
