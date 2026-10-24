@echo off
chcp 65001 > nul
title Instalador e Inicializador - LeitorDinamico
color 0A

echo ===============================================================================
echo            LEITORDIDAMICO - INSTALAÇÃO E INICIALIZAÇÃO NO WINDOWS
echo ===============================================================================
echo.
echo [1/4] Verificando se o Python esta instalado no seu computador...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] O Python nao foi detectado no PATH do Windows!
    echo Baixando o instalador oficial do Python 3.11 para 64-bit...
    powershell -Command "Start-BitsTransfer -Source 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -Destination 'python_installer.exe'"
    echo Executando instalacao do Python... Lembre-se de marcar 'Add Python to PATH'!
    python_installer.exe
    del python_installer.exe
    echo Por favor, reinicie este script apos concluir a instalacao do Python.
    pause
    exit /b
)

echo [OK] Python detectado com sucesso.
echo.
echo [2/4] Instalando / Atualizando todas as bibliotecas necessarias...
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt --quiet
echo [OK] Bibliotecas instaladas: CustomTkinter, PyMuPDF, Pillow, pytesseract, pyttsx3.

echo.
echo [3/4] Verificando Motor OCR Nativo (Tesseract embutido)...
if exist "tesseract\tesseract.exe" (
    echo [OK] Motor OCR portatil encontrado na pasta local do programa!
) else if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo [OK] Motor OCR detectado na instalacao do sistema Windows!
) else (
    echo [INFO] Baixando motor OCR portatil automaticamente com idioma Portugues...
    call baixar_ocr_portatil.bat
)

echo.
echo [4/4] Iniciando o LeitorDinamico...
echo ===============================================================================
start "" python app.py
exit
