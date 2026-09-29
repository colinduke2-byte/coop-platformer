class_name Activation
## Wiring for level logic. A *trigger* (PunchSwitch, PressurePlate, ZoneTrigger,
## DefeatTrigger...) has `targets: Array[NodePath]` and calls send() when it
## changes. A *target* is any node with `set_active(on: bool)`: MovingPlatform,
## Gate, Spawner, another trigger... Write your own by adding set_active().
## Triggers also emit EventBus.switch_toggled so audio/VFX can react.


static func send(from: Node, targets: Array[NodePath], on: bool) -> void:
	for path in targets:
		var t := from.get_node_or_null(path)
		if t == null:
			push_warning("%s: target %s not found" % [from.name, path])
		elif t.has_method(&"set_active"):
			t.set_active(on)
		else:
			push_warning("%s: target %s has no set_active()" % [from.name, t.name])
	EventBus.switch_toggled.emit(from as Node2D, on)


## Editor helper: dotted lines from a trigger to each target.
static func draw_links(from: CanvasItem, targets: Array[NodePath], color := Color(1, 0.9, 0.3, 0.8)) -> void:
	if not Engine.is_editor_hint():
		return
	for path in targets:
		var t := from.get_node_or_null(path) as Node2D
		if t:
			var end: Vector2 = (from as Node2D).to_local(t.global_position)
			Art.dotted(from, PackedVector2Array([Vector2.ZERO, end]), color, 12.0, 3.0)
			from.draw_circle(end, 7.0, color)
