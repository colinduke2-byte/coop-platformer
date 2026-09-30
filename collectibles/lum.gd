class_name Lum
extends Area2D
## Collectible: a little winged glow-orb (placeholder name from the Rayman
## days - rename freely). Bobs, drifts toward players who get close, pops on touch.

@export var bob_height := 6.0
@export var bob_speed := 3.0
@export var magnet_radius := 90.0
@export var magnet_speed := 520.0

const RUSH_TINT := Color(1.35, 1.05, 0.55)

var _t := 0.0
var _base := Vector2.ZERO
var _taken := false
var _pull: Player
var _wings: Node2D


func _ready() -> void:
	_base = position
	_t = randf() * TAU
	body_entered.connect(_on_body_entered)
	_wings = Wings.new()
	_wings.position = Vector2(0, -2)
	_wings.show_behind_parent = true
	add_child(_wings, false, Node.INTERNAL_MODE_FRONT)
	for n in [^"Glow"]:
		if has_node(n):
			get_node(n).visible = false


func _process(delta: float) -> void:
	if _taken or not View.sees(global_position):
		return
	_t += delta * bob_speed
	if _pull == null:
		for pl: Player in GameManager.players.values():
			if is_instance_valid(pl) and not pl.is_bubbled() \
					and (pl.global_position + Vector2(0, -30)).distance_squared_to(global_position) < magnet_radius * magnet_radius:
				_pull = pl
				break
	if _pull and is_instance_valid(_pull):
		global_position = global_position.move_toward(_pull.global_position + Vector2(0, -30), magnet_speed * delta)
	else:
		position.y = _base.y + sin(_t) * bob_height
	_wings.scale.y = 1.0 + sin(_t * 6.0) * 0.45  # flap (a transform: no redraw)
	# Lum Rush (a Dream Bell rang): golden, bigger, twinkling - each one counts double.
	if GameManager.lum_rush > 0.0:
		modulate = RUSH_TINT
		scale = Vector2.ONE * (1.3 + sin(_t * 4.0) * 0.1)
	elif scale.x != 1.0:
		modulate = Color.WHITE
		scale = Vector2.ONE


func _on_body_entered(body: Node2D) -> void:
	if _taken or not body is Player or body.is_bubbled():
		return
	_taken = true
	EventBus.lum_collected.emit(body.slot, global_position)
	set_deferred(&"monitoring", false)
	var tw := create_tween()
	tw.tween_property(self, ^"scale", Vector2(1.8, 1.8), 0.08)
	tw.parallel().tween_property(self, ^"modulate:a", 0.0, 0.12)
	tw.tween_callback(queue_free)


## Drawn once; bobbing and flapping are transforms, so lums never redraw.
func _draw() -> void:
	draw_circle(Vector2.ZERO, 17.0, Color(1, 0.9, 0.3, 0.22))
	draw_circle(Vector2.ZERO, 9.0, Color("1d1726"))
	draw_circle(Vector2.ZERO, 7.5, Color("ffe45c"))
	draw_circle(Vector2(-2.5, -2.5), 2.5, Color(1, 1, 1, 0.9))


class Wings extends Node2D:
	func _draw() -> void:
		for s: float in [-1.0, 1.0]:
			draw_colored_polygon(PackedVector2Array([Vector2(s * 4, -3), Vector2(s * 16, -12), Vector2(s * 14, -2)]), Color(1, 1, 1, 0.85))
