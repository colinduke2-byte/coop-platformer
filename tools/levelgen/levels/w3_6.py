"""World 3-6: CHAMELIA'S TEMPLE - the great stepped temple at the heart of the Rainbloom Jungle.
The temple steps (flytraps, monkeys, pop-spikes), three lianas over the moat,
the long climb up the pyramid's terraces under diving toucans, and then the
boss on the summit: CHAMELIA, the Colour Queen. Jump her tongue - if it hits a
WALL it sticks, and she's stuck: STOMP her! Later she turns invisible (watch
for the shimmer) and leaps to spit seeds.
Secrets: gem 0 on the ledge above the temple steps, gem 1 high over the moat,
gem 2 above the victory ledge; the Snoozling's cage hangs on the terraces.
Regenerate: python3 tools/levelgen/levels/w3_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("ChameliaTemple", "Chamelia's Temple", theme="temple", horizon=-200, scenery="ruins")
L.ambience("petals", 0.8)
L.ambience("leaves", 0.5)

# ---- S0 the temple gate (x -300..1500) ------------------------------------------------------------
L.wall(-360, -1600, 600)
L.land([(-300, 0), (3200, 0)], bottom=1500)
L.sign(90, 0, "CHAMELIA'S TEMPLE. The Colour\nQueen watches from the summit...", 420)
L.deco("totem", 560, 0, 1.2)
L.deco("palm", 820, 0)
L.deco("totem", 1240, 0, 1.2)
L.lums(300, -110, 1100, -110, 6, 30)

# ---- S1 the temple steps (1500..3200) ----------------------------------------------------------------
L.checkpoint(1500, 0)
L.bell(1620, 0)
for i, x in enumerate([1900, 2200]):
    L.pop_spikes(x, 0, length=168, up=1.0, down=1.5, phase=0.5 - i * 0.28)
L.snaptrap(2550, 0)
L.ledge(2380, -190, 160)
L.ledge(2620, -370, 150)                           # gem 0
L.gem(2695, -430)
L.enemy("cocobonk", 3000, 0)
L.lums(1850, -120, 2400, -120, 6)
L.lums(2700, -110, 3100, -110, 4, 30)

# ---- S2 the moat: three lianas (3200..4600) ----------------------------------------------------------
L.pit_kill(3200, 4600, 700)
for x, ph in [(3430, 0.2), (3890, 1.0), (4350, 0.5)]:
    L.liana(x, -520, 330, sway=0.13, phase=ph)
L.gem(3890, -620)                                  # gem 1, high over the moat (swing up!)
L.lums(3320, -300, 4480, -300, 10, 80)

# ---- S3 the terraces (4600..6000) ---------------------------------------------------------------------
L.land([(4600, 0), (5000, 0), (5000, -140), (5250, -140), (5250, -280), (5500, -280), (5500, -420),
        (5750, -420), (5750, -560), (6000, -560), (6000, -700), (9000, -700)], bottom=1500)
L.checkpoint(4680, 0)
L.snaptrap(5130, -140)
L.snaptrap(5630, -420)
L.enemy("swoopbeak", 5300, -760)
L.snoozling(5380, -450, hanging=True, fur=C(1.0, 0.6, 0.85))
L.lums(5000, -240, 5880, -660, 8)

# ---- S4 the summit arena: CHAMELIA ------------------------------------------------------------------------
L.checkpoint(6300, -700)
L.sign(6130, -700, "CHAMELIA! Jump her tongue -\nnear a wall it STICKS.\nThen STOMP her!", 300)
entry = L.gate(6420, -1060, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(7700, -1060, 48, 360)
L.arena(7100, -700, [exit_gate], enemies=[("chamelia", 7150, -700, {"asleep": True})])
boss = L.arena_children[0]
L.zone(6490, -1200, 1150, 500, [entry], everyone=True, send_on=False)
L.zone(6490, -1200, 1150, 500, [boss], everyone=True)
L.block(6420, -1700, 48, 640)                      # arena walls above the gates
L.block(7700, -1700, 48, 640)
L.ledge(6600, -900, 170)
L.ledge(7400, -900, 170)
L.lums(6560, -800, 7600, -800, 8, 40)

# ---- the victory ledge -------------------------------------------------------------------------------------
L.goal(8250, -700)
L.ledge(8000, -940, 150)
L.gem(8075, -1000)                                 # gem 2
L.lums(7850, -800, 8650, -800, 6)
L.deco("totem", 8600, -700, 1.1)
L.deco("palm", 8800, -700)
L.wall(9000, -2200, -700)

L.dress(-250, 1450, "ruins", spacing=150, seed=61)
L.dress(7780, 8950, "ruins", spacing=170, seed=62)
L.finish(spawn=(0, -2), left=-360, right=9060, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w3_6_chamelia_temple.tscn"))
