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
const LEVEL_SELECT := "res://ui/level_select.tscn"   ## Bonus Dreams list
const WORLD_MAP := "res://ui/world_map.tscn"
const GEMS_PER_LEVEL := 3

var players: Dictionary = {}  ## slot -> Player
var chosen_characters: Dictionary = {}  ## slot -> CharacterDef (set by character select; may wear a Wardrobe outfit)
var chosen_outfits: Dictionary = {}     ## slot -> Wardrobe outfit index
var lums := 0
var lum_rush := 0.0  ## seconds of Lum Rush left (a Dream Bell was rung): every Lum counts double
var lums_by_slot: Dictionary = {}  ## slot -> Lums that player grabbed (results screen)
var checkpoint := Vector2.ZERO
var level: Level
## Per-level run stats (reset when a level registers).
var level_time := 0.0
var gems: Array[bool] = [false, false, false]
var snoozling := false   ## this run freed the level's caged Snoozling
var secrets_found := 0
var secrets_total := 0
var level_complete := false
var last_results: Dictionary = {}

var _respawning := false


func _ready() -> void:
	InputRouter.join_requested.connect(_on_join_requested)
	EventBus.player_died.connect(_on_player_died)
	EventBus.lum_collected.connect(_on_lum_collected)
	EventBus.checkpoint_reached.connect(_on_checkpoint_reached)
	EventBus.gem_collected.connect(_on_gem_collected)
	EventBus.snoozling_rescued.connect(_on_snoozling_rescued)
	EventBus.secret_found.connect(func(_s: Node2D) -> void: secrets_found += 1)
	EventBus.device_lost.connect(_on_device_lost)


func _physics_process(delta: float) -> void:
	if level != null and not level_complete:
		level_time += delta
		if lum_rush > 0.0:
			lum_rush = maxf(lum_rush - delta, 0.0)
			if lum_rush == 0.0:
				EventBus.lum_rush_changed.emit(0.0)


func register_level(new_level: Level) -> void:
	level = new_level
	players.clear()
	# Back on the map, show the world this level belongs to.
	var i := LevelCatalog.index_of(level.scene_file_path)
	if i != -1 and LevelCatalog.LEVELS[i]["world"] != "bonus":
		WorldMap.world = LevelCatalog.LEVELS[i]["world"]
	checkpoint = level.get_spawn_position()
	lums = 0
	lums_by_slot.clear()
	lum_rush = 0.0
	level_time = 0.0
	gems = [false, false, false]
	snoozling = false
	secrets_found = 0
	secrets_total = level.find_children("*", "SecretArea", true, false).size()
	level_complete = false
	EventBus.lums_changed.emit(0)
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
	var worth := 2 if lum_rush > 0.0 else 1
	lums += worth
	lums_by_slot[slot] = lums_by_slot.get(slot, 0) + worth
	EventBus.lums_changed.emit(lums)


func _on_snoozling_rescued(_pos: Vector2) -> void:
	snoozling = true


func _on_gem_collected(index: int, _slot: int, _pos: Vector2) -> void:
	if index >= 0 and index < gems.size():
		gems[index] = true


func _on_device_lost(slot: int) -> void:
	if level and players.has(slot):
		EventBus.pause_requested.emit(slot, "P%d's controller disconnected - reconnect it, or choose Leave." % (slot + 1))


## A Dream Bell was rung: every Lum counts double for `seconds` (ringing again tops it up).
func start_lum_rush(seconds: float) -> void:
	lum_rush = maxf(lum_rush, seconds)
	EventBus.lum_rush_changed.emit(lum_rush)


# --- Level flow --------------------------------------------------------------------

## A LevelGoal was reached: freeze play, record results, show the results screen.
func complete_level() -> void:
	if level_complete or level == null:
		return
	level_complete = true
	for p: Player in players.values():
		if is_instance_valid(p):
			p.celebrate()
	var path := level.scene_file_path
	var i := LevelCatalog.index_of(path)
	var id: String = LevelCatalog.LEVELS[i]["id"] if i != -1 else path.get_file().get_basename()
	var had: Array[int] = []
	for k in Wardrobe.OUTFITS.size():
		if Wardrobe.is_unlocked(k):
			had.append(k)
	var news := SaveData.submit(id, level_time, lums, gems, snoozling)
	var new_outfits: Array[String] = []
	for k in Wardrobe.OUTFITS.size():
		if Wardrobe.is_unlocked(k) and not k in had:
			new_outfits.append(Wardrobe.OUTFITS[k]["name"])
	last_results = {
		"id": id, "name": level.level_name, "time": level_time, "lums": lums,
		"lums_by_slot": lums_by_slot.duplicate(), "gems": gems.duplicate(), "snoozling": snoozling,
		"secrets": secrets_found, "secrets_total": secrets_total, "new": news,
		"next": LevelCatalog.next_after(path), "new_outfits": new_outfits,
	}
	EventBus.level_completed.emit(last_results)


func goto_scene(path: String) -> void:
	get_tree().paused = false
	Engine.time_scale = 1.0
	get_tree().change_scene_to_file.call_deferred(path)


func restart_level() -> void:
	if level:
		goto_scene(level.scene_file_path)


## Remove a player from the game (drop out). Their slot becomes free to rejoin.
func drop_player(slot: int) -> void:
	if players.has(slot):
		var p: Player = players[slot]
		players.erase(slot)
		if is_instance_valid(p):
			p.queue_free()
	chosen_characters.erase(slot)
	InputRouter.unbind_slot(slot)
	EventBus.player_left.emit(slot)


func _on_checkpoint_reached(pos: Vector2) -> void:
	checkpoint = pos
	# Rayman Legends rule: reaching a checkpoint frees everyone in a bubble.
	for p: Player in players.values():
		if is_instance_valid(p) and p.is_bubbled():
			p.global_position = pos + Vector2(0, -40)
			p.revive()
