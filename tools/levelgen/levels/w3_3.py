"""World 3-3: SUNKEN TEMPLE - an old jungle temple, half swallowed by roots and water.
Teaches: pop-spike corridors and flytraps in the dark, ceiling crushers that
slam when you pass under, climbing a hanging vine to a key that opens the
temple door, a flooded crypt where a stone lintel forces you to SWIM UNDER,
lianas across the collapsed hall, up the stepped pyramid, across the piranha
pool, through the colonnade of pendulums and up the altar steps to the gate.
Secrets: gem 0 at the top of a narrow shaft in the entrance hall (wall-jump
up), gem 1 deep in the flooded crypt, gem 2 in the little shrine at the pyramid's foot;
the Snoozling waits on the pyramid's top step.
Regenerate: python3 tools/levelgen/levels/w3_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

TEAL = C(0.4, 1.0, 0.85)
L = LevelKit("SunkenTemple", "Sunken Temple", theme="ruins", horizon=0, scenery="ruins")
L.ambience("spores", 0.8)
L.ambience("rain", 0.5)

# ---- S0 the approach (x -300..1650) -------------------------------------------------------------
L.wall(-360, -1400, 600)
L.land([(-300, 0), (6200, 0), (6260, 320), (7200, 320), (7260, 0), (8000, 0)], bottom=1500)
L.sign(90, 0, "The SUNKEN TEMPLE. Its old traps\nstill work... tread carefully!", 420)
L.deco("totem", 560, 0, 1.1)
L.deco("palm", 820, 0)
L.deco("totem", 1180, 0, 0.9)
L.ledge(1300, -170, 200)
L.enemy("cocobonk", 1400, -170)
L.lums(300, -110, 1000, -110, 6, 40)

# ---- S1 the entrance hall: pop-spikes and a flytrap (1650..3600) ---------------------------------
# The temple roof: a tunnel from 1650 to 7600, with a narrow shaft (gem 0), a tall key hall and the
# stone lintel that dips into the crypt's water.
L.ceiling([(1650, -900), (1660, -380), (3200, -380), (3200, -1000), (3360, -1000), (3360, -380), (5700, -380),
           (5700, -1100), (6300, -1100), (6300, -380), (6580, -380), (6600, 120), (6900, 120), (6920, -380),
           (7600, -380), (7610, -900)], top=-2600)
L.backwall(1650, -1100, 5950, 1100, shade=0.5)
for x in [1900, 2700, 3500, 4400, 5300, 6000, 6800, 7400]:
    L.glow(x, -240, TEAL, radius=300, energy=0.8)
L.sign(1760, 0, "Pop-spikes! Wait\nfor them to sink,\nthen dash.", 260)
for i, x in enumerate([2050, 2350, 2650]):
    L.pop_spikes(x, 0, length=168, up=1.0, down=1.5, phase=0.56 - i * 0.28)   # a wave you can run with
L.lums(2050, -120, 2820, -120, 7)
L.snaptrap(3000, 0)
# Gem 0: a narrow shaft in the roof - hop onto the ledge under it, then wall-jump up.
L.ledge(3210, -200, 140)
L.gem(3280, -900)
L.secret(3200, -1000, 160, 620)
L.lums(3280, -500, 3280, -780, 3)

# ---- S2 the crushers (3600..5700) --------------------------------------------------------------------
L.checkpoint(3660, 0)
L.sign(3780, 0, "Crushers slam when you pass\nunder - don't stop running!", 360)
for x in [4150, 4550, 4950, 5350]:
    L.crusher(x, -380, w=140, h=112, drop=268)
L.lums(4100, -100, 5480, -100, 10)

# ---- S3 the key hall (5700..6300) ---------------------------------------------------------------------
L.checkpoint(5750, 0)
L.vine(5900, -1080, 1040)
L.ledge(5960, -780, 220)
L.key(6060, -830)
L.lums(5900, -300, 5900, -700, 4)
L.key_door(6130, -1100, 64, 1100)

# ---- S4 the flooded crypt: swim under the lintel (6300..7600) -----------------------------------------
L.water(6200, 0, 1060, 320)
L.enemy("nibblefin", 6420, 0, leap_height=240.0)
L.enemy("nibblefin", 7080, 0, leap_height=240.0, phase=0.5)
L.gem(6750, 270)                                   # gem 1, deep under the lintel
L.lums(6620, 240, 6880, 240, 4)
L.lums(6350, 100, 7150, 100, 6, -40)

# ---- S5 the collapsed hall: lianas (7600..9100) --------------------------------------------------------
L.checkpoint(7660, 0)
L.sign(7760, 0, "The floor's gone!\nSwing across.", 240)
L.pit_kill(8000, 9000, 700)
L.block(7980, -620, 1040, 60)                      # a fallen stone beam the vines hang from
L.liana(8230, -560, 360, sway=0.12, phase=0.5)
L.liana(8690, -560, 360, sway=0.14, phase=1.3)
L.lums(8100, -260, 8850, -260, 7, 80)
L.enemy("swoopbeak", 9300, -480)

# ---- S6 the stepped pyramid (9000..12000) -----------------------------------------------------------------
L.land([(9000, 0), (9600, 0), (9600, -120), (9900, -120), (9900, -240), (10200, -240), (10200, -360),
        (10900, -360), (10900, -240), (11200, -240), (11200, -120), (11500, -120), (11500, 0), (12800, 0), (12820, 240), (13980, 240), (14000, 0),
        (15400, 0), (15400, -120), (15600, -120), (15600, -240), (16700, -240)],
       bottom=1500)
L.checkpoint(9080, 0)
L.bell(9200, 0)
L.snaptrap(9750, -120)
L.snaptrap(10050, -240)
L.enemy("cocobonk", 10700, -360)
L.snoozling(10550, -360, fur=C(0.5, 1.0, 0.8))
L.lums(9650, -200, 10150, -440, 6)
L.lums(10250, -460, 10850, -460, 6, 30)
# Gem 2: a little shrine at the pyramid's foot - punch its cracked front. The path climbs over its roof.
L.breakable(11800, -140, 40, 140, lums=2)
L.block(11800, -160, 300, 20)
L.block(12080, -160, 20, 160)
L.gem(11940, -60)
L.secret(11840, -140, 240, 140)
L.enemy("cocobonk", 12300, 0)
L.lums(12150, -110, 12430, -110, 4, 30)
L.deco("totem", 12560, 0)

# ---- S7 the piranha pool: hop the stepping stones (12800..14000) -------------------------------------------
L.checkpoint(12400, 0)
L.sign(12650, 0, "Hop the stones - mind the Nibble-\nfins! Then time the pendulums.", 340)
L.water(12820, 20, 1160, 220)
for x0 in [13000, 13300, 13600]:
    L.island(x0, x0 + 150, -30, depth=70)
for i, x in enumerate([13240, 13540, 13840]):
    L.enemy("nibblefin", x, 20, phase=i * 0.6)
L.lums(13020, -140, 13730, -140, 6, 40)
L.deco("lilypads", 12900, 22)
L.deco("lilypads", 13470, 22)

# ---- S8 the colonnade of pendulums (14000..15400) -------------------------------------------------------
L.checkpoint(14080, 0)
L.backwall(14200, -700, 1000, 700, shade=0.5)
L.block(14200, -740, 1000, 40)                     # the colonnade's lintel
for x in [14300, 15100]:
    L.deco("totem", x, 0, 1.2)
for i, x in enumerate([14550, 14900]):
    L.pendulum(x, -700, rope=630, width=110, amplitude=0.6, period=2.4, phase=i * 0.5, spiked=True)
L.pop_spikes(15200, 0, length=150, up=1.0, down=1.6)
L.lums(14400, -150, 15000, -150, 6, 20)

# ---- S9 the altar steps and the gate (15400..16700) -----------------------------------------------------
L.checkpoint(15460, -120)
L.enemy("cocobonk", 16050, -240)
L.goal(16300, -240)
L.lums(15650, -340, 16200, -340, 5, 30)
for x, k, s in [(15800, "totem", 1.1), (16550, "totem", 1.2), (16450, "bromeliad", 1.0), (15950, "big_leaf", 1.0)]:
    L.deco(k, x, -240, s)
for x in [15800, 16550]:
    L.glow(x, -420, C(1.0, 0.85, 0.5), radius=260, energy=0.6)
L.wall(16700, -1400, -240)

L.dress(-250, 1640, "ruins", spacing=150, seed=33)
L.dress(7620, 7980, "ruins", spacing=150, seed=34)
L.dress(9000, 16600, "ruins", spacing=170, seed=35, skip=[(9700, 10100), (11750, 12150), (12600, 12700), (12780, 14020),
        (14200, 15400), (16250, 16350)])
L.finish(spawn=(0, -2), left=-360, right=16760, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w3_3_sunken_temple.tscn"))
