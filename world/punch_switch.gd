@tool
class_name PunchSwitch
extends Area2D
## Big button on a post: punch it (or ground pound / slide into it) to flip it.
## Wire `targets` to anything with set_active() (gates, moving platforms...).
## Origin = bottom of the post.

signal toggled(on: bool)

enum Mode { TOGGLE, ONCE, TIMED }

@export var targets: Array[NodePath] = []:
	set(v):
		targets = v
		queue_redraw()
@export var mode := Mode.ONCE
@export var timed_duration := 5.0           ## TIMED: s before it flips back off
@export var on := false:
	set(v):
		on = v
		queue_redraw()

var _timer := 0.0
var _bump := 0.0


func _ready() -> void:
	collision_layer = 4   # punchable (the punch hitbox scans the enemies layer)
	collision_mask = 0
	monitoring = false
	# Tall hitbox (post + button) so any normal punch connects.
	var shape := RectangleShape2D.new()
	shape.size = Vector2(56, 100)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -50)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	if not Engine.is_editor_hint() and on:
		Activation.send.call_deferred(self, targets, true)


## Called by punches, slides and ground pounds.
func take_hit(_by: Player, _knockback: Vector2) -> void:
	_bump = 1.0
	if mode == Mode.ONCE and on:
		return
	var new_on := not on if mode == Mode.TOGGLE else true
	_switch_to(new_on)
	if mode == Mode.TIMED:
		_timer = timed_duration


func _switch_to(value: bool) -> void:
	on = value
	Activation.send(self, targets, on)
	toggled.emit(on)


func _physics_process(delta: float) -> void:
	if _bump > 0.0:
		_bump = maxf(_bump - delta * 5.0, 0.0)
		queue_redraw()
	if Engine.is_editor_hint():
		queue_redraw()
		return
	if _timer > 0.0:
		_timer -= delta
		queue_redraw()
		if _timer <= 0.0:
			_switch_to(false)


func _draw() -> void:
	var th := LevelTheme.find(self)
	Art.shape(self, Art.rect(Vector2(-6, -48), Vector2(6, 0)), th.ledge_dark, th.outline)
	Art.shape(self, Art.rounded_rect(Vector2(-22, -8), Vector2(22, 0), 3.0), th.ledge_dark, th.outline)
	var c := Color("5fd35a") if on else th.accent
	var push := Vector2(-6.0 * _bump, 0)
	Art.shape(self, Art.ellipse(Vector2(0, -70) + push, 26, 26), th.outline, th.outline)
	Art.shape(self, Art.ellipse(Vector2(0, -70) + push, 20, 20), c, th.outline, 2.0)
	draw_circle(Vector2(-6, -77) + push, 6.0, Color(1, 1, 1, 0.55))
	if mode == Mode.TIMED and _timer > 0.0:
		draw_arc(Vector2(0, -70), 32.0, -PI * 0.5, -PI * 0.5 + TAU * _timer / timed_duration, 24, Color.WHITE, 4.0)
	Activation.draw_links(self, targets)
