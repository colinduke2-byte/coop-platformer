"""World 1-6: THORNWOOD KEEP - the bramble castle and its lord.
A gauntlet (bramble moat under a spiky pendulum, the castle ramparts, the
courtyard with its wall-bonking Bonkhorn, pop spikes and fire jets, the great
hall, a timed portcullis and the thorn bridge),
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

DX = 4200   # everything from the tower on sits DX further right (room for the courtyard and the great hall)

# ---- The keep: approach, moat walls, ramparts, courtyard, tower shell, roof --------------------------
L.wall(-360, -1500, 800)
L.land([(-300, 0), (700, 0), (900, -40), (1400, -40), (1400, 280), (2400, 280), (2400, -40), (7200, -40), (7200, 280),
        (7900, 280), (7900, -40), (4700 + DX, -40)])
# The tower's solid right side; its top is the roof deck (the arena floor).
L.land([(4700 + DX, -1400), (7000 + DX, -1400)], bottom=900, rounding=6.0)

# ---- S0 the approach (x -300..1400) ---------------------------------------------------------
L.sign(60, 0, "THORNWOOD KEEP. The Baron waits at\nthe top of the tower. Be brave!", 400)
L.brambles(-250, -200, 180, 120)
L.lums(300, -120, 950, -150, 6, 30)
L.deco("lantern", 640, 0)
L.deco("lantern", 1300, -40)

# ---- S1 the bramble moat (1400..2400) -------------------------------------------------------
L.checkpoint(1330, -40)
L.brambles(1400, 150, 1000, 130, seed=5)
L.crumble(1540, -60, 150, respawn=2.0)
L.crumble(1800, -100, 150, respawn=2.0)
L.crumble(2060, -60, 150, respawn=2.0)
L.pendulum(1875, -470, rope=300, width=150, amplitude=1.0, period=2.6, spiked=True)
L.snoozling(2300, -250, hanging=True, fur=C(1.0, 0.6, 0.6))
L.lums(1560, -160, 2220, -160, 7, 30)

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

# ---- S2b the castle courtyard (3800..5400) ------------------------------------------------------
L.checkpoint(3830, -40)
L.sign(4040, -40, "Courtyard! Mind\nthe spikes and\nthe fire jets.", 200)
L.pop_spikes(4200, -40, length=168, up=1.2, down=1.6)
L.lums(4200, -170, 4370, -170, 3)
L.flame(4560, -40, length=200, on=1.2, off=1.8)
L.flame(4720, -40, length=200, on=1.2, off=1.8, phase=1.5)
L.lums(4520, -320, 4760, -320, 3)
L.block(4850, -140, 40, 100)                         # low walls the Bonkhorn crashes into
L.block(5300, -140, 40, 100)
L.enemy("bonkhorn", 5100, -40)
L.lums(4950, -240, 5260, -240, 4, 40)
L.block(5010, -420, 180, 24, one_way=True)           # a perch over the pen
L.lum_block(5070, -700, lums=5)
L.deco("lantern", 5370, -40)

# ---- S2c the great hall (5400..6300) ------------------------------------------------------------
L.checkpoint(5440, -40)
L.backwall(5500, -700, 1500, 660, shade=0.5)
L.block(5500, -740, 1500, 40)                        # the hall's roof beam
L.sign(5680, -40, "The Great Hall. Dodge\nthe swinging spike balls!", 340)
L.spikeball(5950, -330, count=2, radius=160, speed=70)
L.enemy("shieldbug", 6250, -40)
L.lums(5800, -280, 6400, -280, 7, 30)
for x in [5600, 6100, 6600]:
    L.deco("lantern", x, -40)
    L.glow(x, -200, C(1.0, 0.7, 0.4), radius=220, energy=0.5)

# ---- S2d the portcullis: punch the lever, dash through (6300..7100) ------------------------------
L.sign(6500, -40, "PUNCH the lever - the\nportcullis won't stay up long!", 320)
portcullis = L.gate(6960, -232, 48, 192)
L.switch(6800, -40, [portcullis], mode=2, duration=4.0)
L.block(6960, -740, 48, 508)                         # wall above the portcullis
L.lums(6760, -280, 6900, -280, 3)

# ---- S2e the thorn bridge (7100..8000) --------------------------------------------------------
L.checkpoint(7080, -40)
L.brambles(7200, 150, 700, 130, seed=9)
L.bridge(7200, -40, 7900, -40, broken=(7,))
L.enemy("bumblebonk", 7550, -420)
L.lums(7250, -150, 7850, -150, 7, 30)
L.deco("lantern", 7950, -40)

# ---- S3 the haunted tower (5400..6360) --------------------------------------------------------
L.backwall(3840 + DX, -1660, 860, 1620)
L.checkpoint(3860 + DX, -40)
L.moving(3950 + DX, -80, 180, 30, waypoints=((0, -560),), speed=150, wait=0.8, one_way=True, rider=True)
for x, y in [(4230, -700), (4480, -860), (4230, -1020), (4480, -1180)]:
    L.ledge(x + DX, y, 190)
L.ledge(3880 + DX, -900, 150)                      # side ledge with gem 1
L.gem(3950 + DX, -960)
L.spikeball(4400 + DX, -950, count=2, radius=150, speed=80)
L.enemy("wispet", 4100 + DX, -1100)
L.enemy("wispet", 4550 + DX, -600)
L.lums(4040 + DX, -200, 4040 + DX, -600, 5)
L.lums(4300 + DX, -760, 4560 + DX, -1240, 6)
L.block(3800 + DX, -1700, 40, 1400)                # the tower's left wall (doorway below)
L.block(4640 + DX, -1340, 60, 20, one_way=True)    # step up onto the roof
L.block(3840 + DX, -1700, 860, 40)                 # tower ceiling (the roof deck sits above it)

# ---- S4 BARON BRISTLEBACK on the roof ------------------------------------------------------------
L.checkpoint(4830 + DX, -1400)
L.sign(4890 + DX, -1400, "BARON: stomp\nhim when he's\non his back!", 200)
# The roof: reach it through a hatch at the top of the climb.
entry = L.gate(5010 + DX, -1760, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(6250 + DX, -1760, 48, 360)
L.arena(5600 + DX, -1400, [exit_gate], enemies=[("baron_bristleback", 5600 + DX, -1400, {"asleep": True})])
baron = L.arena_children[0]
L.zone(5080 + DX, -1900, 1140, 500, [entry], everyone=True, send_on=False)
L.zone(5080 + DX, -1900, 1140, 500, [baron], everyone=True)
L.block(5010 + DX, -2300, 48, 540)                 # arena walls above the gates
L.block(6250 + DX, -2300, 48, 540)
L.block(5010 + DX, -2340, 1288, 40)                # arena roof beam
L.ledge(5200 + DX, -1580, 180)
L.ledge(5840 + DX, -1580, 180)
L.lums(5150 + DX, -1500, 6150 + DX, -1500, 8, 40)

# ---- the victory balcony --------------------------------------------------------------------
L.goal(6700 + DX, -1400)
L.ledge(6480 + DX, -1640, 150)
L.gem(6555 + DX, -1700)
L.lums(6400 + DX, -1500, 6900 + DX, -1500, 5)
L.deco("lantern", 6350 + DX, -1400)
L.deco("lantern", 6950 + DX, -1400)
L.wall(7000 + DX, -2600, -1400)

L.dress(-250, 8000, "thorn", spacing=180, seed=61, skip=[(1400, 2400), (4150, 5400), (5450, 7050), (7150, 7950)])
L.finish(spawn=(0, -2), left=-360, right=7060 + DX, bottom=800, kill_y=1100)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w1_6_thornwood_keep.tscn"))
