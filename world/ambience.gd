@tool
class_name Ambience
extends Node2D
## Floating atmosphere that follows the camera: pollen, falling leaves,
## fireflies, spores, petals, embers, snow or rain. One particle system per kind
## (a single draw call each). Add one or two to a level; `density` scales it.
## Optional `darkness` dims the level for caves (a CanvasModulate) - glowing
## things (fireflies, crystals, GlowLight) then really pop.

enum Kind { POLLEN, LEAVES, FIREFLIES, SPORES, PETALS, EMBERS, SNOW, RAIN, BUBBLES, STARS, CONFETTI }

@export var kind := Kind.POLLEN:
	set(v):
		kind = v
		_rebuild()
@export var density := 1.0:
	set(v):
		density = v
		_rebuild()
@export var tint := Color(0, 0, 0, 0):      ## transparent = the kind's own colour
	set(v):
		tint = v
		_rebuild()
@export var darkness := Color(1, 1, 1, 1):  ## < white = dim the level (caves)
	set(v):
		darkness = v
		_rebuild()

const AREA := Vector2(2600, 1600)           ## emission box around the camera

var _p: CPUParticles2D
var _mod: CanvasModulate


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for c in get_children(true):
		c.queue_free()
	_p = CPUParticles2D.new()
	_p.local_coords = false
	_p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	_p.emission_rect_extents = AREA * 0.5
	_p.z_index = 15
	add_child(_p, false, Node.INTERNAL_MODE_FRONT)
	_configure(_p)
	if darkness != Color.WHITE and not Engine.is_editor_hint():
		_mod = CanvasModulate.new()
		_mod.color = darkness
		add_child(_mod, false, Node.INTERNAL_MODE_FRONT)
		var t := Timer.new()
		t.wait_time = 0.5
		t.autostart = true
		t.timeout.connect(_light_players)
		add_child(t, false, Node.INTERNAL_MODE_FRONT)


## In the dark, each dreamer glows a little (their own colour) so you can always find yourself.
func _light_players() -> void:
	for p: Player in GameManager.players.values():
		if is_instance_valid(p) and not p.has_node(^"DreamLight"):
			var g := GlowLight.new()
			g.name = "DreamLight"
			g.radius = 230.0
			g.energy = 0.45
			g.color = p.player_color.lerp(Color.WHITE, 0.6)
			g.position = Vector2(0, -50)
			p.add_child(g)


func _configure(p: CPUParticles2D) -> void:
	var col := tint
	match kind:
		Kind.POLLEN:
			p.amount = int(70 * density)
			p.lifetime = 9.0
			p.texture = _dot(12, 0.9)
			p.gravity = Vector2(6, -4)
			p.initial_velocity_min = 4.0
			p.initial_velocity_max = 18.0
			p.direction = Vector2(1, -0.3)
			p.spread = 180.0
			p.scale_amount_min = 0.3
			p.scale_amount_max = 0.8
			if col.a == 0.0:
				col = Color(1.0, 0.95, 0.6, 0.8)
		Kind.LEAVES:
			p.amount = int(26 * density)
			p.lifetime = 11.0
			p.texture = _leaf()
			p.gravity = Vector2(14, 38)
			p.initial_velocity_min = 10.0
			p.initial_velocity_max = 40.0
			p.direction = Vector2(1, 0.4)
			p.spread = 40.0
			p.angular_velocity_min = -90.0
			p.angular_velocity_max = 90.0
			p.angle_min = 0.0
			p.angle_max = 360.0
			p.scale_amount_min = 0.6
			p.scale_amount_max = 1.1
			p.orbit_velocity_min = 0.0
			if col.a == 0.0:
				col = Color("8cc63f")
			p.color_ramp = _ramp([col, col.lerp(Color("ffb13f"), 0.5), col])
		Kind.FIREFLIES:
			p.amount = int(40 * density)
			p.lifetime = 6.0
			p.texture = _dot(32, 1.0)
			p.gravity = Vector2.ZERO
			p.initial_velocity_min = 6.0
			p.initial_velocity_max = 26.0
			p.spread = 180.0
			p.scale_amount_min = 0.3
			p.scale_amount_max = 0.7
			if col.a == 0.0:
				col = Color(0.8, 1.0, 0.5, 1.0)
			p.color_ramp = _ramp([Color(col, 0.0), col, Color(col, 0.2), col, Color(col, 0.0)])
		Kind.SPORES:
			p.amount = int(60 * density)
			p.lifetime = 10.0
			p.texture = _dot(16, 1.0)
			p.gravity = Vector2(0, -8)
			p.initial_velocity_min = 2.0
			p.initial_velocity_max = 12.0
			p.spread = 180.0
			p.scale_amount_min = 0.25
			p.scale_amount_max = 0.6
			if col.a == 0.0:
				col = Color(0.6, 1.0, 0.9, 0.7)
			p.color_ramp = _ramp([Color(col, 0.0), col, Color(col, 0.0)])
		Kind.PETALS:
			p.amount = int(30 * density)
			p.lifetime = 12.0
			p.texture = _leaf()
			p.gravity = Vector2(20, 26)
			p.initial_velocity_min = 10.0
			p.initial_velocity_max = 30.0
			p.direction = Vector2(1, 0.2)
			p.spread = 60.0
			p.angular_velocity_min = -120.0
			p.angular_velocity_max = 120.0
			p.angle_max = 360.0
			p.scale_amount_min = 0.4
			p.scale_amount_max = 0.7
			if col.a == 0.0:
				col = Color("ffb3d9")
		Kind.EMBERS:
			p.amount = int(46 * density)
			p.lifetime = 7.0
			p.texture = _dot(12, 1.0)
			p.gravity = Vector2(10, -30)
			p.initial_velocity_min = 10.0
			p.initial_velocity_max = 30.0
			p.direction = Vector2(0, -1)
			p.spread = 60.0
			p.scale_amount_min = 0.3
			p.scale_amount_max = 0.6
			if col.a == 0.0:
				col = Color(1.0, 0.55, 0.3, 0.9)
			p.color_ramp = _ramp([Color(col, 0.0), col, Color(col, 0.0)])
		Kind.SNOW:
			p.amount = int(90 * density)
			p.lifetime = 12.0
			p.texture = _dot(12, 1.0)
			p.gravity = Vector2(8, 30)
			p.initial_velocity_min = 5.0
			p.initial_velocity_max = 20.0
			p.spread = 180.0
			p.scale_amount_min = 0.3
			p.scale_amount_max = 0.8
			if col.a == 0.0:
				col = Color(1, 1, 1, 0.85)
		Kind.RAIN:
			# Warm rainforest drizzle: thin slanted streaks that fall fast.
			p.amount = int(150 * density)
			p.lifetime = 1.4
			p.texture = _streak()
			p.gravity = Vector2(60, 700)
			p.initial_velocity_min = 650.0
			p.initial_velocity_max = 850.0
			p.direction = Vector2(0.12, 1)
			p.spread = 3.0
			p.particle_flag_align_y = true
			p.scale_amount_min = 0.6
			p.scale_amount_max = 1.0
			if col.a == 0.0:
				col = Color(0.85, 0.95, 1.0, 0.45)
		Kind.BUBBLES:
			# Little air bubbles wobbling up through the water.
			p.amount = int(60 * density)
			p.lifetime = 7.0
			p.texture = _bubble()
			p.gravity = Vector2(0, -40)
			p.initial_velocity_min = 10.0
			p.initial_velocity_max = 40.0
			p.direction = Vector2(0, -1)
			p.spread = 25.0
			p.scale_amount_min = 0.3
			p.scale_amount_max = 0.9
			p.tangential_accel_min = -6.0
			p.tangential_accel_max = 6.0
			if col.a == 0.0:
				col = Color(0.85, 0.97, 1.0, 0.7)
			p.color_ramp = _ramp([Color(col, 0.0), col, col, Color(col, 0.0)])
		Kind.CONFETTI:
			# Carnival confetti: bright flecks tumbling in every colour.
			p.amount = int(70 * density)
			p.lifetime = 10.0
			p.texture = _dot(12, 1.0)
			p.gravity = Vector2(6, 26)
			p.initial_velocity_min = 4.0
			p.initial_velocity_max = 24.0
			p.spread = 180.0
			p.angular_velocity_min = -180.0
			p.angular_velocity_max = 180.0
			p.hue_variation_min = -1.0
			p.hue_variation_max = 1.0
			p.scale_amount_min = 0.25
			p.scale_amount_max = 0.6
			if col.a == 0.0:
				col = Color(1.0, 0.45, 0.65, 0.9)
		Kind.STARS:
			# Twinkling dream-stars that drift very slowly.
			p.amount = int(80 * density)
			p.lifetime = 5.0
			p.texture = _dot(24, 1.0)
			p.gravity = Vector2.ZERO
			p.initial_velocity_min = 1.0
			p.initial_velocity_max = 6.0
			p.spread = 180.0
			p.scale_amount_min = 0.15
			p.scale_amount_max = 0.45
			if col.a == 0.0:
				col = Color(1.0, 0.9, 1.0, 1.0)
			p.color_ramp = _ramp([Color(col, 0.0), col, Color(col, 0.3), col, Color(col, 0.0)])
	p.color = Color.WHITE if p.color_ramp else col  # ramps already carry the colour
	p.preprocess = p.lifetime


func _process(_delta: float) -> void:
	if _p == null:
		return
	if _mod and not Engine.is_editor_hint():
		# In the dark, every player carries a soft light.
		for n in get_tree().get_nodes_in_group(&"players"):
			if not n.has_node(^"CarriedLight"):
				var l := GlowLight.new()
				l.name = "CarriedLight"
				l.radius = 340.0
				l.energy = 0.95
				l.pulse = 0.0
				l.color = Color(1.0, 0.95, 0.85)
				l.position = Vector2(0, -34)
				n.add_child(l)
	if View.active:
		_p.global_position = View.rect.get_center()
	elif Engine.is_editor_hint():
		_p.position = Vector2.ZERO


## A hollow ring with a highlight (an air bubble).
static func _bubble() -> Texture2D:
	var n := 24
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	var c := Vector2(n, n) * 0.5
	for y in n:
		for x in n:
			var d := Vector2(x + 0.5, y + 0.5).distance_to(c) / (n * 0.5)
			var a := clampf(1.0 - absf(d - 0.82) * 7.0, 0.0, 1.0) + (0.25 if d < 0.8 else 0.0) * 0.4
			if Vector2(x, y).distance_to(c + Vector2(-4, -4)) < 2.5:
				a = 1.0
			img.set_pixel(x, y, Color(1, 1, 1, clampf(a, 0.0, 1.0)))
	return ImageTexture.create_from_image(img)


static func _dot(size: int, hard: float) -> Texture2D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(clampf(hard * 0.4, 0.05, 0.9), Color(1, 1, 1, 0.8))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	t.width = size
	t.height = size
	return t


## A thin vertical raindrop streak (white; tinted by colour).
static func _streak() -> Texture2D:
	var w := 3
	var h := 34
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in h:
		for x in w:
			var a := (1.0 - absf(float(x) - 1.0)) * clampf(float(y) / h * 1.4, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a))
	return ImageTexture.create_from_image(img)


## A small leaf shape rasterised into a texture (white; tinted by colour).
static func _leaf() -> Texture2D:
	var w := 20
	var h := 12
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in h:
		for x in w:
			var u := (float(x) + 0.5) / w * 2.0 - 1.0
			var v := (float(y) + 0.5) / h * 2.0 - 1.0
			var edge := 1.0 - u * u
			var d := absf(v) - edge * 0.95
			var a := clampf(-d * 6.0, 0.0, 1.0)
			var shade := 0.85 if v > 0.0 else 1.0
			img.set_pixel(x, y, Color(shade, shade, shade, a))
	return ImageTexture.create_from_image(img)


static func _ramp(cols: Array) -> Gradient:
	var g := Gradient.new()
	var offs := PackedFloat32Array()
	var cs := PackedColorArray()
	for i in cols.size():
		offs.append(float(i) / (cols.size() - 1))
		cs.append(cols[i])
	g.colors = cs
	g.offsets = offs
	return g
