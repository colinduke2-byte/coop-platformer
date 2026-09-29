@tool
class_name DefeatTrigger
extends Node2D
## Arena lock helper: put enemies (or EnemySpawners) as CHILDREN of this node.
## When every child enemy is defeated (and every child spawner has finished),
## it fires its targets - e.g. open the Gate out of the arena.

signal cleared

@export var targets: Array[NodePath] = []:
	set(v):
		targets = v
		queue_redraw()

var _done := false


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint():
		queue_redraw()
		return
	if _done:
		return
	for c in get_children():
		if c is Enemy and not c.dead:
			return
		if c is EnemySpawner and not c.is_finished():
			return
	_done = true
	Activation.send(self, targets, true)
	cleared.emit()


func _draw() -> void:
	if not Engine.is_editor_hint():
		return
	for c in get_children():
		if c is Node2D:
			draw_line(Vector2.ZERO, to_local(c.global_position), Color(1, 0.4, 0.4, 0.6), 2.0)
	draw_circle(Vector2.ZERO, 10.0, Color(1, 0.4, 0.4, 0.9))
	Activation.draw_links(self, targets)
