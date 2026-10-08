class_name MeshPainter
extends RefCounted
## Records CanvasItem-style draw calls (draw_rect, draw_colored_polygon,
## draw_polyline, draw_line, draw_circle) into ONE vertex-coloured ArrayMesh.
## Static art drawn through a MeshPainter costs a single draw call instead of
## one per shape. Lines get a 1 px soft edge so they stay smooth without MSAA.
##
##   var mp := MeshPainter.new()
##   Block.draw_ground(mp, size, theme)   # anything that takes a "canvas"
##   _mesh = mp.build()
##   ...in _draw(): draw_mesh(_mesh, null)

const FEATHER := 1.0     ## px of alpha fade on line edges (anti-aliasing)
const JOINT_SEGMENTS := 6

var _verts := PackedVector2Array()
var _colors := PackedColorArray()


func is_empty() -> bool:
	return _verts.is_empty()


func build() -> ArrayMesh:
	var mesh := ArrayMesh.new()
	if _verts.is_empty():
		return mesh
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = _verts
	arrays[Mesh.ARRAY_COLOR] = _colors
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


# --- CanvasItem-compatible API ------------------------------------------------------

func draw_rect(rect: Rect2, color: Color, filled := true, width := -1.0, _antialiased := false) -> void:
	if filled:
		_quad(rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y), color)
	else:
		var w := maxf(width, 1.0)
		var p := rect.position
		var e := rect.end
		draw_polyline(PackedVector2Array([p, Vector2(e.x, p.y), e, Vector2(p.x, e.y), p]), color, w)


func draw_colored_polygon(points: PackedVector2Array, color: Color, _uvs := PackedVector2Array(), _texture: Texture2D = null) -> void:
	if points.size() < 3:
		return
	var idx := Geometry2D.triangulate_polygon(points)
	if idx.is_empty():  # self-intersecting: fall back to a fan
		for i in range(1, points.size() - 1):
			_tri(points[0], points[i], points[i + 1], color)
		return
	for i in range(0, idx.size(), 3):
		_tri(points[idx[i]], points[idx[i + 1]], points[idx[i + 2]], color)


## Vertical gradient rectangle: `top` colour at the top edge fading to `bottom` at the bottom edge.
func draw_vgradient(rect: Rect2, top: Color, bottom: Color) -> void:
	_quad_c(rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y), top, bottom)


func draw_polygon(points: PackedVector2Array, colors: PackedColorArray, _uvs := PackedVector2Array(), _texture: Texture2D = null) -> void:
	draw_colored_polygon(points, colors[0] if colors.size() > 0 else Color.WHITE)


func draw_circle(center: Vector2, radius: float, color: Color, filled := true, width := -1.0, _antialiased := false) -> void:
	var n := clampi(int(radius * 0.8), 10, 28)
	var pts := PackedVector2Array()
	for i in n:
		var a := TAU * float(i) / float(n)
		pts.append(center + Vector2(cos(a), sin(a)) * radius)
	if filled:
		for i in n:
			_tri(center, pts[i], pts[(i + 1) % n], color)
		_feather_loop(pts, center, color)
	else:
		pts.append(pts[0])
		draw_polyline(pts, color, maxf(width, 1.0))


func draw_arc(center: Vector2, radius: float, start_angle: float, end_angle: float, point_count: int, color: Color, width := -1.0, _antialiased := false) -> void:
	var pts := PackedVector2Array()
	for i in point_count + 1:
		var a := lerpf(start_angle, end_angle, float(i) / maxi(point_count, 1))
		pts.append(center + Vector2(cos(a), sin(a)) * radius)
	draw_polyline(pts, color, width)


func draw_line(a: Vector2, b: Vector2, color: Color, width := -1.0, _antialiased := false) -> void:
	draw_polyline(PackedVector2Array([a, b]), color, width)


func draw_polyline(points: PackedVector2Array, color: Color, width := -1.0, _antialiased := false) -> void:
	var w := maxf(width, 1.0)
	var h := w * 0.5
	var clear := Color(color, 0.0)
	for i in points.size() - 1:
		var a := points[i]
		var b := points[i + 1]
		if a.is_equal_approx(b):
			continue
		var n := (b - a).normalized().orthogonal()
		_quad(a + n * h, b + n * h, b - n * h, a - n * h, color)
		# Soft edges.
		_quad_c(a + n * h, b + n * h, b + n * (h + FEATHER), a + n * (h + FEATHER), color, clear)
		_quad_c(a - n * h, b - n * h, b - n * (h + FEATHER), a - n * (h + FEATHER), color, clear)
	# Round joints (and caps) so thick corners have no notches.
	if w >= 2.5:
		for i in points.size():
			if i == 0 or i == points.size() - 1 or not points[i].is_equal_approx(points[i - 1]):
				_disc(points[i], h, color)


## Hand-inked outline: a line whose width swells on the shadow side (edges facing
## down get `w_max`, edges facing up `w_min`) and wobbles gently along its length,
## instead of one uniform stroke. `points` should wind so that
## (b - a).normalized().orthogonal() points OUTWARD (Terrain's winding; Block's
## clockwise rects). Long edges are subdivided so the width can vary along them.
func draw_ink(points: PackedVector2Array, color: Color, closed := true, w_min := 2.2, w_max := 5.0, seed_value := 0) -> void:
	var pts := PackedVector2Array()
	var n0 := points.size()
	if n0 < 2:
		return
	var segs := n0 if closed else n0 - 1
	for i in segs:
		var a := points[i]
		var b := points[(i + 1) % n0]
		var steps := maxi(int(a.distance_to(b) / 36.0), 1)
		for k in steps:
			pts.append(a.lerp(b, float(k) / steps))
	if not closed:
		pts.append(points[n0 - 1])
	var n := pts.size()
	var ph := float(seed_value % 997) * 0.37
	var along := 0.0
	var offs_a := PackedVector2Array()
	var offs_b := PackedVector2Array()
	for i in n:
		var prev := pts[(i - 1 + n) % n] if (closed or i > 0) else pts[i]
		var next := pts[(i + 1) % n] if (closed or i < n - 1) else pts[i]
		var n1 := (pts[i] - prev).normalized().orthogonal() if prev != pts[i] else Vector2.ZERO
		var n2 := (next - pts[i]).normalized().orthogonal() if next != pts[i] else Vector2.ZERO
		var nv := (n1 + n2).normalized() if (n1 + n2).length() > 0.01 else (n1 if n1 != Vector2.ZERO else n2)
		var miter := 1.0 / maxf(nv.dot(n1 if n1 != Vector2.ZERO else n2), 0.55)
		if i > 0:
			along += pts[i].distance_to(pts[i - 1])
		var wobble := 0.5 + 0.3 * sin(along * 0.043 + ph) + 0.2 * sin(along * 0.117 + ph * 2.3)
		var shade := clampf(0.5 + 0.7 * nv.y, 0.0, 1.0)
		var w := lerpf(w_min, w_max, shade) * (0.8 + 0.4 * wobble)
		offs_a.append(pts[i] + nv * (w * 0.5) * miter)
		offs_b.append(pts[i] - nv * (w * 0.5) * miter)
	var clear := Color(color, 0.0)
	var last := n if closed else n - 1
	for i in last:
		var j := (i + 1) % n
		_quad(offs_a[i], offs_a[j], offs_b[j], offs_b[i], color)
		var oa := (offs_a[i] - pts[i]).normalized() * FEATHER
		var ob := (offs_a[j] - pts[j]).normalized() * FEATHER
		_quad_c(offs_a[i], offs_a[j], offs_a[j] + ob, offs_a[i] + oa, color, clear)
		var pa := (offs_b[i] - pts[i]).normalized() * FEATHER
		var pb := (offs_b[j] - pts[j]).normalized() * FEATHER
		_quad_c(offs_b[i], offs_b[j], offs_b[j] + pb, offs_b[i] + pa, color, clear)


# --- internals ----------------------------------------------------------------------

func _tri(a: Vector2, b: Vector2, c: Vector2, color: Color) -> void:
	_verts.append_array([a, b, c])
	_colors.append_array([color, color, color])


func _quad(a: Vector2, b: Vector2, c: Vector2, d: Vector2, color: Color) -> void:
	_tri(a, b, c, color)
	_tri(a, c, d, color)


## Quad with colour ca on the a-b edge fading to cb on the c-d edge.
func _quad_c(a: Vector2, b: Vector2, c: Vector2, d: Vector2, ca: Color, cb: Color) -> void:
	_verts.append_array([a, b, c, a, c, d])
	_colors.append_array([ca, ca, cb, ca, cb, cb])


func _disc(c: Vector2, r: float, color: Color) -> void:
	var prev := c + Vector2(r, 0)
	for i in range(1, JOINT_SEGMENTS + 1):
		var a := TAU * float(i) / JOINT_SEGMENTS
		var p := c + Vector2(cos(a), sin(a)) * r
		_tri(c, prev, p, color)
		prev = p


## A 1 px fade ring around a convex outline (for filled circles).
func _feather_loop(pts: PackedVector2Array, center: Vector2, color: Color) -> void:
	var clear := Color(color, 0.0)
	for i in pts.size():
		var a := pts[i]
		var b := pts[(i + 1) % pts.size()]
		_quad_c(a, b, b + (b - center).normalized() * FEATHER, a + (a - center).normalized() * FEATHER, color, clear)
