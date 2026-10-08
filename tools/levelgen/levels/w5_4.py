"""World 5-4: KELP FOREST RAPIDS - a forest of giant kelp in a fast tidal river.
Teaches: climbing giant kelp up a sea cliff, a cliff-top pond with an Eelectra
and a kelp stalk to a high shelf, the RAPIDS (a strong current with kelp to
cling to and eels on the riverbed), log rafts down the lower channel, then a
kelp climb past jellybobs to the gate.
Secrets: gem 0 on the shelf above the cliff-top pond (climb its kelp), gem 1 in
the riverbed crevice behind an Eelectra, gem 2 in a hollow log at the finish;
the Snoozling sits on a rock reached by the last kelp stalk.
Regenerate: python3 tools/levelgen/levels/w5_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

TEAL = C(0.5, 1.0, 0.8)
L = LevelKit("KelpForestRapids", "Kelp Forest Rapids", theme="kelp", horizon=0, scenery="ocean")
L.ambience("bubbles", 0.6)

L.wall(-360, -1400, 600)
L.land([(-300, 0), (2400, 0), (2400, -600), (3000, -600), (3020, -300), (3580, -300), (3600, -600),   # the cliff and its pond
        (4200, -600), (5000, 0),
        (5000, 0), (5020, 600), (8980, 600), (9000, 0),                                              # the rapids
        (10000, 0), (10020, 500), (12480, 500), (12500, 0), (15500, 0)], bottom=1500)                 # the raft channel

# ---- S0 the kelp shore (x -300..1300) ----------------------------------------------------------------
L.sign(90, 0, "KELP FOREST RAPIDS. Mind the\ncurrent - it's a strong one!", 400)
for x, k in [(450, "seaweed"), (800, "shell"), (1150, "seaweed")]:
    L.deco(k, x, 0, 1.3)
L.lums(300, -110, 900, -110, 5, 40)
L.enemy("crabbit", 1250, 0)

# ---- S1 up the sea cliff on giant kelp (1300..2400) ------------------------------------------------------
L.checkpoint(1500, 0)
L.sign(1750, 0, "GIANT KELP: hold UP to climb,\nthen JUMP off at the top.", 300)
L.kelp(2300, -760, 760)
L.lums(2300, -150, 2300, -650, 5)
L.enemy("pufferfin", 2000, -350, travel=V(0, -200), speed=60.0)

# ---- S2 the cliff top and its pond (2400..5000) ------------------------------------------------------------
L.checkpoint(2550, -600)
L.water(3020, -580, 560, 280)
L.enemy("eelectra", 3030, -420, facing=1)
L.kelp(3300, -1060, 760)                           # gem 0: up the pond's kelp to the shelf
L.ledge(3360, -880, 200)
L.gem(3460, -940)
L.lums(3300, -620, 3300, -900, 3)
L.lums(3080, -380, 3520, -380, 4, -30)
L.enemy("crabbit", 3750, -600)
L.lums(4250, -620, 4900, -100, 5)
for x in [2700, 3800, 4100]:
    L.deco("coral", x, -600, 1.1)

# ---- S3 the rapids (5000..9000) ----------------------------------------------------------------------------
L.checkpoint(4180, -600)
L.sign(3950, -600, "RAPIDS! Swim with the flow -\ncling to the kelp to rest.", 300)
L.water(5020, 20, 3960, 580, current=(240, 0))
for x in [5900, 6900, 7900]:
    L.kelp(x, -320, 920)
    L.lums(x, -220, x, -40, 2)
L.enemy("eelectra", 6400, 560, facing=1)
L.enemy("pufferfin", 6600, 250, travel=V(0, 200), speed=70.0)
L.enemy("pufferfin", 7500, 350, travel=V(0, -220), speed=70.0, phase=0.5)
L.terrain([(8200, 600), (8200, 470), (8300, 440), (8340, 600)], rounding=10.0)     # the crevice's rock
L.enemy("eelectra", 8350, 580, facing=1)
L.gem(8560, 560)                                   # gem 1, in the crevice behind the eel
L.lums(5200, 200, 8800, 200, 18, 60)
for x in [5300, 6200, 7200, 8700]:
    L.deco("seaweed", x, 600, 1.5)
L.glow(8560, 520, TEAL, radius=240, energy=0.6)

# ---- S4 the river island (9000..10000) ---------------------------------------------------------------------
L.checkpoint(9150, 0)
L.bell(9350, 0)
L.enemy("crabbit", 9700, 0, facing=1)
L.lums(9450, -110, 9900, -110, 4, 30)

# ---- S5 the raft channel (10000..12500) ---------------------------------------------------------------------
L.water(10020, 20, 2460, 480, current=(150, 0))
for i in range(3):
    L.raft(10080, 20, width=190, travel=2250, current=150, offset=i / 3)
L.enemy("eelectra", 10600, 460, facing=1)
L.enemy("eelectra", 11700, 460, facing=-1)
L.lums(10200, -90, 12300, -90, 14)
for x in [10300, 11200, 12100]:
    L.deco("seaweed", x, 500, 1.4)

# ---- S6 the kelp meadow and the gate (12500..15500) ------------------------------------------------------------
L.checkpoint(12650, 0)
L.enemy("jellybob", 12950, -120, bob=30.0)
L.kelp(13300, -760, 760)
L.ledge(13360, -650, 220)
L.snoozling(13470, -650, fur=C(0.6, 1.0, 0.75))
L.lums(13300, -150, 13300, -600, 4)
L.enemy("crabbit", 13800, 0)
# Gem 2: a hollow log - punch its cracked end. The path climbs over it.
L.breakable(14200, -140, 40, 140, lums=2)
L.block(14200, -160, 300, 20)
L.block(14480, -160, 20, 160)
L.gem(14340, -60)
L.secret(14240, -140, 240, 140)
L.goal(15050, 0)
L.lums(14560, -110, 14980, -110, 4, 30)
for x, k, s in [(12800, "coral", 1.1), (13650, "seaweed", 1.4), (14800, "shell", 1.0), (15300, "coral", 1.2)]:
    L.deco(k, x, 0, s)
L.wall(15500, -1200, 0)

L.dress(-250, 15450, "reef", spacing=170, seed=181, skip=[(1200, 1300), (1700, 1800), (2250, 2420), (2980, 3620),
        (4600, 4950), (4980, 9020), (9300, 9400), (9980, 12520), (12900, 13000), (13250, 13350), (14150, 14550),
        (15000, 15100)])
L.finish(spawn=(0, -2), left=-360, right=15560, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w5_4_kelp_forest_rapids.tscn"))
