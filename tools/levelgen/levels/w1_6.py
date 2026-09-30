"""World 1-6: THORNWOOD KEEP - the bramble castle and its lord.
A shorter gauntlet (bramble moat under a spiky pendulum, the castle ramparts),
a haunted tower climb (elevator, zigzag ledges, spike balls, Wispets), then the
boss fight on the tower roof: BARON BRISTLEBACK.
Secrets: gem 0 in a rampart turret behind a cracked wall, gem 1 on a side ledge
in the tower, gem 2 above the victory balcony; the Snoozling's cage hangs over
the bramble moat (grab it from the crumbling stones).
Regenerate: python3 tools/levelgen/levels/w1_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("ThornwoodKeep", "Thornwood Keep", theme="thorn", horizon=200, scenery="castle")
L.ambience("embers", 0.9)
L.ambience("petals", 0.5, tint=C(1.0, 0.6, 0.75, 0.9))

# ---- The keep: approach, moat walls, ramparts, tower shell, roof -----------------------------------
L.wall(-360, -1500, 800)
L.land([(-300, 0), (700, 0), (900, -40), (1400, -40), (1400, 280), (2400, 280), (2400, -40), (4700, -40)])
# The tower's solid right side; its top is the roof deck (the arena floor).
L.land([(4700, -1400), (6300, -1400)], bottom=900, rounding=6.0)

# ---- S0 the approach (x -300..1400) ---------------------------------------------------------
L.sign(60, 0, "THORNWOOD KEEP. The Baron waits at\nthe top of the tower. Be brave!", 400)
L.brambles(-250, -200, 180, 120)
L.lums(300, -120, 1200, -150, 8, 30)
L.deco("lantern", 640, 0)
L.deco("lantern", 1300, -40)

# ---- S1 the bramble moat (1400..2400) -------------------------------------------------------
L.checkpoint(1320, -40)
L.brambles(1400, 150, 1000, 130, seed=5)
L.crumble(1540, -60, 150, respawn=2.0)
L.crumble(1800, -100, 150, respawn=2.0)
L.crumble(2060, -60, 150, respawn=2.0)
L.pendulum(1875, -470, rope=300, width=150, amplitude=1.0, period=2.6, spiked=True)
L.snoozling(2300, -250, hanging=True, fur=C(1.0, 0.6, 0.6))
L.lums(1560, -160, 2220, -160, 7, 30)
L.sign(1180, -40, "Crumbling stones over the brambles.\nMind the swinging spikes!", 380)

# ---- S2 the ramparts (2400..3800) -----------------------------------------------------------
L.enemy("prickleroll", 2750, -40)
L.enemy("shellbert", 3050, -40, facing=-1)
L.enemy("puffcap", 3350, -40, phase=0.4)
L.enemy("bumblebonk", 3100, -400)
L.bell(2540, -40)                                # Lum Rush along the ramparts
L.lums(2700, -140, 3600, -140, 9)
# A little turret with a cracked wall: gem 0 inside.
L.block(3560, -300, 200, 30)
L.breakable(3560, -270, 50, 230)
L.block(3740, -270, 20, 230)
L.gem(3680, -130)
L.secret(3610, -270, 130, 230)

# ---- S3 the haunted tower (3800..4760) --------------------------------------------------------
L.backwall(3840, -1660, 860, 1620)
L.checkpoint(3860, -40)
L.sign(3900, -40, "The tower! Ride the lift, climb\nthe ledges... watch for ghosts.", 380)
L.moving(3950, -80, 180, 30, waypoints=((0, -560),), speed=150, wait=0.8, one_way=True, rider=True)
for x, y in [(4230, -700), (4480, -860), (4230, -1020), (4480, -1180)]:
    L.ledge(x, y, 190)
L.ledge(3880, -900, 150)                           # side ledge with gem 1
L.gem(3950, -960)
L.spikeball(4400, -950, count=2, radius=150, speed=80)
L.enemy("wispet", 4100, -1100)
L.enemy("wispet", 4550, -600)
L.lums(4040, -200, 4040, -600, 5)
L.lums(4300, -760, 4560, -1240, 6)
L.block(3800, -1700, 40, 1400)                     # the tower's left wall (doorway below)
L.block(4640, -1340, 60, 20, one_way=True)         # step up onto the roof
L.block(3840, -1700, 860, 40)                      # tower ceiling (the roof deck sits above it)

# ---- S4 BARON BRISTLEBACK on the roof (4760..6300) ---------------------------------------------
L.checkpoint(4850, -1400)
# The roof: reach it through a hatch at the top of the climb.
L.sign(4900, -1400, "BARON BRISTLEBACK! Jump his rolls,\nand STOMP him while he's on his back!", 420)
entry = L.gate(4950, -1760, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(6250, -1760, 48, 360)
L.arena(5600, -1400, [exit_gate], enemies=[("baron_bristleback", 5600, -1400, {"asleep": True})])
baron = L.arena_children[0]
L.zone(5020, -1900, 1200, 500, [entry], everyone=True, send_on=False)
L.zone(5020, -1900, 1200, 500, [baron], everyone=True)
L.block(4950, -2300, 48, 540)                      # arena walls above the gates
L.block(6250, -2300, 48, 540)
L.block(4950, -2340, 1348, 40)                     # arena roof beam
L.ledge(5200, -1580, 180)
L.ledge(5840, -1580, 180)
L.lums(5100, -1500, 6150, -1500, 8, 40)

# ---- the victory balcony --------------------------------------------------------------------
L.land([(6300, -1400), (7000, -1400)], bottom=900)
L.goal(6700, -1400)
L.ledge(6480, -1640, 150)
L.gem(6555, -1700)
L.lums(6400, -1500, 6900, -1500, 5)
L.deco("lantern", 6350, -1400)
L.deco("lantern", 6950, -1400)
L.wall(7000, -2600, -1400)

L.dress(-250, 3800, "thorn", spacing=180, seed=61, skip=[(1400, 2400)])
L.finish(spawn=(0, -2), left=-360, right=7060, bottom=800, kill_y=1100)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_6_thornwood_keep.tscn"))
