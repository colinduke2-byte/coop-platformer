@tool
class_name Backdrop
extends Node2D
## Painted-style parallax background built from the level's LevelTheme:
## gradient sky, sun, drifting clouds, far hills, near hills with trees.
## Drop ONE in a level (anywhere; it draws behind everything). Set
## `horizon_y` to roughly the world y of your main ground.
## Swap for painted art later by replacing the layers it builds.

@export var horizon_y := 600.0:
	set(v):
		horizon_y = v
		_rebuild()
@export var seed_value := 7:
	set(v):
		seed_value = v
		_rebuild()
@export var clouds := true:
	set(v):
		clouds = v
		_rebuild()
@export var trees := true:
	set(v):
		trees = v
		_rebuild()
@export var theme_override: LevelTheme:
	set(v):
		theme_override = v
		_rebuild()

const FAR_REPEAT := 2400.0
const NEAR_REPEAT := 1800.0
const CLOUD_REPEAT := 3000.0
const DEPTH := 4000.0          ## how far below the horizon hills extend


func _ready() -> void:
	z_index = -100
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for c in get_children(true):
		c.queue_free()
	var th := theme_override if theme_override else LevelTheme.find(self)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value

	# Sky: a screen-filling gradient on its own canvas layer.
	var sky_layer := CanvasLayer.new()
	sky_layer.layer = -100
	sky_layer.follow_viewport_enabled = false
	add_child(sky_layer, false, Node.INTERNAL_MODE_FRONT)
	var grad := Gradient.new()
	grad.set_color(0, th.sky_top)
	grad.set_color(1, th.sky_bottom)
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill_from = Vector2(0, 0)
	tex.fill_to = Vector2(0, 1)
	tex.width = 8
	tex.height = 256
	var sky := TextureRect.new()
	sky.texture = tex
	sky.stretch_mode = TextureRect.STRETCH_SCALE
	sky.set_anchors_preset(Control.PRESET_FULL_RECT)
	sky.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sky_layer.add_child(sky)
	# Sun (screen-fixed, top right-ish).
	var sun := Polygon2D.new()
	sun.polygon = Art.ellipse(Vector2(1500, 170), 90, 90, 32)
	sun.color = Color(th.sun, 0.9)
	sky_layer.add_child(sun)
	var glow := Polygon2D.new()
	glow.polygon = Art.ellipse(Vector2(1500, 170), 140, 140, 32)
	glow.color = Color(th.sun, 0.25)
	sky_layer.add_child(glow)
	sky_layer.move_child(glow, sun.get_index())

	if clouds:
		var cl := _parallax(0.12, CLOUD_REPEAT)
		cl.autoscroll = Vector2(-12, 0)
		for i in 7:
			var c := Vector2(rng.randf_range(0, CLOUD_REPEAT), horizon_y - rng.randf_range(650, 1200))
			_cloud(cl, c, rng.randf_range(0.7, 1.4), th)
	var far := _parallax(0.3, FAR_REPEAT)
	_hills(far, FAR_REPEAT, horizon_y - 260.0, 220.0, th.far_hills, rng, 7)
	var near := _parallax(0.6, NEAR_REPEAT)
	_hills(near, NEAR_REPEAT, horizon_y - 120.0, 150.0, th.near_hills, rng, 5)
	if trees:
		for i in 6:
			var x := rng.randf_range(0, NEAR_REPEAT)
			_tree(near, Vector2(x, _hill_y_hint), rng.randf_range(0.8, 1.3), th)


var _hill_y_hint := 0.0
var _hill_pts := PackedVector2Array()


func _parallax(scale: float, repeat: float) -> Parallax2D:
	var p := Parallax2D.new()
	p.scroll_scale = Vector2(scale, scale)
	p.repeat_size = Vector2(repeat, 0)
	p.repeat_times = 4
	p.z_index = -100
	add_child(p, false, Node.INTERNAL_MODE_FRONT)
	return p


func _hills(parent: Node2D, width: float, y: float, amp: float, color: Color, rng: RandomNumberGenerator, bumps: int) -> void:
	var pts := PackedVector2Array([Vector2(0, y + DEPTH)])
	var phase := rng.randf() * TAU
	var steps := 48
	for i in steps + 1:
		var x := width * float(i) / steps
		var t := TAU * float(i) / steps
		# Sum of sines that loop exactly over `width` so the repeat is seamless.
		var h := sin(t * bumps * 0.5 + phase) * 0.6 + sin(t * bumps + phase * 2.0) * 0.3 + sin(t * 2.0) * 0.1
		pts.append(Vector2(x, y - (h * 0.5 + 0.5) * amp))
	pts.append(Vector2(width, y + DEPTH))
	var poly := Polygon2D.new()
	poly.polygon = pts
	poly.color = color
	parent.add_child(poly)
	var edge := Line2D.new()
	var top := pts.slice(1, pts.size() - 1)
	edge.points = top
	edge.width = 6.0
	edge.default_color = color.lightened(0.15)
	parent.add_child(edge)
	_hill_pts = top
	_hill_y_hint = y


func _hill_height_at(x: float) -> float:
	for i in _hill_pts.size() - 1:
		if x >= _hill_pts[i].x and x <= _hill_pts[i + 1].x:
			return lerpf(_hill_pts[i].y, _hill_pts[i + 1].y, (x - _hill_pts[i].x) / maxf(_hill_pts[i + 1].x - _hill_pts[i].x, 0.01))
	return _hill_y_hint


func _tree(parent: Node2D, at: Vector2, s: float, th: LevelTheme) -> void:
	var base := Vector2(at.x, _hill_height_at(at.x) + 6.0)
	var trunk := Polygon2D.new()
	trunk.polygon = Art.rect(base + Vector2(-6, -60) * s, base + Vector2(6, 0) * s)
	trunk.color = th.near_hills.darkened(0.35)
	parent.add_child(trunk)
	for b: Vector3 in [Vector3(0, -80, 34), Vector3(-22, -62, 24), Vector3(22, -64, 26)]:
		var blob := Polygon2D.new()
		blob.polygon = Art.ellipse(base + Vector2(b.x, b.y) * s, b.z * s, b.z * s * 0.9, 16)
		blob.color = th.near_hills.darkened(0.12).lerp(th.foliage, 0.35)
		parent.add_child(blob)


func _cloud(parent: Node2D, c: Vector2, s: float, th: LevelTheme) -> void:
	for b: Vector3 in [Vector3(0, 0, 50), Vector3(-55, 12, 36), Vector3(55, 10, 40), Vector3(-20, -24, 38), Vector3(28, -20, 34)]:
		var blob := Polygon2D.new()
		blob.polygon = Art.ellipse(c + Vector2(b.x, b.y) * s, b.z * s, b.z * s * 0.8, 16)
		blob.color = th.cloud
		parent.add_child(blob)
	var base := Polygon2D.new()
	base.polygon = Art.rect(c + Vector2(-80, 10) * s, c + Vector2(80, 38) * s)
	base.color = th.cloud
	parent.add_child(base)
