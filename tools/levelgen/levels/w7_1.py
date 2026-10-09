"""World 7-1 (secret): STARFALL GARDENS - the Lullaby Woods and Frostwhistle Peaks, remixed as a nightmare.
Short and hard: crumbling stars over the void, a bramble garden with a living
trampoline, icy comet slabs over pits with a penguin and an owl, then the gate.
Secrets: gem 0 high on the arc between two crumbling stars, gem 1 on a shelf
above the bramble garden (a mushroom bounce), gem 2 in a star-chest at the
finish; the Snoozling sits on a ledge before the gate.
Regenerate: python3 tools/levelgen/levels/w7_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

PINK, VIOLET = C(1.0, 0.45, 0.7), C(0.65, 0.5, 1.0)
L = LevelKit("StarfallGardens", "Starfall Gardens", theme="nebula", horizon=0, scenery="nebula")
L.ambience("stars", 1.0)

L.wall(-360, -1400, 600)
L.land([(-300, 0), (900, 0)], bottom=1500)
L.land([(2600, 0), (4200, 0)], bottom=1500)
L.land([(4200, 0), (4700, 0)], bottom=1500, slippery=True)
L.land([(4950, 0), (5350, 0)], bottom=1500, slippery=True)
L.land([(5600, 0), (8000, 0)], bottom=1500)

# ---- S0 the edge of the nebula (x -300..900) -------------------------------------------------------
L.sign(90, 0, "NIGHTMARE NEBULA. Every dream\nat once - and none of them nice.", 420)
L.lums(300, -110, 800, -110, 4, 40)
L.glow(500, -200, VIOLET, radius=300, energy=0.6)

# ---- S1 crumbling stars over the void (900..2600) ---------------------------------------------------
L.checkpoint(780, 0)
L.pit_kill(900, 2600, 700)
for x, y in [(1100, 0), (1400, -40), (1700, -40), (2000, 0), (2300, 0)]:
    L.crumble(x, y, 144, respawn=2.0)
    L.lums(x + 30, y - 80, x + 114, y - 80, 2)
L.gem(1650, -200)                                  # gem 0, on the arc of a full jump
L.enemy("bumblebonk", 1850, -420)

# ---- S2 the bramble garden (2600..4200) ----------------------------------------------------------
L.checkpoint(2700, 0)
L.brambles(2950, -40, 160, 40)
L.enemy("spikeroo", 3250, 0)
L.brambles(3450, -40, 160, 40)
L.pad(3780, 0, height=640)
L.ledge(3680, -560, 200)                           # gem 1: the mushroom bounces you up here
L.gem(3780, -620)
L.enemy("ribbiton", 3980, 0)
L.enemy("shieldbug", 4120, 0)
L.lums(2700, -110, 2900, -110, 3)
L.lums(3100, -150, 3400, -150, 3, 30)
L.lums(3600, -150, 3950, -150, 4, 30)

# ---- S3 icy comet slabs (4200..6000) --------------------------------------------------------------
L.checkpoint(4300, 0)
L.pit_kill(4700, 4950, 700)
L.pit_kill(5350, 5600, 700)
L.enemy("slidgewick", 5200, 0)
L.enemy("snowl", 5000, -460)
L.lums(4720, -130, 4930, -130, 3, 40)
L.lums(5370, -130, 5580, -130, 3, 40)
for x in [4400, 5100, 5750]:
    L.deco("crystals", x, 0, 1.1)

# ---- S4 the starlit gate (6000..8000) ----------------------------------------------------------
L.checkpoint(6100, 0)
L.bell(6250, 0)
L.enemy("grunt", 6450, 0)
L.ledge(6650, -150, 200)
L.snoozling(6750, -150, fur=C(0.8, 0.6, 1.0))
L.enemy("bonkhorn", 6900, 0)
# Gem 2: a star-chest - punch its cracked side. The path climbs over it.
L.breakable(7100, -140, 40, 140, lums=2)
L.block(7100, -160, 300, 20)
L.block(7380, -160, 20, 160)
L.gem(7240, -60)
L.secret(7140, -140, 240, 140)
L.goal(7650, 0)
L.lums(6300, -110, 6600, -110, 3, 30)
L.lums(7450, -110, 7600, -110, 2)
for x, c in [(6300, PINK), (7240, VIOLET), (7650, PINK)]:
    L.glow(x, -250, c, radius=300, energy=0.6)
L.wall(8000, -1200, 0)

L.dress(-250, 850, "dream", spacing=170, seed=211)
L.dress(2620, 4180, "dream", spacing=170, seed=212, skip=[(2900, 3150), (3400, 3650), (3750, 3850)])
L.dress(6020, 7950, "dream", spacing=170, seed=213, skip=[(6200, 6300), (7050, 7450), (7600, 7700)])
L.finish(spawn=(0, -2), left=-360, right=8060, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_1_starfall_gardens.tscn"))
