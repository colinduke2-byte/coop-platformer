@tool
class_name BreakableBlock
extends AnimatableBody2D  # AnimatableBody so punch hitboxes (areas) can detect it
## Cracked chunk of ground: solid until you punch it, slide into it or ground
## pound it, then it bursts. Hide secrets behind / under these.
## `reinforced` ones need a charged punch (or a pound if `pound_breaks`).
## Origin = top-left, like Block.

@export var size := Vector2(64, 128):
	set(v):
		size = v
		_rebuild()
@export var reinforced := false:
	set(v):
		reinforced = v
		queue_redraw()
@export var pound_breaks := true
@export var lums := 0

var _col: CollisionShape2D
var _shake := 0.0


func _ready() -> void:
	collision_layer = 1 | 4
	collision_mask = 0
	sync_to_physics = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size
	_col.shape = shape
	_col.position = size * 0.5
	queue_redraw()


func take_hit(by: Player, _knockback: Vector2) -> void:
	if collision_layer == 0:
		return
	var power := by.punch_power if by else 1.0
	var pounding := by != null and by.state_machine.current_name() == &"GroundPound"
	if reinforced and power < 0.6 and not (pounding and pound_breaks):
		_shake = 1.0
		EventBus.enemy_blocked.emit(self, by)
		return
	_break(by)


func _physics_process(delta: float) -> void:
	if _shake > 0.0:
		_shake = maxf(_shake - delta * 5.0, 0.0)
		queue_redraw()


func _break(by: Player) -> void:
	collision_layer = 0
	EventBus.breakable_broken.emit(self, by)
	EventBus.screen_shake.emit(0.25)
	var centre := global_position + size * 0.5
	for i in lums:
		var lum: Node2D = preload("res://collectibles/lum.tscn").instantiate()
		lum.global_position = centre + Vector2(randf_range(-20, 20), randf_range(-30, 10))
		get_parent().add_child.call_deferred(lum)
	var th := LevelTheme.find(self)
	# Chunks tumble away.
	for i in 8:
		var chunk := Polygon2D.new()
		chunk.polygon = Art.ellipse(Vector2.ZERO, randf_range(8, 16), randf_range(6, 12), 6)
		chunk.color = th.ground.lerp(th.ground_dark, randf())
		chunk.position = size * Vector2(randf(), randf())
		add_child(chunk)
		var tw := chunk.create_tween().set_parallel()
		var to := chunk.position + Vector2(randf_range(-120, 120), randf_range(-140, 60))
		tw.tween_property(chunk, ^"position", to, 0.5).set_ease(Tween.EASE_OUT)
		tw.tween_property(chunk, ^"rotation", randf_range(-6, 6), 0.5)
		tw.tween_property(chunk, ^"modulate:a", 0.0, 0.3).set_delay(0.25)
	_draw_hidden = true
	queue_redraw()
	get_tree().create_timer(0.6).timeout.connect(queue_free)


var _draw_hidden := false


func _draw() -> void:
	if _draw_hidden:
		return
	var th := LevelTheme.find(self)
	var off := Vector2(randf_range(-3, 3) * _shake, 0)
	var r := Rect2(off, size)
	draw_rect(r, th.ground)
	draw_rect(r, th.outline, false, 4.0)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(global_position))
	# Cracks.
	for i in 3:
		var p := off + Vector2(rng.randf_range(10, size.x - 10), rng.randf_range(10, size.y - 10))
		var pts := PackedVector2Array([p])
		for k in 3:
			p += Vector2(rng.randf_range(-16, 16), rng.randf_range(8, 22))
			pts.append(p)
		draw_polyline(pts, th.outline, 3.0)
	if reinforced:
		var metal := Color("8a93a6")
		for y: float in [8.0, size.y - 16.0]:
			draw_rect(Rect2(off.x + 2, y, size.x - 4, 8), metal)
			for x in range(10, int(size.x) - 5, 20):
				draw_circle(off + Vector2(x, y + 4), 2.5, metal.lightened(0.4))
