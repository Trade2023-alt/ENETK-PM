#!/usr/bin/env python3
"""
Desktop Quote Generator Launcher
Easy way to run the ENETK & EH Systems Quote Generator
"""

import sys
import os
import subprocess

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'openpyxl',
        'pandas', 
        'reportlab'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n📦 Installing missing packages...")
        
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing_packages)
            print("✅ All packages installed successfully!")
        except subprocess.CalledProcessError:
            print("❌ Failed to install packages. Please install manually:")
            print(f"   pip install {' '.join(missing_packages)}")
            return False
    
    return True

def main():
    """Main launcher function"""
    print("🚀 ENETK & EH Systems - Desktop Quote Generator")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Cannot start application due to missing dependencies.")
        input("Press Enter to exit...")
        return
    
    # Import and run the application
    try:
        from desktop_quote_generator import DesktopQuoteGenerator
        
        print("✅ Starting Desktop Quote Generator...")
        print("📋 Features:")
        print("   - Import from Excel, RTF, XML, CSV files")
        print("   - Professional quote generation")
        print("   - Excel and PDF export")
        print("   - ENETK & EH Systems branding")
        print("\n🎯 Ready to generate quotes!")
        
        app = DesktopQuoteGenerator()
        app.run()
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all files are in the same directory:")
        print("   - desktop_quote_generator.py")
        print("   - file_parsers.py")
        print("   - dialogs.py")
        print("   - exporters.py")
        input("Press Enter to exit...")
    except Exception as e:
        print(f"❌ Error starting application: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()
