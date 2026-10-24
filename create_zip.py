import zipfile
import os

files_to_zip = [
    'app.py',
    'requirements.txt',
    'INSTALAR_E_RODAR.bat',
    'GERAR_EXECUTAVEL_COM_OCR_NATIVO.bat',
    'baixar_ocr_portatil.bat',
    'build_exe.bat',
    'LeitorDinamico.spec',
]

zip_filename = 'LeitorDinamico_Windows_Completo.zip'

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in files_to_zip:
        if os.path.exists(file):
            zipf.write(file, arcname=file)
            print(f"Adicionado: {file}")

    # Adiciona LEIA-ME
    readme_content = """================================================================================
          LEITOR DINÂMICO - PACOTE DE INSTALAÇÃO WINDOWS
================================================================================

COMO INSTALAR E EXECUTAR:
-------------------------
Opção 1: Inicialização Direta (Recomendado)
  - Dê um duplo clique no arquivo: "INSTALAR_E_RODAR.bat"
  - Ele verifica o Python, instala as dependências silenciosamente, configura
    o Tesseract OCR com português e abre a interface moderna imediatamente!

Opção 2: Gerar o Executável Standalone (.exe) com OCR Nativo
  - Dê um duplo clique em: "GERAR_EXECUTAVEL_COM_OCR_NATIVO.bat"
  - O script embutirá o Python, o CustomTkinter, o PyMuPDF e o motor OCR Tesseract
    em um único arquivo 'dist\\LeitorDinamico.exe' que não precisa de nada instalado!

REQUISITOS DO SISTEMA:
  - Windows 10 ou Windows 11 (64-bit)
  - Conexão com a internet apenas na primeira execução para baixar as bibliotecas

RECURSOS INCLUÍDOS:
  - Leitor RSVP com fixação ORP em vermelho (150 a 800 WPM)
  - Memória de leitura persistente com retomada inteligente de obras
  - Painel de Contexto Visual ("Meia Página") com marca-texto sincronizado
  - Medidor de ritmo relativo comparado à média humana (220 WPM)
  - Síntese de Voz (TTS) offline e integração com Gemini AI
================================================================================
"""
    zipf.writestr('LEIA-ME_PRIMEIROS_PASSOS.txt', readme_content)

print(f"Sucesso! Arquivo criado: {zip_filename}")
