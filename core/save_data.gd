class_name SaveData
## Best results per level, stored in user://save.json.
## records[level_id] = {"time": float, "lums": int, "gems": [bool, bool, bool], "done": bool,
##                      "snoozling": bool}
## records["_shop"] = {"bank": int, "owned": [item names]} - the Lum Shop.

const PATH := "user://save.json"

static var records: Dictionary = {}
static var _loaded := false


static func load_records() -> void:
	if _loaded:
		return
	_loaded = true
	if not FileAccess.file_exists(PATH):
		return
	var f := FileAccess.open(PATH, FileAccess.READ)
	var data: Variant = JSON.parse_string(f.get_as_text())
	if data is Dictionary:
		records = data
		_migrate()


## v2: the secret Nightmare Nebula moved from World 6 to World 7 (World 6 is now the Carnival),
## so its records move from w6_* to w7_*. Runs once per save (marked by "_v").
static func _migrate() -> void:
	if int(records.get("_v", 1)) >= 2:
		return
	for key: String in records.keys():
		if key.begins_with("w6_"):
			records["w7_" + key.substr(3)] = records[key]
			records.erase(key)
	records["_v"] = 2
	_write()


static func get_record(id: String) -> Dictionary:
	load_records()
	return records.get(id, {})


## Merge a finished run into the record. Returns which fields are new bests.
static func submit(id: String, time: float, lums: int, gems: Array, snoozling := false) -> Dictionary:
	load_records()
	var r: Dictionary = records.get(id, {"time": 0.0, "lums": 0, "gems": [false, false, false], "done": false})
	var news := {}
	if not r.get("done", false) or time < float(r.get("time", 0.0)):
		r["time"] = time
		news["time"] = true
	if lums > int(r.get("lums", 0)):
		r["lums"] = lums
		news["lums"] = true
	var old_gems: Array = r.get("gems", [false, false, false])
	for i in gems.size():
		if gems[i] and not (i < old_gems.size() and old_gems[i]):
			news["gems"] = true
		while old_gems.size() <= i:
			old_gems.append(false)
		old_gems[i] = old_gems[i] or gems[i]
	r["gems"] = old_gems
	if snoozling and not r.get("snoozling", false):
		news["snoozling"] = true
	r["snoozling"] = r.get("snoozling", false) or snoozling
	r["done"] = true
	records[id] = r
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(records, "\t"))
	return news


static func _write() -> void:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(records, "\t"))


static func _shop() -> Dictionary:
	load_records()
	if not records.get("_shop") is Dictionary:
		records["_shop"] = {"bank": 0, "owned": []}
	return records["_shop"]


## Lums saved up for the Lum Shop (every Lum from every finished run goes in).
static func lum_bank() -> int:
	return int(_shop().get("bank", 0))


static func bank_lums(n: int) -> void:
	var s := _shop()
	s["bank"] = int(s.get("bank", 0)) + maxi(n, 0)
	_write()


static func owns(item: String) -> bool:
	return item in _shop().get("owned", [])


## Spend `price` Lums on `item`. False (and nothing spent) if it's owned or too dear.
static func buy(item: String, price: int) -> bool:
	var s := _shop()
	if owns(item) or int(s.get("bank", 0)) < price:
		return false
	s["bank"] = int(s["bank"]) - price
	var owned: Array = s.get("owned", [])
	owned.append(item)
	s["owned"] = owned
	_write()
	return true


static func has_snoozling(id: String) -> bool:
	return get_record(id).get("snoozling", false)


## Totals across a world (for the world map).
static func world_totals(world_id: String) -> Dictionary:
	var t := {"done": 0, "levels": 0, "gems": 0, "gems_total": 0, "snoozlings": 0}
	for l in LevelCatalog.levels_in(world_id):
		var r := get_record(l["id"])
		t["levels"] += 1
		t["gems_total"] += 3
		if r.get("done", false):
			t["done"] += 1
		for g in r.get("gems", []):
			if g:
				t["gems"] += 1
		if r.get("snoozling", false):
			t["snoozlings"] += 1
	return t


static func has_gem(id: String, index: int) -> bool:
	var g: Array = get_record(id).get("gems", [])
	return index < g.size() and g[index]
