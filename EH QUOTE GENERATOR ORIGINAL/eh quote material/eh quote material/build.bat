@echo off
echo Building Quote Generator Desktop Application...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.7 or later and try again
    pause
    exit /b 1
)

REM Run the build script
python build_desktop_app.py

echo.
echo Build process completed!
pause


