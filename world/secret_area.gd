@tool
class_name SecretArea
extends Node2D
## Fake wall drawn IN FRONT of a hidden room. Build the room with normal
## Blocks behind it, then cover it with this; it fades away when a player
## steps inside, and counts as a found secret (EventBus.secret_found).
## Origin = top-left.

@export var size := Vector2(400, 300):
	set(v):
		size = v
		queue_redraw()
@export var reveal_alpha := 0.12

var found := false
var _alpha := 1.0


func _ready() -> void:
	z_index = 30


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var inside := false
	for p in get_tree().get_nodes_in_group(&"players"):
		if Rect2(global_position, size).has_point((p as Node2D).global_position + Vector2(0, -30)):
			inside = true
	if inside and not found:
		found = true
		EventBus.secret_found.emit(self)
	var target := reveal_alpha if inside else 1.0
	if not is_equal_approx(_alpha, target):
		_alpha = move_toward(_alpha, target, delta * 3.0)
		modulate.a = _alpha


func _draw() -> void:
	var th := LevelTheme.find(self)
	draw_rect(Rect2(Vector2.ZERO, size), th.ground)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(global_position))
	for i in int(size.x * size.y / 2600.0):
		var p := Vector2(rng.randf_range(8, size.x - 8), rng.randf_range(8, size.y - 8))
		draw_colored_polygon(Art.ellipse(p, rng.randf_range(4, 9), rng.randf_range(3, 6), 10), th.ground_dark)
	if Engine.is_editor_hint():
		draw_rect(Rect2(Vector2.ZERO, size), Color(1, 0.8, 0.2, 0.9), false, 3.0)
		draw_string(ThemeDB.fallback_font, Vector2(10, 30), "SECRET", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(1, 0.9, 0.3))
