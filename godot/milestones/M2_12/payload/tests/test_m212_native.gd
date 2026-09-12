extends "res://tests/integration/native_test_support.gd"

func named_button(parent: Node, text: String) -> Button:
	for child in parent.get_children():
		if child is Button and child.text == text: return child
		var found := named_button(child, text)
		if found != null: return found
	return null

func _run() -> void:
	output = OS.get_environment("TERRAWAVE_QA_OUTPUT")
	if output.is_empty(): output = "user://m212-native-evidence"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(output))
	root.size = Vector2i(1440,900)
	scene = load("res://scenes/Main.tscn").instantiate()
	root.add_child(scene)
	await ticks(15)
	earth = scene.earth
	radio = root.get_node("RadioPlayer")
	app = root.get_node("AppState")
	check(root.get_node("StationCatalog").stations.size() == 20, "Native host loads regional supplement")
	check(scene.globe.stations.size() == 15, "Shared city beacons plus global starter beacons")
	check(radio.state == "stopped", "Startup does not play a radio stream")
	var new_haven := named_button(scene.browser, "New Haven")
	check(new_haven != null, "New Haven shortcut is reachable")
	await click_button(new_haven)
	check(scene.browser.nearby_enabled and scene.browser.total == 12, "New Haven shortcut shows twelve nearby stations")
	check(absf(earth.selected_geo[0] - 41.3083) < 0.0001, "Shortcut sets exploration destination as well as list")
	var wybc: Button
	for row in scene.browser.list.get_children():
		if row.get_meta("station_id", "") == "ct-wybc-fm": wybc = row
	check(wybc != null, "New Haven WYBC row appears")
	await click_button(wybc)
	check(scene.selected.id == "ct-wybc-fm", "Native click selects New Haven station")
	check("Website" in scene.player_controls.listen_button.text, "Website-only source visibly distinguished")
	check(radio.state == "stopped", "Station selection does not autoplay or spawn website")
	valid_layout("New Haven 1440x900")
	await capture("M2.12-New-Haven-Stations-1440.png")
	root.size = Vector2i(1100,720)
	await ticks(10)
	valid_layout("New Haven 1100x720")
	check(scene.browser.list.get_parent().size.y >= 55, "Small-window station list still has a usable row")
	await capture("M2.12-New-Haven-Stations-1100.png")
	root.size = Vector2i(1440,900)
	scene.browser.nearby_enabled = false
	scene.browser.refresh()
	scene.globe.focus_station(scene.selected, true)
	var at: Vector2 = scene.globe.camera.unproject_position(scene.globe.selected.position)
	scene.globe.pick_at(at)
	check(scene.selected.id == "ct-wybc-fm", "Shared city beacon preserves chosen station")
	check(scene.browser.nearby_enabled and scene.browser.total == 12, "City beacon opens regional discovery")
	scene.browser.refresh_streams_requested.emit()
	await ticks(4)
	check(scene.stream_dialog.visible and not scene.stream_dialog.service.busy, "Directory dialog requires a second explicit online action")
	check(not earth.input_router.controlling, "Directory dialog releases exploration control")
	scene.stream_dialog.hide()
	check(earth.load_manifest("res://data/new_haven_harbor/manifest.json"), "Native harbor manifest loaded")
	earth.locate_region()
	earth.session.transition_seconds = 0.08
	check(earth.descend(), "Begin harbor descent")
	if not await wait_for(func(): return earth.session.state == "WALKING",40):
		check(false, "Harbor arrival")
		await finish()
		return
	await ticks(30)
	var ui: Node = earth.marine_ui
	check(ui.guide != null and ui.guide.points.size() > 1, "Native harbor guide has authored targets")
	check(ui.waypoint_marker.visible, "Waypoint marker becomes visible in the harbor")
	check("GAMEPLAY TARGET" in ui.waypoint_marker.label.text, "World marker includes gameplay disclosure")
	var target: Dictionary = ui.guide.target()
	var p: Vector3 = earth.session.frame.local_to_region(ui.waypoint_marker.position)
	check(Vector2(p.x,p.z).distance_to(Vector2(target.position.x,target.position.z)) < 0.02, "Marker agrees with authored region coordinates")
	earth.session.apply_rebase(Vector3(256,0,-384))
	await ticks(3)
	p = earth.session.frame.local_to_region(ui.waypoint_marker.position)
	check(Vector2(p.x,p.z).distance_to(Vector2(target.position.x,target.position.z)) < 0.02, "Marker remains geographically fixed after origin rebase")
	ui.waypoint_marker.enabled = false
	await ticks(2)
	check(not ui.waypoint_marker.visible, "World marker can be disabled")
	ui.waypoint_marker.enabled = true
	ui.waypoint_select.select(1)
	ui.waypoint_select.item_selected.emit(1)
	await ticks(4)
	check(app.profile.voyages[ui.guide_region].target_id == ui.guide.target().id, "Native target choice persisted")
	check(ui.waypoint_marker.visible, "New target has world marker")
	# Visual framing only: this is not a claim of injected walking to the target.
	var camera: Camera3D = earth.session.walker.camera
	var direction: Vector3 = ui.waypoint_marker.global_position + Vector3(0,9,0) - camera.global_position
	earth.session.walker.yaw = atan2(-direction.x,-direction.z)
	earth.session.walker.pitch = atan2(direction.y,Vector2(direction.x,direction.z).length())
	camera.rotation = Vector3(earth.session.walker.pitch,0,0)
	earth.layout.set_expanded(true)
	await capture("M2.12-Harbor-Waypoint.png")
	ui.history_button.pressed.emit()
	await ticks(3)
	check(ui.history_window.visible and ui.history_text != null, "Saved voyage history opens")
	check(ui.history_window.size.y <= 600, "History uses a bounded scrolling text area")
	await capture("M2.12-Voyage-History.png")
	ui.history_window.hide()
	earth.return_to_orbit()
	await wait_for(func():return earth.session.state == "ORBIT",10)
	await ticks(3)
	check(not ui.waypoint_marker.visible, "No stale waypoint marker in orbit")
	check(radio.state == "stopped", "Harbor/waypoint flow never autoplays radio")
	evidence["public_radio_audio"] = "Not tested; selection and discovery only."
	evidence["marker_visual_framing"] = "Camera aimed directly for inspection; movement input is covered by separate coastal suites."
	await finish()
