@tool
class_name SwingRing
extends Area2D
## Flower ring you grab in midair (just fly into it) and swing from. See the
## Swing player state for controls. Put several in a row for swing chains.
## Works on moving parents too (put it under a MovingPlatform or Path).

const RADIUS := 44.0   ## grab radius around the ring
const DRAW_R := 16.0

@export var tint := Color(0, 0, 0, 0)  ## transparent = theme accent

var _spin := 0.0
var _ropes := {}  ## Player -> Line2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	var shape := CircleShape2D.new()
	shape.radius = RADIUS
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(delta: float) -> void:
	_spin += delta
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	for body in get_overlapping_bodies():
		var p := body as Player
		if p and not p.is_bubbled() and p.can_grab_swing():
			p.grab_swing(self)


func _process(_delta: float) -> void:
	if Engine.is_editor_hint():
		return
	# Draw an arm-rope from the ring to each swinger's hands.
	for p in get_tree().get_nodes_in_group(&"players"):
		var pl := p as Player
		var swinging := pl.swing_anchor == self and pl.state_machine.current_name() == &"Swing"
		if swinging and not _ropes.has(pl):
			var l := Line2D.new()
			l.width = 5.0
			l.default_color = LevelTheme.find(self).outline
			add_child(l)
			_ropes[pl] = l
		elif not swinging and _ropes.has(pl):
			_ropes[pl].queue_free()
			_ropes.erase(pl)
		if swinging:
			_ropes[pl].points = PackedVector2Array([Vector2.ZERO, to_local(pl.global_position + Player.GRIP_OFFSET)])


func _draw() -> void:
	var th := LevelTheme.find(self)
	var c := th.accent if tint.a == 0.0 else tint
	var wob := sin(_spin * 3.0) * 0.12
	# Petals round a ring.
	for i in 6:
		var a := TAU * float(i) / 6.0 + wob
		Art.shape(self, Art.ellipse(Vector2.from_angle(a) * DRAW_R * 1.25, 9, 9, 12), c.lightened(0.25), th.outline, 2.0)
	draw_arc(Vector2.ZERO, DRAW_R, 0, TAU, 28, th.outline, 9.0, true)
	draw_arc(Vector2.ZERO, DRAW_R, 0, TAU, 28, th.sun.lerp(Color.WHITE, 0.3), 5.0, true)
	if Engine.is_editor_hint():
		draw_arc(Vector2.ZERO, RADIUS, 0, TAU, 32, Color(1, 1, 1, 0.3), 1.0)
