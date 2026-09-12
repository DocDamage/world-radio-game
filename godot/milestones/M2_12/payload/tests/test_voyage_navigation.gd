extends SceneTree
const Guide = preload("res://addons/terrawave_marine/coastal/navigation_guide.gd")
const Journal = preload("res://src/exploration/marine/voyage_journal.gd")
const Extensions = preload("res://src/core/profile_extensions.gd")
const Store = preload("res://src/core/save_store.gd")
var checks := 0
var failures: Array[String] = []
func _initialize() -> void: call_deferred("run")
func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label); printerr("FAIL ", label)
func fixture() -> Dictionary:
	return {"region_id":"fixture", "dock":{"land_xz":[0,0]}, "items":[
		{"id":"east","label":"East exhibit","xz":[100,0],"mode":"floating"},
		{"id":"west","label":"West dive","xz":[-100,0],"mode":"seabed"},
		{"id":"east","xz":[40,40],"mode":"floating"},
		{"id":"land","xz":[40,40],"mode":"ground"}]}
func run() -> void:
	var g = Guide.new()
	check(g.configure(fixture()), "Guide configures from authored layout")
	check(g.points.size() == 3, "Ground points and duplicate IDs excluded")
	check(g.select(1) and not g.select(99), "Target selection bounds")
	var east_basis := Basis(Vector3.UP, -PI / 2.0)
	var west_basis := Basis(Vector3.UP, PI / 2.0)
	check(absf(rad_to_deg(Guide.heading_for_basis(east_basis)) - 90.0) < 0.001, "Godot negative yaw means east compass")
	check(absf(absf(rad_to_deg(Guide.heading_for_basis(west_basis))) - 90.0) < 0.001, "West heading magnitude")
	var t: Dictionary = g.telemetry(Vector3.ZERO, Guide.heading_for_basis(east_basis), 5.0, Vector3(5,0,0))
	check(absf(t.turn_deg) < 0.001, "Facing east points straight at east target")
	check(absf(t.eta_s - 20.0) < 0.001, "ETA uses closing speed")
	check(g.telemetry(Vector3.ZERO, 0.0, 5.0, Vector3(-5,0,0)).eta_s < 0, "Moving away has no ETA")
	check(g.telemetry(Vector3.ZERO, 0.0, 5.0, Vector3(0,0,5)).eta_s < 0, "Moving sideways has no ETA")
	check(g.telemetry(Vector3.ZERO, 0.0, 0.0).eta_s < 0, "Stopped has no ETA")
	check(g._format_eta(119.9) == "2m 00s", "ETA rounding never produces sixty seconds")
	check(not g.telemetry(Vector3(INF,0,0), 0.0, 2.0).valid, "Reject invalid actor position")
	var no_record: Dictionary = g.telemetry(Vector3(100,0,0), 0.0, 0.0, Vector3.ZERO, false)
	check(not no_record.first_visit and g.visited.is_empty(), "Descent and orbit do not award visits")
	var event: Dictionary = g.telemetry(Vector3(100,0,0), 0.0, 0.0)
	check(event.arrived and event.first_visit, "First real arrival awarded")
	check(not g.telemetry(Vector3(100,0,0),0.0,0.0).arrived, "Inside radius arrival not repeated")
	g.telemetry(Vector3.ZERO,0.0,0.0)
	var again: Dictionary = g.telemetry(Vector3(100,0,0),0.0,0.0)
	check(again.arrived and not again.first_visit, "Reentry is not a new first visit")
	var snap: Dictionary = g.snapshot()
	var reordered := fixture()
	reordered.items.reverse()
	var other = Guide.new()
	other.configure(reordered)
	check(other.restore(snap) and other.target().id == "east", "Stable target ID survives authored order changes")
	check(not other.telemetry(Vector3(100,0,0),0.0,0.0).first_visit, "Restored arrival does not re-award")
	check(not other.restore({"region_id":"wrong", "visited":[]}), "Cross-region restore rejected")
	check(not other.restore({"region_id":"fixture", "visited":3}), "Malformed visited collection rejected")
	var store = Store.new()
	var original: Dictionary = store.defaults()
	var saved: Dictionary = Journal.record(original, snap, event)
	check(original.voyages.is_empty(), "Journal does not mutate input profile")
	check(saved.voyages.fixture.history.size() == 1, "First arrival recorded")
	saved = Journal.record(saved, snap, event)
	check(saved.voyages.fixture.history.size() == 1, "Duplicate event deduplicated")
	check("East exhibit" in Journal.history_text(saved, "fixture"), "History includes target label")
	check("No recorded" in Journal.history_text(saved, "other"), "History scope is regional")
	for i in range(20): saved = Journal.record(saved, {"region_id":"region-%d" % i, "target_id":"a", "visited":[]})
	check(saved.voyages.size() == 16 and saved.voyages.has("region-19"), "Journal bounds regions and keeps latest addition")
	var visits := []
	var events := []
	for i in range(300):
		visits.append(str(i)); events.append({"id":str(i),"label":"test","at":"time"})
	var bounded := Extensions.voyages({"fixture":{"visited":visits,"history":events}})
	check(bounded.fixture.visited.size() == 128 and bounded.fixture.history.size() == 128, "Bound visits and events")
	check(bounded.fixture.history[0].id == "172", "Keep newest bounded history events")
	check(Extensions.voyages({"bad":3}).is_empty(), "Malformed region journal ignored")
	var app := root.get_node("AppState")
	var persisted: Dictionary = Journal.record(app.profile, snap, event)
	persisted.regional_streams = {"ct-wesu-fm":{"streamUrl":"https://listen.wesufm.org/stream","checked_on":"2026-09-12","provider":"test fixture, not network"}}
	var wrote: bool = app.store.save_profile(persisted)
	check(wrote, "Atomic combined extension save")
	if wrote: app.profile = persisted
	var reread: Dictionary = app.store.load_profile()
	check(reread.voyages.fixture.history.size() == 1 and reread.voyages.fixture.visited.has("east"), "On-disk journal roundtrip")
	check(reread.regional_streams["ct-wesu-fm"].streamUrl == persisted.regional_streams["ct-wesu-fm"].streamUrl, "On-disk regional stream roundtrip")
	print("VOYAGE_NAVIGATION_RESULT ", JSON.stringify({"checks":checks,"failed":failures.size(),"failures":failures}))
	quit(0 if failures.is_empty() else 1)
