extends Node
## Coastal actions share the host input owner; neither radio nor tree is paused.
const Kit = preload("res://src/ui/theme_kit.gd")
const Browser = preload("res://src/exploration/marine/marine_browser.gd")
const NavGuide = preload("res://addons/terrawave_marine/coastal/navigation_guide.gd")
var explorer: Node
var browser: Window
var launch_buttons: Array[Button] = []
var ashore_buttons: Array[Button] = []
var recovery_buttons: Array[Button] = []
var swim_buttons: Array[Button] = []
var help: Label
var conditions: HBoxContainer
var waypoint_select: OptionButton
var waypoint_label: Label
var guide: RefCounted
var guide_region := ""
var clock := 0.0

func setup(owner_explorer: Node) -> void:
	explorer = owner_explorer
	browser = Browser.new()
	explorer.host.add_child(browser)
	browser.visibility_changed.connect(func():
		if browser.visible: explorer.input_router.release_controls())
	for container in [explorer.panel, explorer.layout.toolbar]:
		var launch := Kit.button("Board skiff · V", _launch, true)
		launch.tooltip_text = "Walk down the visitor gangway to the skiff. Board nearby, then release its mooring lines."
		container.add_child(launch)
		launch_buttons.append(launch)
		var ashore := Kit.button("Moor / ashore · E", _ashore)
		ashore.tooltip_text = "Approach the berth slowly, facing the same heading. Secure lines, settle, then step ashore."
		container.add_child(ashore)
		ashore_buttons.append(ashore)
		var swim := Kit.button("Enter water · G", _swim)
		swim.tooltip_text = "Use the ladder or a low bank, or stop your skiff before entering water."
		container.add_child(swim)
		swim_buttons.append(swim)
		var recover := Kit.button("Recover to shore", _recover)
		recover.tooltip_text = "Reload and recheck the saved dry-ground checkpoint; use this when stranded."
		container.add_child(recover)
		recovery_buttons.append(recover)
	var library := Kit.button("Marine asset library…", func():
		explorer.input_router.release_controls()
		browser.open_browser())
	explorer.panel.add_child(library)
	explorer.panel.move_child(library,7)
	conditions = HBoxContainer.new()
	explorer.panel.add_child(conditions)
	var tide := OptionButton.new()
	for text in ["Tide ×1", "Tide ×60", "Tide ×300"]: tide.add_item(text)
	tide.select(1)
	tide.tooltip_text = "Uncalibrated gameplay tide; not a forecast or navigation aid."
	tide.item_selected.connect(func(i):
		if explorer.session.marine.coastal != null:
			explorer.session.marine.coastal.environment.tide_rate = [1.0,60.0,300.0][i])
	conditions.add_child(tide)
	var waves := OptionButton.new()
	for text in ["Calm", "Normal waves", "Rough"]: waves.add_item(text)
	waves.select(1)
	waves.item_selected.connect(func(i):
		if explorer.session.marine.coastal != null:
			explorer.session.marine.coastal.environment.roughness = [0.0,1.0,2.5][i])
	conditions.add_child(waves)
	waypoint_select = OptionButton.new()
	waypoint_select.tooltip_text = "Harbor exploration targets. Guidance is a gameplay aid, not real navigation data."
	waypoint_select.item_selected.connect(func(i):
		if guide != null: guide.select(i))
	explorer.panel.add_child(waypoint_select)
	waypoint_label = Kit.wrapped("",12)
	explorer.panel.add_child(waypoint_label)
	help = Kit.wrapped("",12)
	explorer.panel.add_child(help)
	explorer.session.state_changed.connect(func(_state): refresh.call_deferred())
	refresh()

func _process(delta: float) -> void:
	clock += delta
	if clock >= 0.25 and explorer != null:
		clock = 0.0
		refresh()

func refresh() -> void:
	var state: String = explorer.session.state
	var voyage: Node = explorer.session.marine
	var supported: bool = voyage.coastal != null and voyage.coastal.valid
	_sync_guide(voyage, supported)
	for button in launch_buttons:
		button.visible = supported and (state == "WALKING" or (state == "SAILING" and voyage.boat.moored))
		button.text = "Release lines · V" if state == "SAILING" else "Board skiff · V"
	for button in ashore_buttons:
		button.visible = state in ["SAILING", "SWIMMING"]
		button.text = "Ladder / exit · E" if state == "SWIMMING" else ("Step ashore · E" if voyage.boat.moored else "Moor · E")
	for button in recovery_buttons: button.visible = state in ["SAILING", "SWIMMING"]
	for button in swim_buttons: button.visible = supported and state in ["WALKING", "SAILING"]
	help.visible = supported
	conditions.visible = supported
	waypoint_select.visible = supported
	waypoint_label.visible = supported
	if supported:
		var env: RefCounted = voyage.coastal.environment
		var p: Vector3 = explorer.session.region_position()
		var depth: float = env.depth_at(p.x,p.z)
		var details := "Modeled tide %+.2f m · Depth %.1f m\n" % [env.tide(),depth]
		if guide != null:
			var actor: Node3D = voyage.actor()
			var region_pos: Vector3 = explorer.session.frame.local_to_region(actor.position)
			var heading := actor.rotation.y
			var speed := 0.0
			if state == "SAILING": speed = absf(voyage.boat.speed)
			elif state == "SWIMMING": speed = Vector2(voyage.swimmer.velocity.x,voyage.swimmer.velocity.z).length()
			waypoint_label.text = "Harbor guide: "+guide.guidance_line(region_pos,heading,speed)
		if state == "SWIMMING": details += "Air %.0f s · Stamina %.0f%%\n" % [voyage.swimmer.oxygen,voyage.swimmer.stamina]
		help.text = details+"WASD: move · V: board/release · E: moor/exit · G: swim\nCtrl: dive · Space: surface/brake · Esc: stop · R: orbit\nGamepad: Y board, D-pad ↑ interact, ↓ enter water; A surface / X dive.\nAuthored harbor exhibits. Modeled seabed and tides — NOT navigation data."
	if not explorer.input_router.controlling:
		var text: String = {"SAILING":"Sail", "SWIMMING":"Swim"}.get(state,"Walk")+" / resume"
		explorer.panel.walk_button.text = text
		explorer.layout.walk_button.text = text

func _launch() -> void:
	explorer.session.marine.request_launch()
	explorer.input_router.release_controls()

func _ashore() -> void:
	explorer.session.marine.request_ashore()
	explorer.input_router.release_controls()

func _swim() -> void:
	explorer.session.marine.request_swim()
	explorer.input_router.release_controls()

func _recover() -> void:
	explorer.session.marine.request_recovery()
	explorer.input_router.release_controls()

func _sync_guide(voyage: Node, supported: bool) -> void:
	if not supported:
		guide_region = ""
		guide = null
		waypoint_select.clear()
		return
	var region := str(voyage.coastal.layout.get("region_id", ""))
	if guide != null and guide_region == region: return
	guide = NavGuide.new()
	if not guide.configure(voyage.coastal.layout):
		guide = null
		return
	guide_region = region
	waypoint_select.clear()
	for point in guide.points: waypoint_select.add_item(str(point.label))
	waypoint_select.select(guide.target_index)
