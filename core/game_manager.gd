extends Node
## Owns the session: who has joined, the current level, checkpoints,
## the shared Lum counter, and the "everyone is bubbled -> restart" rule.

const PLAYER_SCENE := preload("res://player/player.tscn")
## Slot -> character (P1 Mumbleby, P2 Sir Dinkworth, P3 Tootle, P4 Gribble).
const CHARACTERS: Array[CharacterDef] = [
	preload("res://characters/mumbleby.tres"),
	preload("res://characters/sir_dinkworth.tres"),
	preload("res://characters/tootle.tres"),
	preload("res://characters/gribble.tres"),
]
const RESPAWN_DELAY := 1.0
const CHARACTER_SELECT := "res://ui/character_select.tscn"

var players: Dictionary = {}  ## slot -> Player
var chosen_characters: Dictionary = {}  ## slot -> CharacterDef (set by character select)
var lums := 0
var lums_by_slot: Dictionary = {}  ## slot -> Lums that player grabbed (results screen)
var checkpoint := Vector2.ZERO
var level: Level

var _respawning := false


func _ready() -> void:
	InputRouter.join_requested.connect(_on_join_requested)
	EventBus.player_died.connect(_on_player_died)
	EventBus.lum_collected.connect(_on_lum_collected)
	EventBus.checkpoint_reached.connect(_on_checkpoint_reached)


func register_level(new_level: Level) -> void:
	level = new_level
	players.clear()
	checkpoint = level.get_spawn_position()
	for slot in InputRouter.get_bound_slots():
		spawn_player(slot)


## `at` = where to put them (default: next to a living teammate, or the checkpoint).
func spawn_player(slot: int, at := Vector2.INF) -> Player:
	if level == null:
		return null
	if players.has(slot) and is_instance_valid(players[slot]):
		return players[slot]
	var p: Player = PLAYER_SCENE.instantiate()
	p.setup(slot, character_for(slot))
	# Position BEFORE entering the tree so physics never sees it at the old spot.
	p.position = level.players_root.to_local(_join_position() if at == Vector2.INF else at)
	level.players_root.add_child(p)
	players[slot] = p
	EventBus.player_joined.emit(p)
	return p


## The slot's picked character, or the default for that slot if none was picked.
func character_for(slot: int) -> CharacterDef:
	if chosen_characters.has(slot):
		return chosen_characters[slot]
	return CHARACTERS[slot % CHARACTERS.size()]


func unregister_level(old_level: Level) -> void:
	if level == old_level:
		level = null
		players.clear()


func living_players() -> Array[Player]:
	var result: Array[Player] = []
	for p: Player in players.values():
		if is_instance_valid(p) and not p.is_bubbled():
			result.append(p)
	return result


func _join_position() -> Vector2:
	var alive := living_players()
	if not alive.is_empty():
		return alive[0].global_position + Vector2(0, -120)
	return checkpoint


func _on_join_requested(slot: int) -> void:
	spawn_player(slot)


func _on_player_died(_player: Player) -> void:
	if _respawning or not living_players().is_empty():
		return
	_respawning = true
	var for_level := level
	await get_tree().create_timer(RESPAWN_DELAY).timeout
	_respawning = false
	if level == for_level and level != null:  # the level may have changed meanwhile
		respawn_all_at_checkpoint()


func respawn_all_at_checkpoint() -> void:
	var i := 0
	for p: Player in players.values():
		if not is_instance_valid(p):
			continue
		p.global_position = checkpoint + Vector2(i * 56, 0)
		p.revive(false)
		p.velocity = Vector2.ZERO
		i += 1
	EventBus.level_reset.emit()


func _on_lum_collected(slot: int, _pos: Vector2) -> void:
	lums += 1
	lums_by_slot[slot] = lums_by_slot.get(slot, 0) + 1
	EventBus.lums_changed.emit(lums)


func _on_checkpoint_reached(pos: Vector2) -> void:
	checkpoint = pos
	# Rayman Legends rule: reaching a checkpoint frees everyone in a bubble.
	for p: Player in players.values():
		if is_instance_valid(p) and p.is_bubbled():
			p.global_position = pos + Vector2(0, -40)
			p.revive()
