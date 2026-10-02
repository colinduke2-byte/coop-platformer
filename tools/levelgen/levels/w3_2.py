"""World 3-2: CANOPY HIGHWAY - a road through the treetops, far above the jungle floor.
Teaches: rope bridges with Swoopbeak toucans diving at you, liana gaps between
the giant trees, a zipline down to the next tree, crumbling branches, a long
three-liana swing, then a broken bridge and the treehouse gate.
Secrets: gem 0 on a high branch above the third tree (mushroom pad), gem 1 on
a branch under the broken bridge (drop through the gap, a pad bounces you
back), gem 2 inside the hollow stump on the last tree; the Snoozling is caged
on a branch above the fifth tree (climb the hanging vine).
Regenerate: python3 tools/levelgen/levels/w3_2.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("CanopyHighway", "Canopy Highway", theme="treetops", horizon=400, scenery="jungle",
             backdrop={"light_shafts": True})
L.ambience("leaves", 1.2)
L.ambience("pollen", 0.6)

# ---- S0 the first tree (x -300..1000) ----------------------------------------------------------
L.wall(-360, -1400, 0)
L.tree_platform(-300, 1000, 0, 300, trunk_w=220)
L.sign(80, 0, "CANOPY HIGHWAY! Don't look down...\nthe jungle floor is a LONG way below.", 440)
L.deco("hut", 640, 0, 0.9)
L.deco("lantern", 880, 0)
L.lums(150, -110, 520, -110, 4, 30)
L.pit_kill(-300, 12200, 1100)

# ---- S1 the first bridge + Swoopbeaks (1000..2300) -------------------------------------------------
L.bridge(1000, 0, 1700, -40)
L.enemy("swoopbeak", 1250, -440)
L.lums(1080, -100, 1640, -130, 6, 20)
L.tree_platform(1700, 2300, -40, 1950, trunk_w=200)
L.checkpoint(1760, -40)
L.sign(1870, -40, "Toucans SWOOP at\nyou - punch or\nstomp them!", 260)
L.enemy("cocobonk", 2220, -40)

# ---- S2 liana gap (2300..3350) ------------------------------------------------------------------
L.liana(2530, -540, 330, sway=0.12, phase=0.2)
L.liana(2990, -540, 330, sway=0.15, phase=0.9)
L.lums(2420, -320, 3130, -320, 7, 80)
L.tree_platform(3350, 4000, -40, 3600, trunk_w=200)
L.checkpoint(3420, -40)
L.pad(3860, -40, height=560)
L.ledge(3680, -460, 180)                           # gem 0 on the high branch
L.gem(3770, -520)
L.lums(3700, -540, 3840, -540, 3)

# ---- S3 zipline down to the next tree (4000..5600) -----------------------------------------------
L.block(3920, -300, 80, 260)
L.ledge(3800, -190, 110)
L.zipline(3975, -330, 5060, -170)
L.lums(4150, -340, 4950, -230, 8)
L.enemy("swoopbeak", 4500, -620)
L.tree_platform(4950, 5600, -100, 5200, trunk_w=200)
L.checkpoint(5020, -100)
L.enemy("cocobonk", 5520, -100)

# ---- S4 crumbling branches (5600..6500) -------------------------------------------------------------
L.sign(5230, -100, "Rotten branches\ncrumble - keep\nmoving!", 260)
L.crumble(5700, -100, 150)
L.crumble(5960, -110, 150)
L.crumble(6220, -110, 150)
L.lums(5720, -190, 6330, -200, 6, 20)
L.enemy("swoopbeak", 6050, -520)
L.tree_platform(6460, 7100, -80, 6700, trunk_w=200)
L.checkpoint(6520, -80)
L.bell(6620, -80)
L.ledge(6780, -470, 230)                           # the Snoozling's branch: climb the hanging vine
L.vine(6990, -470, 390)
L.snoozling(6880, -470, fur=C(1.0, 0.75, 0.4))
L.lums(6800, -550, 6960, -550, 3)
L.lums(6990, -180, 6990, -400, 3)

# ---- S5 the long swing (7100..8500) ----------------------------------------------------------------
L.liana(7330, -580, 330, sway=0.12, phase=0.4)
L.liana(7790, -580, 330, sway=0.15, phase=1.2)
L.liana(8250, -580, 330, sway=0.15, phase=0.1)
L.lums(7230, -360, 8380, -360, 10, 80)

# ---- S6 the broken bridge (8550..9950) -------------------------------------------------------------
L.tree_platform(8550, 9200, -40, 8800, trunk_w=200)
L.checkpoint(8640, -40)
L.sign(8760, -40, "Broken planks!\nJump the gaps.", 220)
L.bridge(9200, -40, 9900, -40, broken=(5, 6))
L.lums(9260, -110, 9840, -110, 6, 20)
# Gem 1: a branch under the gap, a mushroom bounces you back up.
L.block(9380, 300, 220, 30)
L.gem(9440, 240)
L.pad(9560, 300, height=600)
L.secret(9360, 160, 260, 140)

# ---- S7 the treehouse gate (9900..12000) -----------------------------------------------------------
L.tree_platform(9900, 12000, -40, 10900, trunk_w=260)
L.checkpoint(9980, -40)
L.enemy("cocobonk", 10450, -40)
L.lums(10100, -150, 10400, -150, 4, 30)
# Gem 2: in a hollow stump on the deck - punch its front open. The path climbs over its top.
L.breakable(10700, -180, 40, 140, lums=2)
L.block(10700, -200, 300, 20)
L.block(10980, -200, 20, 160)
L.gem(10840, -100)
L.secret(10740, -180, 240, 140)
L.enemy("swoopbeak", 11200, -480)
L.goal(11650, -40)
L.lums(11300, -150, 11550, -150, 4, 30)
L.deco("hut", 11880, -40, 1.0)
L.wall(12000, -1400, -40)

for x0, x1, y in [(-280, 980, 0), (1720, 2280, -40), (3370, 3980, -40), (4970, 5580, -100), (6480, 7080, -80),
                  (8570, 9180, -40), (9920, 11980, -40)]:
    L.dress(x0, x1, "jungle", spacing=170, seed=int(x0) % 97 + 3, skip=[(3800, 4000), (6950, 7030), (10650, 11050)])
L.finish(spawn=(0, -2), left=-360, right=12060, bottom=1000, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w3_2_canopy_highway.tscn"))
