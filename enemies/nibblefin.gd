class_name Nibblefin
extends Enemy
## NIBBLEFIN: a toothy little piranha that lurks under the water's surface and
## LEAPS out in a high arc every few seconds (bubbles rise just before it
## jumps - the tell). Time your hop between leaps, or stomp it at the top of
## its arc. Place it ON the water surface.

@export var leap_height := 300.0
@export var leap_dx := 0.0           ## sideways drift per leap (px)
@export var interval := 2.2
@export var phase := 0.0
@export var tell_time := 0.5

enum St { LURK, TELL, LEAP }

const SCALES := Color("e85a5a")
const BELLY := Color("ffd2a0")
const FIN := Color("b83a4a")

var st := St.LURK
var _surface := Vector2.ZERO
var _timer := 0.0


func _init() -> void:
	body_size = Vector2(40, 34)
	uses_gravity = false
	lum_drop = 2


func _setup() -> void:
	_surface = global_position
	_timer = interval * (1.0 - phase) + 0.2
	global_position = _surface + Vector2(0, 60)


func _behave(delta: float) -> void:
	match st:
		St.LURK:
			velocity = Vector2.ZERO
			global_position = global_position.lerp(_surface + Vector2(0, 60), 0.2)
			_timer -= delta
			if _timer <= 0.0:
				st = St.TELL
				_timer = tell_time
		St.TELL:
			velocity = Vector2.ZERO
			_timer -= delta
			if fmod(_timer, 0.12) < delta:
				Vfx.puff(_surface + Vector2(randf_range(-20, 20), -4), 1, Color(1, 1, 1, 0.8), Vector2.UP, 0.4)
			if _timer <= 0.0:
				st = St.LEAP
				global_position = _surface + Vector2(0, 30)
				var vy := -sqrt(2.0 * 2400.0 * leap_height)
				var air := 2.0 * -vy / 2400.0
				velocity = Vector2(leap_dx / air, vy)
				facing = 1 if leap_dx >= 0.0 else -1
				squash(Vector2(0.8, 1.2))
		St.LEAP:
			velocity.y += 2400.0 * delta
			if velocity.y > 0.0 and global_position.y > _surface.y + 30.0:
				st = St.LURK
				_timer = interval
				_surface.x = global_position.x
				leap_dx = -leap_dx
				Vfx.puff(_surface, 4, Color(1, 1, 1, 0.9), Vector2.UP, 0.8)


func _draw_body(ci: CanvasItem) -> void:
	var up := velocity.y < 0.0
	var rot := (-0.9 if up else 0.9) if st == St.LEAP else 0.0
	ci.draw_set_transform(Vector2(0, -17), rot, Vector2.ONE)
	var wag := sin(anim_time * 18.0) * 4.0
	# Tail fin, back fin.
	Art.shape(ci, PackedVector2Array([Vector2(-18, 0), Vector2(-34, -12 + wag), Vector2(-30, 0), Vector2(-34, 12 + wag)]), FIN, OUTLINE, 2.0)
	Art.shape(ci, PackedVector2Array([Vector2(-6, -14), Vector2(4, -26), Vector2(10, -13)]), FIN, OUTLINE, 2.0)
	# Body: round with a pale belly and an underbite full of teeth.
	Art.shape(ci, Art.ellipse(Vector2(0, 0), 22, 16, 18), SCALES, OUTLINE, 2.5)
	ci.draw_colored_polygon(Art.ellipse(Vector2(4, 7), 15, 7, 12), BELLY)
	Art.shape(ci, PackedVector2Array([Vector2(12, 4), Vector2(24, 2), Vector2(20, 12)]), BELLY.darkened(0.1), OUTLINE, 2.0)
	for k in 3:
		var x := 13.0 + k * 3.5
		ci.draw_colored_polygon(PackedVector2Array([Vector2(x, 4), Vector2(x + 3, 4), Vector2(x + 1.5, -1)]), Color.WHITE)
	Enemy.draw_eye(ci, Vector2(10, -5), 4.5, Vector2(1, 0), 1.0, is_stunned())
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
