@tool
class_name ZapArc
extends Node2D
## ZAP ARC: two copper posts that crackle (the tell - little sparks), then
## shoot a bolt of electricity between them for a moment. Cross while it's
## off! `end` is the second post relative to the first (origin = post A's
## tip). `phase` 0..1 offsets the cycle so a row of arcs can ripple.

@export var end := Vector2(0, -200):
	set(v):
		end = v
		queue_redraw()
@export var on_time := 1.0
@export var off_time := 1.6
@export var warn_time := 0.5
@export_range(0.0, 1.0) var phase := 0.0

const BOLT := Color("aef6ff")
const GLOW := Color(0.5, 0.95, 1.0, 0.35)
const HIT_RADIUS := 26.0

var _t := 0.0
var _hit := {}


func _ready() -> void:
	_t = phase * (on_time + off_time)


func is_on() -> bool:
	return fmod(_t, on_time + off_time) >= off_time


func _warning() -> bool:
	var c := fmod(_t, on_time + off_time)
	return c < off_time and c >= off_time - warn_time


func _physics_process(delta: float) -> void:
	var was := is_on()
	_t += delta
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	if is_on() and not was:
		_hit.clear()
		Audio.play("clank", -10.0, 2.2)
	if not is_on():
		return
	var a := global_position
	var b := global_position + end
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_bubbled() or _hit.has(p):
			continue
		var c := p.global_position + Vector2(0, -32)
		var q := Geometry2D.get_closest_point_to_segment(c, a, b)
		if c.distance_to(q) < HIT_RADIUS:
			_hit[p] = true
			p.hurt()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	for p: Vector2 in [Vector2.ZERO, end]:  # the two posts (copper coils with a ball tip)
		var dir := (end - Vector2.ZERO).normalized() * (1.0 if p == Vector2.ZERO else -1.0)
		var base := p - dir * 46.0
		draw_line(base, p, o, 14.0)
		draw_line(base, p, th.ledge, 9.0)
		for k in 3:
			var q := base.lerp(p, 0.25 + k * 0.25)
			var n := dir.orthogonal() * 9.0
			draw_line(q - n, q + n, th.ledge_dark, 3.0)
		Art.shape(self, Art.ellipse(p, 9, 9, 12), th.top, o, 2.0)
	if is_on() or Engine.is_editor_hint():
		var pts := PackedVector2Array()
		var n := 10
		var side := end.orthogonal().normalized()
		var seedv := int(_t * 30.0)
		for i in n + 1:
			var t := float(i) / n
			var j := 0.0 if i == 0 or i == n else (fposmod(sin(float(i * 37 + seedv) * 12.9898) * 43758.5453, 1.0) - 0.5) * 30.0
			pts.append(end * t + side * j)
		draw_polyline(pts, GLOW, 18.0)
		draw_polyline(pts, BOLT, 5.0)
		draw_polyline(pts, Color.WHITE, 2.0)
	elif _warning():
		for p: Vector2 in [Vector2.ZERO, end]:
			for k in 3:
				var a := _t * 20.0 + k * 2.1
				draw_line(p, p + Vector2(cos(a), sin(a)) * 14.0, BOLT, 2.0)
