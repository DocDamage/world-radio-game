extends Control
const Kit = preload("res://src/ui/theme_kit.gd")
const EarthController = preload("res://src/exploration/native_earth_controller.gd")
const ViewControls = preload("res://src/ui/globe_view_controls.gd")
const Setup = preload("res://src/core/input_setup.gd")
const SettingsDialog = preload("res://src/ui/settings_dialog.gd")
const PassportDialog = preload("res://src/ui/passport_dialog.gd")
@onready var globe = %Globe
@onready var browser = %Browser
@onready var inspector = %Inspector
@onready var player_controls = %PlayerControls
var settings := AcceptDialog.new()
var passport := AcceptDialog.new()
var selected: Dictionary = {}
var stats: Label
var coordinates: Label
var beacon_label: Label
var toast: Label
var orbit_button: Button
var view_controls: HFlowContainer
var earth: Node
var stream_dialog: AcceptDialog

func _ready() -> void:
	theme = Kit.make()
	Setup.install()
	_build_header()
	_build_globe_controls()
	_build_footer()
	settings.set_script(SettingsDialog)
	settings.theme = theme
	add_child(settings)
	passport.set_script(PassportDialog)
	passport.theme = theme
	add_child(passport)
	browser.selected.connect(select_station)
	globe.station_picked.connect(_pick_station_cluster)
	earth = EarthController.new()
	add_child(earth)
	earth.setup(self)
	stream_dialog = preload("res://src/ui/station_directory_dialog.gd").new()
	add_child(stream_dialog)
	browser.refresh_streams_requested.connect(func():
		earth.input_router.release_controls()
		stream_dialog.open())
	%GlobeViewport.gui_input.connect(earth.input_router.viewport_input)
	%GlobeViewport.mouse_exited.connect(globe.cancel_drag)
	globe.location_changed.connect(func(lat, lon): coordinates.text = "ORBIT  %.2f°  /  %.2f°" % [lat, lon])
	inspector.favorite_requested.connect(_favorite)
	inspector.website_requested.connect(_open_station_site)
	browser.region_requested.connect(func():
		globe.focus_location(41.3083, -72.9279)
		earth.set_destination(PackedFloat64Array([41.3083, -72.9279, 0.0])))
	inspector.passport_requested.connect(passport.open_passport)
	passport.destination_requested.connect(select_station)
	player_controls.listen_requested.connect(_listen)
	AppState.changed.connect(_refresh_stats)
	AppState.warning.connect(_toast)
	StationCatalog.reloaded.connect(_reload_catalog)
	_reload_catalog()
	_refresh_stats()
	if not StationCatalog.last_error.is_empty():
		_toast(StationCatalog.last_error)
	if not AppState.store.last_error.is_empty():
		_toast(AppState.store.last_error)
	_process_user_args.call_deferred()

func _build_header() -> void:
	var brand := Kit.label("TERRAWAVE", 27, Kit.ACCENT)
	%Header.add_child(brand)
	var stamp := Kit.label("  NATIVE / " + str(ProjectSettings.get_setting("application/config/version", "")), 12, Kit.MUTED)
	%Header.add_child(stamp)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	%Header.add_child(spacer)
	stats = Kit.label("", 13, Kit.MUTED)
	%Header.add_child(stats)
	%Header.add_child(Kit.button("Settings", func(): settings.open_settings()))
	var text := VBoxContainer.new()
	text.add_theme_constant_override("separation", 4)
	text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text.add_child(Kit.label("A world of sound.", 34))
	text.add_child(Kit.label("Find your frequency. Explore from orbit to the ground.", 16, Kit.MUTED))
	%Hero.add_child(text)
	var badge := Kit.label("EXPLORE EARTH\nLOCAL-FIRST CATALOG", 12, Kit.MUTED)
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	%Hero.add_child(badge)

func _build_globe_controls() -> void:
	%WorldHeader.add_child(Kit.label("GLOBE VIEW", 12, Kit.ACCENT))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	%WorldHeader.add_child(spacer)
	view_controls = ViewControls.new()
	%WorldFooter.add_child(view_controls)
	view_controls.setup(globe)
	beacon_label = Kit.label("", 12, Kit.MUTED)
	%WorldHeader.add_child(beacon_label)
	coordinates = Kit.label("", 12, Kit.MUTED)
	coordinates.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	%WorldFooter.add_child(coordinates)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_child(Kit.button("−", func(): globe.target_distance = minf(7.0, globe.target_distance + 0.4)))
	row.add_child(Kit.button("+", func(): globe.target_distance = maxf(2.05, globe.target_distance - 0.4)))
	row.add_child(Kit.button("Recenter", globe.home))
	orbit_button = Kit.button("Auto orbit", _toggle_orbit)
	row.add_child(orbit_button)
	%WorldFooter.add_child(row)
	var hints := Kit.label("Drag to rotate  /  Scroll to zoom  /  Click a beacon", 12, Kit.MUTED)
	hints.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	%WorldFooter.add_child(hints)

func _build_footer() -> void:
	toast = Kit.label("Native Godot 4.7.2  /  No browser runtime", 12, Kit.MUTED)
	toast.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	toast.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	%Footer.add_child(toast)
	%Footer.add_child(Kit.label("Ctrl+K  Search     Space  Listen / Stop     F  Save", 12, Kit.MUTED))

func _reload_catalog() -> void:
	globe.set_stations(StationCatalog.stations)
	beacon_label.text = "%d city beacons" % globe.stations.size()
	var id: String = selected.get("id", AppState.profile.last_station)
	if not StationCatalog.by_id.has(id) and not StationCatalog.stations.is_empty():
		id = StationCatalog.stations[0].id
	select_station(id, true)
	_refresh_stats()

func select_station(id: String, instant: bool = false) -> void:
	var station: Dictionary = StationCatalog.get_station(id)
	if station.is_empty():
		return
	selected = station
	AppState.profile.last_station = id
	browser.select_id(id)
	inspector.set_station(station)
	player_controls.listen_button.text = "Website ↗" if station.get("playback_mode") == "website" else "Listen"
	if earth == null or earth.session.state == "ORBIT":
		globe.focus_station(station, instant)
	if earth != null:
		earth.sync_station(station)

func _favorite(id: String) -> void:
	AppState.toggle_favorite(id)
	browser.refresh()

func _listen() -> void:
	if selected.is_empty(): return
	if selected.get("playback_mode", "stream") == "website":
		_open_station_site(str(selected.get("homepage", "")))
	else:
		RadioPlayer.play_station(selected)

func _open_station_site(url: String) -> void:
	if not CatalogCodec.valid_url(url): return
	if earth != null: earth.input_router.release_controls()
	var result := OS.shell_open(url)
	_toast("Opened the station website. Its player is external; it does not earn an in-app listening stamp." if result == OK else "Could not open the station website: " + error_string(result))

func _refresh_stats() -> void:
	if stats == null:
		return
	stats.text = "%d COUNTRIES  /  %d SAVED" % [StationCatalog.countries, AppState.profile.favorites.size()]
	inspector.refresh()
	globe.auto_rotate = AppState.profile.auto_rotate
	orbit_button.modulate = Kit.ACCENT if globe.auto_rotate else Color.WHITE

func _toggle_orbit() -> void:
	AppState.profile.auto_rotate = not AppState.profile.auto_rotate
	AppState.persist()

func _toast(text: String) -> void:
	toast.text = text
	toast.tooltip_text = text

func _process(_delta: float) -> void:
	if earth != null:
		earth.input_router.update()

func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if settings.visible or passport.visible or (earth != null and earth.input_router.modal_open()):
		return
	var focus := get_viewport().gui_get_focus_owner()
	if event.keycode == KEY_K and event.ctrl_pressed:
		browser.search_field.grab_focus()
		get_viewport().set_input_as_handled()
		return
	if focus is LineEdit:
		if event.keycode == KEY_ESCAPE:
			focus.release_focus()
		return
	match event.keycode:
		KEY_SPACE:
			if RadioPlayer.state in ["playing", "connecting", "buffering"]:
				RadioPlayer.stop()
			else:
				_listen()
		KEY_F:
			if not selected.is_empty(): _favorite(selected.id)
		KEY_HOME:
			if earth == null or earth.session.state == "ORBIT":
				globe.home()
		KEY_ESCAPE:
			if focus != null: focus.release_focus()
		_:
			return
	get_viewport().set_input_as_handled()

func _input(event: InputEvent) -> void:
	if earth != null and earth.input_router.route(event):
		get_viewport().set_input_as_handled()
		return
	# D-pad/UI accept use Godot's native focus system. X tunes, Y favorites.
	if not event is InputEventJoypadButton or not event.pressed or settings.visible or passport.visible:
		return
	if event.button_index == JOY_BUTTON_X:
		_listen()
	elif event.button_index == JOY_BUTTON_Y and not selected.is_empty():
		_favorite(selected.id)
	elif event.button_index == JOY_BUTTON_BACK:
		browser.search_field.grab_focus()

func _process_user_args() -> void:
	var args := OS.get_cmdline_user_args()
	for argument in args:
		if argument.begins_with("--screenshot="):
			await get_tree().create_timer(2.0).timeout
			await RenderingServer.frame_post_draw
			var path := argument.trim_prefix("--screenshot=")
			var image := get_viewport().get_texture().get_image()
			var result := image.save_png(path)
			print("SCREENSHOT ", path, " ", error_string(result))
			get_tree().quit(0 if result == OK else 1)

func _pick_station_cluster(id: String) -> void:
	select_station(id)
	if selected.is_empty(): return
	browser.search_field.text = ""
	browser.only_favorites = false
	browser.set_nearby_center(float(selected.geo_lat), float(selected.geo_long), str(selected.place), true)

# The host owns persistence. Marine UI submits only a region-scoped journal event;
# it cannot pause radio, rewrite favorites/passports, or write arbitrary files.
func voyage_progress(region: String) -> Dictionary:
	return AppState.profile.voyages.get(region, {}).duplicate(true)

func voyage_history(region: String) -> String:
	return preload("res://src/exploration/marine/voyage_journal.gd").history_text(AppState.profile, region)

func save_voyage(snapshot: Dictionary, event: Dictionary) -> bool:
	var next: Dictionary = preload("res://src/exploration/marine/voyage_journal.gd").record(AppState.profile, snapshot, event)
	if not AppState.store.save_profile(next):
		_toast("Voyage progress is session-only: " + AppState.store.last_error)
		return false
	AppState.profile = next
	AppState.changed.emit()
	return true
