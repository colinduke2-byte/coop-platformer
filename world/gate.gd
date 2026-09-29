@tool
class_name Gate
extends AnimatableBody2D
## Solid door that slides open when a trigger calls set_active(true) (and
## closes again on false, unless `stay_open`). Origin = top-left, like Block.

@export var size := Vector2(48, 192):
	set(v):
		size = v
		_rebuild()
@export var open_offset := Vector2(0, -192)  ## where it slides to when open
@export var open_time := 0.5
@export var stay_open := true
@export var start_open := false

var _open := false
var _closed_pos := Vector2.ZERO
var _col: CollisionShape2D
var _tween: Tween


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = true
	_closed_pos = position
	_rebuild()
	if start_open and not Engine.is_editor_hint():
		_open = true
		position = _closed_pos + open_offset


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


func set_active(on: bool) -> void:
	if on == _open or (not on and stay_open):
		return
	_open = on
	if _tween:
		_tween.kill()
	_tween = create_tween()
	_tween.tween_property(self, ^"position", _closed_pos + (open_offset if on else Vector2.ZERO), open_time) \
			.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN_OUT)
	EventBus.screen_shake.emit(0.12)


func is_open() -> bool:
	return _open


func _draw() -> void:
	var th := LevelTheme.find(self)
	var bar := Color("8a93a6")
	Art.shape(self, Art.rect(Vector2.ZERO, size), th.ledge_dark, th.outline)
	var n := maxi(int(size.x / 16.0), 2)
	for i in n:
		var x := (float(i) + 0.5) * size.x / n
		draw_line(Vector2(x, 4), Vector2(x, size.y - 4), bar, 5.0)
	for y: float in [12.0, size.y * 0.5, size.y - 12.0]:
		draw_rect(Rect2(2, y - 4, size.x - 4, 8), bar.darkened(0.2))
	if Engine.is_editor_hint():
		draw_rect(Rect2(open_offset, size), Color(1, 1, 1, 0.25), false, 2.0)
