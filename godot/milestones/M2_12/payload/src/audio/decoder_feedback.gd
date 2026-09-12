extends RefCounted
## Fixed user-facing messages only: FFmpeg diagnostics may contain private URLs.

static func stream_failure(diagnostics: String) -> String:
	var detail := diagnostics.to_lower()
	if "unrecognized option 'tls_verify'" in detail or "option tls_verify not found" in detail:
		return "FFmpeg lacks HTTPS support. Choose a full FFmpeg build in Settings."
	if "https protocol not found" in detail or "https: protocol not found" in detail:
		return "FFmpeg lacks HTTPS support. Choose a full FFmpeg build in Settings."
	return "The stream ended or is unavailable. Retry, or choose another station."
