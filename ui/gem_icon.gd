class_name GemIcon
extends Control
## Little Dream Gem glyph for HUD / menus: filled when collected.

var index := 0
var filled := false:
	set(v):
		filled = v
		queue_redraw()


func _init(p_index := 0, p_filled := false, px := 34.0) -> void:
	index = p_index
	filled = p_filled
	custom_minimum_size = Vector2(px, px)


func _draw() -> void:
	var s := size
	var c := DreamGem.COLORS[index % DreamGem.COLORS.size()]
	var pts := PackedVector2Array([Vector2(s.x * 0.5, 2), Vector2(s.x - 4, s.y * 0.38), Vector2(s.x * 0.5, s.y - 2), Vector2(4, s.y * 0.38)])
	if filled:
		draw_colored_polygon(pts, c)
	else:
		draw_colored_polygon(pts, Color(1, 1, 1, 0.25))
	var closed := pts.duplicate()
	closed.append(pts[0])
	draw_polyline(closed, UIStyle.OUTLINE, 3.0, true)
	if filled:
		draw_line(pts[3].lerp(pts[0], 0.3), pts[3].lerp(pts[2], 0.2), Color(1, 1, 1, 0.7), 2.0)
