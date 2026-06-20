@echo off
echo Building HuTrack Converter via Python...

python build.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Done! Generated hutrack_export.html
) else (
    echo.
    echo ERROR: Build failed. Ensure Python is installed and src/ files exist.
)

pause
