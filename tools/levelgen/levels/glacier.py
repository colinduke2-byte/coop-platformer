"""Glacier Grotto - icy slides, a frozen lake, crushers, an ice shaft, and
KING GRUMBLO's arena.  python3 levels/glacier.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit

L = LevelKit("GlacierGrotto", "Glacier Grotto", theme="glacier", horizon=600)

# ---- start --------------------------------------------------------------------------------------------
L.wall(-360, -1000, 500)
L.ground(-300, 1000, 0)
L.block(350, 0, 400, 500, slippery=True)
L.sign(80, 0, "GLACIER GROTTO\nIt's slippery... and something\nbig is snoring down there.", 360)
L.lums(400, -80, 700, -80, 4)
for x, k in [(-150, "pine"), (900, "crystals"), (820, "pine")]:
    L.deco(k, x, 0)

# ---- S1 glacier slide (1000..3000) -----------------------------------------------------------------------
L.slope(1000, 600, 1200, 600, rising_right=False, fill_below=400)
L.lums(1100, -40, 2100, 540, 9)
L.ground(2200, 3000, 600)
L.enemy("spikeroo", 2500, 600)
L.enemy("spikeroo", 2800, 600)
L.sign(1060, 0, "Belly-slide down the glacier!\n(slides knock spiky things over)", 360)

# ---- S2 frozen lake (3000..4400) --------------------------------------------------------------------------
L.checkpoint(2880, 600)
L.block(3000, 1100, 1400, 120)
L.water(3000, 600, 1400, 500)
L.spikeball(3500, 850, count=2, radius=110, speed=45)
L.spikeball(3950, 850, count=2, radius=110, speed=-45)
L.lums(3100, 750, 4300, 750, 10, -120)
L.breakable(4250, 950, 60, 150)
L.gem(4340, 1050)
L.ground(4400, 4900, 600)
L.sign(2600, 600, "A frozen lake. Brrr - swim!", 300)
L.deco("crystals", 4450, 600)

# ---- S3 crushers over a backwards treadmill (4400..6000) -------------------------------------------------
L.checkpoint(4480, 600)
L.block(4900, 600, 700, 500, conveyor=-160.0)
L.ground(5600, 6220, 600)
for x in [4950, 5230, 5510]:
    L.crusher(x, 40, 110, 110, drop=600)
L.lums(4950, 540, 5600, 540, 6)
L.sign(4650, 600, "Sprint through!", 220)

# ---- S4 ice wall-jump shaft (6000..6250) ----------------------------------------------------------------------
L.checkpoint(5800, 600)
L.block(6000, -700, 60, 1160)                  # left wall (walk under at the bottom)
L.block(6220, -600, 380, 1700)                 # cliff up to the ridge...
L.block(6740, -600, 380, 1700)                 # ...(split around the secret chamber)
L.enemy("flapjack", 6140, 200, mode=1, patrol_offset=(0, -300))
L.lums(6140, 500, 6140, -500, 8)
L.sign(5850, 600, "Wall jump up the ice shaft!", 300)
L.gem(6030, -770)                              # on top of the shaft's left wall

# ---- S5 ridge + pound secret + slide to the long jump (6220..8400) -------------------------------------------
L.checkpoint(6300, -600)
L.breakable(6600, -600, 140, 40)
L.block(6600, -380, 140, 1500)
L.pad(6670, -380, height=420)
L.gem(6720, -440)
L.secret(6600, -560, 140, 180)
L.slope(7120, 0, 1100, 600, rising_right=False, fill_below=600)
L.lums(7200, -600, 8100, -40, 8)
L.ground(8220, 8300, 0)
L.pit_kill(8300, 8620, 450)
L.ground(8620, 9200, 0)
L.sign(7000, -600, "Slide down, then LONG JUMP\n(DOWN to slide, JUMP at the edge)", 380)

# ---- S6 KING GRUMBLO (9200..10600) -----------------------------------------------------------------------------
L.checkpoint(8700, 0)
L.sign(8880, 0, "Shh! The KING is napping...\nJump his shockwaves. Stomp him\nwhen he's dazed!", 380)
L.ground(9200, 10700, 0)
entry = L.gate(9220, -360, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(10500, -360, 48, 360)
L.arena(9900, 0, [exit_gate], enemies=[("king_grumblo", 9900, 0, {"asleep": True})])
king = L.arena_children[0]
L.zone(9300, -500, 1150, 500, [entry], everyone=True, send_on=False)
L.zone(9300, -500, 1150, 500, [king], everyone=True)
L.block(9220, -800, 48, 440)                   # arena walls above the gates
L.block(10500, -800, 48, 440)
L.lums(9400, -250, 10400, -250, 8, 60)

# ---- goal ------------------------------------------------------------------------------------------------------
L.ground(10700, 11300, 0)
L.goal(11000, 0)
L.wall(11300, -1200, 500)
L.deco("crystals", 10750, 0, 1.3)

L.finish(spawn=(0, -2), left=-300, right=11300, bottom=1220, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/glacier_grotto.tscn"))
