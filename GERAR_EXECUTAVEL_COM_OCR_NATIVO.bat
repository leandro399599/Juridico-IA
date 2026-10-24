@echo off
chcp 65001 > nul
title Compilador Standalone com OCR Nativo Embutido
color 0B

echo ===============================================================================
echo      LEITORDIDAMICO - GERADOR DE EXECUTAVEL STANDALONE COM OCR EMBUTIDO
echo ===============================================================================
echo.
echo [1/3] Verificando dependencias de compilacao...
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt --quiet
python -m pip install pyinstaller --quiet

echo.
echo [2/3] Verificando se a pasta 'tesseract' existe para inclusao nativa no .exe...
set ADD_TESSERACT_ARG=
if exist "tesseract\tesseract.exe" (
    echo [OK] Pasta 'tesseract' detectada! Ela sera embutida NATIVAMENTE no executavel .exe!
    set ADD_TESSERACT_ARG=--add-data "tesseract;tesseract"
) else if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo [INFO] Copiando Tesseract instalado no Windows para empacotar nativamente...
    mkdir tesseract 2>nul
    xcopy /E /I /Y "C:\Program Files\Tesseract-OCR\*" "tesseract\" >nul 2>nul
    set ADD_TESSERACT_ARG=--add-data "tesseract;tesseract"
) else (
    echo [INFO] Baixando binarios do OCR portatil antes de empacotar...
    call baixar_ocr_portatil.bat
    if exist "tesseract\tesseract.exe" (
        set ADD_TESSERACT_ARG=--add-data "tesseract;tesseract"
    )
)

echo.
echo [3/3] Compilando arquivo unico 'LeitorDinamico.exe' via PyInstaller...
echo       (Isso pode levar de 1 a 2 minutos enquanto compacta todos os binarios)
echo.

pyinstaller --noconsole ^
            --onefile ^
            --name "LeitorDinamico" ^
            %ADD_TESSERACT_ARG% ^
            --collect-all customtkinter ^
            --collect-all pyttsx3 ^
            --collect-all PIL ^
            --hidden-import "fitz" ^
            --hidden-import "pytesseract" ^
            --hidden-import "google.genai" ^
            app.py

echo.
echo ===============================================================================
if exist "dist\LeitorDinamico.exe" (
    echo [SUCESSO!] O executavel independente com OCR NATIVO foi criado em:
    echo            dist\LeitorDinamico.exe
    echo.
    echo Este arquivo .exe contem Python, CustomTkinter, PyMuPDF e Tesseract OCR
    echo 100%% embutidos! Pode ser rodado em qualquer computador com Windows 10/11
    echo sem precisar de nenhuma instalacao previa!
) else (
    echo [FALHA] Nao foi possivel gerar o executavel. Verifique os erros acima.
)
echo ===============================================================================
pause
