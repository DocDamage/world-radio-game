extends SceneTree
const Guide = preload("res://addons/terrawave_marine/coastal/navigation_guide.gd")
var failed := 0
func check(value: bool, text: String) -> void:
	if value: print("PASS ",text)
	else: failed += 1; push_error("FAIL "+text)
func _init() -> void:
	var layout := {"region_id":"fixture","dock":{"land_xz":[0,0]},"items":[
		{"id":"boat","label":"Boat","xz":[100,0],"mode":"floating"},
		{"id":"dive","label":"Dive","xz":[100,100],"mode":"seabed"},
		{"id":"land","label":"Land","xz":[5,5],"mode":"ground"}]}
	var g = Guide.new()
	check(g.configure(layout),"Guide configures")
	check(g.points.size()==3,"Guide includes dock, floating and seabed points only")
	check(g.select(1),"Select target")
	var t: Dictionary = g.telemetry(Vector3.ZERO,0.0,5.0)
	check(absf(t.distance_m-100.0)<0.001,"Distance is region-space meters")
	check(absf(t.bearing_deg-90.0)<0.001,"Bearing uses north as zero")
	check(absf(t.turn_deg-90.0)<0.001,"Relative turn is signed")
	check(absf(t.eta_s-20.0)<0.001,"ETA uses current speed")
	var arrive: Dictionary = g.telemetry(Vector3(95,0,0),0.0,0.0)
	check(arrive.arrived and arrive.visited,"Arrival marks waypoint once")
	check(not g.telemetry(Vector3(95,0,0),0.0,0.0).arrived,"Arrival does not repeat while inside radius")
	var snap: Dictionary = g.snapshot()
	var other = Guide.new(); other.configure(layout)
	check(other.restore(snap) and other.visited.has("boat"),"Progress snapshot restores")
	check(not other.restore({"region_id":"other"}),"Cross-region progress is rejected")
	quit(1 if failed else 0)
