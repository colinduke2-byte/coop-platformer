class_name Shellbert
extends Enemy
## SHELLBERT: a slow, smug snail with a spiral shell.
##  - Stomp or punch it: it hides in its shell (harmless).
##  - Touch or punch the shell: it rockets along the ground, bouncing off walls,
##    knocking out enemies and smashing crates in its path.
##  - Stomp a spinning shell to stop it. After a few wall bounces it cracks
##    apart in a shower of Lums. Left alone, the snail peeks out and walks on.
## Spinning shells never hurt players (co-op friendly). Ground pound = defeat.

enum St { WALK, SHELL, SPIN }

@export var walk_speed := 55.0
@export var spin_speed := 640.0
@export var shell_time := 5.0               ## s hidden before it walks again
@export var max_bounces := 4                ## wall bounces before the shell cracks

const SHELL := Color("f08a4b")
const SHELL_DARK := Color("b85a2a")
const SHELL_LIGHT := Color("ffc38f")
const SKIN := Color("b8e07a")
const SKIN_DARK := Color("86b34e")

var st := St.WALK
var _shell_t := 0.0
var _bounces := 0
var _kick_cd := 0.0
var _spin_angle := 0.0
var _spin_area: Area2D


func _init() -> void:
	body_size = Vector2(46, 34)
	health = 3
	lum_drop = 4
	stomp_bounce = 0.8


func _setup() -> void:
	# Detects enemies and crates while spinning (layer 3 = enemies / punchables).
	_spin_area = Area2D.new()
	_spin_area.collision_layer = 0
	_spin_area.collision_mask = 4
	_spin_area.monitorable = false
	var s := RectangleShape2D.new()
	s.size = body_size + Vector2(14, 0)
	var c := CollisionShape2D.new()
	c.shape = s
	c.position = Vector2(0, -body_size.y * 0.5)
	_spin_area.add_child(c)
	add_child(_spin_area)


func _behave(delta: float) -> void:
	_kick_cd = maxf(_kick_cd - delta, 0.0)
	match st:
		St.WALK:
			contact_hurts = true
			patrol(walk_speed)
		St.SHELL:
			contact_hurts = false
			velocity.x = move_toward(velocity.x, 0.0, 1600.0 * delta)
			_shell_t -= delta
			if _shell_t <= 0.0:
				st = St.WALK
				squash(Vector2(0.85, 1.2))
			elif _kick_cd <= 0.0:
				# Walk into the shell from the side = kick it.
				for body in _hitbox.get_overlapping_bodies():
					var p := body as Player
					if p and not p.is_bubbled() and p.global_position.y > global_position.y - body_size.y * 0.45:
						_kick(1 if global_position.x > p.global_position.x else -1)
						break
		St.SPIN:
			contact_hurts = false
			_spin_angle += delta * spin_speed / 16.0 * facing
			if is_on_wall():
				facing = -facing
				_bounces += 1
				squash(Vector2(0.7, 1.2))
				EventBus.screen_shake.emit(0.15)
				if _bounces >= max_bounces:
					die(null, HitKind.HAZARD, Vector2(0, -300))
					return
			velocity.x = facing * spin_speed
			for body in _spin_area.get_overlapping_bodies():
				_smash(body)
			for area in _spin_area.get_overlapping_areas():
				_smash(area)


func _smash(n: Node) -> void:
	if n == self or not n.has_method(&"take_hit"):
		return
	if n is Enemy:
		var e := n as Enemy
		if e.dead:
			return
		e.damage(null, HitKind.PROJECTILE, Vector2(facing * 360.0, -320.0))
	elif not n is Projectile:
		n.take_hit(null, Vector2(facing * 300.0, -200.0))


func _kick(dir: int) -> void:
	st = St.SPIN
	facing = dir
	_bounces = 0
	_kick_cd = 0.25
	squash(Vector2(1.3, 0.8))
	EventBus.enemy_hit.emit(self, null)


func _hide() -> void:
	st = St.SHELL
	_shell_t = shell_time
	_kick_cd = 0.3
	velocity.x = 0.0
	squash(Vector2(1.25, 0.75))


func _on_stomped(by: Player) -> void:
	match st:
		St.WALK:
			_hide()
			EventBus.enemy_hit.emit(self, by)
		St.SPIN:
			_hide()
		St.SHELL:
			_kick(1 if global_position.x > by.global_position.x else -1)


func take_hit(by: Player, knockback: Vector2) -> void:
	if dead:
		return
	if by and by.state_machine.current_name() == &"GroundPound":
		damage(by, HitKind.POUND, Vector2.ZERO)
		die(by, HitKind.POUND, Vector2.ZERO)
		return
	var dir := 1
	if by:
		dir = 1 if global_position.x > by.global_position.x else -1
	elif knockback.x != 0.0:
		dir = int(signf(knockback.x))
	match st:
		St.WALK:
			_hide()
			velocity.x = dir * 160.0
			hit_flash = 1.0
			EventBus.enemy_hit.emit(self, by)
		_:
			_kick(dir)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	# Shots, other shells and hazards: straight into the shell.
	if kind in [HitKind.PROJECTILE, HitKind.HAZARD] and st == St.WALK and health > 0:
		hit_flash = 1.0
		_hide()
		return
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var peek := st == St.SHELL and _shell_t < 1.0
	var wobble := sin(anim_time * 30.0) * 2.0 if peek else 0.0
	if st == St.WALK:
		var crawl := sin(anim_time * 6.0)
		# Squishy foot/body.
		var body := PackedVector2Array([
			Vector2(-24, 0), Vector2(-26, -8), Vector2(-10, -12), Vector2(14, -12),
			Vector2(22, -20 + crawl), Vector2(28, -24 + crawl), Vector2(30, -14), Vector2(28, 0)])
		Art.shape(ci, body, SKIN, OUTLINE, 2.5)
		ci.draw_line(Vector2(-20, -3), Vector2(24, -3), SKIN_DARK, 3.0)
		# Eye stalks.
		for k in 2:
			var base := Vector2(22 + k * 6, -22 + crawl)
			var tip := base + Vector2(4 + k * 3, -16 + sin(anim_time * 4.0 + k) * 2.0)
			ci.draw_line(base, tip, OUTLINE, 5.0)
			ci.draw_line(base, tip, SKIN, 3.0)
			Enemy.draw_eye(ci, tip, 4.2, Vector2(1, 0.2), 0.0)
		# Smug little smile.
		ci.draw_arc(Vector2(26, -15 + crawl), 4.0, 0.2, 2.2, 8, OUTLINE, 2.0)
	_draw_shell(ci, Vector2(-4 + wobble, -20), st == St.SPIN)
	if peek:
		Enemy.draw_eye(ci, Vector2(12 + wobble, -16), 3.5, Vector2(1, 0), 0.0)


func _draw_shell(ci: CanvasItem, c: Vector2, spinning: bool) -> void:
	var r := 19.0
	Art.shape(ci, Art.ellipse(c, r, r, 22), SHELL, OUTLINE, 3.0)
	ci.draw_arc(c, r - 4.0, PI * 0.9, PI * 1.6, 10, SHELL_LIGHT, 3.0)
	# Spiral (rotates while spinning).
	var pts := PackedVector2Array()
	var a0 := _spin_angle if spinning else 0.0
	for i in 26:
		var t := float(i) / 25.0
		var a := a0 + t * TAU * 1.6
		pts.append(c + Vector2(cos(a), sin(a)) * (2.0 + t * (r - 6.0)))
	ci.draw_polyline(pts, SHELL_DARK, 3.0)
	if spinning:
		for k in 3:
			var y := c.y - 10.0 + k * 10.0
			ci.draw_line(Vector2(c.x - r - 8.0 - k * 6.0, y), Vector2(c.x - r - 26.0 - k * 6.0, y), Color(1, 1, 1, 0.7), 2.5)
