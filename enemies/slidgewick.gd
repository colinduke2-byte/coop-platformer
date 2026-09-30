class_name Slidgewick
extends Enemy
## SLIDGEWICK: a pompous penguin in a bobble hat. Waddles about; when it spots
## a player on its level it flaps its flippers (the tell!) and TOBOGGANS at them
## on its belly, bouncing off one wall. A sliding penguin can be stomped (it
## skids to a stop, dazed) but not punched from the front - its beak is too hard.
## Punch it while it waddles, or once it's stopped.

enum St { WADDLE, FLAP, SLIDE, SKID }

@export var walk_speed := 60.0
@export var slide_speed := 620.0
@export var sight := 420.0
@export var flap_time := 0.45
@export var slide_time := 2.6
@export var skid_time := 1.4

const BODY := Color("26314a")
const BELLY := Color("f4fbff")
const BEAK := Color("ffb13f")
const HAT := Color("ff5d5d")

var st := St.WADDLE
var _timer := 0.0
var _bounced := false


func _init() -> void:
	body_size = Vector2(46, 44)
	lum_drop = 2


func _behave(delta: float) -> void:
	_timer -= delta
	match st:
		St.WADDLE:
			contact_hurts = true
			patrol(walk_speed)
			var p := nearest_player(sight, 60.0)
			if p and is_on_floor() and signf(p.global_position.x - global_position.x) == facing:
				st = St.FLAP
				_timer = flap_time
				velocity.x = 0.0
		St.FLAP:
			velocity.x = 0.0
			if _timer <= 0.0:
				st = St.SLIDE
				_timer = slide_time
				_bounced = false
				squash(Vector2(1.4, 0.6))
		St.SLIDE:
			contact_hurts = true
			velocity.x = facing * slide_speed
			if fmod(anim_time, 0.08) < delta:
				Vfx.puff(global_position + Vector2(-facing * 20.0, -4), 1, Color(1, 1, 1, 0.9), Vector2(-facing, -0.5).normalized(), 0.6)
			if is_on_wall():
				if _bounced:
					_skid()
				else:
					_bounced = true
					facing = -facing
					squash(Vector2(0.7, 1.2))
					EventBus.screen_shake.emit(0.12)
			elif _timer <= 0.0 or not floor_ahead():
				_skid()
		St.SKID:
			contact_hurts = false
			velocity.x = move_toward(velocity.x, 0.0, 1400.0 * delta)
			if _timer <= 0.0:
				st = St.WADDLE


func _skid() -> void:
	st = St.SKID
	_timer = skid_time


func _on_stomped(by: Player) -> void:
	if st == St.SLIDE:
		# Stomping a tobogganing penguin stops it cold (dazed) instead of popping it.
		_skid()
		stun_timer = skid_time
		velocity.x = facing * 200.0
		squash(Vector2(1.5, 0.5))
		EventBus.enemy_hit.emit(self, by)
		return
	super(by)


func blocks_hit(by: Player, kind: HitKind) -> bool:
	# Its hard beak shrugs off punches from the front while it slides.
	return st == St.SLIDE and kind == HitKind.PUNCH and by and signf(by.global_position.x - global_position.x) == facing


func _draw_body(ci: CanvasItem) -> void:
	var sliding := st == St.SLIDE or (st == St.SKID and absf(velocity.x) > 40.0)
	if sliding:
		# On its belly, flippers back, beak forward.
		ci.draw_set_transform(Vector2(0, -16), 0.0, Vector2.ONE)
		Art.shape(ci, Art.ellipse(Vector2.ZERO, 34, 17, 20), BODY, OUTLINE, 2.5)
		ci.draw_colored_polygon(Art.ellipse(Vector2(0, 6), 28, 9, 16), BELLY)
		Art.shape(ci, PackedVector2Array([Vector2(30, -4), Vector2(46, 0), Vector2(30, 4)]), BEAK, OUTLINE, 2.0)
		Art.shape(ci, PackedVector2Array([Vector2(-6, -12), Vector2(-30, -20), Vector2(-14, -6)]), BODY, OUTLINE, 2.0)
		Art.shape(ci, Art.ellipse(Vector2(12, -14), 11, 8, 12), HAT, OUTLINE, 2.0)
		ci.draw_circle(Vector2(4, -20), 5.0, BELLY)
		Enemy.draw_eye(ci, Vector2(22, -6), 3.5, Vector2(1, 0), 0.5)
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		return
	var step := sin(anim_time * 12.0) * 3.0 if absf(velocity.x) > 1.0 else 0.0
	var tilt := sin(anim_time * 12.0) * 0.08 if absf(velocity.x) > 1.0 else 0.0
	ci.draw_set_transform(Vector2.ZERO, tilt, Vector2.ONE)
	Enemy.draw_foot(ci, Vector2(-8 + step, -2), BEAK)
	Enemy.draw_foot(ci, Vector2(10 - step, -2), BEAK)
	Art.shape(ci, Art.ellipse(Vector2(0, -24), 22, 26, 20), BODY, OUTLINE, 2.5)
	ci.draw_colored_polygon(Art.ellipse(Vector2(5, -20), 14, 19, 16), BELLY)
	# Flippers: flapping hard during the tell.
	var flap := sin(anim_time * 40.0) * 0.9 if st == St.FLAP else 0.2
	for d: float in [-1.0, 1.0]:
		var base := Vector2(d * 18.0, -28)
		var tip := base + Vector2(d * 14.0, 16).rotated(-d * flap)
		Art.shape(ci, PackedVector2Array([base + Vector2(0, -6), tip, base + Vector2(0, 8)]), BODY, OUTLINE, 2.0)
	Art.shape(ci, PackedVector2Array([Vector2(12, -34), Vector2(26, -31), Vector2(12, -28)]), BEAK, OUTLINE, 2.0)
	if st == St.SKID or is_stunned():
		ci.draw_arc(Vector2(6, -38), 3.5, 0, TAU * 0.8, 8, OUTLINE, 1.5)
	else:
		Enemy.draw_eye(ci, Vector2(6, -38), 4.0, Vector2(1, 0), 0.45)
	# Bobble hat.
	Art.shape(ci, PackedVector2Array([Vector2(-16, -44), Vector2(16, -44), Vector2(8, -60), Vector2(-8, -60)]), HAT, OUTLINE, 2.0)
	ci.draw_rect(Rect2(-17, -48, 34, 6), BELLY)
	Art.shape(ci, Art.ellipse(Vector2(0, -63), 6, 6, 10), BELLY, OUTLINE, 1.5)
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
