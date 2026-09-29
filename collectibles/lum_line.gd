@tool
class_name LumLine
extends Node2D
## Level-building helper: places `count` Lums from here to `end` (local),
## optionally bowed into an arc (`arc_height`, + = up). Great for tracing jump
## arcs, swing paths and secret routes. Previews as dots in the editor.

const LUM_SCENE := preload("res://collectibles/lum.tscn")

@export var count := 5:
	set(v):
		count = maxi(v, 1)
		queue_redraw()
@export var end := Vector2(300, 0):
	set(v):
		end = v
		queue_redraw()
@export var arc_height := 0.0:
	set(v):
		arc_height = v
		queue_redraw()


func points() -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in count:
		var t := float(i) / maxf(count - 1, 1)
		pts.append(end * t + Vector2(0, -arc_height * 4.0 * t * (1.0 - t)))
	return pts


func _ready() -> void:
	if Engine.is_editor_hint():
		return
	for p in points():
		var lum: Node2D = LUM_SCENE.instantiate()
		lum.position = p
		add_child(lum)


func _draw() -> void:
	if not Engine.is_editor_hint():
		return
	for p in points():
		draw_circle(p, 9.0, Color("ffe45c"))
		draw_arc(p, 9.0, 0, TAU, 16, Color("2b2233"), 2.0)
