class_name FrameStats
extends RefCounted
## Real frame-time tracker for the F3 overlay: median / slowest-1% / worst over the last
## few seconds, plus a log of hitches (frames over HITCH_MS) with the level and x position.
## Cost is one array write per frame, and only while the overlay is open.

const WINDOW := 600          ## frames kept (about 5 s at 120 fps)
const HITCH_MS := 12.0       ## a frame this slow is a visible stutter at 120 fps
const MAX_LOG := 200

var _times := PackedFloat32Array()
var _last_us := 0
var hitches: Array[String] = []
var total_frames := 0


func reset() -> void:
	_times.clear()
	_last_us = 0
	hitches.clear()
	total_frames = 0


## Call once per rendered frame. `where` describes the spot (level + player x) for the hitch log.
func record(where: String) -> void:
	var now := Time.get_ticks_usec()
	if _last_us != 0:
		var ms := float(now - _last_us) / 1000.0
		_times.append(ms)
		if _times.size() > WINDOW:
			_times.remove_at(0)
		total_frames += 1
		if ms > HITCH_MS and hitches.size() < MAX_LOG:
			hitches.append("%.1f ms  t=%.1fs  %s" % [ms, float(now) / 1.0e6, where])
	_last_us = now


func percentile(p: float) -> float:
	if _times.is_empty():
		return 0.0
	var s := _times.duplicate()
	s.sort()
	return s[clampi(int(p * float(s.size() - 1)), 0, s.size() - 1)]


func worst() -> float:
	return percentile(1.0)


func summary() -> String:
	return "frame ms  median %.1f   p99 %.1f   worst %.1f   hitches>%d ms: %d" % [
			percentile(0.5), percentile(0.99), worst(), int(HITCH_MS), hitches.size()]


## Writes the whole report (summary + hitch log) next to the save data; returns the path.
func save_report(extra: String) -> String:
	var path := "user://perf_report.txt"
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return ""
	f.store_line("DREAMERS performance report")
	f.store_line(extra)
	f.store_line("renderer: %s   gpu: %s" % [RenderingServer.get_current_rendering_method(), RenderingServer.get_video_adapter_name()])
	f.store_line("cpu: %s" % OS.get_processor_name())
	f.store_line("frames recorded: %d" % total_frames)
	f.store_line(summary())
	f.store_line("-- hitches (ms, time, where) --")
	for h in hitches:
		f.store_line(h)
	f.close()
	return ProjectSettings.globalize_path(path)
