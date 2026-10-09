class_name ShaderWarmup
extends CanvasLayer
## Draws every painted shader once, invisibly small, right after boot so the GPU compiles
## them (and every baked texture is loaded) before gameplay. Otherwise the first time a
## level shows terrain, an enemy, a character or the colour grade, that shader compiles
## mid-frame and the game hitches. Frees itself after a few frames.

const TEXTURES: PackedStringArray = ["bark", "cloth", "fur", "ground_brick", "ground_coral", "ground_crystal",
		"ground_earth", "ground_metal", "ground_nebula", "ground_rock", "ground_sand", "ground_snow", "jelly",
		"lip_brass", "lip_coral", "lip_grass", "lip_moss", "lip_sand", "lip_snow", "paper", "shell"]
const CREATURES: PackedStringArray = ["fur", "shell", "jelly", "bark", "ground_metal", "cloth"]

static var done := false
var _frames := 0


func _init() -> void:
	layer = -50
	name = "ShaderWarmup"
	process_mode = Node.PROCESS_MODE_ALWAYS


func _ready() -> void:
	if done or DisplayServer.get_name() == "headless":
		queue_free()
		return
	done = true
	for t in TEXTURES:
		PaintedSurface.texture(t)
	var mats: Array[Material] = []
	mats.append(PaintedSurface.material("ground_earth"))
	mats.append(PaintedSurface.material("lip_grass", 0.9, 128.0, 0.0))
	for c in CREATURES:
		mats.append(PaintedSurface.creature_material(c))
	var rig := ShaderMaterial.new()
	rig.shader = load("res://world/shaders/rig.gdshader")
	rig.set_shader_parameter(&"detail", PaintedSurface.texture("cloth"))
	mats.append(rig)
	for path in ["res://world/shaders/grade.gdshader", "res://world/shaders/vignette.gdshader"]:
		var m := ShaderMaterial.new()
		m.shader = load(path)
		mats.append(m)
	var x := 0.0
	for m in mats:
		if m == null:
			continue
		var r := ColorRect.new()
		r.size = Vector2(3, 3)
		r.position = Vector2(x, 0)
		r.color = Color(1, 1, 1, 0.02)   # nearly invisible, but not culled
		r.material = m
		r.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(r)
		x += 4.0


func _process(_delta: float) -> void:
	_frames += 1
	if _frames > 4:
		queue_free()
