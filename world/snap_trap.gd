@tool
class_name SnapTrap
extends Area2D
## A giant jungle flytrap lying open on the ground. Step on its jaws and it
## quivers (the tell)... then SNAPS shut - anyone still inside is caught.
## Run straight across, or jump over it. It stays shut for a moment (safe to
## walk over then), then yawns open again. Origin = the middle, on the ground.

@export var width := 120.0:
	set(v):
		width = v
		_rebuild()
@export var warn_time := 0.45
@export var shut_time := 1.4

enum St { OPEN, WARN, SHUT }

const JAW := Color("7ad13f")
const JAW_DARK := Color("4f9a2a")
const INSIDE := Color("e8456b")
const TOOTH := Color("fffbe0")

var st := St.OPEN
var _timer := 0.0
var _t := 0.0
var _close := 0.0     ## 0 open .. 1 shut (animation)
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width - 20.0, 40.0)
	_col.shape = shape
	_col.position = Vector2(0, -20.0)
	queue_redraw()


func _physics_process(delta: float) -> void:
	_t += delta
	_close = move_toward(_close, 1.0 if st == St.SHUT else 0.0, delta * (14.0 if st == St.SHUT else 3.0))
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	match st:
		St.OPEN:
			if _someone_inside():
				st = St.WARN
				_timer = warn_time
		St.WARN:
			_timer -= delta
			if _timer <= 0.0:
				st = St.SHUT
				_timer = shut_time
				EventBus.screen_shake.emit(0.15)
				Audio.play("punch_big", -6.0, 1.6)
				for body in get_overlapping_bodies():
					var p := body as Player
					if p and not p.is_bubbled():
						p.hurt()
		St.SHUT:
			_timer -= delta
			if _timer <= 0.0:
				st = St.OPEN


func _someone_inside() -> bool:
	for body in get_overlapping_bodies():
		var p := body as Player
		if p and not p.is_bubbled():
			return true
	return false


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var hw := width * 0.5
	var quiver := sin(_t * 50.0) * 3.0 if st == St.WARN else 0.0
	# Stem and two leaves at the base.
	for d: float in [-1.0, 1.0]:
		Art.shape(self, Art.ellipse(Vector2(d * (hw + 14.0), -6), 26.0, 9.0, 12), JAW_DARK, o, 2.0)
	# Each jaw is a half-dish hinged at the middle; open = lying flat, shut = upright and meeting.
	var lift := lerpf(0.12, 1.0, _close)
	for d: float in [-1.0, 1.0]:
		var pts := PackedVector2Array()
		for i in 13:
			var a := float(i) / 12.0 * PI
			var x := d * (hw - (cos(a) * 0.5 + 0.5) * hw * lift) + quiver
			var y := -sin(a) * 34.0 * (1.0 - lift * 0.4) - lift * (cos(a) * 0.5 + 0.5) * 70.0
			pts.append(Vector2(x * (1.0 - lift * 0.5), y))
		pts.append(Vector2(0, 0))
		Art.shape(self, pts, JAW if d < 0.0 else JAW.darkened(0.06), o, 2.5)
		if _close < 0.5:
			ci_inside(d, hw, lift)
		for k in 5:  # teeth along the rim
			var a := (float(k) + 0.5) / 5.0 * PI
			var x := d * (hw - (cos(a) * 0.5 + 0.5) * hw * lift) * (1.0 - lift * 0.5) + quiver
			var y := -sin(a) * 34.0 * (1.0 - lift * 0.4) - lift * (cos(a) * 0.5 + 0.5) * 70.0
			Art.shape(self, PackedVector2Array([Vector2(x - 4, y), Vector2(x + 4, y), Vector2(x, y - 12)]), TOOTH, o, 1.5)
	if st == St.WARN:
		draw_string(ThemeDB.fallback_font, Vector2(-30, -70), "!!", HORIZONTAL_ALIGNMENT_CENTER, 60, 30, th.accent)


func ci_inside(d: float, hw: float, lift: float) -> void:
	# The pink inside of an open jaw, with trigger hairs.
	var c := Vector2(d * hw * 0.5, -10.0 * (1.0 - lift))
	draw_colored_polygon(Art.ellipse(c, hw * 0.38, 9.0, 12), INSIDE)
	for k in 3:
		var x := c.x + (k - 1) * 10.0
		draw_line(Vector2(x, c.y), Vector2(x, c.y - 12.0), LevelTheme.find(self).outline, 1.5)
