"""World 6-1: TICKET BOOTH PROMENADE - the first night at the carnival.
Teaches the gravity lever (punch it!), then the gates and pads. A walkable FLOOR (y=0) and CEILING
(y=-540); flipping gravity makes the ceiling the floor.
Secrets: gem 0 on the ceiling above the gates, gem 1 on a platform hanging off the ceiling, gem 2
in the pit run; the Snoozling waits on the ceiling before the pad finale.
Regenerate: python3 tools/levelgen/levels/w6_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V
from carnival import H, corridor, pit, ceil_lums, floor_lums

L = LevelKit("TicketBoothPromenade", "Ticket Booth Promenade", theme="carnival", horizon=0, scenery="carnival")
L.ambience("confetti", 0.6)
L.ambience("stars", 0.5)

R = 6100
corridor(L, -300, R, floor_gaps=[(1500, 2200)])
L.wall(-360, -H - 900, 900)
L.wall(R, -H - 900, 900)

# ---- S0 the front gate (-300..1400): meet the lever ------------------------------------------------
L.checkpoint(0, 0)
L.sign(260, 0, "WELCOME to the Midnight Carnival!\nPunch the LEVER and gravity flips.", 440)
L.flip_lever(760, 0)
ceil_lums(L, 520, 1180, 8)
L.glow(760, -200, C(1.0, 0.8, 0.4), radius=300, energy=0.7)
L.flip_lever(1280, -H, ceiling=True)         # up here, punch it to flip back down
L.sign(1000, 0, "Now try it from the ceiling:\nthe lever hangs down there.", 420)

# ---- S1 the dark pit (1500..2200): cross it on the ceiling ---------------------------------------------
L.checkpoint(1400, 0)
pit(L, 1500, 2200)
L.flip_lever(1440, 0)
L.enemy("balloonatic", 1850, -270, rise=130.0)
ceil_lums(L, 1560, 2140, 8, arc=30)
L.flip_lever(2250, -H, ceiling=True)
L.glow(1850, -300, C(0.5, 0.8, 1.0), radius=320, energy=0.6)

# ---- S2 the spike alley (2200..3600): spikes on the floor, then on the ceiling ----------------------------
L.checkpoint(2300, 0)
L.spikes(2640, 0, 320)                       # the floor is spiky here: walk the ceiling
L.flip_lever(2500, 0)
L.flip_lever(3040, -H, ceiling=True)
L.spikes(3250, -H, 320, rotation=3.14159)    # ...and now the ceiling is: back on the floor
L.enemy("grunt", 3420, 0)
L.enemy("jackbonk", 3700, 0)
ceil_lums(L, 2560, 2980, 6)
floor_lums(L, 3120, 3580, 6)

# ---- S3 the arches (3600..4700): a gate sets gravity, always the same way ----------------------------------
L.checkpoint(3800, 0)
L.flip_gate(3900, 0, "up", height=H + 20)
L.flip_gate(4420, 0, "down", height=H + 20)
L.gem(4160, -H + 70)                          # gem 0, on the ceiling between the arches
ceil_lums(L, 3980, 4360, 6)
L.enemy("unicyclops", 4600, 0)
L.sign(3640, 0, "Arches SET gravity:\nUP arch, DOWN arch.", 400)

# ---- S4 the pad finale (4700..6100): a pressure plate, a hanging platform, the booth ------------------------
L.checkpoint(4720, 0)
L.flip_pad(4900, 0)
ceil_lums(L, 4980, 5360, 5)
L.ceiling_block(4900, -H + 160, 600, 36)      # a platform hanging off the ceiling: reachable when flipped
L.gem(5200, -H + 215)                         # gem 1, on its underside
L.snoozling(5500, -H, fur=C(1.0, 0.7, 0.85), ceiling=True)   # stands on the ceiling: punch it while flipped
L.flip_pad(5640, -H, ceiling=True)
L.enemy("popcorn_pufflet", 5900, 0)
L.goal(5980, 0)
L.gem(2000, -H + 40)                          # gem 2, hanging over the middle of the pit
floor_lums(L, 5700, 5900, 3)

# ---- dressing ----------------------------------------------------------------------------------------------------
L.dress(-250, 1450, "carnival", spacing=190, seed=611)
L.dress(2220, 6050, "carnival", spacing=190, seed=612, skip=[(2600, 2980), (3200, 3600), (3860, 3940), (4380, 4460), (5860, 6040)])
L.dress(-250, R - 100, "carnival", spacing=240, seed=613, ceiling=True)
for x in (700, 2400, 4100, 5300):
    L.deco("bunting", x, -H + 190, 1.1, seed=x)

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=H + 700, kill_y=H + 800, top=-H - 700, kill_top=-H - 800)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_1_ticket_booth_promenade.tscn"))
