"""World 1-4: BRAMBLE BRIDGES - a treetop village high above the forest floor.
Teaches: wobbly rope bridges (with a Prickleroll rolling along one!), riding a
swinging log, a seesaw + frog deck, ziplines, a broken bridge under a spiky
pendulum, climbing a giant trunk on vines, and a canopy run to a long zipline.
Secrets: gem 0 high above the frog deck, gem 1 on a hidden ledge under the
broken bridge (drop through a gap, a mushroom sends you back), gem 2 on a high
leaf at the canopy top; the Snoozling hides in a hollow halfway up the trunk.
Regenerate: python3 tools/levelgen/levels/w1_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("BrambleBridges", "Bramble Bridges", theme="canopy", horizon=700, scenery="canopy",
             backdrop={"light_shafts": True})
L.ambience("leaves", 1.0)
L.ambience("pollen", 0.6)

# ---- S0 the village tree (x -300..900) ------------------------------------------------------
L.wall(-360, -1500, 1400)
L.tree_platform(-300, 900, 0, 220, 220)
L.deco("hut", 60, 0)
L.deco("lantern", 380, 0)
L.deco("lantern", 800, 0, 0.9)
L.sign(480, 0, "BRAMBLE BRIDGES. It's a long way\ndown - mind your step!", 380)
L.lums(250, -120, 700, -120, 5)

# ---- S1 the first bridge + a rolling hedgehog (900..2300) ------------------------------------
L.bridge(900, 0, 1700, -40)
L.lums(1000, -110, 1600, -150, 6, 30)
L.tree_platform(1700, 2320, -40, 1920, 200)
L.enemy("prickleroll", 2150, -40)
L.deco("hut", 2150, -40, 0.8)
L.sign(1740, -40, "Hedgehogs roll along bridges.\nJump over them!", 340)

# ---- S2 the swinging log (2320..3300) --------------------------------------------------------
L.pendulum(2800, -470, rope=420, width=210, amplitude=0.7, period=3.4)
L.lums(2560, -260, 3040, -260, 6, -70)
L.tree_platform(3220, 3950, -60, 3520, 220)

# ---- S3 the frog + seesaw deck (3300..3950) --------------------------------------------------
L.checkpoint(3360, -60)
L.enemy("ribbiton", 3480, -60, sit_time=2.4, spring=1.72)
L.gem(3470, -640)
L.lums(3470, -300, 3470, -560, 4)
L.seesaw(3760, -60, 300)
L.lums(3880, -420, 3880, -640, 4)                 # up where the seesaw flings a friend
L.acorns(3860, -470, interval=2.4)                 # over the seesaw, not the landing spot
L.sign(3560, -60, "Bounce on the frog... or slam the seesaw\nto fling a friend sky-high!", 380)

# ---- S4 zipline to the next tree (3950..5600) ------------------------------------------------
L.block(3850, -300, 110, 240)
L.ledge(3740, -190, 110)
L.zipline(3905, -330, 5020, -150)
L.lums(4100, -340, 4900, -210, 8)
L.enemy("bumblebonk", 4500, -560)
L.tree_platform(4900, 5620, -100, 5150, 220)
L.checkpoint(4980, -100)
L.deco("hut", 5450, -100, 0.9)

# ---- S5 the broken bridge + spiky pendulum (5620..6800) -------------------------------------
L.bridge(5620, -100, 6320, -60, broken=(4, 5, 10))
L.pendulum(5970, -660, rope=525, width=150, amplitude=1.0, period=2.8, spiked=True)  # head height: duck or dodge
L.sign(5200, -100, "Broken planks! And that spiky log\nswings at head height - DUCK!", 380)
L.lums(5700, -170, 6250, -150, 6, 20)
# Hidden ledge under the bridge (drop through gap 4/5), mushroom back up.
L.block(5740, 240, 220, 30)
L.gem(5800, 180)
L.pad(5920, 240, height=620)
L.tree_platform(6320, 6820, -60, 6480, 200)
L.enemy("shellbert", 6500, -60, facing=1)
L.enemy("grunt", 6700, -60)

# ---- S6 the great trunk: vine climb, with a hollow (6820..7700) ------------------------------
L.checkpoint(6380, -60)
L.land([(7000, -600), (7300, -600)], bottom=1400)       # lower trunk (floor of the hollow)
L.terrain([(7000, -800), (7300, -800), (7300, -1200), (7000, -1200)], rounding=8.0)  # upper trunk
L.block(7280, -800, 20, 200)                             # closes the hollow's far side
L.vine(6975, -1180, 1080)
L.snoozling(7160, -600, fur=C(0.7, 1.0, 0.6))
L.lums(7060, -700, 7220, -700, 3)
L.sign(6560, -60, "Climb the vines up the great trunk.\n(Anything inside that hollow?)", 380)

# ---- S7 the canopy top (7000..8900) ---------------------------------------------------------
L.checkpoint(7060, -1200)
L.land([(7000, -1200), (7700, -1200)], bottom=-1140, rounding=10.0)   # a thick branch deck
L.leaf(7900, -1240, width=160)
L.leaf(8150, -1300, width=160)
L.leaf(8420, -1500, width=140, depth=240)
L.gem(8490, -1580)
L.leaf(8500, -1240, width=160)
L.enemy("bumblebonk", 8250, -1600)
L.block(8680, -1240, 260, 40)
L.lums(7800, -1320, 8600, -1340, 7, 30)
L.deco("lantern", 8900, -1240)

# ---- S8 the long zipline home (8900..10700) --------------------------------------------------
L.zipline(8870, -1300, 9950, -520)
L.lums(9000, -1260, 9850, -600, 9)
L.tree_platform(9850, 10700, -450, 10150, 240)
L.checkpoint(9920, -450)
L.goal(10450, -450)
L.deco("hut", 10150, -450)
L.deco("lantern", 10650, -450)
L.wall(10700, -2000, -450)

L.pit_kill(-300, 10760, 1250)
L.dress(-250, 10700, "forest", spacing=190, seed=41, trees=False,
        skip=[(3400, 3950), (5620, 6320), (7000, 7300)])

L.finish(spawn=(0, -2), left=-360, right=10760, bottom=900, kill_y=1300)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_4_bramble_bridges.tscn"))
