"""Level kit: build a Godot level scene from short Python calls.

    from kit import LevelKit
    L = LevelKit("CandyCanopy", "Candy Canopy", theme="candy")
    L.ground(-200, 1200, 0)
    L.enemy("grunt", 800, 0)
    L.save("levels/candy_canopy.tscn")

Coordinates are world pixels, +y down. Ground tops are usually y = 0.
Every helper returns the node path, so triggers can target it:
    gate = L.gate(...); L.switch(x, y, targets=[gate])
"""
from tscn import Scene, V, C, NodePath, Raw

RES = "res://"
BLOCK = RES + "world/block.tscn"
ENEMIES = {k: f"{RES}enemies/{k}.tscn" for k in
           ["grunt", "flapjack", "spikeroo", "shieldbug", "spitpod", "bonkhorn", "boingo", "king_grumblo",
            "shellbert", "bumblebonk", "diggle", "ribbiton", "prickleroll", "puffcap", "wispet",
            "baron_bristleback", "slidgewick", "snowl", "yetling", "grumblefrost"]}
GROUPS = ["Decor", "Blocks", "Toys", "Hazards", "Logic", "Pickups", "Enemies", "Signs", "Checkpoints"]


class LevelKit:
    SCENERY = {"hills": 0, "forest": 1, "cave": 2, "canopy": 3, "river": 4, "castle": 5, "candy": 6, "ice": 7}

    def __init__(self, root, level_name, theme="meadow", horizon=0.0, script="res://levels/level.gd",
                 scenery="hills", backdrop=None):
        self.s = Scene(root)
        self.s.root_props["script"] = self.s.script(script)
        self.s.root_props["level_theme"] = self.s.resource(f"{RES}world/themes/{theme}.tres")
        self.s.root_props["level_name"] = level_name
        bprops = {"script": self.s.script(RES + "world/backdrop.gd"), "horizon_y": float(horizon),
                  "scenery": self.SCENERY[scenery]}
        bprops.update(backdrop or {})  # e.g. {"light_shafts": True, "stars": True}
        self.s.node("Backdrop", "Node2D", props=bprops, unique=False)
        for g in GROUPS:
            self.s.node(g, "Node2D", unique=False)
        self.min_x, self.max_x, self.max_y = 0.0, 0.0, 0.0
        self.surfaces = []   # polylines of walkable tops (for dress())
        self.spawn = (0, 0)
        self._gems = 0

    # --- helpers -------------------------------------------------------------
    def _n(self, group, base, ntype, script_path, props, x, y):
        p = {"position": V(x, y)}
        if script_path:
            p = {"script": self.s.script(script_path), "position": V(x, y)}
        p.update({k: v for k, v in props.items() if v is not None})
        self.min_x, self.max_x = min(self.min_x, x), max(self.max_x, x)
        return self.s.node(base, ntype, group, p)

    def _tool(self, group, base, ntype, script_name, x, y, **props):
        return self._n(group, base, ntype, f"{RES}world/{script_name}.gd", props, x, y)

    @staticmethod
    def rel(from_path, to_path):
        """NodePath from one node to another (both relative to the root)."""
        a, b = from_path.split("/"), to_path.split("/")
        while a and b and a[0] == b[0]:
            a.pop(0)
            b.pop(0)
        return NodePath("/".join([".."] * len(a) + b))

    # --- geometry ------------------------------------------------------------
    def block(self, x, y, w, h, one_way=False, lip=None, slippery=False, conveyor=0.0, group="Blocks"):
        props = {"size": V(w, h)}
        if one_way:
            props["one_way"] = True
        if lip is False:
            props["lip"] = False
        if slippery:
            props["slippery"] = True
        if conveyor:
            props["conveyor_speed"] = float(conveyor)
        self.max_y = max(self.max_y, y + h)
        self.max_x = max(self.max_x, x + w)
        self.min_x = min(self.min_x, x)
        if not one_way and w >= 120:
            self.surfaces.append([(x, y), (x + w, y)])
        return self.s.node("Block", None, group, dict({"position": V(x, y)}, **props),
                           instance=self.s.scene(BLOCK))

    def ground(self, x0, x1, top=0.0, depth=500.0, **kw):
        return self.block(x0, top, x1 - x0, depth, **kw)

    # --- Freeform terrain -------------------------------------------------------------
    def terrain(self, points, rounding=14.0, lip=True, group="Blocks"):
        """Any polygon (list of (x, y)) as themed ground with grass on up-facing edges."""
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        self.min_x, self.max_x = min(self.min_x, min(xs)), max(self.max_x, max(xs))
        self.max_y = max(self.max_y, max(ys))
        return self.s.node("Terrain", "StaticBody2D", group, {
            "script": self.s.script(RES + "world/terrain.gd"),
            "polygon": [V(*p) for p in points], "rounding": float(rounding) if rounding != 14.0 else None,
            "lip": None if lip else False, "seed_value": len(self.s.nodes)})

    def land(self, profile, bottom=1400.0, **kw):
        """Ground from a top profile [(x, y), ...] (left to right) down to `bottom`.
        Put two points at the same x for a vertical cliff."""
        pts = list(profile) + [(profile[-1][0], bottom), (profile[0][0], bottom)]
        self.surfaces.append(list(profile))
        return self.terrain(pts, **kw)

    def ceiling(self, profile, top=-2600.0, **kw):
        """Cave roof from its underside profile [(x, y), ...] (left to right) up to `top`."""
        pts = list(profile) + [(profile[-1][0], top), (profile[0][0], top)]
        return self.terrain(pts, lip=False, **kw)

    def tree_platform(self, x0, x1, y, trunk_x, trunk_w=180, thick=60, bottom=1400):
        """A treetop deck on a big trunk (one seamless piece)."""
        tx, tw = trunk_x, trunk_w
        pts = [(x0, y), (x1, y), (x1, y + thick), (tx + tw + 50, y + thick), (tx + tw, y + thick + 90),
               (tx + tw, bottom), (tx, bottom), (tx, y + thick + 90), (tx - 50, y + thick), (x0, y + thick)]
        self.surfaces.append([(x0, y), (x1, y)])
        return self.terrain(pts, rounding=12.0)

    def island(self, x0, x1, y, depth=140, bumps=(), seed=0):
        """A floating island: gently rounded top at y, rocky tapering underside."""
        import random
        rnd = random.Random(seed or int(x0))
        w = x1 - x0
        top = [(x0, y + 10), (x0 + 16, y)]
        for bx, by in bumps:
            top.append((bx, by))
        top += [(x1 - 16, y), (x1, y + 10)]
        under = []
        n = max(int(w / 60), 3)
        for i in range(n, -1, -1):
            t = i / n
            sag = (1 - (2 * t - 1) ** 2) * depth
            under.append((x0 + w * t, y + 20 + sag * rnd.uniform(0.75, 1.1)))
        pts = top + under
        self.surfaces.append(top)
        return self.terrain(pts, rounding=10.0)

    def surface_y(self, x):
        """Top of the highest walkable surface at x (None if there is none)."""
        best = None
        for poly in self.surfaces:
            for (ax, ay), (bx, by) in zip(poly, poly[1:]):
                if ax <= x <= bx and bx > ax:
                    y = ay + (by - ay) * (x - ax) / (bx - ax)
                    best = y if best is None else min(best, y)
        return best

    DRESS = {
        "meadow": [("grass", 4), ("flowers", 3), ("fern", 1), ("bush", 1.2), ("big_flower", 0.6), ("tree", 0.7),
                   ("rock", 0.5), ("stump", 0.3), ("mushrooms", 0.4)],
        "forest": [("fern", 4), ("grass", 2), ("mushrooms", 1), ("stump", 0.6), ("log", 0.4), ("bush", 1), ("tree", 0.5)],
        "cave": [("mushrooms", 3), ("crystals", 1.5), ("rock", 1.5), ("fern", 0.8), ("giant_mushroom", 0.35)],
        "river": [("reeds", 3), ("grass", 3), ("flowers", 2), ("rock", 1), ("bush", 1), ("tree", 0.5)],
        "snow": [("pine", 2.5), ("rock", 1.2), ("snowman", 0.25), ("fence", 0.4), ("crystals", 0.4), ("stump", 0.4)],
        "icecave": [("crystals", 3), ("rock", 1.5), ("snowman", 0.1)],
        "thorn": [("grass", 2), ("rock", 2), ("stump", 1), ("mushrooms", 1), ("fern", 0.6)],
    }

    def dress(self, x0, x1, style="meadow", spacing=150, seed=1, front_every=6, skip=(), trees=True):
        """Scatter decorations along the walkable tops between x0 and x1."""
        import random
        rnd = random.Random(seed)
        table = [k for k in self.DRESS[style] if trees or k[0] != "tree"]
        total = sum(w for _, w in table)
        x = x0 + rnd.uniform(0, spacing)
        n = 0
        while x < x1:
            y = self.surface_y(x)
            ok = y is not None and all(not (a <= x <= b) for a, b in skip)
            if ok:
                yl, yr = self.surface_y(x - 24), self.surface_y(x + 24)
                ok = yl is not None and yr is not None and abs(yl - yr) < 20
            if ok:
                r = rnd.uniform(0, total)
                for kind, w in table:
                    r -= w
                    if r <= 0:
                        break
                size = rnd.uniform(0.8, 1.25) if kind not in ("tree", "giant_mushroom") else rnd.uniform(0.9, 1.3)
                self.deco(kind, round(x), round(y), round(size, 2), seed=rnd.randint(1, 999))
                n += 1
                if front_every and n % front_every == 0:
                    self.deco("grass" if style != "cave" else "mushrooms", round(x + 40), round(y + 2), 1.3, front=True,
                              seed=rnd.randint(1, 999))
            x += spacing * rnd.uniform(0.6, 1.4)

    def wall(self, x, top, bottom, w=60.0):
        return self.block(x, top, w, bottom - top, lip=True)

    def ledge(self, x, y, w=200.0):
        return self.block(x, y, w, 20.0, one_way=True)

    def slope(self, x, bottom, w, h, rising_right=True, fill_below=0.0):
        return self._tool("Blocks", "Slope", "StaticBody2D", "slope", x, bottom,
                          size=V(w, h), rising_right=rising_right, fill_below=float(fill_below))

    # --- toys / environment ----------------------------------------------------
    def pad(self, x, y, rotation=0.0, height=None):
        p = self._tool("Toys", "BouncePad", "Area2D", "bounce_pad", x, y, launch_height=height)
        if rotation:
            self._set_last("rotation_degrees", float(rotation))
        return p

    def ring(self, x, y):
        return self._tool("Toys", "SwingRing", "Area2D", "swing_ring", x, y)

    def moving(self, x, y, w=192, h=32, waypoints=((400, 0),), speed=170.0, wait=0.5, mode=0,
               one_way=False, active=True, rider=False, offset=0.0):
        return self._tool("Toys", "MovingPlatform", "AnimatableBody2D", "moving_platform", x, y,
                          size=V(w, h), waypoints=[V(*p) for p in waypoints], speed=float(speed),
                          wait_time=float(wait), mode=mode, one_way=one_way or None,
                          active=None if active else False, wait_for_rider=rider or None,
                          start_offset=float(offset) if offset else None)

    def crumble(self, x, y, w=144.0, respawn=2.5):
        return self._tool("Toys", "Crumble", "AnimatableBody2D", "crumble_platform", x, y,
                          size=V(w, 28), respawn_time=float(respawn))

    def wheel(self, x, y, count=4, radius=220.0, speed=30.0):
        return self._tool("Toys", "Wheel", "Node2D", "platform_wheel", x, y,
                          count=count, radius=float(radius), speed=float(speed))

    def water(self, x, y, w, h, current=None):
        return self._tool("Toys", "Water", "Area2D", "water", x, y, size=V(w, h),
                          current=V(*current) if current else None)

    def vine(self, x, top, length):
        return self._tool("Toys", "Vine", "Area2D", "climbable", x - 20, top, size=V(40, length))

    def net(self, x, y, w, h):
        return self._tool("Toys", "Net", "Area2D", "climbable", x, y, size=V(w, h))

    def cannon(self, x, y, rotation=0.0, speed=None, auto=None, sweep=None):
        p = self._tool("Toys", "Cannon", "Area2D", "barrel_cannon", x, y, launch_speed=speed,
                       auto_fire_time=auto, sweep_degrees=sweep)
        if rotation:
            self._set_last("rotation_degrees", float(rotation))
        return p

    def wind(self, x, y, w, h, wind=(260, 0), gust=None):
        return self._tool("Toys", "Wind", "Area2D", "wind_zone", x, y, size=V(w, h), wind=V(*wind),
                          gust_period=gust)

    def updraft(self, x, top, w, h, rise=380.0):
        return self._tool("Toys", "Updraft", "Area2D", "updraft", x, top, size=V(w, h), rise_speed=float(rise))

    def bumper(self, x, y, radius=None):
        return self._tool("Toys", "Bumper", "Area2D", "bumper", x, y, radius=radius)

    def crate(self, x, y, size=64.0, lums=3, iron=False):
        return self._tool("Toys", "Crate", "AnimatableBody2D", "crate", x, y, size=float(size), lums=lums,
                          reinforced=iron or None)

    def breakable(self, x, y, w, h, iron=False, lums=0):
        return self._tool("Toys", "Breakable", "AnimatableBody2D", "breakable_block", x, y, size=V(w, h),
                          reinforced=iron or None, lums=lums or None)

    def secret(self, x, y, w, h):
        return self._tool("Decor", "Secret", "Node2D", "secret_area", x, y, size=V(w, h))

    def zipline(self, x, y, ex, ey, posts=True):
        return self._tool("Toys", "Zipline", "Node2D", "zipline", x, y, end=V(ex - x, ey - y),
                          posts=None if posts else False)

    def balloon(self, x, y):
        return self._tool("Toys", "Balloon", "Area2D", "balloon_stand", x, y)

    # --- World 1 pieces ------------------------------------------------------------
    def snowpile(self, x, y, regrow=None, speed=None, max_radius=None):
        """Snow heap: punch it and a growing Snowball rolls out the far side."""
        return self._tool("Toys", "SnowPile", "Area2D", "snow_pile", x, y, regrow=regrow,
                          ball_speed=speed, ball_max_radius=max_radius)

    def avalanche(self, x, y, distance=6000.0, speed=None, height=None, active=False):
        """Chase: a wall of snow sweeping right from x (start it with a zone)."""
        return self._tool("Hazards", "Avalanche", "Node2D", "avalanche", x, y, distance=float(distance),
                          speed=speed, height=height, active=active or None)

    def gondola(self, x, y, waypoints=((800, -300),), w=200, speed=150.0, wait=0.8, offset=0.0, rider=False):
        """Ski-lift chair on a cable (a MovingPlatform with a wire and pylons)."""
        return self._tool("Toys", "Gondola", "AnimatableBody2D", "gondola", x, y,
                          size=V(w, 28), waypoints=[V(*p) for p in waypoints], speed=float(speed),
                          wait_time=float(wait), one_way=True, wait_for_rider=rider or None,
                          start_offset=float(offset) if offset else None)

    def bell(self, x, y, duration=None, recharge=None):
        """Dream Bell: touch/punch it for a Lum Rush (Lums count double for `duration` s)."""
        return self._tool("Toys", "DreamBell", "Area2D", "dream_bell", x, y, duration=duration, recharge=recharge)

    def dandelion(self, x, y, height=180.0):
        return self._tool("Toys", "Dandelion", "Area2D", "dandelion", x, y, height=float(height))

    def geyser(self, x, y, height=420.0, always_on=False, phase=0.0, calm=1.8, launch=1250.0):
        return self._tool("Toys", "Geyser", "Area2D", "geyser", x, y, height=float(height), always_on=always_on,
                          phase=float(phase), calm_time=float(calm), launch_speed=float(launch))

    def seesaw(self, x, ground_y, length=320.0):
        """Pivot sits 44 px above the ground at x."""
        return self._tool("Toys", "Seesaw", "AnimatableBody2D", "seesaw", x, ground_y - 44.0, length=float(length))

    def bridge(self, x, y, ex, ey, planks=None, broken=(), slack=26.0):
        n = planks or max(int(((ex - x) ** 2 + (ey - y) ** 2) ** 0.5 / 46), 4)
        props = dict(span=V(ex - x, ey - y), plank_count=n, slack=float(slack))
        if broken:
            props["broken_planks"] = Raw("PackedInt32Array(%s)" % ", ".join(str(int(b)) for b in broken))
        self.max_x = max(self.max_x, ex)
        return self._tool("Toys", "RopeBridge", "Node2D", "rope_bridge", x, y, **props)

    def pendulum(self, x, y, rope=260.0, width=170.0, amplitude=0.9, period=3.2, phase=0.0, spiked=False):
        group = "Hazards" if spiked else "Toys"
        return self._tool(group, "Pendulum", "Node2D", "pendulum", x, y, rope_length=float(rope), log_width=float(width),
                          amplitude=float(amplitude), period=float(period), phase=float(phase), spiked=spiked)

    def leaf(self, x, y, width=150.0, sink=90.0, depth=360.0):
        return self._tool("Toys", "Leaf", "AnimatableBody2D", "leaf_platform", x, y, width=float(width),
                          sink_speed=float(sink), sink_depth=float(depth))

    def brambles(self, x, y, w, h, seed=3):
        return self._tool("Hazards", "Brambles", "Area2D", "brambles", x, y, size=V(w, h), seed_value=seed)

    def raft(self, x, y, width=180.0, travel=1200.0, current=110.0, offset=0.0):
        return self._tool("Toys", "Raft", "AnimatableBody2D", "log_raft", x, y, width=float(width), travel=float(travel),
                          current=float(current), start_offset=float(offset))

    def acorns(self, x, y, interval=2.2, phase=0.0):
        return self._tool("Hazards", "Acorns", "Node2D", "acorn_dropper", x, y, interval=float(interval), phase=float(phase))

    def ambience(self, kind="pollen", density=1.0, darkness=None, tint=None):
        kinds = ["pollen", "leaves", "fireflies", "spores", "petals", "embers", "snow"]
        props = {"script": self.s.script(RES + "world/ambience.gd"), "kind": kinds.index(kind),
                 "density": float(density) if density != 1.0 else None, "darkness": darkness, "tint": tint}
        return self.s.node("Ambience", "Node2D", "Decor", {k: v for k, v in props.items() if v is not None})

    def glow(self, x, y, color=None, radius=260.0, energy=1.0):
        props = {"script": self.s.script(RES + "world/glow_light.gd"), "position": V(x, y), "radius": float(radius),
                 "energy": float(energy)}
        if color:
            props["color"] = color
        return self.s.node("Glow", "PointLight2D", "Decor", props)

    def backwall(self, x, y, w, h, shade=0.45):
        return self._tool("Decor", "BackWall", "Node2D", "back_wall", x, y, size=V(w, h), shade=float(shade))

    def door(self, x, y, locked=False):
        return self._tool("Logic", "Door", "Area2D", "door", x, y, locked=locked or None)

    def link_doors(self, a, b):
        """Two-way link between doors."""
        self.extra(a, target=self.rel(a, b))
        self.extra(b, target=self.rel(b, a))

    def lum_block(self, x, y, lums=5):
        return self._tool("Toys", "LumBlock", "AnimatableBody2D", "lum_block", x, y, lums=lums)

    def key(self, x, y, color=0):
        return self._n("Pickups", "Key", "Area2D", f"{RES}collectibles/dream_key.gd", {"key_color": color or None}, x, y)

    def key_door(self, x, y, w=64, h=220, color=0):
        return self._tool("Logic", "KeyDoor", "AnimatableBody2D", "key_door", x, y, size=V(w, h),
                          key_color=color or None)

    # --- hazards -----------------------------------------------------------------
    def flame(self, x, y, length=220.0, steam=False, on=1.0, off=1.6, phase=0.0, rotation=0.0):
        p = self._tool("Hazards", "FlameJet", "Node2D", "flame_jet", x, y, style=1 if steam else None,
                       length=float(length), on_time=float(on), off_time=float(off), phase=float(phase) or None)
        if rotation:
            self._set_last("rotation_degrees", float(rotation))
        return p

    def pop_spikes(self, x, y, length=168.0, up=1.0, down=1.4, phase=0.0):
        return self._tool("Hazards", "PopSpikes", "Area2D", "pop_spikes", x, y, length=float(length),
                          up_time=float(up), down_time=float(down), phase=float(phase) or None)

    def stalactite(self, x, y, ice=True):
        return self._tool("Hazards", "Stalactite", "Node2D", "stalactite", x, y, ice=None if ice else False)

    def saw(self, x, y, waypoints=((400, 0),), speed=220.0, radius=34.0, loop=False):
        return self._tool("Hazards", "Saw", "Node2D", "saw_blade", x, y, waypoints=[V(*p) for p in waypoints],
                          speed=float(speed), radius=float(radius), loop=loop or None)
    def spikes(self, x, y, length, rotation=0.0):
        p = self._tool("Hazards", "Spikes", "Area2D", "spikes", x, y, length=float(length))
        if rotation:
            self._set_last("rotation_degrees", float(rotation))
        return p

    def spikeball(self, x, y, count=1, radius=140.0, speed=90.0, start=0.0):
        return self._tool("Hazards", "SpikeBall", "Node2D", "spike_ball", x, y, count=count,
                          radius=float(radius), speed=float(speed), start_angle=float(start) if start else None)

    def crusher(self, x, y, w=128, h=112, drop=600.0, period=None):
        return self._tool("Hazards", "Crusher", "AnimatableBody2D", "crusher", x, y, size=V(w, h),
                          max_drop=float(drop), auto_period=period)

    def lava(self, x, y, width, rise=1200.0, speed=90.0, active=False):
        return self._tool("Hazards", "Lava", "Node2D", "rising_hazard", x, y, width=float(width),
                          rise_distance=float(rise), speed=float(speed), active=active or None)

    # --- logic --------------------------------------------------------------------
    def gate(self, x, y, w=48, h=192, open_offset=None, stay_open=True, start_open=False):
        return self._tool("Logic", "Gate", "AnimatableBody2D", "gate", x, y, size=V(w, h),
                          open_offset=V(*(open_offset or (0, -h))), stay_open=None if stay_open else False,
                          start_open=start_open or None)

    def pit_kill(self, x0, x1, y):
        """Kill strip under a pit so falls end quickly (instead of the level-wide one)."""
        from tscn import V as _V
        path = self.s.node("PitKill", "Area2D", "Hazards", {"script": self.s.script(RES + "world/kill_zone.gd"),
                                                           "position": _V((x0 + x1) / 2, y), "collision_layer": 32,
                                                           "collision_mask": 2, "monitorable": False})
        shape = self.s.sub_res("RectangleShape2D", {"size": _V(x1 - x0 + 200, 60)})
        self.s.node("Shape", "CollisionShape2D", path, {"shape": shape})
        return path

    def switch(self, x, y, targets, mode=1, duration=None):
        path = self._tool("Logic", "Switch", "Area2D", "punch_switch", x, y, mode=mode, timed_duration=duration)
        self._set_last("targets", [self.rel(path, t) for t in targets])
        return path

    def plate(self, x, y, targets, required=1, latch=False):
        path = self._tool("Logic", "Plate", "Area2D", "pressure_plate", x, y, required=required,
                          latch=latch or None)
        self._set_last("targets", [self.rel(path, t) for t in targets])
        return path

    def zone(self, x, y, w, h, targets, everyone=False, send_on=True):
        path = self._tool("Logic", "Zone", "Area2D", "zone_trigger", x, y, size=V(w, h),
                          need_everyone=everyone or None, send_on=None if send_on else False)
        self._set_last("targets", [self.rel(path, t) for t in targets])
        return path

    def arena(self, x, y, targets, enemies=()):
        """DefeatTrigger with enemy children: [(kind, x, y, props), ...] (world coords)."""
        path = self._tool("Logic", "Arena", "Node2D", "defeat_trigger", x, y)
        self._set_last("targets", [self.rel(path, t) for t in targets])
        self.arena_children = []
        for kind, ex, ey, props in enemies:
            p = {"position": V(ex - x, ey - y)}
            p.update(props)
            name = self.s.node(kind.capitalize().replace("_", ""), None, path, p, instance=self.s.scene(ENEMIES[kind]))
            self.arena_children.append(name)
        return path

    def spawner(self, parent_path, x, y, kind="grunt", total=4, alive=2, interval=1.2, active=False, facing=-1,
                parent_origin=(0, 0)):
        return self.s.node("Spawner", "Node2D", parent_path, {
            "script": self.s.script(RES + "world/enemy_spawner.gd"),
            "position": V(x - parent_origin[0], y - parent_origin[1]),
            "enemy_scene": self.s.scene(ENEMIES[kind]), "total": total, "max_alive": alive,
            "interval": float(interval), "active": active, "spawn_facing": facing})

    # --- enemies / pickups / signs / decor ------------------------------------------
    def enemy(self, kind, x, y, facing=-1, **props):
        p = {"position": V(x, y), "start_facing": facing}
        p.update(props)
        self.max_x = max(self.max_x, x)
        return self.s.node(kind.capitalize().replace("_", ""), None, "Enemies", p, instance=self.s.scene(ENEMIES[kind]))

    def lum(self, x, y):
        return self.s.node("Lum", None, "Pickups", {"position": V(x, y)},
                           instance=self.s.scene(RES + "collectibles/lum.tscn"))

    def lums(self, x, y, ex, ey, count=5, arc=0.0):
        return self.s.node("LumLine", "Node2D", "Pickups", {
            "script": self.s.script(RES + "collectibles/lum_line.gd"), "position": V(x, y),
            "count": count, "end": V(ex - x, ey - y), "arc_height": float(arc)})

    def snoozling(self, x, y, hanging=False, fur=None):
        props = {"script": self.s.script(RES + "collectibles/snoozling_cage.gd"), "position": V(x, y), "hanging": hanging}
        if fur:
            props["fur"] = fur
        return self.s.node("Snoozling", "Area2D", "Pickups", props)

    def gem(self, x, y):
        i = self._gems
        self._gems += 1
        return self.s.node("Gem", "Area2D", "Pickups", {
            "script": self.s.script(RES + "collectibles/gem.gd"), "position": V(x, y), "gem_index": i})

    def sign(self, x, y, text, width=440.0, arrow=0):
        return self.s.node("Sign", "Node2D", "Signs", {
            "script": self.s.script(RES + "decor/signpost.gd"), "position": V(x, y), "text": text,
            "width": float(width), "arrow": arrow or None})

    def deco(self, kind, x, y, size=1.0, front=False, seed=0):
        kinds = ["GRASS", "FLOWERS", "BUSH", "TREE", "PINE", "MUSHROOMS", "ROCK", "FENCE", "CRYSTALS",
                 "CANDY_CANE", "LOLLIPOP", "REEDS", "FERN", "LOG", "STUMP", "GIANT_MUSHROOM", "HANGING_VINES",
                 "LILYPADS", "BIG_FLOWER", "ROOTS", "HUT", "LANTERN", "SNOWMAN", "ICICLES", "IGLOO", "SKIS"]
        return self.s.node("Deco", "Node2D", "Decor", {
            "script": self.s.script(RES + "decor/deco.gd"), "position": V(x, y),
            "kind": kinds.index(kind.upper()), "size": float(size) if size != 1.0 else None,
            "front": front or None, "seed_value": seed or None})

    def pedestal(self, x, y, character):
        return self.s.node("Pedestal", "Area2D", "Decor", {
            "script": self.s.script(RES + "world/wardrobe_pedestal.gd"), "position": V(x, y),
            "character": self.s.resource(f"{RES}characters/{character}.tres")})

    def checkpoint(self, x, y):
        return self.s.node("Checkpoint", None, "Checkpoints", {"position": V(x, y)},
                           instance=self.s.scene(RES + "world/checkpoint.tscn"))

    def goal(self, x, y):
        return self.s.node("Goal", "Area2D", ".", {"script": self.s.script(RES + "world/level_goal.gd"),
                                                   "position": V(x, y)})

    # --- finishing --------------------------------------------------------------------
    def _set_last(self, key, value):
        name, ntype, parent, props, inst = self.s.nodes[-1]
        props[key] = value
        self.s.nodes[-1] = (name, ntype, parent, props, inst)

    def extra(self, path, **props):
        for i, (name, ntype, parent, p, inst) in enumerate(self.s.nodes):
            if (name if parent == "." else f"{parent}/{name}") == path:
                p.update(props)
                return
        raise KeyError(path)

    def _ground_near(self, x, y, tol=40.0):
        """y of the walkable top at x that is closest to y (within tol), else None."""
        best = None
        for poly in self.surfaces:
            for (ax, ay), (bx, by) in zip(poly, poly[1:]):
                if ax <= x <= bx and bx > ax:
                    gy = ay + (by - ay) * (x - ax) / (bx - ax)
                    if abs(gy - y) < tol and (best is None or abs(gy - y) < abs(best - y)):
                        best = gy
        return best

    def _declutter(self):
        """Signs and checkpoint lanterns placed on the same spot overlap (the lantern hides
        the sign's text). Slide the SIGN (pure scenery) sideways until its board clears the
        lantern (post at x-5, lamp out to x+50), keeping it on nearby ground; checkpoints
        never move."""
        nodes = self.s.nodes
        cps = [n[3]["position"] for n in nodes if n[2] == "Checkpoints"]
        for n in nodes:
            if n[2] != "Signs":
                continue
            sp = n[3]
            spos = sp["position"]
            longest = max(len(l) for l in sp.get("text", "").split("\n"))
            half = max(sp.get("width", 440.0), longest * 13.5 + 34) / 2
            for pos in cps:
                if abs(spos.y - pos.y) > 60 or spos.x - half > pos.x + 55 or spos.x + half < pos.x - 15:
                    continue
                side = 1 if spos.x >= pos.x else -1
                for nx in ((pos.x + 55 + half + 10) if d > 0 else (pos.x - 15 - half - 10) for d in (side, -side)):
                    gy = self._ground_near(nx, spos.y)
                    if gy is not None:
                        spos.x, spos.y = nx, gy
                        break
                else:
                    print(f"  note: sign at {spos.x:.0f},{spos.y:.0f} overlaps a checkpoint")
                break

    def finish(self, spawn, left=None, right=None, bottom=None, kill_y=None, script_props=None):
        s = self.s
        self._declutter()
        left = self.min_x - 100 if left is None else left
        right = self.max_x + 200 if right is None else right
        bottom = self.max_y if bottom is None else bottom
        kill_y = bottom + 300 if kill_y is None else kill_y
        shape = s.sub_res("RectangleShape2D", {"size": V(right - left + 2000, 200)})
        kz = s.node("KillZone", "Area2D", ".", {"position": V((left + right) / 2, kill_y), "collision_layer": 32,
                                                "collision_mask": 2, "monitorable": False,
                                                "script": s.script(RES + "world/kill_zone.gd")}, unique=False)
        s.node("CollisionShape2D", "CollisionShape2D", kz, {"shape": shape}, unique=False)
        s.node("SpawnPoint", "Marker2D", ".", {"position": V(*spawn)}, unique=False)
        s.node("Players", "Node2D", ".", unique=False)
        s.node("CoopCamera", "Camera2D", ".", {"position": V(spawn[0], spawn[1] - 150),
                                              "limit_left": int(left), "limit_right": int(right),
                                              "limit_bottom": int(bottom),
                                              "script": s.script(RES + "camera/coop_camera.gd")}, unique=False)
        s.node("HUD", None, ".", {}, instance=s.scene(RES + "ui/hud.tscn"), unique=False)
        if script_props:
            s.root_props.update(script_props)

    def save(self, path):
        self.s.save(path)
        print("wrote", path, len(self.s.nodes), "nodes")
