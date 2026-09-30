@tool
class_name Zipline
extends Node2D
## Rope between two posts. Jump into it and your character grabs a pulley and
## whizzes along (see the Zipline player state). Origin = start post top;
## `end` = the other end (relative). Downhill = faster.

const GRAB_DIST := 30.0

@export var end := Vector2(800, 300):
	set(v):
		end = v
		queue_redraw()
@export var posts := true


func length() -> float:
	return end.length()


func direction() -> Vector2:
	return end.normalized()


func point_at(t: float) -> Vector2:
	return global_position + end * clampf(t, 0.0, 1.0)


func closest_t(p: Vector2) -> float:
	var l2 := end.length_squared()
	return clampf((p - global_position).dot(end) / maxf(l2, 1.0), 0.0, 1.0)


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint():
		return
	for n in get_tree().get_nodes_in_group(&"players"):
		var pl := n as Player
		if pl.is_bubbled() or not pl.can_grab_zipline():
			continue
		var grip := pl.global_position + Player.GRIP_OFFSET
		var t := closest_t(grip)
		if t <= 0.02 or t >= 0.98:
			continue
		if grip.distance_to(point_at(t)) < GRAB_DIST:
			pl.grab_zipline(self)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var wood := Color("8a5a3a")
	if posts:
		for p: Vector2 in [Vector2.ZERO, end]:
			Art.shape(self, Art.rect(p + Vector2(-7, -20), p + Vector2(7, 180)), wood, o, 3.0)
			Art.shape(self, Art.ellipse(p, 10, 10, 12), Color("c9c9d6"), o, 2.5)
	var sag := PackedVector2Array()
	for i in 21:
		var t := i / 20.0
		sag.append(end * t + Vector2(0, sin(t * PI) * 10.0))
	draw_polyline(sag, o, 6.0)
	draw_polyline(sag, Color("e6d3a3"), 3.0)
