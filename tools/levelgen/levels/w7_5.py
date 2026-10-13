"""World 7-5: BELFRY OF BOOKMARKS - up the tower of shelves.
Three storeys joined by LIFTS that only run while an echo holds their plate (a new recording replaces your old
echo, so each lift is yours only until you reach the next storey - falling back down means doing it again).
Pagebats harry the riders, candlewicks guard the middle storey.
Secrets: gem 0 on the first storey's ledges, gem 1 on the middle storey's high shelf, gem 2 at the top of the
belfry; the Snoozling sits beside the top lift.
Regenerate: python3 tools/levelgen/levels/w7_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

LAMP = C(1.0, 0.85, 0.5)
L = LevelKit("BelfryOfBookmarks", "Belfry of Bookmarks", theme="library", horizon=0, scenery="library")
L.ambience("pages", 0.9)

R = 6400
T2, T3 = -420, -840
L.land([(-300, 0), (1560, 0)], bottom=900)                 # storey 1
L.block(1560, T2, 2360, 1320, group="Blocks")              # storey 2: a thick shelf (top at -420) from x=1560..3920
L.block(3920, T3, 2480, 1740)                              # storey 3: the belfry floor (top at -840) from x=3920..6400
L.wall(-360, -1400, 900)
L.wall(R, -1400, 2300)

# ---- storey 1 (-300..1560) --------------------------------------------------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(180, 0, "Three storeys, two LIFTS.\nEach runs only while an echo holds its plate.", 440)
for x, y in [(380, -140), (600, -270)]:
    L.ledge(x, y, 190)
L.gem(700, -330)                                # gem 0
L.enemy("blotty", 900, 0)
L.enemy("wormwick", 1150, 0)
L.record_pad(560, 0, max_time=10)
lift1 = L.moving(1420, 0, 140, 30, waypoints=((0, T2),), speed=190, wait=1.8, active=False, one_way=True)
p1 = L.echo_plate(1000, 0, [lift1], width=110)
L.lums(300, -110, 500, -110, 3)

# ---- storey 2 (1560..3920, top at -420) ---------------------------------------------------------------------------------------------
L.checkpoint(1700, T2)
L.sign(1930, T2, "Up again: the second lift\nis at the far end.", 260)
L.enemy("candlewick", 2200, T2)
L.enemy("pagebat", 2400, T2 - 280)
L.enemy("candlewick", 2800, T2)
L.ledge(2500, T2 - 150, 200)
L.ledge(2760, T2 - 280, 200)
L.gem(2850, T2 - 340)                           # gem 1, on the high shelf
L.record_pad(2100, T2, max_time=10)
lift2 = L.moving(3780, T2, 140, 30, waypoints=((0, T3 - T2),), speed=190, wait=1.8, active=False, one_way=True)
p2 = L.echo_plate(3300, T2, [lift2], width=110)
L.lums(2200, T2 - 110, 3200, T2 - 110, 7)

# ---- storey 3 (3920..6400, top at -840): the belfry -------------------------------------------------------------------------------------
L.checkpoint(4000, T3)
L.snoozling(4150, T3, fur=C(0.7, 0.8, 1.0))
L.enemy("shushling", 4600, T3)
L.enemy("blotty", 5000, T3)
for x, y in [(5300, T3 - 130), (5520, T3 - 260)]:
    L.ledge(x, y, 190)
L.gem(5620, T3 - 320)                           # gem 2
L.enemy("wormwick", 5800, T3)
L.goal(6250, T3)
L.lums(4100, T3 - 110, 6100, T3 - 110, 9)

for x, y in [(400, -200), (1900, T2 - 200), (3300, T2 - 200), (4800, T3 - 200), (5800, T3 - 200)]:
    L.glow(x, y, LAMP, radius=340, energy=0.7)
L.dress(-250, 1550, "library", spacing=190, seed=751, skip=[(520, 600), (940, 1060), (1380, 1560)])
L.dress(1600, 3900, "library", spacing=190, seed=752, skip=[(2060, 2140), (3240, 3360), (3740, 3900)])
L.dress(3960, R - 100, "library", spacing=190, seed=753, skip=[(6200, 6300)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=900, kill_y=1200, top=-1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_5_belfry_of_bookmarks.tscn"))
