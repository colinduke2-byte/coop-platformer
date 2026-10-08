"""World 5-6: THE DROWNED PALACE - the sunken palace at the bottom of the Deep Sea Dream.
The temple steps (Crabbits and clams), the colonnade where the tide floods
between the pillars, the drowned nave (swim down past Eelectras, a bubble
column up to the gallery), the antechamber, and then the boss in the great
hall: INKABELLA. When a tentacle slams down and sticks in the floor, STOMP or
PUNCH its tip! She spits ink, and when she's angry enough the hall floods.
Secrets: gem 0 on top of the colonnade's broken arch (a jelly bounce), gem 1 in
the nave's sunken shrine, gem 2 in a treasure chest past the great hall; the
Snoozling sits in the gallery.
Regenerate: python3 tools/levelgen/levels/w5_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

GOLD, TEAL, VIOLET = C(1.0, 0.85, 0.45), C(0.45, 1.0, 0.85), C(0.75, 0.5, 1.0)
L = LevelKit("DrownedPalace", "The Drowned Palace", theme="octopus", horizon=0, scenery="deep")
L.ambience("bubbles", 0.8, darkness=C(0.55, 0.55, 0.75))

L.wall(-360, -1600, 600)
L.land([(-300, 0), (1400, 0), (1600, -150), (1880, -150), (2000, -40),                     # the temple steps
        (2020, 220), (4180, 220), (4200, -40), (4400, -150), (4900, -150),                    # the colonnade's tide basin
        (4920, 1200), (7180, 1200), (7200, -150), (7600, -150), (7600, 0), (12400, 0)],        # the drowned nave
       bottom=1900)

# ---- S0 the temple steps (x -300..2000) ----------------------------------------------------------------
L.sign(90, 0, "THE DROWNED PALACE. Inkabella\nlives in the great hall... shh!", 420)
for x, k in [(450, "coral"), (800, "anchor"), (1150, "coral")]:
    L.deco(k, x, 0, 1.1)
L.lums(300, -110, 1000, -110, 6, 40)
L.enemy("crabbit", 1200, 0)
L.clam(1740, -150, height=560)
L.lums(1700, -400, 1780, -600, 3)

# ---- S1 the colonnade: the tide floods between the pillars (2000..4900) -------------------------------------
L.checkpoint(1300, 0)
L.tide(2020, -60, 2160, 280, amplitude=80, period=7.0)
for x0 in [2250, 2700, 3150, 3600]:
    L.block(x0, -40, 160, 260)                     # broken pillars
    L.lums(x0 + 40, -130, x0 + 120, -130, 2)
    L.deco("coral", x0 + 80, -40, 0.8)
L.enemy("pufferfin", 2900, 0, travel=V(400, 0), speed=70.0)
L.enemy("jellybob", 3450, -120, bob=20.0)
L.block(3560, -400, 300, 40)                       # the broken arch (gem 0 on top)
L.gem(3710, -470)
L.lums(4000, -250, 4800, -250, 6, 30)
L.enemy("crabbit", 4600, -150)

# ---- S2 the drowned nave (4900..7600) -----------------------------------------------------------------------
L.checkpoint(4750, -150)
L.water(4920, -130, 2260, 1330)
L.enemy("eelectra", 4930, 500, facing=1)
L.enemy("eelectra", 7170, 800, facing=-1)
L.enemy("anglerling", 5600, 700)
L.enemy("pufferfin", 6300, 400, travel=V(0, 400), speed=80.0)
L.terrain([(5800, 1200), (5800, 950), (6000, 880), (6200, 950), (6200, 1200)], rounding=20.0)   # the sunken shrine
L.gem(6000, 820)                                   # gem 1 on the shrine
L.glow(6000, 760, GOLD, radius=300, energy=0.9)
L.lums(5100, 300, 5100, 1000, 5)
L.lums(5300, 1100, 5700, 1100, 4, 30)
L.bubbles(6850, -130, 200, 1330, rise=460)
L.lums(6950, 0, 6950, 1000, 6)
for x in [5000, 5500, 6500, 7100]:
    L.deco("seaweed", x, 1200, 1.5)
for x, c in [(5300, TEAL), (6600, VIOLET)]:
    L.glow(x, 700, c, radius=320, energy=0.6)

# ---- S3 the gallery and the antechamber (7200..9000) ---------------------------------------------------------
L.checkpoint(7300, -150)
L.snoozling(7500, -150, fur=C(0.9, 0.65, 1.0))
L.bell(8000, 0)
L.enemy("anglerling", 8400, -250)
L.lums(7700, -110, 8700, -110, 7, 30)
L.checkpoint(8800, 0)
L.sign(8600, 0, "INKABELLA! When a tentacle sticks\nin the floor, STOMP or PUNCH its tip!", 340)

# ---- S4 the great hall: INKABELLA -----------------------------------------------------------------------------
flood = L.water(9048, -12, 1252, 12)
entry = L.gate(9000, -360, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(10300, -360, 48, 360)
arena = L.arena(9674, 0, [exit_gate], enemies=[("inkabella", 9674, 0, {"asleep": True})])
boss = L.arena_children[0]
L._set_last("flood", L.rel(boss, flood))
L.zone(9070, -500, 1200, 500, [entry], everyone=True, send_on=False)
L.zone(9070, -500, 1200, 500, [boss], everyone=True)
L.block(9000, -1000, 48, 640)                      # hall walls above the gates
L.block(10300, -1000, 48, 640)
L.backwall(9048, -1000, 1252, 1000, shade=0.45)
L.ledge(9120, -300, 160)
L.ledge(10110, -300, 160)
for x in [9250, 10100]:
    L.glow(x, -500, VIOLET, radius=340, energy=0.7)
L.lums(9150, -400, 10200, -400, 8, 40)

# ---- the victory steps --------------------------------------------------------------------------------------------
# Gem 2: a treasure chest - punch its cracked side. The path climbs over its lid.
L.breakable(10600, -140, 40, 140, lums=2)
L.block(10600, -160, 300, 20)
L.block(10880, -160, 20, 160)
L.gem(10740, -60)
L.secret(10640, -140, 240, 140)
L.goal(11500, 0)
L.lums(10950, -110, 11430, -110, 5, 30)
for x, k, s in [(11100, "coral", 1.2), (11800, "chest", 1.1), (12100, "anchor", 1.2), (12280, "coral", 1.0)]:
    L.deco(k, x, 0, s)
L.wall(12400, -1200, 0)

L.dress(-250, 1700, "reef", spacing=170, seed=201, skip=[(1150, 1250), (1750, 1850)])
L.dress(7650, 8950, "wreck", spacing=170, seed=202, skip=[(7950, 8050), (8450, 8950)])
L.dress(10400, 12350, "reef", spacing=170, seed=203, skip=[(10550, 10950), (11450, 11550)])
L.finish(spawn=(0, -2), left=-360, right=12460, bottom=1500, kill_y=1900)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w5_6_sunken_temple.tscn"))
