"""World 5-1: SEASHELL SHORE - a sunny beach where the Deep Sea Dream begins.
Teaches: Crabbits (claw guards the front), tide pools that rise and fall, the
first dive under a rock arch with a Pufferfin, giant clams that fling you while
open, Jellybob trampolines over a bay, a bubble column up a sea-well to the
cliffs, then down the dunes to the gate.
Secrets: gem 0 on the bottom of the dive pool, gem 1 high above the jelly bay,
gem 2 in a sandcastle at the finish; the Snoozling sits on the sea stack.
Regenerate: python3 tools/levelgen/levels/w5_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

L = LevelKit("SeashellShore", "Seashell Shore", theme="shore", horizon=0, scenery="ocean")
L.ambience("petals", 0.3, tint=C(1, 1, 1, 0.5))

# One profile: the beach with its pools carved in, the sea-well and the cliffs.
L.wall(-360, -1200, 600)
L.land([(-300, 0), (1600, 0), (1620, 220), (2580, 220), (2600, 0),          # tide basin
        (3400, 0), (3420, 600), (4580, 600), (4600, 0),                      # dive pool
        (7400, 0), (7420, 500), (8980, 500), (9000, 0),                      # jelly bay
        (9500, 0), (9800, -150), (10300, -150), (10600, 0),                  # sea-stack dune
        (11540, 0), (11540, 200), (11800, 200), (11800, -800),               # the sea-well
        (13300, -800), (14400, 0), (16500, 0)], bottom=1500)

# ---- S0 the beach (x -300..1600) -----------------------------------------------------------------
L.sign(90, 0, "DEEP SEA DREAM! Sun, sand...\nand a whole ocean to explore.", 400)
L.deco("palm", 330, 0, 1.2)
L.lums(880, -110, 1080, -110, 3, 30)
L.sign(640, 0, "CRABBITS: the claw guards\ntheir front - jump on their backs!", 330)
L.enemy("crabbit", 1450, 0)

# ---- S1 the tide pools (1600..3200) -----------------------------------------------------------------
L.checkpoint(1500, 0)
L.tide(1620, 20, 960, 200, amplitude=140, period=8.0)
for x0 in [1700, 2000, 2300]:
    L.island(x0, x0 + 170, 60, depth=50)
L.sign(1300, 0, "TIDE POOLS rise and fall.\nHop the rocks - or swim!", 290)
L.lums(1720, -60, 2450, -60, 7, 30)
L.enemy("crabbit", 2900, 0)

# ---- S2 the first dive: under the rock arch (3400..4600) ---------------------------------------------
L.checkpoint(3150, 0)
L.sign(3260, 0, "Dive in and swim under\nthe arch! (JUMP = stroke)", 300)
L.water(3420, 20, 1160, 580)
L.block(3800, -160, 400, 460)                      # the rock arch (swim under it)
L.enemy("pufferfin", 3600, 420, travel=V(0, -220), speed=70.0)
L.enemy("pufferfin", 4350, 380, travel=V(0, 160), speed=70.0, phase=0.5)
L.sign(3000, 0, "PUFFERFINS puff into spiky balls -\npop them while they're small!", 360)
L.gem(4500, 560)                                   # gem 0 on the pool floor
L.lums(3500, 480, 4500, 480, 9, -40)
for x in [3450, 4560]:
    L.deco("seaweed", x, 600, 1.1)
L.deco("coral", 4000, 600, 1.2)

# ---- S3 the clam dunes (4600..7400) ------------------------------------------------------------------
L.checkpoint(4700, 0)
L.sign(4920, 0, "Giant CLAMS: land on the pearl\nwhile it's OPEN - boing!", 300)
L.clam(5300, 0, height=640)
L.ledge(5420, -540, 260)
L.lums(5450, -620, 5650, -620, 4, 30)
L.lum_block(5550, -820, lums=5)
L.enemy("crabbit", 5950, 0)
L.clam(6450, 0, phase=1.2, height=640)
L.ledge(6560, -540, 220)
L.lums(6580, -620, 6740, -620, 3, 30)
L.enemy("crabbit", 7100, 0, facing=1)
L.lums(5450, -110, 6850, -110, 8, 20)

# ---- S4 the jellyfish bay (7400..9000) ---------------------------------------------------------------
L.checkpoint(7250, 0)
L.sign(7060, 0, "JELLYBOBS: bounce on their\ntops - the tendrils sting!", 290)
L.water(7420, 20, 1560, 480)
for i, x in enumerate([7650, 8000, 8350, 8700]):
    L.enemy("jellybob", x, -40, phase=i * 0.25)
L.gem(8180, -400)                                  # gem 1, a big bounce up
L.lums(7650, -260, 8700, -260, 8, 60)
L.deco("coral", 7700, 500, 1.1)
L.deco("seaweed", 8500, 500, 1.2)

# ---- S5 the sea-stack dune (9000..11500) -------------------------------------------------------------
L.checkpoint(9100, 0)
L.bell(9300, 0)
L.snoozling(10050, -150, fur=C(0.6, 0.9, 1.0))
L.enemy("crabbit", 10300, -150)
L.enemy("pufferfin", 10900, -200, travel=V(260, 0), speed=60.0)
L.lums(9400, -110, 9700, -110, 3)
L.lums(9850, -260, 10250, -260, 4)
L.lums(10650, -110, 10850, -110, 3)
for x, k in [(9700, "anchor"), (10500, "shell"), (11000, "palm"), (11300, "starfish")]:
    L.deco(k, x, L.surface_y(x), 1.0)

# ---- S6 the sea-well: a bubble column up to the cliffs (11500..11800) ---------------------------------
L.checkpoint(11250, 0)
L.sign(11050, 0, "A sea-well! Swim in - the\nBUBBLES carry you up.", 300)
L.block(11480, -800, 60, 690)                      # the well's wall (duck in underneath)
L.water(11540, -800, 260, 1000)
L.bubbles(11560, -800, 220, 1000, rise=420)
L.lums(11670, -100, 11670, -700, 6)

# ---- S7 the cliffs and down the dunes to the gate (11800..16500) --------------------------------------
L.checkpoint(11900, -800)
L.enemy("crabbit", 12600, -800)
L.lums(12000, -900, 13200, -900, 9, 30)
L.enemy("jellybob", 13800, -700)
L.lums(13400, -930, 14300, -230, 7)
L.checkpoint(14600, 0)
# Gem 2: a sandcastle - punch through its door. The path climbs over its top.
L.breakable(15000, -140, 40, 140, lums=2)
L.block(15000, -160, 300, 20)
L.block(15280, -160, 20, 160)
L.gem(15140, -60)
L.secret(15040, -140, 240, 140)
L.goal(16050, 0)
L.lums(15500, -110, 15980, -110, 5, 30)
for x, k, s in [(14800, "palm", 1.1), (15700, "shell", 1.0), (16300, "palm", 1.2), (16420, "chest", 0.9)]:
    L.deco(k, x, 0, s)
L.wall(16500, -1200, 0)

L.dress(-250, 16450, "beach", spacing=170, seed=151, skip=[(1100, 1200), (1580, 2620), (2950, 3050), (3380, 4620),
        (5250, 5350), (6400, 6500), (7380, 9020), (11000, 11820), (14950, 15350), (16000, 16100)])
L.finish(spawn=(0, -2), left=-360, right=16560, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w5_1_seashell_shore.tscn"))
