@tool
class_name GravityLever
extends Area2D
## World 6's signature switch: PUNCH (or slide into / ground pound) the lever and gravity
## flips for every dreamer and ground enemy in the level. A physical object, never a button.
## Mount it on the floor (default) or the ceiling (`ceiling = true`, hangs down). The arm
## and the lamp always show which way gravity is pulling right now.
## Origin = the base plate. A short cooldown (GameManager.FLIP_COOLDOWN_MS) stops spam.

@export var ceiling := false:
	set(v):
		ceiling = v
		scale.y = -1.0 if v else 1.0
		queue_redraw()

var _bump := 0.0
var _arm := 1.0        ## -1 .. 1, eased towards the current gravity direction
var _cool := 0.0


func _ready() -> void:
	collision_layer = 4   # punchable (the punch hitbox scans the enemies layer)
	collision_mask = 0
	monitoring = false
	scale.y = -1.0 if ceiling else 1.0
	var shape := RectangleShape2D.new()
	shape.size = Vector2(70, 110)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -55)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	_arm = _target_arm()


func _target_arm() -> float:
	return float(GameManager.gravity_dir) if not Engine.is_editor_hint() else 1.0


## Called by punches, slides and ground pounds.
func take_hit(by: Player, _knockback: Vector2) -> void:
	if Engine.is_editor_hint() or Net.applying:
		return   # a friend's punch arrives as an absolute net_flip() instead (no double toggle)
	_bump = 1.0
	if GameManager.flip_gravity():
		_cool = GameManager.FLIP_COOLDOWN_MS / 1000.0
		Audio.play("clank", -4.0, 1.2)
		EventBus.screen_shake.emit(0.25)
		if Net.is_online():
			Net.relay_call(self, "net_flip", [GameManager.gravity_dir])


## A friend flipped gravity on their screen: set it to exactly what they have.
func net_flip(dir: int) -> void:
	_bump = 1.0
	GameManager.set_gravity_dir(dir, true)


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var want := _target_arm()
	if _bump > 0.0 or _cool > 0.0 or absf(_arm - want) > 0.01:
		_bump = maxf(_bump - delta * 4.0, 0.0)
		_cool = maxf(_cool - delta, 0.0)
		_arm = move_toward(_arm, want, delta * 7.0)
		View.redraw(self)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	# Base plate and housing.
	Art.shape(self, Art.rounded_rect(Vector2(-30, -10), Vector2(30, 0), 4.0), th.ledge_dark, o)
	Art.shape(self, Art.rect(Vector2(-14, -52), Vector2(14, -8)), th.ground.darkened(0.15), o)
	# The arm swings from the pivot between "pulling down" (normal) and "pulling up" (flipped).
	var pivot := Vector2(0, -52)
	var ang := _arm * 0.75 + sin(_bump * PI) * 0.35 * 0.0   # radians from straight up
	var tip := pivot + Vector2(sin(-ang), -cos(ang)) * 52.0
	draw_line(pivot, tip, o, 12.0)
	draw_line(pivot, tip, Color("c9c2d8"), 7.0)
	var knob := Color("ffd24a") if _arm > 0.0 else Color("7fd8ff")
	Art.shape(self, Art.ellipse(tip, 15, 15), o, o)
	Art.shape(self, Art.ellipse(tip, 11.5, 11.5), knob, o, 2.0)
	draw_circle(pivot, 7.0, o)
	# Lamp: an arrow showing which way things fall right now.
	var lamp := Vector2(0, -34)
	Art.shape(self, Art.rounded_rect(lamp + Vector2(-9, -9), lamp + Vector2(9, 9), 3.0), Color("2b2438"), o, 2.0)
	var dir := _arm
	var a := PackedVector2Array([lamp + Vector2(0, 6.0 * dir), lamp + Vector2(-5.5, -4.0 * dir), lamp + Vector2(5.5, -4.0 * dir)])
	draw_colored_polygon(a, knob)
