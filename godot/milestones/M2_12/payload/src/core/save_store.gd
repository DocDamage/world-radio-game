class_name SaveStore
extends RefCounted
## Validated JSON with same-directory atomic replacement and a good backup.
const Extensions = preload("res://src/core/profile_extensions.gd")
var path: String
var last_error := ""
var recovered := false
var read_only := false

func _init(save_path: String = "user://profile.json") -> void:
	path = save_path

static func defaults() -> Dictionary:
	return {"version": 1, "favorites": [], "visited": {}, "volume": 0.65,
		"last_station": "paris-rmc-fr", "ffmpeg_path": "", "auto_rotate": false,
		"globe_style": "earth", "clouds_visible": true, "day_night": false, "regional_streams": {}, "voyages": {}}

func load_profile() -> Dictionary:
	last_error = ""
	recovered = false
	read_only = false
	if not FileAccess.file_exists(path):
		return defaults()
	var primary := _read(path)
	var version: Variant = primary.get("version", 0)
	if (version is int or version is float) and version > 1:
		read_only = true
		last_error = "A newer save version exists. It will not be overwritten."
		return defaults()
	if _valid(primary):
		return _normalize(primary)
	var backup := _read(path + ".bak")
	if _valid(backup):
		recovered = true
		last_error = "Recovered profile from the last valid backup."
		return _normalize(backup)
	read_only = true
	last_error = "The profile and backup are invalid. They have been preserved; this session will not overwrite them."
	return defaults()

func save_profile(data: Dictionary) -> bool:
	if read_only:
		return false
	if not _valid(data):
		last_error = "Refused to save an invalid profile."
		return false
	var absolute := ProjectSettings.globalize_path(path)
	DirAccess.make_dir_recursive_absolute(absolute.get_base_dir())
	var file := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	if file == null:
		last_error = "Cannot write profile: " + error_string(FileAccess.get_open_error())
		return false
	file.store_string(JSON.stringify(_normalize(data), "	"))
	file.flush()
	file.close()
	if not _valid(_read(path + ".tmp")):
		last_error = "Profile write verification failed."
		return false
	# Never rotate a corrupt primary over a valid backup.
	if _valid(_read(path)):
		var copy_error := DirAccess.copy_absolute(absolute, absolute + ".bak")
		if copy_error != OK:
			last_error = "Could not preserve backup; profile was not replaced."
			return false
	var result := DirAccess.rename_absolute(absolute + ".tmp", absolute)
	if result != OK:
		last_error = "Profile replacement failed: " + error_string(result)
		return false
	return true

func _read(filename: String) -> Dictionary:
	if not FileAccess.file_exists(filename):
		return {}
	var f := FileAccess.open(filename, FileAccess.READ)
	if f == null or f.get_length() > 16000000:
		return {}
	var parser := JSON.new()
	if parser.parse(f.get_as_text()) != OK or not parser.data is Dictionary:
		return {}
	return parser.data

func _valid(d: Dictionary) -> bool:
	var version: Variant = d.get("version", 0)
	if not (version is int or version is float) or version != 1:
		return false
	if not d.get("favorites") is Array or not d.get("visited") is Dictionary:
		return false
	if not (d.get("volume") is float or d.get("volume") is int):
		return false
	return is_finite(d.volume)

func _normalize(d: Dictionary) -> Dictionary:
	var result := defaults()
	result.volume = clampf(d.volume, 0.0, 1.0)
	for id in d.favorites:
		if id is String and id.length() <= 256 and not result.favorites.has(id):
			result.favorites.append(id)
	for id in d.visited:
		if id is String and d.visited[id] is Dictionary:
			result.visited[id] = d.visited[id].duplicate(true)
	for key in ["last_station", "ffmpeg_path"]:
		if d.get(key) is String:
			result[key] = d[key].left(4096)
	result.auto_rotate = d.get("auto_rotate", false) == true
	var style: Variant = d.get("globe_style", "earth")
	if style is String and style in ["earth", "map"]:
		result.globe_style = style
	if d.get("clouds_visible") is bool:
		result.clouds_visible = d.clouds_visible
	if d.get("day_night") is bool:
		result.day_night = d.day_night
	result.regional_streams = Extensions.streams(d.get("regional_streams"))
	result.voyages = Extensions.voyages(d.get("voyages"))
	return result
