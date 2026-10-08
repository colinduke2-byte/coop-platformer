class_name PaperPanel
extends Node2D
## A paper card (the storybook panel from UIStyle) drawn at `rect`, for scenes that lay
## things out with Node2D instead of Controls. `color` tints it: cream = (1,1,1,~.55..1).

var rect := Rect2(0, 0, 400, 600):
	set(v):
		rect = v
		queue_redraw()
var color := Color(1, 1, 1, 0.55):
	set(v):
		color = v
		queue_redraw()


func _draw() -> void:
	var tint := Color(color.r, color.g, color.b, clampf(color.a * 1.6, 0.0, 1.0))
	var st := UIStyle.panel(Color(UIStyle.PANEL.r * tint.r, UIStyle.PANEL.g * tint.g, UIStyle.PANEL.b * tint.b, tint.a))
	draw_style_box(st, rect.grow(18.0))   # the baked card has a margin of soft shadow: grow so the border sits on `rect`
