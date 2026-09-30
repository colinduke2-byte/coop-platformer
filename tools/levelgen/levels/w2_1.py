"""World 2-1: SNOWBALL SLOPES - a snowy village at the foot of Frostwhistle Peak.
Teaches: punching snow piles (the snowball grows and bowls everything over),
the slippery frozen pond with a tobogganing Slidgewick, a long downhill where a
huge snowball smashes a packed-ice wall, a ski jump over a gap (sprint, slide
or glide), and Snowls dropping snowballs over the floating drifts.
Secrets: gem 0 on the high ledges over the pond, gem 1 at the top of the ski
jump's arc, gem 2 behind a snowdrift at the finish; the Snoozling is locked in
the ice cave at the bottom of the big slope (smash the wall with a snowball).
Regenerate: python3 tools/levelgen/levels/w2_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("SnowballSlopes", "Snowball Slopes", theme="frost", horizon=0, scenery="ice")
L.ambience("snow", 1.0)

# ---- S0 the village (x -300..1400) ----------------------------------------------------------
L.wall(-360, -1200, 600)
# One continuous ground from the village to the ski jump (the pond is an ice slab in a notch).
L.land([(-300, 0), (2990, 0), (3000, 36), (4600, 36), (4610, 0), (4900, 0), (6400, 640), (7400, 640), (7650, 560)],
       bottom=1500)
L.sign(90, 0, "FROSTWHISTLE PEAKS! Brr...\nMind your step, it's icy up here.", 420)
L.deco("igloo", 560, 0)
L.deco("snowman", 900, 0)
L.deco("skis", 1030, 0)
L.deco("lantern", 1200, 0)
L.lums(300, -110, 800, -110, 5, 40)

# ---- S1 the first snow pile (1400..3000) ------------------------------------------------------
L.snowpile(1560, 0)
L.sign(1300, 0, "PUNCH the snow pile! The snowball\ngrows as it rolls - and flattens everything.", 440)
for i, x in enumerate([1950, 2080, 2210]):
    L.enemy("grunt", x, 0, walk_speed=0.0, sight=0.0)
L.crate(2450, 0, 64, lums=3)
L.crate(2450, -64, 64, lums=3)
L.breakable(2700, -130, 60, 130, lums=4)
L.lums(1700, -170, 2600, -170, 9, 30)

# ---- S2 the frozen pond (3000..4600) ----------------------------------------------------------
L.checkpoint(3070, 0)
L.terrain([(3000, 0), (4610, 0), (4610, 40), (3000, 40)], rounding=4.0, slippery=True)
L.enemy("slidgewick", 4100, 0)
L.sign(3250, 0, "Frozen pond - SLIPPERY! Penguins toboggan:\nstomp them to stop them.", 440)
L.ledge(3500, -170, 180)
L.ledge(3760, -330, 150)                          # gem 0 up top
L.gem(3835, -390)
L.lums(3520, -240, 3660, -240, 3)
L.lums(3200, -90, 4500, -90, 10)
L.deco("snowman", 4480, 0, 0.8)

# ---- S3 the big slope (4600..7200) ------------------------------------------------------------
L.checkpoint(4650, 0)
L.snowpile(4800, 0, max_radius=90)
L.bell(4700, 0)
L.sign(4950, 70, "Downhill! Roll a snowball and chase it -\nor belly-slide (DOWN while running)!", 420)
L.enemy("grunt", 5400, 213, walk_speed=0.0, sight=0.0)
L.enemy("grunt", 5800, 384, walk_speed=0.0, sight=0.0)
L.enemy("snowl", 5900, 0)
L.lums(5000, -40, 6300, 540, 14)
# The ice gate at the bottom: a packed-ice wall (a snowball or a CHARGED punch breaks it)
# under a snowy lintel. The Snoozling's cage sits just behind it.
L.breakable(6560, 380, 70, 260, iron=True)
L.block(6540, 340, 400, 40)                       # the lintel
L.snoozling(6800, 640, fur=C(0.7, 0.85, 1.0))
L.lums(6680, 560, 6900, 560, 3)
L.sign(6300, 597, "Packed ice! Smash it with a snowball\n(or a CHARGED punch: hold PUNCH).", 400)

# ---- S4 the ski jump (7200..8700) -------------------------------------------------------------
L.checkpoint(7120, 640)
L.pit_kill(7650, 8020, 1300)
L.block(7650, 1000, 370, 40)                                       # a soft landing below...
L.pad(7720, 1000, height=640, rotation=-30)                         # ...and a mushroom back up
L.deco("skis", 7300, 640)
L.sign(7240, 640, "SKI JUMP! Sprint, long-jump or glide\nacross (JUMP again in the air).", 400)
L.gem(7840, 300)                                                   # the top of a great jump
L.lums(7700, 470, 7960, 470, 4, -60)
L.land([(8020, 620), (8300, 640), (8700, 640)], bottom=1500)
L.deco("snowman", 8500, 640, 1.1)

# ---- S5 floating drifts + Snowls (8700..10400) -------------------------------------------------
L.checkpoint(8560, 640)
L.pit_kill(8700, 10300, 1300)
for x0, x1, y in [(8950, 9230, 560), (9480, 9760, 500), (10010, 10290, 560)]:
    L.island(x0, x1, y, depth=160)
L.enemy("snowl", 9100, 180)
L.enemy("snowl", 9650, 120)
L.enemy("yetling", 10200, 560)
L.lums(8760, 520, 10250, 520, 12, -70)
L.sign(8620, 640, "Snowls drop snowballs.\nPunch them back up!", 320)

# ---- S6 the finish (10300..11600) ---------------------------------------------------------------
L.land([(10400, 560), (11600, 560)], bottom=1500)
L.checkpoint(10460, 560)
L.goal(11150, 560)
L.lums(10600, 460, 11000, 460, 5, 40)
L.deco("igloo", 10800, 560, 0.8)
# Gem 2: behind a drift in the cliff at the very end.
L.block(11380, 360, 20, 200)
L.gem(11490, 470)
L.secret(11400, 360, 200, 200)
L.wall(11600, -1200, 560)

L.dress(-250, 11550, "snow", spacing=170, seed=21,
        skip=[(1400, 2900), (3000, 4600), (6500, 7120), (7600, 8050), (8700, 10380), (11350, 11600)])
L.finish(spawn=(0, -2), left=-360, right=11660, bottom=1300, kill_y=1600)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_1_snowball_slopes.tscn"))
