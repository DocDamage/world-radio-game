extends SceneTree
var scene: Control
var checks := 0
var failures: Array[String] = []
var output := "user://qa-ui.png"

func _initialize() -> void:
	Engine.max_fps = 60
	call_deferred("_run")

func check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures.append(label)
		printerr("FAIL: ", label)

func _run() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--output="):
			output = arg.trim_prefix("--output=")
	scene = load("res://scenes/Main.tscn").instantiate()
	root.add_child(scene)
	await create_timer(0.35).timeout
	check(scene.selected.id == "paris-rmc-fr", "Restores initial source station")
	check(scene.globe.stations.size() == 15, "Eight original and seven regional city beacons")
	check(scene.inspector.city_label.text == "Paris", "Selection is reflected in native inspector")
	check(root.get_node("RadioPlayer").state == "stopped", "No autoplay/network request on startup")
	_check_layout()
	await _key(KEY_K, true)
	check(scene.browser.search_field.has_focus(), "Ctrl+K focuses search through native input")
	var before: int = root.get_node("AppState").profile.favorites.size()
	await _key(KEY_F)
	check(root.get_node("AppState").profile.favorites.size() == before, "Typing F does not toggle a favorite")
	await _key(KEY_SPACE)
	check(root.get_node("RadioPlayer").state == "stopped", "Typing a space does not start radio")
	scene.browser.search_field.text = "tOkYo"
	scene.browser.search_field.text_changed.emit("tOkYo")
	await create_timer(0.25).timeout
	check(scene.browser.total == 1 and scene.browser.list.get_child_count() == 1, "Native search debounce/filter")
	var card: Button = scene.browser.list.get_child(0)
	card.grab_focus()
	await _key(KEY_ENTER)
	await create_timer(0.2).timeout
	check(scene.selected.id == "tokyo-shibuya-fm", "Keyboard activates a station card")
	check(scene.inspector.city_label.text == "Tokyo", "Keyboard selection updates the inspector")
	var focused := root.gui_get_focus_owner()
	check(focused != null and focused.get_meta("station_id", "") == "tokyo-shibuya-fm", "Station refresh preserves keyboard/controller focus")
	await _key(KEY_F)
	check(root.get_node("AppState").profile.favorites.has("tokyo-shibuya-fm"), "Favorite hotkey writes native save state")
	scene.browser._set_filter(true)
	check(scene.browser.total == 1, "Saved filter shows favorite")
	await _key(KEY_F)
	check(not root.get_node("AppState").profile.favorites.has("tokyo-shibuya-fm"), "Favorite can be removed")
	check(scene.browser.total == 0, "Saved filter refreshes when item removed")
	scene.browser.search_field.text = ""
	scene.browser._set_filter(false)
	scene.select_station("paris-rmc-fr", true)
	await create_timer(0.2).timeout
	# Exercise actual GUI mouse routing: not just a direct selection method call.
	var london: Dictionary = root.get_node("StationCatalog").get_station("london-soho-radio")
	var at: Vector2 = scene.globe.camera.unproject_position(GeoMath.unit(london.geo_lat, london.geo_long) * 1.012)
	var world_control: Control = scene.get_node("%GlobeViewport")
	await _click(world_control.global_position + at)
	check(scene.selected.id == "london-soho-radio", "Native mouse click routes to 3D beacon picking")
	var previous: float = scene.globe.target_longitude
	var center: Vector2 = world_control.global_position + world_control.size * 0.5
	await _drag(center, Vector2(55, 12))
	check(absf(scene.globe.target_longitude - previous) > 5.0, "Native mouse drag rotates globe")
	var old_distance: float = scene.globe.target_distance
	var wheel := InputEventMouseButton.new()
	wheel.button_index = MOUSE_BUTTON_WHEEL_UP
	wheel.pressed = true
	wheel.position = center
	Input.parse_input_event(wheel)
	await process_frame
	check(scene.globe.target_distance < old_distance, "Mouse wheel zooms in")
	var old_target: float = scene.globe.target_longitude
	Input.action_press("orbit_right", 0.8)
	await create_timer(0.15).timeout
	Input.action_release("orbit_right")
	check(scene.globe.target_longitude > old_target, "Mapped orbit action moves camera")
	check(_has_axis("orbit_right", JOY_AXIS_LEFT_X), "Left-stick orbit mapping exists")
	check(_has_axis("zoom_in", JOY_AXIS_TRIGGER_LEFT), "Trigger zoom mapping exists")
	scene.settings.open_settings()
	await create_timer(0.2).timeout
	check(scene.settings.visible, "Native settings dialog opens")
	check(not scene.globe.input_enabled, "Settings block globe controls")
	check(scene.settings.feedback.text.begins_with("Detected:"), "Settings detects native decoder")
	scene.settings.hide()
	scene.passport.open_passport()
	await create_timer(0.1).timeout
	check(scene.passport.visible and scene.passport.list.get_child_count() == 2, "Empty passport explains real award condition")
	scene.passport.hide()
	for id in ["nyc-classic-vinyl", "sydney-deep-house", "reykjavik-ambient"]:
		scene.select_station(id, true)
		await process_frame
		_check_layout()
	scene.select_station("paris-rmc-fr", true)
	await create_timer(0.2).timeout
	await RenderingServer.frame_post_draw
	var image := root.get_texture().get_image()
	check(image.save_png(output) == OK, "Rendered UI screenshot saved")
	print("UI_RESULT ", JSON.stringify({"checks": checks, "failed": failures.size(), "failures": failures,
		"screenshot": output, "physical_controller": "not tested; mapped actions and UI focus tested"}))
	quit(0 if failures.is_empty() else 1)

func _check_layout() -> void:
	var bounds := scene.get_global_rect()
	for path in ["Margin/Layout/Header", "Margin/Layout/Hero", "Margin/Layout/Content", "Margin/Layout/PlayerPanel", "Margin/Layout/Footer"]:
		var rect: Rect2 = scene.get_node(path).get_global_rect()
		check(bounds.grow(1.0).encloses(rect), "No clipped main panel: " + path)

func _key(code: int, control: bool = false) -> void:
	for down in [true, false]:
		var event := InputEventKey.new()
		event.keycode = code
		event.physical_keycode = code
		event.ctrl_pressed = control
		event.pressed = down
		if code >= 32 and code <= 126:
			event.unicode = code + 32 if code >= 65 and code <= 90 else code
		Input.parse_input_event(event)
		await process_frame

func _click(position: Vector2) -> void:
	for down in [true, false]:
		var event := InputEventMouseButton.new()
		event.button_index = MOUSE_BUTTON_LEFT
		event.position = position
		event.global_position = position
		event.pressed = down
		Input.parse_input_event(event)
		await process_frame

func _drag(position: Vector2, relative: Vector2) -> void:
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = position
	Input.parse_input_event(press)
	await process_frame
	var move := InputEventMouseMotion.new()
	move.position = position + relative
	move.relative = relative
	move.button_mask = MOUSE_BUTTON_MASK_LEFT
	Input.parse_input_event(move)
	await process_frame
	press.pressed = false
	press.position = position + relative
	Input.parse_input_event(press)
	await process_frame

func _has_axis(action: String, axis: int) -> bool:
	for event in InputMap.action_get_events(action):
		if event is InputEventJoypadMotion and event.axis == axis:
			return true
	return false
