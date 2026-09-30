"""World 1-3: MOSSY HOLLOW - deep under the hill. Dark, glowing, a bit spooky.
Teaches: timing past Puffcaps (or punching them between puffs), Wispets that
creep up when you look away, Diggle tunnels, riding geysers up a shaft under
falling stalactites, swimming an underground lake, and a bouncy-mushroom run
over brambles out into the daylight.
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
L.land([(10000, -150), (10000, -600), (10250, -650), (10600, -780), (11400, -780)], bottom=1400)
L.ceiling([(-300, -520), (300, -600), (700, -540), (1100, -620), (1300, -560), (1500, -370), (2500, -380), (2700, -560),
           (2750, -1150), (3850, -1150), (3850, -1000), (5360, -1000), (5360, -1650), (6600, -1650), (6600, -1450),
           (6900, -1450), (7400, -1000), (8600, -1000), (8900, -950), (9000, -1150), (10300, -1150), (10420, -1400)])

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
L.checkpoint(1260, -30)
L.sign(1420, 0, "PUFFCAPS puff spores. Wait for a gap,\nor punch them while they snooze.", 400)
for i, x in enumerate([1700, 2000, 2300]):
    L.enemy("puffcap", x, 0, phase=i * 0.9)
L.lums(1600, -120, 2450, -120, 10)
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
L.sign(10060, -600, "Daylight! Nearly home.", 280)
L.goal(10900, -780)
L.glow(10800, -1000, C(1.0, 0.92, 0.7), radius=900, energy=1.2)   # daylight pouring in
L.lums(10350, -880, 10750, -880, 5, 30)
L.deco("big_flower", 10700, -780)
L.deco("tree", 11150, -780, 1.2)
L.wall(11400, -2000, -780)

L.dress(-250, 11300, "cave", spacing=170, seed=31, skip=[(1600, 2450), (2750, 2860), (5450, 6100), (7600, 8600), (9000, 10000)])

L.finish(spawn=(0, -2), left=-360, right=11460, bottom=700, kill_y=1000)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_3_mossy_hollow.tscn"))
