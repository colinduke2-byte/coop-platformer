"""Sunset Gusts - windy cliffs at dusk: crumbling bridges, gusts, cannons,
a platform wheel, crushers and a locked arena.  python3 levels/sunset.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit

L = LevelKit("SunsetGusts", "Sunset Gusts", theme="sunset", horizon=0)

# ---- start --------------------------------------------------------------------------------------
L.wall(-360, -1000, 500)
L.ground(-300, 1200, 0)
L.sign(200, 0, "SUNSET GUSTS\nHold on to your hats!", 320)
L.lums(500, -100, 1100, -100, 6, 50)
for x, k in [(-120, "pine"), (700, "rock"), (1000, "grass"), (1150, "fence")]:
    L.deco(k, x, 0)

# ---- S1 crumbling bridge + Bonkhorn welcome (1200..3200) ----------------------------------------------
for i in range(5):
    L.crumble(1250 + i * 220, -20, 144, respawn=3.0)
L.lums(1320, -100, 2200, -100, 5)
L.pit_kill(1200, 2300, 400)
L.ground(2300, 3000, 0)
L.checkpoint(2360, 0)
L.enemy("bonkhorn", 2750, 0)
L.block(3000, -100, 60, 600)                  # bonk wall
L.ground(3060, 3200, 0)
L.sign(2480, 0, "Stone bridges crumble - keep moving!", 360)

# ---- S2 gusting headwind over ledges (3200..4300) ------------------------------------------------------
L.checkpoint(3120, 0)
for x, y in [(3300, -40), (3560, -100), (3820, -40), (4080, -100)]:
    L.block(x, y, 160, 30)
L.wind(3200, -900, 1100, 900, wind=(-320, 0), gust=3.0)
L.updraft(3860, -900, 110, 830, 400)
L.gem(3915, -860)
L.lums(3300, -150, 4240, -150, 8, 40)
L.pit_kill(3200, 4300, 400)
L.ground(4300, 4720, 0)
L.sign(3050, -100, "GUSTS! Wait for the wind to\ndrop, then jump.", 320)

# ---- S3 cannon canyon (4300..5600) -----------------------------------------------------------------------
L.checkpoint(4360, 0)
L.cannon(4600, -50, rotation=60)
L.cannon(5050, -50, rotation=60, auto=0.35)
L.lums(4700, -170, 5450, -170, 7, 90)
L.pit_kill(4720, 5520, 400)
L.ground(5520, 5900, 0)
L.sign(4460, 0, "Cannon canyon!", 220)

# ---- S4 platform wheel (5900..6700) -------------------------------------------------------------------------
L.checkpoint(5580, 0)
L.wheel(6300, -150, count=4, radius=240, speed=35)
L.gem(6300, -470)
L.pit_kill(5900, 6700, 450)
L.ground(6700, 7700, 0)
L.sign(5760, 0, "Ride the wheel!", 220)

# ---- S5 crusher corridor (6700..7700) ------------------------------------------------------------------------
L.checkpoint(6760, 0)
for x in [6950, 7200, 7450]:
    L.crusher(x, -560, 128, 112, drop=600)
L.lums(6950, -60, 7560, -60, 6)
L.sign(6860, -200, "Don't stop under the crushers!", 320)

# ---- S6 locked arena (7700..8900) ----------------------------------------------------------------------------
L.ground(7700, 8900, 0)
L.checkpoint(7760, 0)
entry = L.gate(7840, -300, 48, 300, start_open=True, stay_open=False, open_offset=(0, -300))
exit_gate = L.gate(8800, -300, 48, 300)
arena = L.arena(8300, 0, [exit_gate], enemies=[
    ("grunt", 8200, 0, {}), ("grunt", 8500, 0, {"start_facing": 1}), ("shieldbug", 8650, 0, {})])
sp = L.spawner(arena, 8350, -300, kind="flapjack", total=2, alive=2, interval=1.0, active=False,
               parent_origin=(8300, 0))
L.zone(7920, -400, 860, 400, [entry], everyone=True, send_on=False)
L.zone(7920, -400, 860, 400, [sp], everyone=True)
L.sign(7600, -150, "ARENA: beat everyone\nto open the gate!", 280)

# ---- S7 shooters on the heights (8900..10300) ------------------------------------------------------------------
L.ground(8900, 10400, 0)
L.checkpoint(9000, 0)
L.block(9250, -150, 200, 150)
L.enemy("spitpod", 9350, -150)
L.ledge(9500, -240, 160)
L.block(9700, -300, 240, 300)
L.enemy("shieldbug", 9820, -300)
L.pad(10050, 0, height=700)
L.gem(10050, -760)
L.lums(10050, -300, 10050, -650, 4)
L.sign(10150, 0, "Big mushroom...\nwhat's up there?", 260)

# ---- goal ---------------------------------------------------------------------------------------------------------
L.goal(10650, 0)
L.ground(10400, 11000, 0)
L.wall(11000, -1200, 500)
L.lums(10300, -80, 10550, -80, 4)

L.finish(spawn=(0, -2), left=-300, right=11000, bottom=560, kill_y=900)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/sunset_gusts.tscn"))
