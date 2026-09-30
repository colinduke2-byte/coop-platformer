@tool
class_name Gondola
extends MovingPlatform
## A ski-lift chair on a cable: a MovingPlatform that hangs from a wire strung
## along its path (with pylons at each end). Same settings as MovingPlatform:
## `waypoints` are offsets from the start. Origin = top-left of the seat.

const HANG := 230.0          ## cable height above the seat
const METAL := Color("5d6b82")

var _cable: Node2D


func _ready() -> void:
	super._ready()
	_cable = Cable.new()
	_cable.top_level = true
	_cable.z_index = -2
	add_child(_cable, false, Node.INTERNAL_MODE_FRONT)
	_cable.global_position = Vector2.ZERO
	var pts := PackedVector2Array([_origin_global() + Vector2(size.x * 0.5, -HANG)])
	for w in waypoints:
		pts.append(_origin_global() + w + Vector2(size.x * 0.5, -HANG))
	_cable.points = pts
	_cable.queue_redraw()


func _origin_global() -> Vector2:
	var parent := get_parent() as Node2D
	return parent.to_global(_origin) if parent else _origin


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var mid := size.x * 0.5
	# Hanger: an arm from the pulley down to a bar, two chains to the seat.
	Art.shape(self, Art.rect(Vector2(mid - 5, -HANG), Vector2(mid + 5, -120)), METAL, o, 3.0)
	Art.shape(self, Art.rect(Vector2(8, -128), Vector2(size.x - 8, -114)), METAL, o, 3.0)
	for x: float in [16.0, size.x - 16.0]:
		draw_line(Vector2(x, -114), Vector2(x, 2), o, 4.0)
	Art.shape(self, Art.ellipse(Vector2(mid, -HANG), 16, 16, 14), METAL.lightened(0.2), o, 3.0)
	# Seat: a painted bench with a little roof ridge colour.
	PlatformArt.draw_plank(self, Rect2(Vector2.ZERO, size), th)
	draw_rect(Rect2(4, size.y - 8, size.x - 8, 6), th.accent)
	if Engine.is_editor_hint():
		var pts := PackedVector2Array([size * 0.5])
		for w in waypoints:
			pts.append(w + size * 0.5)
		Art.dotted(self, pts, Color(1, 1, 1, 0.8), 18.0, 4.0)


## The wire and its pylons (drawn once, in world space).
class Cable extends Node2D:
	var points := PackedVector2Array()

	func _draw() -> void:
		if points.size() < 2:
			return
		var o := Color("1b2a44")
		for p in [points[0], points[points.size() - 1]]:
			# Pylon: a lattice tower down to well below the cable.
			var top: Vector2 = p + Vector2(0, -24)
			Art.shape(self, PackedVector2Array([top + Vector2(-10, 0), top + Vector2(10, 0), top + Vector2(34, 900),
					top + Vector2(-34, 900)]), Color("7d8aa0"), o, 3.0)
			for k in 8:
				var y := 40.0 + k * 100.0
				var hw := 10.0 + 24.0 * y / 900.0
				draw_line(top + Vector2(-hw, y), top + Vector2(hw, y + 60.0), o, 2.5)
			Art.shape(self, Art.rect(top + Vector2(-44, -8), top + Vector2(44, 8)), Color("5d6b82"), o, 3.0)
		draw_polyline(points, o, 4.0)
