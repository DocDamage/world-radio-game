extends Node
## User-triggered Radio Browser lookup. Discovery and streams are separate from audio.
## API contract: https://api.radio-browser.info/ (mirror discovery and named User-Agent).
signal progress(message: String)
signal finished(updated: int, message: String)
const Codec = preload("res://src/core/catalog_codec.gd")
const Regional = preload("res://src/core/regional_catalog.gd")
const BOOTSTRAPS := ["https://de1.api.radio-browser.info", "https://all.api.radio-browser.info"]
var http: HTTPRequest
var busy := false
var phase := ""
var servers: Array[String] = []
var queue: Array = []
var index := 0
var server_index := 0
var bootstrap_index := 0
var updates := {}
var failed_requests := 0
var request_serial := 0

func start() -> void:
	if busy: return
	busy = true
	phase = "servers"
	servers.clear()
	queue = Regional.rows()
	index = 0
	server_index = 0
	bootstrap_index = 0
	updates.clear()
	failed_requests = 0
	progress.emit("Finding a radio directory mirror…")
	_request(BOOTSTRAPS[bootstrap_index] + "/json/servers")

func cancel() -> void:
	if not busy: return
	busy = false
	request_serial += 1
	if is_instance_valid(http): http.cancel_request()
	updates.clear()
	finished.emit(0, "Canceled. Catalog and previously saved streams are unchanged.")

func _request(url: String) -> void:
	request_serial += 1
	var serial := request_serial
	if is_instance_valid(http):
		http.cancel_request()
		http.queue_free()
	http = HTTPRequest.new()
	http.timeout = 8.0
	http.body_size_limit = 2000000
	http.max_redirects = 2
	add_child(http)
	http.request_completed.connect(func(result, code, headers, body): _accept(serial, result, code, headers, body))
	var err := http.request(url, PackedStringArray(["User-Agent: TerraWave/0.2.12 (+native radio discovery)", "Accept: application/json"]))
	if err != OK: _accept.call_deferred(serial, HTTPRequest.RESULT_CANT_CONNECT, 0, PackedStringArray(), PackedByteArray())

func _accept(serial: int, result: int, code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	# A canceled request must never commit into a newer lookup, even if its callback was queued.
	if serial != request_serial or not busy: return
	_completed(result, code, headers, body)

func _completed(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if not busy: return
	var data: Variant = null
	if result == HTTPRequest.RESULT_SUCCESS and code == 200 and body.size() <= 2000000:
		data = JSON.parse_string(body.get_string_from_utf8())
	if phase == "servers":
		servers = mirror_urls(data)
		if servers.is_empty():
			bootstrap_index += 1
			if bootstrap_index < BOOTSTRAPS.size():
				_request(BOOTSTRAPS[bootstrap_index] + "/json/servers")
				return
			_finish("Directory unavailable. Regional stations remain visible offline; use their website players or retry.")
			return
		servers.shuffle()
		phase = "stations"
		_query_next()
		return
	if not data is Array:
		failed_requests += 1
		server_index += 1
		if server_index < mini(2, servers.size()):
			_query_next()
			return
	else:
		var candidate := choose(queue[index], data)
		if not candidate.is_empty(): updates[queue[index].id] = candidate
	index += 1
	server_index = 0
	_query_next()

func _query_next() -> void:
	if not busy: return
	if index >= queue.size():
		_finish("Finished. %d regional streams resolved; %d request failures. Directory reports are not a live audio guarantee." % [updates.size(), failed_requests])
		return
	var station: Dictionary = queue[index]
	progress.emit("Looking up %s (%d/%d)…" % [station.name, index + 1, queue.size()])
	var call := str(station.callsign).get_slice("-", 0)
	_request(servers[server_index] + "/json/stations/search?countrycode=US&name=" + call.uri_encode() + "&hidebroken=true&limit=100")

func _finish(message: String) -> void:
	var app: Node = get_tree().root.get_node("AppState")
	var catalog: Node = get_tree().root.get_node("StationCatalog")
	busy = false
	var count := 0
	if not updates.is_empty() and not app.store.read_only:
		var next: Dictionary = app.profile.duplicate(true)
		for id in updates: next.regional_streams[id] = updates[id]
		if app.store.save_profile(next):
			app.profile = next
			catalog.apply_stream_updates()
			app.changed.emit()
			count = updates.size()
		else: message += " Save failed; previous profile and catalog retained."
	elif not updates.is_empty(): message += " Profile is read-only; candidates were not saved."
	finished.emit(count, message)

static func mirror_urls(data: Variant) -> Array[String]:
	var result: Array[String] = []
	if not data is Array or data.size() > 100: return result
	var pattern := RegEx.new()
	pattern.compile("^[a-z0-9-]+\\.api\\.radio-browser\\.info$")
	for row in data:
		if not row is Dictionary: continue
		var name := str(row.get("name", "")).to_lower()
		if pattern.search(name) and not result.has("https://" + name): result.append("https://" + name)
	return result

static func host(url: String) -> String:
	if not Codec.valid_url(url): return ""
	return url.get_slice("://", 1).get_slice("/", 0).get_slice(":", 0).trim_prefix("www.").to_lower()

static func choose(station: Dictionary, data: Variant) -> Dictionary:
	if not data is Array or data.size() > 100: return {}
	var call := str(station.callsign).get_slice("-", 0).to_upper()
	var names := RegEx.new()
	names.compile("(^|[^A-Z0-9])" + call + "([^A-Z0-9]|$)")
	var valid: Array[Dictionary] = []
	for row in data:
		if not row is Dictionary or row.get("countrycode", "") != "US" or row.get("lastcheckok", 0) != 1: continue
		if not names.search(str(row.get("name", "")).to_upper()): continue
		if host(str(row.get("homepage", ""))) != host(str(station.homepage)): continue
		# Same callsign can have distinct AM/FM services; don't silently choose the other one.
		var name := str(row.get("name", "")).to_upper()
		if str(station.callsign).ends_with("-AM") and not ("1340" in name or " AM" in name): continue
		if str(station.callsign) == "WYBC-FM" and not "94.3" in name: continue
		if str(station.callsign) == "WSHU-FM" and not "91.1" in name: continue
		var url := str(row.get("url_resolved", row.get("url", "")))
		if not public_stream(url): continue
		valid.append({"streamUrl": url, "checked_on": Time.get_datetime_string_from_system(true), "provider": "Radio Browser; directory check only"})
	valid.sort_custom(func(a, b): return a.streamUrl < b.streamUrl)
	return valid[0] if not valid.is_empty() else {}

static func public_stream(url: String) -> bool:
	if not Codec.valid_url(url): return false
	var hostname := host(url)
	if hostname.is_empty() or hostname.is_valid_ip_address() or "." not in hostname: return false
	if hostname.ends_with(".local") or hostname.ends_with(".localhost") or hostname.ends_with(".internal"): return false
	return not url.get_slice("?", 0).to_lower().ends_with(".html")
