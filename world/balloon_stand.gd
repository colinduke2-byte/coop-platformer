@tool
class_name BalloonStand
extends Area2D
## A post with a floaty balloon tied to it. Touch it to grab the balloon and
## drift upward for a few seconds (steer left/right; ATTACK pops it early).
## A new balloon grows back after `regrow` seconds. Origin = bottom of the post.

@export var regrow := 2.0
@export var tint := Color(0, 0, 0, 0)       ## transparent = cycle through theme flower colours

var _ready_balloon := true
var _t := 0.0
var _held := {}  ## Player -> Node2D (the balloon drawn above them)


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(70, 160)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -80)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	if not Engine.is_editor_hint():
		EventBus.balloon_changed.connect(_on_balloon_changed)


func _physics_process(delta: float) -> void:
	_t += delta
	queue_redraw()
	if Engine.is_editor_hint() or not _ready_balloon:
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p and not p.is_bubbled() and p.balloon_timer <= 0.0:
			_ready_balloon = false
			p.take_balloon()
			var bal := _Floaty.new()
			bal.color = _color()
			bal.player = p
			p.add_child(bal)
			_held[p] = bal
			get_tree().create_timer(regrow).timeout.connect(func() -> void: _ready_balloon = true)
			break


func _on_balloon_changed(p: Player, holding: bool) -> void:
	if not holding and _held.has(p):
		var bal: Node2D = _held[p]
		_held.erase(p)
		if is_instance_valid(bal):
			Vfx.puff(bal.global_position, 8, bal.color, Vector2.UP, TAU, Vector2(20, 50))
			Audio.play("bubble", -4.0, 1.4)
			bal.queue_free()


func _color() -> Color:
	if tint.a > 0.0:
		return tint
	var th := LevelTheme.find(self)
	return th.flower_colors[int(global_position.x) % th.flower_colors.size()] if th.flower_colors.size() > 0 else th.accent


func _draw() -> void:
	var th := LevelTheme.find(self)
	Art.shape(self, Art.rect(Vector2(-5, -90), Vector2(5, 0)), Color("8a5a3a"), th.outline, 3.0)
	if _ready_balloon or Engine.is_editor_hint():
		var c := Vector2(sin(_t * 1.5) * 6.0, -150)
		draw_line(Vector2(0, -90), c + Vector2(0, 30), th.outline, 2.0)
		Art.shape(self, Art.ellipse(c, 28, 34, 20), _color(), th.outline, 3.0)
		draw_circle(c + Vector2(-9, -12), 7.0, Color(1, 1, 1, 0.6))


## The balloon bobbing above a player who holds one.
class _Floaty extends Node2D:
	var color := Color.WHITE
	var player: Player
	var _t := 0.0

	func _process(delta: float) -> void:
		_t += delta
		position = Vector2(sin(_t * 2.0) * 6.0, -150)
		queue_redraw()

	func _draw() -> void:
		draw_line(Vector2(0, 30), Vector2(0, 80), Color("1d1726"), 2.0)
		Art.shape(self, Art.ellipse(Vector2.ZERO, 28, 34, 20), color, Color("1d1726"), 3.0)
		draw_circle(Vector2(-9, -12), 7.0, Color(1, 1, 1, 0.6))
