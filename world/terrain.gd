@tool
class_name Terrain
extends StaticBody2D
## Freeform ground: any polygon (hills, slopes, overhangs, curvy cliffs).
## Themed like Block: earth fill with a soft inner shade and pebbles, a grassy
## lip on every edge that faces up, and one outline all the way round - so
## there are no seams between pieces. Collision follows the polygon exactly
## (edges steeper than ~45 degrees behave as walls).
## Baked into one mesh (one draw call). Edit `polygon` in the editor's
## inspector, or build it with the level kit (L.land / L.terrain).
## `rounding` rounds off sharp corners (px).

@export var polygon := PackedVector2Array([Vector2(0, 0), Vector2(400, 0), Vector2(400, 300), Vector2(0, 300)]):
	set(v):
		polygon = v
		_rebuild()
@export var rounding := 14.0:
	set(v):
		rounding = v
		_rebuild()
@export var lip := true:
	set(v):
		lip = v
		_rebuild()
@export var seed_value := 1:
	set(v):
		seed_value = v
		_rebuild()
@export var theme_override: LevelTheme:
	set(v):
		theme_override = v
		_rebuild()

const LIP := 14.0
const MIN_UP := 0.55   ## edge normal.y below -this = "faces up" (gets grass)

var _mesh: ArrayMesh
var _col: CollisionPolygon2D
var _shape := PackedVector2Array()


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	_shape = _rounded(polygon, rounding)
	if _signed_area(_shape) < 0.0:
		_shape.reverse()  # one winding everywhere, so outward normals are predictable
	if _col == null:
		_col = CollisionPolygon2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	_col.polygon = _shape
	_mesh = null
	queue_redraw()


func _draw() -> void:
	if _mesh == null:
		_mesh = _bake()
	draw_mesh(_mesh, null)


func _theme() -> LevelTheme:
	return theme_override if theme_override else LevelTheme.find(self)


## Outward normal of edge a->b (for our winding: positive shoelace area).
func _normal(a: Vector2, b: Vector2) -> Vector2:
	return (b - a).normalized().orthogonal()


static func _signed_area(pts: PackedVector2Array) -> float:
	var a := 0.0
	for i in pts.size():
		var p := pts[i]
		var q := pts[(i + 1) % pts.size()]
		a += p.x * q.y - q.x * p.y
	return a * 0.5


func _bake() -> ArrayMesh:
	var th := _theme()
	var mp := MeshPainter.new()
	var pts := _shape
	if pts.size() < 3:
		return mp.build()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	# Fill: dark rim, lighter core (a soft inner shade).
	mp.draw_colored_polygon(pts, th.ground_dark)
	for inner in Geometry2D.offset_polygon(pts, -22.0, Geometry2D.JOIN_ROUND):
		mp.draw_colored_polygon(inner, th.ground)
		# Pebbles / bricks inside the core.
		var box := _bounds(inner)
		var n := int(box.get_area() / 2800.0)
		for i in mini(n, 900):
			var p := Vector2(rng.randf_range(box.position.x, box.end.x), rng.randf_range(box.position.y, box.end.y))
			if not Geometry2D.is_point_in_polygon(p, inner):
				continue
			var r := rng.randf_range(3.0, 7.0)
			mp.draw_colored_polygon(Art.ellipse(p, r * 1.4, r, 10), th.ground_dark)
			mp.draw_colored_polygon(Art.ellipse(p + Vector2(-1, -1), r * 0.6, r * 0.4, 8), th.ground.lightened(0.15))
	# A lighter rim just inside the outline: solid ground reads clearly even
	# against busy or dark backgrounds.
	for rim in Geometry2D.offset_polygon(pts, -6.0, Geometry2D.JOIN_ROUND):
		var rc := rim.duplicate()
		rc.append(rim[0])
		mp.draw_polyline(rc, th.ground.lightened(0.22), 3.0)
	# Outline.
	var closed := pts.duplicate()
	closed.append(pts[0])
	mp.draw_polyline(closed, th.outline, Block.OUTLINE_W)
	# Moss drips under ceilings and overhangs.
	for i in pts.size():
		var a := pts[i]
		var b := pts[(i + 1) % pts.size()]
		if _normal(a, b).y > 0.7:
			var l := a.distance_to(b)
			var k := 0.0
			while k < l:
				var p := a.lerp(b, k / l)
				var h := rng.randf_range(6.0, 22.0)
				mp.draw_colored_polygon(PackedVector2Array([p + Vector2(-5, -2), p + Vector2(5, -2), p + Vector2(0, h)]), th.top_dark)
				k += rng.randf_range(14.0, 34.0)
	# Grass lip on every upward-facing run of edges.
	if lip:
		for run in _up_runs(pts):
			_draw_lip(mp, run, th, rng)
	return mp.build()


## Consecutive upward-facing edges, as polylines.
func _up_runs(pts: PackedVector2Array) -> Array[PackedVector2Array]:
	var runs: Array[PackedVector2Array] = []
	var cur := PackedVector2Array()
	var n := pts.size()
	# Start from an edge that is NOT up-facing so runs don't wrap mid-way.
	var start := 0
	for i in n:
		if _normal(pts[i], pts[(i + 1) % n]).y > -MIN_UP:
			start = (i + 1) % n
			break
	for k in n:
		var i := (start + k) % n
		var a := pts[i]
		var b := pts[(i + 1) % n]
		if _normal(a, b).y <= -MIN_UP:
			if cur.is_empty():
				cur.append(a)
			cur.append(b)
		elif not cur.is_empty():
			runs.append(cur)
			cur = PackedVector2Array()
	if not cur.is_empty():
		runs.append(cur)
	return runs


func _draw_lip(mp: MeshPainter, run: PackedVector2Array, th: LevelTheme, rng: RandomNumberGenerator) -> void:
	# Band hanging below the surface line, with a scalloped lower edge.
	var top := PackedVector2Array()
	var bottom := PackedVector2Array()
	var total := 0.0
	for i in run.size() - 1:
		total += run[i].distance_to(run[i + 1])
	var step := 11.0
	var d := 0.0
	var k := 0
	while d <= total + 0.01:
		var p := _along(run, d)
		var nrm := _along_normal(run, d)
		top.append(p - nrm * 2.0)
		bottom.append(p + nrm * -1.0 * (LIP + (4.0 if k % 2 == 0 else -1.0)) * -1.0)
		d += step
		k += 1
	var band := top.duplicate()
	var rev := bottom.duplicate()
	rev.reverse()
	band.append_array(rev)
	mp.draw_colored_polygon(band, th.top)
	mp.draw_polyline(bottom, th.outline, 2.5)
	var hi := PackedVector2Array()
	for p in top:
		hi.append(p + Vector2(0, 4))
	mp.draw_polyline(hi, th.top.lightened(0.2), 4.0)
	mp.draw_polyline(top, th.outline, 3.0)
	# Tufts poking up.
	var tufts := int(total / 40.0)
	for i in tufts:
		var t := rng.randf_range(8.0, maxf(total - 8.0, 9.0))
		var p := _along(run, t)
		var up := -_along_normal(run, t)
		var side := up.orthogonal()
		var h := rng.randf_range(6, 12)
		mp.draw_colored_polygon(PackedVector2Array([p - side * 5, p + up * h - side * 2, p - up * 2, p + up * h * 0.8 + side * 3, p + side * 5]), th.top_dark)


func _along(run: PackedVector2Array, d: float) -> Vector2:
	for i in run.size() - 1:
		var seg := run[i].distance_to(run[i + 1])
		if d <= seg:
			return run[i].lerp(run[i + 1], d / maxf(seg, 0.001))
		d -= seg
	return run[run.size() - 1]


## Inward normal (pointing into the ground) at distance d along the run.
func _along_normal(run: PackedVector2Array, d: float) -> Vector2:
	for i in run.size() - 1:
		var seg := run[i].distance_to(run[i + 1])
		if d <= seg or i == run.size() - 2:
			return -_normal(run[i], run[i + 1])
		d -= seg
	return Vector2.DOWN


static func _bounds(pts: PackedVector2Array) -> Rect2:
	var r := Rect2(pts[0], Vector2.ZERO)
	for p in pts:
		r = r.expand(p)
	return r


## Round off corners sharper than a few degrees with small arcs.
static func _rounded(pts: PackedVector2Array, r: float) -> PackedVector2Array:
	if r <= 0.5 or pts.size() < 3:
		return pts
	var out := PackedVector2Array()
	var n := pts.size()
	for i in n:
		var p := pts[i]
		var a := pts[(i - 1 + n) % n]
		var b := pts[(i + 1) % n]
		var da := (a - p)
		var db := (b - p)
		var rr := minf(r, minf(da.length(), db.length()) * 0.45)
		if rr < 1.0 or absf(da.normalized().dot(db.normalized())) > 0.985:
			out.append(p)
			continue
		var pa := p + da.normalized() * rr
		var pb := p + db.normalized() * rr
		for k in 5:
			var t := float(k) / 4.0
			out.append(pa.lerp(p, t).lerp(p.lerp(pb, t), t))  # quadratic bezier corner
	return out
