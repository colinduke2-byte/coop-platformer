"""World 1-2: DANDELION DRIFT - a breezy sky level of floating islands.
Teaches: sinking leaf platforms, updrafts (glide or parachute into them),
chains of dandelions carried by the wind, Bumblebonk dashes, a frog boost,
one huge windy valley to cross, then Windmill Heights: a turning sail-wheel,
a balloon up to the sky meadow and a last puff down to the gate.
Secrets: gem 0 at the top of the first updraft, gem 1 high above the frog
island, gem 2 at the top of the valley updraft; the Snoozling's cage hangs in
the sky beside a hidden updraft near island B.
Regenerate: python3 tools/levelgen/levels/w1_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("DandelionDrift", "Dandelion Drift", theme="breezy", horizon=150, scenery="hills",
             backdrop={"cloud_sea": True})
L.ambience("pollen", 1.3)
L.ambience("leaves", 0.6)

# A gentle breeze over the first half, stronger gusts later.
L.wind(-300, -1600, 5400, 2400, wind=(60, 0))

# ---- S0 the hilltop (x -300..1400) ---------------------------------------------------------
L.wall(-360, -1300, 600)
L.land([(-300, 0), (700, 0), (900, -30), (1150, -40), (1400, -40)], bottom=1300)
L.sign(120, 0, "A breezy day! The wind pushes you -\nand anything you float on.", 420)
L.bell(520, 0)                                   # ring it and hurry: the leaves are full of Lums
L.lums(700, -110, 1100, -140, 4, 30)

# ---- S1 sinking leaves (1400..2600) --------------------------------------------------------
L.sign(1180, -40, "Leaves sink when you stand on them.\nKeep hopping!", 360)
for x, y in [(1600, -70), (1860, -130), (2120, -70), (2380, -110)]:
    L.leaf(x, y, width=150, sink=80, depth=320)
L.lums(1600, -180, 2380, -220, 8, 60)
L.enemy("bumblebonk", 2150, -420)
L.island(2600, 3300, -80, depth=180)
L.dandelion(3230, -80, height=170)

# ---- S2 the first updraft (3300..4300) -----------------------------------------------------
L.checkpoint(2700, -80)
L.sign(2780, -80, "Glide into the updraft (press JUMP\nagain in the air) - or float in on a puff!", 420)
L.updraft(3450, -1150, 200, 1450, rise=430)
L.gem(3550, -1180)                                 # right at the top of the column
L.lums(3550, -300, 3550, -1000, 8)
L.enemy("bumblebonk", 3950, -760)
L.island(4300, 5100, -500, depth=220, bumps=[(4600, -512), (4800, -506)])

# ---- S3 the high island (4300..5100) -------------------------------------------------------
L.checkpoint(4400, -500)
L.enemy("grunt", 4650, -500)
L.enemy("prickleroll", 4900, -500)
L.dandelion(5040, -500, height=180)
L.lums(4500, -720, 4950, -720, 5)

# ---- S4 the dandelion chain (5100..7700) ---------------------------------------------------
L.wind(5100, -1700, 3200, 2400, wind=(140, 0))
L.sign(4470, -500, "Ride the puffs across!\nJUMP lets go.", 260)
L.island(5900, 6150, -380, depth=160)
L.dandelion(6090, -380, height=170)
L.island(6850, 7100, -300, depth=160)
L.dandelion(7040, -300, height=170)
L.lums(5200, -700, 5850, -560, 6, -40)
L.lums(6200, -620, 6800, -520, 6, -40)
L.enemy("bumblebonk", 6450, -760)
L.enemy("bumblebonk", 7400, -640)
# Hidden: an updraft beside island B lifts you to the Snoozling's cage.
L.updraft(6600, -1150, 150, 900, rise=380)
L.snoozling(6960, -860, hanging=True, fur=C(1.0, 0.85, 0.5))
L.lums(6675, -900, 6675, -1100, 3)

# ---- S5 the frog island (7700..8300) -------------------------------------------------------
L.island(7700, 8320, -250, depth=200)
L.checkpoint(7780, -250)
L.enemy("ribbiton", 8000, -250, sit_time=2.2, spring=1.7)
L.gem(8000, -760)
L.lums(8000, -530, 8000, -690, 3)
L.dandelion(8280, -250, height=190)

# ---- S6 Gale Valley to the goal (8300..11200) ----------------------------------------------
L.wind(8300, -1700, 2000, 2400, wind=(220, 0))
L.sign(7840, -250, "GALE VALLEY! Grab the last\npuff and ride the wind!", 300)
L.leaf(9000, -360, width=170, sink=60, depth=280)
L.leaf(9650, -300, width=170, sink=60, depth=280)
L.updraft(9230, -1050, 150, 1350, rise=400)
L.gem(9305, -1080)
L.lums(8400, -620, 10100, -420, 14, -80)
L.enemy("bumblebonk", 8900, -760)
L.enemy("bumblebonk", 9900, -700)
L.pit_kill(-300, 16000, 880)
L.land([(10200, -150), (10600, -170), (11000, -150), (11350, -150), (11350, -500), (11700, -500)], bottom=1300)
L.checkpoint(10280, -150)
L.lums(10400, -250, 10800, -250, 5, 40)

# ---- S7 Windmill Heights (11350..15600) -----------------------------------------------------
# The cliff stops anyone still drifting on a puff; climb the steps to the heights.
L.sign(10900, -150, "WINDMILL HEIGHTS - climb up!", 300)
L.ledge(11170, -280, 170)
L.ledge(11010, -400, 160)
L.lums(11090, -470, 11300, -600, 4, 30)
L.wind(11700, -2100, 3900, 2400, wind=(70, 0))
L.wheel(12000, -690, count=4, radius=230, speed=28.0)
L.sign(11530, -500, "Hop onto the turning\nsails to cross!", 240)
L.lums(11780, -780, 12220, -780, 5, 60)
L.enemy("bumblebonk", 12000, -1120)
L.island(12450, 13050, -600, depth=190)
L.checkpoint(12480, -600)
L.balloon(12930, -600)
L.sign(12720, -600, "Grab a BALLOON to float up.\nPUNCH to pop it!", 290)
L.lums(13000, -850, 13000, -1400, 6)
# The sky meadow, way up high.
L.island(13120, 13820, -1300, depth=200, bumps=[(13400, -1312)])
L.enemy("grunt", 13380, -1300)
L.enemy("prickleroll", 13600, -1300)
L.lums(13320, -1500, 13700, -1500, 5, 30)
L.lum_block(13640, -1620, lums=5)
L.dandelion(13760, -1300, height=180)
L.sign(13200, -1300, "Last puff! Float\ndown to the gate.", 220)
L.lums(13900, -1250, 14600, -380, 9, -40)
L.enemy("bumblebonk", 14300, -800)
L.land([(14500, -150), (15600, -150)], bottom=1300)
L.checkpoint(14560, -150)
L.goal(15250, -150)
L.lums(14700, -250, 15100, -250, 5, 40)
L.wall(15600, -2000, -150)

L.dress(-250, 15600, "meadow", spacing=150, seed=21, skip=[(10850, 11700), (14500, 14700)])

L.finish(spawn=(0, -2), left=-360, right=15660, bottom=700, kill_y=1000)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_2_dandelion_drift.tscn"))
