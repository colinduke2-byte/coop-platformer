"""World 5-5: MIDNIGHT TRENCH - down into the dark where the sunlight never reaches.
Teaches: Anglerlings (you see the lure long before the teeth), diving under a
rock curtain into the deep, the rest island in the middle of the trench, the
glowing caverns (Eelectras in the walls, a bubble column up and out), then the
dark rim past jellybobs and a clam to the gate.
Secrets: gem 0 on the trench floor in the glowing coral, gem 1 in a sealed
grotto (swim in through the gap at its top), gem 2 in a sunken crate at the
finish; the Snoozling sits on the rest island's rock spire.
Regenerate: python3 tools/levelgen/levels/w5_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

TEAL, VIOLET, PINK = C(0.45, 1.0, 0.85), C(0.7, 0.55, 1.0), C(1.0, 0.55, 0.85)
L = LevelKit("MidnightTrench", "Midnight Trench", theme="trench", horizon=0, scenery="deep")
L.ambience("bubbles", 0.7, darkness=C(0.36, 0.42, 0.62))

# The rim, the two trenches (the rest island between them) and the far rim.
L.wall(-360, -1400, 600)
L.land([(-300, 0), (3000, 0), (3020, 1500), (5980, 1500), (6000, -40), (6600, -40), (6620, 1500),
        (9580, 1500), (9600, 0), (13600, 0)], bottom=2200)

# ---- S0 the trench rim (x -300..3000) -------------------------------------------------------------------
L.sign(90, 0, "MIDNIGHT TRENCH. It gets very\ndark down there... stay close!", 420)
for x, k in [(500, "coral"), (900, "anchor"), (1300, "coral")]:
    L.deco(k, x, 0, 1.1)
L.lums(300, -110, 1100, -110, 6, 40)
L.glow(700, -200, TEAL, radius=300, energy=0.6)
L.enemy("crabbit", 1500, 0)
L.checkpoint(1900, 0)
L.sign(2150, 0, "ANGLERLINGS: you'll see the light\nfirst - then the teeth! Stomp them.", 340)
L.enemy("anglerling", 2700, -200)
L.lums(2300, -110, 2900, -110, 4, 30)
L.glow(2600, -100, VIOLET, radius=260, energy=0.5)

# ---- S1 the first trench: under the rock curtain (3000..6000) ---------------------------------------------
L.water(3020, 20, 2960, 1480)
L.terrain([(3600, -300), (4000, -300), (4000, 900), (3800, 960), (3600, 900)], rounding=24.0)   # the rock curtain
L.lums(3300, 300, 3300, 900, 4)
L.lums(3500, 1100, 4100, 1100, 5, -40)
L.enemy("anglerling", 3400, 700)
L.enemy("pufferfin", 4500, 600, travel=V(0, 400), speed=80.0)
L.enemy("anglerling", 5200, 900)
L.gem(4600, 1440)                                  # gem 0 on the trench floor
L.deco("coral", 4600, 1500, 1.4)
L.glow(4600, 1380, PINK, radius=300, energy=0.9)
L.bubbles(5600, 20, 160, 1480, rise=440)
L.lums(5680, 200, 5680, 1300, 6)
L.lums(4300, 1200, 5400, 1200, 6, 40)
for x in [3200, 4200, 5000, 5800]:
    L.deco("seaweed", x, 1500, 1.5)
for x, c in [(3300, TEAL), (4200, VIOLET), (5300, TEAL)]:
    L.glow(x, 1100, c, radius=320, energy=0.6)

# ---- S2 the rest island (6000..6600) ------------------------------------------------------------------------
L.checkpoint(6150, -40)
L.bell(6300, -40)
L.block(6440, -280, 100, 240)                      # the rock spire
L.snoozling(6490, -280, fur=C(0.75, 0.7, 1.0))
L.lums(6100, -150, 6400, -150, 3)
L.glow(6300, -300, TEAL, radius=320, energy=0.7)

# ---- S3 the glowing caverns (6600..9600) ----------------------------------------------------------------------
L.water(6620, 20, 2960, 1480)
L.terrain([(7100, -300), (7500, -300), (7500, 1100), (7100, 1100)], rounding=24.0)         # second curtain
L.enemy("eelectra", 7090, 800, facing=-1)
L.enemy("eelectra", 7510, 1250, facing=1)
L.lums(6800, 400, 6800, 1200, 4)
L.lums(7200, 1300, 7800, 1300, 5, 30)
# The sealed grotto (gem 1): rock all round, a gap at its top-left corner.
L.terrain([(8000, 1100), (8200, 1100), (8200, 1160), (8060, 1160), (8060, 1440), (8600, 1440), (8600, 1100),
           (8660, 1100), (8660, 1500), (8000, 1500)], rounding=8.0)
L.block(8320, 1100, 340, 60)                       # the grotto's roof (the gap is 8200..8320)
L.gem(8360, 1380)
L.glow(8360, 1300, PINK, radius=220, energy=0.8)
L.enemy("anglerling", 8300, 700)
L.enemy("pufferfin", 8900, 800, travel=V(0, -400), speed=80.0, phase=0.3)
L.bubbles(9300, 20, 200, 1480, rise=460)
L.lums(9400, 200, 9400, 1300, 6)
for x in [6900, 7800, 8800, 9500]:
    L.deco("seaweed", x, 1500, 1.5)
for x, c in [(6900, VIOLET), (7900, TEAL), (8900, VIOLET)]:
    L.glow(x, 900, c, radius=320, energy=0.6)

# ---- S4 the dark rim and the gate (9600..13600) ------------------------------------------------------------
L.checkpoint(9750, 0)
L.enemy("anglerling", 10300, -250)
L.enemy("crabbit", 10600, 0)
L.clam(11000, 0, height=640)
L.ledge(11120, -540, 240)
L.lum_block(11240, -820, lums=5)
L.lums(11150, -620, 11330, -620, 3, 30)
L.enemy("jellybob", 11700, -120, bob=30.0)
L.enemy("anglerling", 12000, -300)
L.lums(10000, -110, 10800, -110, 6, 30)
# Gem 2: a sunken crate - punch its cracked side. The path climbs over it.
L.breakable(12300, -140, 40, 140, lums=2)
L.block(12300, -160, 300, 20)
L.block(12580, -160, 20, 160)
L.gem(12440, -60)
L.secret(12340, -140, 240, 140)
L.goal(13100, 0)
L.lums(12650, -110, 13030, -110, 4, 30)
for x, c in [(10000, TEAL), (11000, VIOLET), (12000, TEAL), (13100, PINK)]:
    L.glow(x, -200, c, radius=320, energy=0.6)
for x, k, s in [(9900, "coral", 1.2), (11500, "anchor", 1.0), (12900, "coral", 1.1), (13400, "chest", 1.0)]:
    L.deco(k, x, 0, s)
L.wall(13600, -1200, 0)

L.dress(-250, 13550, "reef", spacing=180, seed=191, skip=[(1850, 2350), (2980, 9620), (10950, 11050), (12250, 12650),
        (13050, 13150)])
L.finish(spawn=(0, -2), left=-360, right=13660, bottom=1700, kill_y=2100)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w5_5_midnight_trench.tscn"))
