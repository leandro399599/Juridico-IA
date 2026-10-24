@echo off
chcp 65001 > nul
title Baixador do Motor OCR Portátil para Windows
echo Baixando binarios do Tesseract OCR e dicionario em Portugues...

mkdir tesseract 2>nul
mkdir tesseract\tessdata 2>nul

:: Baixar modelo de idioma Portugues para OCR de alta precisao
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/por.traineddata' -OutFile 'tesseract\tessdata\por.traineddata'"

:: Se o sistema tiver instalacao existente, copia
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    xcopy /E /I /Y "C:\Program Files\Tesseract-OCR\*" "tesseract\" >nul 2>nul
    echo [OK] Binarios do Tesseract integrados na pasta local 'tesseract'!
) else (
    echo Baixando executavel e bibliotecas portateis do Tesseract...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe' -OutFile 'tesseract_setup.exe'"
    echo Executando instalador silencioso para pasta local...
    start /wait tesseract_setup.exe /S /D=%CD%\tesseract
    del tesseract_setup.exe 2>nul
    echo [OK] Tesseract configurado com sucesso na pasta local!
)
