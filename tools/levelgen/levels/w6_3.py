"""World 6-3: HALL OF MIRRORS - the funhouse. Floor pillars and hanging pillars wall the corridor in turn:
when a pillar rises from the floor you walk the ceiling past it, and when one hangs from the ceiling you walk
the floor. Levers sit just before every pillar (on whichever surface you're standing on). One timed gate
asks you to punch a switch and race to it.
Secrets: gem 0 over the first pillar, gem 1 on the ceiling after the third pillar, gem 2 behind the gate's switch pocket; the
Snoozling stands on the ceiling near the end.
Regenerate: python3 tools/levelgen/levels/w6_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V
from carnival import H, corridor, ceil_lums, floor_lums

L = LevelKit("HallOfMirrors", "Hall of Mirrors", theme="funhouse", horizon=0, scenery="carnival")
L.ambience("confetti", 0.4)
L.ambience("stars", 0.4)

R = 7300
corridor(L, -300, R)
L.wall(-360, -H - 900, 900)
L.wall(R, -H - 900, 900)

PIL = 400   # pillar height


def floor_pillar(x, w=90):
    L.block(x, -PIL, w, PIL)


def hanging_pillar(x, w=90):
    L.ceiling_block(x, -H + PIL, w, PIL)


# ---- S0 the mirror door (-300..1400) ---------------------------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(250, 0, "The Hall of Mirrors!\nA PILLAR from the floor? Walk the ceiling.\nA hanging one? Walk the floor.", 520)
floor_pillar(860)                                   # P1
L.flip_lever(690, 0)
L.gem(905, -H + 70)                                 # gem 0, up on the ceiling over the pillar
ceil_lums(L, 560, 800, 4)
ceil_lums(L, 1000, 1400, 6)
hanging_pillar(1700)                                # P2
L.flip_lever(1510, -H, ceiling=True)
L.enemy("unicyclops", 2000, 0)

# ---- S1 (1400..2900) ---------------------------------------------------------------------------------------------------
L.checkpoint(1560, 0)
floor_lums(L, 1800, 2200, 6)
floor_pillar(2560)                                  # P3
L.flip_lever(2380, 0)
L.gem(2860, -H + 45)                                # gem 1, on the ceiling after the third pillar
L.enemy("jackbonk", 2300, 0)
ceil_lums(L, 2700, 3000, 5)
L.flip_lever(3140, -H, ceiling=True)                # back to the floor before the gate

# ---- S2 the timed gate (3000..4400) -----------------------------------------------------------------------------------------
L.checkpoint(3260, 0)
g = L.gate(3950, -H - 20, w=60, h=H + 40, open_offset=(0, H + 80), stay_open=False)
L.switch(3400, 0, [g], mode=2, duration=5.5)        # punch it, then RUN
L.spikes(3640, 0, 160)
L.enemy("popcorn_pufflet", 3760, 0)
L.gem(3300, -H + 60) if False else None
floor_lums(L, 3480, 3880, 5)
L.snoozling(4180, 0, fur=C(0.6, 0.9, 1.0))

# ---- S3 (4400..6000) --------------------------------------------------------------------------------------------------------------
floor_pillar(4800)                                  # P4
L.flip_lever(4620, 0)
L.checkpoint(4440, 0)
ceil_lums(L, 4660, 5000, 5)
hanging_pillar(5640)                                # P5
L.flip_lever(5460, -H, ceiling=True)
L.enemy("grunt", 5900, 0)
L.enemy("marionette", 5200, -H + 12, length=240.0, amplitude=0.5, period=3.4)

# ---- S4 the last pillars (6000..R) ----------------------------------------------------------------------------------------------------
L.checkpoint(6000, 0)
floor_pillar(6500)                                  # P6
L.flip_lever(6320, 0)
ceil_lums(L, 6400, 6700, 4)
L.flip_lever(6900, -H, ceiling=True)
L.goal(7150, 0)
L.gem(5000, -H + 70) if False else None
L.gem(6780, -H + 70)                                # gem 2, on the last stretch of ceiling

# ---- dressing ------------------------------------------------------------------------------------------------------------------------------------
L.dress(-250, R - 100, "funhouse", spacing=210, seed=631, skip=[(640, 1000), (1440, 1560), (1650, 1800), (2300, 2420), (2500, 2640), (3340, 3460), (3900, 4010), (4580, 4900), (5400, 5520), (5600, 5740), (6280, 6360), (6460, 6600), (7080, 7220)])
L.dress(-250, R - 100, "funhouse", spacing=260, seed=632, ceiling=True, skip=[(1450, 1570), (1650, 1800), (3080, 3200), (5400, 5520), (5600, 5740), (6860, 6960)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=H + 700, kill_y=H + 800, top=-H - 700, kill_top=-H - 800)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_3_hall_of_mirrors.tscn"))
