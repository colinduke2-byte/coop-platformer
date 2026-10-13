@tool
class_name RecordPad
extends Area2D
## World 7's echo pad. Step on it and your next moves are recorded (a ring over your head
## shows the time left); step on ANY record pad again - or run out of time - and your ghost
## echo walks that route and then stands there, holding a plate or having punched a lever,
## while you get on with something else (`loop` makes it repeat the route instead). One echo per dreamer: a new recording replaces the old. Echoes vanish when
## the team respawns at a checkpoint. Origin = centre of the pad's top surface.

@export var max_time := 8.0
@export var stop_only := false             ## a STOP pad: it only ends a recording (put it on the plate you want an echo to hold)
@export var loop := false                 ## true: the echo repeats its route forever instead of standing at the end
@export var width := 96.0:
	set(v):
		width = v
		queue_redraw()

var _inside := {}   ## Player -> true while they stand on this pad
var _pulse := 0.0
var _t := 0.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2   # players
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width - 8.0, 26.0)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -13)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(delta: float) -> void:
	_t += delta
	if Engine.is_editor_hint():
		queue_redraw()
		return
	var now := {}
	for b in get_overlapping_bodies():
		var p := b as Player
		if p == null or p.is_bubbled():
			continue
		now[p] = true
		if not _inside.has(p):
			_stepped_on(p)
		elif stop_only:
			var rec := p.get_node_or_null("EchoRecorder") as EchoRecorder
			if rec != null and rec.t >= EchoRecorder.MIN_TIME:   # arrived early: stop as soon as the minimum is up
				rec.finish()
	_inside = now
	if _pulse > 0.0:
		_pulse = maxf(_pulse - delta * 2.5, 0.0)
	if View.sees(global_position):
		queue_redraw()


func _stepped_on(p: Player) -> void:
	_pulse = 1.0
	var rec := p.get_node_or_null("EchoRecorder") as EchoRecorder
	if rec == null:
		if stop_only:
			return
		rec = EchoRecorder.new()
		rec.max_time = max_time
		rec.loop = loop
		rec.start_pad = self
		p.add_child(rec)
	elif rec.t >= EchoRecorder.MIN_TIME:
		rec.finish()


func _recording_here() -> bool:
	for p: Player in _inside.keys():
		if is_instance_valid(p) and p.has_node("EchoRecorder"):
			return true
	return false


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var hw := width * 0.5
	var rec := not Engine.is_editor_hint() and _recording_here()
	var col := Color("ff6b6b") if rec else Color("7be0ff")
	Art.shape(self, Art.rounded_rect(Vector2(-hw - 4, -6), Vector2(hw + 4, 0), 3.0), th.ledge_dark, o)
	Art.shape(self, Art.rounded_rect(Vector2(-hw, -14), Vector2(hw, -4), 5.0), th.ground.darkened(0.1), o)
	var glow := 0.55 + 0.25 * sin(_t * 3.0) + _pulse * 0.4
	draw_rect(Rect2(-hw + 8, -12, width - 16, 4), Color(col.r, col.g, col.b, glow))
	# A little record dot + ring on the plate.
	var c := Vector2(0, -9)
	if stop_only:   # a little square: "stop here"
		draw_rect(Rect2(c + Vector2(-6, -28), Vector2(12, 12)), Color(col.r, col.g, col.b, 0.9))
		return
	draw_arc(c + Vector2(0, -22), 11.0, 0.0, TAU, 20, Color(col.r, col.g, col.b, 0.8), 2.5)
	draw_circle(c + Vector2(0, -22), 5.0, col)
