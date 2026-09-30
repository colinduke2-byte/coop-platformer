@tool
class_name GlowLight
extends PointLight2D
## A soft coloured light for dark levels (use with Ambience.darkness). Place
## it on glowing mushrooms, crystals, lanterns. Gently pulses. The texture is a
## generated radial gradient, so no image files are needed.

@export var radius := 260.0:
	set(v):
		radius = v
		_rebuild()
@export var pulse := 0.15                   ## 0 = steady

var _t := 0.0
var _base := 1.0


func _ready() -> void:
	_rebuild()
	_base = energy
	_t = randf() * TAU


func _rebuild() -> void:
	texture = GlowLight.soft_texture()
	texture_scale = radius / 128.0


func _process(delta: float) -> void:
	if pulse <= 0.0 or Engine.is_editor_hint():
		return
	_t += delta
	energy = _base * (1.0 + sin(_t * 2.2) * pulse)


static var _tex: Texture2D


static func soft_texture() -> Texture2D:
	if _tex == null:
		var g := Gradient.new()
		g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.45), Color(1, 1, 1, 0)])
		g.offsets = PackedFloat32Array([0.0, 0.35, 1.0])
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		t.width = 256
		t.height = 256
		_tex = t
	return _tex
