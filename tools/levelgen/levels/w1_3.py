"""World 1-3: MOSSY HOLLOW - deep under the hill. Dark, glowing, a bit spooky.
Teaches: timing past Puffcaps (or punching them between puffs), Wispets that
creep up when you look away, Diggle tunnels, riding geysers up a shaft under
falling stalactites, swimming an underground lake, and a bouncy-mushroom run
over brambles, then the Glowroot Chasm (a broken rope bridge under loose
stalactites) and the glow-worm grotto up and out into the daylight.
Secrets: gem 0 on a high ledge in the Wispet chamber (mushroom launch), gem 1
behind a cracked wall at the end of the mole tunnel, gem 2 on a ledge beside
the top of the geyser shaft (vine climb); the Snoozling sleeps at the bottom of
the underground lake.
Regenerate: python3 tools/levelgen/levels/w1_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("MossyHollow", "Mossy Hollow", theme="hollow", horizon=300, scenery="cave")
L.ambience("fireflies", 1.2, darkness=C(0.5, 0.48, 0.66))
L.ambience("spores", 0.8)

PINK, TEAL, VIOLET = C(1.0, 0.55, 0.85), C(0.5, 1.0, 0.85), C(0.75, 0.55, 1.0)


def shroom(x, y, color, size=1.0):
    """A giant glowing mushroom with its own light."""
    L.deco("giant_mushroom", x, y, size)
    L.glow(x, y - 130 * size, color, radius=320 * size, energy=0.9)


def crystal(x, y, color):
    L.deco("crystals", x, y, 1.1)
    L.glow(x, y - 40, color, radius=220, energy=0.8)


# ---- Rock: the whole cave floor and roof -----------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (600, 0), (800, -30), (1300, -30), (1400, 0), (2700, 0), (3850, 0), (3850, -660), (4950, -660)])
L.land([(4950, 0), (6600, 0), (6600, -1100), (6900, -1100), (7400, -640), (7600, -600), (7650, -200), (8550, -200),
        (8600, -600), (9000, -600), (9000, -150), (10000, -150)], bottom=1400)
L.land([(10000, -150), (10000, -600), (10250, -650), (10600, -780), (11600, -780)], bottom=1400)
L.land([(12400, -780), (13450, -780), (13700, -880), (14000, -1000), (15200, -1000)], bottom=1400)
L.ceiling([(-300, -520), (300, -600), (700, -540), (1100, -620), (1300, -560), (1500, -370), (2500, -380), (2700, -560),
           (2750, -1150), (3850, -1150), (3850, -1000), (5360, -1000), (5360, -1650), (6600, -1650), (6600, -1450),
           (6900, -1450), (7400, -1000), (8600, -1000), (8900, -950), (9000, -1150), (10300, -1150), (10700, -1250),
           (13550, -1250), (13750, -1300), (14000, -1600)])

# ---- S0 the glowing entrance (x -300..1300) ---------------------------------------------------
L.sign(60, 0, "MOSSY HOLLOW. It's dark down here -\nstick together and follow the glow.", 420)
shroom(260, 0, PINK)
shroom(900, -30, TEAL, 0.8)
L.bell(1120, -30)                                # a Lum Rush for the Puffcap corridor
crystal(620, -10, VIOLET)
L.lums(380, -120, 900, -150, 6, 30)
L.deco("hanging_vines", 450, -575)
L.deco("hanging_vines", 1150, -600, 0.8)

# ---- S1 the Puffcap corridor (1300..2700) -----------------------------------------------------
L.checkpoint(1230, -30)
L.sign(1460, 0, "PUFFCAPS puff spores.\nWait, or punch them!", 300)
for i, x in enumerate([1700, 2000, 2300]):
    L.enemy("puffcap", x, 0, phase=i * 0.9)
L.lums(1660, -120, 2450, -120, 9)
crystal(1550, 0, TEAL)
crystal(2600, 0, PINK)
L.deco("roots", 1800, -372)
L.deco("roots", 2200, -378)

# ---- S2 the Wispet chamber (2700..3850) -------------------------------------------------------
L.sign(2900, 0, "WISPETS only move when you look away.\nFace them... then PUNCH!", 400)
for x, y in [(3000, -180), (3250, -340), (3500, -500), (3700, -640)]:
    L.ledge(x, y, 180)
L.enemy("wispet", 3150, -700)
L.enemy("wispet", 3650, -300)
L.pad(2800, 0, height=980)
L.ledge(2720, -990, 170)
L.gem(2805, -1050)
L.lums(2800, -200, 2800, -900, 7)
L.lums(3080, -250, 3780, -700, 6)
shroom(3400, 0, VIOLET, 1.2)
crystal(3800, -10, TEAL)

# ---- S3 Diggle's tunnel (3850..5360) ----------------------------------------------------------
L.checkpoint(3930, -660)
for x in [4250, 4600]:
    L.enemy("diggle", x, -660)
L.crate(4420, -660, 64, lums=4)
L.lums(4050, -760, 4880, -760, 8)
# The floor ends at 4950: drop into the shaft. Beyond the hole, a cracked wall hides gem 1.
L.block(5100, -660, 260, 60)
L.breakable(5160, -1000, 50, 340)
L.gem(5290, -730)
L.block(5360, -1000, 40, 400)
L.sign(4700, -660, "Drop down the hole... (but what's\nbehind that cracked wall?)", 380)
crystal(4100, -660, PINK)

# ---- S4 the geyser shaft (4950..6600) ---------------------------------------------------------
L.checkpoint(5250, 0)
L.sign(5380, 0, "GEYSERS launch you up. Watch the\nstalactites overhead!", 380)
L.geyser(5550, 0, height=760, calm=1.4)
L.ledge(5650, -780, 220)
L.geyser(6000, -780, height=620, calm=1.4, phase=1.0)
L.block(5880, -780, 280, 30)
L.ledge(6250, -1150, 250)
for x in [5780, 6420]:                             # beside the geyser columns, not over them
    L.stalactite(x, -1640, ice=False)
L.ledge(5400, -1380, 170)                          # side ledge with gem 2 (glide over from geyser 2's plume)
L.gem(5480, -1440)
L.lums(5550, -150, 5550, -700, 6)
L.lums(6000, -900, 6000, -1350, 5)
shroom(6350, 0, TEAL, 1.1)
crystal(5100, 0, VIOLET)

# ---- S5 the underground lake (6600..9000) -----------------------------------------------------
L.checkpoint(6620, -1100)
L.water(7600, -600, 1000, 420)
L.island(8000, 8170, -640, depth=80)
L.enemy("puffcap", 8085, -640, phase=0.5)
L.snoozling(8380, -200, fur=C(0.6, 0.9, 1.0))
L.lums(7700, -420, 8500, -300, 8, 60)
L.sign(6870, -1100, "Underground lake!\nDive in - something glows.", 300)
crystal(7750, -200, TEAL)
crystal(8500, -200, PINK)
shroom(8800, -600, PINK, 0.9)

# ---- S6 mushroom hop over the brambles (9000..10400) and out into the light ---------------------
L.checkpoint(8920, -600)
L.brambles(9000, -300, 1000, 150)
# Spaced one bounce-arc apart (~430 px at run speed), so holding forward chains them.
for x, top, h in [(9080, -400, 420), (9510, -420, 560)]:
    L.block(x, top, 100, 60)                        # pad-sized pillars: every landing bounces
    L.pad(x + 50, top, height=h)
L.enemy("wispet", 9500, -900)
L.lums(9150, -700, 9950, -700, 8, -80)
L.lums(10350, -880, 10750, -880, 5, 30)
shroom(10900, -780, VIOLET, 1.0)

# ---- S7 the Glowroot Chasm (11000..12400) --------------------------------------------------------
L.checkpoint(11050, -780)
L.sign(11250, -780, "A rickety old bridge. Mind\nthe gap - and the rocks above!", 360)
L.bridge(11600, -780, 12400, -780, broken=(8, 9), slack=30.0)
L.brambles(11600, 60, 800, 160)
L.pit_kill(11600, 12400, 420)
for x in [11850, 12200]:
    L.stalactite(x, -1240, ice=False)
L.enemy("wispet", 12000, -1050)
L.lums(11650, -880, 12350, -880, 9, 40)
crystal(11700, 60, TEAL)
crystal(12300, 60, PINK)
L.glow(12000, -300, C(0.6, 1.0, 0.8), radius=600, energy=0.8)   # the brambles glow far below
L.deco("hanging_vines", 11750, -1245, 0.9)
L.deco("hanging_vines", 12300, -1250, 0.8)

# ---- S8 the glow-worm grotto (12400..13600) and out into the daylight ------------------------------
L.checkpoint(12480, -780)
for i, x in enumerate([12780, 13080]):
    L.enemy("puffcap", x, -780, phase=i * 1.1)
L.enemy("diggle", 13330, -780)
L.lum_block(12920, -1090, lums=6)
L.crate(12600, -780, 64, lums=3)
L.lums(12700, -900, 13300, -900, 7, 30)
shroom(12650, -780, PINK, 0.9)
crystal(13250, -780, VIOLET)
L.sign(13900, -960, "Daylight! Nearly home.", 280)
L.goal(14750, -1000)
L.glow(14650, -1250, C(1.0, 0.92, 0.7), radius=1000, energy=1.2)   # daylight pouring in
L.lums(14100, -1100, 14550, -1100, 5, 30)
L.deco("big_flower", 14500, -1000)
L.deco("tree", 15000, -1000, 1.2)
L.wall(15200, -2400, -1000)

L.dress(-250, 15100, "cave", spacing=170, seed=31, skip=[(1600, 2450), (2750, 2860), (5450, 6100), (7600, 8600),
        (9000, 10000), (11550, 12450), (12550, 13400)])

L.finish(spawn=(0, -2), left=-360, right=15260, bottom=700, kill_y=1000)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_3_mossy_hollow.tscn"))
