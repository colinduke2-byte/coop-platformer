class_name ColorGrade
extends CanvasLayer
## Screen-space colour grade + vignette for a level, tinted per theme (the mood
## of each world: warm meadow, cool frost, humid jungle, brassy factory, deep
## sea, violet nebula). Sits above the world and below the HUD.
##   Low    - vignette only (alpha overlay)
##   Medium / High - full grade (reads the screen)
## Added to every Level automatically (level.gd). Look is set by LevelTheme.grade().

const GRADE_SHADER := preload("res://world/shaders/grade.gdshader")
const VIGNETTE_SHADER := preload("res://world/shaders/vignette.gdshader")


func _init() -> void:
	layer = 2
	name = "ColorGrade"


func setup(theme: LevelTheme) -> void:
	var g := theme.grade()
	var rect := ColorRect.new()
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	if Gfx.at_least(Gfx.Level.MEDIUM):
		m.shader = GRADE_SHADER
		m.set_shader_parameter(&"saturation", g["sat"])
		m.set_shader_parameter(&"contrast", g["con"])
		var t: Color = g["tint"]
		m.set_shader_parameter(&"tint", Vector3(t.r, t.g, t.b))
		var s: Color = g["shadow"]
		m.set_shader_parameter(&"shadow_tint", Vector3(s.r, s.g, s.b))
	else:
		m.shader = VIGNETTE_SHADER
	m.set_shader_parameter(&"vignette", g["vig"])
	rect.material = m
	add_child(rect)
