@tool
class_name Bumper
extends Area2D
## Pinball bumper: touch it and you're knocked away from its centre at
## `bounce_speed`. Great for bouncing through the air and silly chaos.

@export var radius := 36.0:
	set(v):
		radius = v
		queue_redraw()
@export var bounce_speed := 900.0

var _hit := 0.0
var _cd := {}


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	var shape := CircleShape2D.new()
	shape.radius = radius + 6.0
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(delta: float) -> void:
	if _hit > 0.0:
		_hit = maxf(_hit - delta * 5.0, 0.0)
		queue_redraw()
	if Engine.is_editor_hint():
		return
	for p in _cd.keys():
		_cd[p] -= delta
		if _cd[p] <= 0.0:
			_cd.erase(p)
	for b in get_overlapping_bodies():
		var p := b as Player
		if p == null or p.is_bubbled() or _cd.has(p):
			continue
		var dir := (p.global_position + Vector2(0, -30) - global_position).normalized()
		if dir.y > -0.25:
			dir.y -= 0.35  # always pop a little upward
			dir = dir.normalized()
		p.launch_world(dir * bounce_speed, 0.2)
		_cd[p] = 0.15
		_hit = 1.0
		EventBus.pad_bounced.emit(p, self, false)
		_on_bounced(p)


## Hook for subclasses (FlipBumper flips gravity here).
func _on_bounced(_p: Player) -> void:
	pass


func _draw() -> void:
	var th := LevelTheme.find(self)
	var s := 1.0 + 0.2 * _hit
	Art.shape(self, Art.ellipse(Vector2.ZERO, radius * s, radius * s, 28), th.outline, th.outline)
	Art.shape(self, Art.ellipse(Vector2.ZERO, radius * 0.85 * s, radius * 0.85 * s, 28), th.accent, th.outline, 0.0)
	Art.shape(self, Art.ellipse(Vector2.ZERO, radius * 0.5 * s, radius * 0.5 * s, 24), Color.WHITE if _hit > 0.3 else th.accent.lightened(0.4), th.outline, 3.0)
	draw_circle(Vector2(-radius * 0.35, -radius * 0.35) * s, radius * 0.15, Color(1, 1, 1, 0.7))
