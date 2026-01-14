#!/usr/bin/env python3
"""
Build script for creating a standalone desktop application
using PyInstaller for the Quote Generator system.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_pyinstaller():
    """Check if PyInstaller is installed, install if not"""
    try:
        import PyInstaller
        print("✓ PyInstaller is already installed")
        return True
    except ImportError:
        print("Installing PyInstaller...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
            print("✓ PyInstaller installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("✗ Failed to install PyInstaller")
            return False

def create_spec_file():
    """Create a PyInstaller spec file for the desktop application"""
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-

import os
import glob

block_cipher = None

# Collect data files that exist
datas = []
file_patterns = ['*.xlsx', '*.pdf', '*.png', '*.webp', '*.txt', '*.md', '*.xml', '*.rtf', '*.csv']

for pattern in file_patterns:
    files = glob.glob(pattern)
    for file in files:
        if os.path.exists(file):
            datas.append((file, '.'))

a = Analysis(
    ['desktop_quote_generator.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'openpyxl',
        'pandas',
        'xlrd',
        'reportlab',
        'tkinter',
        'tkinter.ttk',
        'tkinter.filedialog',
        'tkinter.messagebox',
        'tkinter.scrolledtext',
        'xml.etree.ElementTree',
        'base64',
        'io',
        'datetime',
        're',
        'os',
        'file_parsers',
        'exporters',
        'dialogs'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='QuoteGenerator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='PSI Badge.png' if os.path.exists('PSI Badge.png') else None,
)
'''
    
    with open('QuoteGenerator.spec', 'w') as f:
        f.write(spec_content)
    
    print("✓ Created QuoteGenerator.spec file")

def build_application():
    """Build the desktop application using PyInstaller"""
    print("Building desktop application...")
    
    try:
        # Clean previous builds
        if os.path.exists('build'):
            shutil.rmtree('build')
            print("✓ Cleaned previous build directory")
        
        if os.path.exists('dist'):
            shutil.rmtree('dist')
            print("✓ Cleaned previous dist directory")
        
        # Build the application
        cmd = [sys.executable, "-m", "PyInstaller", "--clean", "QuoteGenerator.spec"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Desktop application built successfully!")
            print(f"✓ Executable created in: {os.path.abspath('dist/QuoteGenerator.exe')}")
            return True
        else:
            print("✗ Build failed:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"✗ Build error: {e}")
        return False

def create_installer_script():
    """Create a simple installer script"""
    installer_content = '''@echo off
echo Installing Quote Generator Desktop Application...
echo.

REM Create application directory
if not exist "%PROGRAMFILES%\\QuoteGenerator" mkdir "%PROGRAMFILES%\\QuoteGenerator"

REM Copy executable
copy "QuoteGenerator.exe" "%PROGRAMFILES%\\QuoteGenerator\\"

REM Create desktop shortcut
echo Creating desktop shortcut...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\Quote Generator.lnk'); $Shortcut.TargetPath = '%PROGRAMFILES%\\QuoteGenerator\\QuoteGenerator.exe'; $Shortcut.Save()"

echo.
echo Installation complete!
echo You can now run Quote Generator from your desktop or Start menu.
pause
'''
    
    with open('install.bat', 'w') as f:
        f.write(installer_content)
    
    print("✓ Created install.bat script")

def create_readme():
    """Create a README for the desktop application"""
    readme_content = '''# Quote Generator Desktop Application

## Installation

1. **Quick Install**: Double-click `install.bat` to install the application
2. **Manual Install**: Copy `QuoteGenerator.exe` to your desired location

## Running the Application

- **Desktop**: Double-click the "Quote Generator" shortcut on your desktop
- **Start Menu**: Search for "Quote Generator" in the Start menu
- **Direct**: Navigate to the installation folder and double-click `QuoteGenerator.exe`

## Features

- Professional quote generation with Excel and PDF export
- Import from multiple file formats (Excel, RTF, XML, CSV)
- Interactive GUI with tabbed interface
- Real-time preview and calculations
- Customizable pricing and markup settings

## System Requirements

- Windows 10 or later
- No additional software required (all dependencies included)

## File Support

### Import Formats
- Excel files (.xlsx, .xls)
- RTF files (.rtf)
- XML files (.xml)
- CSV files (.csv)

### Export Formats
- Excel quotes (.xlsx)
- PDF quotes (.pdf)

## Usage

1. **Quote Details**: Fill in customer and project information
2. **Line Items**: Import data or manually add items
3. **Preview**: Review your quote before exporting
4. **Export**: Generate professional Excel or PDF quotes

## Support

For technical support or questions, refer to the original documentation files in the application directory.

## Version

Desktop Application v1.0
Built from Python Quote Generator System
'''
    
    with open('DESKTOP_APP_README.txt', 'w') as f:
        f.write(readme_content)
    
    print("✓ Created DESKTOP_APP_README.txt")

def main():
    """Main build process"""
    print("=" * 60)
    print("QUOTE GENERATOR DESKTOP APPLICATION BUILDER")
    print("=" * 60)
    print()
    
    # Check if we're in the right directory
    if not os.path.exists('desktop_quote_generator.py'):
        print("✗ Error: desktop_quote_generator.py not found!")
        print("Please run this script from the directory containing the quote generator files.")
        return False
    
    # Step 1: Check PyInstaller
    if not check_pyinstaller():
        return False
    
    # Step 2: Create spec file
    create_spec_file()
    
    # Step 3: Build application
    if not build_application():
        return False
    
    # Step 4: Create installer
    create_installer_script()
    
    # Step 5: Create documentation
    create_readme()
    
    print()
    print("=" * 60)
    print("BUILD COMPLETE!")
    print("=" * 60)
    print()
    print("Your desktop application is ready!")
    print(f"Location: {os.path.abspath('dist/QuoteGenerator.exe')}")
    print()
    print("Next steps:")
    print("1. Test the application by running QuoteGenerator.exe")
    print("2. Use install.bat to install it on your system")
    print("3. Distribute the entire 'dist' folder to other computers")
    print()
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\nBuild failed! Please check the error messages above.")
        sys.exit(1)
    else:
        print("\nBuild successful! Your desktop application is ready to use.")
