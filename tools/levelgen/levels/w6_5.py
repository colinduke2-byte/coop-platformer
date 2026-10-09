"""World 6-5: FERRIS WHEEL HEIGHTS - the tall one. Ride the elevator up the big wheel's mast, punch the lever
on the top deck and fall UP 400 px to the ceiling, cross the chasm hanging from the sky, then an arch drops
you 1100 px onto the deck below. A last stretch of pillars (the funhouse again) leads to the gate.
Secrets: gem 0 floats over the elevator's top deck, gem 1 on the ceiling run, gem 2 on the last ceiling
stretch; the Snoozling waits on the lower deck.
Regenerate: python3 tools/levelgen/levels/w6_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V
from carnival import H, ceil_lums, floor_lums

TALL = 1500    # the chasm: floor to ceiling
L = LevelKit("FerrisWheelHeights", "Ferris Wheel Heights", theme="carnival", horizon=0, scenery="carnival")
L.ambience("confetti", 0.9)
L.ambience("stars", 0.6)

R = 7600
L.wall(-360, -TALL - 900, 900 + TALL)
L.wall(R, -TALL - 900, 900 + TALL)

# ---- ground ----------------------------------------------------------------------------------------------------------------
L.land([(-300, 0), (1300, 0)], bottom=900)                 # the base of the wheel
L.land([(4800, 0), (R, 0)], bottom=900)                    # the far platform
L.ceiling_land([(1500, -TALL), (4300, -TALL)], top=-TALL - 900)   # the sky walk
L.ceiling_land([(4800, -H), (R, -H)], top=-H - 900)        # a low ceiling for the last stretch
L.pit_kill(1300, 4800, 700)
L.kill_top(1300, 1500, -TALL - 300)
L.kill_top(4300, 4800, -TALL - 300)

# ---- S0 the foot of the wheel (-300..1300) -----------------------------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(240, 0, "FERRIS WHEEL HEIGHTS.\nRide the lift up, punch the lever\nat the top... and fall UP.", 480)
L.enemy("grunt", 800, 0)
floor_lums(L, 350, 700, 5)
L.wheel(700, -520, count=6, radius=240, speed=22.0, solid=True)   # (just for show - and a ride)

# ---- S1 the lift (1300..2200) -----------------------------------------------------------------------------------------------------------
L.moving(1400, -40, w=200, h=32, waypoints=((0, -1060),), speed=170.0, wait=0.8, rider=True)
L.block(1700, -1100, 500, 80)                              # the top deck
L.checkpoint(1790, -1100)
L.gem(1500, -1280)                                         # gem 0, floating over the lift's top stop
L.flip_lever(2080, -1100)
L.glow(1950, -1250, C(1.0, 0.8, 0.4), radius=320, energy=0.7)

# ---- S2 the sky walk (1500..4300) ---------------------------------------------------------------------------------------------------------------------
ceil_lums(L, 2250, 2700, 8)
L.enemy("marionette", 2750, -TALL + 12, length=300.0, amplitude=0.45, period=3.6)
L.gem(3050, -TALL + 45)                                    # gem 1
L.enemy("balloonatic", 3300, -TALL + 300, rise=100.0)
for x in (3500, 3680):
    L.zap(x, -TALL + 12, x, -TALL + 250, on=0.9, off=1.2, phase=(x - 3500) / 400.0)
L.enemy("marionette", 3300, -TALL + 12, length=260.0, amplitude=0.5, period=3.2)
ceil_lums(L, 3800, 4000, 3)
L.flip_gate(4050, -700, "down", height=900)                # the drop: gravity set DOWN from the ceiling
L.wheel(4500, -950, count=5, radius=210, speed=-28.0, solid=True)   # a spinning lure over the landing deck

# ---- S3 the landing deck (4000..4800) ---------------------------------------------------------------------------------------------------------------------------
L.block(4000, -400, 700, 80)                               # you drop onto this
L.checkpoint(4180, -400)
L.snoozling(4560, -400, fur=C(1.0, 0.6, 0.8))

# ---- S4 the last pillars (4800..R) ---------------------------------------------------------------------------------------------------------------------------------
L.checkpoint(4900, 0)
L.block(5500, -400, 90, 400)                               # floor pillar
L.flip_lever(5330, 0)
ceil_lums(L, 5420, 5900, 6)
L.ceiling_block(6300, -H + 400, 90, 400)                   # hanging pillar
L.flip_lever(6130, -H, ceiling=True)
L.gem(5800, -H + 45)                                       # gem 2
L.enemy("jackbonk", 6700, 0)
L.enemy("unicyclops", 6950, 0)
L.goal(7250, 0)

L.dress(-250, 1260, "carnival", spacing=210, seed=651, skip=[(540, 880), (1700, 1800)])
L.dress(4820, R - 100, "carnival", spacing=220, seed=652, skip=[(5300, 5420), (5460, 5620), (6080, 6180), (6280, 6420), (7120, 7380)])
L.dress(4820, R - 100, "carnival", spacing=260, seed=653, ceiling=True, skip=[(6080, 6180), (6280, 6420)])
L.dress(1520, 4280, "carnival", spacing=300, seed=654, ceiling=True)

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=H + 700, kill_y=H + 800, top=-TALL - 700, kill_top=-TALL - 800)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_5_ferris_wheel_heights.tscn"))
