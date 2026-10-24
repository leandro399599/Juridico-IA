import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Terminal,
  AlertCircle,
  FileCode,
  Package,
  Play,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Archive,
  FolderArchive,
} from 'lucide-react';

interface PythonExporterProps {
  appPyCode: string;
}

export const PythonExporter: React.FC<PythonExporterProps> = ({ appPyCode }) => {
  const [activeTab, setActiveTab] = useState<'installer' | 'guide' | 'apppy' | 'bat'>('installer');
  const [copied, setCopied] = useState<string | null>(null);

  const requirementsContent = `# Dependências do LeitorDinamico (Python 3.10+)
customtkinter>=5.2.0
PyMuPDF>=1.23.0
Pillow>=10.0.0
pytesseract>=0.3.10
pyttsx3>=2.90
google-genai>=2.4.0
pyinstaller>=6.3.0
`;

  const installBatContent = `@echo off
chcp 65001 > nul
title Instalador e Inicializador - LeitorDinamico
color 0A

echo ===============================================================================
echo            LEITORDIDAMICO - INSTALACAO E INICIALIZACAO NO WINDOWS
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
if exist "tesseract\\tesseract.exe" (
    echo [OK] Motor OCR portatil encontrado na pasta local do programa!
) else if exist "C:\\Program Files\\Tesseract-OCR\\tesseract.exe" (
    echo [OK] Motor OCR detectado na instalacao do sistema Windows!
) else (
    echo [INFO] Baixando motor OCR portatil com dicionario em Portugues...
    call baixar_ocr_portatil.bat
)

echo.
echo [4/4] Iniciando o LeitorDinamico...
echo ===============================================================================
start "" python app.py
exit
`;

  const buildExeWithOcrBatContent = `@echo off
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
if exist "tesseract\\tesseract.exe" (
    echo [OK] Pasta 'tesseract' detectada! Ela sera embutida NATIVAMENTE no executavel .exe!
    set ADD_TESSERACT_ARG=--add-data "tesseract;tesseract"
) else if exist "C:\\Program Files\\Tesseract-OCR\\tesseract.exe" (
    echo [INFO] Copiando Tesseract instalado no Windows para empacotar nativamente...
    mkdir tesseract 2>nul
    xcopy /E /I /Y "C:\\Program Files\\Tesseract-OCR\\*" "tesseract\\" >nul 2>nul
    set ADD_TESSERACT_ARG=--add-data "tesseract;tesseract"
)

echo.
echo [3/3] Compilando arquivo unico 'LeitorDinamico.exe' via PyInstaller...
echo       (Compactando CustomTkinter, PyMuPDF, Pillow e motor OCR)...
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
            app.py

echo.
echo ===============================================================================
if exist "dist\\LeitorDinamico.exe" (
    echo [SUCESSO!] O executavel independente com OCR NATIVO foi criado em:
    echo            dist\\LeitorDinamico.exe
)
echo ===============================================================================
pause
`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL EM DESTAQUE: DOWNLOAD DO PACOTE COMPLETO (.ZIP) */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-indigo-950/80 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> PACOTE COMPLETO DE INSTALAÇÃO WINDOWS
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FolderArchive className="w-6 h-6 text-emerald-400" />
              Download do Pacote Windows com OCR Nativo Embutido
            </h2>
            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              Contém todos os arquivos pré-configurados: <code className="text-emerald-300">app.py</code>, os scripts instaladores de 1-clique, suporte ao motor OCR local Tesseract, bibliotecas necessárias e configurador do executável standalone <code className="text-indigo-300">.exe</code>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="/api/download/LeitorDinamico_Windows_Completo.zip"
              download="LeitorDinamico_Windows_Completo.zip"
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-95 text-center"
            >
              <Download className="w-5 h-5" />
              Baixar Pacote Completo (.ZIP)
            </a>
            <span className="text-[10px] text-neutral-400 text-center">
              Pronto para extrair e rodar no Windows 10/11
            </span>
          </div>
        </div>

        {/* Recursos Embutidos no Pacote */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Cpu className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span><strong>OCR Nativo:</strong> Detecção embutida e TESSDATA_PREFIX</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300">
            <Play className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span><strong>1-Clique:</strong> <code className="text-sky-300">INSTALAR_E_RODAR.bat</code></span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300">
            <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span><strong>Standalone .EXE:</strong> PyInstaller spec com OCR</span>
          </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-neutral-800 space-x-2">
        <button
          onClick={() => setActiveTab('installer')}
          className={`px-4 py-2 text-xs md:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'installer'
              ? 'border-emerald-500 text-emerald-400 bg-neutral-900/60 rounded-t-lg'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Play className="w-4 h-4" /> Script 1-Clique (INSTALAR_E_RODAR.bat)
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 text-xs md:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'guide'
              ? 'border-emerald-500 text-emerald-400 bg-neutral-900/60 rounded-t-lg'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Terminal className="w-4 h-4" /> Passo a Passo de Instalação
        </button>
        <button
          onClick={() => setActiveTab('apppy')}
          className={`px-4 py-2 text-xs md:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'apppy'
              ? 'border-emerald-500 text-emerald-400 bg-neutral-900/60 rounded-t-lg'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileCode className="w-4 h-4" /> Código app.py
        </button>
        <button
          onClick={() => setActiveTab('bat')}
          className={`px-4 py-2 text-xs md:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'bat'
              ? 'border-emerald-500 text-emerald-400 bg-neutral-900/60 rounded-t-lg'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Package className="w-4 h-4" /> Gerador do .EXE Standalone
        </button>
      </div>

      {/* ABA 1: SCRIPT DE 1 CLIQUE */}
      {activeTab === 'installer' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4 text-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                INSTALAR_E_RODAR.bat (Instalação e Execução com 1 Clique)
              </h3>
              <p className="text-xs text-neutral-400">
                Este script batch faz tudo sozinho no Windows: verifica Python, instala bibliotecas, configura o OCR nativo e inicia o aplicativo!
              </p>
            </div>
            <button
              onClick={() => downloadFile('INSTALAR_E_RODAR.bat', installBatContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Script .BAT
            </button>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl font-mono text-xs text-emerald-400 border border-neutral-800 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{installBatContent}</pre>
          </div>
        </div>
      )}

      {/* ABA 2: PASSO A PASSO */}
      {activeTab === 'guide' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5 text-neutral-200">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            Guia Rápido: Como Instalar e Rodar no Windows
          </h3>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">Baixe e Extraia o Pacote ZIP</h4>
                <p className="text-xs text-neutral-400">
                  Clique no botão verde superior <strong>"Baixar Pacote Completo (.ZIP)"</strong> e extraia o arquivo em qualquer pasta do seu computador (ex: <code className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-200">C:\LeitorDinamico</code>).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">Dê 2 Cliques em "INSTALAR_E_RODAR.bat"</h4>
                <p className="text-xs text-neutral-400">
                  O script vai rodar automaticamente, baixar as bibliotecas open-source necessárias e já abrir o <strong>LeitorDinamico</strong> com a interface CustomTkinter na sua tela.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">Como o Motor OCR Funciona Nativamente?</h4>
                <p className="text-xs text-neutral-400">
                  O código <code className="text-emerald-300">app.py</code> foi programado para procurar o Tesseract primeiro na subpasta <code className="text-neutral-200">tesseract\tesseract.exe</code> e definir a variável <code className="text-neutral-200">TESSDATA_PREFIX</code> automaticamente com o modelo em português (<code className="text-neutral-200">por.traineddata</code>). Assim, o OCR funciona sem exigir que você mexa nas variáveis de ambiente do Windows!
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">Para Gerar o Executável Standalone (.exe)</h4>
                <p className="text-xs text-neutral-400">
                  Dê 2 cliques no arquivo <code className="text-indigo-300">GERAR_EXECUTAVEL_COM_OCR_NATIVO.bat</code>. Ele compilará um arquivo único <code className="text-emerald-300">dist\LeitorDinamico.exe</code> que embute tudo (Python + CustomTkinter + PyMuPDF + Tesseract OCR) para você transportar em um pen drive para qualquer PC!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CÓDIGO APP.PY */}
      {activeTab === 'apppy' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Arquivo: <strong className="text-neutral-200">app.py</strong> (com suporte a OCR nativo e memória JSON)</span>
            <button
              onClick={() => handleCopy(appPyCode, 'apppy-code')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs border border-neutral-700 transition"
            >
              {copied === 'apppy-code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied === 'apppy-code' ? 'Copiado!' : 'Copiar Código'}
            </button>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 font-mono text-xs text-neutral-300 max-h-[550px] overflow-y-auto">
            <pre className="whitespace-pre-wrap">{appPyCode}</pre>
          </div>
        </div>
      )}

      {/* ABA 4: SCRIPT DO GERADOR STANDALONE */}
      {activeTab === 'bat' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4 text-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">GERAR_EXECUTAVEL_COM_OCR_NATIVO.bat</h3>
              <p className="text-xs text-neutral-400">
                Gera o arquivo <code className="text-emerald-300">dist\LeitorDinamico.exe</code> embutindo o motor OCR via <code className="text-neutral-300">--add-data "tesseract;tesseract"</code>.
              </p>
            </div>
            <button
              onClick={() => downloadFile('GERAR_EXECUTAVEL_COM_OCR_NATIVO.bat', buildExeWithOcrBatContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Script Compilador
            </button>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl font-mono text-xs text-sky-400 border border-neutral-800 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{buildExeWithOcrBatContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
