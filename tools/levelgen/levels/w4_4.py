"""World 4-4: TICK-TOCK TOWER - up the inside of the great clock tower and down its roofs.
Teaches: a staircase of shelves up the tower shaft (Sparkbots zipping about), the
pendulum hall (spiked pendulums swing over the floor - wait for the swing),
a tall climb of tick-tock blocks, a lift to the clock gallery, then down the
roof steps past zaps and Springbots, ride the great pendulum over the drop and
cross the bell yard to the gate.
Secrets: gem 0 on a shelf off the left of the staircase, gem 1 up the lift in the
clock gallery, gem 2 in a cog crate at the finish; the Snoozling sits at the far end of
the pendulum hall.
Regenerate: python3 tools/levelgen/levels/w4_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

GOLD = C(1.0, 0.85, 0.45)
L = LevelKit("TickTockTower", "Tick-Tock Tower", theme="tower", horizon=0, scenery="factory")
L.ambience("spores", 0.7, tint=C(1, 0.95, 0.8, 0.5))

# One ground profile: the courtyard, the tower floors (one solid mass each) and the roof steps.
L.wall(-360, -2600, 600)
L.land([(-300, 0), (2500, 0), (2500, -850), (4700, -850), (4700, -1600), (5000, -1600), (5000, -1570),
        (5220, -1570), (5220, -1600), (6400, -1600), (6400, -1200), (6900, -1200), (6900, -800),
        (7400, -800), (7400, -400), (7900, -400), (7900, 0), (12800, 0)], bottom=1500)
L.land([(14000, 0), (16500, 0)], bottom=1500)

# ---- S0 the tower courtyard (x -300..1400) ----------------------------------------------------------
L.sign(90, 0, "TICK-TOCK TOWER. Climb the clock -\nevery tick counts!", 420)
L.deco("clock", 500, 0, 1.3)
L.deco("gear", 850, 0)
L.lums(300, -110, 1150, -110, 6, 40)
L.enemy("windup", 1100, 0)

# ---- S1 the staircase shaft (1400..2500) -------------------------------------------------------------
L.checkpoint(1420, 0)
L.backwall(1380, -1300, 1120, 1300, shade=0.5)
STAIRS = [(1600, -170), (1830, -340), (2060, -510), (2290, -680)]
for x, y in STAIRS:
    L.ledge(x, y, 200)
    L.lums(x + 40, y - 70, x + 160, y - 70, 3)
L.enemy("sparkbot", 1950, -700, travel=V(300, 0), speed=100.0)
# Gem 0: hop left off the third shelf to a hidden shelf.
L.ledge(1800, -680, 160)
L.gem(1910, -740)
for x in [1700, 2200]:
    L.glow(x, -500, GOLD, radius=260, energy=0.5)

# ---- S2 the pendulum hall (2500..3800) -----------------------------------------------------------------
L.checkpoint(2600, -850)
L.snoozling(3660, -850, fur=C(1.0, 0.8, 0.5))
L.block(2550, -1290, 1250, 40)                     # the hall ceiling the pendulums hang from
L.backwall(2550, -1250, 1250, 400, shade=0.5)
for i, x in enumerate([3100, 3450]):
    L.pendulum(x, -1250, rope=260, width=110, amplitude=1.0, period=2.6, phase=i * 0.5, spiked=True)
L.lums(3000, -950, 3560, -950, 6)

# ---- S3 the tick-tock climb (3800..4700) ----------------------------------------------------------------
L.checkpoint(3780, -850)
for i, (x, y) in enumerate([(3920, -1000), (4120, -1150), (4320, -1300), (4520, -1450)]):
    L.beat(x, y, 140, 32, group=i % 2)
    L.lums(x + 30, y - 70, x + 110, y - 70, 2)

# ---- S4 the clock deck and the gallery lift (4700..6400) ---------------------------------------------------
L.checkpoint(4780, -1600)
L.moving(5010, -1600, w=200, h=30, waypoints=((0, -590),), speed=170, wait=1.0, rider=True)   # in a notch
L.block(5250, -2190, 520, 40)                      # the clock gallery
L.gem(5640, -2250)                                 # gem 1
L.deco("clock", 5500, -2190, 1.4)
L.lums(5110, -1720, 5110, -2100, 4)
L.lums(5300, -2290, 5560, -2290, 4)
L.enemy("windup", 5900, -1600)
L.lums(5300, -1700, 6300, -1700, 8, 20)

# ---- S5 down the roof steps (6400..7900) ---------------------------------------------------------------------
L.checkpoint(6300, -1600)
L.zap(6650, -1210, 6650, -1440, on=0.9, off=1.5)
L.enemy("springbot", 7150, -800)
L.zap(7650, -410, 7650, -640, on=0.9, off=1.5, phase=0.4)
L.lums(6500, -1310, 6850, -1310, 4)
L.lums(7000, -910, 7350, -910, 4)
L.lums(7500, -510, 7850, -510, 4)

# ---- S6 the finish (7900..12600) ------------------------------------------------------------------------------
L.checkpoint(8000, 0)
L.bell(8120, 0)
L.enemy("springbot", 8900, 0)
L.saw(9500, -130, waypoints=((0, -160),), speed=120.0)
L.lums(8300, -110, 10400, -110, 14, 20)
# Gem 2: a cog crate - punch its cracked side. The path climbs over its lid.
L.breakable(10800, -140, 40, 140, lums=2)
L.block(10800, -160, 300, 20)
L.block(11080, -160, 20, 160)
L.gem(10940, -60)
L.secret(10840, -140, 240, 140)
L.enemy("windup", 11500, 0)
L.lums(11700, -110, 11950, -110, 3, 30)

# ---- S7 the great pendulum: ride it over the drop (12300..14000) -------------------------------------
L.checkpoint(12330, 0)
L.sign(12120, 0, "The GREAT PENDULUM! Climb\nup, hop on, ride it over.", 260)
L.ledge(12520, -180, 200)
L.ledge(12700, -360, 160)
L.pit_kill(12800, 14000, 700)
L.block(13300, -940, 200, 40)                        # the pendulum's beam
L.deco("clock", 13400, -940, 1.4)
L.pendulum(13400, -900, rope=600, width=220, amplitude=0.8, period=3.4)
L.lums(12980, -560, 13820, -560, 7, -80)
L.enemy("sparkbot", 13400, -1150, travel=V(260, 0), speed=90.0)

# ---- S8 the bell yard and the gate (14000..16500) --------------------------------------------------
L.checkpoint(14080, 0)
for i, (x, y) in enumerate([(14450, -150), (14650, -300), (14850, -450)]):
    L.beat(x, y, 140, 32, group=i % 2)
L.block(15020, -600, 300, 30)                        # the bell balcony
L.lum_block(15170, -880, lums=6)
L.lums(15040, -680, 15300, -680, 4, 30)
L.enemy("windup", 15600, 0)
L.enemy("springbot", 15850, 0)
L.goal(16100, 0)
L.lums(15400, -110, 16030, -110, 6, 30)
for x, k, s in [(14250, "clock", 1.1), (15500, "gear", 1.2), (16350, "clock", 1.3)]:
    L.deco(k, x, 0, s)
L.wall(16500, -1200, 0)

L.dress(-250, 1350, "factory", spacing=160, seed=101)
L.dress(4750, 6350, "factory", spacing=180, seed=102, skip=[(4950, 5300)])
L.dress(7950, 16450, "factory", spacing=170, seed=103, skip=[(9400, 9600), (10750, 11150), (12350, 12800), (14400, 15350),
        (16050, 16150)])
L.finish(spawn=(0, -2), left=-360, right=16560, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w4_4_tick_tock_tower.tscn"))
