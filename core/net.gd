extends Node
## ONLINE PLAY (browser version). One friend HOSTS and gets a 4-letter code;
## up to three more JOIN with it. Each browser runs the whole game; this node
## keeps them in step:
##  - Every browser drives its own dreamer and streams its movement ~20x a
##    second; friends appear as "puppet" Players (Player.remote) that replay it.
##  - Hits, stomps, revives and doors are sent as reliable EVENTS so a friend's
##    punch really hurts the enemy on your screen too.
##  - The HOST owns the flow: which scene everyone is in (menus follow it), the
##    level start (everyone waits until all have loaded), and corrections for
##    enemies and moving platforms so everyone's world matches.
## Packets are "latest state wins" (the claude.ai room presence or a WebRTC
## channel); events ride inside them until the others acknowledge them.
## Packet keys are short identifiers and peer ids only ever appear as VALUES
## (a room presence only accepts identifier-like keys).
## Local co-op is untouched: when offline, nothing here does anything.

signal changed   ## status / friends / code changed (menus redraw)

enum Mode { OFFLINE, CONNECTING, HOST, CLIENT }

const PROTOCOL := 1
const MAX_PLAYERS := 4
const SEND_INTERVAL := 0.05     ## s between packets (20 a second) - claude.ai rooms; direct links send 30 a second
const SEND_INTERVAL_P2P := 1.0 / 30.0
const PEER_TIMEOUT := 8.0       ## s of silence before a friend counts as gone
const JOIN_TIMEOUT := 20.0      ## s to find the host before giving up (the page gives its own reason sooner)
const BARRIER_TIMEOUT := 8.0    ## s the host waits for everyone to load a level
const PACKET_BUDGET := 3400     ## bytes of JSON per packet (a room presence holds 4 KiB)
const ENEMY_RANGE := 2600.0     ## px from a player: enemies further away aren't corrected
const MAX_EVENTS := 40          ## unacknowledged events kept (oldest dropped beyond)
const CODE_LETTERS := "ABCDEFGHJKLMNPQRSTUVWXYZ"
const TITLE := "res://ui/title.tscn"
const ONLINE_MENU := "res://ui/online_menu.tscn"
const NOT_FOLLOWED := [TITLE, ONLINE_MENU]

var mode := Mode.OFFLINE
var code := ""
var error := ""           ## last problem, for the online menu ("No game with code ABCD")
var my_id := ""
var my_slot := -1
var host_id := ""
var peers := {}           ## peer id -> NetPeer
var transport: NetTransport = NetTransport.WebTransport.new()
var applying := false     ## true while applying a friend's event (so it isn't sent back)
var lobby: Array = [0, 0, 0]   ## my character index, outfit, ready (CharacterSelect sets it)
var map_index := -1       ## host: the world map node the gang stands on (clients mirror it)
var epoch := 0            ## scene counter: host bumps it on every scene change; clients copy it
var change_scenes := true ## tests turn this off (a scene change would end the test run)
var pending_intent := {}  ## the start page's Host / Join button, carried to the online menu

var _scene: Node
var _send_t := 0.0
var _tick := 0
var _out: Array = []      ## unacknowledged events: [seq, epoch, type, args...]
var _seq := 0
var _loaded := -1         ## epoch whose scene is loaded here
var _go := -1             ## host: the last level epoch released (everyone may play)
var _barrier := -1        ## epoch of the level we're paused in, waiting for friends
var _barrier_t := 0.0
var _connect_t := 0.0
var _link := "idle"       ## the transport's own status
var _picks := {}          ## slot -> the lobby entry its CharacterDef was built from (built once, not every frame)
var _debug_page := false  ## browser test runs (?net=local) get window.dreamDebug
var _toast_t := 0.0
var _layer: CanvasLayer
var _badge: Label
var _wait: Label
var _toast: Label


class NetPeer:
	var id := ""
	var slot := -1
	var host := false
	var last_rx := 0.0
	var pk: Dictionary = {}
	var in_seq := 0
	var snaps: Array = []    ## [sender ms, player state] oldest first
	var snap_epoch := -1     ## scene epoch of those snapshots
	var offset := INF        ## local ms - sender ms (a slowly-rising minimum)
	var jitter := 0.0

	func add_snap(t: float, state: Array, ep: int) -> void:
		if ep != snap_epoch:
			snaps.clear()
			snap_epoch = ep
		var now := float(Time.get_ticks_msec())
		var est := now - t
		offset = minf(offset + 0.5, est)
		jitter = lerpf(jitter, est - offset, 0.1)
		if not snaps.is_empty() and t <= snaps[-1][0]:
			return  # out of order / repeat
		snaps.append([t, state])
		while snaps.size() > 2 and snaps[0][0] < t - 1500.0:
			snaps.pop_front()

	func delay() -> float:
		return clampf(SEND_INTERVAL * 1000.0 + 2.5 * jitter + 30.0, 70.0, 320.0)

	## The player state to show now: interpolated ~delay() ms in the past, so
	## there's always a packet on both sides; briefly extrapolated if late.
	func sample() -> Array:
		if snaps.is_empty():
			return []
		var render := float(Time.get_ticks_msec()) - offset - delay()
		var last: Array = snaps[-1]
		if render >= last[0]:
			var s: Array = last[1].duplicate()
			var ahead := minf(render - last[0], 120.0) / 1000.0
			s[0] += s[2] * ahead
			s[1] += s[3] * ahead
			return s
		for i in range(snaps.size() - 2, -1, -1):
			var a: Array = snaps[i]
			if a[0] <= render:
				var b: Array = snaps[i + 1]
				var f: float = (render - float(a[0])) / maxf(float(b[0]) - float(a[0]), 1.0)
				var s: Array = (b[1] if f > 0.5 else a[1]).duplicate()
				for k in [0, 1, 2, 3, 9, 14]:
					s[k] = lerpf(a[1][k], b[1][k], f)
				return s
		return snaps[0][1]


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	process_priority = -100  # before gameplay reads puppets
	_build_overlay()
	if OS.has_feature("web"):
		_debug_page = bool(JavaScriptBridge.eval("/[?&](net=local|peerhost=)/.test(location.search)", true))


# --- Public ------------------------------------------------------------------------

func is_online() -> bool:
	return mode == Mode.HOST or mode == Mode.CLIENT


func is_host() -> bool:
	return mode == Mode.HOST


func is_client() -> bool:
	return mode == Mode.CLIENT


## "" = online play can't work here (desktop build); "pending" = still checking.
func available() -> String:
	return transport.kind()


func host_game() -> void:
	_reset()
	error = ""
	mode = Mode.CONNECTING
	_connect_t = 0.0
	transport.host()
	changed.emit()


func join_game(p_code: String) -> void:
	_reset()
	error = ""
	code = p_code.to_upper()
	mode = Mode.CONNECTING
	_connect_t = 0.0
	transport.join(code)
	changed.emit()


## Leave the online game (back to local play).
func leave(reason := "") -> void:
	if mode == Mode.OFFLINE:
		return
	transport.leave()
	for id: String in peers.keys():
		_remove_puppet(peers[id])
	_reset()
	mode = Mode.OFFLINE
	error = reason
	InputRouter.bind_online(-1)
	changed.emit()


## Slots of connected friends (not ours).
func remote_slots() -> Array[int]:
	var r: Array[int] = []
	for pr: NetPeer in peers.values():
		if pr.slot >= 0:
			r.append(pr.slot)
	r.sort()
	return r


## Every slot in the game, ours included.
func all_slots() -> Array[int]:
	var r := remote_slots()
	if my_slot >= 0:
		r.append(my_slot)
	r.sort()
	return r


func peer_for_slot(slot: int) -> NetPeer:
	for pr: NetPeer in peers.values():
		if pr.slot == slot:
			return pr
	return null


## A friend's character-select state: [character index, outfit, ready] or [].
func remote_lobby(slot: int) -> Array:
	var pr := peer_for_slot(slot)
	if pr == null or not pr.pk.get("lb") is Array or pr.pk["lb"].size() < 3:
		return []
	return pr.pk["lb"]


## A value from the host's latest packet (clients).
func host_value(key: String, default: Variant = null) -> Variant:
	var h: NetPeer = peers.get(host_id)
	return h.pk.get(key, default) if h else default


## The interpolated state of a friend's dreamer (Player.net_state layout), or [].
func puppet_sample(slot: int) -> Array:
	var pr := peer_for_slot(slot)
	if pr == null or pr.snap_epoch != epoch:
		return []
	return pr.sample()


# --- Events (hooks call these; they do nothing offline) -------------------------------

## A local dreamer hit `target` (Player.strike): make it happen everywhere.
func relay_hit(by: Player, target: Node, knockback: Vector2) -> void:
	var path := _path_of(target)
	if path != "":
		_event("hit", [by.slot, path, snappedf(knockback.x, 0.1), snappedf(knockback.y, 0.1),
				snappedf(by.punch_power, 0.01), String(by.state_machine.current_name())])


## A local dreamer stomped `enemy`.
func relay_stomp(by: Player, enemy: Node) -> void:
	var path := _path_of(enemy)
	if path != "":
		_event("stomp", [by.slot, path])


## Pop a friend's bubble (their browser owns their dreamer).
func relay_revive(slot: int) -> void:
	_event("revive", [slot])


## An enemy died here (hazards, hits): make sure it's gone everywhere.
func relay_dead(enemy: Node) -> void:
	var path := _path_of(enemy)
	if path != "":
		_event("dead", [path])


## Call `method` on `node` on everyone else's screen too (doors, team teleports).
func relay_call(node: Node, method: String, args: Array = []) -> void:
	var path := _path_of(node)
	if path != "":
		_event("call", [path, method, args])


func _path_of(n: Node) -> String:
	var lv := GameManager.level
	if lv == null or n == null or not is_instance_valid(n) or not lv.is_ancestor_of(n):
		return ""
	return String(lv.get_path_to(n))


func _event(type: String, args: Array) -> void:
	if not is_online() or applying:
		return
	_seq += 1
	var e: Array = [_seq, epoch, type]
	e.append_array(args)
	_out.append(e)
	while _out.size() > MAX_EVENTS:
		_out.pop_front()


# --- Level start: everyone waits for everyone -------------------------------------------

## Level._ready: online, hold the level paused until every friend has loaded it too.
func level_loaded(level: Node) -> void:
	if not is_online():
		return
	if level != _scene and level == get_tree().current_scene:
		_track_scene()  # the level is the new scene: count it before anything else
	_loaded = epoch
	if is_host() and remote_slots().is_empty():
		_go = epoch
		return
	if is_client() and int(host_value("go", -1)) == epoch:
		_late_join()
		return
	_barrier = epoch
	_barrier_t = 0.0
	get_tree().paused = true
	_wait.visible = true


func _release_barrier() -> void:
	if _barrier == -1:
		return
	_barrier = -1
	_wait.visible = false
	get_tree().paused = false


## Joined a level already in progress: start where the host's gang is.
func _late_join() -> void:
	var cp: Variant = host_value("cp")
	if cp is Array and cp.size() == 2 and GameManager.level:
		GameManager.checkpoint = Vector2(cp[0], cp[1])
		var me: Player = GameManager.players.get(my_slot)
		if is_instance_valid(me):
			me.global_position = GameManager.checkpoint
			me.velocity = Vector2.ZERO


# --- Loop ----------------------------------------------------------------------------

func _process(delta: float) -> void:
	_toast_t -= delta
	_toast.modulate.a = clampf(_toast_t * 2.0, 0.0, 1.0)
	if mode == Mode.OFFLINE:
		_badge.visible = false
		return
	_track_scene()
	_receive()
	if mode == Mode.CONNECTING:
		_connect_t += delta
		if _connect_t > JOIN_TIMEOUT:
			leave("Couldn't find a game with code %s. Check the code and try again." % code)
			return
		if _link == "client":
			_send_t -= delta
			if _send_t <= 0.0:
				_send_t = SEND_INTERVAL_P2P if available() == "peer" else SEND_INTERVAL
				transport.send(_make_packet())  # say hello so the host gives us a slot
		return
	_expire_peers()
	_sync_picks()
	_update_puppets()
	if is_client():
		_follow_host()
	if _barrier != -1:
		_barrier_t += delta
		if is_host() and (_all_loaded() or _barrier_t > BARRIER_TIMEOUT):
			_go = _barrier
			_release_barrier()
		elif is_client() and int(host_value("go", -1)) == _barrier:
			_release_barrier()
		elif is_client() and _barrier_t > BARRIER_TIMEOUT * 2.0:
			_release_barrier()
	_send_t -= delta
	if _send_t <= 0.0:
		_send_t = SEND_INTERVAL_P2P if available() == "peer" else SEND_INTERVAL
		_tick += 1
		transport.send(_make_packet())
	_update_badge()
	_debug_to_page(delta)


## Browser only: a small summary on window.dreamDebug for the two-tab test script.
var _debug_t := 0.0
func _debug_to_page(delta: float) -> void:
	_debug_t -= delta
	if _debug_t > 0.0 or not _debug_page:
		return
	_debug_t = 0.5
	var ps := {}
	for s: int in GameManager.players:
		var p: Player = GameManager.players[s]
		if is_instance_valid(p):
			ps[str(s)] = [roundf(p.global_position.x), roundf(p.global_position.y), String(p.state_machine.current_name()), p.remote]
	var alive := 0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		alive += 0 if (e as Enemy) == null or (e as Enemy).dead else 1
	var cs := get_tree().current_scene
	var info := {"mode": mode, "slot": my_slot, "epoch": epoch, "scene": cs.scene_file_path if cs else "",
			"players": ps, "enemies": alive, "lums": GameManager.lums, "paused": get_tree().paused}
	JavaScriptBridge.eval("window.dreamDebug = %s;" % JSON.stringify(info), true)


func _track_scene() -> void:
	var cs := get_tree().current_scene
	if cs == _scene or cs == null:
		return
	_scene = cs
	_release_barrier()
	map_index = -1
	if is_host():
		epoch += 1
		_loaded = epoch
	elif is_client():
		_loaded = epoch


func _receive() -> void:
	var res := transport.poll()
	var st: String = res.get("st", "idle")
	_link = st
	if res.get("me", "") != "":
		my_id = res["me"]
	if res.get("code", "") != "":
		code = res["code"]
	if st == "error":
		leave(res.get("err", "Connection problem"))
		return
	if mode == Mode.CONNECTING:
		if st == "host":
			mode = Mode.HOST
			my_slot = 0
			host_id = my_id
			InputRouter.bind_online(0)
			changed.emit()
		elif st == "client" and my_slot >= 0:
			mode = Mode.CLIENT
			InputRouter.bind_online(my_slot)
			_toast_text("Joined %s's game!" % _host_name())
			changed.emit()
	elif is_online() and st == "idle":
		leave("Disconnected.")
		return
	for id: String in res.get("gone", []):
		_peer_left(id)
	for item: Array in res.get("in", []):
		if item.size() == 2 and item[1] is Dictionary:
			_on_packet(String(item[0]), item[1])


func _on_packet(id: String, pk: Dictionary) -> void:
	if int(pk.get("v", 0)) != PROTOCOL or id == my_id:
		return
	var pr: NetPeer = peers.get(id)
	if pr == null:
		if pk.get("r") != "h" and not is_host():
			# Clients only learn about each other from the host's slot list.
			if not _pairs(host_value("sl")).has(id):
				return
		pr = NetPeer.new()
		pr.id = id
		peers[id] = pr
	pr.last_rx = Time.get_ticks_msec() / 1000.0
	pr.pk = pk
	pr.host = pk.get("r") == "h"
	if pr.host:
		host_id = id
		pr.slot = 0
		var sl := _pairs(pk.get("sl"))
		if sl.has(my_id):
			var mine := int(sl[my_id])
			if mine != my_slot:
				my_slot = mine
				if mode == Mode.CLIENT:
					InputRouter.bind_online(my_slot)
		elif (pk.get("full", []) as Array).has(my_id):
			leave("That game is full (4 dreamers max).")
			return
	elif is_host():
		if pr.slot == -1:
			pr.slot = _free_slot()
			if pr.slot != -1:
				_toast_text("A friend joined! (P%d)" % (pr.slot + 1))
				changed.emit()
	else:
		pr.slot = int(pk.get("s", -1))
	if pk.get("p") is Array:
		pr.add_snap(float(pk.get("t", 0.0)), pk["p"], int(pk.get("pe", -1)))
	elif pr.snap_epoch != -1:
		pr.snap_epoch = -1
		pr.snaps.clear()
	for e: Variant in pk.get("ev", []):
		if e is Array and e.size() >= 3 and int(e[0]) > pr.in_seq:
			pr.in_seq = int(e[0])
			_apply_event(pr, e)
	if pr.host and is_client():
		_apply_host_world(pk)


## [[id, value], ...] (as sent) -> {id: value}.
func _pairs(v: Variant) -> Dictionary:
	var d := {}
	if v is Array:
		for pair: Variant in v:
			if pair is Array and pair.size() == 2:
				d[String(pair[0])] = pair[1]
	return d


func _free_slot() -> int:
	var used := all_slots()
	for s in range(1, MAX_PLAYERS):
		if not s in used:
			return s
	return -1


func _peer_left(id: String) -> void:
	var pr: NetPeer = peers.get(id)
	if pr == null:
		return
	peers.erase(id)
	_remove_puppet(pr)
	if pr.host and is_client():
		leave("The host left the game.")
		if change_scenes:
			GameManager.goto_scene(ONLINE_MENU)
		return
	if pr.slot >= 0:
		GameManager.chosen_characters.erase(pr.slot)
		_toast_text("P%d left the game." % (pr.slot + 1))
	changed.emit()


func _expire_peers() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for id: String in peers.keys():
		if now - (peers[id] as NetPeer).last_rx > PEER_TIMEOUT:
			_peer_left(id)


## Friends' character picks -> GameManager.chosen_characters (levels build their puppets from it).
func _sync_picks() -> void:
	for pr: NetPeer in peers.values():
		var lb: Array = remote_lobby(pr.slot)
		if pr.slot < 0 or lb.is_empty():
			continue
		var ci := clampi(int(lb[0]), 0, GameManager.CHARACTERS.size() - 1)
		var outfit := clampi(int(lb[1]), 0, Wardrobe.OUTFITS.size() - 1)
		var key := [ci, outfit]
		if _picks.get(pr.slot) == key and GameManager.chosen_characters.has(pr.slot):
			continue
		_picks[pr.slot] = key
		var cur: CharacterDef = GameManager.chosen_characters.get(pr.slot)
		var want := Wardrobe.dress(GameManager.CHARACTERS[ci], outfit)
		if cur == null or cur.display_name != want.display_name or cur.main_color != want.main_color:
			GameManager.chosen_characters[pr.slot] = want
			GameManager.chosen_outfits[pr.slot] = outfit
			var p: Player = GameManager.players.get(pr.slot)
			if is_instance_valid(p) and p.remote:
				p.set_character(want)


## Friends in this level get a puppet; friends elsewhere (still loading, left) lose it.
func _update_puppets() -> void:
	if GameManager.level == null:
		return
	for pr: NetPeer in peers.values():
		if pr.slot < 0 or pr.slot == my_slot:
			continue
		var here := pr.snap_epoch == epoch and not pr.snaps.is_empty() and _loaded == epoch
		var p: Player = GameManager.players.get(pr.slot)
		if here and not is_instance_valid(p):
			var s: Array = pr.snaps[-1][1]
			GameManager.spawn_remote(pr.slot, Vector2(s[0], s[1]))
		elif not here and is_instance_valid(p) and p.remote:
			_remove_puppet(pr)


func _remove_puppet(pr: NetPeer) -> void:
	var p: Player = GameManager.players.get(pr.slot)
	if is_instance_valid(p) and p.remote:
		GameManager.players.erase(pr.slot)
		p.queue_free()
		EventBus.player_left.emit(pr.slot)


## Clients: go wherever the host goes (menus, levels, restarts).
func _follow_host() -> void:
	var h: NetPeer = peers.get(host_id)
	if h == null or my_slot < 0 or not h.pk.has("ep"):
		return
	var ep := int(h.pk["ep"])
	var sc: String = h.pk.get("sc", "")
	if ep == epoch or sc == "" or sc in NOT_FOLLOWED or not ResourceLoader.exists(sc):
		return
	epoch = ep
	_loaded = -1
	_out.clear()  # events belong to the scene we're leaving
	if h.pk.get("w") is String:
		WorldMap.world = h.pk["w"]
	if change_scenes:
		GameManager.goto_scene(sc)


func _all_loaded() -> bool:
	for pr: NetPeer in peers.values():
		if pr.slot >= 0 and int(pr.pk.get("ld", -1)) != epoch:
			return false
	return true


# --- Packets -----------------------------------------------------------------------------

func _make_packet() -> Dictionary:
	var pk := {"v": PROTOCOL, "r": "h" if is_host() else "c", "t": Time.get_ticks_msec(),
			"s": my_slot, "lb": lobby, "ld": _loaded}
	var acks: Array = []
	for pr: NetPeer in peers.values():
		acks.append([pr.id, pr.in_seq])
	pk["ak"] = acks
	_trim_acked()
	if not _out.is_empty():
		pk["ev"] = _out
	var me: Player = GameManager.players.get(my_slot)
	if GameManager.level and is_instance_valid(me) and not me.remote and _loaded == epoch:
		pk["p"] = me.net_state()
		pk["pe"] = epoch
	if is_host():
		var cs := get_tree().current_scene
		pk["sc"] = cs.scene_file_path if cs else ""
		pk["ep"] = epoch
		pk["go"] = _go
		pk["w"] = WorldMap.world
		pk["mi"] = map_index
		var sl: Array = []
		var full: Array = []
		for pr: NetPeer in peers.values():
			if pr.slot >= 0:
				sl.append([pr.id, pr.slot])
			else:
				full.append(pr.id)
		pk["sl"] = sl
		if not full.is_empty():
			pk["full"] = full
		if GameManager.level and not remote_slots().is_empty():
			pk["cp"] = [roundf(GameManager.checkpoint.x), roundf(GameManager.checkpoint.y)]
			if _tick % 4 == 0:
				pk["mp"] = _platform_states()
			if _tick % 2 == 0:
				_add_enemies(pk)
	return pk


func _trim_acked() -> void:
	if _out.is_empty():
		return
	var lowest := _seq
	var any := false
	for pr: NetPeer in peers.values():
		if pr.slot < 0:
			continue
		any = true
		lowest = mini(lowest, int(_pairs(pr.pk.get("ak")).get(my_id, 0)))
	if not any:
		lowest = _seq  # nobody to tell
	while not _out.is_empty() and int(_out[0][0]) <= lowest:
		_out.pop_front()


## Host: positions of enemies near any player, closest first, within the packet budget.
func _add_enemies(pk: Dictionary) -> void:
	var lv := GameManager.level
	var near: Array = []
	for n in get_tree().get_nodes_in_group(&"enemies"):
		var e := n as Enemy
		if e == null or e.dead or not lv.is_ancestor_of(e):
			continue
		var d := _distance_to_players(e.global_position)
		if d < ENEMY_RANGE:
			near.append([d, e])
	near.sort_custom(func(a: Array, b: Array) -> bool: return a[0] < b[0])
	var budget := PACKET_BUDGET - JSON.stringify(pk).length() - 40
	var list: Array = []
	for pair: Array in near:
		var e: Enemy = pair[1]
		var entry: Array = [String(lv.get_path_to(e))]
		entry.append_array(e.net_state())
		budget -= JSON.stringify(entry).length() + 1
		if budget < 0:
			break
		list.append(entry)
	pk["en"] = list


func _platform_states() -> Array:
	var lv := GameManager.level
	var list: Array = []
	for n in get_tree().get_nodes_in_group(&"net_sync"):
		var n2 := n as Node2D
		if n2 == null or not lv.is_ancestor_of(n2) or _distance_to_players(n2.global_position) > ENEMY_RANGE:
			continue
		list.append([String(lv.get_path_to(n2)), n2.call(&"net_state")])
		if list.size() >= 12:
			break
	return list


func _distance_to_players(pos: Vector2) -> float:
	var best := INF
	for p: Player in GameManager.players.values():
		if is_instance_valid(p):
			best = minf(best, p.global_position.distance_to(pos))
	return best


## Clients: bend enemies and platforms toward the host's.
func _apply_host_world(pk: Dictionary) -> void:
	var lv := GameManager.level
	if lv == null or int(pk.get("ep", -1)) != epoch or _barrier != -1:
		return
	for entry: Variant in pk.get("en", []):
		if entry is Array and entry.size() >= 2:
			var e := lv.get_node_or_null(NodePath(String(entry[0]))) as Enemy
			if e and not e.dead:
				e.net_apply(entry.slice(1))
	for entry: Variant in pk.get("mp", []):
		if entry is Array and entry.size() == 2:
			var n := lv.get_node_or_null(NodePath(String(entry[0])))
			if n and n.has_method(&"net_apply"):
				n.call(&"net_apply", entry[1])


func _apply_event(pr: NetPeer, e: Array) -> void:
	if int(e[1]) != epoch or GameManager.level == null:
		return
	var lv := GameManager.level
	var type: String = e[2]
	applying = true
	match type:
		"hit":
			if e.size() >= 9:
				var by: Player = GameManager.players.get(int(e[3]))
				var target := lv.get_node_or_null(NodePath(String(e[4])))
				if target and target.has_method(&"take_hit"):
					if is_instance_valid(by) and by.remote:
						var was: StringName = by.state_machine.puppet_name
						by.punch_power = float(e[7])
						by.state_machine.puppet_name = StringName(String(e[8]))
						target.take_hit(by, Vector2(float(e[5]), float(e[6])))
						by.state_machine.puppet_name = was
						if is_instance_valid(target):
							by.punch_hit(target)
					else:
						target.take_hit(null, Vector2(float(e[5]), float(e[6])))
		"stomp":
			if e.size() >= 5:
				var by: Player = GameManager.players.get(int(e[3]))
				var en := lv.get_node_or_null(NodePath(String(e[4]))) as Enemy
				if en and not en.dead:
					if is_instance_valid(by):
						en._on_stomped(by)
					else:
						en.damage(null, Enemy.HitKind.STOMP, Vector2.ZERO)
		"revive":
			if e.size() >= 4 and int(e[3]) == my_slot:
				var me: Player = GameManager.players.get(my_slot)
				if is_instance_valid(me):
					me.revive()
		"dead":
			if e.size() >= 4:
				var en := lv.get_node_or_null(NodePath(String(e[3]))) as Enemy
				if en and not en.dead:
					en.die(null, Enemy.HitKind.HAZARD, Vector2.ZERO)
		"call":
			if e.size() >= 6:
				var n := lv.get_node_or_null(NodePath(String(e[3])))
				var method := StringName(String(e[4]))
				if n and n.has_method(method) and e[5] is Array:
					n.callv(method, e[5])
	applying = false


# --- Overlay: the ONLINE badge, "waiting for friends", join/leave toasts ---------------------

func _build_overlay() -> void:
	_layer = CanvasLayer.new()
	_layer.layer = 90
	add_child(_layer)
	_badge = UIStyle.label("", 22, Color.WHITE, 6)
	_badge.position = Vector2(1480, 1036)
	_badge.custom_minimum_size.x = 420
	_badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_badge.visible = false
	_layer.add_child(_badge)
	_wait = UIStyle.label("Waiting for your friends to load...", 44, Color.WHITE, 10)
	_wait.position = Vector2(360, 480)
	_wait.custom_minimum_size.x = 1200
	_wait.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_wait.visible = false
	_layer.add_child(_wait)
	_toast = UIStyle.label("", 30, Color("ffd23f"), 8)
	_toast.position = Vector2(360, 90)
	_toast.custom_minimum_size.x = 1200
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_toast.modulate.a = 0.0
	_layer.add_child(_toast)


func _update_badge() -> void:
	_badge.visible = is_online() and not OS.has_feature("web")  # the web page shows its own room bar
	if not _badge.visible:
		return
	var n := all_slots().size()
	_badge.text = "ONLINE  %s   %d dreamer%s%s" % [code, n, "" if n == 1 else "s", "   (host)" if is_host() else ""]


func _toast_text(text: String) -> void:
	_toast.text = text
	_toast_t = 3.0


func _host_name() -> String:
	var def: CharacterDef = GameManager.chosen_characters.get(0)
	return def.display_name if def else "the host"


func _reset() -> void:
	peers.clear()
	_picks.clear()
	code = ""
	my_id = ""
	my_slot = -1
	host_id = ""
	epoch = 0
	_out.clear()
	_seq = 0
	_loaded = -1
	_go = -1
	map_index = -1
	lobby = [0, 0, 0]
	_release_barrier()
	_scene = get_tree().current_scene if is_inside_tree() else null
