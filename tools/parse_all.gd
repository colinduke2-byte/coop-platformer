extends Node
## Loads every .gd in the project (with autoloads present) so parse / compile
## errors in scripts nothing references yet still fail tools/check.sh.

func _ready() -> void:
	var bad := 0
	for path in _scripts("res://"):
		var s := load(path) as Script
		if s == null or not s.can_instantiate() and not s.is_abstract():
			if s == null or s.reload() != OK:
				print("PARSE FAIL  ", path)
				bad += 1
	print("parsed scripts, %d failures" % bad)
	get_tree().quit(1 if bad > 0 else 0)


func _scripts(dir: String) -> PackedStringArray:
	var out := PackedStringArray()
	for f in DirAccess.get_files_at(dir):
		if f.ends_with(".gd"):
			out.append(dir.path_join(f))
	for d in DirAccess.get_directories_at(dir):
		if not d.begins_with("."):
			out.append_array(_scripts(dir.path_join(d)))
	return out
