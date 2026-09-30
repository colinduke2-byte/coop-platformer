@tool
class_name AcornDropper
extends Node2D
## A clump of acorns on a branch overhead. It rustles (the tell), then drops
## an acorn that bubbles whoever it lands on and splits on the ground. Punch a
## falling acorn to bat it at enemies! Origin = the branch.

@export var interval := 2.2                 ## s between drops
@export var warn_time := 0.5
@export var phase := 0.0
@export var only_when_near := 700.0         ## px: sleeps when no player is this close (0 = always)

const LEAF := Color("5aa846")
const ACORN := Color("b5733c")
const CAP := Color("6b4a2e")

var _timer := 0.0
var _t := 0.0


func _ready() -> void:
	_timer = interval - fposmod(phase, interval)


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	if only_when_near > 0.0 and not _player_near():
		return
	_timer -= delta
	if _timer <= 0.0:
		_timer = interval
		var a := Projectile.new()
		a.velocity = Vector2(0, 60)
		a.gravity_scale = 0.5
		a.color = ACORN
		a.lifetime = 3.0
		a.position = position + Vector2(0, 18)
		get_parent().add_child(a)


func _player_near() -> bool:
	for n in get_tree().get_nodes_in_group(&"players"):
		if (n as Node2D).global_position.distance_to(global_position) < only_when_near:
			return true
	return false


func _draw() -> void:
	var o := Color("1d1726")
	var shake := sin(_t * 50.0) * 3.0 if _timer < warn_time and not Engine.is_editor_hint() else 0.0
	for k: Vector3 in [Vector3(-30, -6, 26), Vector3(26, -8, 24), Vector3(0, -18, 30)]:
		Art.shape(self, Art.ellipse(Vector2(k.x + shake, k.y), k.z, k.z * 0.6, 16), LEAF.darkened(0.08 * (int(k.x) % 2)), o, 2.5)
	# The acorn about to drop.
	var grow := clampf(1.0 - _timer / interval, 0.3, 1.0) if not Engine.is_editor_hint() else 1.0
	var c := Vector2(shake, 14)
	Art.shape(self, Art.ellipse(c + Vector2(0, 4), 8 * grow, 10 * grow, 12), ACORN, o, 2.0)
	Art.shape(self, Art.ellipse(c + Vector2(0, -4 * grow), 10 * grow, 6 * grow, 12), CAP, o, 2.0)
