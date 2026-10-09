"""World 6-6: THE BIG TOP - the Ringmaster's gravity show. A short run-in with the levers you know, then the
ring: MADAME TOPSY-TURVY. Jump her flaming hoops and the shockwaves of her leaps; every so often she strides
to the arena's lever and WHACKS it - gravity flips, and the lurch leaves her DIZZY. That's your window: run
over and STOMP or PUNCH her. Anyone can pull the levers too.
Secrets: gem 0 on the run-in's ceiling, gem 1 in the arena's ceiling corner, gem 2 on the victory run's
ceiling; the Snoozling stands on the victory run.
Regenerate: python3 tools/levelgen/levels/w6_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V
from carnival import H, corridor, ceil_lums, floor_lums

GOLD = C(1.0, 0.85, 0.45)
L = LevelKit("TheBigTop", "The Big Top", theme="bigtop", horizon=0, scenery="carnival")
L.ambience("confetti", 1.0)
L.ambience("embers", 0.5)

R = 5400
corridor(L, -300, R)
L.wall(-360, -H - 900, 900)
L.wall(R, -H - 900, 900)

# ---- S0 the run-in (-300..1400) ----------------------------------------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(240, 0, "THE BIG TOP! Madame Topsy-Turvy runs\nthe gravity show. Hit her when she's DIZZY.", 480)
L.flip_lever(640, 0)
L.flip_lever(1000, -H, ceiling=True)
L.gem(820, -H + 45)                              # gem 0
L.enemy("popcorn_pufflet", 900, 0)
L.enemy("jackbonk", 1180, 0)
ceil_lums(L, 700, 960, 4)
floor_lums(L, 300, 560, 4)

# ---- S1 the ring: MADAME TOPSY-TURVY (1450..3350) -------------------------------------------------------------------------------------
L.checkpoint(1380, 0)
L.sign(1480, 0, "MADAME TOPSY-TURVY!\nJump the hoops. When she whacks the\nlever she gets DIZZY - HIT HER!", 400)
entry = L.gate(1440, -H - 20, 48, H + 40, start_open=True, stay_open=False, open_offset=(0, H + 80))
exit_gate = L.gate(3380, -H - 20, 48, H + 40, open_offset=(0, H + 80))
floor_lever = L.flip_lever(2100, 0)
ceil_lever = L.flip_lever(2700, -H, ceiling=True)
L.arena(2400, 0, [exit_gate], enemies=[("madame_topsy", 2400, 0, {"asleep": True})])
boss = L.arena_children[0]
L.extra(boss, levers=[L.rel(boss, floor_lever), L.rel(boss, ceil_lever)])
L.zone(1490, -H - 120, 1860, H + 300, [entry], everyone=True, send_on=False)
L.zone(1490, -H - 120, 1860, H + 300, [boss], everyone=True)
L.gem(1560, -H + 45)                             # gem 1, in the ring's ceiling corner
for x in (1700, 2400, 3100):
    L.glow(x, -300, GOLD, radius=360, energy=0.7)
ceil_lums(L, 1900, 2300, 6)
floor_lums(L, 2500, 2900, 5)

# ---- S2 the victory run (3350..R) ---------------------------------------------------------------------------------------------------------------
L.checkpoint(3460, 0)
L.snoozling(3700, 0, fur=C(1.0, 0.85, 0.5))
L.flip_lever(3950, 0)
ceil_lums(L, 4000, 4500, 7)
L.gem(4300, -H + 45)                             # gem 2
L.flip_lever(4700, -H, ceiling=True)
L.goal(5150, 0)
floor_lums(L, 4800, 5050, 4)

L.dress(-250, 1360, "carnival", spacing=190, seed=661, skip=[(600, 700), (960, 1060)])
L.dress(3400, R - 100, "carnival", spacing=210, seed=662, skip=[(3900, 4000), (5050, 5250)])
L.dress(-250, R - 100, "carnival", spacing=250, seed=663, ceiling=True, skip=[(960, 1060), (2660, 2760), (4660, 4760)])
for x in (500, 1900, 2900, 4300):
    L.deco("bunting", x, -H + 190, 1.2, seed=x)

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=H + 700, kill_y=H + 800, top=-H - 700, kill_top=-H - 800)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_6_the_big_top.tscn"))
