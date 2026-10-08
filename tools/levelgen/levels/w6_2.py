"""World 6-2 (secret): COMET CLOCKWORKS - the Clockwhirl Works adrift in the nebula.
Short and hard: a tick-tock row over the void, a belt against you between zap
arcs with Sparkbots overhead, a tick-tock climb past a saw, then the gate.
Secrets: gem 0 high over the tick-tock row (a full jump), gem 1 at the
top of the tick-tock climb, gem 2 in a cog crate at the finish; the Snoozling
sits on the belt's far platform.
Regenerate: python3 tools/levelgen/levels/w6_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

GOLD, VIOLET = C(1.0, 0.85, 0.45), C(0.65, 0.5, 1.0)
L = LevelKit("CometClockworks", "Comet Clockworks", theme="nebula", horizon=0, scenery="nebula")
L.ambience("embers", 0.5)
L.ambience("stars", 0.7)

L.wall(-360, -1600, 600)
L.land([(-300, 0), (900, 0)], bottom=1500)
L.land([(2000, 0), (5500, 0), (5500, -600), (6300, -600), (6400, 0), (8200, 0)], bottom=1500)

# ---- S0 the dock (x -300..900) ------------------------------------------------------------------
L.sign(90, 0, "COMET CLOCKWORKS. The clock still\nstrikes thirteen out here...", 420)
L.deco("clock", 500, 0, 1.2)
L.lums(300, -110, 800, -110, 4, 40)

# ---- S1 the tick-tock row over the void (900..2000) ------------------------------------------------
L.checkpoint(780, 0)
L.pit_kill(900, 2000, 700)
for i, x in enumerate([1000, 1240, 1480, 1720]):
    L.beat(x, -40, 160, 32, group=i % 2)
L.lums(1060, -140, 1500, -140, 4, 30)
L.gem(1580, -215)                                  # gem 0, at the top of a full jump off the row
L.enemy("sparkbot", 1450, -380, travel=V(260, 0), speed=100.0)

# ---- S2 the belt between the zaps (2000..4200) -------------------------------------------------------
L.checkpoint(2100, 0)
L.block(2300, 0, 1400, 16, conveyor=-150.0)
L.zap(2650, -10, 2650, -240, on=0.9, off=1.4)
L.zap(3150, -10, 3150, -240, on=0.9, off=1.4, phase=0.5)
L.enemy("sparkbot", 2900, -400, travel=V(400, 0), speed=110.0)
L.enemy("windup", 3500, 0)
L.lums(2350, -100, 3650, -100, 10)
L.ledge(3850, -180, 220)
L.snoozling(3960, -180, fur=C(1.0, 0.8, 0.5))
L.enemy("springbot", 4100, 0)

# ---- S3 the tick-tock climb (4200..5500) -----------------------------------------------------------------
L.checkpoint(4300, 0)
for i, (x, y) in enumerate([(4560, -150), (4760, -300), (4960, -450), (5160, -600)]):
    L.beat(x, y, 140, 32, group=i % 2)
    L.lums(x + 30, y - 70, x + 110, y - 70, 2)
L.saw(4800, -700, waypoints=((300, 0),), speed=110.0)
L.gem(5580, -650)                                  # gem 1 at the top of the climb
L.checkpoint(5600, -600)
L.enemy("springbot", 6000, -600)

# ---- S4 down to the gate (6300..8200) ---------------------------------------------------------------------
L.checkpoint(6500, 0)
L.bell(6650, 0)
L.enemy("windup", 6900, 0)
# Gem 2: a cog crate - punch its cracked side. The path climbs over its lid.
L.breakable(7200, -140, 40, 140, lums=2)
L.block(7200, -160, 300, 20)
L.block(7480, -160, 20, 160)
L.gem(7340, -60)
L.secret(7240, -140, 240, 140)
L.goal(7800, 0)
L.lums(6750, -110, 7100, -110, 4, 30)
for x, c in [(2650, GOLD), (3150, GOLD), (5400, VIOLET), (7800, GOLD)]:
    L.glow(x, -300, c, radius=300, energy=0.6)
L.wall(8200, -1200, 0)

L.dress(-250, 850, "dream", spacing=170, seed=221)
L.dress(6420, 8150, "dream", spacing=170, seed=222, skip=[(6600, 6700), (7150, 7550), (7750, 7850)])
L.finish(spawn=(0, -2), left=-360, right=8260, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_2_comet_clockworks.tscn"))
