"""World 6-4: ROLLERCOASTER RUCKUS - the fast one. Conveyor 'rails' carry you along the floor AND the
ceiling; saws sweep the corridor, zap arcs crackle on one surface at a time, and gravity gates lift you
over the spikes and set you down again. Keep your timing and keep moving.
Secrets: gem 0 high over the saw run, gem 1 between the loop's gates, gem 2 in the zap tunnel's ceiling
stretch; the Snoozling rides the ceiling rail before the finale.
Regenerate: python3 tools/levelgen/levels/w6_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V
from carnival import H, corridor, ceil_lums, floor_lums

L = LevelKit("RollercoasterRuckus", "Rollercoaster Ruckus", theme="carnival", horizon=0, scenery="carnival")
L.ambience("confetti", 0.8)
L.ambience("embers", 0.5)

R = 7200
L.wall(-360, -H - 900, 900)
L.wall(R, -H - 900, 900)


def floor_belt(x0, x1, speed):
    """A floor belt (several blocks so the belt animation tiles cleanly)."""
    x = x0
    while x < x1:
        w = min(400, x1 - x)
        L.block(x, 0, w, 600, conveyor=speed)
        x += w


def ceiling_belt(x0, x1, speed):
    x = x0
    while x < x1:
        w = min(400, x1 - x)
        L.ceiling_block(x, -H, w, 600, conveyor=speed)
        x += w


# ---- S0 the platform (-300..900) ---------------------------------------------------------------------------------------
L.land([(-300, 0), (900, 0)], bottom=900)
L.ceiling_land([(-300, -H), (900, -H)], top=-H - 900)
L.checkpoint(0, 0)
L.sign(240, 0, "ALL ABOARD! Rails carry you along.\nSaws, sparks and spikes ahead -\nand arches that set gravity.", 480)
L.flip_lever(620, 0)
L.flip_lever(780, -H, ceiling=True)

# ---- S1 the saw run (900..2500): floor belt, saws sweeping floor-to-ceiling ----------------------------------------------------------
floor_belt(900, 2500, 220)
ceiling_belt(900, 2500, 220)
L.checkpoint(940, 0)
for i, (x, spd) in enumerate([(1300, 240), (1680, 300), (2050, 270)]):
    L.saw(x, -50, waypoints=((0, -440),), speed=spd, radius=34.0)
L.gem(1500, -H + 40)                         # gem 0: hanging over the saws (flip up to get it)
L.flip_lever(1120, 0)
L.flip_lever(2300, -H, ceiling=True)
ceil_lums(L, 1180, 1600, 7)
floor_lums(L, 1400, 1520, 3)

# ---- S2 the loop (2500..4000): spikes on the floor belt; gates lift you over and set you down -----------------------------------
L.land([(2500, 0), (4100, 0)], bottom=900)
L.ceiling_land([(2500, -H), (4100, -H)], top=-H - 900)
L.checkpoint(2560, 0)
L.flip_gate(2800, 0, "up", height=H + 20)
L.spikes(2920, 0, 420)
L.spikes(3500, 0, 220)
L.flip_gate(3820, 0, "down", height=H + 20)
L.gem(3200, -H + 40)                         # gem 1, between the gates
ceil_lums(L, 2900, 3700, 9)
L.enemy("balloonatic", 3350, -300, rise=110.0)
L.enemy("jackbonk", 3950, 0)

# ---- S3 the zap tunnel (4100..5600): belts run AGAINST you; sparks on the floor, then on the ceiling ----------------------------------------------
floor_belt(4100, 5700, -140)
ceiling_belt(4100, 5700, -140)
L.checkpoint(4180, 0)
for x in (4450, 4650, 4850):
    L.zap(x, -12, x, -250, on=0.9, off=1.3, phase=(x - 4450) / 600.0)
L.flip_lever(5000, 0)
for x in (5250, 5400):
    L.zap(x, -H + 12, x, -H + 250, on=0.9, off=1.3, phase=(x - 5250) / 600.0)
L.flip_lever(5560, -H, ceiling=True)
L.gem(5320, -H + 40)                         # gem 2, in the ceiling stretch
L.enemy("popcorn_pufflet", 4300, 0)

# ---- S4 the finale (5700..R): two pads and a long ride ---------------------------------------------------------------------------------------------
L.land([(5700, 0), (R, 0)], bottom=900)
L.ceiling_land([(5700, -H), (R, -H)], top=-H - 900)
L.checkpoint(5760, 0)
L.snoozling(6100, -H, fur=C(0.7, 0.95, 0.7), ceiling=True)
L.flip_pad(5950, 0)
L.spikes(6120, 0, 380)
L.flip_pad(6560, -H, ceiling=True)
L.enemy("unicyclops", 6800, 0)
L.goal(6980, 0)
ceil_lums(L, 6050, 6500, 7)
floor_lums(L, 6640, 6900, 4)

# ---- dressing -----------------------------------------------------------------------------------------------------------------------------------------------
L.dress(-250, 880, "carnival", spacing=190, seed=641, skip=[(560, 700)])
L.dress(2520, 4080, "carnival", spacing=230, seed=642, skip=[(2760, 2860), (3780, 3880)])
L.dress(5720, R - 100, "carnival", spacing=220, seed=643, skip=[(5900, 6000), (6900, 7080)])
L.dress(-250, 880, "carnival", spacing=260, seed=644, ceiling=True, skip=[(740, 820)])
L.dress(2520, 4080, "carnival", spacing=260, seed=645, ceiling=True)
L.dress(5720, R - 100, "carnival", spacing=260, seed=646, ceiling=True, skip=[(6040, 6160), (6520, 6600)])
for x in (500, 1800, 3000, 4700, 6300):
    L.deco("bunting", x, -H + 190, 1.1, seed=x)

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=H + 700, kill_y=H + 800, top=-H - 700, kill_top=-H - 800)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_4_rollercoaster_ruckus.tscn"))
