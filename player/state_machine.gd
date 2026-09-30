class_name StateMachine
extends Node
## Holds PlayerState children and runs exactly one at a time.
## Add a move: create player/states/<move>.gd extending PlayerState,
## add a Node child named after it in player.tscn, transition to it by name.

signal state_changed(from: StringName, to: StringName)

var current: PlayerState
## Online puppets (Player.remote) don't run states: they show the state their
## owner's browser reports in puppet_name, and ignore transitions.
var puppet := false
var puppet_name := &"Fall"
var _states: Dictionary = {}  ## StringName -> PlayerState
var _names: Array[StringName] = []


func setup(player: Player) -> void:
	for child in get_children():
		if child is PlayerState:
			child.player = player
			child.machine = self
			_states[StringName(child.name)] = child
			_names.append(StringName(child.name))


func start(state_name: StringName) -> void:
	current = _states[state_name]
	current.enter(&"")


func transition_to(state_name: StringName) -> void:
	if puppet:
		return
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
	if puppet:
		return puppet_name
	return current.name if current else &""


## Stable number for a state (same on every machine: the child order) - for net packets.
func index_of(state_name: StringName) -> int:
	return _names.find(state_name)


func name_at(index: int) -> StringName:
	return _names[index] if index >= 0 and index < _names.size() else &"Fall"


func physics_update(delta: float) -> void:
	if current and not puppet:
		current.physics_update(delta)
