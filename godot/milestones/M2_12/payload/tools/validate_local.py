#!/usr/bin/env python3
"""Run the isolated local TerraWave gate with an official Godot 4.7.2 build.

This coordinator intentionally runs source-project checks only.  It imports the
editor first, then delegates the M2.12 radio/voyage and New Haven native-radio
checks to their established runners.  It neither downloads tools nor touches the
normal TerraWave profile, catalog, region library, or Godot editor settings.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
from pathlib import Path
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from typing import Any, Sequence


ROOT = Path(__file__).resolve().parents[1]
SUMMARY_NAME = "local-validation-summary.json"
GODOT_VERSION_PREFIX = "4.7.2.stable.official"
REQUIRED_FFMPEG_INPUT_PROTOCOLS = frozenset({"http", "https", "tcp", "tls"})
REQUIRED_FFMPEG_OUTPUT_PROTOCOLS = frozenset({"pipe"})
REQUIRED_PYTHON_MODULES = frozenset({"numpy", "rasterio", "pyproj", "shapely", "fiona", "PIL"})
ENGINE_ERROR_MARKERS = ("SCRIPT ERROR:", "\nERROR:", "ObjectDB instances were leaked")
LIMITS = [
    "Godot runs with Dummy audio; this is not human-audible audio certification.",
    "No physical controller or target-hardware performance certification is performed.",
    "The radio test uses owned synthetic loopback audio; public radio availability is not certified.",
    "This source-project gate does not certify a Windows export, signing, or installer.",
]


def hidden_creation_flags() -> int:
    """Avoid opening transient Windows console windows for coordinator children."""
    return getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0


def new_output(value: Path, root: Path = ROOT) -> Path:
    """Return a non-existent evidence location that cannot be inside the source tree."""
    output = value.expanduser().resolve()
    source = root.resolve()
    if output == source or source in output.parents:
        raise ValueError("Choose a new output directory outside the source tree")
    if output.exists():
        raise ValueError("Choose a new output directory; existing evidence is never overwritten")
    return output


def resolve_executable(value: str, label: str) -> Path:
    """Resolve an explicitly selected executable or a trusted PATH installation."""
    resolved = shutil.which(value) or value
    executable = Path(resolved).expanduser().resolve()
    if not executable.is_file():
        raise ValueError(f"{label} executable not found: {value}")
    return executable


def _tool_output(command: Sequence[str], timeout: float) -> str:
    try:
        result = subprocess.run(
            list(command),
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
            creationflags=hidden_creation_flags(),
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise ValueError(f"Unable to run {command[0]}: {error}") from error
    if result.returncode:
        detail = (result.stderr or result.stdout or "no output").strip()
        raise ValueError(f"{command[0]} version check failed ({result.returncode}): {detail}")
    return (result.stdout or result.stderr).strip()


def check_godot_version(godot: Path) -> str:
    version = _tool_output([str(godot), "--version"], 15)
    if not version.startswith(GODOT_VERSION_PREFIX):
        raise ValueError(
            f"Expected official Godot 4.7.2 ({GODOT_VERSION_PREFIX}); got {version or 'no version'}"
        )
    return version


def check_ffmpeg_version(ffmpeg: Path) -> str:
    lines = _tool_output([str(ffmpeg), "-version"], 15).splitlines()
    version = lines[0] if lines else ""
    if not version.lower().startswith("ffmpeg version "):
        raise ValueError(f"Expected FFmpeg version output; got {version or 'no version'}")
    return version


def check_ffmpeg_protocols(ffmpeg: Path) -> list[str]:
    """Refuse minimal FFmpeg builds before the radio suites spend time importing."""
    protocols = _tool_output([str(ffmpeg), "-hide_banner", "-protocols"], 15)
    found: dict[str, set[str]] = {"input": set(), "output": set()}
    direction: str | None = None
    for line in protocols.lower().splitlines():
        heading = line.strip().removesuffix(":")
        if heading in found:
            direction = heading
            continue
        match = re.fullmatch(r"\s*([a-z0-9+._-]+)\s*", line)
        if direction and match:
            found[direction].add(match.group(1))
    missing = ([f"input:{name}" for name in sorted(REQUIRED_FFMPEG_INPUT_PROTOCOLS - found["input"])]
               + [f"output:{name}" for name in sorted(REQUIRED_FFMPEG_OUTPUT_PROTOCOLS - found["output"])])
    if missing:
        raise ValueError(
            "FFmpeg build is incomplete; required protocols missing: "
            + ", ".join(missing)
            + ". Select a trusted build with HTTP(S), TLS, TCP, and pipe support."
        )
    return ["input:http", "input:https", "input:tcp", "input:tls", "output:pipe"]


def check_python_dependencies() -> list[str]:
    """Verify imports needed by the focused native fixture before editor import."""
    missing = sorted(name for name in REQUIRED_PYTHON_MODULES if importlib.util.find_spec(name) is None)
    if missing:
        harbor = ROOT / "tools" / "requirements-harbor.txt"
        qa = ROOT / "tools" / "requirements-qa.txt"
        raise ValueError(
            "Missing Python packages: " + ", ".join(missing)
            + ". Install them in the Python environment that starts this gate:\n  "
            + f'{sys.executable} -m pip install -r "{harbor}" -r "{qa}"'
        )
    return sorted(REQUIRED_PYTHON_MODULES)


def isolated_environment(output: Path, ffmpeg: Path) -> tuple[dict[str, str], dict[str, str]]:
    """Create child-only OS and TerraWave storage paths under fresh evidence."""
    sandbox = output / "isolated-state"
    paths = {
        "godot_user_home": sandbox / "godot-user-home",
        "appdata": sandbox / "appdata" / "roaming",
        "localappdata": sandbox / "appdata" / "local",
        "temp": sandbox / "temp",
        "profile": sandbox / "profile.json",
        "catalog": sandbox / "catalog.json",
        "region_library": sandbox / "region-library",
        "qa_output": sandbox / "qa-output",
    }
    for path in paths.values():
        if path.suffix:
            path.parent.mkdir(parents=True, exist_ok=True)
        else:
            path.mkdir(parents=True, exist_ok=True)
    environment = dict(os.environ)
    environment.update({
        "GODOT_SILENCE_ROOT_WARNING": "1",
        "GODOT_USER_HOME": str(paths["godot_user_home"]),
        "APPDATA": str(paths["appdata"]),
        "LOCALAPPDATA": str(paths["localappdata"]),
        "TEMP": str(paths["temp"]),
        "TMP": str(paths["temp"]),
        "LP_NUM_THREADS": "4",
        "TERRAWAVE_PROFILE": str(paths["profile"]),
        "TERRAWAVE_CATALOG": str(paths["catalog"]),
        "TERRAWAVE_REGION_LIBRARY": str(paths["region_library"]),
        "TERRAWAVE_QA_OUTPUT": str(paths["qa_output"]),
        "TERRAWAVE_FFMPEG": str(ffmpeg),
    })
    return environment, {name: str(path) for name, path in paths.items()}


def terminate_process_tree(process: subprocess.Popen[Any]) -> None:
    """Terminate a timed-out child and all of its helper processes."""
    if os.name == "nt":
        try:
            result = subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                check=False,
                capture_output=True,
                text=True,
                timeout=15,
                shell=False,
                creationflags=hidden_creation_flags(),
            )
            if result.returncode == 0:
                return
        except (OSError, subprocess.SubprocessError):
            pass
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
            return
        except (OSError, ProcessLookupError):
            pass
    try:
        process.kill()
    except OSError:
        pass


def engine_error_markers(log_path: Path) -> list[str]:
    log = log_path.read_text(encoding="utf-8", errors="replace")
    return [marker for marker in ENGINE_ERROR_MARKERS if marker in log]


def run_step(
    name: str,
    command: Sequence[str],
    environment: dict[str, str],
    log_path: Path,
    timeout: float,
) -> dict[str, Any]:
    """Run one child without a shell and retain its complete combined log."""
    started = time.monotonic()
    result: dict[str, Any] = {
        "command": [str(item) for item in command],
        "log": str(log_path),
        "timeout_seconds": timeout,
    }
    log_path.parent.mkdir(parents=True, exist_ok=True)
    timed_out = False
    returncode: int | None = None
    try:
        with log_path.open("w", encoding="utf-8") as stream:
            process = subprocess.Popen(
                list(command),
                cwd=ROOT,
                env=environment,
                stdout=stream,
                stderr=subprocess.STDOUT,
                text=True,
                shell=False,
                creationflags=hidden_creation_flags(),
                start_new_session=os.name != "nt",
            )
            try:
                returncode = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                terminate_process_tree(process)
                try:
                    returncode = process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    result["termination_error"] = "process did not exit within 15 seconds of tree cleanup"
    except OSError as error:
        log_path.write_text(f"Unable to start {name}: {error}\n", encoding="utf-8")
        result.update({"status": "failed", "error": str(error), "unexpected_engine_errors": False})
        return result
    finally:
        result["elapsed_seconds"] = round(time.monotonic() - started, 3)
    markers = engine_error_markers(log_path)
    result["unexpected_engine_errors"] = bool(markers)
    if timed_out:
        result.update({
            "status": "timed_out",
            "exit_code": returncode,
            "error": f"{name} timed out after {timeout:g} seconds",
        })
    else:
        result.update({
            "status": "passed" if returncode == 0 and not markers else "failed",
            "exit_code": returncode,
        })
    if returncode and not timed_out:
        result["error"] = f"{name} exited with code {returncode}; see {log_path}"
    elif markers and not timed_out:
        result["error"] = f"{name} wrote Godot engine errors ({', '.join(markers)}); see {log_path}"
    return result


def validate_decoder_feedback(step: dict[str, Any]) -> dict[str, Any]:
    """Require the decoder feedback script's explicit completion report."""
    if step.get("status") != "passed":
        return step
    log_path = Path(step["log"])
    lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    reports = [line.removeprefix("DECODER_FEEDBACK_RESULT ") for line in lines
               if line.startswith("DECODER_FEEDBACK_RESULT ")]
    try:
        report = json.loads(reports[-1]) if reports else None
    except json.JSONDecodeError:
        report = None
    if (not isinstance(report, dict) or type(report.get("checks")) is not int or report["checks"] <= 0
            or type(report.get("failed")) is not int or report["failed"] != 0):
        step["status"] = "failed"
        step["error"] = f"decoder_feedback did not emit a valid passing JSON report; see {log_path}"
        return step
    step["decoder_feedback"] = report
    return step


def _positive_seconds(value: str) -> float:
    seconds = float(value)
    if not math.isfinite(seconds) or seconds <= 0:
        raise argparse.ArgumentTypeError("timeout must be greater than zero")
    return seconds


def make_summary(output: Path) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "status": "running",
        "output": str(output),
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        },
        "versions": {},
        "isolation": {},
        "steps": {},
        "limits": LIMITS,
    }


def write_summary(output: Path, summary: dict[str, Any]) -> None:
    (output / SUMMARY_NAME).write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", default="godot", help="official Godot 4.7.2 executable (default: PATH godot)")
    parser.add_argument("--ffmpeg", default="ffmpeg", help="trusted FFmpeg executable (default: PATH ffmpeg)")
    parser.add_argument("--output", required=True, type=Path,
                        help="NEW evidence directory outside this source tree")
    parser.add_argument("--import-timeout", type=_positive_seconds, default=900)
    parser.add_argument("--decoder-timeout", type=_positive_seconds, default=120)
    parser.add_argument("--radio-timeout", type=_positive_seconds, default=1200)
    parser.add_argument("--native-timeout", type=_positive_seconds, default=900)
    parser.add_argument("--marine-timeout", type=_positive_seconds, default=900)
    args = parser.parse_args(argv)

    try:
        output = new_output(args.output)
    except ValueError as error:
        parser.error(str(error))
    output.mkdir(parents=True)
    summary = make_summary(output)
    try:
        godot = resolve_executable(args.godot, "Godot")
        ffmpeg = resolve_executable(args.ffmpeg, "FFmpeg")
        godot_version = check_godot_version(godot)
        ffmpeg_version = check_ffmpeg_version(ffmpeg)
        summary["versions"] = {
            "godot": godot_version,
            "godot_executable": str(godot),
            "ffmpeg": ffmpeg_version,
            "ffmpeg_executable": str(ffmpeg),
        }
        ffmpeg_protocols = check_ffmpeg_protocols(ffmpeg)
        python_modules = check_python_dependencies()
        environment, isolation = isolated_environment(output, ffmpeg)
        summary["versions"]["ffmpeg_required_protocols"] = ffmpeg_protocols
        summary["versions"]["python_executable"] = str(Path(sys.executable).resolve())
        summary["versions"]["python_required_modules"] = python_modules
        summary["isolation"] = isolation

        import_step = run_step(
            "editor_import",
            [str(godot), "--headless", "--audio-driver", "Dummy", "--path", str(ROOT), "--editor", "--import"],
            environment,
            output / "editor-import.log",
            args.import_timeout,
        )
        summary["steps"]["editor_import"] = import_step
        if import_step["status"] != "passed":
            raise RuntimeError(import_step["error"])

        decoder_step = run_step(
            "decoder_feedback",
            [str(godot), "--headless", "--audio-driver", "Dummy", "--path", str(ROOT),
             "--script", "res://tests/test_decoder_feedback.gd"],
            environment,
            output / "decoder-feedback.log",
            args.decoder_timeout,
        )
        summary["steps"]["decoder_feedback"] = validate_decoder_feedback(decoder_step)

        radio_step = run_step(
            "radio_voyages",
            [sys.executable, str(ROOT / "tools" / "validate_radio_voyages.py"), "--godot", str(godot),
             "--output", str(output / "radio-voyages")],
            environment,
            output / "radio-voyages.log",
            args.radio_timeout,
        )
        summary["steps"]["radio_voyages"] = radio_step

        native_step = run_step(
            "new_haven_native",
            [sys.executable, str(ROOT / "tests" / "run_native_tests.py"), "--godot", str(godot),
             "--ffmpeg", str(ffmpeg), "--new-haven-only", "--timeout", str(args.native_timeout),
             "--output", str(output / "new-haven-native")],
            environment,
            output / "new-haven-native.log",
            args.native_timeout + 60,
        )
        summary["steps"]["new_haven_native"] = native_step

        marine_step = run_step(
            "marine_native",
            [sys.executable, str(ROOT / "tests" / "run_native_tests.py"), "--godot", str(godot),
             "--ffmpeg", str(ffmpeg), "--marine-only", "--timeout", str(args.marine_timeout),
             "--output", str(output / "marine-native")],
            environment,
            output / "marine-native.log",
            args.marine_timeout + 60,
        )
        summary["steps"]["marine_native"] = marine_step

        failures = [name for name, step in summary["steps"].items() if step["status"] != "passed"]
        summary["failed_steps"] = failures
        summary["status"] = "passed" if not failures else "failed"
        if failures:
            summary["error"] = "Failed validation steps: " + ", ".join(failures)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
        summary["status"] = "failed"
        summary["error"] = str(error)
        summary.setdefault("failed_steps", list(summary["steps"]))
    write_summary(output, summary)
    print(f"Local validation {summary['status']}: {output / SUMMARY_NAME}", flush=True)
    return 0 if summary["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
