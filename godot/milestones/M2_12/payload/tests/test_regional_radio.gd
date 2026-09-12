extends SceneTree
const Regional = preload("res://src/core/regional_catalog.gd")
const Codec = preload("res://src/core/catalog_codec.gd")
const Directory = preload("res://src/core/station_directory.gd")
const Store = preload("res://src/core/save_store.gd")
const Extensions = preload("res://src/core/profile_extensions.gd")
const Geo = preload("res://src/core/geo_math.gd")
var checks := 0
var failures: Array[String] = []
func _initialize() -> void:
	call_deferred("run")
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label); printerr("FAIL ", label)
func run() -> void:
	var local := Regional.rows()
	check(local.size() == 12, "Twelve regional station records parse")
	var starter := Codec.parse(JSON.parse_string(FileAccess.get_file_as_string("res://data/catalog.json")))
	var merged := Regional.merge(starter.stations, local)
	check(merged.size() == 20, "Eight starters plus regional records, no replacement")
	var sites := 0
	var streams := 0
	var cities := {}
	for row in local:
		cities[row.place] = true
		if row.playback_mode == "website": sites += 1
		else: streams += 1
		check(Codec.valid_url(row.homepage) and Codec.valid_url(row.source_url), "Safe official provenance for " + row.id)
	check(cities.size() == 7 and cities.has("New Haven"), "Seven regional municipalities")
	check(sites == 9 and streams == 3, "Website and native stream availability are explicit")
	var near := Regional.nearby(merged, 41.3083, -72.9279, 50.0)
	check(near.total == 12, "All twelve nearby at fifty km, not New York")
	check(near.stations[0].distance_km < 0.002, "New Haven distance origin")
	var ordered := true
	for i in range(1, near.stations.size()):
		if near.stations[i].distance_km < near.stations[i-1].distance_km: ordered = false
	check(ordered, "Distance ordering is ascending")
	check(Regional.nearby(merged, 41.3083, -72.9279, 25.0).total < 12, "Radius reduces scope")
	check(Regional.nearby(merged, 41.3083, -72.9279, 50.0, "WNHU").total == 1, "Nearby searches callsigns")
	check(Regional.nearby(merged, 41.3083, -72.9279, 50.0, "WNHU West Haven").total == 1, "Nearby search combines terms")
	check(Regional.nearby(merged, 41.3083, -72.9279, 50.0, "", ["ct-wpk n", "ct-wplr-fm"]).total == 1, "Saved and radius filters intersect")
	check(Regional.nearby(merged, 41.3083, -72.9279, 50.0, "", null, 3, 3).stations.size() == 3, "Nearby pagination")
	check(Regional.nearby(merged, 41.3083, -72.9279, 50.0, "", null, 3, 999).stations.is_empty(), "Out of range page empty")
	check(Regional.nearby(merged, NAN, -72.0, 50.0).total == 0, "Reject NaN center")
	check(Regional.nearby(merged, 91.0, -72.0, 50.0).total == 0, "Reject invalid latitude")
	check(Regional.nearby(merged, 41.0, -72.0, INF).total == 0, "Reject infinite radius")
	check(Regional.nearby(merged, 41.0, -72.0, -2.0).total == 0, "Reject negative radius")
	check(absf(Geo.distance_km(Vector2.ZERO, Vector2.ZERO)) < 0.000001, "Zero distance stable")
	check(absf(Geo.distance_km(Vector2.ZERO, Vector2(0, 0.001)) - 0.111195) < 0.0001, "One hundred meter scale retained")
	check(Geo.distance_km(Vector2(0,179.999), Vector2(0,-179.999)) < 0.23, "Antimeridian short crossing")
	check(Geo.distance_km(Vector2(90,-20), Vector2(90,130)) < 0.0001, "Polar longitude convergence")
	check(Regional.merge(merged, local).size() == 20, "Repeated merge does not duplicate stations")
	var imported: Dictionary = local[0].duplicate(true)
	imported.streamUrl = "https://user.example/live"
	imported.playback_mode = "stream"
	var same_id := Regional.merge([imported], local)
	check(same_id.size() == 12 and same_id[0].streamUrl == imported.streamUrl, "Imported exact ID and stream win")
	imported.id = "my-wybc"
	var same_call := Regional.merge([imported], local)
	check(same_call.size() == 12 and same_call[0].id == "my-wybc", "Alternate explicit callsign retains user ID")
	var unsafe: Dictionary = local[0].duplicate(true)
	unsafe.homepage = "file:///etc/passwd"
	check(Codec.parse([unsafe]).stations.is_empty(), "Website-only station needs safe homepage")
	unsafe.homepage = "https://example.com/"
	unsafe.erase("playback_mode")
	check(Codec.parse([unsafe]).stations.is_empty(), "Blank streams not silently converted to websites")
	check(Directory.mirror_urls([{ "name":"de1.api.radio-browser.info"},{"name":"de1.api.radio-browser.info"},{"name":"evil.example"},{"name":"de1.api.radio-browser.info.evil.com"}]).size() == 1, "Directory mirrors restricted and unique")
	check(Directory.mirror_urls({"name":"de1.api.radio-browser.info"}).is_empty(), "Reject malformed mirror response")
	var sample := {"countrycode":"US", "lastcheckok":1, "name":"94.3 WYBC", "homepage":local[0].homepage, "url_resolved":"https://audio.example.org/live"}
	check(not Directory.choose(local[0], [sample]).is_empty(), "Exact callsign frequency homepage match accepted")
	for field_value in [["name","1340 WYBC AM"],["name","WYBCX"],["homepage","https://other.example"],["countrycode","CA"],["lastcheckok",0],["url_resolved","file:///etc/passwd"],["url_resolved","http://127.0.0.1/live"]]:
		var bad: Dictionary = sample.duplicate()
		bad[field_value[0]] = field_value[1]
		check(Directory.choose(local[0], [bad]).is_empty(), "Reject directory mismatch: " + str(field_value[0]) + " " + str(field_value[1]))
	check(Directory.choose(local[0], {"stations":[sample]}).is_empty(), "Reject malformed station response")
	check(Extensions.streams({"ct-a":{"streamUrl":"javascript:x"}, "other":{"streamUrl":"https://example.org/live"}}).is_empty(), "Saved streams reject unsafe URLs and foreign IDs")
	var profile_store = Store.new()
	var profile := profile_store.defaults()
	check(profile.has("regional_streams") and profile.has("voyages"), "Backward-compatible extension defaults")
	var cat := root.get_node("StationCatalog")
	check(cat.stations.size() == 20, "Autoload merges bundled regional stations")
	var player := root.get_node("RadioPlayer")
	player.state = "playing"
	var previous: Dictionary = {"id":"existing-owned-stream"}
	player.current = previous
	check(not player.play_station(local[0]), "Website rows never reach FFmpeg")
	check(player.state == "playing" and player.current.id == "existing-owned-stream", "Website request leaves existing playback untouched")
	player.state = "stopped"
	player.current = {}
	var service = Directory.new()
	root.add_child(service)
	var before: Dictionary = root.get_node("AppState").profile.duplicate(true)
	service.busy = true
	service.updates = {"ct-wybc-fm":{"streamUrl":"https://audio.example.org/live"}}
	var old_serial: int = service.request_serial
	service.cancel()
	check(not service.busy and service.updates.is_empty(), "Cancel drops uncommitted candidates")
	check(root.get_node("AppState").profile == before, "Cancel does not modify profile")
	service.busy = true
	service.phase = "servers"
	service._accept(old_serial, HTTPRequest.RESULT_SUCCESS, 200, PackedStringArray(), "[]".to_utf8_buffer())
	check(service.busy and service.phase == "servers", "Canceled stale response cannot finish a new lookup")
	service.cancel()
	service.queue_free()
	await process_frame
	print("REGIONAL_RADIO_RESULT ", JSON.stringify({"checks":checks,"failed":failures.size(),"failures":failures}))
	quit(0 if failures.is_empty() else 1)
