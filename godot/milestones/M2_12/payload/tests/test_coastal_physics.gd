extends SceneTree
const Boat = preload("res://addons/terrawave_marine/harbor/harbor_skiff.gd")
const Env = preload("res://addons/terrawave_marine/coastal/environment.gd")
const Buoyancy = preload("res://addons/terrawave_marine/coastal/buoyancy.gd")
var failures: Array[String] = []
var checks := 0
var samples: Array = []
var world: Node3D
var environment: RefCounted
var boat: RigidBody3D
var rate := 60
func _initialize() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--hz="): rate = int(arg.trim_prefix("--hz="))
	Engine.physics_ticks_per_second = rate
	call_deferred("run")
func check(value: bool,label: String) -> void:
	checks += 1
	if not value: failures.append(label); printerr("FAIL ",label)
func frames(seconds: float) -> void:
	for i in range(ceili(seconds*rate)):
		await physics_frame
		environment.advance(1.0/rate)
		boat.step(1.0/rate,null,boat.frame)
		await process_frame
func run() -> void:
	world = Node3D.new()
	root.add_child(world)
	var pack := TWRegionPack.new()
	check(pack.open("res://data/new_haven_harbor/manifest.json"),"Actual harbor data opens")
	environment = Env.new()
	check(environment.configure(pack),"Modeled bathymetry schema matches actual region")
	environment.roughness = 0
	environment.tide_rate = 0
	boat = Boat.new()
	world.add_child(boat)
	boat.frame = TWLocalFrame.new(PackedFloat64Array(pack.manifest.anchor))
	boat.environment = environment
	boat.place(Vector3(-510,environment.base_level+1.0,285),0)
	boat.active = true
	boat.freeze = false
	boat.visible = true
	await frames(14)
	var expected: float = Buoyancy.equilibrium_origin(environment.base_level,boat.mass)
	var equilibrium := boat.position.y
	check(absf(equilibrium-expected) < 0.045,"320 kg displacement converges to predicted equilibrium")
	check(absf(boat.linear_velocity.y) < 0.10,"Damped stable vertical velocity")
	check(absf(boat.rotation.x) < 0.03 and absf(boat.rotation.z) < 0.03,"Upright symmetric equilibrium")
	samples.append({"phase":"320kg","expected_y":expected,"actual_y":equilibrium,"velocity_y":boat.linear_velocity.y})
	boat.mass = 480
	await frames(12)
	expected = Buoyancy.equilibrium_origin(environment.base_level,boat.mass)
	check(absf(boat.position.y-expected) < 0.045,"Added 160 kg produces independently predicted greater draft")
	check(boat.position.y < equilibrium-0.09,"Extra load sinks hull, not scripted height")
	samples.append({"phase":"480kg","expected_y":expected,"actual_y":boat.position.y})
	boat.mass = 320
	boat.rotation.z = 0.25
	boat.angular_velocity = Vector3.ZERO
	await frames(14)
	check(absf(boat.rotation.z) < 0.06,"Six-probe restoring torque recovers roll disturbance")
	environment.roughness = 2.5
	environment.tide_rate = 300
	var low := INF
	var high := -INF
	for i in range(10):
		await frames(1.0)
		low = minf(low,boat.position.y)
		high = maxf(high,boat.position.y)
		check(boat.position.is_finite() and boat.linear_velocity.is_finite(),"Rough-water finite physics second %d"%i)
	check(high-low > 0.03,"Visible height changes under shared physical water forces")
	check(absf(boat.position.y-environment.height_at(-510,285)) < 0.75,"Rough-water displacement remains bounded")
	var before: Vector3 = boat.frame.local_to_region(boat.position)
	var velocity_before: Vector3 = boat.linear_velocity
	var shift := Vector3(-500,0,280)
	boat.frame.rebase(shift)
	boat.rebase(shift)
	var after: Vector3 = boat.frame.local_to_region(boat.position)
	check(before.distance_to(after) < 0.001,"Rebase preserves region-space hull position")
	check(velocity_before.distance_to(boat.linear_velocity) < 0.001,"Rebase preserves physical velocities")
	check(is_nan(environment.bed_at(1001,0)),"Outside bathymetry remains unknown")
	check(not environment.safe_depth(Vector3(999,0,0),Vector3(1001,0,0)),"Unknown depth refuses hull passage")
	var result := {"suite":"Native Godot six-probe rigid-body physics; no navigation mock used", "hz":rate,"checks":checks,"failed":failures.size(),"failures":failures,"measurements":samples,"engine":Engine.get_version_info()}
	var path := "res://evidence/m2_10r/physics_%d.json"%rate
	var override := OS.get_environment("TERRAWAVE_QA_OUTPUT")
	if not override.is_empty():
		DirAccess.make_dir_recursive_absolute(override)
		path = override.path_join("physics_%d.json" % rate)
	var file := FileAccess.open(path,FileAccess.WRITE)
	file.store_string(JSON.stringify(result,"\t")); file.close()
	boat.active = false
	boat.freeze = true
	world.queue_free()
	await process_frame
	print("COAST_PHYSICS ",JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
