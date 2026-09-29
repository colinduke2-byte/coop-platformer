class_name PlatformArt
## Shared looks for platforms (moving, crumbling, gates) so they match the theme.


## Wooden plank with bolts and a lighter top edge.
static func draw_plank(ci: CanvasItem, r: Rect2, th: LevelTheme) -> void:
	var a := r.position
	var b := r.end
	Art.shape(ci, Art.rounded_rect(a, b, 6.0), th.ledge, th.outline)
	ci.draw_rect(Rect2(a + Vector2(4, 3), Vector2(r.size.x - 8, 5)), th.ledge.lightened(0.25))
	var n := maxi(int(r.size.x / 64.0), 1)
	for i in n:
		var x := a.x + (float(i) + 0.5) * r.size.x / n
		ci.draw_line(Vector2(x - r.size.x / n * 0.5, a.y + 8), Vector2(x - r.size.x / n * 0.5, b.y - 4), th.ledge_dark, 2.0)
		ci.draw_circle(Vector2(x, a.y + r.size.y * 0.55), 3.0, th.ledge_dark)


## Cracked stone tiles (crumbling platforms). `crack` 0..1 adds more cracks.
static func draw_crumbly(ci: CanvasItem, r: Rect2, th: LevelTheme, crack: float) -> void:
	var stone := th.ground.lerp(Color("b8a99a"), 0.5)
	var tiles := maxi(int(r.size.x / 48.0), 1)
	var w := r.size.x / tiles
	for i in tiles:
		var ta := r.position + Vector2(i * w + 1.0, 0)
		var tb := ta + Vector2(w - 2.0, r.size.y)
		Art.shape(ci, Art.rounded_rect(ta, tb, 5.0), stone, th.outline, 2.5)
		ci.draw_rect(Rect2(ta + Vector2(3, 3), Vector2(w - 8, 4)), stone.lightened(0.2))
		var mid := (ta + tb) * 0.5
		ci.draw_polyline(PackedVector2Array([mid + Vector2(-8, -r.size.y * 0.3), mid + Vector2(-2, 0), mid + Vector2(-6, r.size.y * 0.3)]), th.outline, 1.5)
		if crack > 0.3:
			ci.draw_polyline(PackedVector2Array([mid + Vector2(6, -r.size.y * 0.4), mid + Vector2(10, -2), mid + Vector2(4, r.size.y * 0.4)]), th.outline, 1.5)
