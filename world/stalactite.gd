@tool
class_name Stalactite
extends Node2D
## Icicle / stalactite hanging from a ceiling: when a player walks underneath
## it shakes, drops, and shatters on the ground (bubbling anyone it lands on).
## Grows back after `regrow` s. Origin = where it hangs from.

@export var trigger_width := 90.0
@export var trigger_depth := 700.0
@export var regrow := 3.0
@export var ice := true                     ## false = rock colours

enum Mode { HANG, SHAKE, FALL, GONE }

var _mode := Mode.HANG
var _timer := 0.0
var _y := 0.0
var _vy := 0.0
var _area: Area2D


func _ready() -> void:
	_area = Area2D.new()
	_area.collision_layer = 32
	_area.collision_mask = 2
	_area.monitorable = false
	var col := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(30, 60)
	col.shape = shape
	col.position = Vector2(0, 30)
	_area.add_child(col)
	add_child(_area, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(delta: float) -> void:
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	_timer -= delta
	match _mode:
		Mode.HANG:
			for n in get_tree().get_nodes_in_group(&"players"):
				var p := n as Player
				var d := p.global_position - global_position
				if not p.is_bubbled() and absf(d.x) < trigger_width * 0.5 + 20.0 and d.y > 0.0 and d.y < trigger_depth:
					_mode = Mode.SHAKE
					_timer = 0.35
		Mode.SHAKE:
			if _timer <= 0.0:
				_mode = Mode.FALL
				_vy = 0.0
		Mode.FALL:
			_vy = minf(_vy + 2600.0 * delta, 1400.0)
			var step := _vy * delta
			var q := PhysicsRayQueryParameters2D.create(global_position + Vector2(0, _y + 60), global_position + Vector2(0, _y + 60 + step), 1)
			var hit := get_world_2d().direct_space_state.intersect_ray(q)
			_y += step
			_area.position.y = _y
			for b in _area.get_overlapping_bodies():
				if b is Player:
					(b as Player).hurt()
			if not hit.is_empty() or _y > trigger_depth + 200.0:
				_shatter()
		Mode.GONE:
			if _timer <= 0.0:
				_mode = Mode.HANG
				_y = 0.0
				_area.position.y = 0.0


func _shatter() -> void:
	_mode = Mode.GONE
	_timer = regrow
	var at := global_position + Vector2(0, _y + 50)
	Vfx.puff(at, 10, Color(0.85, 0.95, 1.0, 0.9) if ice else Color("b8a99a"), Vector2.UP, PI, Vector2(20, 60))
	Audio.play("break", -6.0, 1.4)
	EventBus.screen_shake.emit(0.12)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var c := Color("d8f3ff") if ice else th.ground.lerp(Color("b8a99a"), 0.5)
	if _mode == Mode.GONE:
		var k := 1.0 - clampf(_timer / regrow, 0.0, 1.0)
		draw_colored_polygon(PackedVector2Array([Vector2(-10, 0), Vector2(10, 0), Vector2(0, 40 * k)]), Color(c, 0.6))
		return
	var off := Vector2(randf_range(-2.5, 2.5) if _mode == Mode.SHAKE else 0.0, _y)
	Art.shape(self, PackedVector2Array([off + Vector2(-16, 0), off + Vector2(16, 0), off + Vector2(0, 64)]), c, th.outline, 3.0)
	draw_line(off + Vector2(-6, 6), off + Vector2(-1, 44), Color(1, 1, 1, 0.7), 3.0)
	if Engine.is_editor_hint():
		draw_rect(Rect2(-trigger_width * 0.5, 0, trigger_width, trigger_depth), Color(0.6, 0.9, 1, 0.1))
