extends VBoxContainer
signal selected(id: String)
const Kit = preload("res://src/ui/theme_kit.gd")
const PAGE_SIZE := 60
var search_field := LineEdit.new()
var list := VBoxContainer.new()
var count_label: Label
var page_label: Label
var previous: Button
var next: Button
var all_button: Button
var saved_button: Button
var only_favorites := false
var selected_id := ""
var page := 0
var total := 0
var refresh_timer := Timer.new()
var nearby_button: Button
var nearby_enabled := false
var nearby_center := Vector2(41.3083, -72.9279)
var nearby_name := "New Haven"
var radius_km := 50.0
var radius_select: OptionButton
var scope_label: Label
signal region_requested
signal refresh_streams_requested


func _ready() -> void:
	add_theme_constant_override("separation", 6)
	add_child(Kit.label("DISCOVER STATIONS", 13, Kit.ACCENT))
	search_field.placeholder_text = "Search city, station, genre..."
	search_field.custom_minimum_size.y = 44
	search_field.clear_button_enabled = true
	search_field.tooltip_text = "Search all words. Ctrl+K focuses search."
	add_child(search_field)
	refresh_timer.one_shot = true
	refresh_timer.wait_time = 0.15
	add_child(refresh_timer)
	refresh_timer.timeout.connect(func(): page = 0; refresh())
	search_field.text_changed.connect(func(_text): refresh_timer.start())
	search_field.text_submitted.connect(func(_text): search_field.release_focus())
	var filters := HBoxContainer.new()
	all_button = Kit.button("All stations", func(): _set_filter(false))
	saved_button = Kit.button("Saved", func(): _set_filter(true))
	all_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	saved_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	filters.add_child(all_button)
	filters.add_child(saved_button)
	add_child(filters)
	var local_row := HBoxContainer.new()
	nearby_button = Kit.button("Nearby", func():
		nearby_enabled = not nearby_enabled
		page = 0
		refresh())
	nearby_button.tooltip_text = "Sort stations around the exploration destination by distance, not just matching town names."
	local_row.add_child(nearby_button)
	radius_select = OptionButton.new()
	for radius in [25, 50, 100, 200]: radius_select.add_item("%d km" % radius, radius)
	radius_select.select(1)
	radius_select.item_selected.connect(func(i): radius_km = float(radius_select.get_item_id(i)); page = 0; refresh())
	local_row.add_child(radius_select)
	local_row.add_child(Kit.button("New Haven", func():
		search_field.text = ""
		only_favorites = false
		set_nearby_center(41.3083, -72.9279, "New Haven", true)
		region_requested.emit()))
	add_child(local_row)
	for button in [all_button, saved_button, nearby_button, local_row.get_child(2)]: _compact(button)
	scope_label = Kit.wrapped("", 12, Kit.MUTED)
	add_child(scope_label)
	scope_label.hide()
	var update := Kit.button("Refresh regional streams…", func(): refresh_streams_requested.emit())
	update.tooltip_text = "Optional online directory lookup. No audio starts automatically."
	add_child(update)
	_compact(update)
	count_label = Kit.label("", 13, Kit.MUTED)
	count_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	add_child(count_label)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 8)
	scroll.add_child(list)
	add_child(scroll)
	var navigation := HBoxContainer.new()
	previous = Kit.button("<", func(): page = maxi(0, page - 1); refresh())
	next = Kit.button(">", func(): page += 1; refresh())
	page_label = Kit.label("", 13, Kit.MUTED)
	page_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	page_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	navigation.add_child(previous)
	navigation.add_child(page_label)
	navigation.add_child(next)
	_compact(previous)
	_compact(next)
	add_child(navigation)
	StationCatalog.reloaded.connect(func(): page = 0; refresh())
	refresh()

func _set_filter(saved: bool) -> void:
	only_favorites = saved
	page = 0
	refresh()

func refresh() -> void:
	if count_label == null:
		return
	var focused := get_viewport().gui_get_focus_owner()
	var focus_id := str(focused.get_meta("station_id", "")) if focused != null else ""
	for child in list.get_children():
		list.remove_child(child)
		child.queue_free()
	var result: Dictionary = _results()
	total = result.total
	if page > 0 and page * PAGE_SIZE >= total:
		page = maxi(0, ceili(float(total) / PAGE_SIZE) - 1)
		result = _results()
	count_label.text = ("%d stations · %d km · %s" % [total, radius_km, nearby_name]) if nearby_enabled else "%d stations" % total
	count_label.tooltip_text = StationCatalog.source_label + "\nApproximate city locations, not FM coverage."
	scope_label.text = ("Around %s · %d km\nApproximate locations, not FM coverage" % [nearby_name, radius_km]) if nearby_enabled else StationCatalog.source_label
	nearby_button.modulate = Kit.ACCENT if nearby_enabled else Color.WHITE
	all_button.modulate = Kit.ACCENT if not only_favorites else Color.WHITE
	saved_button.modulate = Kit.ACCENT if only_favorites else Color.WHITE
	for station in result.stations:
		var card := _card(station)
		list.add_child(card)
		if station.id == focus_id:
			_restore_card_focus.call_deferred(card)
	if result.stations.is_empty():
		list.add_child(Kit.wrapped("No catalog matches within this radius. Increase it or clear the search. This does not mean there are no broadcasters here." if nearby_enabled else "No matches. Try a city or genre, or switch to All stations.", 15))
	var pages := maxi(1, ceili(float(total) / PAGE_SIZE))
	page_label.text = "%d / %d" % [page + 1, pages]
	previous.disabled = page == 0
	next.disabled = page + 1 >= pages

func _card(station: Dictionary) -> Button:
	var card := Button.new()
	card.name = "Station_" + station.id.validate_node_name()
	card.set_meta("station_id", station.id)
	card.custom_minimum_size = Vector2(0, 72)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.tooltip_text = station.name + " — " + station.place + ", " + station.country + "\n" + ("Official website player" if station.get("playback_mode") == "website" else "In-app stream; availability not guaranteed")
	card.clip_contents = true
	var content := VBoxContainer.new()
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.offset_left = 12
	content.offset_right = -12
	content.offset_top = 9
	content.offset_bottom = -9
	content.add_theme_constant_override("separation", 4)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var city := Kit.label(station.place, 17)
	if AppState.profile.favorites.has(station.id):
		city.text += "  *"
	city.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	if station.has("distance_km"):
		city.text += " · %.1f km" % station.distance_km
	var title := Kit.label(station.name, 13, Kit.MUTED)
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	content.add_child(city)
	content.add_child(title)
	card.add_child(content)
	if station.id == selected_id:
		card.add_theme_stylebox_override("normal", Kit.box(Color("223238"), Kit.GOLD, 10, 12))
		city.add_theme_color_override("font_color", Kit.GOLD)
	card.pressed.connect(func(): selected.emit(station.id))
	return card

func select_id(id: String) -> void:
	selected_id = id
	refresh()

func set_nearby_center(lat: float, lon: float, label: String, activate: bool = false) -> void:
	if not GeoMath.valid(lat, lon): return
	nearby_center = Vector2(lat, lon)
	nearby_name = label
	if activate: nearby_enabled = true
	page = 0
	refresh()

func _results() -> Dictionary:
	if nearby_enabled:
		return StationCatalog.nearby(nearby_center.x, nearby_center.y, radius_km,
			search_field.text, only_favorites, PAGE_SIZE, page * PAGE_SIZE)
	return StationCatalog.search(search_field.text, only_favorites, PAGE_SIZE, page * PAGE_SIZE)

func _restore_card_focus(card: Button) -> void:
	# Multiple same-frame catalog/selection updates can retire an earlier card.
	if is_instance_valid(card) and card.is_inside_tree() and card.get_parent() == list:
		card.grab_focus()

func _compact(button: Button) -> void:
	button.custom_minimum_size.y = 32
	button.add_theme_font_size_override("font_size", 14)
	for state in ["normal", "hover", "pressed", "disabled", "focus"]:
		var style := Kit.box(Color("172a39"), Kit.ACCENT if state in ["focus", "hover"] else Color("2c4656"), 8, 6)
		style.content_margin_left = 10
		style.content_margin_right = 10
		if state == "focus": style.bg_color = Color.TRANSPARENT
		button.add_theme_stylebox_override(state, style)
