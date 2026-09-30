@tool
class_name Waterfall
extends Node2D
## A curtain of falling water (scenery only - you can climb or walk through it;
## hide secrets behind it!). Streaks rush down, foam churns at the bottom.
## Origin = top-left of the curtain.

@export var size := Vector2(140, 800):
	set(v):
		size = v
		queue_redraw()
@export var tint := Color(0.55, 0.85, 1.0, 0.55)

var _t := 0.0


func _ready() -> void:
	z_index = 8


func _process(delta: float) -> void:
	_t += delta
	View.redraw_rect(self, Rect2(global_position, size))


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), tint)
	draw_rect(Rect2(0, 0, 6, size.y), Color(1, 1, 1, 0.35))
	draw_rect(Rect2(size.x - 6, 0, 6, size.y), Color(1, 1, 1, 0.2))
	# Rushing streaks.
	var cols := int(size.x / 16.0)
	for i in cols:
		var x := 8.0 + i * (size.x - 16.0) / maxf(cols - 1, 1)
		var speed := 600.0 + (i % 3) * 120.0
		var len := 60.0 + (i % 4) * 30.0
		var off := fposmod(_t * speed + i * 97.0, size.y + len) - len
		var y := off
		while y < size.y:
			var a := maxf(y, 0.0)
			var b := minf(y + len, size.y)
			if b > a:
				draw_line(Vector2(x, a), Vector2(x, b), Color(1, 1, 1, 0.45), 3.0)
			y += len * 3.0
	# Foam at the bottom and a lip at the top.
	for k in int(size.x / 18.0) + 2:
		var fx := k * 18.0 - 4.0
		var r := 12.0 + sin(_t * 8.0 + k * 1.7) * 4.0
		draw_circle(Vector2(fx, size.y - 4.0), r, Color(1, 1, 1, 0.85))
		draw_circle(Vector2(fx + 9.0, size.y + 8.0 + sin(_t * 5.0 + k) * 3.0), r * 0.7, Color(1, 1, 1, 0.6))
	draw_rect(Rect2(-6, -6, size.x + 12, 12), Color(1, 1, 1, 0.7))
