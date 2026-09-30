extends Node
## Autoload "Audio": plays sound effects for game events (listens to EventBus)
## and the music for each level's theme (LevelTheme.music) or menus.
## Sounds live in audio/sfx/<name>.wav (placeholders made by
## tools/audio/gen_sfx.py - drop in real recordings with the same names).
## Volumes: "Music" and "SFX" buses (created at startup), see set_volume().

const SFX_DIR := "res://audio/sfx/"
const MUSIC_DIR := "res://audio/music/"
const VOICES := 16
const FADE := 0.8

var _sfx := {}                       ## name -> AudioStream
var _voices: Array[AudioStreamPlayer] = []
var _next := 0
var _music: AudioStreamPlayer
var _music_old: AudioStreamPlayer
var _music_name := ""
var _lum_combo := 0.0                ## pitch climbs while you chain Lum pickups
var _lum_timer := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_make_bus(&"Music", -6.0)
	_make_bus(&"SFX", -2.0)
	for i in VOICES:
		var p := AudioStreamPlayer.new()
		p.bus = &"SFX"
		add_child(p)
		_voices.append(p)
	for side in 2:
		var m := AudioStreamPlayer.new()
		m.bus = &"Music"
		add_child(m)
		if side == 0:
			_music = m
		else:
			_music_old = m
	_connect_events()


## Stop everything on quit so no playback keeps a stream alive (leak warnings).
func _exit_tree() -> void:
	for p: AudioStreamPlayer in _voices + [_music, _music_old]:
		p.stop()
		p.stream = null
	_sfx.clear()


func _make_bus(bus_name: StringName, db: float) -> void:
	if AudioServer.get_bus_index(bus_name) != -1:
		return
	AudioServer.add_bus()
	var i := AudioServer.bus_count - 1
	AudioServer.set_bus_name(i, bus_name)
	AudioServer.set_bus_send(i, &"Master")
	AudioServer.set_bus_volume_db(i, db)


## 0..1 linear volume for "Master", "Music" or "SFX".
func set_volume(bus_name: StringName, linear: float) -> void:
	var i := AudioServer.get_bus_index(bus_name)
	if i != -1:
		AudioServer.set_bus_volume_db(i, linear_to_db(clampf(linear, 0.0001, 1.0)))


func get_volume(bus_name: StringName) -> float:
	var i := AudioServer.get_bus_index(bus_name)
	return db_to_linear(AudioServer.get_bus_volume_db(i)) if i != -1 else 1.0


# --- Playback ------------------------------------------------------------------------

## Play a sound effect by file name (without .wav). `pitch_jitter` = random +-.
func play(sfx_name: String, volume_db := 0.0, pitch := 1.0, pitch_jitter := 0.05) -> void:
	var stream := _get_sfx(sfx_name)
	if stream == null:
		return
	var p := _voices[_next]
	_next = (_next + 1) % _voices.size()
	p.stream = stream
	p.volume_db = volume_db
	p.pitch_scale = maxf(pitch + randf_range(-pitch_jitter, pitch_jitter), 0.05)
	p.play()


func _get_sfx(sfx_name: String) -> AudioStream:
	if not _sfx.has(sfx_name):
		var path := SFX_DIR + sfx_name + ".wav"
		_sfx[sfx_name] = load(path) if ResourceLoader.exists(path) else null
	return _sfx[sfx_name]


## Crossfade to a music track: a name in audio/music/ or an AudioStream.
func play_music(track: Variant) -> void:
	var stream: AudioStream = track if track is AudioStream else null
	var key := ""
	if track is String:
		key = track
		var path := MUSIC_DIR + key + ".wav"
		stream = load(path) if ResourceLoader.exists(path) else null
	elif stream:
		key = stream.resource_path
	if stream == null or key == _music_name:
		return
	_music_name = key
	if DisplayServer.get_name() == "headless":
		return  # no one to hear it; and the dummy driver never releases stopped playbacks (exit leak)
	if stream is AudioStreamWAV:
		var wav := stream as AudioStreamWAV
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_begin = 0
		wav.loop_end = int(wav.get_length() * wav.mix_rate)
	var tmp := _music_old
	_music_old = _music
	_music = tmp
	_music.stream = stream
	_music.volume_db = -40.0
	_music.play()
	var tw := create_tween().set_parallel()
	tw.tween_property(_music, ^"volume_db", 0.0, FADE)
	tw.tween_property(_music_old, ^"volume_db", -40.0, FADE)
	tw.chain().tween_callback(_music_old.stop)


func stop_music() -> void:
	_music_name = ""
	var tw := create_tween()
	tw.tween_property(_music, ^"volume_db", -40.0, FADE)
	tw.tween_callback(_music.stop)


func _process(delta: float) -> void:
	_lum_timer -= delta
	if _lum_timer <= 0.0:
		_lum_combo = 0.0


# --- Events ----------------------------------------------------------------------------

func _connect_events() -> void:
	var E := EventBus
	E.player_jumped.connect(func(_p: Player) -> void: play("jump", -4.0))
	E.player_wall_jumped.connect(func(_p: Player) -> void: play("wall_jump", -6.0))
	E.player_landed.connect(func(_p: Player) -> void: play("land", -10.0, 1.0, 0.1))
	E.player_hard_landed.connect(func(_p: Player, _s: float) -> void: play("hard_land", -4.0))
	E.player_ground_pounded.connect(func(p: Player, _pos: Vector2) -> void: play("pound" if p else "boss_slam", -2.0))
	E.player_slid.connect(func(_p: Player) -> void: play("slide", -6.0))
	E.player_ledge_grabbed.connect(func(_p: Player) -> void: play("ledge", -8.0))
	E.player_wall_ran.connect(func(_p: Player) -> void: play("slide", -6.0, 1.4))
	E.player_head_bounced.connect(func(_a: Player, _b: Player) -> void: play("stomp", -4.0, 1.3))
	E.player_punched.connect(func(_p: Player, power: float) -> void: play("punch_swing", -6.0, 1.2 - 0.3 * power))
	E.punch_landed.connect(func(_p: Player, _t: Node2D, power: float) -> void:
		play("punch_big" if power > 0.6 else "punch_hit", -2.0))
	E.player_died.connect(func(_p: Player) -> void:
		play("hurt", -3.0)
		play("bubble", -6.0))
	E.player_revived.connect(func(_p: Player) -> void: play("revive", -4.0))
	E.player_joined.connect(func(_p: Player) -> void: play("join", -6.0))
	E.enemy_defeated.connect(func(_e: Node2D, _by: Player) -> void: play("enemy_pop", -4.0))
	E.enemy_blocked.connect(func(_e: Node2D, _by: Player) -> void: play("clank", -6.0))
	E.enemy_shot.connect(func(_e: Node2D) -> void: play("shoot", -8.0))
	E.enemy_spawned.connect(func(_e: Node2D) -> void: play("bubble", -8.0, 0.7))
	E.projectile_reflected.connect(func(_p: Node2D, _by: Player) -> void: play("reflect", -4.0))
	E.breakable_broken.connect(_on_broken)
	E.lum_collected.connect(_on_lum)
	E.gem_collected.connect(func(_i: int, _s: int, _pos: Vector2) -> void: play("gem", -2.0, 1.0, 0.0))
	E.checkpoint_reached.connect(func(_pos: Vector2) -> void: play("checkpoint", -4.0, 1.0, 0.0))
	E.pad_bounced.connect(func(_p: Player, _pad: Node2D, pounding: bool) -> void: play("pad", -4.0, 0.8 if pounding else 1.0))
	E.player_swung.connect(func(_p: Player) -> void: play("swing", -6.0))
	E.player_splashed.connect(func(_p: Player, _pos: Vector2) -> void: play("splash", -6.0))
	E.cannon_fired.connect(func(_c: Node2D, _p: Player) -> void: play("cannon", -3.0))
	E.switch_toggled.connect(func(_s: Node2D, _on: bool) -> void: play("switch", -4.0, 1.0, 0.0))
	E.secret_found.connect(func(_s: Node2D) -> void: play("secret", -3.0, 1.0, 0.0))
	E.level_completed.connect(func(_r: Dictionary) -> void:
		stop_music()
		play("victory", -2.0, 1.0, 0.0))
	E.level_started.connect(_on_level_started)


func _on_broken(b: Node2D, _by: Player) -> void:
	if b is CrumblePlatform:
		play("crumble", -6.0)
	elif b is Projectile:
		play("punch_hit", -14.0, 1.6)
	else:
		play("break", -4.0)


func _on_lum(_slot: int, _pos: Vector2) -> void:
	_lum_combo = minf(_lum_combo + 0.06, 0.8)
	_lum_timer = 0.6
	play("lum", -8.0, 1.0 + _lum_combo, 0.0)


func _on_level_started(node: Node2D) -> void:
	var level := node as Level
	if level == null:
		return
	var th := level.level_theme if level.level_theme else LevelTheme.default_theme()
	if th.music:
		play_music(th.music)
