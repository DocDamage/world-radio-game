extends SceneTree
const Feedback = preload("res://src/audio/decoder_feedback.gd")
var checks := 0
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("run")

func check(value: bool, label: String) -> void:
	checks += 1
	if not value:
		failures.append(label)
		printerr("FAIL: ", label)

func run() -> void:
	for detail in ["Unrecognized option 'tls_verify'.\r\nError splitting the argument list: Option not found", "Option tls_verify not found.", "https protocol not found, recompile FFmpeg with openssl", "HTTPS: Protocol not found"]:
		var message := Feedback.stream_failure(detail)
		check("HTTPS support" in message and "Settings" in message, "Incomplete build explains the fix")
	for detail in ["", "Server returned 403 Forbidden", "Certificate verification failed", "Error opening https://secret.example/live?token=private-value", "Unrecognized option 'unrelated'."]:
		var message := Feedback.stream_failure(detail)
		check("Retry" in message and "HTTPS support" not in message, "Other errors retain station retry guidance")
		check("private-value" not in message and "secret.example" not in message, "Raw decoder diagnostics never appear in UI")
	# Optional regression against an actual installed build without TLS. No public request
	# can be made: FFmpeg rejects the unsupported input option before opening the URL.
	var incomplete := OS.get_environment("TERRAWAVE_TEST_INCOMPLETE_FFMPEG")
	if not incomplete.is_empty():
		var app := root.get_node("AppState")
		var radio := root.get_node("RadioPlayer")
		app.profile.ffmpeg_path = incomplete
		check(radio.play_station({"id": "tls-regression", "name": "TLS regression", "streamUrl": "https://127.0.0.1:1/unused"}), "Incomplete executable starts and fails asynchronously")
		var deadline := Time.get_ticks_msec() + 5000
		while radio.state != "error" and Time.get_ticks_msec() < deadline:
			await process_frame
		check(radio.state == "error" and "HTTPS support" in radio.message, "Actual failed helper produces actionable game feedback")
		check(radio.pcm_frames == 0 and radio.playback == null and not radio.decoder.running(), "Failed helper and audio playback are cleaned up")
		check(not app.profile.visited.has("tls-regression"), "Decoder failure never earns a listening stamp")
	print("DECODER_FEEDBACK_RESULT ", JSON.stringify({"checks": checks, "failed": failures.size(), "failures": failures}))
	quit(0 if failures.is_empty() else 1)
