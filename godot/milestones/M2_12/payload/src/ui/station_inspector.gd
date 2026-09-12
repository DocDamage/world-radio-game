extends VBoxContainer
signal favorite_requested(id: String)
signal passport_requested
const Kit = preload("res://src/ui/theme_kit.gd")
var city_label: Label
var country_label: Label
var coords_label: Label
var station_label: Label
var tags_label: Label
var saved_button: Button
var passport_count: Label
var station: Dictionary = {}
var playback_label: Label
var website_button: Button
signal website_requested(url: String)


func _ready() -> void:
	add_theme_constant_override("separation", 8)
	add_child(Kit.label("YOUR DESTINATION", 13, Kit.ACCENT))
	city_label = Kit.wrapped("Choose a city", 30, Kit.TEXT)
	country_label = Kit.label("", 16, Kit.MUTED)
	coords_label = Kit.label("", 12, Kit.MUTED)
	add_child(city_label)
	add_child(country_label)
	add_child(coords_label)
	add_child(HSeparator.new())
	add_child(Kit.label("ON THE DIAL", 12, Kit.GOLD))
	station_label = Kit.wrapped("Select a station on the globe or in the list.", 21, Kit.TEXT)
	add_child(station_label)
	tags_label = Kit.wrapped("", 13)
	add_child(tags_label)
	playback_label = Kit.wrapped("", 12, Kit.GOLD)
	add_child(playback_label)
	website_button = Kit.button("Open station website ↗", func():
		website_requested.emit(str(station.get("homepage", ""))))
	add_child(website_button)
	saved_button = Kit.button("Save station", func():
		if not station.is_empty(): favorite_requested.emit(station.id))
	add_child(saved_button)
	add_child(HSeparator.new())
	add_child(Kit.label("LISTENER PASSPORT", 12, Kit.ACCENT))
	passport_count = Kit.label("0 station stamps", 20)
	add_child(passport_count)
	add_child(Kit.wrapped("Five seconds of received audio adds a stamp. Saved on this device.", 14))
	add_child(Kit.button("Open passport", func(): passport_requested.emit()))
	refresh()

func set_station(value: Dictionary) -> void:
	station = value
	if value.is_empty():
		return
	city_label.text = value.place
	country_label.text = value.country
	coords_label.text = "%0.3f° %s    %0.3f° %s" % [absf(value.geo_lat), "N" if value.geo_lat >= 0 else "S", absf(value.geo_long), "E" if value.geo_long >= 0 else "W"]
	station_label.text = value.name
	website_button.visible = CatalogCodec.valid_url(value.get("homepage", ""))
	playback_label.text = "Official website player · native stream unresolved" if value.get("playback_mode") == "website" else "In-app stream · live availability may vary"
	coords_label.tooltip_text = str(value.get("location_precision", "Catalog location"))
	tags_label.text = str(value.tags).replace(",", "  /  ")
	refresh()

func refresh() -> void:
	if passport_count == null:
		return
	passport_count.text = "%d station stamps" % AppState.profile.visited.size()
	if not station.is_empty():
		saved_button.text = "Saved  /  Remove" if AppState.profile.favorites.has(station.id) else "+  Save station"
