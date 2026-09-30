@tool
class_name CrumblePlatform
extends AnimatableBody2D
## Stone ledge that shakes when stood on, then crumbles away and comes back a
## bit later. Origin = top-left, like Block. Keep moving!

@export var size := Vector2(144, 28):
	set(v):
		size = v
		_rebuild()
@export var crumble_delay := 0.45           ## s of shaking after someone lands
@export var respawn_time := 2.5             ## s until it reappears (0 = never)

var _timer := -1.0                          ## counting down to crumble; -1 = idle
var _gone := false
var _shake := 0.0
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 1
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


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint() or _gone:
		return
	if _timer < 0.0:
		if _stood_on():
			_timer = crumble_delay
		return
	_timer -= delta
	_shake = 1.0 - _timer / maxf(crumble_delay, 0.01)
	View.redraw(self)
	if _timer <= 0.0:
		_crumble()


func _stood_on() -> bool:
	for p in get_tree().get_nodes_in_group(&"players"):
		var pl := p as Player
		if pl.is_on_floor() and absf(pl.global_position.y - global_position.y) < 4.0 \
				and pl.global_position.x > global_position.x - 16.0 and pl.global_position.x < global_position.x + size.x + 16.0:
			return true
	return false


func _crumble() -> void:
	_gone = true
	_timer = -1.0
	collision_layer = 0
	EventBus.breakable_broken.emit(self, null)
	var tw := create_tween()
	tw.tween_property(self, ^"modulate:a", 0.0, 0.25)
	if respawn_time > 0.0:
		tw.tween_interval(respawn_time)
		tw.tween_callback(_respawn)


func _respawn() -> void:
	# Wait until nobody is inside the space it would fill.
	for p in get_tree().get_nodes_in_group(&"players"):
		if Rect2(global_position, size).grow(4.0).has_point((p as Node2D).global_position + Vector2(0, -20)):
			get_tree().create_timer(0.3).timeout.connect(_respawn)
			return
	_gone = false
	_shake = 0.0
	collision_layer = 1
	queue_redraw()
	create_tween().tween_property(self, ^"modulate:a", 1.0, 0.2)


func _draw() -> void:
	var off := Vector2(randf_range(-2.5, 2.5), randf_range(-1.0, 1.0)) * _shake if _timer >= 0.0 else Vector2.ZERO
	PlatformArt.draw_crumbly(self, Rect2(off, size), LevelTheme.find(self), _shake)
