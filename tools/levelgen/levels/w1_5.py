"""World 1-5: MILLSTREAM RUSH - down by the river and up the falls.
Teaches: hopping drifting log rafts, riding a giant water wheel up to the mill
roof, crossing the rapids on rocks (geysers offer a high road), climbing a net
beside a roaring waterfall, a calm upper pond and a zipline down to Lily
Lagoon: sinking lily pads, bouncy Boingos over the water, the shell bowl, the
Mill Race (rafts down the flume) and Kingfisher Bank up to the mill-house gate.
Secrets: gem 0 above the water wheel, gem 1 on the high road over the rapids,
gem 2 in a hidden alcove behind the waterfall; the Snoozling sleeps in a calm
sunken cave under the rapids.
Regenerate: python3 tools/levelgen/levels/w1_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("MillstreamRush", "Millstream Rush", theme="river", horizon=100, scenery="river")
L.ambience("pollen", 0.8)
L.ambience("petals", 0.4)

# ---- The land: banks, river bed, the mill, the rapids bed with its sunken cave ----------------
L.wall(-360, -1500, 600)
L.land([(-300, 0), (1000, 0), (1180, 10), (1200, 380), (3000, 380), (3020, 10), (3200, 0), (4520, 0),
        (4520, -560), (5100, -560), (5100, 0), (5200, 10), (5220, 420), (6400, 420), (6400, 700), (6600, 700),
        (6600, 420), (6900, 420), (6920, 10), (7440, 0),
        (7440, -440), (7700, -440), (7700, -620), (7440, -620),          # alcove carved behind the falls
        (7440, -1100), (8400, -1100), (8420, -1080),
        (8440, -780), (9600, -780), (9620, -1080), (9640, -1100), (10000, -1100), (10000, -1270), (10160, -1270)],
       bottom=1400)

# ---- S0 the riverbank (x -300..1200) ---------------------------------------------------------
L.sign(80, 0, "MILLSTREAM RUSH. Hop the logs,\nride the wheel, climb the falls!", 400)
L.deco("hut", 600, 0)
L.deco("lilypads", 1080, 4)
L.bell(430, 0)                                   # Lum Rush for the log rafts
L.lums(620, -200, 1000, -180, 4)

# ---- S1 the log rafts (1200..3000) -----------------------------------------------------------
L.water(1200, 20, 1820, 360, current=(160, 0))
for i in range(3):
    L.raft(1260, 20, width=190, travel=1700, current=160, offset=i / 3)
L.lums(1300, -90, 2900, -90, 12)
L.enemy("bumblebonk", 2100, -380)
L.sign(1040, 0, "The river carries logs downstream.\nHop from raft to raft!", 380)

# ---- S2 the mill and its wheel (3000..5100) --------------------------------------------------
L.checkpoint(3120, 0)
L.enemy("grunt", 3500, 0)
L.enemy("shellbert", 3750, 0, facing=1)
L.wheel(4200, -290, count=6, radius=250, speed=24)
L.gem(4200, -760)
L.ledge(4380, -560, 150)                           # roof overhang: step off the top of the wheel
L.enemy("diggle", 4800, -560)
L.deco("hut", 4980, -560, 1.1)
L.deco("lantern", 4600, -560)
L.lums(3950, -300, 3950, -560, 3)
L.lums(4560, -750, 5060, -750, 5)

# ---- S3 the rapids (5100..6900) ---------------------------------------------------------------
L.checkpoint(5160, 0)
L.water(5220, 20, 1700, 400, current=(300, 0))
L.water(6400, 420, 200, 280)                       # the calm sunken cave
L.snoozling(6500, 700, fur=C(0.55, 0.8, 1.0))
# Rocks ~210 px apart: an easy running hop each (the current only matters if you fall in).
for x0, x1, top in [(5430, 5540, -40), (5740, 5850, -60), (6060, 6170, -40), (6380, 6490, -50), (6700, 6810, -40)]:
    L.terrain([(x0, top), (x1, top), (x1 + 10, 440), (x0 - 10, 440)], rounding=12.0)
L.geyser(5795, -60, height=380, calm=1.2)
L.ledge(5920, -600, 180)
L.ledge(6230, -700, 160)
L.gem(6310, -760)
L.lums(5990, -680, 6380, -780, 5)
L.lums(5500, -120, 6680, -120, 8)
L.enemy("bumblebonk", 6050, -330)
L.sign(4680, -560, "RAPIDS ahead!\nHop the rocks.", 380)

# ---- S4 the waterfall climb (6900..8400) -------------------------------------------------------
L.checkpoint(6950, 0)
L.s.node("Waterfall", "Node2D", "Decor", {"script": L.s.script("res://world/waterfall.gd"),
         "position": __import__("tscn").V(7300, -1100), "size": __import__("tscn").V(140, 1100)})
L.net(7380, -1060, 60, 1000)
L.ledge(7200, -380, 120)
L.ledge(7180, -760, 120)
L.enemy("bumblebonk", 7050, -600)
L.lums(7410, -200, 7410, -1000, 8)
# Alcove hidden behind the waterfall, inside the cliff.
L.gem(7600, -520)
L.secret(7440, -620, 260, 180)
L.sign(7160, 0, "Anything behind\nthe waterfall...?", 300)
L.deco("lilypads", 7150, 4)

# ---- S5 the upper pond and the dam (8400..10200) ------------------------------------------------
L.checkpoint(7520, -1100)
L.water(8440, -1080, 1180, 300, current=(60, 0))
for i in range(2):
    L.raft(8500, -1080, width=200, travel=1000, current=60, offset=i / 2)
L.enemy("grunt", 9800, -1100)
L.enemy("grunt", 9900, -1100, facing=1)
L.lums(8500, -1170, 9550, -1170, 9)
L.sign(7700, -1100, "The calm upper pond. The dam's\nzipline is the quick way home!", 380)
L.deco("hut", 8050, -1100, 0.9)

# ---- S6 zipline to the finish (10160..11600) ---------------------------------------------------
L.zipline(10130, -1330, 11000, -520)
L.lums(10250, -1250, 10900, -650, 7)
L.land([(10900, -450), (11250, -470), (11700, -450), (11720, -415), (11740, 20), (13260, 20), (13280, -415),
        (13300, -450), (14900, -450), (14920, -415), (14940, 20), (16760, 20), (16780, -415),
        (16800, -450), (17900, -450), (18200, -600), (19900, -600)], bottom=1400)
L.checkpoint(10960, -450)

# ---- S7 Lily Lagoon (11700..13300) and the mill-house gate ---------------------------------------
L.sign(11400, -450, "LILY LAGOON! Boingos\nbounce you sky-high!", 380)
L.water(11740, -415, 1520, 435, current=(40, 0))
for x, y in [(11860, -440), (12120, -470), (12380, -440)]:
    L.leaf(x, y, width=150, sink=70, depth=240)
L.enemy("boingo", 12720, -600)
L.enemy("boingo", 13020, -640)
L.lums(11860, -540, 12450, -540, 6, 40)
L.lums(12650, -760, 13150, -800, 5, 60)
L.enemy("bumblebonk", 12550, -900)
L.deco("lilypads", 11800, -412)
L.deco("lilypads", 12950, -412)
L.deco("reeds", 13240, -450)
L.checkpoint(13360, -450)
L.enemy("shellbert", 13700, -450, facing=1, walk_speed=0.0)
L.enemy("grunt", 14000, -450, walk_speed=0.0, sight=0.0)
L.enemy("grunt", 14100, -450, walk_speed=0.0, sight=0.0)
L.crate(14250, -450, 64, lums=4)
L.lums(13500, -640, 14200, -640, 7)
L.deco("hut", 14550, -450, 1.1)

# ---- S8 the Mill Race: rafts down the flume (14900..16800) --------------------------------------
L.checkpoint(14640, -450)
L.water(14940, -415, 1820, 435, current=(150, 0))
for i in range(3):
    L.raft(14960, -415, width=190, travel=1650, current=150, offset=i / 3)
L.lums(15100, -540, 16600, -540, 12, 40)
L.enemy("bumblebonk", 15600, -900)
L.enemy("boingo", 16200, -560)
L.deco("lilypads", 15300, -412)
L.deco("lilypads", 16300, -412)
L.deco("reeds", 16760, -450)
L.deco("reeds", 14900, -450)

# ---- S9 Kingfisher Bank and the mill-house hill (16800..19900) ------------------------------------
L.checkpoint(16860, -450)
L.seesaw(17300, -450, 320)
L.lums(17150, -620, 17450, -620, 4, 40)
L.enemy("diggle", 17700, -450)
L.enemy("ribbiton", 18450, -600, sit_time=2.0)
L.enemy("grunt", 18800, -600)
L.lum_block(18100, -900, lums=6)
L.lums(17900, -560, 18200, -700, 4)
L.lums(18500, -720, 19000, -720, 6, 40)
L.goal(19350, -600)
for x, k, s in [(17000, "tree", 1.2), (17600, "flowers", 1.0), (18300, "big_flower", 1.0), (19150, "hut", 1.2),
                (19600, "hut", 0.9), (19800, "tree", 1.1), (18650, "fence", 1.0)]:
    L.deco(k, x, L.surface_y(x), s)
L.wall(19900, -2000, -600)

L.dress(-250, 19900, "river", spacing=160, seed=51,
        skip=[(1180, 3020), (4500, 5120), (5200, 6920), (7280, 7460), (8420, 9640), (11700, 13300), (13600, 14300),
              (14600, 14920), (14920, 16800), (17100, 17500), (19300, 19420)])

L.finish(spawn=(0, -2), left=-360, right=19960, bottom=800, kill_y=1100)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_5_millstream_rush.tscn"))
