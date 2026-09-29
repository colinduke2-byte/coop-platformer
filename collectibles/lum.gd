class_name Lum
extends Area2D
## Collectible (Rayman's Lums, your own thing later). Bobs, pops on touch.

@export var bob_height := 6.0
@export var bob_speed := 3.0

var _t := 0.0
var _base_y := 0.0


func _ready() -> void:
	_base_y = position.y
	_t = randf() * TAU
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	_t += delta * bob_speed
	position.y = _base_y + sin(_t) * bob_height


func _on_body_entered(body: Node2D) -> void:
	if not body is Player or body.is_bubbled():
		return
	EventBus.lum_collected.emit(body.slot, global_position)
	set_deferred(&"monitoring", false)
	var tw := create_tween()
	tw.tween_property(self, ^"scale", Vector2(1.8, 1.8), 0.08)
	tw.parallel().tween_property(self, ^"modulate:a", 0.0, 0.12)
	tw.tween_callback(queue_free)
