@echo off
echo === HuTrack Export Test ===
echo.
echo [1/2] Generating .inc files from DMF...
node test_cli.js swedish_little_girl.dmf
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: test_cli.js failed
    pause
    exit /b 1
)
echo.
echo [2/2] Diffing against reference output...
python diff_all.py
echo.
pause
