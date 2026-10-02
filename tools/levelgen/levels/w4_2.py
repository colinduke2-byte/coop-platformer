"""World 4-2: CONVEYOR CHAOS - the toy assembly hall, all belts, crushers and sparks.
Teaches: running against conveyor belts under ceiling crushers, zap arcs with
Sparkbots zipping between them, an elevator up to the catwalks, tick-tock
blocks across the gap in the catwalk, then the sorting line (Springbots riding
belts, saw blades on rails) and the gate.
Secrets: gem 0 on the shelf above the zap arcs (tick-tock steps), gem 1 at the
far end of the catwalk, gem 2 in a parts crate at the finish; the Snoozling
waits on the catwalk.
Regenerate: python3 tools/levelgen/levels/w4_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

L = LevelKit("ConveyorChaos", "Conveyor Chaos", theme="conveyor", horizon=0, scenery="factory")
L.ambience("embers", 0.6)

# ---- S0 the loading dock (x -300..1500) -------------------------------------------------------
L.wall(-360, -1200, 600)
L.land([(-300, 0), (1700, 0), (1700, 16), (3100, 16), (3100, 0), (5110, 0), (5110, 30), (5330, 30), (5330, 0),
        (6640, 0)], bottom=1500)
L.sign(90, 0, "CONVEYOR CHAOS! The toy assembly hall.\nMind the belts - and what's above them.", 440)
L.deco("toyblocks", 600, 0, 1.2)
L.deco("pipes", 900, 0)
L.lums(300, -110, 1100, -110, 6, 40)
L.enemy("windup", 1300, 0)

# ---- S1 belts under the crushers (1500..3200) -------------------------------------------------------
L.ceiling([(1500, -900), (1510, -420), (3300, -420), (3310, -900)], top=-2600)
L.backwall(1500, -900, 1800, 900, shade=0.5)
L.block(1700, 0, 1400, 16, conveyor=-140.0)        # one long belt running against you
for x in [1950, 2400, 2850]:
    L.crusher(x, -420, w=140, h=112, drop=292)
L.lums(1800, -100, 3000, -100, 10)

# ---- S2 zap arcs and Sparkbots (3200..4800) --------------------------------------------------------
L.checkpoint(3360, 0)
L.sign(3480, 0, "Zaps and Sparkbots! Punch the\nSparkbots - never stomp them.", 380)
for i, x in enumerate([3900, 4300, 4700]):
    L.zap(x, -10, x, -240, on=0.9, off=1.5, phase=i * 0.25)
L.enemy("sparkbot", 4100, -80, travel=V(0, -150), speed=110.0)
L.enemy("sparkbot", 4500, -80, travel=V(0, -150), speed=110.0, phase=0.5)
L.lums(3850, -110, 4750, -110, 8, 20)
# Gem 0: tick-tock steps up to a shelf.
L.beat(3600, -160, 140, 32, group=0)
L.beat(3800, -310, 140, 32, group=1)
L.ledge(3990, -460, 200)
L.gem(4090, -520)

# ---- S3 the elevator up to the catwalks (4800..6600) --------------------------------------------------
L.checkpoint(4800, 0)
L.sign(5000, 0, "Ride the lift\nup!", 200)
L.moving(5120, 0, w=200, h=30, waypoints=((0, -600),), speed=170, wait=1.0, rider=True)   # sits in a notch
L.block(5340, -600, 1300, 40)                      # the catwalk
L.snoozling(5700, -600, fur=C(0.6, 0.9, 1.0))
L.enemy("windup", 6100, -600)
L.lums(5400, -700, 6500, -700, 9, 20)
L.lums(5220, -150, 5220, -500, 4)

# ---- S4 tick-tock blocks over the catwalk gap (6600..7700) -----------------------------------------------
L.pit_kill(6640, 7600, 700)
for i, x in enumerate([6680, 6920, 7160, 7400]):
    L.beat(x, -640, 160, 32, group=i % 2)
L.lums(6740, -730, 7460, -730, 7, 30)

# ---- S5 down the ramp to the sorting line (7600..10200) ----------------------------------------------------
L.land([(7600, -600), (8200, -600), (9000, 0), (9400, 0), (9400, 16), (9900, 16), (9900, 0), (12600, 0)], bottom=1500)
L.checkpoint(7680, -600)
L.gem(8150, -650)                                  # gem 1 at the end of the catwalk
L.enemy("springbot", 8700, -150)
L.checkpoint(9100, 0)
L.block(9400, 0, 500, 16, conveyor=180.0)
L.enemy("springbot", 9650, 0)
L.saw(9950, -130, waypoints=((0, -160),), speed=120.0)
L.lums(9150, -110, 10150, -110, 9, 20)

# ---- S6 the finish (10200..12600) ------------------------------------------------------------------------
L.checkpoint(10300, 0)
L.bell(10420, 0)
# Gem 2: a parts crate - punch its cracked side. The path climbs over its lid.
L.breakable(10800, -140, 40, 140, lums=2)
L.block(10800, -160, 300, 20)
L.block(11080, -160, 20, 160)
L.gem(10940, -60)
L.secret(10840, -140, 240, 140)
L.enemy("windup", 11500, 0)
L.goal(12200, 0)
L.lums(11800, -110, 12130, -110, 4, 30)
L.deco("clock", 12420, 0, 1.1)
L.wall(12600, -1200, 0)

L.dress(-250, 1450, "factory", spacing=160, seed=81)
L.dress(3220, 4860, "factory", spacing=170, seed=82, skip=[(3550, 4800)])
L.dress(9000, 12550, "factory", spacing=170, seed=83, skip=[(9350, 10000), (10750, 11150)])
L.finish(spawn=(0, -2), left=-360, right=12660, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w4_2_conveyor_chaos.tscn"))
