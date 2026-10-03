"""World 2-4: AVALANCHE ALLEY - a peaceful valley... until it isn't.
A calm start, then a roaring avalanche chases you all the way down the
mountain: keep running, hop the crevasses, bop what's in your way, and leap
off the ski jump at the bottom as the snow crashes behind you. Then, safe at
the lodge, hop the ice floes across Frostbite Lake to the Yetlings' camp...
where a SECOND avalanche chases you down the Lower Gorge to the gate.
Checkpoints mid-chase: the avalanche restarts a safe way behind them.
Secrets: gem 0 on a high ledge before the chase (mushroom), gem 1 high over
the second crevasse (a sprint jump), gem 2 behind the lodge at the finish; the
Snoozling's cage dangles over the hilltop - punch it open on the run!
Regenerate: python3 tools/levelgen/levels/w2_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("AvalancheAlley", "Avalanche Alley", theme="avalanche", horizon=300, scenery="ice")
L.ambience("snow", 1.4)

# ---- The mountainside: one long downhill with crevasses ---------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (1500, 0), (3000, 300)], bottom=1800)
L.land([(3260, 320), (4200, 420), (4500, 340), (5200, 600)], bottom=1800)
L.land([(5480, 620), (6800, 800), (7400, 800)], bottom=1800)
L.land([(7680, 820), (8800, 1000), (9300, 1000), (9520, 930)], bottom=1800)          # ends in a ski jump
L.land([(9900, 900), (11700, 900)], bottom=1800)
L.land([(13300, 900), (15300, 900), (16400, 1150), (17500, 1300)], bottom=2200)
L.land([(17760, 1320), (18700, 1450), (19800, 1450)], bottom=2200)
L.pit_kill(17500, 17760, 2100)
for x0, x1 in [(3000, 3260), (5200, 5480), (7400, 7680), (9520, 9900)]:
    L.pit_kill(x0, x1, 1700)

# ---- S0 the quiet valley (x -300..1500) ------------------------------------------------------------
L.sign(90, 0, "AVALANCHE ALLEY. Shh... it's awfully\nquiet up here. Too quiet...", 400)
L.deco("snowman", 600, 0)
L.deco("skis", 750, 0)
L.pad(420, 0, height=700)
L.ledge(330, -700, 180)                            # gem 0 up high, before the chase
L.gem(420, -760)
L.bell(1100, 0)
L.lums(250, -110, 950, -110, 6, 30)
L.sign(1250, 0, "Ring the bell... then RUN\n(hold SPRINT) and don't stop!", 360)

# ---- The avalanche ----------------------------------------------------------------------------------
ava = L.avalanche(-900, 0, distance=10350, speed=450, height=900, depth=1400)
L.zone(1400, -800, 200, 1200, [ava])

# ---- The chase ---------------------------------------------------------------------------------------
L.lums(1600, -80, 2900, 210, 12)
L.lums(3040, 140, 3220, 140, 3, -60)                # over the first crevasse
L.enemy("grunt", 3700, 367, walk_speed=0.0)
L.lums(3400, 230, 4150, 320, 7)
L.snoozling(4500, 120, hanging=True, fur=C(0.8, 0.95, 1.0))
L.checkpoint(4280, 404)
L.lums(4600, 280, 5150, 480, 6)
L.gem(5340, 300)                                    # high over the second crevasse
L.lums(5260, 480, 5420, 480, 3, -60)
L.enemy("grunt", 6100, 710, walk_speed=0.0)
L.enemy("snowl", 6400, 400)
L.lums(5550, 540, 6750, 700, 12)
L.checkpoint(6860, 800)
L.lums(7440, 700, 7640, 700, 3, -60)
L.enemy("grunt", 8250, 910, walk_speed=0.0)
L.lums(7750, 740, 9250, 900, 14)
L.lums(9560, 780, 9860, 780, 4, -80)                # the big jump

# ---- Safe at the bottom (9900..11400) ----------------------------------------------------------------
L.checkpoint(9980, 900)
L.deco("hut", 10400, 900)
L.deco("igloo", 10900, 900, 0.9)
L.lums(10100, 800, 10500, 800, 5, 40)
L.sign(10650, 900, "Phew! Safe...\nfor now.", 340)
# Gem 2: tucked in the lodge's snow shed - over its roof, or in through the front.
L.block(11180, 760, 20, 140)
L.block(11180, 740, 240, 20)
L.block(11400, 740, 20, 160)
L.gem(11290, 850)
L.secret(11200, 760, 200, 140)

# ---- S7 Frostbite Lake and the Yetlings' camp (11700..15200) --------------------------------------
L.checkpoint(11480, 900)
L.water(11700, 940, 1600, 420, current=(50, 0))
L.block(11700, 1360, 1600, 400)                      # the lake bed
for x0, x1, y in [(11890, 12050, 900), (12240, 12390, 880), (12590, 12750, 900), (12950, 13100, 880)]:
    L.terrain([(x0, y), (x1, y), (x1 - 10, y + 60), (x0 + 10, y + 60)], rounding=8.0, slippery=True)
L.lums(11800, 780, 13200, 780, 12, 30)
L.enemy("snowl", 12400, 560)
L.checkpoint(13380, 900)
L.block(13800, 800, 40, 100)                         # snow walls
L.enemy("yetling", 13950, 900)
L.block(14250, 800, 40, 100)
L.enemy("yetling", 14400, 900)
L.snowpile(13600, 900, max_radius=80)
L.lums(13500, 780, 14500, 780, 9)
L.deco("igloo", 14700, 900, 1.0)
L.deco("lantern", 14550, 900)

# ---- S8 IT'S NOT OVER: a second avalanche down the Lower Gorge (14800..18800) ------------------------
L.checkpoint(14820, 900)
ava2 = L.avalanche(13900, 900, distance=4900, speed=440, height=900, depth=1600)
L.zone(15250, 200, 200, 1200, [ava2])
L.lums(15400, 820, 16350, 1060, 10)
L.enemy("grunt", 15900, 1028, walk_speed=0.0)
L.enemy("slidgewick", 16800, 1205)
L.checkpoint(16600, 1178)
L.lums(16500, 1080, 17450, 1220, 9)
L.lums(17540, 1150, 17720, 1150, 3, -70)            # over the crevasse
L.enemy("grunt", 18200, 1385, walk_speed=0.0)
L.lums(17850, 1230, 18650, 1360, 8)

# ---- S9 the lower lodge and the gate (18800..19800) ----------------------------------------------
L.checkpoint(18850, 1450)
L.goal(19350, 1450)
L.lums(18950, 1350, 19250, 1350, 4, 30)
for x, k, s in [(19050, "hut", 1.0), (19600, "igloo", 1.0), (19500, "lantern", 1.0), (19750, "pine", 1.2), (18760, "snowman", 1.0)]:
    L.deco(k, x, L.surface_y(x), s)
L.wall(19800, -1400, 1450)

L.dress(-250, 19750, "snow", spacing=180, seed=24, skip=[(-300, 200), (2950, 3300), (5150, 5520), (7350, 7720), (9300, 9950),
        (11150, 11450), (11650, 13350), (13550, 14500), (15200, 15500), (17450, 17800), (19300, 19420)])
L.finish(spawn=(0, -2), left=-360, right=19860, bottom=1950, kill_y=2300)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_4_avalanche_alley.tscn"))
