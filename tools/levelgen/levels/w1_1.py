"""World 1-1: PILLOW MEADOW - a gentle opener in a sleepy meadow.
Teaches: running/jumping over little gaps, stomping Grumblets, kicking
Shellbert's shell into a line of enemies + crates, bouncing off a Ribbiton to
climb a cliff, riding a dandelion puff over a big valley, Diggle, and a
swinging-log finale.
Secrets: gem 0 on a high ledge over the second gap, gem 1 behind a cracked
wall, gem 2 at the top of the pendulum's swing; the Snoozling hides in a cave
under the dandelion valley (parachute down into it, a mushroom sends you back).
Regenerate: python3 tools/levelgen/levels/w1_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("PillowMeadow", "Pillow Meadow", theme="meadow", horizon=0, scenery="hills")
L.ambience("pollen", 1.0)
L.ambience("petals", 0.4)

# ---- S0 start: the village green (x -300..1300) -------------------------------------------
L.wall(-360, -1100, 500)
L.land([(-300, 0), (380, 0), (560, -18), (760, -8), (880, -50), (1010, -50), (1070, 0), (1250, 0)])
L.sign(80, 0, "Welcome to the Lullaby Woods!\nEverything's asleep... let's wake it up.", 420)
L.lums(380, -120, 780, -120, 5, 50)
L.lums(930, -130, 990, -130, 2)
for x, k, s in [(-150, "tree", 1.1), (40, "big_flower", 1.0), (300, "fence", 1.0), (520, "flowers", 1.0),
                (700, "stump", 0.9), (1100, "tree", 0.9), (1180, "grass", 1.0), (620, "grass", 1.2)]:
    L.deco(k, x, 0, s)
L.deco("grass", 450, 0, 1.3, front=True)

# ---- S1 first Grumblets + tiny gaps (1250..2700) ------------------------------------------
L.pit_kill(1250, 1430, 480)
L.land([(1430, 0), (1650, 0), (1850, -24), (2000, -24)])
L.lums(1280, -110, 1400, -110, 3, 40)
L.enemy("grunt", 1700, 0)
L.block(1760, -130, 160, 20, one_way=True)
L.lums(1780, -200, 1900, -200, 3)
L.pit_kill(2000, 2200, 480)
L.lums(2030, -120, 2170, -120, 3, 50)
L.land([(2200, 0), (2500, -12), (2900, 0)])
L.enemy("grunt", 2450, 0)
L.enemy("grunt", 2650, 0, facing=1)
L.sign(2240, 0, "Grumblets! Jump on them,\nor PUNCH them (Shift / X).", 380)
for x, k, s in [(1500, "flowers", 1.0), (1900, "bush", 0.9), (2320, "big_flower", 0.8), (2800, "rock", 0.8)]:
    L.deco(k, x, 0, s)

# ---- S2 bigger gaps + gem 0 up high (2900..3700) ------------------------------------------
L.pit_kill(2900, 3150, 480)
L.land([(3150, -60), (3320, -60)])
L.pit_kill(3320, 3560, 480)
L.lums(2930, -160, 3120, -160, 4, 70)
L.lums(3340, -200, 3540, -200, 4, 70)
L.block(3250, -330, 190, 20, one_way=True)       # high ledge over the second gap
L.gem(3345, -390)
# One piece from here to the dandelion valley: meadow, steps, the cliff and its hidden cave.
L.land([(3560, 0), (4400, 0), (5000, 0), (5330, 0), (5330, -110), (5480, -110), (5480, 0), (5700, 0),
        (5700, -440), (6920, -440), (6920, -110), (6560, -110), (6560, 180), (7020, 180)])
L.checkpoint(3660, 0)
L.deco("tree", 3900, 0, 1.2)

# ---- S3 Shellbert bowling (3700..5200) -----------------------------------------------------
L.sign(3760, 0, "SHELLBERT: stomp him, then kick\nthe shell into everything!", 400)
L.enemy("shellbert", 4050, 0, facing=1, walk_speed=0.0)
for i in range(3):
    L.enemy("grunt", 4450 + i * 110, 0, walk_speed=0.0, sight=0.0)
L.crate(4850, 0, 64, lums=3)
L.crate(4850, -64, 64, lums=3)
L.crate(4914, 0, 64, lums=3)
L.wall(5000, -140, 0, 40)                        # the shell rebounds off this post
L.lums(4200, -180, 4900, -180, 8, 30)
for x, k, s in [(4300, "grass", 1.0), (4700, "flowers", 1.0), (5120, "fence", 0.8)]:
    L.deco(k, x, 0, s)

# ---- S4 the cliff: stairs, a frog and a wall (5200..6400) -------------------------------------
L.enemy("ribbiton", 5590, 0, sit_time=1.8, spring=1.62)
L.sign(5350, -110, "Bounce off RIBBITON to reach\nthe cliff - or wall-jump up it!", 380)
L.lums(5600, -280, 5660, -420, 3)
L.deco("big_flower", 5250, 0, 1.2)
L.deco("stump", 5480, -110, 0.7)

# ---- S5 the dandelion valley + Snoozling cave (6400..7900) -----------------------------------
L.checkpoint(5800, -440)
L.dandelion(6860, -440, height=190)
L.dandelion(6660, -440, height=150)
L.sign(5950, -440, "Jump into a DANDELION and float\nacross the valley. (JUMP lets go)", 400)
L.pit_kill(7020, 7700, 700)
L.lums(6600, -600, 7500, -520, 10, -60)
for x, k in [(6250, "flowers"), (6100, "grass"), (6500, "big_flower")]:
    L.deco(k, x, -440)
# The hidden cave: a shelf in the valley wall below the puff route.
L.snoozling(6760, 180, fur=C(1.0, 0.72, 0.85))
L.lums(6600, 120, 6720, 120, 3)
L.pad(6975, 180, height=760)                     # just outside the mouth: back up to the cliff top
L.deco("mushrooms", 6620, 180)
L.deco("hanging_vines", 6700, -110, 0.8)
L.land([(7700, -100), (8050, -100), (8120, -200), (8460, -200), (8530, -100), (9300, -100), (9300, -220), (9460, -220)])

# ---- S6 Diggle's hill + cracked wall (7700..9300) ---------------------------------------------
L.checkpoint(7780, -100)
L.enemy("diggle", 8300, -200)
L.lums(8150, -280, 8430, -280, 4)
L.sign(7880, -100, "DIGGLE pops up to throw dirt.\nHit him while he's out!", 380)
L.enemy("grunt", 8750, -100)
# Gem 1: behind a cracked wall at the end of the meadow.
L.breakable(9000, -300, 60, 200)
L.block(9060, -300, 240, 20)                     # little room roof
L.block(9280, -300, 20, 200)
L.gem(9170, -160)
L.lums(9100, -200, 9240, -200, 3)
L.sign(8850, -100, "That wall looks cracked...", 280)
for x, k, s in [(7900, "tree", 1.0), (8600, "bush", 1.0), (8900, "log", 0.9)]:
    L.deco(k, x, -100, s)

# ---- S7 swing to the finish (9300..11000) -------------------------------------------------
L.pit_kill(9300, 10300, 600)
L.crumble(9520, -260, 140)
L.pendulum(9900, -640, rope=380, width=200, amplitude=0.8, period=3.4)
L.gem(9900, -310)                               # at the bottom of the swing: ride through it
L.lums(9650, -440, 10150, -440, 6, -60)
L.land([(10300, -200), (10700, -224), (11000, -200), (11400, -200)])
L.checkpoint(10380, -200)
L.goal(11050, -200)
L.lums(10500, -300, 10900, -300, 5, 40)
L.sign(10560, -200, "Nice! The Dream Gate is just ahead.", 360)
for x, k, s in [(10450, "big_flower", 1.0), (10800, "tree", 1.2), (11250, "fence", 1.0), (10650, "flowers", 1.0)]:
    L.deco(k, x, -200, s)
L.wall(11400, -1300, -200)

# Scenery along the whole walk (skips the busy bits).
L.dress(-250, 11350, "meadow", spacing=140, seed=11, skip=[(4020, 5010), (5540, 5700), (6560, 7020)])

L.finish(spawn=(0, -2), left=-360, right=11460, bottom=600, kill_y=900)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_1_pillow_meadow.tscn"))
