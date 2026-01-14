@echo off
echo Starting Quote Generator Desktop Application...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.7 or later and try again
    pause
    exit /b 1
)

REM Check if the desktop app exists
if exist "dist\QuoteGenerator.exe" (
    echo Running compiled desktop application...
    start "" "dist\QuoteGenerator.exe"
) else (
    echo Desktop application not found. Running from Python source...
    python desktop_quote_generator.py
)

echo.
echo Application started!


