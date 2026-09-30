class_name Ribbiton
extends Enemy
## RIBBITON: a round, cheerful frog that hops toward the nearest player in big
## arcs. Stomping it doesn't hurt it - it's a living trampoline and launches
## you way up (use it to reach high places!). Punch it twice to knock it out.
## Touching its sides still bubbles you.

@export var sit_time := 1.4                 ## s between hops
@export var hop := Vector2(230, -760)       ## hop velocity (x toward the target)
@export var sight := 620.0
@export var spring := 1.5                   ## stomp bounce (x jump velocity)

const SKIN := Color("62c46a")
const SKIN_DARK := Color("3e9447")
const BELLY := Color("e4f5a8")
const MOUTH := Color("c93a69")

var _sit := 0.0
var _boing := 0.0        ## throat / squash anim after being bounced on


func _init() -> void:
	body_size = Vector2(48, 34)
	health = 2
	lum_drop = 2


func _setup() -> void:
	stomp_bounce = spring
	_sit = randf_range(0.3, sit_time)


func _behave(delta: float) -> void:
	_boing = maxf(_boing - delta * 3.0, 0.0)
	if not is_on_floor():
		return  # keep the hop's momentum
	velocity.x = move_toward(velocity.x, 0.0, 3000.0 * delta)
	_sit -= delta
	if _sit <= 0.0:
		_sit = sit_time * randf_range(0.85, 1.2)
		var p := nearest_player(sight, 400.0)
		if p:
			face(p)
		elif wall_ahead() or not floor_ahead():
			facing = -facing
		velocity = Vector2(facing * hop.x, hop.y)
		squash(Vector2(0.75, 1.3))


func _on_stomped(by: Player) -> void:
	# A full, uncuttable launch (like a bounce pad), whatever the jump button does.
	by.launch(Vector2(by.velocity.x, by.tuning.jump_velocity() * spring))
	_boing = 1.0
	squash(Vector2(1.5, 0.55))
	EventBus.enemy_blocked.emit(self, by)  # (boing sound, no damage)


func _draw_body(ci: CanvasItem) -> void:
	var air := not is_on_floor()
	var breathe := sin(anim_time * 5.0) * 1.5
	# Legs.
	if air:
		for k in 2:
			ci.draw_line(Vector2(-10 + k * 6, -10), Vector2(-26 + k * 4, 4), OUTLINE, 7.0)
			ci.draw_line(Vector2(-10 + k * 6, -10), Vector2(-26 + k * 4, 4), SKIN_DARK, 5.0)
	else:
		Art.shape(ci, Art.ellipse(Vector2(-16, -8), 12, 8, 12), SKIN_DARK, OUTLINE, 2.5)
		Art.shape(ci, Art.ellipse(Vector2(14, -4), 7, 4, 10), SKIN_DARK, OUTLINE, 2.0)
	# Body.
	var body := Art.ellipse(Vector2(0, -16), 24, 16 + breathe * 0.3, 22)
	Art.shape(ci, body, SKIN, OUTLINE, 3.0)
	Art.shape(ci, Art.ellipse(Vector2(8, -11), 14, 9, 16), BELLY, OUTLINE, 0.0)
	# Throat puff.
	var puff := 4.0 + breathe + _boing * 10.0
	Art.shape(ci, Art.ellipse(Vector2(16, -6), puff, puff * 0.8, 12), BELLY.lightened(0.2), OUTLINE, 1.5)
	# Big eyes on top.
	for k in 2:
		var ec := Vector2(-2 + k * 16, -32)
		Art.shape(ci, Art.ellipse(ec, 8, 8, 14), SKIN, OUTLINE, 2.5)
		Enemy.draw_eye(ci, ec + Vector2(1, -1), 5.0, Vector2(1, 0), 0.0, _boing > 0.5)
	# Wide grin.
	ci.draw_arc(Vector2(10, -18), 12.0, 0.25, 1.6, 12, OUTLINE, 2.5)
	ci.draw_circle(Vector2(-10, -20), 2.0, SKIN_DARK)
	ci.draw_circle(Vector2(-4, -24), 1.6, SKIN_DARK)
