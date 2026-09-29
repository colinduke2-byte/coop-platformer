class_name Bonkhorn
extends Enemy
## BONKHORN: stubby rhino with a huge horn. Sees you on its level -> paws the
## ground (tell) -> CHARGES. Its armoured face shrugs off punches while it's
## awake; make it charge into a wall and it's dizzy - pound it then. Stomps
## always work. Stops at ledges (it's not stupid, just stubborn).

enum Mode { WANDER, PAW, CHARGE, DIZZY }

@export var walk_speed := 60.0
@export var charge_speed := 560.0
@export var sight := 520.0
@export var paw_time := 0.6
@export var max_charge_time := 2.2
@export var dizzy_time := 2.2

const HIDE := Color("8a93b8")
const HIDE_DARK := Color("656d94")
const HORN := Color("fff0d0")

var _mode := Mode.WANDER
var _timer := 0.0


func _init() -> void:
	body_size = Vector2(60, 44)
	health = 2
	lum_drop = 3
	knockback_scale = 0.4


func _behave(delta: float) -> void:
	_timer -= delta
	match _mode:
		Mode.WANDER:
			patrol(walk_speed)
			var p := nearest_player(sight, 50.0)
			if p and is_on_floor():
				face(p)
				_set_mode(Mode.PAW, paw_time)
		Mode.PAW:
			velocity.x = 0.0
			if _timer <= 0.0:
				_set_mode(Mode.CHARGE, max_charge_time)
		Mode.CHARGE:
			velocity.x = facing * charge_speed
			if is_on_floor() and wall_ahead():
				velocity = Vector2(-facing * 200.0, -300.0)
				EventBus.screen_shake.emit(0.4)
				_set_mode(Mode.DIZZY, 0.0)
				stun_timer = dizzy_time  # base stun: stars, harmless, no behaviour
				squash(Vector2(0.7, 1.2))
			elif is_on_floor() and not floor_ahead():
				velocity.x = 0.0
				_set_mode(Mode.WANDER, 0.0)
			elif _timer <= 0.0:
				_set_mode(Mode.WANDER, 0.0)
		Mode.DIZZY:
			_set_mode(Mode.WANDER, 0.0)  # only runs once the stun has worn off


func _set_mode(m: Mode, t: float) -> void:
	_mode = m
	_timer = t


## Not dizzy + hit from the front = armoured.
func blocks_hit(by: Player, kind: HitKind) -> bool:
	if is_stunned() or by == null or kind in [HitKind.STOMP, HitKind.POUND]:
		return false
	return signf(by.global_position.x - global_position.x) == facing


func _draw_body(ci: CanvasItem) -> void:
	var fast := _mode == Mode.CHARGE
	var ph := anim_time * (22.0 if fast else 8.0)
	var paw := sin(anim_time * 30.0) * 5.0 if _mode == Mode.PAW else 0.0
	for i in 4:
		var x := -20.0 + i * 13.0
		var swing := sin(ph + i * 1.6) * (6.0 if absf(velocity.x) > 1.0 else 0.0)
		if i == 3:
			swing += paw
		Art.shape(ci, Art.rounded_rect(Vector2(x - 5 + swing, -14), Vector2(x + 5 + swing, 0), 3.0), HIDE_DARK, OUTLINE, 2.0)
	var lean := 4.0 if fast else 0.0
	Art.shape(ci, Art.ellipse(Vector2(-4, -26), 30, 18), HIDE, OUTLINE)
	Art.shape(ci, Art.ellipse(Vector2(20 + lean, -24), 14, 13), HIDE, OUTLINE)
	# Horn.
	Art.shape(ci, PackedVector2Array([Vector2(26 + lean, -30), Vector2(46 + lean, -46), Vector2(34 + lean, -22)]), HORN, OUTLINE, 2.0)
	ci.draw_circle(Vector2(31 + lean, -20), 2.0, OUTLINE)
	var dizzy := is_stunned()
	Enemy.draw_eye(ci, Vector2(18 + lean, -30), 4.0, Vector2(1, 0), 1.0 if not dizzy else 0.0, false)
	# Ear + tail tuft.
	Art.shape(ci, Art.ellipse(Vector2(8, -42), 5, 8), HIDE_DARK, OUTLINE, 2.0)
	ci.draw_line(Vector2(-33, -30), Vector2(-40, -36 + sin(anim_time * 10.0) * 3.0), OUTLINE, 3.0)
