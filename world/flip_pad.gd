@tool
class_name FlipPad
extends Area2D
## Pressure plate: step on it and gravity flips for the whole level. It re-arms once nobody
## is standing on it. Mount on the floor (default) or hang it from a ceiling (`ceiling`).
## Origin = centre of the plate's top surface. Friends' steps are decided by their own
## browser (net_flip), exactly like GravityLever.

@export var ceiling := false:
	set(v):
		ceiling = v
		scale.y = -1.0 if v else 1.0
		queue_redraw()
@export var width := 96.0:
	set(v):
		width = v
		queue_redraw()

var _armed := true
var _empty_time := 0.0
var _press := 0.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2   # players
	monitorable = false
	scale.y = -1.0 if ceiling else 1.0
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width - 8.0, 22.0)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -11)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var stepped := false
	for b in get_overlapping_bodies():
		var p := b as Player
		if p != null and not p.is_bubbled() and not p.remote:
			stepped = true
	if stepped:
		_empty_time = 0.0
		if _armed:
			_armed = false
			_press = 1.0
			if GameManager.flip_gravity():
				Audio.play("clank", -6.0, 1.5)
				if Net.is_online():
					Net.relay_call(self, "net_flip", [GameManager.gravity_dir])
	else:
		_empty_time += delta
		if _empty_time > 0.25:
			_armed = true
	if _press > 0.0 or not _armed:
		_press = maxf(_press - delta * 3.0, 0.0)
		View.redraw(self)


func net_flip(dir: int) -> void:
	_press = 1.0
	GameManager.set_gravity_dir(dir, true)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var sink := 4.0 * (1.0 if not _armed else 0.0)
	var hw := width * 0.5
	Art.shape(self, Art.rounded_rect(Vector2(-hw - 4, -6), Vector2(hw + 4, 0), 3.0), th.ledge_dark, o)
	Art.shape(self, Art.rounded_rect(Vector2(-hw, -16 + sink), Vector2(hw, -4), 5.0), th.accent if _armed else th.accent.darkened(0.3), o)
	var dir := -GameManager.gravity_dir if not Engine.is_editor_hint() else -1
	for i in 3:   # chevrons point where gravity will go NEXT
		var cx := (float(i) - 1.0) * (width * 0.25)
		GravityArt.arrow(self, Vector2(cx, -10 + sink), dir, 5.0, GravityArt.color_for(dir) if _armed else Color(0.6, 0.6, 0.65), o)
