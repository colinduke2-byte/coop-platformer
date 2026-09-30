class_name LevelAudit
extends Node
## Finds layout mistakes in a level: signs clipping into terrain, floating or
## overlapping each other / checkpoints / the goal / water; Lums, gems, cages
## and enemies buried in solid ground; checkpoints in mid-air.
##   godot --headless --path . res://tools/level_audit.tscn [-- --level=res://levels/w1_1_pillow_meadow.tscn]
## (no --level = every level in LevelCatalog + the sandboxes). tests/run_tests.gd runs it too.

const WORLD := 1
const CHECKPOINT_BOX := Rect2(-20, -150, 80, 150)   ## the lantern post + lamp, around the origin
const GOAL_BOX := Rect2(-70, -230, 140, 230)


func _ready() -> void:
	var only := ""
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--level="):
			only = a.substr(8)
	var paths: Array[String] = []
	if only != "":
		paths.append(only)
	else:
		paths = all_levels()
	var total := 0
	for p in paths:
		var issues: Array[String] = await audit_path(self, p)
		total += issues.size()
		print("%s  %s" % ["OK  " if issues.is_empty() else "%-4d" % issues.size(), p])
		for i in issues:
			print("      " + i)
	print("AUDIT: %d issue(s)" % total)
	get_tree().quit(1 if total > 0 else 0)


static func all_levels() -> Array[String]:
	var r: Array[String] = []
	for l: Dictionary in LevelCatalog.LEVELS:
		r.append(l["scene"])
	return r


## Load `path` under `host`, check it, free it.
static func audit_path(host: Node, path: String) -> Array[String]:
	var level: Node = load(path).instantiate()
	host.add_child(level)
	for i in 4:
		await host.get_tree().physics_frame
	var issues := audit(level)
	level.queue_free()
	await host.get_tree().process_frame
	return issues


static func audit(level: Node) -> Array[String]:
	var issues: Array[String] = []
	var space := (level as Node2D).get_world_2d().direct_space_state
	var signs: Array[Dictionary] = []
	for n in level.find_children("*", "Signpost", true, false):
		var s := n as Signpost
		var w: float = s.get("_w")
		var h: float = s.get("_board_h")
		var o := s.global_position
		signs.append({"node": s, "board": Rect2(o.x - w * 0.5, o.y - h - 70.0, w, h),
				"post": Rect2(o.x - 7, o.y - 80, 14, 80)})
	var avoid: Array[Array] = []  # [name, rect]
	for n in level.find_children("*", "Checkpoint", true, false):
		var c := n as Node2D
		avoid.append(["checkpoint", Rect2(c.global_position + CHECKPOINT_BOX.position, CHECKPOINT_BOX.size)])
		if not _solid_near(space, c.global_position + Vector2(0, 6)):
			issues.append("checkpoint at %s floats (no ground under it)" % _p(c.global_position))
		if _solid_at(space, c.global_position + Vector2(0, -20)):
			issues.append("checkpoint at %s is buried in terrain" % _p(c.global_position))
	var goals := level.find_children("*", "LevelGoal", true, false)
	if goals.size() != 1:
		issues.append("the level has %d goals (should be exactly 1)" % goals.size())
	for n in goals:
		var g := n as Node2D
		avoid.append(["goal", Rect2(g.global_position + GOAL_BOX.position, GOAL_BOX.size)])
	# Props that stand in front of signs (boxes around their origin; origin = where they stand).
	var props := {"BalloonStand": Rect2(-45, -200, 90, 200), "BouncePad": Rect2(-60, -40, 120, 40),
			"DreamBell": Rect2(-60, -210, 120, 210), "BarrelCannon": Rect2(-60, -60, 120, 120),
			"Geyser": Rect2(-50, -50, 100, 50), "SnowPile": Rect2(-60, -70, 120, 70),
			"WardrobePedestal": Rect2(-50, -160, 100, 160), "LumBlock": Rect2(0, 0, 64, 64),
			"SnoozlingCage": Rect2(-45, -110, 90, 110)}
	for cls: String in props:
		for n in level.find_children("*", cls, true, false):
			var r: Rect2 = props[cls]
			avoid.append([cls, Rect2((n as Node2D).global_position + r.position, r.size)])
	for n in level.find_children("*", "Dandelion", true, false):
		var h: float = n.get("height")
		avoid.append(["Dandelion", Rect2((n as Node2D).global_position + Vector2(-50, -h - 50), Vector2(100, h + 50))])
	for n in level.find_children("*", "Water", true, false):
		var wa := n as Node2D
		var sz: Vector2 = wa.get("size")
		avoid.append(["water", Rect2(wa.global_position, sz)])
	for i in signs.size():
		var s: Dictionary = signs[i]
		var node: Signpost = s["node"]
		var where := "sign \"%s\" at %s" % [node.text.get_slice("\n", 0).left(28), _p(node.global_position)]
		for r: Rect2 in [s["board"], s["post"]]:
			var hit := _solid_in(space, r.grow(-4.0))
			if hit != "":
				issues.append("%s: %s cuts into %s" % [where, "board" if r == s["board"] else "post", hit])
				break
		if not _solid_near(space, node.global_position + Vector2(0, 6)):
			issues.append("%s floats (no ground under the post)" % where)
		for a: Array in avoid:
			if (s["board"] as Rect2).grow(-2.0).intersects(a[1]) or (s["post"] as Rect2).intersects(a[1]):
				issues.append("%s overlaps the %s" % [where, a[0]])
		for j in range(i + 1, signs.size()):
			if (s["board"] as Rect2).intersects(signs[j]["board"]):
				issues.append("%s overlaps sign at %s" % [where, _p((signs[j]["node"] as Node2D).global_position)])
	for n in level.find_children("*", "Lum", true, false):
		var l := n as Node2D
		if _solid_at(space, l.global_position):
			issues.append("Lum at %s is inside terrain" % _p(l.global_position))
		for s: Dictionary in signs:
			if (s["board"] as Rect2).grow(-6.0).has_point(l.global_position):
				issues.append("Lum at %s floats over the text of sign at %s" % [_p(l.global_position), _p((s["node"] as Node2D).global_position)])
	for cls: String in ["DreamGem", "SnoozlingCage", "DreamKey"]:
		for n in level.find_children("*", cls, true, false):
			var c := n as Node2D
			var at := c.global_position + (Vector2(0, -30) if cls == "SnoozlingCage" else Vector2.ZERO)
			if _solid_at(space, at):
				issues.append("%s at %s is inside terrain" % [cls, _p(c.global_position)])
	for n in level.find_children("*", "Enemy", true, false):
		var e := n as Enemy
		var r := Rect2(e.global_position + Vector2(-e.body_size.x * 0.5, -e.body_size.y), e.body_size).grow(-6.0)
		var hit := _solid_in(space, r, [e.get_rid()])
		if hit != "":
			issues.append("%s at %s starts inside %s" % [e.name, _p(e.global_position), hit])
	return issues


static func _p(v: Vector2) -> String:
	return "(%d, %d)" % [roundi(v.x), roundi(v.y)]


static func _solid_at(space: PhysicsDirectSpaceState2D, pt: Vector2) -> bool:
	var q := PhysicsPointQueryParameters2D.new()
	q.position = pt
	q.collision_mask = WORLD
	for hit in space.intersect_point(q, 8):
		var c: Object = hit["collider"]
		if c is Block and c.one_way:
			continue
		if c is AnimatableBody2D:
			continue  # moving pieces pass through things by design
		return true
	return false


## Solid ground (one-way ledges count) within a few px below `pt`.
static func _solid_near(space: PhysicsDirectSpaceState2D, pt: Vector2) -> bool:
	for dy in [0.0, 6.0, 14.0]:
		var q := PhysicsPointQueryParameters2D.new()
		q.position = pt + Vector2(0, dy)
		q.collision_mask = WORLD
		if not space.intersect_point(q, 1).is_empty():
			return true
	return false


## Name of the first solid world body overlapping `r`, or "".
static func _solid_in(space: PhysicsDirectSpaceState2D, r: Rect2, exclude: Array[RID] = []) -> String:
	if r.size.x <= 0.0 or r.size.y <= 0.0:
		return ""
	var shape := RectangleShape2D.new()
	shape.size = r.size
	var q := PhysicsShapeQueryParameters2D.new()
	q.shape = shape
	q.transform = Transform2D(0.0, r.get_center())
	q.collision_mask = WORLD
	q.exclude = exclude
	for hit in space.intersect_shape(q, 8):
		var c: Node = hit["collider"]
		if c is AnimatableBody2D:
			continue
		return c.name
	return ""
