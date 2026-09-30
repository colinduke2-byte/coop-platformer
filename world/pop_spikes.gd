@tool
class_name PopSpikes
extends Spikes
## Spikes that pop up and sink back on a timer (they rattle just before they
## pop). Safe to cross while they're down. `phase` ripples a row of them.

@export var up_time := 1.0
@export var down_time := 1.4
@export var warn_time := 0.35
@export_range(0.0, 1.0) var phase := 0.0

var _t := 0.0
var _ext := 1.0


func _ready() -> void:
	_t = phase * (up_time + down_time)
	_ext = 1.0 if is_up() else 0.0
	super()


func is_up() -> bool:
	return fmod(_t, up_time + down_time) < up_time


func _physics_process(delta: float) -> void:
	_t += delta
	var target := 1.0 if is_up() else 0.0
	_ext = move_toward(_ext, target, delta * 10.0)
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	if _ext > 0.6:
		super(delta)


func _on_body_entered(body: Node2D) -> void:
	if _ext > 0.6:
		super(body)


func _draw() -> void:
	var c := fmod(_t, up_time + down_time)
	var rattle := sin(_t * 60.0) * 2.0 if (not is_up() and c > up_time + down_time - warn_time) else 0.0
	draw_set_transform(Vector2(rattle, HEIGHT * (1.0 - _ext)), 0.0, Vector2(1.0, maxf(_ext, 0.15)))
	super()
	draw_set_transform(Vector2.ZERO)
