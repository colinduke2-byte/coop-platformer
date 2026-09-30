class_name Art
## Tiny shared drawing helpers for world pieces that draw themselves with
## _draw() (so they preview live in the editor). Flat shapes + dark outline,
## matching the character rigs. `ci` is a CanvasItem or a MeshPainter (bakes
## static art into one mesh = one draw call).

const OUTLINE_WIDTH := 3.0


static func ellipse(c: Vector2, rx: float, ry: float, n := 20) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n:
		var a := TAU * float(i) / float(n)
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	return pts


static func rect(a: Vector2, b: Vector2) -> PackedVector2Array:
	return PackedVector2Array([a, Vector2(b.x, a.y), b, Vector2(a.x, b.y)])


static func rounded_rect(a: Vector2, b: Vector2, r: float, n := 4) -> PackedVector2Array:
	var pts := PackedVector2Array()
	r = minf(r, minf((b.x - a.x) * 0.5, (b.y - a.y) * 0.5))
	var corners := [Vector2(b.x - r, a.y + r), Vector2(b.x - r, b.y - r), Vector2(a.x + r, b.y - r), Vector2(a.x + r, a.y + r)]
	for ci in 4:
		for i in n + 1:
			var ang := -PI * 0.5 + (float(ci) + float(i) / n) * PI * 0.5
			pts.append(corners[ci] + Vector2(cos(ang), sin(ang)) * r)
	return pts


static func star(c: Vector2, radius: float, points := 5, inner := 0.45, rot := 0.0) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in points * 2:
		var a := -PI * 0.5 + rot + PI * float(i) / float(points)
		var rr := radius if i % 2 == 0 else radius * inner
		pts.append(c + Vector2(cos(a) * rr, sin(a) * rr))
	return pts


## Filled polygon with the standard dark outline.
static func shape(ci: Object, pts: PackedVector2Array, fill: Color, outline: Color, width := OUTLINE_WIDTH) -> void:
	if pts.size() < 3:
		return
	ci.draw_colored_polygon(pts, fill)
	if width > 0.0:
		var closed := pts.duplicate()
		closed.append(pts[0])
		ci.draw_polyline(closed, outline, width, true)


static func dotted(ci: Object, pts: PackedVector2Array, color: Color, gap := 14.0, r := 3.0) -> void:
	var carry := 0.0
	for i in pts.size() - 1:
		var a := pts[i]
		var b := pts[i + 1]
		var seg := a.distance_to(b)
		var d := carry
		while d < seg:
			ci.draw_circle(a.lerp(b, d / seg), r, color)
			d += gap
		carry = d - seg
