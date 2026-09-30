@tool
class_name BackWall
extends Node2D
## Scenery wall BEHIND the action (no collision): the inside of a tower, a
## cave back, a house interior. Darker version of the level's ground with its
## pattern, so it reads as "far". Origin = top-left. Baked to one mesh.

@export var size := Vector2(600, 800):
	set(v):
		size = v
		_mesh = null
		queue_redraw()
@export var shade := 0.45                    ## how much darker than the ground

var _mesh: ArrayMesh


func _ready() -> void:
	z_index = -20


func _draw() -> void:
	if _mesh == null:
		var th := LevelTheme.find(self)
		var dark := th.duplicate() as LevelTheme
		dark.ground = th.ground.darkened(shade)
		dark.ground_dark = th.ground_dark.darkened(shade)
		dark.outline = th.outline
		var mp := MeshPainter.new()
		Block.draw_ground(mp, size, dark, false, int(size.x) ^ int(size.y))
		# A couple of arched windows letting light in.
		var n := int(size.x / 300.0)
		for i in n:
			var cx := size.x * (i + 0.5) / n
			for k in int(size.y / 420.0):
				var cy := 160.0 + k * 420.0
				mp.draw_colored_polygon(Art.rounded_rect(Vector2(cx - 26, cy - 50), Vector2(cx + 26, cy + 40), 26.0), th.sky_bottom.lerp(th.sky_top, 0.4))
				mp.draw_polyline(Art.rounded_rect(Vector2(cx - 26, cy - 50), Vector2(cx + 26, cy + 40), 26.0) + PackedVector2Array([Vector2(cx - 26, cy - 24)]), th.outline, 3.0)
				mp.draw_line(Vector2(cx, cy - 50), Vector2(cx, cy + 40), th.outline, 3.0)
		_mesh = mp.build()
	draw_mesh(_mesh, null)
