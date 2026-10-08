"""World 5-2: CORAL KINGDOM - coral towers rising out of a warm lagoon.
Teaches: hopping between reef towers (or swimming between them), Eelectras
lunging out of holes in the reef, a strong current that sweeps swimmers along
past bubble columns, a reef garden with clams, a deep tunnel under the great
coral wall, Jellybob trampolines up the coral cliffs, then the palace gate.
Secrets: gem 0 by the coral arch on the lagoon floor, gem 1 in a side niche of
the deep tunnel, gem 2 in a giant shell at the finish; the Snoozling sits on top
of the coral cliffs.
Regenerate: python3 tools/levelgen/levels/w5_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

PINK, TEAL = C(1.0, 0.6, 0.85), C(0.5, 1.0, 0.9)
L = LevelKit("CoralKingdom", "Coral Kingdom", theme="reef", horizon=0, scenery="ocean")
L.ambience("bubbles", 0.8)

# The seabed (lagoons carved in) and the land between them.
L.wall(-360, -1200, 600)
L.land([(-300, 0), (1200, 0), (1220, 700), (5180, 700), (5200, 0),             # lagoon A
        (7500, 0), (7520, 900), (10980, 900), (11000, 0),                      # lagoon B
        (11400, 0), (11600, -200), (12100, -200), (12100, -620), (13600, -620), (14400, 0), (16500, 0)],
       bottom=1600)

# ---- S0 the reef beach (x -300..1200) -------------------------------------------------------------
L.sign(90, 0, "CORAL KINGDOM. Hop the reef towers -\nor dive between them!", 400)
for x, k in [(420, "coral"), (700, "shell"), (950, "coral")]:
    L.deco(k, x, 0, 1.1)
L.lums(320, -110, 780, -110, 5, 40)

# ---- S1 lagoon A: reef towers and an Eelectra hole (1200..3050) -------------------------------------
L.water(1220, 20, 1830, 680)
for x0, top in [(1380, -60), (1800, -140), (2220, -60), (2640, -140)]:
    L.terrain([(x0, top), (x0 + 200, top), (x0 + 210, 700), (x0 - 10, 700)], rounding=16.0)
    if x0 != 2220:
        L.lums(x0 + 40, top - 90, x0 + 160, top - 90, 3, 30)
    L.deco("coral", x0 + 100, top, 0.9)
L.enemy("eelectra", 2110, 330, facing=1)
L.sign(1060, 0, "EELECTRAS lunge out of holes in\nthe reef - hit them while they're out!", 380)
L.enemy("pufferfin", 1750, 350, travel=V(0, 200), speed=60.0)

# ---- S2 the current: swept along past the bubble columns (3050..5200) ---------------------------------
L.checkpoint(2740, -140)
L.sign(2320, -60, "A CURRENT! Let it\nsweep you along.", 240)
L.water(3050, 20, 2130, 680, current=(170, 0))
for x in [3500, 4300]:
    L.bubbles(x, 20, 120, 680, rise=380)
L.terrain([(3800, 360), (4200, 360), (4200, 520), (4130, 520), (4130, 440), (3870, 440), (3870, 520), (3800, 520)],
          rounding=14.0)                           # a coral overhang
L.gem(4000, 620)                                   # gem 0 under the overhang
L.enemy("pufferfin", 3900, 200, travel=V(300, 0), speed=80.0)
L.enemy("pufferfin", 4700, 300, travel=V(0, 220), speed=70.0, phase=0.4)
L.lums(3200, 120, 5000, 120, 14, 40)
for x in [3300, 4600, 5050]:
    L.deco("seaweed", x, 700, 1.3)
L.deco("coral", 4000, 360, 1.2)

# ---- S3 the reef garden (5200..7500) ------------------------------------------------------------------
L.checkpoint(5300, 0)
L.clam(5700, 0, height=640)
L.terrain([(5800, -540), (6200, -540), (6200, -500), (5800, -500)], rounding=8.0)   # the reef shelf
L.lum_block(6000, -820, lums=5)
L.lums(5830, -620, 6170, -620, 4, 30)
L.enemy("crabbit", 6500, 0)
L.bell(6700, 0)
L.enemy("crabbit", 7200, 0, facing=1)
L.lums(6300, -110, 6900, -110, 6, 30)

# ---- S4 lagoon B: the deep tunnel under the great coral wall (7500..11000) ----------------------------
L.checkpoint(7350, 0)
L.sign(7100, 0, "Take a deep breath...\nthe tunnel is LONG!", 280)
L.water(7520, 20, 3460, 880)
L.terrain([(8400, -700), (9900, -700), (9900, 450), (8400, 450)], rounding=24.0)   # the great coral wall
L.terrain([(9100, 450), (9300, 450), (9300, 560), (9100, 560)], rounding=10.0)     # a niche's lip
L.gem(9200, 620)                                   # gem 1, tucked in the tunnel's side niche
L.enemy("eelectra", 8380, 600, facing=-1)
L.enemy("eelectra", 9920, 640, facing=1)
L.bubbles(10050, 20, 160, 880, rise=440)
L.lums(8500, 680, 9800, 680, 10, 20)
L.lums(10130, 100, 10130, 700, 5)
L.enemy("pufferfin", 7900, 400, travel=V(0, 300), speed=70.0)
for x in [7700, 8300, 10500, 10900]:
    L.deco("seaweed", x, 900, 1.4)
L.deco("coral", 8100, 900, 1.3)
L.deco("chest", 10700, 900, 1.0)
L.glow(9150, 650, TEAL, radius=300, energy=0.6)

# ---- S5 the coral cliffs: jelly trampolines up (11000..13600) -------------------------------------------
L.checkpoint(11100, 0)
L.ledge(11640, -360, 140)                          # hop up, then onto the jelly
L.enemy("jellybob", 11870, -380, bob=30.0)
L.snoozling(12800, -620, fur=C(1.0, 0.7, 0.9))
L.enemy("crabbit", 13100, -620)
L.lums(11760, -480, 12060, -740, 4)
L.lums(12200, -720, 13500, -720, 9, 30)

# ---- S6 down to the palace gate (13600..16500) ------------------------------------------------------
L.checkpoint(14500, 0)
# Gem 2: a giant shell - punch its cracked side. The path climbs over its top.
L.breakable(15000, -140, 40, 140, lums=2)
L.block(15000, -160, 300, 20)
L.block(15280, -160, 20, 160)
L.gem(15140, -60)
L.secret(15040, -140, 240, 140)
L.enemy("pufferfin", 15600, -220, travel=V(200, 0), speed=60.0)
L.goal(16050, 0)
L.lums(15450, -110, 15980, -110, 5, 30)
for x, k, s in [(14700, "coral", 1.3), (15800, "coral", 1.0), (16300, "chest", 1.0), (16420, "coral", 1.2)]:
    L.deco(k, x, 0, s)
L.wall(16500, -1200, 0)

L.dress(-250, 16450, "reef", spacing=170, seed=161, skip=[(1050, 1200), (1180, 5220), (5650, 5750), (6650, 6750),
        (7050, 11020), (14950, 15350), (16000, 16100)])
L.finish(spawn=(0, -2), left=-360, right=16560, bottom=1100, kill_y=1700)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w5_2_coral_kingdom.tscn"))
