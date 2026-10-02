"""World 3-1: DRIZZLE THICKET - warm rain on the edge of the Rainbloom Jungle.
Teaches: flytraps (step in and they snap a moment later - run across or jump
over), Cocobonk monkeys lobbing coconuts, swinging on LIANAS (first over safe
ground, then over a pit), a stream full of leaping Nibblefins, mushroom pads
up the jungle trees, then sinking leaves over a bog and the gate.
Secrets: gem 0 on the high ledges over the flytraps, gem 1 on top of the tall
tree (mushroom pad), gem 2 in a hollow behind a mossy wall at the finish; the
Snoozling's cage sits on the mossy rock in the stream.
Regenerate: python3 tools/levelgen/levels/w3_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("DrizzleThicket", "Drizzle Thicket", theme="jungle", horizon=0, scenery="jungle",
             backdrop={"light_shafts": True})
L.ambience("rain", 1.0)
L.ambience("leaves", 0.5)

# ---- S0 the jungle's edge (x -300..1500) ------------------------------------------------------
L.wall(-360, -1200, 600)
L.land([(-300, 0), (4150, 0)], bottom=1500)
L.sign(90, 0, "RAINBLOOM JUNGLE! Warm rain,\ngiant leaves... and hungry plants.", 420)
L.deco("hut", 620, 0)
L.deco("palm", 900, 0, 1.1)
L.deco("lantern", 1100, 0)
L.deco("totem", 1350, 0, 0.8)
L.lums(300, -110, 900, -110, 6, 40)

# ---- S1 the flytraps (1500..3300) -------------------------------------------------------------
L.sign(1560, 0, "FLYTRAPS snap shut a moment after\nyou step in. Run across - or jump!", 420)
L.snaptrap(1950, 0)
L.snaptrap(2450, 0)
L.snaptrap(2650, 0)
L.lums(1880, -150, 2020, -150, 3, 30)
L.lums(2380, -150, 2720, -150, 5, 30)
L.ledge(2150, -190, 160)
L.ledge(2400, -370, 150)                           # gem 0 up top
L.gem(2475, -430)
L.lums(2170, -260, 2290, -260, 3)
L.ledge(2950, -170, 180)
L.enemy("cocobonk", 3040, -170)
L.sign(3130, 0, "Cocobonks throw coconuts.\nPunch them back!", 320)
L.lums(2950, -250, 3130, -250, 3)

# ---- S2 the lianas (3300..5300) ---------------------------------------------------------------
L.checkpoint(3360, 0)
L.sign(3470, 0, "LIANAS! Jump into the leafy end. Pump\nLEFT / RIGHT, then JUMP to let go.", 420)
L.liana(3880, -520, 330)                           # practice: safe ground below
L.lums(3720, -240, 4040, -240, 4, 50)
L.pit_kill(4150, 5150, 700)
L.liana(4380, -500, 330, sway=0.1, phase=0.3)
L.liana(4840, -500, 330, sway=0.15, phase=1.1)
L.lums(4250, -300, 4980, -300, 7, 80)

# ---- S3 the Nibblefin stream (5150..7000) ------------------------------------------------------
L.land([(5150, 0), (5700, 0), (5740, 260), (6560, 260), (6600, 0), (9400, 0)], bottom=1500)
L.checkpoint(5260, 0)
L.water(5700, 20, 900, 240)
L.sign(5420, 0, "Nibblefins leap out of the stream -\nswim across between jumps!", 380)
L.enemy("nibblefin", 5950, 20, leap_height=280.0)
L.enemy("nibblefin", 6350, 20, leap_height=280.0, phase=0.5)
L.island(6080, 6230, -30, depth=70)                # a mossy rock in the stream
L.snoozling(6155, -30)
L.lums(5800, 140, 6050, 140, 3)
L.lums(6260, 140, 6500, 140, 3)
L.deco("big_leaf", 6700, 0, 1.2)

# ---- S4 jungle trees and monkeys (7000..9100) ---------------------------------------------------
L.checkpoint(7060, 0)
L.bell(7180, 0)
L.pad(7380, 0, height=520)
L.tree_platform(7500, 7850, -300, 7620, trunk_w=120)
L.enemy("cocobonk", 7790, -300)
L.lums(7520, -380, 7830, -380, 4)
L.snaptrap(8000, 0)
L.pad(8130, 0, height=700)
L.tree_platform(8250, 8600, -480, 8380, trunk_w=120)
L.gem(8520, -540)                                  # gem 1 on the tall tree
L.lums(8270, -560, 8450, -560, 3)
L.snaptrap(8800, 0)
L.enemy("cocobonk", 8900, 0)
L.lums(8650, -110, 9000, -110, 5, 30)
L.deco("palm", 8760, 0)

# ---- S5 sinking leaves over the bog (9100..10600) --------------------------------------------------
L.checkpoint(9040, 0)
L.sign(9270, 0, "Leaves sink\nunder you!", 200)
L.pit_kill(9400, 10600, 700)
for x in [9560, 9820, 10080, 10340]:
    L.leaf(x, -40, width=150, sink=80, depth=320)
L.enemy("swoopbeak", 9950, -460)
L.lums(9500, -150, 10420, -150, 8, 30)

# ---- S6 the finish (10600..12800) ------------------------------------------------------------------
L.land([(10600, 0), (12800, 0)], bottom=1500)
L.checkpoint(10700, 0)
L.enemy("swoopbeak", 10950, -460)
L.lums(10800, -110, 11200, -110, 5, 40)
# Gem 2: a hollow under a mossy mound - punch through its front wall. The path climbs over its roof.
L.breakable(11300, -140, 40, 140, lums=2)
L.block(11300, -160, 300, 20)
L.block(11580, -160, 20, 160)
L.gem(11440, -60)
L.secret(11340, -140, 240, 140)
L.snaptrap(11900, 0)
L.snaptrap(12120, 0)
L.lums(11830, -170, 12190, -170, 5, 40)
L.goal(12500, 0)
L.lums(12300, -110, 12450, -110, 3, 30)
L.deco("hut", 12680, 0, 0.8)
L.wall(12800, -1200, 0)

L.dress(-250, 12750, "jungle", spacing=160, seed=31,
        skip=[(1850, 2750), (4100, 5200), (5650, 6650), (7350, 7900), (8100, 8650), (9380, 10620), (11250, 11650),
              (11850, 12200)])
L.finish(spawn=(0, -2), left=-360, right=12860, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w3_1_drizzle_thicket.tscn"))
