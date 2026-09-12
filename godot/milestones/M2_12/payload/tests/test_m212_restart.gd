extends SceneTree
const Guide = preload("res://addons/terrawave_marine/coastal/navigation_guide.gd")
const Journal = preload("res://src/exploration/marine/voyage_journal.gd")
var checks := 0
var failures: Array[String] = []
func _initialize() -> void: call_deferred("run")
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label); printerr("FAIL ",label)
func run() -> void:
	var app := root.get_node("AppState")
	var catalog := root.get_node("StationCatalog")
	var seed := "--seed" in OS.get_cmdline_user_args()
	var guide = Guide.new()
	guide.configure({"region_id":"restart-fixture","dock":{"land_xz":[0,0]},"items":[]})
	if seed:
		var event: Dictionary = guide.telemetry(Vector3.ZERO,0.0,0.0)
		var next: Dictionary = Journal.record(app.profile,guide.snapshot(),event)
		next.favorites = ["ct-wybc-fm"]
		next.last_station = "ct-wybc-fm"
		next.regional_streams["ct-wybc-fm"] = {"streamUrl":"https://audio.example.org/restart-fixture","provider":"OFFLINE TEST ONLY", "checked_on":"2026-09-12"}
		var wrote: bool = app.store.save_profile(next)
		check(wrote, "Persist extensions for an independent process")
		if wrote: app.profile = next
	else:
		check(app.profile.favorites.has("ct-wybc-fm"), "Fresh process preserves station favorite identity")
		check(app.profile.last_station == "ct-wybc-fm", "Fresh process restores station selection")
		check(catalog.stations.size() == 20, "Fresh process adds regional data even with legacy cached starter catalog")
		check(catalog.get_station("ct-wybc-fm").streamUrl == "https://audio.example.org/restart-fixture", "Fresh process restores regional stream candidate")
		check(catalog.get_station("ct-wybc-fm").playback_mode == "stream", "Restored stream updates native playback mode")
		check(guide.restore(app.profile.voyages.get("restart-fixture", {"history":[]})), "Fresh process restores voyage target")
		check(guide.visited.has("visitor-dock"), "Fresh process restores visited set")
		check(app.profile.voyages.get("restart-fixture", {"history":[]}).history.size() == 1, "Fresh process restores first-arrival history")
		check(not guide.telemetry(Vector3.ZERO,0.0,0.0).first_visit, "Reloading at target never duplicates history")
		check(root.get_node("RadioPlayer").state == "stopped", "Restoring stream candidates does not autoplay")
	print("M212_RESTART_RESULT ",JSON.stringify({"phase":"seed" if seed else "verify","checks":checks,"failed":failures.size(),"failures":failures}))
	quit(0 if failures.is_empty() else 1)
