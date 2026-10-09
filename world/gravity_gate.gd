@tool
class_name GravityGate
extends Area2D
## A glowing arch: walk (or fall, or fly) through it and gravity is SET to its direction
## (not toggled), so a puzzle always has the same answer. Origin = base centre; the arch
## stands `height` tall. Friends' passes are decided by their own browser (net_flip).

enum Pull { DOWN, UP }

@export var pull := Pull.UP:
	set(v):
		pull = v
		queue_redraw()
@export var width := 90.0
@export var height := 240.0:
	set(v):
		height = v
		queue_redraw()

var _glow := 0.0
var _t := 0.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width, height)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -height * 0.5)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func target_dir() -> int:
	return 1 if pull == Pull.DOWN else -1


func _physics_process(delta: float) -> void:
	_t += delta
	if Engine.is_editor_hint():
		queue_redraw()
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p != null and not p.is_bubbled() and not p.remote:
			if GameManager.set_gravity_dir(target_dir(), true):
				_glow = 1.0
				Audio.play("clank", -6.0, 0.9 if pull == Pull.DOWN else 1.4)
				if Net.is_online():
					Net.relay_call(self, "net_flip", [target_dir()])
	if View.sees(global_position, 400.0):
		_glow = maxf(_glow - delta * 2.0, 0.0)
		queue_redraw()


func net_flip(dir: int) -> void:
	_glow = 1.0
	GameManager.set_gravity_dir(dir, true)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var col := GravityArt.color_for(target_dir())
	var hw := width * 0.5
	# Two posts and a curved top, with a shimmering curtain between them.
	for sx in [-1.0, 1.0]:
		Art.shape(self, Art.rounded_rect(Vector2(sx * hw - 7, -height), Vector2(sx * hw + 7, 0), 4.0), th.ledge_dark, o)
	Art.shape(self, Art.rounded_rect(Vector2(-hw - 7, -height - 12), Vector2(hw + 7, -height + 8), 6.0), th.ledge_dark, o)
	var a := 0.16 + 0.12 * sin(_t * 3.0) + 0.3 * _glow
	draw_rect(Rect2(-hw + 7, -height + 8, width - 14, height - 8), Color(col, a))
	for i in 4:   # arrows drift the way gravity will pull
		var k := fposmod(_t * 0.5 + float(i) * 0.25, 1.0)
		var y := -height + 30.0 + (height - 60.0) * (k if target_dir() > 0 else 1.0 - k)
		GravityArt.arrow(self, Vector2(0, y), target_dir(), 9.0, Color(col, 0.85 * sin(k * PI)), o)
