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
@export var slippery := false:               ## ice: low grip (PlayerTuning.ice_friction), glassy blue top
	set(v):
		slippery = v
		_rebuild()
@export var theme_override: LevelTheme:
	set(v):
		theme_override = v
		_rebuild()

const LIP := 14.0
const ICE := Color("bfe9ff")
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
	# Collision rounds only the outside (convex) corners. A rounded INSIDE corner - the foot
	# of a cliff - is a little ramp too steep to stand on: bodies pressed into it got stuck
	# wall-sliding a few px above the floor.
	_col.polygon = _rounded(polygon, rounding, true)
	_mesh = null
	queue_redraw()


func _draw() -> void:
	if _mesh == null:
		_mesh = _bake()
		var th := _theme()
		material = PaintedSurface.material(th.surface_texture(), th.surface_strength())
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
		var box := _bounds(inner)
		if th.pattern == 0:
			# Bark: long wavy grain lines.
			var x := box.position.x + rng.randf_range(6, 20)
			while x < box.end.x:
				var pts2 := PackedVector2Array()
				var y := box.position.y
				while y < box.end.y:
					var q := Vector2(x + sin(y * 0.02 + x) * 4.0, y)
					if Geometry2D.is_point_in_polygon(q, inner):
						pts2.append(q)
					elif pts2.size() > 1:
						mp.draw_polyline(pts2, th.ground_dark, 2.5)
						pts2 = PackedVector2Array()
					else:
						pts2 = PackedVector2Array()
					y += 18.0
				if pts2.size() > 1:
					mp.draw_polyline(pts2, th.ground_dark, 2.5)
				x += rng.randf_range(22, 40)
			continue
		if th.pattern == 2:
			# Stone blocks (same look as Block's brick pattern), only where they fit inside.
			var bh := 26.0
			var bw := 52.0
			var row := 0
			var y := box.position.y + 4.0
			while y < box.end.y - 4.0:
				var x := box.position.x - (bw * 0.5 if row % 2 == 1 else 0.0)
				while x < box.end.x:
					var a := Vector2(x + 3.0, y + 2.0)
					var b := Vector2(x + bw - 3.0, y + bh - 2.0)
					if Geometry2D.is_point_in_polygon(a, inner) and Geometry2D.is_point_in_polygon(b, inner) \
							and Geometry2D.is_point_in_polygon(Vector2(a.x, b.y), inner) and Geometry2D.is_point_in_polygon(Vector2(b.x, a.y), inner):
						mp.draw_rect(Rect2(a, b - a), th.ground_dark.lerp(th.ground, rng.randf_range(0.2, 0.6)))
					x += bw
				y += bh
				row += 1
			continue
		_draw_depth(mp, pts, inner, box, th, rng)
		# Pebbles inside the core.
		var n := int(box.get_area() / 2800.0)
		for i in mini(n, 900):
			var p := Vector2(rng.randf_range(box.position.x, box.end.x), rng.randf_range(box.position.y, box.end.y))
			if not Geometry2D.is_point_in_polygon(p, inner):
				continue
			var r := rng.randf_range(3.0, 7.0)
			mp.draw_colored_polygon(Art.ellipse(p, r * 1.4, r, 10), th.ground_dark)
			mp.draw_colored_polygon(Art.ellipse(p + Vector2(-1, -1), r * 0.6, r * 0.4, 8), th.ground.lightened(0.15))
		_draw_stones(mp, inner, box, th, rng)
	# A lighter rim just inside the outline: solid ground reads clearly even
	# against busy or dark backgrounds.
	for rim in Geometry2D.offset_polygon(pts, -6.0, Geometry2D.JOIN_ROUND):
		var rc := rim.duplicate()
		rc.append(rim[0])
		mp.draw_polyline(rc, th.ground.lightened(0.22), 3.0)
	# Outline.
	mp.draw_ink(pts, th.outline, true, 2.4, 5.2, seed_value)
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


## Earthy depth for the plain (pebbles) pattern: the fill darkens in soft steps
## the further it is from open air, a band of rich topsoil sits under the grass,
## roots dangle from it, and big stones are buried here and there.
func _draw_depth(mp: MeshPainter, pts: PackedVector2Array, inner: PackedVector2Array, box: Rect2,
		th: LevelTheme, rng: RandomNumberGenerator) -> void:
	var deep := th.ground_dark
	for st: Vector2 in [Vector2(110, 0.16), Vector2(260, 0.3), Vector2(460, 0.44), Vector2(720, 0.56)]:
		for ring in Geometry2D.offset_polygon(inner, -st.x, Geometry2D.JOIN_ROUND):
			mp.draw_colored_polygon(ring, th.ground.lerp(deep, st.y))
	# Topsoil under every grassy run: a darker wavy band, clipped to the fill.
	var soil := th.ground.lerp(deep, 0.45)
	var roots := deep.darkened(0.15)
	for run in _up_runs(pts):
		var total := 0.0
		for i in run.size() - 1:
			total += run[i].distance_to(run[i + 1])
		if total < 40.0:
			continue
		var band := PackedVector2Array()
		var under := PackedVector2Array()
		var d := 0.0
		while d <= total + 0.1:
			var p := _along(run, minf(d, total))
			band.append(p + Vector2(0, -4))
			under.append(p + Vector2(0, 30.0 + sin(p.x * 0.045) * 6.0 + sin(p.x * 0.013 + 1.3) * 5.0))
			d += 24.0
		under.reverse()
		band.append_array(under)
		for piece in Geometry2D.intersect_polygons(band, inner):
			mp.draw_colored_polygon(piece, soil)
		# Roots curling down from the topsoil.
		d = rng.randf_range(60.0, 200.0)
		while d < total - 30.0:
			var p := _along(run, d) + Vector2(0, 26)
			var line := PackedVector2Array([p])
			var length := rng.randf_range(40.0, 110.0)
			var bend := rng.randf_range(-1.0, 1.0)
			for k in range(1, 7):
				var t := k / 6.0
				line.append(p + Vector2(sin(t * 3.0 + bend * 2.0) * 10.0 * bend + bend * t * 14.0, t * length))
			if Geometry2D.is_point_in_polygon(line[line.size() - 1], inner):
				mp.draw_polyline(line, roots, 4.0)
				var mid := line[3]
				mp.draw_polyline(PackedVector2Array([mid, mid + Vector2(6.0 - bend * 16.0, 18.0),
						mid + Vector2(4.0 - bend * 20.0, 30.0)]), roots, 2.5)
			d += rng.randf_range(160.0, 380.0)


## Big stones buried in the earth (drawn over the pebbles).
func _draw_stones(mp: MeshPainter, inner: PackedVector2Array, box: Rect2, th: LevelTheme,
		rng: RandomNumberGenerator) -> void:
	var deep := th.ground_dark
	var stone := th.ground.lerp(Color(0.62, 0.6, 0.6), 0.28)
	for i in mini(int(box.get_area() / 90000.0), 160):
		var c := Vector2(rng.randf_range(box.position.x, box.end.x), rng.randf_range(box.position.y + 70.0, box.end.y))
		var r := rng.randf_range(12.0, 26.0)
		var blob := Art.ellipse(c, r * rng.randf_range(1.1, 1.6), r, 12)
		var inside := true
		for q in blob:
			if not Geometry2D.is_point_in_polygon(q, inner):
				inside = false
				break
		if not inside:
			continue
		mp.draw_colored_polygon(Art.ellipse(c + Vector2(0, 3), r * 1.45 + 3.0, r + 3.0, 12), deep.darkened(0.25))
		mp.draw_colored_polygon(blob, stone)
		mp.draw_colored_polygon(Art.ellipse(c + Vector2(-r * 0.35, -r * 0.35), r * 0.45, r * 0.25, 8), stone.lightened(0.25))


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
	var top_col := ICE if slippery else th.top
	mp.draw_colored_polygon(band, top_col)
	mp.draw_polyline(bottom, th.outline, 2.5)
	var hi := PackedVector2Array()
	for p in top:
		hi.append(p + Vector2(0, 4))
	mp.draw_polyline(hi, top_col.lightened(0.2), 4.0)
	mp.draw_polyline(top, th.outline, 3.0)
	if slippery:
		# Glassy ice: diagonal glints instead of tufts.
		var g := rng.randf_range(20.0, 60.0)
		while g < total - 20.0:
			var p := _along(run, g)
			mp.draw_line(p + Vector2(-6, 10), p + Vector2(4, 2), Color(1, 1, 1, 0.85), 3.0)
			mp.draw_line(p + Vector2(4, 11), p + Vector2(9, 6), Color(1, 1, 1, 0.6), 2.0)
			g += rng.randf_range(50.0, 120.0)
		return
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
static func _rounded(pts: PackedVector2Array, r: float, convex_only := false) -> PackedVector2Array:
	if r <= 0.5 or pts.size() < 3:
		return pts
	var out := PackedVector2Array()
	var n := pts.size()
	var winding := signf(_signed_area(pts))
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
		if convex_only and signf((p - a).cross(b - p)) != winding:
			out.append(p)  # inside corner: keep it sharp
			continue
		var pa := p + da.normalized() * rr
		var pb := p + db.normalized() * rr
		for k in 5:
			var t := float(k) / 4.0
			out.append(pa.lerp(p, t).lerp(p.lerp(pb, t), t))  # quadratic bezier corner
	return out
