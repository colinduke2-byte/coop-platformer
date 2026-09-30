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
from tscn import Scene, V, C, NodePath

RES = "res://"
BLOCK = RES + "world/block.tscn"
ENEMIES = {k: f"{RES}enemies/{k}.tscn" for k in
           ["grunt", "flapjack", "spikeroo", "shieldbug", "spitpod", "bonkhorn", "boingo", "king_grumblo"]}
GROUPS = ["Decor", "Blocks", "Toys", "Hazards", "Logic", "Pickups", "Enemies", "Signs", "Checkpoints"]


class LevelKit:
    def __init__(self, root, level_name, theme="meadow", horizon=0.0, script="res://levels/level.gd"):
        self.s = Scene(root)
        self.s.root_props["script"] = self.s.script(script)
        self.s.root_props["level_theme"] = self.s.resource(f"{RES}world/themes/{theme}.tres")
        self.s.root_props["level_name"] = level_name
        self.s.node("Backdrop", "Node2D", props={"script": self.s.script(RES + "world/backdrop.gd"),
                                                 "horizon_y": float(horizon)}, unique=False)
        for g in GROUPS:
            self.s.node(g, "Node2D", unique=False)
        self.min_x, self.max_x, self.max_y = 0.0, 0.0, 0.0
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
        return self.s.node("Block", None, group, dict({"position": V(x, y)}, **props),
                           instance=self.s.scene(BLOCK))

    def ground(self, x0, x1, top=0.0, depth=500.0, **kw):
        return self.block(x0, top, x1 - x0, depth, **kw)

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
                 "CANDY_CANE", "LOLLIPOP", "REEDS"]
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

    def finish(self, spawn, left=None, right=None, bottom=None, kill_y=None, script_props=None):
        s = self.s
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
