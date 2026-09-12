extends Node
signal reloaded
const Codec = preload("res://src/core/catalog_codec.gd")
const Regional = preload("res://src/core/regional_catalog.gd")
var stations: Array[Dictionary] = []
var by_id: Dictionary = {}
var source_label := "Starter catalog"
var last_error := ""
var countries := 0
var cache_path := "user://catalog.json"
var imported_ids := {}

func _ready() -> void:
	var override := OS.get_environment("TERRAWAVE_CATALOG")
	if not override.is_empty():
		cache_path = override
	var issues := PackedStringArray()
	for path in [cache_path, "res://data/imported_catalog.json", "res://data/catalog.json"]:
		if not FileAccess.file_exists(path):
			continue
		if load_catalog(path):
			if not issues.is_empty():
				last_error = "Fell back to " + source_label + ". " + " ".join(issues)
			return
		issues.append(last_error)

func load_catalog(path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null or f.get_length() > 64000000:
		last_error = "Cannot read catalog, or file exceeds 64 MB."
		return false
	var json := JSON.new()
	if json.parse(f.get_as_text()) != OK:
		last_error = "Catalog is not valid JSON."
		return false
	var parsed: Dictionary = Codec.parse(json.data)
	if not parsed.error.is_empty() or parsed.stations.is_empty():
		last_error = parsed.error if not parsed.error.is_empty() else "Catalog contains no valid stations."
		return false
	imported_ids.clear()
	for row in parsed.stations: imported_ids[row.id] = true
	stations.assign(Regional.merge(parsed.stations, Regional.rows()))
	by_id.clear()
	var found := {}
	for station in stations:
		by_id[station.id] = station
		found[station.country] = true
	countries = found.size()
	source_label = ("Starter" if path == "res://data/catalog.json" else "Imported") + " + regional catalog"
	last_error = "Skipped %d invalid or duplicate entries." % parsed.rejected if parsed.rejected else ""
	apply_stream_updates()
	return true

func search(query: String = "", favorites_only: bool = false, limit: int = 100, offset: int = 0) -> Dictionary:
	var terms := query.strip_edges().to_lower().split(" ", false)
	var results: Array[Dictionary] = []
	var total := 0
	for station in stations:
		if favorites_only and not AppState.profile.favorites.has(station.id):
			continue
		var match_all := true
		for term in terms:
			if not term in station.search:
				match_all = false
				break
		if not match_all:
			continue
		if total >= offset and results.size() < limit:
			results.append(station)
		total += 1
	return {"stations": results, "total": total}

func nearby(lat: float, lon: float, radius_km: float = 50.0, query: String = "",
		favorites_only: bool = false, limit: int = 60, offset: int = 0) -> Dictionary:
	return Regional.nearby(stations, lat, lon, radius_km, query,
		AppState.profile.favorites if favorites_only else null, limit, offset)

func get_station(id: String) -> Dictionary:
	return by_id.get(id, {})

func import_catalog(path: String) -> bool:
	if not load_catalog(path):
		return false
	var dst := ProjectSettings.globalize_path(cache_path)
	if ProjectSettings.globalize_path(path) == dst:
		return true
	DirAccess.make_dir_recursive_absolute(dst.get_base_dir())
	var err := DirAccess.copy_absolute(path, dst + ".tmp")
	if err == OK:
		err = DirAccess.rename_absolute(dst + ".tmp", dst)
	if err != OK:
		last_error = "Catalog loaded for this session but could not be saved: " + error_string(err)
	return err == OK

func import_web_folder(folder: String) -> bool:
	var data_dir := folder.path_join("public/data")
	if not DirAccess.dir_exists_absolute(data_dir):
		data_dir = folder
	var raw_stations: Variant = _read_json(data_dir.path_join("stations.json"))
	var raw_places: Variant = _read_json(data_dir.path_join("places.json"))
	var result: Dictionary = Codec.from_web(raw_stations, raw_places)
	if not result.error.is_empty() or result.stations.is_empty():
		last_error = result.error if not result.error.is_empty() else "No valid geolocated stations in these snapshots."
		return false
	var output := {"schema_version": 1, "source": "Imported from web project folder", "stations": result.stations}
	var temporary := cache_path + ".import"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(temporary).get_base_dir())
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		last_error = "Could not write the imported catalog."
		return false
	file.store_string(JSON.stringify(output))
	file.close()
	var success := import_catalog(ProjectSettings.globalize_path(temporary))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(temporary))
	if success:
		last_error = "Imported %d stations; skipped %d invalid/duplicate and %d without valid coordinates." % [result.stations.size(), result.rejected, result.missing_geo]
	return success

func _read_json(path: String) -> Variant:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() > 64000000:
		return null
	var parser := JSON.new()
	return parser.data if parser.parse(file.get_as_text()) == OK else null

func apply_stream_updates() -> void:
	for id in AppState.profile.regional_streams:
		if not by_id.has(id) or imported_ids.has(id): continue
		var row: Dictionary = AppState.profile.regional_streams[id]
		if not Codec.valid_url(row.get("streamUrl")): continue
		by_id[id].streamUrl = row.streamUrl
		by_id[id].playback_mode = "stream"
		by_id[id].stream_status = "Directory-reported endpoint; live audio untested"
		by_id[id].checked_on = str(row.get("checked_on", ""))
	reloaded.emit()
