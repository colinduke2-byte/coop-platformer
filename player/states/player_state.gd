class_name PlayerState
extends Node
## Base class for one player move. Override what you need.
## Rules: read feel numbers from player.tuning, read input from player.input,
## and `return` right after calling machine.transition_to().

var player: Player
var machine: StateMachine


func enter(_previous: StringName) -> void:
	pass


func exit() -> void:
	pass


func physics_update(_delta: float) -> void:
	pass
