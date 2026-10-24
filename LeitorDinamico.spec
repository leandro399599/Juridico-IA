# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_all

block_cipher = None

# Coleta completa de customtkinter e pyttsx3
datas_ctk, binaries_ctk, hiddenimports_ctk = collect_all('customtkinter')
datas_tts, binaries_tts, hiddenimports_tts = collect_all('pyttsx3')
datas_pil, binaries_pil, hiddenimports_pil = collect_all('PIL')

# Inclui pasta tesseract se presente
datas = datas_ctk + datas_tts + datas_pil
if os.path.exists('tesseract'):
    datas.append(('tesseract', 'tesseract'))

binaries = binaries_ctk + binaries_tts + binaries_pil
hiddenimports = (
    hiddenimports_ctk + hiddenimports_tts + hiddenimports_pil +
    ['fitz', 'pytesseract', 'google.genai']
)

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
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
    name='LeitorDinamico',
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
    icon=None
)
