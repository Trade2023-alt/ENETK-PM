#!/usr/bin/env python3
"""
Simple build script for creating a standalone desktop application
"""

import os
import sys
import subprocess
import shutil

def build_simple():
    """Build a simple standalone executable"""
    print("Building Quote Generator Desktop Application...")
    
    try:
        # Clean previous builds
        for dir_name in ['build', 'dist', '__pycache__']:
            if os.path.exists(dir_name):
                shutil.rmtree(dir_name)
                print(f"✓ Cleaned {dir_name}")
        
        # Simple PyInstaller command
        cmd = [
            sys.executable, "-m", "PyInstaller",
            "--onefile",  # Single executable file
            "--windowed",  # No console window
            "--name", "QuoteGenerator",
            "--add-data", "file_parsers.py;.",
            "--add-data", "exporters.py;.",
            "--add-data", "dialogs.py;.",
            "desktop_quote_generator.py"
        ]
        
        print("Running PyInstaller...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Build successful!")
            exe_path = os.path.join("dist", "QuoteGenerator.exe")
            if os.path.exists(exe_path):
                print(f"✓ Executable created: {os.path.abspath(exe_path)}")
                return True
            else:
                print("✗ Executable not found after build")
                return False
        else:
            print("✗ Build failed:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"✗ Build error: {e}")
        return False

if __name__ == "__main__":
    success = build_simple()
    if success:
        print("\n🎉 Your desktop application is ready!")
        print("You can find it in the 'dist' folder as QuoteGenerator.exe")
        print("\nTo run it:")
        print("1. Double-click QuoteGenerator.exe")
        print("2. Or run it from command line: dist\\QuoteGenerator.exe")
    else:
        print("\n❌ Build failed. You can still run the application directly with Python:")
        print("python desktop_quote_generator.py")


