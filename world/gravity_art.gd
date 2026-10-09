class_name GravityArt
extends RefCounted
## Shared drawing for World 6's gravity pieces: the glowing arrow chevrons that tell you
## which way things will fall. dir = +1 (down the screen) or -1 (up).

const DOWN := Color("ffd24a")   ## normal gravity: warm amber
const UP := Color("7fd8ff")     ## flipped: cool cyan


static func color_for(dir: int) -> Color:
	return DOWN if dir >= 0 else UP


## A solid arrow head pointing the way gravity pulls.
static func arrow(ci: CanvasItem, c: Vector2, dir: int, size: float, color: Color, outline: Color) -> void:
	var d := float(dir)
	var pts := PackedVector2Array([c + Vector2(0, size * 0.9 * d), c + Vector2(-size, -size * 0.5 * d), c + Vector2(0, -size * 0.1 * d), c + Vector2(size, -size * 0.5 * d)])
	ci.draw_colored_polygon(pts, color)
	var closed := PackedVector2Array(pts)
	closed.append(pts[0])
	ci.draw_polyline(closed, outline, 2.0)
