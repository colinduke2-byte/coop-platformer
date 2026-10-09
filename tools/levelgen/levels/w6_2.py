"""World 6-2: CAROUSEL CROSSING - the floor runs out, then the ceiling does.
A rhythm run: every ~1100 px the walkable surface switches between the floor and the ceiling, with a
200 px overlap where a pressure plate flips gravity (step on it and you land on the other surface a moment
later - keep running!). Spinning carousels bridge the pits for dreamers who'd rather jump.
Secrets: gem 0 rides the first carousel's rim, gem 1 hangs off the ceiling in the third run, gem 2 is behind
the spikes at the end of the second floor run; the Snoozling stands on the ceiling in the fourth run.
Regenerate: python3 tools/levelgen/levels/w6_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V
from carnival import H, ceil_lums, floor_lums

L = LevelKit("CarouselCrossing", "Carousel Crossing", theme="carnival", horizon=0, scenery="carnival")
L.ambience("confetti", 0.7)
L.ambience("stars", 0.5)

R = 6500
# Surfaces: floor / ceiling runs overlap by 300 px around each hand-over.
FLOOR = [(-300, 1750), (2250, 3350), (3850, 4950), (5450, R)]
CEIL = [(-300, 1000), (1450, 2550), (3050, 4150), (4650, 5750)]
for a, b in FLOOR:
    L.land([(a, 0), (b, 0)], bottom=900)
for a, b in CEIL:
    L.ceiling_land([(a, -H), (b, -H)], top=-H - 900)
L.wall(-360, -H - 900, 900)
L.wall(R, -H - 900, 900)
for a, b in [(1750, 2250), (3350, 3850), (4950, 5450)]:
    L.pit_kill(a, b, 700)                     # no floor under the carousel pits
for a, b in [(1000, 1450), (2550, 3050), (4150, 4650), (5750, R)]:
    L.kill_top(a, b, -H - 300)                # ...and no ceiling above the other runs

# ---- S0 the carousel yard (-300..1000): the lever from 6-1 again, then the first pad -----------------------
L.checkpoint(0, 0)
L.sign(240, 0, "The floor ends ahead - and then the ceiling.\nStep on the PLATES to flip, and keep running!", 460)
L.flip_lever(620, 0)
L.flip_lever(900, -H, ceiling=True)
ceil_lums(L, 650, 880, 4)
L.enemy("grunt", 1120, 0)

# ---- S1 first floor run to the first hand-over (1000..1750) -------------------------------------------------------
L.checkpoint(1100, 0)
L.enemy("popcorn_pufflet", 1330, 0)
L.flip_pad(1480, 0)                           # hand-over 1: floor -> ceiling
floor_lums(L, 1180, 1420, 4)
# the first carousel bridges the pit (1750..2250) for jumpers; gem 0 rides its rim
L.wheel(2000, -250, count=5, radius=190, speed=34.0, solid=True)
L.gem(2190, -250)                             # gem 0

# ---- S2 first ceiling run (1450..2550) --------------------------------------------------------------------------------
ceil_lums(L, 1800, 2200, 8)
L.enemy("marionette", 2080, -H + 12, length=260.0, amplitude=0.55, period=3.6)
L.flip_pad(2300, -H, ceiling=True)            # hand-over 2: ceiling -> floor

# ---- S3 second floor run (2250..3350): spikes hiding gem 2 ---------------------------------------------------------
L.checkpoint(2350, 0)
L.enemy("unicyclops", 2700, 0)
L.spikes(3080, 0, 180)
L.gem(3180, -150)                             # gem 2 (jump the spikes)
L.flip_pad(3110 - 20 + 0, 0) if False else None
L.flip_pad(3290, 0)                           # hand-over 3 (right after the spikes)
floor_lums(L, 2420, 2900, 6)

# ---- S4 second ceiling run (3050..4150) ------------------------------------------------------------------------------------
L.ceiling_block(3500, -H + 170, 200, 36)      # a hanging platform
L.gem(3600, -H + 225)                         # gem 1 on its underside
L.enemy("balloonatic", 3750, -300, rise=120.0)
ceil_lums(L, 3150, 3480, 5)
ceil_lums(L, 3720, 4080, 5)
L.flip_pad(4090, -H, ceiling=True)            # hand-over 4

# ---- S5 third floor run (3850..4950) ---------------------------------------------------------------------------------------------
L.checkpoint(3900, 0)
L.wheel(5200, -250, count=5, radius=190, speed=-34.0, solid=True)
L.enemy("jackbonk", 4300, 0)
L.enemy("jackbonk", 4560, 0)
L.flip_pad(4890, 0)                           # hand-over 5
floor_lums(L, 3960, 4240, 5)

# ---- S6 third ceiling run, then the finish (4650..R) -----------------------------------------------------------------------------
L.snoozling(5200, -H, fur=C(1.0, 0.8, 0.5), ceiling=True)
ceil_lums(L, 4950, 5150, 3)
L.flip_pad(5690, -H, ceiling=True)            # hand-over 6: land on the final floor
L.checkpoint(5560, 0)
L.enemy("popcorn_pufflet", 6000, 0)
L.goal(6330, 0)
floor_lums(L, 5800, 6200, 5)

# ---- dressing ----------------------------------------------------------------------------------------------------------------------------------
L.dress(-250, 1700, "carnival", spacing=200, seed=621, skip=[(560, 700), (1440, 1520)])
L.dress(2260, 3300, "carnival", spacing=200, seed=622, skip=[(3050, 3330)])
L.dress(3860, 4900, "carnival", spacing=200, seed=623, skip=[(4860, 4920)])
L.dress(5460, R - 120, "carnival", spacing=200, seed=624, skip=[(6250, 6420)])
for a, b in CEIL:
    L.dress(a + 20, b - 20, "carnival", spacing=260, seed=625 + int(a), ceiling=True, skip=[(880, 960), (2260, 2340), (4050, 4130), (5660, 5740)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=H + 700, kill_y=H + 800, top=-H - 700, kill_top=-H - 800)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_2_carousel_crossing.tscn"))
