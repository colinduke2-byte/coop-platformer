@tool
class_name LogRaft
extends AnimatableBody2D
## A raft of logs floating on water, drifting with the current. It bobs and
## dips under riders. When it reaches `travel` px downstream it sinks and
## reappears at the start (put several in a row for a river crossing).
## Origin = top-centre of the raft; place it on the water surface.

@export var width := 180.0:
	set(v):
		width = v
		_rebuild()
@export var travel := 1200.0                ## px downstream before it recycles (0 = stays put)
@export var current := 110.0                ## px/s (negative = flows left)
@export_range(0.0, 1.0) var start_offset := 0.0  ## 0..1 along the route (desync rafts)

const LOG := Color("8a5a36")
const LOG_END := Color("d8b27a")
const ROPE := Color("c9b27a")

var _home := Vector2.ZERO
var _dist := 0.0
var _t := 0.0
var _dip := 0.0
var _fade := 1.0
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = false
	z_index = 16  # above the water's tint (water is 15)
	_home = position
	_dist = start_offset * travel
	_t = start_offset * 10.0
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width, 20)
	_col.shape = shape
	_col.position = Vector2(0, 10)
	queue_redraw()


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	_t += delta
	var ridden := false
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_on_floor() and absf(p.global_position.y - global_position.y) < 6.0 and absf(p.global_position.x - global_position.x) < width * 0.5 + 6.0:
			ridden = true
			break
	_dip = move_toward(_dip, 10.0 if ridden else 0.0, delta * 60.0)
	if travel > 0.0:
		_dist += absf(current) * delta
		if _dist >= travel:
			_dist = 0.0
		# Fade out over the last stretch, fade in at the start.
		_fade = clampf(minf(_dist / 60.0, (travel - _dist) / 80.0), 0.0, 1.0)
		modulate.a = _fade
		_col.disabled = _fade < 0.3
	position = _home + Vector2(signf(current) * _dist, sin(_t * 2.0) * 3.0 + _dip + (1.0 - _fade) * 30.0)
	rotation = sin(_t * 1.6) * 0.03
	View.redraw(self)


func _draw() -> void:
	var o := Color("1d1726")
	var hw := width * 0.5
	var n := maxi(int(width / 36.0), 2)
	var d := width / n
	for i in n:
		var cx := -hw + d * (i + 0.5)
		Art.shape(self, Art.rounded_rect(Vector2(cx - d * 0.5 + 1, 0), Vector2(cx + d * 0.5 - 1, 24), 10.0), LOG.darkened(0.06 * (i % 2)), o, 2.5)
		Art.shape(self, Art.ellipse(Vector2(cx, 2), d * 0.4, 5, 12), LOG_END, o, 1.5)
	for x: float in [-hw * 0.6, hw * 0.6]:
		draw_line(Vector2(x, 0), Vector2(x, 24), ROPE, 4.0)
	# Water lapping at the sides.
	for s: float in [-1.0, 1.0]:
		draw_arc(Vector2(s * (hw + 8), 18), 8.0, PI, TAU, 8, Color(1, 1, 1, 0.7), 2.5)
