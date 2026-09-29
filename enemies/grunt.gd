class_name Grunt
extends Enemy
## GRUMBLET: grumpy purple blob that stomps back and forth. Spot a player in
## front of it and it does a little "!" hop, then charges for a moment.
## Stomp it, punch it, slide into it. The basic enemy - use lots.

@export var walk_speed := 90.0
@export var chase_speed := 190.0
@export var sight := 300.0                  ## px it notices players ahead
@export var chase_time := 1.4

const BODY := Color("8a5cc7")
const BELLY := Color("c9b3f0")

var _alert := 0.0      ## > 0: surprised hop in progress
var _chase := 0.0


func _init() -> void:
	body_size = Vector2(44, 40)


func _behave(delta: float) -> void:
	if _alert > 0.0:
		_alert -= delta
		velocity.x = 0.0
		if _alert <= 0.0:
			_chase = chase_time
		return
	if _chase > 0.0:
		_chase -= delta
		patrol(chase_speed)
		return
	patrol(walk_speed)
	var p := nearest_player(sight, 60.0)
	if p and is_on_floor() and signf(p.global_position.x - global_position.x) == facing:
		_alert = 0.35
		velocity.y = -380.0
		squash(Vector2(0.8, 1.25))


func _draw_body(ci: CanvasItem) -> void:
	var walk := anim_time * (16.0 if _chase > 0.0 else 9.0)
	var step := sin(walk) * 5.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	Enemy.draw_foot(ci, Vector2(-9 + step, -4), BODY.darkened(0.4))
	Enemy.draw_foot(ci, Vector2(9 - step, -4), BODY.darkened(0.3))
	var bob := absf(sin(walk)) * -2.0
	Art.shape(ci, Art.ellipse(Vector2(0, -22 + bob), 25, 21), BODY, OUTLINE)
	Art.shape(ci, Art.ellipse(Vector2(5, -15 + bob), 15, 11), BELLY, OUTLINE, 0.0)
	var angry := 1.0 if _chase > 0.0 or _alert > 0.0 else 0.5
	Enemy.draw_eye(ci, Vector2(4, -30 + bob), 5.5, Vector2(1, 0), angry)
	Enemy.draw_eye(ci, Vector2(16, -29 + bob), 5.0, Vector2(1, 0), -angry)
	# Underbite with one tooth.
	ci.draw_line(Vector2(6, -17 + bob), Vector2(22, -19 + bob), OUTLINE, 2.5)
	Art.shape(ci, PackedVector2Array([Vector2(15, -19 + bob), Vector2(19, -19.5 + bob), Vector2(17, -25 + bob)]), EYE_WHITE, OUTLINE, 1.5)
	if _alert > 0.0:
		ci.draw_string(ThemeDB.fallback_font, Vector2(-6, -60), "!", HORIZONTAL_ALIGNMENT_CENTER, -1, 30, Color("ffd23f"))
