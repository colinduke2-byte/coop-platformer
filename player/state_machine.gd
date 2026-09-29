class_name StateMachine
extends Node
## Holds PlayerState children and runs exactly one at a time.
## Add a move: create player/states/<move>.gd extending PlayerState,
## add a Node child named after it in player.tscn, transition to it by name.

signal state_changed(from: StringName, to: StringName)

var current: PlayerState
var _states: Dictionary = {}  ## StringName -> PlayerState


func setup(player: Player) -> void:
	for child in get_children():
		if child is PlayerState:
			child.player = player
			child.machine = self
			_states[StringName(child.name)] = child


func start(state_name: StringName) -> void:
	current = _states[state_name]
	current.enter(&"")


func transition_to(state_name: StringName) -> void:
	if not _states.has(state_name):
		push_error("StateMachine: unknown state '%s'" % state_name)
		return
	var prev: StringName = current.name if current else &""
	if current:
		current.exit()
	current = _states[state_name]
	current.enter(prev)
	state_changed.emit(prev, state_name)


func current_name() -> StringName:
	return current.name if current else &""


func physics_update(delta: float) -> void:
	if current:
		current.physics_update(delta)
