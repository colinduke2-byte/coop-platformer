class_name NetTransport
extends RefCounted
## How packets travel between browsers. Net talks only to this interface.
##   WebTransport  - the browser page's window.dreamNet (tools/web/play.html):
##                   claude.ai room, PeerJS (WebRTC) or BroadcastChannel (tabs).
##   NetTransport  - this base class doubles as the in-memory transport the
##                   tests drive: they read `sent` and push packets with inject().
## poll() returns {"st": idle|connecting|host|client|error, "err": String,
## "code": String, "me": String, "in": [[peer_id, packet], ...], "gone": [peer_id]}.

var st := "idle"
var err := ""
var code := ""
var me := "me"
var sent: Array[Dictionary] = []   ## (test) packets we sent, newest last
var _in: Array = []
var _gone: Array = []


## "" = no online play here; otherwise the transport kind ("room", "peer", "local", "test",
## or "pending" while the page is still finding out).
func kind() -> String:
	return "test"


## Why online play is unavailable here (shown in the online menu), "" if unknown.
func why() -> String:
	return ""


## What the start page's buttons asked for, once: {"a": "host"} / {"a": "join", "c": "ABCD"} / {}.
func intent() -> Dictionary:
	return {}


func host() -> void:
	st = "host"
	if code == "":
		code = "TEST"


func join(p_code: String) -> void:
	code = p_code
	st = "client"


func leave() -> void:
	st = "idle"
	code = ""


func send(packet: Dictionary) -> void:
	sent.append(packet)
	if sent.size() > 200:
		sent.pop_front()


func poll() -> Dictionary:
	var res := {"st": st, "err": err, "code": code, "me": me, "in": _in, "gone": _gone}
	_in = []
	_gone = []
	return res


## (test) A packet from a friend arrives.
func inject(peer_id: String, packet: Dictionary) -> void:
	_in.append([peer_id, packet])


## (test) A friend closes their tab.
func drop(peer_id: String) -> void:
	_gone.append(peer_id)


## The browser page's transport (window.dreamNet in tools/web/play.html).
class WebTransport extends NetTransport:
	var _js: JavaScriptObject

	func _init() -> void:
		if OS.has_feature("web"):
			_js = JavaScriptBridge.get_interface("dreamNet")

	func kind() -> String:
		return String(_js.available()) if _js else ""

	func why() -> String:
		return String(_js.why()) if _js else ""

	func intent() -> Dictionary:
		var s := String(_js.intent()) if _js else ""
		var d: Variant = JSON.parse_string(s) if s != "" else null
		return d if d is Dictionary else {}

	func host() -> void:
		if _js:
			_js.host()

	func join(p_code: String) -> void:
		if _js:
			_js.join(p_code)

	func leave() -> void:
		if _js:
			_js.leave()

	func send(packet: Dictionary) -> void:
		if _js:
			_js.send(JSON.stringify(packet))

	func poll() -> Dictionary:
		if _js == null:
			return {"st": "idle", "err": "", "code": "", "me": "", "in": [], "gone": []}
		var parsed: Variant = JSON.parse_string(String(_js.poll()))
		return parsed if parsed is Dictionary else {"st": "error", "err": "bad poll", "in": [], "gone": []}
