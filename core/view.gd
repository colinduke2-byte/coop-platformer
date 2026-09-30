class_name View
## What the camera can see, in world space, updated every frame by CoopCamera.
## Animated pieces ask View.sees() before doing purely visual work (redraws,
## particles) so off-screen parts of a level cost nothing. With no camera
## (editor, headless tests) everything counts as visible.

static var rect := Rect2(-1e9, -1e9, 2e9, 2e9)
static var active := false


static func sees(p: Vector2, margin := 160.0) -> bool:
	return p.x > rect.position.x - margin and p.x < rect.end.x + margin \
			and p.y > rect.position.y - margin and p.y < rect.end.y + margin


static func set_from_camera(cam: Camera2D) -> void:
	var size := cam.get_viewport_rect().size / cam.zoom
	rect = Rect2(cam.get_screen_center_position() - size * 0.5, size)
	active = true


static func reset() -> void:
	rect = Rect2(-1e9, -1e9, 2e9, 2e9)
	active = false


## queue_redraw() only when `ci` (within `margin` px of its origin) is on screen.
static func redraw(ci: CanvasItem, margin := 400.0) -> void:
	if sees(ci.global_position, margin):
		ci.queue_redraw()


## queue_redraw() only when the world-space rect `r` overlaps the screen.
static func redraw_rect(ci: CanvasItem, r: Rect2, margin := 200.0) -> void:
	if r.grow(margin).intersects(rect):
		ci.queue_redraw()
