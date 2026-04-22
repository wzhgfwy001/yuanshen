# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:/Users/DELL/.openclaw/workspace/excel-filter-project/main_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[('C:/Users/DELL/.openclaw/workspace/百年硕博咨询师专用（2025普通类预测版）.xlsx', '.')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='GaokaoSystem',
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
)
