"""World 4-1: COGWHEEL COURTYARD - the yard of the Clockwhirl Works, where dream toys are made.
Teaches: Windup tin soldiers (knock the key off and they panic), conveyor belts,
a moving cart over the scrap pit, TICK-TOCK BLOCKS (pink and blue take turns -
jump when they blink), Springbots, then a row of zap arcs and the gate.
Secrets: gem 0 on the high ledges over the belts, gem 1 at the top of the
practice tick-tock steps, gem 2 in a toy crate behind a cracked wall at the
finish; the Snoozling is on the shelf above the springbot yard.
Regenerate: python3 tools/levelgen/levels/w4_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

L = LevelKit("CogwheelCourtyard", "Cogwheel Courtyard", theme="brass", horizon=0, scenery="factory")
L.ambience("embers", 0.5)

# ---- S0 the factory gate (x -300..1500) -------------------------------------------------------
L.wall(-360, -1200, 600)
# The belts sit flush in notches in the ground.
L.land([(-300, 0), (1800, 0), (1800, 16), (2220, 16), (2220, 0), (2400, 0), (2400, 16), (2820, 16), (2820, 0), (3600, 0)],
       bottom=1500)
L.sign(90, 0, "CLOCKWHIRL WORKS - where dream toys\nare made. Everything here TICKS!", 420)
L.deco("clock", 560, 0, 1.2)
L.deco("toyblocks", 760, 0)
L.deco("gear", 960, 0, 1.3)
L.lums(300, -110, 900, -110, 6, 40)
L.enemy("windup", 1250, 0)

# ---- S1 the conveyor belts (1500..3200) ---------------------------------------------------------
L.sign(1450, 0, "Windups: knock their key off\n- then they panic!", 360)
L.block(1800, 0, 420, 16, conveyor=-160.0)
L.block(2400, 0, 420, 16, conveyor=200.0)
L.enemy("windup", 2600, 0)
L.lums(1820, -110, 2800, -110, 9, 20)
L.ledge(2150, -190, 160)
L.ledge(2400, -370, 150)                           # gem 0
L.gem(2475, -430)
L.lums(2170, -260, 2290, -260, 3)
L.enemy("springbot", 3050, 0)

# ---- S2 the scrap pit: ride the cart (3200..4700) --------------------------------------------------
L.checkpoint(3260, 0)
L.sign(3380, 0, "Hop on the cart\nto cross the pit.", 240)
L.pit_kill(3600, 4600, 700)
L.moving(3602, -2, w=200, h=30, waypoints=((800, 0),), speed=170, wait=1.0, rider=True)
L.lums(3700, -100, 4500, -100, 7)

# ---- S3 tick-tock blocks (4600..7000) --------------------------------------------------------------
L.land([(4600, 0), (6000, 0)], bottom=1500)
L.checkpoint(4680, 0)
L.sign(4800, 0, "TICK-TOCK BLOCKS take turns being solid.\nJump when they BLINK!", 420)
# Practice steps over safe ground, up to gem 1.
L.beat(5250, -150, 140, 32, group=0)
L.beat(5450, -300, 140, 32, group=1)
L.beat(5650, -450, 140, 32, group=0)
L.gem(5720, -520)
L.lums(5320, -220, 5720, -520, 5)
# The real thing: a row over the pit.
L.pit_kill(6000, 7000, 700)
for i, x in enumerate([6040, 6280, 6520, 6760]):
    L.beat(x, -40, 160, 32, group=i % 2)
L.lums(6100, -130, 6860, -130, 7, 30)

# ---- S4 the springbot yard (7000..9000) -----------------------------------------------------------
L.land([(7000, 0), (12800, 0)], bottom=1500)
L.land([(14000, 0), (16700, 0)], bottom=1500)
L.checkpoint(7060, 0)
L.bell(7180, 0)
L.enemy("springbot", 7600, 0)
L.enemy("springbot", 8300, 0)
L.enemy("windup", 8700, 0)
L.ledge(7750, -180, 220)                           # the Snoozling's shelf
L.snoozling(7860, -180, fur=C(1.0, 0.8, 0.4))
L.lums(7400, -110, 8800, -110, 10, 30)
L.deco("toyblocks", 8000, 0, 1.2)

# ---- S5 the zap arcs (9000..10800) ----------------------------------------------------------------
L.checkpoint(9060, 0)
L.sign(9180, 0, "ZAP ARCS crackle, then fire.\nCross when they're off!", 360)
for i, x in enumerate([9700, 10000, 10300]):
    L.zap(x, -10, x, -240, on=0.9, off=1.6, phase=i * 0.22)
L.enemy("sparkbot", 10600, -70, travel=__import__("tscn").V(0, -160), speed=120.0)
L.lums(9650, -110, 10400, -110, 8, 20)

# ---- S6 the finish (10800..12800) ----------------------------------------------------------------
L.checkpoint(10860, 0)
# Gem 2: a toy crate behind a cracked wall - punch it open. The path climbs over its lid.
L.breakable(11200, -140, 40, 140, lums=2)
L.block(11200, -160, 300, 20)
L.block(11480, -160, 20, 160)
L.gem(11340, -60)
L.secret(11240, -140, 240, 140)
L.enemy("windup", 11900, 0)
L.lums(12100, -110, 12330, -110, 4, 30)

# ---- S7 the conveyor bridge under the zaps (12800..14000) ----------------------------------------
L.checkpoint(12420, 0)
L.sign(12560, 0, "The bridge runs BACKWARDS -\nkeep running, mind the zaps!", 340)
L.pit_kill(12800, 14000, 700)
L.block(12800, 0, 1200, 24, conveyor=-140.0)
for i, x in enumerate([13150, 13450, 13750]):
    L.zap(x, -10, x, -240, on=0.8, off=1.8, phase=i * 0.3)
L.lums(12850, -110, 13950, -110, 10, 20)
L.enemy("sparkbot", 13300, -420, travel=V(300, 0), speed=100.0)

# ---- S8 the wind-up parade and the clock plaza (14000..16700) -------------------------------------
L.checkpoint(14080, 0)
for x in [14500, 14700, 14900]:
    L.enemy("windup", x, 0)
L.pad(15200, 0, height=720)
L.block(15300, -620, 420, 30)
L.lum_block(15510, -900, lums=6)
L.lums(15340, -700, 15680, -700, 5, 30)
L.enemy("springbot", 15800, 0)
L.goal(16300, 0)
L.lums(15900, -110, 16230, -110, 5, 30)
for x, k, s in [(14300, "toyblocks", 1.1), (15050, "gear", 1.2), (16100, "clock", 1.3), (16550, "clock", 1.0), (16620, "pipes", 1.0)]:
    L.deco(k, x, 0, s)
L.wall(16700, -1200, 0)

L.dress(-250, 1700, "factory", spacing=160, seed=71)
L.dress(4620, 5200, "factory", spacing=160, seed=72)
L.dress(7020, 16650, "factory", spacing=170, seed=73, skip=[(9650, 10400), (11150, 11550), (12500, 12700), (12780, 14020),
        (15150, 15250), (16250, 16350)])
L.finish(spawn=(0, -2), left=-360, right=16760, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w4_1_cogwheel_courtyard.tscn"))
