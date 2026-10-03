"""World 3-4: RUMBLETIDE RAPIDS - the great jungle river, from the lazy lower bend up the falls.
Teaches: hopping drifting log rafts while Nibblefins leap between them, a
monkey-guarded bank, climbing the net beside a waterfall, a three-liana swing
over the roaring gorge, a fast upper river with rocky islets, then a long
muddy slide down to the river mouth (sinking lily leaves) and the fishing
village gate.
Secrets: gem 0 on the high ledges over the bank, gem 1 on the tallest rock in
the upper river, gem 2 in a mossy hollow at the finish; the Snoozling is on
the little islet in the upper river.
Regenerate: python3 tools/levelgen/levels/w3_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("RumbletideRapids", "Rumbletide Rapids", theme="rapids", horizon=0, scenery="jungle")
L.ambience("rain", 0.8)
L.ambience("leaves", 0.5)

# ---- S0 the lower bend (x -300..1300) -----------------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (1300, 0), (1320, 380), (3000, 380), (3020, 0), (5200, 0)], bottom=1500)
L.sign(90, 0, "RUMBLETIDE RAPIDS! The river runs\nfast and the fish are hungry.", 420)
L.deco("hut", 560, 0)
L.deco("palm", 860, 0)
L.bell(1080, 0)
L.lums(250, -110, 800, -110, 5, 40)

# ---- S1 the log rafts (1300..3000) ----------------------------------------------------------------
L.water(1300, 20, 1720, 360, current=(150, 0))
for i in range(3):
    L.raft(1360, 20, width=190, travel=1550, current=150, offset=i / 3)
L.enemy("nibblefin", 1950, 20, leap_height=240.0)
L.enemy("nibblefin", 2550, 20, leap_height=240.0, phase=0.5)
L.lums(1400, -90, 2900, -90, 12)

# ---- S2 the monkey bank (3000..4500) ---------------------------------------------------------------
L.checkpoint(3070, 0)
L.snaptrap(3550, 0)
L.ledge(3800, -190, 160)
L.ledge(4040, -370, 150)                           # gem 0 up top
L.gem(4115, -430)
L.lums(3820, -260, 3940, -260, 3)
L.ledge(3420, -170, 170)
L.enemy("cocobonk", 3510, -170)
L.snaptrap(4250, 0)
L.enemy("cocobonk", 4450, 0)
L.lums(3500, -110, 4400, -110, 8, 20)

# ---- S3 the waterfall climb (4500..5300) ------------------------------------------------------------
L.checkpoint(4560, 0)
L.waterfall(5060, -700, 140, 700)
L.net(5100, -780, 60, 750)
L.ledge(4930, -300, 130)
L.ledge(4930, -560, 130)
L.lums(5130, -150, 5130, -600, 6)

# ---- S4 the gorge: three lianas (5200..7700) ---------------------------------------------------------
L.land([(5200, -700), (6300, -700)], bottom=1500)
L.checkpoint(5280, -700)
L.enemy("swoopbeak", 5800, -1150)
L.pit_kill(6300, 7700, 700)
L.waterfall(6800, -500, 300, 1100)
for x, ph in [(6530, 0.3), (6990, 1.0), (7450, 0.6)]:
    L.liana(x, -1220, 330, sway=0.13, phase=ph)
L.lums(6420, -1000, 7580, -1000, 10, 80)

# ---- S5 the upper river (7700..10000) -------------------------------------------------------------------
L.land([(7700, -700), (8200, -700), (8220, -380), (9980, -380), (10000, -700), (10300, -700), (11300, 0),
        (12950, 0), (12970, 380), (14630, 380), (14650, 0), (17100, 0)], bottom=1500)
L.checkpoint(7760, -700)
L.water(8200, -680, 1800, 300, current=(190, 0))
for i in range(3):
    L.raft(8260, -680, width=180, travel=1650, current=190, offset=i / 3)
L.island(8940, 9100, -820, depth=40)               # flat islets: the rafts slide underneath
L.snoozling(9020, -820, fur=C(0.6, 0.9, 1.0))
L.island(9300, 9420, -940, depth=40)               # the tall rock (hop up from the islet): gem 1
L.gem(9360, -1000)
L.enemy("nibblefin", 8700, -680, leap_height=220.0)
L.enemy("swoopbeak", 9300, -1180)
L.lums(8280, -780, 8860, -780, 5)
L.lums(9500, -780, 9920, -780, 4)

# ---- S6 the mudslide and the gate (10000..13100) ---------------------------------------------------------
L.checkpoint(10080, -700)
L.enemy("cocobonk", 10900, -280)
L.lums(10350, -740, 11250, -60, 9)
L.checkpoint(11380, 0)
L.snaptrap(11700, 0)
# Gem 2: a mossy hollow - punch its front open. The path climbs over its roof.
L.breakable(12000, -140, 40, 140, lums=2)
L.block(12000, -160, 300, 20)
L.block(12280, -160, 20, 160)
L.gem(12140, -60)
L.secret(12040, -140, 240, 140)
L.lums(12400, -110, 12630, -110, 4, 30)

# ---- S7 the river mouth: sinking leaves over the water (12950..14650) -------------------------------------
L.checkpoint(12500, 0)
L.water(12970, 20, 1660, 360, current=(70, 0))
for x in [13180, 13480, 13780, 14080, 14380]:
    L.leaf(x, -30, width=160, sink=50, depth=240)
for i, x in enumerate([13400, 14000]):
    L.enemy("nibblefin", x, 20, leap_height=240.0, phase=i * 0.5)
L.lums(13180, -140, 14460, -140, 10, 40)
L.deco("lilypads", 13060, 22)
L.deco("lilypads", 14560, 22)

# ---- S8 the fishing village and the gate (14650..17100) ----------------------------------------------------
L.checkpoint(14740, 0)
L.snaptrap(15050, 0)
L.ledge(15300, -220, 200)
L.enemy("cocobonk", 15400, -220)
L.pad(15750, 0, height=720)
L.island(15850, 16250, -640, depth=120)
L.lum_block(16050, -940, lums=6)
L.lums(15880, -720, 16220, -720, 5, 30)
L.enemy("swoopbeak", 16200, -460)
L.goal(16700, 0)
L.lums(16350, -110, 16620, -110, 4, 30)
for x, k, s in [(14900, "hut", 0.9), (15550, "palm", 1.2), (16450, "hut", 1.0), (16950, "palm", 1.1), (16880, "big_leaf", 1.0)]:
    L.deco(k, x, 0, s)
L.wall(17100, -1400, 0)

L.dress(-250, 1280, "jungle", spacing=160, seed=41)
L.dress(3040, 4980, "jungle", spacing=160, seed=42, skip=[(3500, 3600), (4200, 4300)])
L.dress(5220, 6280, "jungle", spacing=160, seed=43)
L.dress(10300, 17050, "jungle", spacing=170, seed=44, skip=[(11650, 11750), (11950, 12350), (12600, 12800), (12930, 14680),
        (15000, 15100), (15700, 15800), (16650, 16750)])
L.finish(spawn=(0, -2), left=-360, right=17160, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w3_4_rumbletide_rapids.tscn"))
