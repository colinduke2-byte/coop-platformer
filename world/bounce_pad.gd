@tool
class_name BouncePad
extends Area2D
## Springy mushroom. Land on it (or touch it, if it's tilted) and you're flung
## along its up direction. Hold JUMP for a bigger bounce, ground pound into it
## for a huge one. Rotate the node to aim it; the editor draws the launch arc.
## Origin = bottom centre of the stem.

const PAD_WIDTH := 96.0
const STEM_HEIGHT := 26.0
const COOLDOWN := 0.18

@export var launch_height := 420.0:         ## px a plain bounce reaches (straight up)
	set(v):
		launch_height = v
		queue_redraw()
@export var hold_jump_multiplier := 1.3     ## height x this while holding jump
@export var pound_multiplier := 1.7         ## height x this when ground-pounding in
@export var sideways_lock := 0.3            ## s of steering ignored after a tilted launch
@export var tint := Color(0, 0, 0, 0)        ## cap colour; transparent = theme accent

var _cooldowns := {}
var _squish := 0.0


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	if get_child_count() == 0:
		var shape := RectangleShape2D.new()
		shape.size = Vector2(PAD_WIDTH - 10.0, 30.0)
		var col := CollisionShape2D.new()
		col.shape = shape
		col.position = Vector2(0, -STEM_HEIGHT - 8.0)
		add_child(col, false, Node.INTERNAL_MODE_FRONT)


## Launch speed that reaches `h` px against the player's rise gravity.
static func speed_for_height(t: PlayerTuning, h: float) -> float:
	return sqrt(2.0 * t.rise_gravity() * h)


func _physics_process(delta: float) -> void:
	if _squish > 0.0:
		_squish = maxf(_squish - delta * 4.0, 0.0)
		queue_redraw()
	if Engine.is_editor_hint():
		return
	for p in _cooldowns.keys():
		_cooldowns[p] -= delta
		if _cooldowns[p] <= 0.0:
			_cooldowns.erase(p)
	var up := Vector2.UP.rotated(global_rotation)
	for body in get_overlapping_bodies():
		var p := body as Player
		if p == null or p.is_bubbled() or _cooldowns.has(p):
			continue
		if p.velocity.dot(up) > 60.0:
			continue  # already flying away from the pad
		_bounce(p, up)


func _bounce(p: Player, up: Vector2) -> void:
	var h := launch_height
	var pounding := p.state_machine.current_name() == &"GroundPound"
	if pounding:
		h *= pound_multiplier
	elif p.input.jump_held():
		h *= hold_jump_multiplier
	p.consume_jump()
	var lock := sideways_lock if absf(up.x) > 0.3 else 0.0
	var v := up * speed_for_height(p.tuning, h)
	if absf(up.x) <= 0.3:
		v.x = p.velocity.x  # vertical pads keep your run speed
	p.launch(v, lock)
	_cooldowns[p] = COOLDOWN
	_squish = 1.0
	EventBus.pad_bounced.emit(p, self, pounding)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var cap := th.accent if tint.a == 0.0 else tint
	var s := _squish
	var squash := Vector2(1.0 + 0.3 * s, 1.0 - 0.45 * s)
	# Stem.
	Art.shape(self, Art.rounded_rect(Vector2(-16, -STEM_HEIGHT), Vector2(16, 0), 6.0), Color("fff4e0"), th.outline)
	# Cap: a squashy dome with spots.
	var top := -STEM_HEIGHT
	var cap_pts := PackedVector2Array()
	for i in 17:
		var a := PI + PI * float(i) / 16.0
		cap_pts.append(Vector2(cos(a) * PAD_WIDTH * 0.5 * squash.x, top + 6.0 + sin(a) * 34.0 * squash.y))
	Art.shape(self, cap_pts, cap, th.outline)
	for d: Vector2 in [Vector2(-22, -18), Vector2(4, -26), Vector2(26, -14)]:
		draw_circle(Vector2(d.x * squash.x, top + 6.0 + d.y * squash.y), 6.0 * squash.y, Color(1, 1, 1, 0.85))
	if Engine.is_editor_hint():
		_draw_arc_preview()


## Dotted launch arc using the default tuning (editor only).
func _draw_arc_preview() -> void:
	var t: PlayerTuning = load("res://player/tuning/player_default.tres")
	var up := Vector2.UP.rotated(global_rotation)
	var v := up * speed_for_height(t, launch_height)
	var pos := Vector2(0, -STEM_HEIGHT - 20.0)
	var pts := PackedVector2Array([pos])
	for i in 90:
		var g := t.rise_gravity() if v.y < 0.0 else t.fall_gravity()
		v.y += g / 60.0
		pos += v.rotated(-global_rotation) / 60.0  # draw in local space
		pts.append(pos)
		if v.y > 0.0 and pos.y > 0.0:
			break
	Art.dotted(self, pts, Color(1, 1, 1, 0.7), 16.0, 3.0)
