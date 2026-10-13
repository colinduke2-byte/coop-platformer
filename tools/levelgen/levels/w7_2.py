"""World 7-2: CARD CATALOG CORRIDOR - drawers, ladders and a gate that wants two.
Teaches the AND gate (lamps on its top: how many triggers are on): leave an ECHO on one plate, stand on the
other, and the gate opens for good. Then a lift up a shelf wall that only runs while an echo holds its plate.
Secrets: gem 0 on the drawer ledges, gem 1 on top of the shelf wall, gem 2 up the ladder ledges near the end;
the Snoozling waits in the last alcove.
Regenerate: python3 tools/levelgen/levels/w7_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

LAMP = C(1.0, 0.85, 0.5)
L = LevelKit("CardCatalogCorridor", "Card Catalog Corridor", theme="library", horizon=0, scenery="library")
L.ambience("pages", 0.8)

R = 5900
L.land([(-300, 0), (R, 0)], bottom=900)
L.wall(-360, -900, 900)
L.wall(R, -900, 900)

# ---- S0 the drawers (-300..1300): a first hop-about ----------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(200, 0, "Welcome back. Echoes: RECORD pad,\nwalk, STOP pad on a plate.", 400)
for i, (x, y) in enumerate([(520, -130), (760, -250), (1000, -370)]):
    L.ledge(x, y, 200)
L.gem(1100, -430)                              # gem 0
L.lums(520, -190, 1100, -430, 6)
L.enemy("blotty", 800, 0)
L.enemy("wormwick", 1150, 0)

# ---- S1 the two-plate gate (1300..2800) -------------------------------------------------------------------------------
L.checkpoint(1320, 0)
L.record_pad(1480, 0, max_time=14)
gateA = L.gate(2560, -420, 56, 420, need=2)
pa = L.echo_plate(1900, 0, [gateA], width=110)
pb = L.plate(2380, 0, [gateA])
L.sign(1620, 0, "The gate's lamps: it needs TWO plates.\nEcho on one, you on the other.", 440)
L.enemy("candlewick", 2150, 0)
L.enemy("pagebat", 2000, -280)
L.lums(1600, -110, 1840, -110, 4)
L.lums(2000, -110, 2340, -110, 4)

# ---- S2 the shelf wall (2800..4700): a lift that runs only while an echo holds its plate ---------------------------------
L.checkpoint(2900, 0)
L.record_pad(3080, 0, max_time=12)
lift = L.moving(3800, 0, 160, 30, waypoints=((0, -380),), speed=170, wait=1.6, active=False, one_way=True)
pc = L.echo_plate(3460, 0, [lift])
L.block(3960, -380, 760, 380)                    # the shelf wall: top at -380
L.sign(3240, 0, "No stairs. The LIFT only runs\nwhile an echo holds its plate.", 420)
L.gem(4300, -440)                                # gem 1, on top of the wall
L.lums(4020, -440, 4660, -440, 6)
L.enemy("shushling", 3300, 0)
L.enemy("wormwick", 4900, 0)

# ---- S3 the ladder run and the exit (4700..5900) -----------------------------------------------------------------------
L.checkpoint(4780, 0)
for x, y in [(5000, -130), (5200, -260), (5400, -390)]:
    L.ledge(x, y, 180)
L.gem(5490, -450)                                # gem 2
L.snoozling(5420, 0, fur=C(0.7, 0.8, 1.0))
L.enemy("blotty", 5100, 0)
L.enemy("candlewick", 5650, 0)
L.goal(5800, 0)
L.lums(5000, -190, 5500, -450, 6)

for x in (400, 1700, 2900, 4300, 5300):
    L.glow(x, -260, LAMP, radius=340, energy=0.7)
L.dress(-250, R - 100, "library", spacing=190, seed=721,
        skip=[(440, 480), (1440, 1520), (1850, 1950), (2330, 2430), (3030, 3130), (3400, 3520), (3760, 4720), (5780, 5880)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=900, kill_y=1200)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_2_card_catalog_corridor.tscn"))
