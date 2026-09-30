"""Dreamer's Playground - the tutorial demo: one section per mechanic.
Regenerate:  cd tools/levelgen && python3 levels/demo.py
(Or edit levels/demo_level.tscn in Godot; then this script is just history.)"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit

L = LevelKit("DemoLevel", "Dreamer's Playground", theme="meadow", horizon=0, script="res://levels/demo_level.gd")

def kz(x0, x1, y):
    """Kill strip under a pit so falls end quickly."""
    L.s.node("PitKill", "Area2D", "Hazards", {"script": L.s.script("res://world/kill_zone.gd"),
             "position": __import__("tscn").V((x0 + x1) / 2, y), "collision_layer": 32, "collision_mask": 2,
             "monitorable": False})
    path = f"Hazards/PitKill{sum(1 for n in L.s.nodes if n[0].startswith('PitKill'))}"
    shape = L.s.sub_res("RectangleShape2D", {"size": __import__("tscn").V(x1 - x0 + 200, 60)})
    L.s.node("Shape", "CollisionShape2D", path, {"shape": shape})

# ---- S0 start + wardrobe (x -200..1000) ------------------------------------------
L.wall(-260, -900, 500)
L.ground(-200, 1900, 0)
for i, c in enumerate(["mumbleby", "sir_dinkworth", "tootle", "gribble"]):
    L.pedestal(300 + i * 140, 0, c)
L.sign(-20, 0, "Welcome, dreamers!\nStand on a statue + press UP to swap outfits.\nStand still to see their quirks.", 420)
L.lums(300, -230, 720, -230, 5, 40)
L.deco("tree", 880, 0); L.deco("flowers", 150, 0); L.deco("bush", 960, 0, 0.8)

# ---- S1 jump (1000..1900) -------------------------------------------------------------
L.sign(1060, 0, "1. JUMP\ntap = little hop, hold = full height", 380)
L.block(1250, -60, 120, 60); L.block(1370, -130, 120, 130); L.block(1600, -150, 140, 150)
L.lums(1280, -130, 1440, -210, 3); L.lums(1630, -230, 1710, -230, 2)
L.deco("flowers", 1520, 0); L.deco("grass", 1800, 0)

# ---- S2 coyote + one-way (1900..2900) ---------------------------------------------------
kz(1900, 2100, 520)
L.sign(1860, 0, "2. Jump just\nAFTER the edge\n(coyote time!)", 200)
L.ground(2100, 3900, 0)
L.checkpoint(2180, 0)
L.ledge(2350, -140, 200); L.ledge(2570, -270, 200); L.ledge(2350, -400, 200)
L.lums(2380, -460, 2520, -460, 3)
L.sign(2500, 0, "3. One-way ledges: jump up through.\nDOWN + JUMP drops back down.", 420)
L.deco("fence", 2800, 0); L.deco("mushrooms", 3000, 0)

# ---- S3 sprint gap (2900..4250) ---------------------------------------------------------
L.sign(3150, 0, "4. SPRINT: hold Ctrl / RT, or double-tap a direction.\nSprint-jump the big gap!\n(or: run, DOWN to slide, JUMP = long jump)", 500)
L.lums(3920, -120, 4230, -120, 5, 90)
L.block(3900, 320, 350, 200)            # pit floor: missed? climb the vine back up
L.vine(3930, -60, 380)
L.lum(4075, 280); L.lum(4135, 280)
L.ground(4250, 6000, 0)
L.deco("rock", 3800, 0, 0.8)

# ---- S4 crouch / slide tunnel (4250..5000) -----------------------------------------------
L.checkpoint(4270, 0)
L.sign(4466, 0, "5. Hold DOWN to\ncrawl. Running +\nDOWN = slide!", 220)
L.block(4600, -320, 400, 275)          # 45 px gap underneath
L.lums(4640, -22, 4960, -22, 5)
L.deco("bush", 5050, 0)

# ---- S5 ledge grab + wall-jump shaft (5000..5700) ------------------------------------------
L.block(5150, -240, 220, 240)
L.sign(5200, -240, "6. Missed a ledge? You GRAB it!\nHold toward it (or UP) to climb.", 400)
L.block(5430, -700, 60, 560)           # pillar (walk under it)
L.block(5650, -700, 900, 700)          # cliff
L.sign(5570, 0, "7. WALL\nJUMP up\nhere!", 120)
L.lums(5570, -240, 5570, -620, 5)
L.gem(5460, -770)                      # on top of the pillar
L.checkpoint(5760, -700)

# ---- S6 wall run (cliff top -700, 5650..6900) ------------------------------------------------
L.sign(6030, -700, "8. SPRINT, jump at the wall\nand RUN UP IT!", 380)
L.block(6550, -1020, 900, 320)         # 320 high step: sprint + wall run
L.lums(6500, -800, 6500, -1000, 3)
L.deco("tree", 6150, -700, 0.9)

# ---- S7 glide canyon (6550..8400) -------------------------------------------------------------
L.checkpoint(6620, -1020)
L.sign(7200, -1020, "9. GLIDE: in the air, press JUMP again\nand hold it. Wind lifts gliders!", 440)
kz(7450, 8350, -380)
L.updraft(7820, -1500, 160, 1100, 380)
L.lums(7500, -1120, 8300, -1000, 9, 120)
L.lums(7900, -1350, 7900, -1500, 3)
L.ground(8350, 9000, -960)

# ---- S8 bounce pads + swing rings (8350..10000) ------------------------------------------------
L.checkpoint(8370, -960)
L.sign(8600, -960, "10. Bounce on mushrooms\n(hold JUMP = higher).\nFly into flower rings to SWING,\nJUMP to let go.", 380)
L.pad(8820, -960)
L.ledge(8900, -1300, 180)             # the mushroom bounces you up here
for i, (x, y) in enumerate([(9230, -1400), (9470, -1380), (9710, -1400), (9950, -1380)]):
    L.ring(x, y)
kz(9000, 10000, -380)
L.moving(9020, -960, 192, 32, waypoints=((720, 0),), speed=140, wait=0.6)
L.lums(8820, -1100, 8820, -1260, 3)
L.lums(9230, -1300, 9950, -1300, 6, -40)
L.ground(10000, 11060, -960)

# ---- S9 punch + crates + uppercut (10000..11050) --------------------------------------------------
L.checkpoint(10020, -960)
L.sign(10250, -960, "11. PUNCH: tap = jab,\nHOLD = charged punch (breaks iron).\nUP + punch = uppercut", 380)
L.crate(10450, -960); L.crate(10560, -960); L.crate(10560, -1024)
L.crate(10700, -960, iron=True, lums=5)
L.crate(10840, -1080, lums=4)         # overhead: uppercut it
L.enemy("flapjack", 10950, -1100, mode=0, bob_height=10.0)
L.breakable(11000, -1160, 60, 200, lums=2)

# ---- S10 ground pound (11050..11800) ----------------------------------------------------------------
L.ground(11060, 11300, -960, 460)
L.breakable(11300, -960, 200, 40)
L.block(11300, -640, 200, 120)        # chamber floor
L.pad(11400, -640, height=460)
L.lums(11330, -700, 11330, -900, 3)
L.gem(11470, -700)
L.ground(11500, 14030, -960, 460)
L.sign(11130, -960, "12. GROUND POUND: DOWN + punch in the air.\nSmash the cracked floor!", 440)
L.crate(11700, -960); L.crate(11700, -1024)

# ---- S11 enemy zoo (11800..14030) ---------------------------------------------------------------------
L.checkpoint(11790, -960)
L.sign(12000, -960, "GRUMBLET:\nstomp it or punch it.", 300)
L.enemy("grunt", 12250, -960)
L.sign(12550, -960, "SPIKEROO: don't stomp!\nPunch it or slide into it.", 300)
L.enemy("spikeroo", 12750, -960)
L.checkpoint(12950, -960)
L.sign(13150, -960, "SHIELDBUG: hit it from behind,\nstomp it, or CHARGED punch\nthe shield.", 320)
L.enemy("shieldbug", 13380, -960)
L.block(13560, -1040, 110, 80)
L.enemy("spitpod", 13615, -1040)
L.sign(13615, -1040, "SPITPOD: punch\nits seeds back!", 240)
L.enemy("bonkhorn", 13900, -960)
L.block(14030, -1060, 60, 560)        # bonk wall (jump over it)
L.sign(13890, -960, "BONKHORN: dodge the charge -\ndizzy on walls? POUND it!", 280)

# ---- S12 switch + moving + crumble + plate/gate (14030..16000) ---------------------------------------------
L.ground(14090, 14450, -960, 460)
L.checkpoint(14110, -960)
plat = L.moving(14460, -980, 192, 32, waypoints=((300, 0),), speed=150, wait=0.5, active=False)
L.switch(14350, -960, [plat], mode=1)
L.sign(14260, -960, "13. PUNCH the switch\nto start the platform", 260)
kz(14450, 15450, -380)
L.crumble(15020, -1000, 130); L.crumble(15230, -1000, 130)
L.lums(14520, -1060, 15300, -1100, 7, 40)
L.ground(15450, 16350, -960, 460)
gate = L.gate(15950, -1152, 48, 192)
L.plate(15700, -960, [gate], required=1, latch=True)
L.sign(15550, -960, "14. Pressure plates open gates.\n(Some need TWO friends!)", 380)
L.checkpoint(16020, -960)

# ---- S13 water (16300..17400) -----------------------------------------------------------------------------------
L.block(16350, -560, 900, 120)        # pool bottom
L.water(16350, -960, 900, 400)
L.ground(17250, 17800, -960, 460)
L.sign(16250, -960, "15. SWIM: steer anywhere,\nJUMP = stroke,\nJUMP at the surface = leap out", 360)
L.lums(16450, -800, 17150, -800, 8, -80)
L.spikeball(16800, -760, count=2, radius=110, speed=60)
L.gem(17170, -610)
L.deco("reeds", 16340, -960, 1.0, front=True); L.deco("reeds", 17260, -960, 1.0, front=True)

# ---- S14 vine + cannons (17250..19000) ---------------------------------------------------------------------------
L.checkpoint(17290, -960)
L.block(17800, -1560, 700, 1060)       # cliff
L.vine(17760, -1560, 600)
L.sign(17500, -960, "16. Climb vines: UP / DOWN,\nJUMP to leap off", 340)
L.lums(17760, -1100, 17760, -1500, 4)
L.checkpoint(17950, -1560)
L.sign(18190, -1560, "17. Hop in a barrel, JUMP to FIRE!", 380)
L.cannon(18430, -1610, rotation=60)
L.cannon(18880, -1610, rotation=60, auto=0.35)
kz(18500, 19350, -900)
L.lums(18520, -1720, 19250, -1720, 7, 80)
L.ground(19350, 19900, -1560, 460)

# ---- S15 slope + ice + conveyor + wind (19350..22100) ---------------------------------------------------------------
L.checkpoint(19395, -1560)
L.sign(19660, -1560, "18. Slide down slopes:\nDOWN = belly slide. It gets FAST!", 400)
L.slope(19900, -1260, 600, 300, rising_right=False, fill_below=400)
L.lums(19950, -1560, 20450, -1300, 6)
L.block(20500, -1260, 500, 400, slippery=True)
L.sign(20550, -1260, "Careful - ICE!", 240)
L.block(21000, -1260, 450, 400, conveyor=180.0)
L.wind(21450, -1700, 650, 440, wind=(300, 0))
kz(21450, 22100, -560)
L.lums(21500, -1400, 22050, -1400, 6, 100)
L.sign(21150, -1260, "19. Wind pushes you along -\nglide to ride it!", 360)

# ---- S16 hazard gauntlet (22100..23300) --------------------------------------------------------------------------------
L.checkpoint(22180, -1260)
L.sign(22380, -1260, "20. Watch out! Spike balls,\ncrushers and spikes.", 360)
L.spikeball(22750, -1370, count=2, radius=110, speed=80)
L.crusher(22980, -1700, 128, 112, drop=560)
L.spikes(23250, -1260, 168)

# ---- S21 toybox extras: balloon, zipline, doors, lum blocks, jets, spikes, icicles, saw, key (23400..27700) ----
L.checkpoint(23380, -1260)
L.ground(22100, 28000, -1260, 460)
L.sign(23560, -1260, "21. TOYBOX EXTRAS! Grab a BALLOON to float up.\nSteer over the tower, PUNCH to pop it.", 400)
L.balloon(23820, -1260)
L.block(24000, -1700, 220, 440)                # tower
L.zipline(24240, -1680, 25040, -1360)
L.sign(24110, -1700, "Hop onto the ZIPLINE!", 260)
L.lums(24300, -1680, 24900, -1480, 6)
# Door to a secret sky room and back.
da = L.door(24520, -1260)
L.block(24300, -2320, 500, 40)
db = L.door(24560, -2320)
L.link_doors(da, db)
L.crate(24420, -2320, 64, lums=8)
L.lums(24650, -2400, 24780, -2400, 3)
L.sign(24700, -1260, "Doors: press UP.", 220)
for i in range(3):
    L.lum_block(25150 + i * 100, -1470, lums=4)
L.sign(25200, -1260, "Bump the blocks\nfrom below!", 220)
for i in range(3):
    L.flame(25600 + i * 180, -1260, length=200, on=0.9, off=1.3, phase=i * 0.22)
L.sign(25470, -1260, "Fire jets:\ntime it!", 160)
L.flame(26250, -1260, steam=True, on=1.2, off=1.0)
L.ledge(26170, -1500, 160)
L.key(26250, -1560)
L.sign(26120, -1260, "Steam geysers pop you up...", 300)
L.pop_spikes(26450, -1260, 240, up=1.0, down=1.2)
L.block(26800, -1920, 620, 300)                # icy ceiling slab
for x in [26880, 27060, 27240]:
    L.stalactite(x, -1620)
L.saw(27450, -1300, waypoints=((300, 0),), speed=240)
L.key_door(27850, -1560, 64, 300)
L.sign(27700, -1260, "Carry the KEY to its door\n(drop it if you get bubbled!)", 360)
L.checkpoint(28000, -1260)

# ---- S17 secret mound + vault + goal (28200..29600) -----------------------------------------------------------------------
L.ledge(28280, -1380, 140)
L.block(28450, -1510, 500, 50)          # mound roof
L.block(28850, -1460, 100, 200)         # mound right wall
L.secret(28450, -1460, 400, 200)
L.crate(28650, -1260, 64, lums=10)
L.lums(28500, -1320, 28800, -1320, 4)
L.sign(28172, -1260, "Is that mound\nhollow...?", 200)
L.crate(29050, -1260, 110, lums=10, iron=True)
L.goal(29300, -1260)
L.ground(28000, 29600, -1260, 460)
L.wall(29600, -2200, -800)
L.sign(28700, -1510, "YOU MADE IT! Charge-punch the vault,\nthen jump into the Dream Gate.", 420)

L.finish(spawn=(100, -2), left=-200, right=29600, bottom=560, kill_y=900,
         script_props=None)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/demo_level.tscn"))
