extends SceneTree
## Real engine geometry/physics checks using an explicitly authored analytic heightfield.
const PACK := "res://data/terrain_demo/manifest.json"
var checks := 0
var failures: Array[String] = []
var pack: TWRegionPack
var session: TWWorldSession
var evidence: Dictionary = {}

func _initialize() -> void:
	Engine.max_fps = 60
	call_deferred("run")

func check(ok: bool, label: String) -> void:
	checks += 1
	if not ok:
		failures.append(label)
		printerr("FAIL: ", label)

func ticks(n: int = 1) -> void:
	for _i in range(n):
		await physics_frame
		await process_frame

func walk() -> bool:
	for _i in range(300):
		await ticks()
		if session.state == "WALKING":
			return true
		if session.state == "ORBIT":
			return false
	return false

func run() -> void:
	pack = TWRegionPack.new()
	check(pack.open(PACK), "Version 2 elevation package loads")
	if pack.elevation == null:
		printerr(pack.error)
		quit(1)
		return
	check(pack.manifest.coverage == "Approximate" and not pack.elevation.metadata.real_elevation, "Included terrain remains honestly synthetic")
	check(pack.elevation.width == 129 and pack.elevation.depth == 129, "129 x 129 shared vertices")
	check(absf(pack.ground_height(0, 0)) < 0.00001, "Reference datum is subtracted for scene height")
	check(pack.elevation_record(Vector3.ZERO).value_m == 120.0, "Original source vertical value remains available")
	check(pack.elevation_record(Vector3.ZERO).reference == "SYNTHETIC_LOCAL_DATUM", "Vertical reference is explicit")
	check(is_nan(pack.ground_height(1000.1, 0)), "Outside extent never extrapolates ground")
	check(pack.ground_height(-900, -900) < -30.0, "Below-base terrain retains negative heights")
	check(pack.surface_normal(0, 0).y > 0.9, "Slope normal computed from shared triangles")
	geometry_checks()
	await physics_checks()
	var result := {"checks": checks, "failed": failures.size(), "failures": failures, "evidence": evidence,
		"fixture": "Original synthetic rolling heightfield; NOT fetched USGS or real New Haven data"}
	# The runner records TERRAIN_RESULT; never overwrite archived source evidence.
	print("TERRAIN_RESULT ", JSON.stringify(result))
	if session != null:
		session.cancel(false)
		session.queue_free()
	await ticks(3)
	quit(0 if failures.is_empty() else 1)

func geometry_checks() -> void:
	var max_seam := 0.0
	for z in range(-4, 4):
		for x in range(-4, 3):
			var left := TWTerrainSurface.new(pack.elevation, Vector2(x, z) * 250)
			var right := TWTerrainSurface.new(pack.elevation, Vector2(x + 1, z) * 250)
			var matched := true
			for i in range(17):
				var error := absf(left.height_at(250, i * 15.625) - right.height_at(0, i * 15.625))
				max_seam = maxf(error, max_seam)
				matched = matched and error < 0.000001
			check(matched, "East/west seam %d,%d" % [x, z])
	for z in range(-4, 3):
		for x in range(-4, 4):
			var top := TWTerrainSurface.new(pack.elevation, Vector2(x, z) * 250)
			var bottom := TWTerrainSurface.new(pack.elevation, Vector2(x, z + 1) * 250)
			var matched := true
			for i in range(17):
				matched = matched and absf(top.height_at(i * 15.625, 250) - bottom.height_at(i * 15.625, 0)) < 0.000001
			check(matched, "North/south seam %d,%d" % [x, z])
	evidence.max_east_west_seam_error_m = max_seam
	var surface := TWTerrainSurface.new(pack.elevation)
	var terrain := TWMeshBuffer.new()
	surface.ground(terrain)
	check(terrain.vertices.size() == 1536, "Chunk ground has 16 x 16 x 2 triangles")
	var terrain_error := 0.0
	for i in range(0, terrain.vertices.size(), 3):
		var p := (terrain.vertices[i] + terrain.vertices[i + 1] + terrain.vertices[i + 2]) / 3.0
		terrain_error = maxf(terrain_error, absf(p.y - pack.ground_height(p.x, p.z)))
	check(terrain_error < 0.00002, "Terrain sampling agrees with every triangle centroid")
	var roads := TWMeshBuffer.new()
	surface.drape(roads, PackedVector2Array([Vector2(1, 12), Vector2(244, 227), Vector2(237, 236), Vector2(0, 24)]), 0.045, Color.WHITE)
	var road_error := 0.0
	for i in range(0, roads.vertices.size(), 3):
		var p := (roads.vertices[i] + roads.vertices[i + 1] + roads.vertices[i + 2]) / 3.0
		road_error = maxf(road_error, absf(p.y - pack.ground_height(p.x, p.z) - 0.045))
	check(roads.vertices.size() > 6 and road_error < 0.0001, "Diagonal road faces drape exactly over hills; not just corners")
	evidence.max_road_centroid_height_error_m = road_error
	evidence.max_terrain_centroid_height_error_m = terrain_error
	var chunk := TWChunkBuilder.new(TWMaterials.new(), "terrawave-m2-v1", pack.elevation).build(pack.load_chunk("0,0"))
	check(chunk != null and chunk.has_node("TerrainCollision"), "Elevated chunk has batched ground collision")
	check(chunk.get_meta("vertices") < 180000, "Terrain and draped roads remain within vertex budget")
	var tree: MultiMeshInstance3D = chunk.get_node("NearProps").get_child(0)
	var point := tree.multimesh.get_instance_transform(0).origin
	check(absf(point.y - 1.9 - pack.ground_height(point.x, point.z)) < 0.00002, "Trees rooted at terrain, not y=0")
	chunk.free()
	var bounded := TWMeshBuffer.new()
	bounded.vertices.resize(180000)
	bounded.triangle(Vector3.ZERO, Vector3.ONE, Vector3.UP, Vector3.UP, Color.WHITE)
	check(bounded.over_budget and bounded.vertices.size() == 180000, "Hard mesh-buffer allocation cap")

func physics_checks() -> void:
	session = TWWorldSession.new()
	root.add_child(session)
	session.transition_seconds = 0.04
	var frame := TWLocalFrame.new()
	check(session.begin(PACK, frame.local_to_geographic(Vector3(500, 0, 0))), "Start elevated landing")
	check(await walk(), "Elevated descent reaches walking")
	await ticks(25)
	check(session.walker.is_on_floor(), "Actor settles on elevated collision")
	check(session.destination.y > 20, "Landing is not flattened to zero")
	check(session.horizontal_location()[2] == 0, "Source DEM datum is not passed off as WGS84 ellipsoidal height")
	for x in [750.0, 300.0, 0.0, -300.0, -750.0]:
		var ground := pack.ground_height(x, 0)
		session.streamer.update_focus(Vector3(x, ground, 0))
		await ticks(30)
		session.walker.position = session.frame.region_to_local(x, ground + 0.12, 0)
		session.walker.velocity = Vector3.ZERO
		await ticks(25)
		var region := session.frame.local_to_region(session.walker.position)
		check(session.walker.is_on_floor(), "Actor grounded after terrain rebase at %d" % x)
		check(absf(region.y - pack.ground_height(region.x, region.z)) < 0.09, "Ground contact follows height at %d" % x)
		check(session.streamer.active.size() <= 25, "Bounded terrain window at %d" % x)
	check(session.frame.shifts >= 3, "Multiple origin shifts with elevated ground")
	# Original positive-X landing is no longer resident. Recovery must reload it first.
	check(not session.streamer.active.has("2,0"), "Original landing chunk was unloaded")
	session.walker.position.y -= 12
	await ticks(1)
	check(session.state == "PREPARING" and not session.walker.enabled, "Fall recovery freezes actor and rechecks chunks")
	check(await walk(), "Recovery reloads original landing neighborhood")
	await ticks(30)
	check(session.walker.is_on_floor(), "Recovery lands on reloaded elevated collision")
	var target := session.destination
	check(session._clear_at(target), "Verified landing has real physics ground")
	# Landing lies on a shared edge; remove ALL terrain bodies so no neighbor can supply ground.
	for chunk in session.streamer.active.values():
		chunk.get_node("TerrainCollision").free()
	await ticks(2)
	check(not session._clear_at(target), "Missing actual collider cannot pass landing clearance")
	session.cancel()
	await ticks(3)
	check(session.streamer.active.is_empty() and session.streamer.get_child_count() == 0, "Terrain unloads without orphaned roots")
	evidence.origin_shifts = session.frame.shifts
	evidence.peak_resident = session.streamer.peak_resident
	evidence.last_chunk_build_ms = session.streamer.last_build_ms
