extends SceneTree
var checks := 0
var failures: Array[String] = []
func _initialize() -> void:
	call_deferred("_run")
func check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures.append(label)
		printerr("FAIL: ", label)
func write_json(path: String, data: Variant) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(data))
	file.close()
func _run() -> void:
	var isolated := OS.get_environment("TERRAWAVE_CATALOG")
	if isolated.is_empty():
		printerr("Set TERRAWAVE_CATALOG to an isolated temporary path before running import tests.")
		quit(2)
		return
	var folder := isolated.get_base_dir().path_join("fixture-web")
	DirAccess.make_dir_recursive_absolute(folder.path_join("public/data"))
	var stations := [{"id": "alpha", "name": "Alpha", "placeId": "one", "streamUrl": "https://example.com/a.mp3"},
		{"id": "beta", "name": "Beta", "placeId": "two"},
		{"id": "missing", "name": "No coordinates", "placeId": "none"},
		{"id": "alpha", "name": "Duplicate", "placeId": "one"}]
	var places := [{"id": "one", "title": "Tokyo", "country": "Japan", "geo": [139.7, 35.65]},
		{"id": "two", "title": "Null Island", "country": "Test", "geo": [0, 0]}]
	var station_path := folder.path_join("public/data/stations.json")
	var place_path := folder.path_join("public/data/places.json")
	write_json(station_path, stations)
	write_json(place_path, places)
	var original := FileAccess.get_sha256(station_path)
	var catalog := root.get_node("StationCatalog")
	check(catalog.import_web_folder(folder), "Native web-folder import succeeds")
	check(catalog.stations.size() == 14, "Native import filters missing and duplicate entries")
	check(catalog.get_station("alpha").place == "Tokyo", "Place metadata joined")
	check(catalog.get_station("beta").geo_lat == 0.0, "Valid zero coordinate retained")
	check(catalog.get_station("beta").streamUrl.ends_with("/beta/channel.mp3"), "Radio Garden fallback translated")
	check(FileAccess.get_sha256(station_path) == original, "Web source remains byte-identical")
	check(FileAccess.file_exists(isolated), "Native catalog is saved outside source project")
	check(catalog.load_catalog(isolated), "Persisted native catalog reloads")
	var current_digest := FileAccess.get_sha256(isolated)
	write_json(station_path, {"not": "an array"})
	check(not catalog.import_web_folder(folder), "Malformed source reports failure")
	check(FileAccess.get_sha256(isolated) == current_digest, "Failed import preserves previous catalog")
	check(catalog.stations.size() == 14, "Failed import preserves in-memory station selection data")
	# Scale fixture, not a claim about real source station count or public availability.
	stations.clear()
	for i in range(20000):
		stations.append({"id": "scale_%d" % i, "name": "Station %d" % i,
			"placeId": "one", "streamUrl": "https://example.com/%d.mp3" % i})
	write_json(station_path, stations)
	var started := Time.get_ticks_msec()
	check(catalog.import_web_folder(folder), "20,000-row synthetic web snapshot imports")
	var elapsed := Time.get_ticks_msec() - started
	check(catalog.stations.size() == 20012, "Scale import preserves all unique station IDs")
	check(catalog.search("Station 19999").total == 1, "Scale search finds last row")
	check(catalog.search("", false, 60, 19980).stations.size() == 32, "Final pagination page is bounded")
	print("IMPORT_RESULT ", JSON.stringify({"checks": checks, "failed": failures.size(), "failures": failures,
		"synthetic_rows": 20000, "scale_import_ms": elapsed, "real_full_catalog_tested": false}))
	quit(0 if failures.is_empty() else 1)
