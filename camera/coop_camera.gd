class_name CoopCamera
extends Camera2D
## One shared camera for every player: frames the living players, zooms out
## as they spread, and bubbles anyone left off-screen too long (co-op only).

@export var margin := Vector2(300.0, 220.0)   ## px of breathing room around players
@export var vertical_bias := -70.0            ## look slightly above the group
@export var min_zoom := 0.5                   ## furthest zoom-out
@export var max_zoom := 1.0                   ## closest zoom-in
@export var follow_speed := 6.0
@export var zoom_speed := 2.5
@export var offscreen_grace := 1.5            ## s before a straggler is bubbled
@export var shake_max_offset := 28.0          ## px at full trauma
@export var shake_max_roll := 0.025           ## rad at full trauma
@export var shake_decay := 2.2                ## trauma lost per second

var _offscreen_time: Dictionary = {}
var _trauma := 0.0


func _ready() -> void:
	ignore_rotation = false
	EventBus.level_reset.connect(snap)
	EventBus.screen_shake.connect(add_trauma)
	EventBus.player_joined.connect(func(_p: Player) -> void: _offscreen_time.clear())


func _physics_process(delta: float) -> void:
	var targets := _targets()
	if targets.is_empty():
		return
	var rect := _bounds(targets)
	var desired := rect.get_center() + Vector2(0.0, vertical_bias)
	global_position = global_position.lerp(desired, clampf(follow_speed * delta, 0.0, 1.0))
	var z := _zoom_for(rect)
	zoom = zoom.lerp(Vector2(z, z), clampf(zoom_speed * delta, 0.0, 1.0))
	_check_stragglers(delta)


## Shake the screen. Trauma stacks (capped at 1); the shake is trauma squared,
## so small bumps stay subtle and big hits really rattle.
func add_trauma(amount: float) -> void:
	_trauma = clampf(_trauma + amount, 0.0, 1.0)


func _process(delta: float) -> void:
	_trauma = maxf(_trauma - shake_decay * delta, 0.0)
	var s := _trauma * _trauma
	offset = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * shake_max_offset * s
	rotation = randf_range(-1.0, 1.0) * shake_max_roll * s


## Jump straight to the target framing (after respawn / level load).
func snap() -> void:
	var targets := _targets()
	if targets.is_empty():
		return
	var rect := _bounds(targets)
	global_position = rect.get_center() + Vector2(0.0, vertical_bias)
	var z := _zoom_for(rect)
	zoom = Vector2(z, z)
	reset_smoothing()


func _targets() -> Array:
	var all := get_tree().get_nodes_in_group(&"players")
	var alive := all.filter(func(p: Node) -> bool: return not p.is_bubbled())
	return alive if not alive.is_empty() else all


func _bounds(targets: Array) -> Rect2:
	var rect := Rect2(targets[0].global_position, Vector2.ZERO)
	for p: Node2D in targets:
		rect = rect.expand(p.global_position)
	return rect


func _zoom_for(rect: Rect2) -> float:
	var view := get_viewport_rect().size
	var needed := rect.size + margin * 2.0
	return clampf(minf(view.x / needed.x, view.y / needed.y), min_zoom, max_zoom)


func _check_stragglers(delta: float) -> void:
	var players := get_tree().get_nodes_in_group(&"players")
	if players.size() < 2:
		return
	var half := get_viewport_rect().size / zoom / 2.0
	var view := Rect2(get_screen_center_position() - half, half * 2.0).grow(40.0)
	for p: Player in players:
		if p.is_bubbled() or view.has_point(p.global_position):
			_offscreen_time.erase(p)
			continue
		_offscreen_time[p] = _offscreen_time.get(p, 0.0) + delta
		if _offscreen_time[p] > offscreen_grace:
			_offscreen_time.erase(p)
			p.hurt()
