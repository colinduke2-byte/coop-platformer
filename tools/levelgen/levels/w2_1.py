"""World 2-1: SNOWBALL SLOPES - a snowy village at the foot of Frostwhistle Peak.
Teaches: punching snow piles (the snowball grows and bowls everything over),
the slippery frozen pond with a tobogganing Slidgewick, a long downhill where a
huge snowball smashes a packed-ice wall, a ski jump over a gap (sprint, slide
or glide), Snowls dropping snowballs over the floating drifts, then the sledge
run: a snowball down Snowman Hill, a frozen lake full of penguins, Bowling
Hill, the icicle overhang, the skating rink and the Yetling camp gate.
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
L.sign(5050, 70, "Downhill! Belly-\nslide (DOWN\n+ run)!", 300)
L.enemy("grunt", 5400, 213, walk_speed=0.0, sight=0.0)
L.enemy("grunt", 5800, 384, walk_speed=0.0, sight=0.0)
L.enemy("snowl", 5900, 0)
L.lums(5300, 90, 5950, 370, 7)
# The ice gate at the bottom: a packed-ice wall (a snowball or a CHARGED punch breaks it)
# under a snowy lintel. The Snoozling's cage sits just behind it.
L.breakable(6560, 380, 70, 260, iron=True)
L.block(6540, 340, 400, 40)                       # the lintel
L.snoozling(6800, 640, fur=C(0.7, 0.85, 1.0))
L.lums(6680, 560, 6900, 560, 3)
L.sign(6200, 555, "Packed ice! Smash\nit with a snowball\nor CHARGED punch.", 300)

# ---- S4 the ski jump (7200..8700) -------------------------------------------------------------
L.checkpoint(7120, 640)
L.pit_kill(7650, 8020, 1300)
L.block(7650, 1000, 370, 40)                                       # a soft landing below...
L.pad(7720, 1000, height=640, rotation=-30)                         # ...and a mushroom back up
L.deco("skis", 7300, 640)
L.sign(7240, 640, "SKI JUMP! Sprint, long-jump\nor glide across!", 400)
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
L.lums(8760, 440, 10250, 440, 12)
L.sign(8620, 640, "Snowls drop snowballs.\nPunch them back up!", 320)

# ---- S6 the finish (10300..11600) ---------------------------------------------------------------
L.land([(10400, 560), (12000, 560), (13200, 900), (14010, 900), (14100, 880), (14400, 880), (14620, 760), (15500, 760), (16300, 1000), (18800, 1000),
        (19100, 880), (19800, 880)], bottom=2000)
L.checkpoint(10460, 560)
L.lums(10600, 460, 11000, 460, 5, 40)
L.deco("igloo", 10800, 560, 0.8)
# Gem 2: in a snow hut - punch through its front drift. The path climbs over its roof.
L.breakable(11380, 420, 40, 140, lums=2)
L.block(11380, 400, 280, 20)
L.block(11640, 400, 20, 160)
L.gem(11520, 500)
L.secret(11420, 420, 220, 140)

# ---- S7 the sledge run: Snowman Hill, the penguin lake, the gate (11700..15200) ------------------
L.checkpoint(11760, 560)
L.snowpile(11960, 560, max_radius=85)
for x in [12400, 12700, 12950]:
    L.enemy("grunt", x, 560 + (x - 12000) * 340 / 1200, walk_speed=0.0, sight=0.0)
L.deco("snowman", 12200, 560 + 200 * 340 / 1200, 1.1)
L.deco("snowman", 13100, 872, 0.9)
L.lums(12100, 520, 13100, 800, 9)
L.enemy("snowl", 12600, 300)
# The penguin lake: slippery ice, two tobogganing Slidgewicks.
L.terrain([(13200, 900), (14010, 900), (14010, 940), (13200, 940)], rounding=4.0, slippery=True)
L.checkpoint(13260, 900)
L.enemy("slidgewick", 13700, 900)
L.enemy("slidgewick", 13950, 900, facing=-1)
L.lums(13300, 800, 13950, 800, 7)
L.ledge(13480, 740, 160)
L.lum_block(13520, 560, lums=5)
L.sign(14150, 880, "Brr! Nearly there.", 240)
L.enemy("yetling", 14350, 880)
L.lums(14550, 660, 14800, 660, 4, 30)
L.deco("lantern", 14700, 760)

# ---- S8 Bowling Hill: one more snowball, a whole line of pins (15000..16400) ----------------------
L.checkpoint(14980, 760)
L.snowpile(15420, 760, max_radius=95)
for i, x in enumerate([15800, 15950, 16100, 16250]):
    y = 760 + (x - 15500) * 240 / 800
    L.enemy("grunt", x, round(y), walk_speed=0.0, sight=0.0)
L.lums(15600, 700, 16300, 900, 8)
L.deco("snowman", 15300, 760, 1.0)

# ---- S9 the icicle overhang: dash underneath (16400..17300) --------------------------------------
L.checkpoint(16380, 1000)
L.terrain([(16600, 640), (17200, 640), (17260, 700), (17200, 760), (16600, 760), (16540, 700)], rounding=12.0)
for x in [16720, 16900, 17080]:
    L.stalactite(x, 760, ice=True)
L.deco("icicles", 16900, 760, 1.0)
L.lums(16650, 900, 17150, 900, 6, 20)

# ---- S10 the skating rink (17300..18700) -----------------------------------------------------------
L.terrain([(17300, 1000), (18600, 1000), (18600, 1040), (17300, 1040)], rounding=4.0, slippery=True)
L.checkpoint(17340, 1000)
L.enemy("slidgewick", 17900, 1000)
L.enemy("slidgewick", 18400, 1000, facing=-1)
L.enemy("snowl", 18000, 620)
for x in [17600, 18150]:
    L.ledge(x, 840, 170)
    L.lums(x + 30, 780, x + 140, 780, 3)
L.lum_block(18235, 600, lums=6)
L.lums(17400, 900, 18550, 900, 10)

# ---- S11 the Yetling camp and the gate (18700..19800) ----------------------------------------------
L.checkpoint(18740, 1000)
L.enemy("yetling", 19250, 880)
L.goal(19500, 880)
L.lums(19100, 780, 19420, 780, 4, 30)
for x, k, s in [(19000, "igloo", 0.9), (19320, "lantern", 1.0), (19660, "igloo", 1.0), (19760, "pine", 1.1),
                (18700, "snowman", 1.0)]:
    L.deco(k, x, L.surface_y(x), s)
L.wall(19800, -1200, 880)

L.dress(-250, 19750, "snow", spacing=170, seed=21,
        skip=[(1400, 2900), (3000, 4600), (6500, 7120), (7600, 8050), (8700, 10380), (11350, 11700),
              (11900, 13150), (13200, 14050), (15350, 16350), (16540, 17260), (17300, 18620), (19450, 19560)])
L.finish(spawn=(0, -2), left=-360, right=19860, bottom=1400, kill_y=1700)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_1_snowball_slopes.tscn"))
