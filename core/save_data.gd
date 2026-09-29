class_name SaveData
## Best results per level, stored in user://save.json.
## records[level_id] = {"time": float, "lums": int, "gems": [bool, bool, bool], "done": bool}

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


static func get_record(id: String) -> Dictionary:
	load_records()
	return records.get(id, {})


## Merge a finished run into the record. Returns which fields are new bests.
static func submit(id: String, time: float, lums: int, gems: Array) -> Dictionary:
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
	r["done"] = true
	records[id] = r
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(records, "\t"))
	return news


static func has_gem(id: String, index: int) -> bool:
	var g: Array = get_record(id).get("gems", [])
	return index < g.size() and g[index]
