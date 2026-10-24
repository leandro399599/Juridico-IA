@echo off
chcp 65001 > nul
title Compilador LeitorDinamico - Gerador de Executável (.exe)
color 0B

echo ===============================================================================
echo                LEITORDIDAMICO - COMPILADOR PARA WINDOWS (.EXE)
echo ===============================================================================
echo.
echo [1/3] Verificando ambiente Python e instalando dependencias...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo [2/3] Executando PyInstaller para empacotar em arquivo unico (.exe)...
echo.
:: Nota: --noconsole esconde a janela preta do cmd
:: --collect-all customtkinter garante que os arquivos de tema json e fontes sejam incluidos
pyinstaller --noconsole ^
            --onefile ^
            --name "LeitorDinamico" ^
            --collect-all customtkinter ^
            --collect-all pyttsx3 ^
            --hidden-import "fitz" ^
            --hidden-import "pytesseract" ^
            --hidden-import "PIL" ^
            app.py

echo.
echo ===============================================================================
if exist "dist\LeitorDinamico.exe" (
    echo [3/3] SUCESSO! O executavel foi gerado em:
    echo        dist\LeitorDinamico.exe
    echo.
    echo Voce pode mover 'LeitorDinamico.exe' para qualquer computador com Windows!
) else (
    echo [ERRO] Ocorreu uma falha durante o empacotamento com o PyInstaller.
    echo Verifique as mensagens de erro acima.
)
echo ===============================================================================
pause
