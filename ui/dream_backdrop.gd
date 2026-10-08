class_name DreamBackdrop
extends Node2D
## A soft storybook backdrop for menus: a pastel sky gradient, drifting bokeh lights and a
## gentle vignette. Drop it in as the first child of a menu scene.

var _t := 0.0
var _lights: Array[Dictionary] = []
@export var top := Color("8fd3f4")
@export var bottom := Color("ffd6ec")


func _ready() -> void:
	z_index = -100
	var rng := RandomNumberGenerator.new()
	rng.seed = 91
	for i in 22:
		_lights.append({"x": rng.randf_range(0, 1920), "y": rng.randf_range(0, 1080), "r": rng.randf_range(24, 90),
				"s": rng.randf_range(8, 22), "p": rng.randf() * TAU, "h": rng.randf()})


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var steps := 18
	for i in steps:
		var f := float(i) / (steps - 1)
		draw_rect(Rect2(0, i * 1080.0 / steps, 1920, 1080.0 / steps + 1), top.lerp(bottom, f))
	if not Gfx.at_least(Gfx.Level.MEDIUM):
		return
	for l in _lights:
		var y := fposmod(float(l["y"]) - _t * float(l["s"]), 1200.0) - 60.0
		var x := float(l["x"]) + sin(_t * 0.4 + float(l["p"])) * 30.0
		var c := Color.from_hsv(0.08 + float(l["h"]) * 0.8, 0.25, 1.0)
		draw_circle(Vector2(x, y), float(l["r"]), Color(c, 0.08))
		draw_circle(Vector2(x, y), float(l["r"]) * 0.6, Color(c, 0.08))
