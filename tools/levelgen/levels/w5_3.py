"""World 5-3: SHIPWRECK COVE - an old galleon run aground in a sheltered cove.
Teaches: a broken rope bridge over the cove (fall in and swim), the galleon's
deck with tilting see-saws and a mast to climb, a choice between the upper deck
and the flooded hold below, the cannon battery that fires you over the rocks,
the captain's stern castle, a clam to the rigging, then the treasure beach.
Secrets: gem 0 in the crow's nest (climb the mast), gem 1 in the flooded hold's
treasure chest, gem 2 in a treasure chest at the finish; the Snoozling sits on
the stern castle.
Regenerate: python3 tools/levelgen/levels/w5_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

GOLD, TEAL = C(1.0, 0.85, 0.45), C(0.5, 1.0, 0.9)
L = LevelKit("ShipwreckCove", "Shipwreck Cove", theme="shipwreck", horizon=0, scenery="ocean")
L.ambience("bubbles", 0.4)

# The cove floor: the bridge pool, the galleon's flooded hold and the cannon gap.
L.wall(-360, -1400, 600)
L.land([(-300, 0), (1400, 0), (1420, 500), (2980, 500), (3000, 0),            # the cove under the bridge
        (5900, 0), (5920, 700), (8780, 700), (8800, 0), (9620, 0)], bottom=1500)
L.land([(10420, 0), (15500, 0)], bottom=1500)

# ---- S0 the dock (x -300..1400) ---------------------------------------------------------------------
L.sign(90, 0, "SHIPWRECK COVE. Arr! Something\nshiny sank with that old ship...", 420)
for x, k in [(420, "anchor"), (760, "shell"), (1150, "chest")]:
    L.deco(k, x, 0, 1.1)
L.lums(300, -110, 900, -110, 5, 40)
L.enemy("crabbit", 1250, 0)

# ---- S1 the broken bridge over the cove (1400..3000) ----------------------------------------------------
L.water(1420, 60, 1560, 440)
L.bridge(1400, 0, 3000, 0, broken=(9, 10, 22))
L.enemy("pufferfin", 2200, 300, travel=V(400, 0), speed=70.0)
L.lums(1500, -110, 2900, -110, 11, 50)
L.lums(1700, 380, 2700, 380, 6, 0)
for x in [1500, 2400, 2900]:
    L.deco("seaweed", x, 500, 1.2)

# ---- S2 the galleon's deck: see-saws and the mast (3000..5900) -------------------------------------------
L.checkpoint(3100, 0)
L.block(3300, -140, 200, 140)                      # crates up to the deck
L.terrain([(3500, -280), (5900, -280), (5900, 0), (3500, 0)], rounding=10.0)   # the hull
L.seesaw(4100, -280, 320)
L.enemy("crabbit", 4600, -280)
L.vine(5000, -900, 600)                            # the mast's rigging
L.ledge(5060, -790, 200)                           # gem 0: the crow's nest
L.gem(5160, -850)
L.lums(5000, -380, 5000, -800, 4)
L.lums(3550, -380, 4900, -380, 8, 30)
L.deco("anchor", 3700, -280, 1.0)
L.sign(5500, -280, "The HOLD is flooded - dive\nthrough the hatch for treasure!", 320)

# ---- S3 the upper deck over the flooded hold (5900..8800) -------------------------------------------------
L.block(6100, -280, 2400, 40)                      # the deck over the hold (the gap at 5900 is the hatch)
L.seesaw(7000, -280, 320)
L.enemy("crabbit", 7700, -280, facing=1)
L.lums(6300, -380, 8300, -380, 10, 30)
# ...and the hold below: swim for the treasure.
L.water(5920, 20, 2860, 680)
L.enemy("pufferfin", 6500, 300, travel=V(0, 250), speed=70.0)
L.enemy("pufferfin", 7900, 350, travel=V(0, -200), speed=70.0, phase=0.5)
L.enemy("eelectra", 8780, 560, facing=-1)
L.gem(7300, 620)                                   # gem 1 in the hold's treasure chest
L.deco("chest", 7300, 700, 1.3)
L.lums(6200, 420, 8500, 420, 12, -60)
for x in [6050, 6800, 8100]:
    L.deco("seaweed", x, 700, 1.4)
L.deco("anchor", 7700, 700, 1.2)
for x in [6600, 7300, 8000]:
    L.glow(x, 200, GOLD, radius=280, energy=0.5)

# ---- S4 the cannon battery (8800..10420) ---------------------------------------------------------------------
L.checkpoint(9000, 0)
L.bell(9200, 0)
L.cannon(9500, -50, rotation=60)
L.cannon(9950, -50, rotation=60, auto=0.35)
L.pit_kill(9620, 10420, 400)
L.lums(9600, -170, 10350, -170, 7, 90)
for x in [9700, 10050, 10300]:
    L.deco("rock", x, 380, 1.4)

# ---- S5 the stern castle (10420..13000) ------------------------------------------------------------------
L.checkpoint(10550, 0)
L.enemy("crabbit", 10950, 0)
L.block(11300, -140, 200, 140)
L.block(11500, -280, 200, 280)
L.block(11700, -420, 600, 420)                     # the captain's stern castle
L.snoozling(12000, -420, fur=C(1.0, 0.85, 0.5))
L.lums(11350, -240, 11650, -380, 3)
L.lums(11750, -520, 12250, -520, 5, 30)
L.clam(12750, 0, height=640)
L.ledge(12870, -540, 240)
L.lum_block(12990, -820, lums=5)
L.lums(12900, -620, 13080, -620, 3, 30)
L.enemy("pufferfin", 13300, -220, travel=V(220, 0), speed=60.0)

# ---- S6 the treasure beach and the gate (13000..15500) ---------------------------------------------------------
L.checkpoint(13500, 0)
L.enemy("crabbit", 13800, 0)
# Gem 2: a treasure chest - punch its cracked side. The path climbs over its lid.
L.breakable(14100, -140, 40, 140, lums=2)
L.block(14100, -160, 300, 20)
L.block(14380, -160, 20, 160)
L.gem(14240, -60)
L.secret(14140, -140, 240, 140)
L.goal(15050, 0)
L.lums(14500, -110, 14980, -110, 5, 30)
for x, k, s in [(13650, "anchor", 1.0), (14800, "shell", 1.0), (15300, "chest", 1.1), (15420, "palm", 1.2)]:
    L.deco(k, x, 0, s)
L.wall(15500, -1200, 0)

L.dress(-250, 15450, "wreck", spacing=170, seed=171, skip=[(1150, 1250), (1380, 3020), (3280, 3520), (5880, 8820),
        (9150, 9250), (9450, 10450), (11280, 12320), (12700, 12800), (14050, 14450), (15000, 15100)])
L.finish(spawn=(0, -2), left=-360, right=15560, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w5_3_shipwreck_cove.tscn"))
