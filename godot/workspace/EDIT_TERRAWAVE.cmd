@echo off
setlocal
set "TERRAWAVE_FFMPEG=%~dp0.tools\ffmpeg\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe"
set "TERRAWAVE_ENGINE=%~dp0.tools\godot-4.7.2\Godot_v4.7.2-stable_win64.exe"
if not exist "%TERRAWAVE_ENGINE%" goto missing
if not exist "%TERRAWAVE_FFMPEG%" goto missing
start "TerraWave Editor" "%TERRAWAVE_ENGINE%" --editor --path "%~dp0TerraWave-Godot-M2.12"
exit /b 0
:missing
echo Portable Godot or FFmpeg is missing. See TerraWave-Godot-M2.12\docs\WINDOWS_DEVELOPMENT.md.
pause
exit /b 1
