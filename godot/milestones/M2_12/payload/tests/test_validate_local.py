"""Unit tests for the Windows-local validation coordinator."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import validate_local as local


class LocalValidationTests(unittest.TestCase):
    def test_output_must_be_new_and_outside_source_tree(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            root.mkdir()
            with self.assertRaisesRegex(ValueError, "outside"):
                local.new_output(root / "evidence", root)
            existing = Path(temp) / "existing"
            existing.mkdir()
            with self.assertRaisesRegex(ValueError, "new"):
                local.new_output(existing, root)
            self.assertEqual(local.new_output(Path(temp) / "evidence", root), Path(temp, "evidence").resolve())

    def test_executables_and_official_godot_version_are_checked(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            tool = Path(temp) / "Godot.exe"
            tool.write_text("fixture", encoding="utf-8")
            self.assertEqual(local.resolve_executable(str(tool), "Godot"), tool.resolve())
            with patch.object(local.shutil, "which", return_value=None):
                with self.assertRaisesRegex(ValueError, "not found"):
                    local.resolve_executable("missing-godot", "Godot")
            with patch.object(local.subprocess, "run", return_value=subprocess.CompletedProcess(
                    [str(tool), "--version"], 0, "4.7.2.stable.official.ed1daf0bf\n", "")):
                self.assertEqual(local.check_godot_version(tool), "4.7.2.stable.official.ed1daf0bf")
            with patch.object(local.subprocess, "run", return_value=subprocess.CompletedProcess(
                    [str(tool), "--version"], 0, "4.7.2.dev.custom\n", "")):
                with self.assertRaisesRegex(ValueError, "official"):
                    local.check_godot_version(tool)
            with patch.object(local, "_tool_output", return_value=""):
                with self.assertRaisesRegex(ValueError, "no version"):
                    local.check_ffmpeg_version(tool)

    def test_ffmpeg_protocol_preflight_rejects_incomplete_builds(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            tool = Path(temp) / "ffmpeg.exe"
            tool.write_text("fixture", encoding="utf-8")
            supported = """Supported file protocols:
Input:
  http
  https
  pipe
  tcp
  tls
Output:
  http
  https
  pipe
  tcp
  tls
"""
            with patch.object(local, "_tool_output", side_effect=["ffmpeg version 7.1", supported]):
                self.assertEqual(local.check_ffmpeg_version(tool), "ffmpeg version 7.1")
                self.assertEqual(local.check_ffmpeg_protocols(tool),
                                 ["input:http", "input:https", "input:tcp", "input:tls", "output:pipe"])
            with patch.object(local, "_tool_output", return_value="Supported file protocols:\n  http\n  pipe\n  tcp"):
                with self.assertRaisesRegex(ValueError, "https.*tls"):
                    local.check_ffmpeg_protocols(tool)
            wrong_direction = """Supported file protocols:
Input:
  pipe
Output:
  http
  https
  tcp
  tls
"""
            with patch.object(local, "_tool_output", return_value=wrong_direction):
                with self.assertRaisesRegex(ValueError, "input:http"):
                    local.check_ffmpeg_protocols(tool)

    def test_python_dependency_preflight_names_missing_packages(self) -> None:
        present = {"numpy", "rasterio", "pyproj", "shapely", "fiona", "PIL"}
        with patch.object(local.importlib.util, "find_spec", side_effect=lambda name: object() if name in present else None):
            self.assertEqual(local.check_python_dependencies(), sorted(present))
        with patch.object(local.importlib.util, "find_spec", side_effect=lambda name: None if name == "rasterio" else object()):
            with self.assertRaisesRegex(ValueError, "rasterio") as error:
                local.check_python_dependencies()
        self.assertIn("requirements-harbor.txt", str(error.exception))

    def test_failed_and_timed_out_processes_are_logged_and_hidden(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            log = Path(temp) / "step.log"
            process = Mock()
            process.wait.return_value = 7
            with patch.object(local.subprocess, "Popen", return_value=process) as popen:
                failed = local.run_step("radio", ["python", "runner.py"], {}, log, timeout=3)
            self.assertEqual(failed["status"], "failed")
            self.assertEqual(failed["exit_code"], 7)
            self.assertEqual(popen.call_args.kwargs["creationflags"], local.hidden_creation_flags())

            timeout_process = Mock()
            timeout_process.wait.side_effect = [subprocess.TimeoutExpired(["godot"], 1), -9]
            with patch.object(local.subprocess, "Popen", return_value=timeout_process), \
                    patch.object(local, "terminate_process_tree") as terminate:
                timed_out = local.run_step("native", ["godot"], {}, log, timeout=1)
            self.assertEqual(timed_out["status"], "timed_out")
            terminate.assert_called_once_with(timeout_process)
            self.assertIn("timed out", timed_out["error"])

    def test_engine_errors_and_decoder_report_are_not_hidden_by_zero_exit(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            log = Path(temp) / "decoder.log"
            process = Mock()
            process.wait.return_value = 0

            def start_with_engine_error(*args, **kwargs):
                kwargs["stdout"].write("SCRIPT ERROR: unexpected parser failure\n")
                return process

            with patch.object(local.subprocess, "Popen", side_effect=start_with_engine_error):
                step = local.run_step("decoder_feedback", ["godot"], {}, log, timeout=1)
            self.assertEqual(step["status"], "failed")
            self.assertTrue(step["unexpected_engine_errors"])

            log.write_text('DECODER_FEEDBACK_RESULT {"checks": 14, "failed": 0}\n', encoding="utf-8")
            valid = local.validate_decoder_feedback({"status": "passed", "log": str(log)})
            self.assertEqual(valid["status"], "passed")
            self.assertEqual(valid["decoder_feedback"]["checks"], 14)
            log.write_text("DECODER_FEEDBACK_RESULT not-json\n", encoding="utf-8")
            invalid = local.validate_decoder_feedback({"status": "passed", "log": str(log)})
            self.assertEqual(invalid["status"], "failed")
            self.assertIn("passing JSON", invalid["error"])

    def test_timeout_cleanup_targets_the_process_tree(self) -> None:
        process = Mock(pid=4321)
        with patch.object(local.os, "name", "nt"), \
                patch.object(local.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as taskkill:
            local.terminate_process_tree(process)
        self.assertEqual(taskkill.call_args.args[0], ["taskkill", "/PID", "4321", "/T", "/F"])
        self.assertFalse(taskkill.call_args.kwargs["shell"])
        process.kill.assert_not_called()

    def test_timeout_values_must_be_finite_positive_seconds(self) -> None:
        self.assertEqual(local._positive_seconds("1.5"), 1.5)
        for value in ["0", "-1", "nan", "inf", "-inf"]:
            with self.subTest(value=value):
                with self.assertRaises(argparse.ArgumentTypeError):
                    local._positive_seconds(value)

    def test_setup_failure_writes_machine_readable_summary(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "new-evidence"
            with patch.object(local, "resolve_executable", side_effect=ValueError("Godot executable not found")):
                code = local.main(["--output", str(output)])
            self.assertEqual(code, 1)
            summary = json.loads((output / "local-validation-summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["status"], "failed")
            self.assertIn("Godot executable not found", summary["error"])
            self.assertEqual(summary["steps"], {})

    def test_ffmpeg_preflight_fails_before_import_and_keeps_detected_versions(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "new-evidence"
            godot = Path(temp) / "Godot.exe"
            ffmpeg = Path(temp) / "ffmpeg.exe"
            with patch.object(local, "resolve_executable", side_effect=[godot, ffmpeg]), \
                    patch.object(local, "check_godot_version", return_value="4.7.2.stable.official.test"), \
                    patch.object(local, "check_ffmpeg_version", return_value="ffmpeg version test"), \
                    patch.object(local, "check_ffmpeg_protocols", side_effect=ValueError("required protocols missing: https")), \
                    patch.object(local, "run_step") as run_step:
                code = local.main(["--output", str(output)])
            self.assertEqual(code, 1)
            run_step.assert_not_called()
            summary = json.loads((output / "local-validation-summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["versions"]["godot"], "4.7.2.stable.official.test")
            self.assertEqual(summary["versions"]["ffmpeg"], "ffmpeg version test")
            self.assertIn("https", summary["error"])

    def test_python_preflight_fails_before_import(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "new-evidence"
            godot = Path(temp) / "Godot.exe"
            ffmpeg = Path(temp) / "ffmpeg.exe"
            with patch.object(local, "resolve_executable", side_effect=[godot, ffmpeg]), \
                    patch.object(local, "check_godot_version", return_value="4.7.2.stable.official.test"), \
                    patch.object(local, "check_ffmpeg_version", return_value="ffmpeg version test"), \
                    patch.object(local, "check_ffmpeg_protocols", return_value=["http", "https", "pipe", "tcp", "tls"]), \
                    patch.object(local, "check_python_dependencies", side_effect=ValueError("Missing Python packages: rasterio")), \
                    patch.object(local, "run_step") as run_step:
                code = local.main(["--output", str(output)])
            self.assertEqual(code, 1)
            run_step.assert_not_called()
            summary = json.loads((output / "local-validation-summary.json").read_text(encoding="utf-8"))
            self.assertIn("rasterio", summary["error"])

    def test_gate_runs_decoder_feedback_between_import_and_radio_suites(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "new-evidence"
            godot = Path(temp) / "Godot.exe"
            ffmpeg = Path(temp) / "ffmpeg.exe"
            passed = {"status": "passed", "exit_code": 0}
            with patch.object(local, "resolve_executable", side_effect=[godot, ffmpeg]), \
                    patch.object(local, "check_godot_version", return_value="4.7.2.stable.official.test"), \
                    patch.object(local, "check_ffmpeg_version", return_value="ffmpeg version test"), \
                    patch.object(local, "check_ffmpeg_protocols", return_value=["http", "https", "pipe", "tcp", "tls"]), \
                    patch.object(local, "check_python_dependencies", return_value=["PIL", "fiona", "numpy", "pyproj", "rasterio", "shapely"]), \
                    patch.object(local, "validate_decoder_feedback", side_effect=lambda step: step), \
                    patch.object(local, "run_step", side_effect=[passed.copy() for _ in range(5)]) as run_step:
                self.assertEqual(local.main(["--output", str(output)]), 0)
            self.assertEqual([call.args[0] for call in run_step.call_args_list],
                             ["editor_import", "decoder_feedback", "radio_voyages", "new_haven_native", "marine_native"])
            decoder_command = run_step.call_args_list[1].args[1]
            self.assertIn("res://tests/test_decoder_feedback.gd", decoder_command)


if __name__ == "__main__":
    unittest.main(verbosity=2)
