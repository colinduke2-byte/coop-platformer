"""World 4-6: CUCKOOLOSSUS CLOCKTOWER - the top of the Clockwhirl Works, where the clock struck thirteen.
The assembly yard (a belt against you, zaps, tick-tock steps up to a shelf),
tick-tock blocks over the gear pit, the clock-face terraces, the gear plaza and
the tick-tock bridge, and then the boss in
the bell loft: CUCKOOLOSSUS. Jump its pendulum; when the doors rattle the
cuckoo shoots out at you and sticks in the floor - STOMP or PUNCH the bird!
Secrets: gem 0 on the shelf above the yard (tick-tock steps), gem 1 on a
hidden ledge over the terraces, gem 2 in a toolbox past the bell loft; the
Snoozling sits on the terraces.
Regenerate: python3 tools/levelgen/levels/w4_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

DX = 2600   # the bell loft and the victory roof sit DX further right (room for the gear plaza and bridge)

GOLD = C(1.0, 0.85, 0.45)
L = LevelKit("CuckoolossusClocktower", "Cuckoolossus Clocktower", theme="cuckoo", horizon=-200, scenery="factory")
L.ambience("embers", 0.6)
L.ambience("spores", 0.5, tint=C(1, 0.9, 0.7, 0.5))

# ---- S0 the clocktower gate (x -300..1500) ------------------------------------------------------------
L.wall(-360, -1600, 600)
L.land([(-300, 0), (1700, 0), (1700, 16), (2500, 16), (2500, 0), (3400, 0)], bottom=1500)
L.sign(90, 0, "CUCKOOLOSSUS CLOCKTOWER. Something\nup there keeps striking THIRTEEN...", 440)
L.deco("clock", 560, 0, 1.4)
L.deco("gear", 900, 0, 1.2)
L.deco("pipes", 1250, 0)
L.lums(300, -110, 1100, -110, 6, 30)

# ---- S1 the assembly yard (1500..3400) -------------------------------------------------------------------
L.checkpoint(1420, 0)
L.bell(1540, 0)
L.block(1700, 0, 800, 16, conveyor=-130.0)
L.zap(2100, -10, 2100, -240, on=0.9, off=1.5)
L.enemy("springbot", 2800, 0)
L.lums(1750, -100, 2450, -100, 6)
# Gem 0: tick-tock steps up to a shelf.
L.beat(2700, -160, 140, 32, group=0)
L.beat(2900, -310, 140, 32, group=1)
L.ledge(3090, -460, 200)
L.gem(3190, -520)
L.lums(2770, -230, 2970, -380, 3)

# ---- S2 tick-tock blocks over the gear pit (3400..4400) ---------------------------------------------------
L.checkpoint(3260, 0)
L.pit_kill(3400, 4400, 700)
for i, x in enumerate([3440, 3680, 3920, 4160]):
    L.beat(x, -40, 160, 32, group=i % 2)
L.lums(3500, -140, 4220, -140, 7, 30)
L.enemy("sparkbot", 3800, -360, travel=V(240, 0), speed=90.0)

# ---- S3 the clock-face terraces (4400..6200) ---------------------------------------------------------------
L.land([(4400, 0), (5000, 0), (5000, -140), (5250, -140), (5250, -280), (5500, -280), (5500, -420),
        (5750, -420), (5750, -560), (6000, -560), (6000, -700), (6900, -700), (6940, 400)], bottom=1500)
L.land([(7840, 400), (7880, -700), (9000 + DX, -700)], bottom=1500)
L.checkpoint(4480, 0)
L.enemy("windup", 4800, 0)
L.zap(5370, -290, 5370, -500, on=0.9, off=1.6, phase=0.3)
L.enemy("springbot", 5880, -560)
L.snoozling(5150, -140, fur=C(1.0, 0.75, 0.55))
L.ledge(5320, -560, 150)                           # gem 1: hop left off the -420 terrace
L.gem(5395, -620)
L.lums(5000, -240, 5880, -660, 8)

# ---- S3b the gear plaza (6000..6940) ----------------------------------------------------------------------
L.checkpoint(6030, -700)
L.sign(6280, -700, "The gear plaza! Then the\ntick-tock bridge to the loft.", 300)
L.enemy("windup", 6550, -700)
L.zap(6750, -710, 6750, -940, on=0.9, off=1.5, phase=0.2)
L.lums(6450, -820, 6880, -820, 5, 30)
for x, k in [(6150, "gear"), (6880, "clock")]:
    L.deco(k, x, -700, 1.1)

# ---- S3c the tick-tock bridge over the gear pit (6940..7880) ----------------------------------------------
L.pit_kill(6940, 7880, 900)
for i, x in enumerate([6980, 7220, 7460, 7700]):
    L.beat(x, -740, 160, 32, group=i % 2)
L.lums(7040, -830, 7760, -830, 7, 30)
L.enemy("sparkbot", 7400, -1100, travel=V(260, 0), speed=90.0)

# ---- S3d the clockworks landing (7880..8800) ----------------------------------------------------------------
L.checkpoint(7960, -700)
L.enemy("springbot", 8350, -700)
L.ledge(8200, -900, 180)
L.lum_block(8290, -1150, lums=5)
L.lums(8050, -800, 8400, -800, 4, 30)
L.deco("pipes", 8440, -700, 1.0)

# ---- S4 the bell loft: CUCKOOLOSSUS --------------------------------------------------------------------------
L.checkpoint(6300 + DX, -700)
L.sign(6020 + DX, -700, "CUCKOOLOSSUS! Jump the pendulum.\nWhen the cuckoo sticks in the\nfloor - STOMP it!", 300)
entry = L.gate(6420 + DX, -1060, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(7700 + DX, -1060, 48, 360)
L.arena(7100 + DX, -700, [exit_gate], enemies=[("cuckoolossus", 7150 + DX, -700, {"asleep": True})])
boss = L.arena_children[0]
L.zone(6490 + DX, -1200, 1150, 500, [entry], everyone=True, send_on=False)
L.zone(6490 + DX, -1200, 1150, 500, [boss], everyone=True)
L.block(6420 + DX, -1700, 48, 640)                      # loft walls above the gates
L.block(7700 + DX, -1700, 48, 640)
L.backwall(6468 + DX, -1700, 1232, 1000, shade=0.45)
L.ledge(6560 + DX, -900, 170)
L.ledge(7470 + DX, -900, 170)
for x in [6650 + DX, 7550 + DX]:
    L.glow(x, -1100, GOLD, radius=320, energy=0.6)
L.lums(6560 + DX, -800, 7600 + DX, -800, 8, 40)

# ---- the victory roof ------------------------------------------------------------------------------------------
# Gem 2: a toolbox - punch its cracked side. The path climbs over its lid.
L.breakable(7950 + DX, -840, 40, 140, lums=2)
L.block(7950 + DX, -860, 300, 20)
L.block(8230 + DX, -860, 20, 160)
L.gem(8090 + DX, -760)
L.secret(7990 + DX, -840, 240, 140)
L.goal(8600 + DX, -700)
L.lums(8300 + DX, -800, 8540 + DX, -800, 3)
L.deco("clock", 8820 + DX, -700, 1.2)
L.wall(9000 + DX, -2200, -700)

L.dress(-250, 1350, "factory", spacing=160, seed=121)
L.dress(4420, 4980, "factory", spacing=170, seed=122)
L.dress(8300 + DX, 8950 + DX, "factory", spacing=170, seed=123, skip=[(8550 + DX, 8700 + DX)])
L.finish(spawn=(0, -2), left=-360, right=9060 + DX, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w4_6_cuckoolossus_clocktower.tscn"))
