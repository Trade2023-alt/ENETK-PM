# -*- mode: python ; coding: utf-8 -*-

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
