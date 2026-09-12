extends "res://tests/integration/native_test_support.gd"
## Clean-cache supplemental route: leave a stopped boat, swim back aboard, probe seabed collision.
const Trip = preload("res://tests/integration/coastal_trip_checks.gd")
func _run() -> void:
	output = "res://evidence/m2_10r/clean_cache/edge_routes_final"
	var override := OS.get_environment("TERRAWAVE_QA_OUTPUT")
	if not override.is_empty(): output = override
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(output))
	scene = load("res://scenes/Main.tscn").instantiate()
	root.add_child(scene)
	await ticks(3)
	earth=scene.earth
	radio=root.get_node("RadioPlayer")
	app=root.get_node("AppState")
	check(earth.load_manifest("res://data/new_haven_harbor/manifest.json"),"Clean cache opens harbor")
	earth.session.transition_seconds=0.1
	earth.locate_region()
	check(earth.descend(),"Clean cache begins native arrival")
	if not await wait_for(func():return earth.session.state=="WALKING",40):
		check(false,"Clean cache physical arrival")
		await finish()
		return
	var v: Node = earth.session.marine
	check(v.coastal != null and v.coastal.valid,"Clean cache binds coastal world")
	check(await wait_for(func():return v.coastal.population.active.size()==13,25),"Clean cache resolves all 13 optimized placements")
	check(await wait_for(func():return v.boat.active,10),"Clean cache resolves skiff")
	var env = v.coastal.environment
	var at: Vector3 = v.coastal.dock.berth()
	var a: Vector3 = earth.session.frame.region_to_local(at.x,env.base_level+5,at.z)
	var b: Vector3 = earth.session.frame.region_to_local(at.x,env.base_level-30,at.z)
	var query := PhysicsRayQueryParameters3D.create(a,b,8)
	var hit: Dictionary = earth.session.get_world_3d().direct_space_state.intersect_ray(query)
	check(not hit.is_empty(),"Actual mapped seabed has ray-queryable native collision")
	if not hit.is_empty():
		var bottom: Vector3 = earth.session.frame.local_to_region(hit.position)
		check(absf(bottom.y-env.bed_at(at.x,at.z))<0.2,"Native seabed collision matches modeled depth within tessellation tolerance")
		check(hit.normal.y>0,"Seabed faces the water above it")
	if await Trip.walk_to_board(self):
		await key(KEY_V)
		check(await wait_for(func():return earth.session.state=="SAILING",6),"Clean-cache local boarding")
		await key(KEY_G)
		check(await wait_for(func():return earth.session.state=="SWIMMING",6),"Stopped vessel permits native water entry")
		if earth.session.state=="SWIMMING":
			var swimmer_position: Vector3 = earth.session.region_position()
			check(swimmer_position.distance_to(v.coastal.dock.ladder())>2.4,"Swimming-back test is not accidentally the dock ladder path")
			check(v.swimmer.camera.current and v.swimmer.active,"Boat exit assigns swimmer camera and collision")
			await key(KEY_E)
			check(await wait_for(func():return earth.session.state=="SAILING",6),"E climbs back aboard the nearby stopped skiff")
			check(not v.swimmer.active and v.swimmer.collision_layer==0,"Reboarding retires swimmer ownership")
			check(v.boat.camera.current and v.boat.moored,"Reboarding preserves mooring and boat camera")
			await key(KEY_E)
			check(await wait_for(func():return earth.session.state=="WALKING",6),"Reboarded moored boat still permits ashore transfer")
			check(await wait_for(func():return earth.session.walker.is_on_floor(),3),"Final return has native floor support")
	var texture_receipt = JSON.parse_string(FileAccess.get_file_as_string("res://addons/terrawave_marine/optimized/texture_receipt.json"))
	for item in texture_receipt.images:
		var image: Image = (load(item.path) as ImageTexture).get_image()
		check(image.is_compressed() and image.has_mipmaps() and image.get_data_size()==int(item.gpu_compressed_pixel_bytes),"Native GPU texture payload validated: "+str(item.path).get_file())
	evidence["clean_import"]="Regenerated cache and embedded model texture intermediates; no previous import cache copied."
	await finish()
