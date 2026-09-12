extends Node
signal status_changed(state: String, message: String)
signal station_changed(station: Dictionary)
signal level_changed(level: float)
const Decoder = preload("res://src/audio/ffmpeg_decoder.gd")
const Feedback = preload("res://src/audio/decoder_feedback.gd")
const SAMPLE_RATE := 48000
var decoder := Decoder.new()
var player := AudioStreamPlayer.new()
var check_player := AudioStreamPlayer.new()
var playback: AudioStreamGeneratorPlayback
var current: Dictionary = {}
var state := "stopped"
var message := "Select a station, then press Listen."
var rms := 0.0
var pcm_frames := 0
var audible_seconds := 0.0
var timeout_seconds := 18.0
var _last_data := 0.0
var _startup := 0.0
var _visited := false

func _ready() -> void:
	name = "RadioPlayer"
	if AudioServer.get_bus_index("Radio") == -1:
		AudioServer.add_bus()
		AudioServer.set_bus_name(AudioServer.bus_count - 1, "Radio")
	player.name = "RadioAudio"
	player.bus = "Radio"
	add_child(player)
	add_child(check_player)
	AppState.changed.connect(_apply_volume)
	_apply_volume()

func play_station(station: Dictionary) -> bool:
	if not station.is_empty() and station.get("playback_mode", "stream") == "website":
		message = "This station uses its official website player. Use Open station website; no native stream is verified yet."
		status_changed.emit(state, message)
		return false
	stop()
	if station.is_empty():
		_set_state("error", "No station selected.")
		return false
	pcm_frames = 0
	current = station.duplicate(true)
	station_changed.emit(current)
	var executable := Decoder.find_executable(AppState.profile.ffmpeg_path)
	if not decoder.start(str(current.get("streamUrl", "")), executable):
		_set_state("error", decoder.error)
		return false
	var stream := AudioStreamGenerator.new()
	stream.mix_rate = SAMPLE_RATE
	stream.buffer_length = 0.4
	player.stream = stream
	player.play()
	playback = player.get_stream_playback() as AudioStreamGeneratorPlayback
	pcm_frames = 0
	audible_seconds = 0.0
	_visited = false
	_startup = Time.get_ticks_msec() / 1000.0
	_last_data = _startup
	_set_state("connecting", "Connecting to the station...")
	return true

func stop() -> void:
	decoder.stop()
	player.stop()
	playback = null
	rms = 0.0
	level_changed.emit(0.0)
	_set_state("stopped", "Ready to tune. Live playback resumes at the current broadcast.")

func retry() -> void:
	if not current.is_empty():
		play_station(current)

func _process(_delta: float) -> void:
	if playback == null:
		return
	var now := Time.get_ticks_msec() / 1000.0
	var received := 0
	var sum_squares := 0.0
	# Bounded work per video frame and bounded AudioStreamGenerator queue.
	for batch in range(4):
		var available := playback.get_frames_available()
		if available <= 0:
			break
		var frames: PackedVector2Array = decoder.read_frames(mini(available, 4096))
		if frames.is_empty():
			break
		if not playback.push_buffer(frames):
			break
		for sample in frames:
			sum_squares += sample.length_squared()
		received += frames.size()
	if received > 0:
		_last_data = now
		pcm_frames += received
		rms = sqrt(sum_squares / (received * 2.0))
		level_changed.emit(rms)
		if state != "playing":
			_set_state("playing", "Receiving decoded audio from the station.")
	elif now - _last_data > 1.5 and state == "playing":
		rms = 0.0
		level_changed.emit(0.0)
		_set_state("buffering", "Connection interrupted. Waiting for audio...")
	if state == "playing":
		audible_seconds = float(pcm_frames) / SAMPLE_RATE
		if not _visited and audible_seconds >= 5.0:
			_visited = true
			AppState.visit(current)
	if now - _last_data > timeout_seconds:
		_fail("No audio received before timeout. Retry, or choose another station.")
	elif not decoder.running() and received == 0:
		_fail(Feedback.stream_failure(decoder.diagnostics))

func _fail(reason: String) -> void:
	decoder.stop()
	player.stop()
	playback = null
	rms = 0.0
	level_changed.emit(0.0)
	_set_state("error", reason)

func _set_state(next: String, detail: String) -> void:
	state = next
	message = detail
	status_changed.emit(state, message)

func _apply_volume() -> void:
	player.volume_db = linear_to_db(maxf(0.00001, AppState.profile.volume))
	check_player.volume_db = player.volume_db

func sound_check() -> void:
	# Clearly separate from radio: a locally synthesized 0.7 s diagnostic chime.
	var bytes := PackedByteArray()
	bytes.resize(33600 * 2)
	for i in range(33600):
		var t := float(i) / SAMPLE_RATE
		var envelope := sin(PI * float(i) / 33600.0) * exp(-t * 3.0)
		var sample := (sin(TAU * 440.0 * t) + sin(TAU * 660.0 * t) * 0.3) * 0.14 * envelope
		bytes.encode_s16(i * 2, int(sample * 32767.0))
	var wave := AudioStreamWAV.new()
	wave.format = AudioStreamWAV.FORMAT_16_BITS
	wave.mix_rate = SAMPLE_RATE
	wave.data = bytes
	check_player.stream = wave
	check_player.play()

func _exit_tree() -> void:
	decoder.stop()
	player.stop()
	check_player.stop()
	player.stream = null
	check_player.stream = null
	playback = null
