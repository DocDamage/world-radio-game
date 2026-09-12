extends Node
## M1.1 host integration. RadioPlayer, AppState and StationCatalog remain untouched autoloads.
const TravelPanel = preload("res://src/exploration/travel_panel.gd")
const Layout = preload("res://src/exploration/explorer_layout.gd")
const Router = preload("res://src/exploration/explorer_input.gd")
const Workflow = preload("res://src/exploration/region_workflow.gd")
const FeatureInspector = preload("res://src/exploration/feature_inspector.gd")
const Library = preload("res://src/exploration/library/library_controller.gd")
const MarineUI = preload("res://src/exploration/marine/marine_controller.gd")
var marine_ui: Node
const DEFAULT_PACK := "res://data/demo_region/manifest.json"
var host: Control
var session: TWWorldSession
var bridge: TWEarthHostBridge
var panel: VBoxContainer
var layout: RefCounted
var input_router: RefCounted
var source: TWRegionPack
var manifest_path: String = DEFAULT_PACK
var selected_geo := PackedFloat64Array([41.3083, -72.9279, 0.0])
var covered: bool = false
var picker: FileDialog
var region_workflow: Node
var region_library: Node
var feature_inspector: Node
var ground_environment: Environment
var marker: MeshInstance3D
var original_globe_process_mode: ProcessMode
var _tick: float = 0.0

func setup(app: Control) -> void:
	host = app
	original_globe_process_mode = host.globe.process_mode
	var viewport: SubViewport = host.get_node("%GlobeViewport").get_child(0)
	session = TWWorldSession.new()
	session.name = "EarthSession"
	viewport.add_child(session)
	session.walker.set_process_unhandled_input(false)
	session.walker.input_allowed = false
	_setup_environment()
	bridge = TWEarthHostBridge.new()
	add_child(bridge)
	bridge.bind(session, host.globe, host.globe.camera, RadioPlayer)
	bridge._restore_orbit()
	input_router = Router.new()
	input_router.setup(host, self)
	panel = TravelPanel.new()
	layout = Layout.new()
	layout.setup(host, self, panel)
	_setup_marker()
	_setup_picker()
	region_workflow = Workflow.new()
	add_child(region_workflow)
	region_workflow.setup(self)
	region_library = Library.new()
	add_child(region_library)
	region_library.setup(self)
	feature_inspector = FeatureInspector.new()
	add_child(feature_inspector)
	feature_inspector.setup(self)
	marine_ui = MarineUI.new()
	add_child(marine_ui)
	marine_ui.setup(self)
	panel.inspect_requested.connect(feature_inspector.open)
	panel.library_requested.connect(region_library.open)
	panel.prepare_requested.connect(region_workflow.open)
	panel.builtin_requested.connect(func(path): load_manifest(path))
	panel.locate_requested.connect(locate_region)
	panel.manifest_requested.connect(func(): input_router.release_controls(); picker.popup_centered_ratio(0.75))
	panel.station_requested.connect(func(): sync_station(host.selected, true))
	panel.coordinates_requested.connect(submit_coordinates)
	panel.descend_requested.connect(descend)
	panel.return_requested.connect(return_to_orbit)
	panel.walk_requested.connect(input_router.capture_controls)
	panel.expand_requested.connect(layout.toggle_expanded)
	host.globe.location_picked.connect(func(lat, lon):
		set_destination(PackedFloat64Array([lat, lon, 0.0]))
		layout.open_panel()
		host.browser.set_nearby_center(lat, lon, "Selected destination", true))
	session.state_changed.connect(_state_changed)
	session.message.connect(_message)
	session.landed.connect(func(_geo):
		input_router.release_controls()
		_message("Landed safely. Click the world or Walk / resume. Esc releases the mouse; radio keeps playing."))
	load_manifest(DEFAULT_PACK, false)
	_state_changed("ORBIT")

func _setup_environment() -> void:
	# Camera overrides leave the globe's original WorldEnvironment unchanged.
	ground_environment = Environment.new()
	ground_environment.background_mode = Environment.BG_COLOR
	ground_environment.background_color = Color("a7bfce")
	ground_environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	ground_environment.ambient_light_color = Color("aab9ce")
	ground_environment.ambient_light_energy = 0.5
	ground_environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	ground_environment.fog_enabled = true
	ground_environment.fog_light_color = Color("acbdc4")
	ground_environment.fog_density = 0.00065
	session.flight_camera.environment = ground_environment
	session.walker.camera.environment = ground_environment
	session.marine.boat.camera.environment = ground_environment
	session.marine.swimmer.surface_environment = ground_environment
	session.marine.swimmer.camera.environment = ground_environment
	var sun := DirectionalLight3D.new()
	sun.name = "LocalSun"
	sun.rotation_degrees = Vector3(-48, -35, 0)
	sun.light_energy = 0.62
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 180.0
	session.add_child(sun)

func _setup_marker() -> void:
	marker = MeshInstance3D.new()
	marker.name = "TravelDestination"
	var sphere := SphereMesh.new()
	sphere.radius = 0.009
	sphere.height = 0.018
	sphere.radial_segments = 12
	sphere.rings = 6
	marker.mesh = sphere
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.albedo_color = Color("ffc36d")
	marker.material_override = material
	host.globe.add_child(marker)

func _setup_picker() -> void:
	picker = FileDialog.new()
	picker.title = "Load local region manifest (no download)"
	picker.access = FileDialog.ACCESS_FILESYSTEM
	picker.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	picker.use_native_dialog = false
	picker.filters = PackedStringArray(["*.json ; TerraWave region manifest"])
	host.add_child(picker)
	picker.file_selected.connect(func(path):
		picker.hide()
		region_workflow.review_external(path))
	for dialog in [host.settings, host.passport, picker]:
		dialog.visibility_changed.connect(func():
			if dialog.visible: input_router.release_controls())

func load_manifest(path: String, locate: bool = true) -> bool:
	if session.state != "ORBIT":
		_message("Return to orbit before changing the installed region.")
		return false
	var candidate := TWRegionPack.new()
	if not candidate.open(path):
		_message("Region not loaded: " + candidate.error)
		return false
	source = candidate
	manifest_path = path
	panel.apply_manifest(source.manifest)
	if locate:
		locate_region()
	else:
		_refresh_coverage()
	return true

func locate_region() -> void:
	if source == null or session.state != "ORBIT":
		return
	var anchor := PackedFloat64Array(source.manifest.anchor)
	var target := anchor
	# A coastal region's geographic center may be in water. Locate its declared dry spawn.
	if source.manifest.get("water_model") == TWWaterGeometry.LEVEL_MODEL:
		var frame := TWLocalFrame.new(anchor)
		var spawn: Array = source.manifest.spawn
		target = frame.local_to_geographic(Vector3(float(spawn[0]), 0.0, float(spawn[2])))
		target[2] = anchor[2]
	set_destination(target, true)
	host.browser.set_nearby_center(target[0], target[1], str(source.manifest.get("name", "Installed region")), true)
	layout.open_panel()

func sync_station(station: Dictionary, focus: bool = false) -> void:
	if station.is_empty() or session.state != "ORBIT":
		return
	set_destination(PackedFloat64Array([station.geo_lat, station.geo_long, 0.0]), focus)

func set_destination(geo: PackedFloat64Array, focus: bool = false) -> bool:
	if session.state != "ORBIT" or not TWGeodesy.valid(geo):
		return false
	selected_geo = geo.duplicate()
	panel.set_selection(selected_geo)
	marker.position = GeoMath.unit(geo[0], geo[1]) * 1.02
	if focus:
		host.globe.focus_location(geo[0], geo[1])
	_refresh_coverage()
	return true

func submit_coordinates(lat: String, lon: String) -> void:
	if not lat.strip_edges().is_valid_float() or not lon.strip_edges().is_valid_float() or not set_destination(PackedFloat64Array([lat.to_float(), lon.to_float(), 0.0]), true):
		_message("Enter latitude −90…90 and longitude −180…180 as finite numbers.")

func _refresh_coverage() -> void:
	covered = false
	if source != null:
		var frame := TWLocalFrame.new(PackedFloat64Array(source.manifest.anchor))
		var local := frame.geographic_to_local(selected_geo)
		covered = absf(local.y) <= 100.0 and source.contains(local, 4.0) and source.has_chunk(source.key_at(local))
	panel.set_state(session.state, covered)
	_message("Installed region covers this coordinate. Surface checks run before landing." if covered else "No installed region here. Use Locate installed region or load a supported local package.")

func descend() -> bool:
	if session.state != "ORBIT":
		return false
	input_router.release_controls()
	if not covered:
		_message("No installed ground data at this coordinate. No fictional location was generated.")
		return false
	return bridge.enter_region(manifest_path, selected_geo[0], selected_geo[1])

func return_to_orbit() -> void:
	input_router.release_controls()
	session.cancel()
	_message("Returned to orbit. Radio selection, playback and saved progress were not reset.")

func _state_changed(state: String) -> void:
	input_router.release_controls()
	host.globe.cancel_drag()
	host.globe.process_mode = original_globe_process_mode if state == "ORBIT" else Node.PROCESS_MODE_DISABLED
	host.globe.input_enabled = state == "ORBIT"
	panel.set_state(state, covered)
	if region_workflow != null: region_workflow._refresh()
	if region_library != null: region_library.update_actions()
	layout.set_state(state)
	if state == "ORBIT":
		host.globe.update_camera()

func _message(text: String) -> void:
	panel.detail.text = text
	host._toast(text)

func _process(delta: float) -> void:
	if host == null:
		return
	input_router.update()
	_tick += delta
	if _tick < 0.2:
		return
	_tick = 0.0
	if session.state != "ORBIT":
		var d := session.streamer.diagnostics()
		panel.progress.value = 100.0 * d.resident / maxf(1.0, d.resident + d.queued)
		panel.diagnostics.text = "%d / 25 chunks · %d queued\n%d buildings · %d origin shifts\nCPU %.1f ms · upload %.1f ms" % [d.resident, d.queued, d.buildings, session.frame.shifts, d.cpu_ms, d.commit_ms]
		if session.state in ["WALKING", "SAILING", "SWIMMING"]:
			var geo := session.horizontal_location()
			panel.live_coordinates.text = "%.6f, %.6f" % [geo[0], geo[1]]
			var elevation := session.pack.elevation_record(session.region_position())
			if elevation.value_m != null and session.state == "WALKING":
				panel.live_coordinates.text += "\nGround %.2f m · %s" % [elevation.value_m, elevation.reference]
			layout.status.text = "%s · %.6f, %.6f · %d / 25 chunks · Esc: release · Ctrl+K: radio search" % [str(source.manifest.coverage).to_upper(), geo[0], geo[1], d.resident]
			if session.state == "SAILING":
				var boat: Node = session.marine.boat
				panel.live_coordinates.text += "\n%.1f km/h · modeled depth %.1f m" % [absf(boat.speed)*3.6, session.marine.coastal.environment.depth_at(session.region_position().x, session.region_position().z)]
				layout.status.text = "SAILING · %.1f km/h · %s · %d / 25 chunks · Esc: stop controls" % [absf(boat.speed) * 3.6, boat.status, d.resident]
			if session.state == "SWIMMING":
				var swimmer: Node = session.marine.swimmer
				layout.status.text = "SWIMMING · Air %.0f s · Stamina %.0f%% · Ctrl: dive · Space: surface · E: exit" % [swimmer.oxygen,swimmer.stamina]
		elif session.state == "TRANSFER":
			layout.status.text = "Transferring — controls resume after arrival"
		else:
			layout.status.text = "Preparing a walkable landing · " + str(source.manifest.coverage)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and input_router != null:
		input_router.release_controls()

func _exit_tree() -> void:
	# Unique-name UI lookups are invalid once the owning scene starts leaving the tree.
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if is_instance_valid(session):
		session.set_block_signals(true)
		session.cancel(false)
