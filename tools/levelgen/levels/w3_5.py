"""World 3-5: FIREFLY BOG - a dark, steamy swamp lit only by fireflies and glowing flowers.
Teaches: lily-leaf hops over Nibblefin pools in the dark, a flytrap meadow with
monkeys, a three-liana swing over the sinkhole, floating log stepping stones,
a root tunnel full of flytraps, drifting logs over the sinkhole and the
glowcap clearing to the stilt-village gate.
Secrets: gem 0 on top of the dead tree (mushroom pad), gem 1 on a log far out
in the stepping-stone pool, gem 2 in a hollow stump at the finish; the
Snoozling is on the little island in the middle of the log pool.
Regenerate: python3 tools/levelgen/levels/w3_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

LIME = C(0.75, 1.0, 0.4)
PINK = C(1.0, 0.5, 0.85)
L = LevelKit("FireflyBog", "Firefly Bog", theme="swamp", horizon=0, scenery="jungle", backdrop={"stars": True})
L.ambience("fireflies", 1.6, darkness=C(0.42, 0.48, 0.55))
L.ambience("spores", 0.6)


def lamp(x, y, color=LIME, r=320):
    """A glowing bog flower (light + a bromeliad)."""
    L.glow(x, y - 60, color, radius=r, energy=0.9)
    L.deco("bromeliad", x, y, 1.2)


# ---- S0 the bog's edge (x -300..1400) -----------------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (1400, 0), (1420, 220), (3180, 220), (3200, 0), (4800, 0)], bottom=1500)
L.sign(90, 0, "FIREFLY BOG. It's dark down here...\nfollow the glowing flowers.", 420)
lamp(500, 0)
lamp(1150, 0, PINK)
L.deco("big_leaf", 800, 0)
L.lums(300, -110, 1000, -110, 6, 40)

# ---- S1 the lily pools (1400..3200) ----------------------------------------------------------------
L.water(1400, 20, 1800, 200)
for x in [1560, 1820, 2080, 2340, 2600, 2860, 3110]:
    L.leaf(x, -20, width=150, sink=70, depth=300)
L.enemy("nibblefin", 1950, 20, leap_height=260.0)
L.enemy("nibblefin", 2470, 20, leap_height=260.0, phase=0.5)
L.glow(1900, -150, LIME, radius=380, energy=0.7)
L.glow(2700, -150, PINK, radius=380, energy=0.7)
L.lums(1500, -120, 3000, -120, 12, 20)

# ---- S2 the flytrap meadow (3200..4800) ------------------------------------------------------------
L.checkpoint(3260, 0)
L.bell(3380, 0)
lamp(3600, 0)
L.snaptrap(3700, 0)
L.snaptrap(3950, 0)
L.pad(4120, 0, height=620)
L.tree_platform(4250, 4560, -420, 4380, trunk_w=110)
L.gem(4480, -480)                                  # gem 0 on the dead tree
L.lums(4270, -500, 4430, -500, 3)
L.enemy("cocobonk", 4700, 0)
lamp(4650, 0, PINK)
L.lums(3650, -150, 4050, -150, 5, 30)

# ---- S3 the sinkhole: three lianas (4800..6400) ------------------------------------------------------
L.pit_kill(4800, 6200, 700)
for x, ph in [(5030, 0.2), (5490, 0.9), (5950, 0.5)]:
    L.liana(x, -520, 330, sway=0.13, phase=ph)
L.glow(5500, -300, LIME, radius=500, energy=0.6)
L.enemy("swoopbeak", 5700, -620)
L.lums(4920, -300, 6080, -300, 10, 80)

# ---- S4 the log stepping stones (6200..8400) -----------------------------------------------------------
L.land([(6200, 0), (6600, 0), (6620, 260), (8180, 260), (8200, 0), (12900, 0)], bottom=1500)
L.land([(14800, 0), (16500, 0)], bottom=1500)
L.checkpoint(6280, 0)
lamp(6450, 0)
L.water(6600, 20, 1600, 240)
for x in [6800, 7060, 7320, 7840, 8080]:
    L.raft(x, 20, width=150, travel=0, current=0)
L.island(7480, 7680, -40, depth=60)                # the little island in the middle
L.snoozling(7580, -40, fur=C(0.8, 1.0, 0.5))
L.enemy("nibblefin", 6930, 20, leap_height=240.0)
L.enemy("nibblefin", 7960, 20, leap_height=240.0, phase=0.6)
L.gem(8080, -140)                                  # gem 1 over the last log
L.glow(7580, -200, PINK, radius=420, energy=0.8)
L.lums(6700, -100, 7400, -100, 6, 20)
L.lums(7740, -100, 8100, -100, 3, 20)

# ---- S5 the root tunnel (8400..10200) ---------------------------------------------------------------------
L.checkpoint(8300, 0)
L.ceiling([(8500, -900), (8510, -320), (10100, -320), (10110, -900)], top=-2600)
for x in [8800, 9100, 9450, 9750]:
    L.snaptrap(x, 0)
for x in [8650, 9300, 9950]:
    L.glow(x, -200, LIME, radius=280, energy=0.8)
L.lums(8700, -110, 9900, -110, 10, 20)
L.enemy("cocobonk", 10400, 0)

# ---- S6 the finish (10200..12600) ---------------------------------------------------------------------------
L.checkpoint(10260, 0)
lamp(10600, 0, PINK)
# Gem 2: a hollow stump - punch its front open. The path climbs over its top.
L.breakable(11000, -140, 40, 140, lums=2)
L.block(11000, -160, 300, 20)
L.block(11280, -160, 20, 160)
L.gem(11140, -60)
L.secret(11040, -140, 240, 140)
L.snaptrap(11550, 0)
L.enemy("swoopbeak", 11700, -460)
lamp(12000, 0)
L.lums(11800, -110, 12120, -110, 4, 30)

# ---- S7 the drifting logs over the sinkhole (12900..14800) ---------------------------------------------
L.checkpoint(12450, 0)
L.pit_kill(12900, 14800, 700)
L.moving(12910, 0, w=200, h=30, waypoints=((680, 0),), speed=150, wait=1.0, rider=True)
L.island(13600, 13900, 0, depth=120)
lamp(13750, 0, PINK)
L.moving(13910, 0, w=200, h=30, waypoints=((690, 0),), speed=150, wait=1.0, rider=True)
L.enemy("swoopbeak", 13300, -480)
L.lums(12950, -120, 14700, -120, 12, 30)
for x in [13250, 14300]:
    L.glow(x, -150, LIME, radius=260, energy=0.7)

# ---- S8 the glowcap clearing and the stilt-village gate (14800..16500) -----------------------------------
L.checkpoint(14880, 0)
lamp(15050, 0, PINK)
L.snaptrap(15300, 0)
L.enemy("cocobonk", 15600, 0)
L.snaptrap(15850, 0)
L.lums(15150, -110, 15950, -110, 8, 30)
L.goal(16150, 0)
lamp(15950, 0)
lamp(16400, 0, PINK)
L.deco("hut", 16300, 0, 0.9)
L.deco("reeds", 16480, 0)
L.wall(16500, -1400, 0)

L.dress(-250, 1380, "swamp", spacing=150, seed=51)
L.dress(3220, 4780, "swamp", spacing=150, seed=52, skip=[(3650, 4000), (4100, 4600)])
L.dress(10150, 16450, "swamp", spacing=160, seed=53, skip=[(10950, 11350), (11500, 11600), (12550, 12700), (12880, 14820),
        (15250, 15350), (15800, 15900), (16100, 16200)])
L.finish(spawn=(0, -2), left=-360, right=16560, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w3_5_firefly_bog.tscn"))
