@tool
class_name Crate
extends AnimatableBody2D  # not StaticBody2D: areas (the punch hitbox) don't detect static bodies
## Punchable crate. Solid ground you can stand on; punch it to smash it and
## spill Lums. `reinforced` crates (iron bands) only break to a charged punch
## of at least `min_punch_power`; weaker hits just clank. Origin = bottom centre.

const LUM_SCENE := preload("res://collectibles/lum.tscn")
const WOOD := Color("b0793f")
const IRON := Color("6d7680")
const OUTLINE := Color("1d1726")
const SHARD_TIME := 0.5
const CLANK_SHAKE := 4.0

@export var size := 64.0:
	set(value):
		size = value
		_rebuild()
@export var reinforced := false:
	set(value):
		reinforced = value
		_rebuild()
@export var lums := 3
@export_range(0.0, 1.0) var min_punch_power := 0.6  ## reinforced only

var _broken := false
var _visual: Node2D


func _ready() -> void:
	collision_layer = 1 | 4   # world (stand on it) + enemies (punchable)
	collision_mask = 0
	sync_to_physics = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for c in get_children():
		remove_child(c)
		c.queue_free()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(size, size)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -size * 0.5)
	add_child(col)

	_visual = Node2D.new()
	_visual.position = Vector2(0, -size * 0.5)
	add_child(_visual)
	var half := size * 0.5
	var wood := WOOD.darkened(0.3) if reinforced else WOOD
	_box(_visual, Vector2(-half, -half), Vector2(half, half), wood, true)
	var plank := wood.darkened(0.2)
	_line(_visual, Vector2(-half + 4, -half + 4), Vector2(half - 4, half - 4), plank, 6.0)
	_line(_visual, Vector2(-half + 4, half - 4), Vector2(half - 4, -half + 4), plank, 6.0)
	if reinforced:
		# Iron bands round the edges and through the middle, studded with rivets.
		var band := maxf(size * 0.14, 8.0)
		for y: float in [-half + band * 0.5, half - band * 0.5]:
			_box(_visual, Vector2(-half, y - band * 0.5), Vector2(half, y + band * 0.5), IRON, true)
		for x: float in [-half + band * 0.5, half - band * 0.5]:
			_box(_visual, Vector2(x - band * 0.5, -half), Vector2(x + band * 0.5, half), IRON, true)
		for c: Vector2 in [Vector2(-1, -1), Vector2(1, -1), Vector2(1, 1), Vector2(-1, 1)]:
			var rp := c * (half - band * 0.5)
			_box(_visual, rp - Vector2(3, 3), rp + Vector2(3, 3), IRON.lightened(0.45), false)


## Called by the punch state.
func take_hit(by: Player, _knockback: Vector2) -> void:
	if _broken:
		return
	var power := by.punch_power if by else 1.0
	if reinforced and power < min_punch_power:
		_clank()
		return
	_break(by)


func _clank() -> void:
	var tw := create_tween()
	for i in 4:
		tw.tween_property(_visual, ^"position:x", CLANK_SHAKE * (1 if i % 2 == 0 else -1), 0.03)
	tw.tween_property(_visual, ^"position:x", 0.0, 0.03)


func _break(by: Player) -> void:
	_broken = true
	set_deferred(&"collision_layer", 0)
	EventBus.breakable_broken.emit(self, by)
	var centre := global_position + Vector2(0, -size * 0.5)
	for i in lums:
		var lum: Node2D = LUM_SCENE.instantiate()
		var a := lerpf(-2.4, -0.7, float(i) / maxf(lums - 1, 1))
		lum.position = centre + Vector2(cos(a), sin(a)) * size * 0.9
		get_parent().add_child.call_deferred(lum)
	# Fling shards, then disappear.
	_visual.visible = false
	for i in 6:
		var shard := Node2D.new()
		shard.position = Vector2(0, -size * 0.5)
		_box(shard, Vector2(-7, -4), Vector2(7, 4), IRON if (reinforced and i % 3 == 0) else WOOD, true)
		add_child(shard)
		var dir := Vector2.from_angle(randf_range(-PI * 0.9, -PI * 0.1))
		var tw := shard.create_tween()
		tw.tween_property(shard, ^"position", shard.position + dir * randf_range(50, 110), SHARD_TIME).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(shard, ^"rotation", randf_range(-6, 6), SHARD_TIME)
		tw.parallel().tween_property(shard, ^"modulate:a", 0.0, SHARD_TIME * 0.5).set_delay(SHARD_TIME * 0.5)
	get_tree().create_timer(SHARD_TIME + 0.05).timeout.connect(queue_free)


static func _box(parent: Node, a: Vector2, b: Vector2, color: Color, outline: bool) -> void:
	var pts := PackedVector2Array([a, Vector2(b.x, a.y), b, Vector2(a.x, b.y)])
	var p := Polygon2D.new()
	p.polygon = pts
	p.color = color
	parent.add_child(p)
	if outline:
		var l := Line2D.new()
		l.points = pts
		l.closed = true
		l.width = 3.0
		l.default_color = OUTLINE
		p.add_child(l)


static func _line(parent: Node, a: Vector2, b: Vector2, color: Color, width: float) -> void:
	var l := Line2D.new()
	l.points = PackedVector2Array([a, b])
	l.width = width
	l.default_color = color
	parent.add_child(l)
