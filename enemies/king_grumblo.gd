class_name KingGrumblo
extends Enemy
## BOSS - KING GRUMBLO: an enormous crowned Grumblet. Waddles toward players,
## crouches, then HOPS and SLAMS down sending shockwaves both ways (jump them).
## Only vulnerable while dazed after a slam: stomp or punch him then.
## At half health he calls Grumblet minions. Wire his `defeated` signal (or a
## DefeatTrigger parent) to open the exit.

enum Mode { WALK, CROUCH, AIR, DAZED }

@export var walk_speed := 80.0
@export var hop_height := 380.0
@export var crouch_time := 0.55
@export var daze_time := 1.6
@export var minion_scene: PackedScene = preload("res://enemies/grunt.tscn")
@export var asleep := false                 ## snoozes (invulnerable, still) until set_active(true)
@export var boss_name := "KING GRUMBLO"

const BODY := Color("7a4bc4")
const BELLY := Color("d9c8f5")
const CROWN := Color("ffd23f")

var _mode := Mode.WALK
var _timer := 1.5
var _home := Vector2.INF   ## where he sleeps (set the first time he wakes)
var _max_health := 6


func _init() -> void:
	body_size = Vector2(120, 100)
	health = 6
	lum_drop = 12
	stomp_bounce = 1.0
	knockback_scale = 0.0
	stun_time = 0.0


func _setup() -> void:
	_max_health = health


## Wake up (a ZoneTrigger at the arena entrance usually does this).
## Everyone respawned (his ZoneTrigger sends false): back to his spot, asleep, damage kept.
func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		_mode = Mode.WALK
		stun_timer = 0.0
		_send_health()
		return
	if on:
		_timer = 1.0
		_send_health()
		squash(Vector2(0.8, 1.25))
		EventBus.screen_shake.emit(0.3)


func _behave(delta: float) -> void:
	if asleep:
		velocity.x = 0.0
		return
	_timer -= delta
	match _mode:
		Mode.WALK:
			var p := nearest_player()
			if p:
				face(p)
			velocity.x = facing * walk_speed * (1.5 if health <= _max_health / 2 else 1.0)
			if wall_ahead():
				velocity.x = 0.0
			if _timer <= 0.0 and is_on_floor():
				_mode = Mode.CROUCH
				_timer = crouch_time
		Mode.CROUCH:
			velocity.x = 0.0
			squash(Vector2(1.15, 0.85))
			if _timer <= 0.0:
				var p := nearest_player()
				var dx := (p.global_position.x - global_position.x) if p else 0.0
				velocity = Vector2(clampf(dx * 1.2, -420.0, 420.0), -sqrt(2.0 * gravity * hop_height))
				_mode = Mode.AIR
				squash(Vector2(0.8, 1.3))
		Mode.AIR:
			if is_on_floor() and velocity.y >= 0.0:
				_slam()
		Mode.DAZED:
			_mode = Mode.WALK  # stun wore off
			_timer = randf_range(1.2, 2.2)


func _slam() -> void:
	velocity = Vector2.ZERO
	squash(Vector2(1.4, 0.6))
	EventBus.screen_shake.emit(0.6)
	EventBus.player_ground_pounded.emit(null, global_position)  # reuse the dust ring
	for d: int in [-1, 1]:
		var w := Shockwave.new()
		w.dir = d
		w.position = position + Vector2(d * body_size.x * 0.5, 0)
		get_parent().add_child(w)
	_mode = Mode.DAZED
	stun_timer = daze_time
	if health <= _max_health / 2 and get_tree().get_nodes_in_group(&"enemies").size() < 4:
		for d: int in [-1, 1]:
			var m: Enemy = minion_scene.instantiate()
			m.position = position + Vector2(d * 160.0, -40.0)
			m.start_facing = d
			get_parent().add_child.call_deferred(m)


## Armoured unless dazed.
func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return asleep or not is_stunned()


func _on_stomped(by: Player) -> void:
	if is_stunned() and not asleep:
		damage(by, HitKind.STOMP, Vector2.ZERO)
		stun_timer = 0.0  # wakes up angry
		_mode = Mode.WALK
		_timer = 0.8


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


func _on_hurt(_by: Player, _kind: HitKind) -> void:
	stun_timer = 0.0
	_mode = Mode.WALK
	_timer = 0.8
	_send_health()


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	EventBus.screen_shake.emit(0.8)
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var walk := anim_time * 6.0
	var step := sin(walk) * 10.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	Art.shape(ci, Art.ellipse(Vector2(-26 + step, -10), 20, 12), BODY.darkened(0.4), OUTLINE)
	Art.shape(ci, Art.ellipse(Vector2(26 - step, -10), 20, 12), BODY.darkened(0.3), OUTLINE)
	Art.shape(ci, Art.ellipse(Vector2(0, -54), 64, 52), BODY, OUTLINE, 4.0)
	Art.shape(ci, Art.ellipse(Vector2(10, -38), 40, 28), BELLY, OUTLINE, 0.0)
	var dazed := is_stunned() or asleep
	Enemy.draw_eye(ci, Vector2(8, -76), 11.0, Vector2(1, 0), 0.0 if dazed else 1.0, dazed)
	Enemy.draw_eye(ci, Vector2(36, -74), 10.0, Vector2(1, 0), 0.0 if dazed else -1.0, dazed)
	if asleep:
		for i in 3:
			var k := fmod(anim_time * 0.6 + i / 3.0, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(50 + k * 40, -110 - k * 60), "Z",
					HORIZONTAL_ALIGNMENT_LEFT, -1, int(20 + k * 16), Color(1, 1, 1, 1.0 - k))
	ci.draw_line(Vector2(10, -44), Vector2(50, -48), OUTLINE, 4.0)
	for x: float in [20.0, 38.0]:
		Art.shape(ci, PackedVector2Array([Vector2(x - 5, -46), Vector2(x + 5, -47), Vector2(x, -58)]), EYE_WHITE, OUTLINE, 2.0)
	# Crown.
	var crown := PackedVector2Array([Vector2(-26, -100), Vector2(-30, -130), Vector2(-14, -114), Vector2(0, -136),
			Vector2(14, -114), Vector2(30, -130), Vector2(26, -100)])
	Art.shape(ci, crown, CROWN, OUTLINE, 3.0)
	for x: float in [-14.0, 0.0, 14.0]:
		ci.draw_circle(Vector2(x, -106), 4.0, Color("ff5d8f"))
	# Health pips.
	for i in _max_health:
		var c := Vector2((float(i) - (_max_health - 1) * 0.5) * 18.0, -150)
		Art.shape(ci, Art.ellipse(c, 6, 6, 10), Color("ff5d8f") if i < health else Color(0, 0, 0, 0.3), OUTLINE, 2.0)
