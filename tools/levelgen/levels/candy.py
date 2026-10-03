"""Candy Canopy - bouncy candy jungle: mushrooms, Boingo chains, vines, swing
rings, a soda lake and a syrup flood chase.  cd tools/levelgen && python3 levels/candy.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit

L = LevelKit("CandyCanopy", "Candy Canopy", theme="candy", horizon=0, scenery="candy")

# ---- start (x -300..900) ---------------------------------------------------------------
L.wall(-360, -1000, 500)
L.ground(-300, 1500, 0)
L.sign(250, 0, "Welcome to the CANDY CANOPY!\nEverything here is bouncy.", 380)
L.lums(500, -120, 850, -120, 5, 60)
for x, k in [(-150, "lollipop"), (80, "candy_cane"), (700, "lollipop"), (1000, "flowers"), (1350, "candy_cane")]:
    L.deco(k, x, 0)

# ---- S1 mushrooms + Boingo chain over a soda pool (900..2800) -------------------------------------
L.pad(1050, 0)
L.ledge(1150, -440, 220)
L.lums(1170, -520, 1350, -520, 4)
L.enemy("grunt", 1350, 0)
L.checkpoint(1420, 0)
L.enemy("boingo", 1750, -60, bob_height=10.0)
L.enemy("boingo", 2010, -90, bob_height=10.0)
L.lums(1720, -300, 1990, -330, 4, 60)
# Missed a bounce? Splash into the soda and climb a vine out.
L.block(1500, 420, 700, 120)
L.water(1500, 120, 700, 300)
L.vine(2180, -40, 460)
L.lum(1700, 360); L.lum(1850, 360); L.lum(2000, 360)
L.ground(2200, 3620, 0)
L.enemy("grunt", 2500, 0)
L.sign(2380, 0, "Bounce across on the BOINGOS!", 320)
L.deco("lollipop", 2750, 0, 1.3)

# ---- S2 canopy climb + ring swing (2900..4400) --------------------------------------------------
L.checkpoint(2880, 0)
L.block(3080, -620, 80, 620)                 # tree trunk
L.vine(3060, -620, 600)
L.ledge(3160, -620, 440)                     # canopy
L.gem(3120, -700)
L.enemy("flapjack", 3300, -780, patrol_offset=(250, 0))
L.lums(3220, -700, 3560, -700, 4)
for x, y in [(3720, -720), (3960, -700), (4200, -720)]:
    L.ring(x, y)
L.lums(3720, -620, 4200, -620, 5, -40)
L.pit_kill(3620, 4440, 400)
L.block(4440, -620, 560, 1120)               # landing cliff
L.sign(3300, 0, "Climb the vine, swing the rings!", 340)
L.enemy("spitpod", 4700, -620)
L.deco("candy_cane", 4940, -620)

# ---- S3 soda lake (5000..6600) ------------------------------------------------------------------------
L.ground(5000, 5300, 0)
L.checkpoint(5080, 0)
L.block(5300, 480, 1200, 120)                # lake bed
L.water(5300, 0, 1200, 480, current=(60, 0))
L.block(5680, -40, 120, 520)                 # island pillar
L.enemy("spitpod", 5740, -40)
L.spikeball(6000, 250, count=2, radius=120, speed=50)
L.lums(5350, 150, 5650, 150, 4); L.lums(5850, 350, 6350, 350, 5)
L.breakable(6380, 330, 60, 150, lums=0)
L.gem(6450, 420)                             # behind the breakable reef
L.ground(6500, 7000, 0)
L.sign(4820, -620, "Soda lake ahead -\nswim! The current\nhelps you along.", 260)
L.deco("reeds", 5290, 0, front=True); L.deco("reeds", 6510, 0, front=True)

# ---- S4 Boingo + bumper skyway (7000..7900) -------------------------------------------------------------
L.checkpoint(6620, 0)
L.enemy("spikeroo", 6850, 0)
for x, y in [(7160, -140), (7420, -230), (7680, -140)]:
    L.enemy("boingo", x, y, bob_height=20.0)
L.bumper(7420, -560)
L.lums(7160, -380, 7680, -380, 6, 80)
L.pit_kill(7000, 7900, 400)
L.ground(7900, 9460, 0)

# ---- S5 switch puzzle (7900..9500) ------------------------------------------------------------------------
L.checkpoint(7980, 0)
L.enemy("shieldbug", 8250, 0)
L.pad(8450, 0, height=560)
L.ledge(8560, -420, 220)
gate = L.gate(9100, -330, 48, 330)
L.switch(8700, -420, [gate], mode=1)
L.sign(8150, 0, "The gate needs a punch...\nbut where's the switch?", 340)
L.enemy("grunt", 8900, 0); L.enemy("grunt", 9300, 0, facing=1)
L.lums(8580, -500, 8760, -500, 3)

# ---- S6 syrup flood chase (9460..10500) --------------------------------------------------------------------
L.checkpoint(9380, 0)
L.sign(9250, 0, "Uh oh. Is that SYRUP?\nCLIMB!", 280)
L.block(9460, -1400, 60, 1250)                 # left shaft wall (walk in underneath)
L.block(10140, -1250, 60, 1750)                # right shaft wall (hop over the top)
L.ground(9460, 10140, 0, 2600)
entry = L.gate(9460, -150, 60, 150, start_open=True, stay_open=False, open_offset=(0, -150))
syrup = L.lava(9520, 300, 620, rise=1500, speed=85)
L.extra(syrup, color=__import__("tscn").C(1.0, 0.45, 0.7))
L.zone(9540, -300, 200, 300, [syrup])
L.zone(9540, -300, 200, 300, [entry], send_on=False)
for i in range(10):
    L.ledge(9520 if i % 2 == 0 else 9860, -140 * (i + 1), 280)
L.lums(9630, -230, 9630, -1100, 6)

# ---- S7 sweet summit + goal (10200..11600) -------------------------------------------------------------------
L.block(10200, -1250, 500, 1750)
L.breakable(10700, -1250, 200, 40)           # cracked candy floor: ground pound it!
L.block(10700, -1000, 200, 1500)             # secret chamber floor
L.pad(10800, -1000, height=460)
L.gem(10870, -1060)
L.lums(10730, -1060, 10730, -1180, 3)
L.secret(10700, -1210, 200, 210)
L.block(10900, -1250, 700, 1750)                # the summit (its far edge drops to the gumdrops)
L.checkpoint(10300, -1250)
L.lums(10400, -1330, 11000, -1330, 7, 60)
for x in [10450, 11150]:
    L.deco("lollipop", x, -1250, 1.2)
L.sign(11400, -1250, "Gumdrop hops all the way\ndown to the candy meadow!", 320)

# ---- S8 gumdrop hops down the far side (11600..13800) ----------------------------------------------------------
L.pit_kill(11600, 13800, 900)
for i, x0 in enumerate([11800, 12300, 12800, 13300]):
    y = -1100 + i * 150
    L.island(x0, x0 + 250, y, depth=110)
    L.lums(x0 + 40, y - 100, x0 + 210, y - 100, 3, 30)
    L.deco("candy_cane" if i % 2 == 0 else "lollipop", x0 + 200, y, 0.9)
L.enemy("bumblebonk", 12550, -1350)
L.enemy("boingo", 13150, -1050)

# ---- S9 the candy meadow and the gate (13800..15000) --------------------------------------------------------------
L.land([(13800, -500), (15000, -500)], bottom=1000)
L.checkpoint(13880, -500)
L.crate(14100, -500, 64, lums=3)
L.crate(14164, -500, 64, lums=3)
L.enemy("grunt", 14350, -500)
L.lum_block(14250, -800, lums=6)
L.goal(14600, -500)
L.lums(14400, -600, 14550, -600, 3)
for x, k in [(13950, "lollipop"), (14450, "candy_cane"), (14850, "lollipop")]:
    L.deco(k, x, -500, 1.1)
L.wall(15000, -2200, -500)

L.finish(spawn=(0, -2), left=-300, right=15000, bottom=600, kill_y=1000)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/candy_canopy.tscn"))
