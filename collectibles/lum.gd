class_name Lum
extends Area2D
## Collectible: a little winged glow-orb (placeholder name from the Rayman
## days - rename freely). Bobs, drifts toward players who get close, pops on touch.

@export var bob_height := 6.0
@export var bob_speed := 3.0
@export var magnet_radius := 90.0
@export var magnet_speed := 520.0

var _t := 0.0
var _base := Vector2.ZERO
var _taken := false
var _pull: Player


func _ready() -> void:
	_base = position
	_t = randf() * TAU
	body_entered.connect(_on_body_entered)
	for n in [^"Glow"]:
		if has_node(n):
			get_node(n).visible = false


func _process(delta: float) -> void:
	_t += delta * bob_speed
	if _taken:
		return
	if _pull == null:
		for p in get_tree().get_nodes_in_group(&"players"):
			var pl := p as Player
			if not pl.is_bubbled() and (pl.global_position + Vector2(0, -30)).distance_to(global_position) < magnet_radius:
				_pull = pl
				break
	if _pull and is_instance_valid(_pull):
		global_position = global_position.move_toward(_pull.global_position + Vector2(0, -30), magnet_speed * delta)
	else:
		position.y = _base.y + sin(_t) * bob_height
	queue_redraw()


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


func _draw() -> void:
	var flap := sin(_t * 6.0)
	draw_circle(Vector2.ZERO, 17.0, Color(1, 0.9, 0.3, 0.22))
	for s: float in [-1.0, 1.0]:
		var wing := PackedVector2Array([Vector2(s * 4, -3), Vector2(s * 16, -12 - flap * 5.0), Vector2(s * 14, -2)])
		draw_colored_polygon(wing, Color(1, 1, 1, 0.85))
	draw_circle(Vector2.ZERO, 9.0, Color("1d1726"))
	draw_circle(Vector2.ZERO, 7.5, Color("ffe45c"))
	draw_circle(Vector2(-2.5, -2.5), 2.5, Color(1, 1, 1, 0.9))
