class_name Diggle
extends Enemy
## DIGGLE: a mole in a miner's helmet who lives in a dirt mound. When a player
## gets close it pops up, lobs a dirt clod at them, then ducks back down.
## It can only be hit while it's up: punch it or stomp it. While hidden the
## mound is just a bump (safe to stand on).

enum St { HIDDEN, RISING, UP, SINKING }

@export var sight := 460.0
@export var up_time := 1.3                  ## s it stays up (throws once)
@export var hide_time := 1.4                ## s it waits underground between pops
@export var throw_speed := 460.0

const FUR := Color("7a5a48")
const FUR_LIGHT := Color("a88672")
const NOSE := Color("ff8fa8")
const HELMET := Color("f2c14e")
const DIRT := Color("8a5a36")

var st := St.HIDDEN
var rise := 0.0          ## 0 = hidden, 1 = fully up
var _timer := 0.0
var _thrown := false


func _init() -> void:
	body_size = Vector2(44, 30)
	lum_drop = 2
	stomp_bounce = 0.9


func _behave(delta: float) -> void:
	velocity.x = 0.0
	_timer -= delta
	match st:
		St.HIDDEN:
			rise = 0.0
			contact_hurts = false
			var p := nearest_player(sight, 260.0)
			if p and _timer <= 0.0:
				st = St.RISING
				face(p)
		St.RISING:
			rise = minf(rise + delta * 5.0, 1.0)
			if rise >= 1.0:
				st = St.UP
				_timer = up_time
				_thrown = false
				contact_hurts = true
		St.UP:
			var p := nearest_player(sight + 100.0, 400.0)
			if p:
				face(p)
			if not _thrown and _timer < up_time - 0.35 and p:
				_thrown = true
				_throw_at(p)
			if _timer <= 0.0:
				st = St.SINKING
		St.SINKING:
			contact_hurts = false
			rise = maxf(rise - delta * 5.0, 0.0)
			if rise <= 0.0:
				st = St.HIDDEN
				_timer = hide_time


## Lob a clod that lands near the target (simple ballistic aim).
func _throw_at(p: Player) -> void:
	var from := global_position + Vector2(facing * 14.0, -40.0)
	var to := p.global_position + Vector2(0, -20)
	var dx := to.x - from.x
	var t := clampf(absf(dx) / throw_speed, 0.45, 1.1)
	var g := 2400.0 * 0.6
	var vy := (to.y - from.y - 0.5 * g * t * t) / t
	var clod := shoot(Vector2(14, -40), Vector2(dx / t, vy), Vector2(dx / t, vy).length(), 0.6)
	clod.color = DIRT
	squash(Vector2(0.8, 1.25))


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return rise < 0.6


func take_hit(by: Player, knockback: Vector2) -> void:
	if rise < 0.6:
		return  # underground: punches just thump the dirt
	super(by, knockback)


func _on_stomped(by: Player) -> void:
	if rise >= 0.6:
		damage(by, HitKind.STOMP, Vector2.ZERO)


func _on_hurt(_by: Player, _kind: HitKind) -> void:
	st = St.SINKING


func _draw_body(ci: CanvasItem) -> void:
	# The mole (drawn first so the mound covers its lower half).
	if rise > 0.02:
		var y := lerpf(10.0, -30.0, rise)
		var body := Art.ellipse(Vector2(0, y), 18, 22, 18)
		Art.shape(ci, body, FUR, OUTLINE, 2.5)
		Art.shape(ci, Art.ellipse(Vector2(6, y + 6), 10, 12, 14), FUR_LIGHT, OUTLINE, 0.0)
		# Paws.
		for k in 2:
			Art.shape(ci, Art.ellipse(Vector2(-6 + k * 22, y + 12), 7, 5, 10), NOSE, OUTLINE, 2.0)
		# Helmet + lamp.
		Art.shape(ci, PackedVector2Array([Vector2(-19, y - 10), Vector2(-15, y - 24), Vector2(0, y - 29), Vector2(15, y - 24), Vector2(19, y - 10)]), HELMET, OUTLINE, 2.5)
		ci.draw_circle(Vector2(8, y - 20), 5.0, Color("fff7c2"))
		ci.draw_circle(Vector2(8, y - 20), 10.0, Color(1, 1, 0.7, 0.25))
		# Squinty eyes + big pink nose.
		ci.draw_line(Vector2(0, y - 6), Vector2(6, y - 5), OUTLINE, 2.5)
		ci.draw_line(Vector2(11, y - 5), Vector2(16, y - 6), OUTLINE, 2.5)
		Art.shape(ci, Art.ellipse(Vector2(17, y + 1), 6, 5, 12), NOSE, OUTLINE, 2.0)
	# Dirt mound.
	var mound := PackedVector2Array([Vector2(-30, 0), Vector2(-22, -12), Vector2(-8, -18), Vector2(10, -17), Vector2(24, -10), Vector2(30, 0)])
	Art.shape(ci, mound, DIRT, OUTLINE, 2.5)
	for p: Vector2 in [Vector2(-14, -8), Vector2(4, -11), Vector2(16, -5)]:
		ci.draw_circle(p, 2.5, DIRT.darkened(0.3))
