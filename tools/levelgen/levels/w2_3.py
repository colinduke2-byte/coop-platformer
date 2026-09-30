"""World 2-3: CRYSTAL CAVERNS - inside the mountain, lit only by glowing crystals.
Teaches: running an icicle corridor (they drop when you pass underneath), a
long slippery ice slide with tobogganing penguins, swimming a frozen lake past
spiky balls, climbing crystal ledges, ice pop-spikes and grinding ice crushers.
Secrets: gem 0 in an alcove in the corridor roof (mushroom launch), gem 1 on
the bottom of the frozen lake, gem 2 behind a cracked wall past the goal; the
Snoozling sleeps in a glowing grotto at the bottom of the lake.
Regenerate: python3 tools/levelgen/levels/w2_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("CrystalCaverns", "Crystal Caverns", theme="crystal", horizon=300, scenery="cave")
L.ambience("snow", 0.3, darkness=C(0.62, 0.68, 0.88))
L.ambience("fireflies", 0.5, tint=C(0.6, 0.9, 1.0))

TEAL, VIOLET, PINK = C(0.5, 0.95, 1.0), C(0.75, 0.55, 1.0), C(1.0, 0.6, 0.9)


def crystal(x, y, color, size=1.1):
    L.deco("crystals", x, y, size)
    L.glow(x, y - 40, color, radius=260 * size, energy=0.9)


# ---- Rock: floor and roof -------------------------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (3200, 0), (5000, 500), (5150, 520), (5150, 900), (6650, 900), (6650, 480), (7650, 480),
         (7650, -400), (10300, -400)], bottom=1500)
L.ceiling([(-300, -520), (1400, -520), (1420, -900), (1700, -900), (1720, -420), (3200, -420), (3350, -300),
           (5100, 80), (6600, 80), (6700, -900), (10300, -900)])

# ---- S0 the entrance (x -300..1400) -----------------------------------------------------------
L.sign(90, 0, "CRYSTAL CAVERNS. Deep inside the\nmountain... follow the glow.", 400)
crystal(500, 0, TEAL)
crystal(1150, 0, VIOLET, 0.9)
L.lums(300, -110, 1000, -110, 6, 30)
L.deco("icicles", 700, -520)
L.deco("icicles", 1250, -520, 0.8)

# ---- S1 the icicle corridor (1400..3200) -----------------------------------------------------
L.checkpoint(1300, 0)
L.sign(1800, 0, "ICICLES drop when you pass under.\nDon't stop!", 360)
for x in [2150, 2450, 2750, 3000]:
    L.stalactite(x, -420)
L.enemy("yetling", 3120, 0)
L.lums(2100, -110, 3000, -110, 8)
L.pad(1560, 0, height=780)
L.ledge(1480, -760, 160)                           # gem 0 in the roof alcove
L.gem(1560, -820)
crystal(1900, 0, PINK, 0.8)
crystal(2600, 0, TEAL, 0.8)

# ---- S2 the ice slide (3200..5150) --------------------------------------------------------------
L.checkpoint(3120, 0)
L.bell(3300, 0)
L.terrain([(3200, 0), (5000, 500), (5000, 540), (3200, 40)], rounding=4.0, slippery=True)
L.sign(3500, 83, "A slippery slide! Belly-slide\n(DOWN while running) for speed.", 380)
L.enemy("slidgewick", 3900, 194)
L.enemy("slidgewick", 4500, 361)
L.lums(3500, -20, 4950, 390, 14)
crystal(4300, 306, VIOLET)

# ---- S3 the frozen lake (5150..6650) ----------------------------------------------------------
L.water(5150, 500, 1500, 400)
L.spikeball(5750, 700, count=2, radius=120, speed=50)
L.spikeball(6250, 640, count=1, radius=110, speed=-60)
L.gem(5260, 860)                                   # on the lake bed
L.snoozling(6050, 900, fur=C(0.75, 0.9, 1.0))
crystal(5950, 900, TEAL)
crystal(6450, 900, PINK, 0.8)
L.lums(5300, 560, 6550, 560, 10)
L.sign(4900, 457, "A frozen lake! Dive in - but mind\nthe spiky balls.", 360)

# ---- S4 the crystal climb (6650..7650) --------------------------------------------------------
L.checkpoint(6720, 480)
for x, y in [(6960, 340), (7220, 200), (7060, 60), (7250, -80), (7080, -220)]:
    L.ledge(x, y, 170)
L.ledge(7360, -360, 290)                           # the last step runs right up to the cliff
L.enemy("snowl", 7100, -600)
L.lums(7040, 250, 7540, -390, 8)
crystal(6850, 480, VIOLET)

# ---- S5 spikes and crushers (7650..10300) ------------------------------------------------------
L.checkpoint(7720, -400)
for i, x in enumerate([8000, 8250, 8500]):
    L.pop_spikes(x, -400, length=168, up=1.0, down=1.6, phase=i * 0.45)
L.sign(7800, -400, "Ice spikes pop up in waves.\nThen: crushers!", 330)
for x in [8950, 9350]:
    L.crusher(x, -900, w=140, h=112, drop=388)
L.lums(8000, -520, 8700, -520, 7)
L.lums(8980, -470, 9460, -470, 4)
L.enemy("slidgewick", 9700, -400)
L.goal(9950, -400)
crystal(9750, -400, TEAL)
# Gem 2: behind the cracked wall past the goal.
L.breakable(10100, -700, 50, 300)
L.gem(10220, -470)
L.glow(10220, -520, PINK, radius=180, energy=0.7)

L.dress(-250, 10050, "icecave", spacing=190, seed=23,
        skip=[(1400, 1700), (3150, 5200), (5150, 6700), (7600, 7700), (7950, 8700), (8900, 9500)])
L.finish(spawn=(0, -2), left=-360, right=10300, bottom=1000, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_3_crystal_caverns.tscn"))
