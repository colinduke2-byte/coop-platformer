"""World 2-5: HOT SPRING HOLLOW - steamy pools hidden between the peaks.
Teaches: riding geysers up the terraces, a Yetling lobbing from above, seesaws
on the plateau, a steaming canyon (hop the floating rocks - or glide the
thermal updrafts for the high road), and a snowball bowling slope down to
the bath-house.
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
L.deco("snowman", 1350, 0, 0.9)
L.lums(800, -110, 1500, -110, 6, 30)

# ---- S1 the geyser terraces (1700..2800) ------------------------------------------------------
L.checkpoint(1560, 0)
L.sign(1260, 0, "GEYSERS! Stand on the vent and\nride the eruption up the terraces.", 400)
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
L.sign(3050, -900, "Land on the high end of a SEESAW to\nfling a friend sky-high!", 380)

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
L.sign(4000, -900, "Hop the rocks - or GLIDE into the\nsteam (JUMP again in the air) and rise!", 420)
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
L.sign(6150, -800, "Bowling time!\nPunch the snow pile.", 280)

# ---- S5 the bath-house (7800..10600) ------------------------------------------------------------
L.land([(8300, -200), (8315, -60), (8700, -60), (8715, -200)], bottom=1500)   # a hot tub in the deck
L.water(8315, -200, 385, 140)
L.checkpoint(7900, -200)
L.enemy("yetling", 9300, -200)
L.goal(9800, -200)
L.deco("hut", 10150, -200, 1.2)
L.deco("lantern", 9500, -200)
L.lums(8350, -290, 8680, -290, 4, 40)
L.lums(9000, -300, 9600, -300, 5)
# Gem 2: behind the bath-house.
L.block(10380, -400, 20, 200)
L.gem(10490, -270)
L.secret(10400, -400, 200, 200)
L.wall(10600, -1400, -200)

L.dress(-250, 10350, "snow", spacing=180, seed=25, skip=[(300, 760), (1500, 2850), (3150, 3600), (4150, 6050), (8250, 8760)])
L.finish(spawn=(0, -2), left=-360, right=10660, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_5_hot_spring_hollow.tscn"))
