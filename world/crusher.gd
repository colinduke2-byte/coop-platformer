@tool
class_name Crusher
extends AnimatableBody2D
## Grumpy stone block that slams down when a player walks underneath, waits,
## then grinds back up. Getting caught underneath = bubble. You can ride it.
## Origin = top-left at its resting (top) position. The editor shows the drop.

enum Mode { IDLE, SHAKE, DROP, WAIT, RISE }

@export var size := Vector2(128, 112):
	set(v):
		size = v
		_rebuild()
@export var max_drop := 600.0               ## px it can fall
@export var trigger_margin := 24.0          ## px either side that counts as "underneath"
@export var shake_time := 0.35
@export var wait_time := 0.8
@export var rise_speed := 140.0
@export var drop_speed := 1400.0
@export var auto_period := 0.0              ## > 0: slams on a timer instead of when triggered

var _mode := Mode.IDLE
var _timer := 0.0
var _home := Vector2.ZERO
var _col: CollisionShape2D
var _t := 0.0


func _ready() -> void:
	collision_layer = 1
	collision_mask = 1  # only used to find the floor it slams onto
	sync_to_physics = false
	_home = position
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
	_t += delta
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	_timer -= delta
	match _mode:
		Mode.IDLE:
			if (auto_period > 0.0 and _timer <= -auto_period) or (auto_period <= 0.0 and _player_below()):
				_mode = Mode.SHAKE
				_timer = shake_time
		Mode.SHAKE:
			if _timer <= 0.0:
				_mode = Mode.DROP
		Mode.DROP:
			var step := drop_speed * delta
			var col := move_and_collide(Vector2(0, step), true)
			_crush_players(step)
			if col or position.y - _home.y >= max_drop:
				if col:
					position.y += col.get_travel().y
				_mode = Mode.WAIT
				_timer = wait_time
				EventBus.screen_shake.emit(0.4)
				EventBus.player_ground_pounded.emit(null, global_position + Vector2(size.x * 0.5, size.y))
			else:
				position.y += step
		Mode.WAIT:
			if _timer <= 0.0:
				_mode = Mode.RISE
		Mode.RISE:
			position.y = move_toward(position.y, _home.y, rise_speed * delta)
			if position.y <= _home.y:
				_mode = Mode.IDLE
				_timer = 0.0


func _player_below() -> bool:
	for p in get_tree().get_nodes_in_group(&"players"):
		var pl := p as Player
		var x := pl.global_position.x
		var y := pl.global_position.y
		if not pl.is_bubbled() and x > global_position.x - trigger_margin and x < global_position.x + size.x + trigger_margin \
				and y > global_position.y + size.y and y < global_position.y + size.y + max_drop + 20.0:
			return true
	return false


## Anyone standing (or squeezed) under the bottom edge as it lands gets bubbled.
func _crush_players(step: float) -> void:
	var bottom := global_position.y + size.y
	for p in get_tree().get_nodes_in_group(&"players"):
		var pl := p as Player
		var head := pl.global_position.y - Player.BODY_SIZE.y
		if pl.global_position.x > global_position.x - 14.0 and pl.global_position.x < global_position.x + size.x + 14.0 \
				and head <= bottom + step + 2.0 and pl.global_position.y > bottom - 4.0 and pl.is_on_floor():
			pl.hurt()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var stone := Color("9aa0b5")
	var off := Vector2(randf_range(-3, 3), 0) if _mode == Mode.SHAKE else Vector2.ZERO
	Art.shape(self, Art.rounded_rect(off, size + off, 10.0), stone, o, 4.0)
	draw_rect(Rect2(off + Vector2(8, 8), Vector2(size.x - 16, 8)), stone.lightened(0.2))
	# Teeth along the bottom.
	var n := int(size.x / 24.0)
	for i in n:
		var x := off.x + (i + 0.5) * size.x / n
		Art.shape(self, PackedVector2Array([Vector2(x - 10, size.y), Vector2(x, size.y + 14), Vector2(x + 10, size.y)]), Color("d9dde8"), o, 2.0)
	# Angry face.
	var angry := 1.0 if _mode in [Mode.SHAKE, Mode.DROP, Mode.WAIT] else 0.3
	var c := size * 0.5 + off
	for s: float in [-1.0, 1.0]:
		var e := c + Vector2(s * size.x * 0.2, -8)
		Art.shape(self, Art.ellipse(e, 10, 12, 14), Color("fbfaf5"), o, 2.5)
		draw_circle(e + Vector2(-s * 2, 3), 5.0, o)
		draw_line(e + Vector2(-s * 14, -16 - angry * 4.0), e + Vector2(s * 10, -14 + angry * 6.0), o, 5.0)
	draw_line(c + Vector2(-16, 26), c + Vector2(16, 26), o, 4.0)
	if Engine.is_editor_hint():
		draw_rect(Rect2(Vector2(0, size.y), Vector2(size.x, max_drop)), Color(1, 0.3, 0.3, 0.12))
