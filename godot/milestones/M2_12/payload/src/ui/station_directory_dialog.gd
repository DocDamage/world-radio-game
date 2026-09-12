extends AcceptDialog
const Service = preload("res://src/core/station_directory.gd")
const Kit = preload("res://src/ui/theme_kit.gd")
var service: Node
var detail: Label
var start_button: Button
var cancel_button: Button

func _ready() -> void:
	title = "Regional station streams"
	size = Vector2i(590, 290)
	service = Service.new()
	add_child(service)
	var box := VBoxContainer.new()
	add_child(box)
	box.add_child(Kit.wrapped("Optional: contact Radio Browser to find native stream URLs for the bundled regional stations. No precise device location, profile, favorites, or audio is sent. No playback starts automatically. Directory results can be outdated or geographically restricted.", 15))
	detail = Kit.wrapped("The offline station list remains available even when the directory is down.", 14, Kit.GOLD)
	box.add_child(detail)
	start_button = Kit.button("Refresh streams online", service.start, true)
	cancel_button = Kit.button("Cancel lookup", service.cancel)
	box.add_child(start_button)
	box.add_child(cancel_button)
	cancel_button.disabled = true
	service.progress.connect(func(text):
		detail.text = text
		start_button.disabled = true
		cancel_button.disabled = false)
	service.finished.connect(func(_count, text):
		detail.text = text
		start_button.disabled = false
		cancel_button.disabled = true)
	visibility_changed.connect(func():
		if not visible: service.cancel())

func open() -> void:
	popup_centered()
