@tool
class_name Water
extends Area2D
## Swimmable water (see the Swim state). Origin = top-left of the surface.
## Drawn in front of players, see-through, with a wavy animated surface.
## Also great for soft landings: falling in never hurts.

@export var size := Vector2(600, 400):
	set(v):
		size = v
		_rebuild()
@export var tint := Color(0.25, 0.6, 0.95, 0.45)
@export var current := Vector2.ZERO         ## px/s push (rivers, whirlpools)

var _t := 0.0
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	z_index = 15
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size + Vector2(0, 20)
	_col.shape = shape
	_col.position = size * 0.5 - Vector2(0, 10)
	queue_redraw()


func surface_y() -> float:
	return global_position.y


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw_rect(self, Rect2(global_position, size))
	if Engine.is_editor_hint():
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p:
			p.touch_water(self)
			if current != Vector2.ZERO and p.state_machine.current_name() == &"Swim":
				p.wind_push += current


func _draw() -> void:
	var pts := PackedVector2Array()
	var n := maxi(int(size.x / 24.0), 2)
	for i in n + 1:
		var x := size.x * i / n
		pts.append(Vector2(x, sin(x * 0.03 + _t * 2.5) * 4.0))
	var body := pts.duplicate()
	body.append(Vector2(size.x, size.y))
	body.append(Vector2(0, size.y))
	draw_colored_polygon(body, tint)
	draw_rect(Rect2(0, size.y * 0.5, size.x, size.y * 0.5), Color(tint.darkened(0.3), tint.a * 0.5))
	draw_polyline(pts, Color(1, 1, 1, 0.8), 4.0)
	if Gfx.at_least(Gfx.Level.MEDIUM):
		_draw_light(pts)
	# Rising bubbles.
	for i in int(size.x / 80.0):
		var bx := fmod(i * 97.0, size.x)
		var by := size.y - fmod(_t * 40.0 + i * 53.0, size.y)
		draw_arc(Vector2(bx + sin(_t * 3.0 + i) * 4.0, by), 4.0, 0, TAU, 10, Color(1, 1, 1, 0.5), 1.5)


## Painterly water: a soft bright band under the surface, and drifting caustic streaks
## of light that fade with depth.
func _draw_light(surface: PackedVector2Array) -> void:
	var band := PackedVector2Array()
	for p in surface:
		band.append(p + Vector2(0, 5))
	for i in range(surface.size() - 1, -1, -1):
		band.append(surface[i] + Vector2(0, minf(34.0, size.y * 0.4)))
	draw_colored_polygon(band, Color(1, 1, 1, 0.1))
	var depth := minf(size.y, 360.0)
	var streaks := int(size.x / 70.0)
	for i in streaks:
		var phase := _t * 0.35 + i * 0.61
		var x := fposmod(i * 211.0 + sin(phase * 2.0) * 30.0 + _t * 14.0, size.x)
		var top := 14.0 + fposmod(i * 37.0, 60.0)
		var len := minf(depth - top, 90.0 + fposmod(i * 53.0, 140.0))
		var a := 0.12 * (0.6 + 0.4 * sin(phase * 3.0))
		var w := 5.0 + fposmod(i * 17.0, 9.0)
		draw_colored_polygon(PackedVector2Array([Vector2(x - w, top), Vector2(x + w, top),
				Vector2(x + w * 0.2 + 20.0, top + len), Vector2(x - w * 0.2 + 20.0, top + len)]), Color(1, 1, 1, a))
