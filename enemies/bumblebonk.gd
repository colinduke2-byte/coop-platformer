class_name Bumblebonk
extends Enemy
## BUMBLEBONK: a round, grumpy bumblebee. Loops a lazy figure-eight around its
## home; when a player comes into range it stops, shivers (the tell!) and
## dashes straight at where they were. Dodge the dash, then stomp or punch it
## while it catches its breath.

enum St { HOVER, AIM, DASH, RECOVER }

@export var loop_size := Vector2(110, 26)   ## figure-eight half-size
@export var loop_speed := 1.6
@export var sight := 420.0
@export var aim_time := 0.5
@export var dash_speed := 720.0
@export var dash_time := 0.55
@export var recover_time := 0.8
@export var cooldown := 1.2

const BODY := Color("ffcf3f")
const STRIPE := Color("3b2b24")
const WING := Color(0.85, 0.95, 1.0, 0.75)

var st := St.HOVER
var _home := Vector2.ZERO
var _t := 0.0
var _timer := 0.0
var _cd := 0.0
var _dir := Vector2.ZERO


func _init() -> void:
	body_size = Vector2(40, 32)
	uses_gravity = false
	lum_drop = 2


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	_t += delta
	_cd = maxf(_cd - delta, 0.0)
	match st:
		St.HOVER:
			var a := _t * loop_speed
			var target := _home + Vector2(sin(a) * loop_size.x, sin(a * 2.0) * loop_size.y)
			velocity = (target - global_position) * 5.0
			if absf(velocity.x) > 5.0:
				facing = 1 if velocity.x > 0.0 else -1
			var p := nearest_player(sight)
			if p and _cd <= 0.0:
				st = St.AIM
				_timer = aim_time
				face(p)
				_dir = (p.global_position + Vector2(0, -28) - (global_position + Vector2(0, -16))).normalized()
		St.AIM:
			velocity = velocity.move_toward(Vector2.ZERO, 2000.0 * delta)
			_timer -= delta
			if _timer <= 0.0:
				st = St.DASH
				_timer = dash_time
				squash(Vector2(1.3, 0.8))
				EventBus.enemy_shot.emit(self)
		St.DASH:
			velocity = _dir * dash_speed
			_timer -= delta
			if _timer <= 0.0 or is_on_wall() or is_on_floor() or is_on_ceiling():
				if is_on_wall() or is_on_floor():
					squash(Vector2(0.7, 1.3))
				st = St.RECOVER
				_timer = recover_time
		St.RECOVER:
			velocity = velocity.move_toward(Vector2.ZERO, 1800.0 * delta)
			_timer -= delta
			if _timer <= 0.0:
				st = St.HOVER
				_cd = cooldown
				_home = global_position.lerp(_home, 0.5)  # drifts toward where it ended up


func _on_hurt(_by: Player, _kind: HitKind) -> void:
	st = St.RECOVER
	_timer = recover_time


func _draw_body(ci: CanvasItem) -> void:
	var shake := Vector2(randf_range(-2, 2), randf_range(-2, 2)) if st == St.AIM else Vector2.ZERO
	var c := Vector2(0, -17) + shake
	var flap := sin(anim_time * 60.0)
	# Wings (blurry: two overlapping shapes).
	for k in 2:
		var off := Vector2(-4 + k * 8, -16 - flap * 4.0)
		Art.shape(ci, Art.ellipse(c + off, 12, 7 + flap * 2.0, 12), WING, Color(OUTLINE, 0.5), 1.5)
	# Stinger.
	Art.shape(ci, PackedVector2Array([c + Vector2(-18, -3), c + Vector2(-30, 1), c + Vector2(-18, 5)]), STRIPE, OUTLINE, 2.0)
	# Round striped body.
	var body := Art.ellipse(c, 21, 16, 22)
	Art.shape(ci, body, BODY, OUTLINE, 3.0)
	for x: float in [-8.0, 2.0]:
		var band := Art.rect(c + Vector2(x, -20), c + Vector2(x + 5.0, 20))
		for piece in Geometry2D.intersect_polygons(body, band):
			ci.draw_colored_polygon(piece, STRIPE)
	ci.draw_polyline(_closed(body), OUTLINE, 3.0)
	ci.draw_circle(c + Vector2(-6, -8), 4.0, Color(1, 1, 1, 0.45))
	# Face on the front.
	var angry := 1.0 if st in [St.AIM, St.DASH] else 0.4
	Enemy.draw_eye(ci, c + Vector2(10, -4), 5.0, Vector2(1, 0.2), angry)
	# Antennae.
	for k in 2:
		var base := c + Vector2(6 + k * 6, -14)
		var tip := base + Vector2(4 + k * 4, -12 + sin(anim_time * 8.0 + k) * 2.0)
		ci.draw_line(base, tip, OUTLINE, 2.0)
		ci.draw_circle(tip, 2.5, OUTLINE)
	if st == St.AIM:
		ci.draw_string(ThemeDB.fallback_font, Vector2(-6, -52), "!", HORIZONTAL_ALIGNMENT_CENTER, -1, 28, Color("ff5d3f"))


static func _closed(pts: PackedVector2Array) -> PackedVector2Array:
	var p := pts.duplicate()
	p.append(pts[0])
	return p
