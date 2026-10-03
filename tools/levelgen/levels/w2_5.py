"""World 2-5: HOT SPRING HOLLOW - steamy pools hidden between the peaks.
Teaches: riding geysers up the terraces, a Yetling lobbing from above, seesaws
on the plateau, a steaming canyon (hop the floating rocks - or glide the
thermal updrafts for the high road), a snowball bowling slope down to
the bath-house, then the boardwalk over the steaming pool (time the steam
jets), a seesaw hill and the upper bath-house, the steam gorge, the Yetlings'
snow fort and a geyser up to the summit spa.
Secrets: gem 0 at the top of the first thermal, gem 1 on the bottom of the
village hot pool, gem 2 behind the bath-house; the Snoozling snoozes on a warm
rock at the bottom of the canyon (glide into the thermal to get back up).
Regenerate: python3 tools/levelgen/levels/w2_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("HotSpringHollow", "Hot Spring Hollow", theme="hotspring", horizon=0, scenery="ice",
             backdrop={"light_shafts": True})
L.ambience("snow", 0.5)
L.ambience("spores", 0.5, tint=C(1.0, 1.0, 1.0, 0.6))     # drifting steam motes

# ---- S0 the steamy village (x -300..1700) -----------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (350, 0), (365, 140), (705, 140), (720, 0), (1700, 0), (1700, -300), (2300, -300),
        (2300, -600), (2800, -600), (2800, -900), (4200, -900)], bottom=1500)
L.water(365, 0, 340, 140)
L.gem(620, 110)                                     # on the bottom of the hot pool
L.sign(90, 0, "HOT SPRING HOLLOW. Ahh, warm at last!\n(Pools are safe for a paddle.)", 420)
L.deco("hut", 1000, 0)
L.deco("snowman", 780, 0, 0.9)
L.lums(820, -110, 1150, -110, 4, 30)

# ---- S1 the geyser terraces (1700..2800) ------------------------------------------------------
L.checkpoint(1560, 0)
L.geyser(1620, 0, height=420, calm=1.2)
L.geyser(2150, -300, height=420, calm=1.2, phase=0.6)
L.geyser(2650, -600, height=420, calm=1.2, phase=1.2)
L.enemy("yetling", 3050, -900)
L.lums(1620, -120, 1620, -360, 3)
L.lums(2150, -420, 2150, -660, 3)
L.lums(2650, -720, 2650, -960, 3)

# ---- S2 the plateau: seesaws and a penguin (2800..4200) ----------------------------------------
L.checkpoint(2880, -900)
L.seesaw(3350, -900, 320)
L.lums(3200, -1250, 3500, -1250, 4)
L.enemy("slidgewick", 4000, -900)
L.bell(3750, -900)

# ---- S3 the steaming canyon (4200..5920) -------------------------------------------------------
L.pit_kill(4200, 5800, 1300)
for x0, x1, y in [(4440, 4640, -850), (4880, 5080, -800), (5320, 5560, -850)]:
    L.island(x0, x1, y, depth=120)
for x in [4330, 4820, 5690]:
    L.updraft(x - 60, -1600, 120, 1900, rise=420)
L.gem(4330, -1560)                                 # top of the first thermal
L.lums(4330, -1100, 4330, -1450, 4)
L.lums(4500, -1500, 5700, -1500, 10)
L.lums(4540, -930, 5480, -930, 6, -60)
L.enemy("snowl", 4900, -1250)
# The warm rock at the bottom of the canyon, with the Snoozling.
L.island(5210, 5400, 300, depth=90)
L.snoozling(5310, 300, fur=C(1.0, 0.75, 0.6))
L.updraft(5240, -1600, 130, 1900, rise=460)

# ---- S4 snowball bowling down to the baths (5920..9000) ----------------------------------------------
L.land([(5800, -800), (6600, -800), (7800, -200), (10600, -200)], bottom=1500)
L.checkpoint(6000, -800)
L.snowpile(6500, -800, max_radius=80)
for x in [6900, 7200, 7500]:
    L.enemy("grunt", x, -800 + (x - 6600) * 0.5, walk_speed=0.0, sight=0.0)
L.lums(6650, -870, 7750, -320, 12)

# ---- S5 the bath-house (7800..10600) ------------------------------------------------------------
L.land([(8300, -200), (8315, -60), (8700, -60), (8715, -200), (11000, -200), (11020, -60), (12380, -60), (12400, -200),
        (13400, -200), (13700, -400), (15000, -400), (15040, 600)], bottom=1500)   # a hot tub in the deck, then the steaming pool
L.water(8315, -200, 385, 140)
L.checkpoint(7900, -200)
L.enemy("yetling", 9300, -200)
L.deco("hut", 10150, -200, 1.2)
L.deco("lantern", 9500, -200)
L.lums(8350, -290, 8680, -290, 4, 40)
L.lums(9000, -300, 9600, -300, 5)
# Gem 2: in the bath-house's back room - over its roof, or wall-jump in.
L.block(10380, -340, 20, 140)
L.block(10380, -360, 240, 20)
L.block(10600, -360, 20, 160)
L.gem(10490, -260)
L.secret(10400, -340, 200, 140)

# ---- S6 the steaming pool boardwalk (10620..12400) ----------------------------------------------
L.checkpoint(10700, -200)
L.water(11020, -170, 1360, 110)                      # warm and shallow: fall in and just climb out
for i, x0 in enumerate([11040, 11340, 11640, 11940, 12240]):
    L.ledge(x0, -210, 160 if x0 < 12240 else 150)
    if i > 0:
        L.flame(x0 - 70, -60, length=280, steam=True, on=1.0, off=1.7, phase=i * 0.55)
L.lums(11100, -300, 12320, -300, 10)
L.enemy("snowl", 11700, -700)

# ---- S7 the seesaw hill and the upper bath-house (12400..14800) ------------------------------------
L.checkpoint(12480, -200)
L.seesaw(12950, -200, 320)
L.ledge(12900, -600, 200)
L.lum_block(12960, -900, lums=5)
L.lums(12920, -680, 13080, -680, 3)
L.enemy("yetling", 13950, -400)
L.enemy("slidgewick", 14200, -400)
L.bell(13850, -400)
L.lums(13800, -500, 14300, -500, 6, 40)
L.deco("hut", 14450, -400, 1.0)
L.deco("lantern", 14300, -400)

# ---- S8 the steam gorge: hop the rocks between the jets (15000..16400) -------------------------------
L.checkpoint(14650, -400)
L.pit_kill(15040, 16360, 900)
for i, x0 in enumerate([15200, 15500, 15800, 16100]):
    L.island(x0, x0 + 170, -400, depth=110)
    if i % 2 == 1:
        L.flame(x0 + 85, -400, length=260, steam=True, on=0.9, off=1.8, phase=i * 0.4)
L.lums(15230, -500, 16240, -500, 8, 40)
L.enemy("snowl", 15700, -900)
for x in [15350, 15950]:
    L.glow(x, 300, C(1.0, 0.8, 0.6), radius=400, energy=0.6)   # warm water glowing far below

# ---- S9 the Yetlings' snow fort (16400..17800) --------------------------------------------------------
L.land([(16360, 600), (16400, -400), (17950, -400), (17950, -900), (18400, -900), (18415, -780), (18645, -780), (18660, -900),
        (19400, -900)], bottom=1500)
L.checkpoint(16480, -400)
L.snowpile(16650, -400, max_radius=80)
L.block(17000, -500, 40, 100)
L.enemy("yetling", 17150, -400)
L.block(17450, -500, 40, 100)
L.enemy("yetling", 17600, -400)
L.lums(16800, -520, 17550, -520, 7)
L.deco("snowman", 16900, -400, 1.0)

# ---- S10 the summit spa: geyser up to the top bath-house (17800..19400) ---------------------------------
L.geyser(17840, -400, height=640, calm=1.4)
L.lums(17840, -560, 17840, -980, 4)
L.checkpoint(18060, -900)
L.water(18415, -900, 230, 120)                           # the warm spa pool: hop in!
L.lums(18430, -1000, 18630, -1000, 4, 40)
L.goal(19050, -900)
for x, k, s in [(18200, "lantern", 1.0), (18850, "hut", 1.1), (19300, "hut", 0.8), (19200, "snowman", 0.9)]:
    L.deco(k, x, -900, s)
L.wall(19400, -2200, -900)

L.dress(-250, 19350, "snow", spacing=180, seed=25, skip=[(300, 760), (1500, 2850), (3150, 3600), (4150, 6050), (8250, 8760),
        (10350, 10650), (10980, 12420), (12750, 13150), (13800, 14300), (14700, 16400), (16600, 17700), (17700, 17960),
        (18380, 18680), (19000, 19100)])
L.finish(spawn=(0, -2), left=-360, right=19460, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_5_hot_spring_hollow.tscn"))
