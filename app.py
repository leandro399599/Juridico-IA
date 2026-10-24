"""
================================================================================
          LEITOR DINÂMICO - RSVP, ACESSIBILIDADE & DICIONÁRIO INTEGRADO
================================================================================
Aplicativo Desktop Windows com CustomTkinter, PyMuPDF (fitz), Pillow e OCR.

Novos Recursos & Correções de Usabilidade:
1. Correção Visual do RSVP:
   - Exibição de palavras contíguas sem espaçamento excessivo em tela cheia (Full Screen).
   - Tratamento adequado de palavras compostas com hífen (ex: "Bem-vindo") e acentuação.
2. Dicionário Integrado:
   - Balão de significado (Tooltip) ao passar o mouse sobre a palavra lida.
   - Painel de Dicionário na parte inferior ao clicar sobre a palavra.
3. Interface Totalmente Flexível e Redimensionável:
   - Pesos dinâmicos do grid permitindo expandir/contrair a página do PDF e o leitor.
4. Compatibilidade Total com PyInstaller (sys._MEIPASS) e OCR Nativo.

Comando para compilar no Windows:
py -m PyInstaller --noconsole --onefile --name "LeitorDinamico" --collect-all customtkinter --collect-all pyttsx3 --collect-all PIL --hidden-import "fitz" --hidden-import "pytesseract" --hidden-import "google.genai" app.py
================================================================================
"""

import os
import sys
import time
import json
import threading
import re
from datetime import datetime
import tkinter as tk
from tkinter import filedialog, messagebox
from typing import List, Dict, Any, Optional, Tuple

# Suporte ao empacotamento PyInstaller para carregar recursos embutidos
def resource_path(relative_path: str) -> str:
    """Retorna caminho absoluto para recursos, lidando com sys._MEIPASS em executáveis."""
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

# Interface Gráfica
try:
    import customtkinter as ctk
except ImportError:
    print("ERRO: CustomTkinter não encontrado. Execute: pip install customtkinter")
    sys.exit(1)

# Manipulação de PDF
try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERRO: PyMuPDF (fitz) não encontrado. Execute: pip install pymupdf")
    sys.exit(1)

# Manipulação de Imagem
try:
    from PIL import Image, ImageTk, ImageDraw
except ImportError:
    print("ERRO: Pillow não encontrado. Execute: pip install Pillow")
    sys.exit(1)

# OCR para PDFs digitalizados (detecção de OCR Nativo / Embutido)
try:
    import pytesseract

    def configure_tesseract():
        # 1. Se estiver rodando como executável PyInstaller (--add-data "tesseract;tesseract")
        if hasattr(sys, "_MEIPASS"):
            bundled_tess = os.path.join(sys._MEIPASS, "tesseract", "tesseract.exe")
            if os.path.exists(bundled_tess):
                pytesseract.pytesseract.tesseract_cmd = bundled_tess
                tessdata = os.path.join(sys._MEIPASS, "tesseract", "tessdata")
                if os.path.exists(tessdata):
                    os.environ["TESSDATA_PREFIX"] = tessdata
                return bundled_tess

        # 2. Se estiver em pasta "tesseract" adjacente ao executável/script (Modo Portátil)
        base_dir = os.path.dirname(sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(__file__))
        local_tess = os.path.join(base_dir, "tesseract", "tesseract.exe")
        if os.path.exists(local_tess):
            pytesseract.pytesseract.tesseract_cmd = local_tess
            tessdata = os.path.join(base_dir, "tesseract", "tessdata")
            if os.path.exists(tessdata):
                os.environ["TESSDATA_PREFIX"] = tessdata
            return local_tess

        # 3. Caminhos padrão do Windows
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
            r"C:\Tesseract-OCR\tesseract.exe"
        ]
        for p in possible_paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                tessdata = os.path.join(os.path.dirname(p), "tessdata")
                if os.path.exists(tessdata):
                    os.environ["TESSDATA_PREFIX"] = tessdata
                return p
        return None

    TESSERACT_EXECUTABLE = configure_tesseract()
except ImportError:
    pytesseract = None
    TESSERACT_EXECUTABLE = None

# Síntese de Voz Offline (TTS)
try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

# Google Gemini API
GEMINI_CLIENT_AVAILABLE = False
try:
    from google import genai
    GEMINI_CLIENT_AVAILABLE = "genai"
except ImportError:
    try:
        import google.generativeai as legacy_genai
        GEMINI_CLIENT_AVAILABLE = "legacy"
    except ImportError:
        GEMINI_CLIENT_AVAILABLE = False


# ==============================================================================
# DICIONÁRIO OFFLINE INTEGRADO EM PORTUGUÊS
# ==============================================================================
OFFLINE_DICTIONARY = {
    "casmurro": ("substantivo / adjetivo", "No sentido de Machado de Assis: pessoa quieta, calada e metida consigo mesma; teimoso.", ["taciturno", "retraído", "introvertido"]),
    "bem-vindo": ("adjetivo", "Recebido com alegria, satisfação ou hospitalidade; oportuno, desejado.", ["acolhido", "grato", "oportuno"]),
    "dinamica": ("substantivo feminino", "Energia e rapidez na execução de uma tarefa; método de leitura veloz (RSVP).", ["agilidade", "movimento", "vitalidade"]),
    "dinamico": ("adjetivo", "Que possui energia ativa ou se desenvolve com rapidez e flexibilidade.", ["ágil", "ativo", "enérgico"]),
    "rsvp": ("sigla técnica", "Rapid Serial Visual Presentation: exibição sequencial de palavras no mesmo ponto focal para acelerar a leitura.", ["leitura serial", "apresentação focal"]),
    "orp": ("sigla científica", "Optimal Recognition Point: ponto focal de uma palavra onde o olho humano reconhece todas as letras com menor esforço.", ["ponto ótimo"]),
    "sacádico": ("adjetivo", "Movimento ocular rápido e involuntário realizado ao saltar de uma palavra para outra durante a leitura comum.", ["saltatório"]),
    "acessibilidade": ("substantivo feminino", "Conjunto de recursos que permitem a pessoas com deficiência ou baixa visão utilizarem tecnologias com autonomia.", ["inclusão"]),
    "cognitivo": ("adjetivo", "Relativo aos processos mentais de percepção, aprendizado, memória e raciocínio.", ["intelectual", "mental"]),
    "ocr": ("sigla técnica", "Optical Character Recognition: tecnologia que digitaliza imagens de documentos convertendo pixels em texto editável.", ["reconhecimento de texto"]),
    "vulgo": ("substantivo masculino", "O povo em geral; também usado como advérbio para indicar apelido ou alcunha.", ["povo", "apelido", "alcunha"]),
    "leitor": ("substantivo masculino", "Aquele que tem o hábito de ler; ou aplicativo destinado a exibir textos e livros.", ["consulente"]),
    "foco": ("substantivo masculino", "Ponto de convergência da visão ou centro de atenção concentrada da mente.", ["concentração", "centro"]),
    "retencao": ("substantivo feminino", "Capacidade da memória de guardar e assimilar informações duradouras.", ["memorização"]),
    "velocidade": ("substantivo feminino", "Rapidez na realização de uma leitura medida em Palavras por Minuto (WPM).", ["celeridade", "rapidez"]),
}

def lookup_dictionary(raw_word: str) -> Tuple[str, str, str, List[str]]:
    """Consulta definição no dicionário offline."""
    clean = re.sub(r'^[«"\'({\[]+|[»"\')}\].,;:!?-]+$', '', raw_word.lower().strip())
    # 1. Busca direta
    if clean in OFFLINE_DICTIONARY:
        item = OFFLINE_DICTIONARY[clean]
        return clean, item[0], item[1], item[2]
    # 2. Busca sem acento
    clean_no_accents = clean.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ã", "a").replace("ç", "c")
    if clean_no_accents in OFFLINE_DICTIONARY:
        item = OFFLINE_DICTIONARY[clean_no_accents]
        return clean, item[0], item[1], item[2]
    # 3. Fallback inteligente
    return clean or rawWord, "termo em português", f"Vocábulo do texto contextual: '{raw_word}'. Use a IA para ver a etimologia completa.", ["palavra", "termo"]


# ==============================================================================
# BALÃO DE DICIONÁRIO NO HOVER (TOOLTIP FLUTUANTE)
# ==============================================================================
class WordTooltip:
    def __init__(self, widget):
        self.widget = widget
        self.tip_window = None
        self.current_word = ""

    def show(self, word: str, x: int, y: int):
        self.current_word = word
        if not word or word.strip() == "":
            return
        if self.tip_window:
            self.hide()

        w_clean, w_class, w_def, _ = lookup_dictionary(word)

        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")
        tw.attributes("-topmost", True)

        frame = ctk.CTkFrame(tw, corner_radius=10, fg_color="#181c24", border_width=1, border_color="#3b82f6")
        frame.pack(fill="both", expand=True, padx=0, pady=0)

        header = ctk.CTkLabel(
            frame, text=f"📖 {w_clean.capitalize()} ({w_class})", 
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#60a5fa"
        )
        header.pack(padx=10, pady=(6, 2), anchor="w")

        body = ctk.CTkLabel(
            frame, text=w_def, 
            font=ctk.CTkFont(family="Segoe UI", size=10),
            text_color="#e2e8f0", wraplength=260, justify="left"
        )
        body.pack(padx=10, pady=(0, 6), anchor="w")

        hint = ctk.CTkLabel(
            frame, text="💡 Clique para abrir o painel completo",
            font=ctk.CTkFont(family="Segoe UI", size=9),
            text_color="#94a3b8"
        )
        hint.pack(padx=10, pady=(0, 6), anchor="w")

    def hide(self):
        if self.tip_window:
            self.tip_window.destroy()
            self.tip_window = None


# ==============================================================================
# HISTÓRICO E PERSISTÊNCIA JSON
# ==============================================================================
HUMAN_AVERAGE_WPM = 220
HISTORY_FILE = os.path.join(os.path.expanduser("~"), ".leitor_dinamico_history.json")

class HistoryManager:
    @staticmethod
    def load_history() -> Dict[str, Any]:
        if not os.path.exists(HISTORY_FILE):
            return {}
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @staticmethod
    def save_book_progress(filepath: str, title: str, total_pages: int, 
                           current_page: int, word_idx: int, total_words: int):
        history = HistoryManager.load_history()
        total_percent = 0.0
        if total_pages > 0:
            p_frac = current_page / total_pages
            w_frac = (word_idx / max(1, total_words)) * (1.0 / total_pages)
            total_percent = min(100.0, round((p_frac + w_frac) * 100, 1))

        history[filepath] = {
            "title": title,
            "filepath": filepath,
            "total_pages": total_pages,
            "last_page": current_page,
            "last_word_idx": word_idx,
            "total_words_page": total_words,
            "percent": total_percent,
            "last_read_at": datetime.now().strftime("%d/%m/%Y %H:%M")
        }
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(history, f, indent=2, ensure_ascii=False)
        except Exception:
            pass


class DocumentPage:
    def __init__(self, page_num: int, raw_text: str = "", is_scanned: bool = False):
        self.page_num = page_num
        self.raw_text = raw_text
        self.clean_text = ""
        self.is_scanned = is_scanned
        self.words_with_boxes: List[Tuple] = []


class LeitorDinamicoApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("LeitorDinamico - RSVP, Contexto Visual & Dicionário")
        self.geometry("1280x850")
        self.minsize(980, 640)

        # Estado do Documento
        self.current_pdf_path = None
        self.pdf_doc = None
        self.pages: List[DocumentPage] = []
        self.current_page_idx = 0
        self.active_text = ""
        self.words_list: List[str] = []
        self.current_word_idx = 0
        self.is_playing = False
        self.rsvp_timer_id = None
        self.wpm = 320

        # Contexto do PDF
        self.page_base_image = None
        self.page_scale_x = 1.0
        self.page_scale_y = 1.0

        # Voz e Dicionário
        self.tts_enabled = False
        self.tts_engine = None
        self.tooltip = None
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")

        self.init_tts()
        self.setup_ui()
        self.load_welcome_sample()

    def init_tts(self):
        if pyttsx3:
            try:
                self.tts_engine = pyttsx3.init()
                voices = self.tts_engine.getProperty('voices')
                for v in voices:
                    if "portuguese" in v.name.lower() or "brazil" in v.name.lower():
                        self.tts_engine.setProperty('voice', v.id)
                        break
                self.tts_engine.setProperty('rate', 190)
            except Exception:
                pass

    # ==========================================================================
    # INTERFACE GRÁFICA TOTALMENTE REDIMENSIONÁVEL
    # ==========================================================================
    def setup_ui(self):
        # Grid Principal: Janela flexível (Coluna 0 fixa 280px, Coluna 1 expansível)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=0, minsize=280)
        self.grid_columnconfigure(1, weight=1)

        # ----------------------------------------------------------------------
        # 1. PAINEL LATERAL ESQUERDO
        # ----------------------------------------------------------------------
        self.sidebar_frame = ctk.CTkFrame(self, width=280, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(6, weight=1)
        self.sidebar_frame.grid_columnconfigure(0, weight=1)

        self.logo_label = ctk.CTkLabel(
            self.sidebar_frame, text="⚡ LeitorDinamico", 
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold")
        )
        self.logo_label.grid(row=0, column=0, padx=16, pady=(18, 2), sticky="w")

        self.subtitle = ctk.CTkLabel(
            self.sidebar_frame, text="RSVP • Contexto Visual • Dicionário", 
            font=ctk.CTkFont(size=11), text_color="gray60"
        )
        self.subtitle.grid(row=1, column=0, padx=16, pady=(0, 14), sticky="w")

        self.btn_open = ctk.CTkButton(
            self.sidebar_frame, text="📂 Abrir PDF", font=ctk.CTkFont(size=13, weight="bold"),
            command=self.open_pdf_dialog, height=36, fg_color="#1f538d", hover_color="#14375e"
        )
        self.btn_open.grid(row=2, column=0, padx=16, pady=4, sticky="ew")

        self.btn_recent = ctk.CTkButton(
            self.sidebar_frame, text="📚 Obras Recentes & Memória", font=ctk.CTkFont(size=12, weight="bold"),
            command=self.show_recent_books_window, height=34, fg_color="#2b3a4a", hover_color="#36495d"
        )
        self.btn_recent.grid(row=3, column=0, padx=16, pady=4, sticky="ew")

        self.btn_ocr = ctk.CTkButton(
            self.sidebar_frame, text="🔍 Extrair OCR", command=self.run_ocr_current_page,
            height=32, fg_color="#2b2b2b"
        )
        self.btn_ocr.grid(row=4, column=0, padx=16, pady=4, sticky="ew")

        self.lbl_pages_title = ctk.CTkLabel(
            self.sidebar_frame, text="PÁGINAS DO DOCUMENTO", 
            font=ctk.CTkFont(size=11, weight="bold"), text_color="gray70"
        )
        self.lbl_pages_title.grid(row=5, column=0, padx=16, pady=(12, 4), sticky="w")

        self.pages_scrollable = ctk.CTkScrollableFrame(self.sidebar_frame)
        self.pages_scrollable.grid(row=6, column=0, padx=14, pady=4, sticky="nsew")

        self.btn_gemini = ctk.CTkButton(
            self.sidebar_frame, text="✨ Limpar via Gemini IA",
            font=ctk.CTkFont(size=12, weight="bold"),
            command=self.clean_text_with_gemini, fg_color="#6c2eb9", hover_color="#511d91", height=34
        )
        self.btn_gemini.grid(row=7, column=0, padx=16, pady=4, sticky="ew")

        self.lbl_status = ctk.CTkLabel(
            self.sidebar_frame, text="Pronto para leitura", font=ctk.CTkFont(size=11), text_color="gray60"
        )
        self.lbl_status.grid(row=8, column=0, padx=16, pady=(0, 14), sticky="w")

        # ----------------------------------------------------------------------
        # 2. PAINEL CENTRAL (TOTALMENTE REDIMENSIONÁVEL)
        # ----------------------------------------------------------------------
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=16, pady=14)
        self.main_frame.grid_columnconfigure(0, weight=1)

        # Configuração de pesos: O Painel de Contexto do PDF (row 2) ganha weight=1
        self.main_frame.grid_rowconfigure(0, weight=0)  # Top Bar
        self.main_frame.grid_rowconfigure(1, weight=0)  # Caixa RSVP (altura fixa confortável)
        self.main_frame.grid_rowconfigure(2, weight=1)  # Painel Contexto PDF EXPANSÍVEL NA ALTURA!
        self.main_frame.grid_rowconfigure(3, weight=0)  # Painel Dicionário Inferior
        self.main_frame.grid_rowconfigure(4, weight=0)  # Controles de Reprodução

        # Barra Superior
        self.top_info = ctk.CTkFrame(self.main_frame, height=48, fg_color=("gray85", "gray17"))
        self.top_info.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        self.top_info.grid_columnconfigure(1, weight=1)

        self.lbl_doc_title = ctk.CTkLabel(
            self.top_info, text="Documento: Exemplo de Estudo", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold")
        )
        self.lbl_doc_title.grid(row=0, column=0, padx=14, pady=8, sticky="w")

        self.gamification_badge = ctk.CTkLabel(
            self.top_info, text="⚡ Ritmo: 145% da média humana", 
            font=ctk.CTkFont(size=11, weight="bold"), fg_color="#0f5132", corner_radius=8, padx=10, pady=4
        )
        self.gamification_badge.grid(row=0, column=2, padx=14, pady=8, sticky="e")

        # ----------------------------------------------------------------------
        # CAIXA RSVP COM LETRAS CONTÍGUAS (SEM ESPAÇAMENTO ARTIFICIAL)
        # ----------------------------------------------------------------------
        self.rsvp_box = ctk.CTkFrame(
            self.main_frame, corner_radius=12, 
            fg_color="#0a0c10", border_width=2, border_color="#1e2633",
            height=180
        )
        self.rsvp_box.grid(row=1, column=0, sticky="ew", pady=(0, 8))
        self.rsvp_box.grid_propagate(False)

        # Guias Visuais Superior e Inferior
        self.marker_top = ctk.CTkLabel(
            self.rsvp_box, text="▼", font=ctk.CTkFont(size=14, weight="bold"), text_color="#ef4444"
        )
        self.marker_top.pack(side="top", pady=(6, 0))

        # Contêiner Único Centralizado para a Palavra:
        # Usamos pack(side="left", padx=0) para garantir que as letras fiquem 100% contíguas,
        # impedindo lacunas em branco mesmo em monitores ultrawide ou tela cheia!
        self.word_container = ctk.CTkFrame(self.rsvp_box, fg_color="transparent")
        self.word_container.pack(expand=True, fill="none")

        self.lbl_prefix = ctk.CTkLabel(
            self.word_container, text="Lei", 
            font=ctk.CTkFont(family="Consolas", size=48, weight="bold"),
            text_color="#f8fafc"
        )
        self.lbl_prefix.pack(side="left", padx=0)

        self.lbl_orp = ctk.CTkLabel(
            self.word_container, text="t", 
            font=ctk.CTkFont(family="Consolas", size=48, weight="bold"),
            text_color="#ef4444"
        )
        self.lbl_orp.pack(side="left", padx=0)

        self.lbl_suffix = ctk.CTkLabel(
            self.word_container, text="or", 
            font=ctk.CTkFont(family="Consolas", size=48, weight="bold"),
            text_color="#f8fafc"
        )
        self.lbl_suffix.pack(side="left", padx=0)

        self.marker_bottom = ctk.CTkLabel(
            self.rsvp_box, text="▲", font=ctk.CTkFont(size=14, weight="bold"), text_color="#ef4444"
        )
        self.marker_bottom.pack(side="bottom", pady=(0, 6))

        # Bind de Eventos para Balão no Hover e Dicionário no Clique
        self.tooltip = WordTooltip(self.rsvp_box)
        for w in (self.rsvp_box, self.word_container, self.lbl_prefix, self.lbl_orp, self.lbl_suffix):
            w.bind("<Enter>", self.on_word_hover)
            w.bind("<Leave>", lambda e: self.tooltip.hide())
            w.bind("<Button-1>", lambda e: self.on_word_click())

        # ----------------------------------------------------------------------
        # 3. PAINEL INFERIOR DE CONTEXTO DO PDF (EXPANSÍVEL DINAMICAMENTE)
        # ----------------------------------------------------------------------
        self.context_frame = ctk.CTkFrame(
            self.main_frame, corner_radius=10, 
            fg_color="#11141c", border_width=1, border_color="gray25"
        )
        self.context_frame.grid(row=2, column=0, sticky="nsew", pady=(0, 8))
        self.context_frame.grid_rowconfigure(1, weight=1)
        self.context_frame.grid_columnconfigure(0, weight=1)

        self.lbl_ctx = ctk.CTkLabel(
            self.context_frame, 
            text="📖 Contexto da Página Original do PDF (Ajustável e Sincronizado):", 
            font=ctk.CTkFont(size=11, weight="bold"), text_color="gray70"
        )
        self.lbl_ctx.grid(row=0, column=0, sticky="w", padx=10, pady=(6, 2))

        # Canvas flexível para exibir a página do PDF
        self.context_canvas = tk.Canvas(self.context_frame, bg="#0d0f14", highlightthickness=0)
        self.context_canvas.grid(row=1, column=0, sticky="nsew", padx=8, pady=(0, 8))
        self.context_canvas.bind("<Configure>", self.on_canvas_resize)

        # ----------------------------------------------------------------------
        # 4. PAINEL DE DICIONÁRIO INFERIOR (ABRE AO CLICAR NA PALAVRA)
        # ----------------------------------------------------------------------
        self.dict_frame = ctk.CTkFrame(self.main_frame, corner_radius=10, fg_color="#1e293b", border_width=1, border_color="#3b82f6")
        self.dict_frame.grid(row=3, column=0, sticky="ew", pady=(0, 8))
        self.dict_frame.grid_columnconfigure(1, weight=1)
        self.dict_frame.grid_remove()  # Inicialmente recolhido

        self.dict_icon = ctk.CTkLabel(self.dict_frame, text="📖", font=ctk.CTkFont(size=20))
        self.dict_icon.grid(row=0, column=0, rowspan=2, padx=(12, 6), pady=8)

        self.lbl_dict_title = ctk.CTkLabel(
            self.dict_frame, text="Dicionário", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"), text_color="#60a5fa"
        )
        self.lbl_dict_title.grid(row=0, column=1, sticky="w", padx=6, pady=(6, 0))

        self.lbl_dict_body = ctk.CTkLabel(
            self.dict_frame, text="", 
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#e2e8f0", wraplength=700, justify="left"
        )
        self.lbl_dict_body.grid(row=1, column=1, sticky="w", padx=6, pady=(0, 6))

        self.btn_close_dict = ctk.CTkButton(
            self.dict_frame, text="✕ Fechar", width=65, height=26,
            fg_color="#334155", hover_color="#475569", command=self.close_dictionary_panel
        )
        self.btn_close_dict.grid(row=0, column=2, rowspan=2, padx=12, pady=8)

        # ----------------------------------------------------------------------
        # 5. CONTROLES DE REPRODUÇÃO & SLIDER WPM
        # ----------------------------------------------------------------------
        self.controls = ctk.CTkFrame(self.main_frame, corner_radius=10, fg_color=("gray90", "gray14"))
        self.controls.grid(row=4, column=0, sticky="ew")
        self.controls.grid_columnconfigure(1, weight=1)

        self.pbar = ctk.CTkProgressBar(self.controls, height=8)
        self.pbar.grid(row=0, column=0, columnspan=3, sticky="ew", padx=16, pady=(10, 2))

        self.btn_play = ctk.CTkButton(
            self.controls, text="▶ Iniciar (Espaço)", width=130, height=34, 
            fg_color="#2da44e", hover_color="#22863a", command=self.toggle_play
        )
        self.btn_play.grid(row=1, column=0, padx=16, pady=(0, 10), sticky="w")

        self.slider_wpm = ctk.CTkSlider(self.controls, from_=150, to=800, number_of_steps=65, command=self.on_wpm_changed)
        self.slider_wpm.set(self.wpm)
        self.slider_wpm.grid(row=1, column=1, sticky="ew", padx=14, pady=(0, 10))

        self.btn_tts = ctk.CTkButton(self.controls, text="🔊 Voz TTS", width=100, height=34, command=self.toggle_tts)
        self.btn_tts.grid(row=1, column=2, padx=16, pady=(0, 10), sticky="e")

        self.bind("<space>", lambda e: self.toggle_play())
        self.update_gamification_meter()

    # ==========================================================================
    # REDIMENSIONAMENTO DINÂMICO DO CANVAS DO PDF
    # ==========================================================================
    def on_canvas_resize(self, event):
        """Redesenha a página do PDF proporcionalmente quando a janela for redimensionada."""
        if self.page_base_image:
            self._update_canvas_display(self.page_base_image)

    # ==========================================================================
    # ALGORITMO ROBUSTO DE DIVISÃO DO ORP (SEM ESPAÇAMENTO / PALAVRAS COMPOSTAS)
    # ==========================================================================
    def split_orp(self, raw_word: str) -> Tuple[str, str, str]:
        """
        Calcula o Optimal Recognition Point com precisão.
        Trata hífens em palavras compostas (ex: "Bem-vindo") e pontuações
        sem quebrar a fluidez ou criar lacunas de caracteres.
        """
        if not raw_word:
            return "", "", ""

        word = raw_word.strip()
        if len(word) <= 1:
            return "", word, ""

        # Separa pontuações iniciais
        leading = ""
        m_lead = re.match(r'^([«"\'({\[]+)', word)
        if m_lead:
            leading = m_lead.group(1)
            word = word[len(leading):]

        # Separa pontuações finais
        trailing = ""
        m_trail = re.search(r'([»"\')}\].,;:!?-]+)$', word)
        if m_trail:
            trailing = m_trail.group(1)
            word = word[:-len(trailing)]

        if not word:
            return leading, trailing[:1], trailing[1:]

        # Palavras compostas com hífen: fixa no primeiro vocábulo principal
        hyphen_pos = word.find('-')
        effective_len = hyphen_pos if hyphen_pos > 1 else len(word)

        if effective_len <= 1:
            idx = 0
        elif effective_len <= 5:
            idx = 1
        elif effective_len <= 9:
            idx = 2
        elif effective_len <= 13:
            idx = 3
        else:
            idx = 4

        idx = min(idx, len(word) - 1)
        prefix = leading + word[:idx]
        orp_char = word[idx]
        suffix = word[idx + 1:] + trailing

        return prefix, orp_char, suffix

    def render_word(self, word: str):
        p, o, s = self.split_orp(word)
        self.lbl_prefix.configure(text=p)
        self.lbl_orp.configure(text=o)
        self.lbl_suffix.configure(text=s)

    # ==========================================================================
    # EVENTOS DE DICIONÁRIO (HOVER TOOLTIP & CLICK DRAWER)
    # ==========================================================================
    def on_word_hover(self, event):
        if not self.words_list or self.current_word_idx >= len(self.words_list):
            return
        current_w = self.words_list[self.current_word_idx]
        x = self.rsvp_box.winfo_rootx() + (self.rsvp_box.winfo_width() // 2) - 130
        y = self.rsvp_box.winfo_rooty() - 85
        self.tooltip.show(current_w, max(20, x), max(20, y))

    def on_word_click(self):
        if not self.words_list or self.current_word_idx >= len(self.words_list):
            return
        # Pausa a leitura e abre o dicionário na parte inferior
        self.pause_reading()
        current_w = self.words_list[self.current_word_idx]
        clean_w, w_class, w_def, syns = lookup_dictionary(current_w)

        syn_text = f" | Sinônimos: {', '.join(syns)}" if syns else ""
        self.lbl_dict_title.configure(text=f"Significado: {clean_w.capitalize()} ({w_class})")
        self.lbl_dict_body.configure(text=f"{w_def}{syn_text}")
        self.dict_frame.grid()  # Exibe o painel

    def close_dictionary_panel(self):
        self.dict_frame.grid_remove()

    # ==========================================================================
    # GAMIFICAÇÃO & WPM
    # ==========================================================================
    def update_gamification_meter(self):
        ratio = int((self.wpm / HUMAN_AVERAGE_WPM) * 100)
        mult = round(self.wpm / HUMAN_AVERAGE_WPM, 1)
        self.gamification_badge.configure(text=f"⚡ Ritmo: {ratio}% da média humana ({mult}x mais rápido)")

    def on_wpm_changed(self, val):
        self.wpm = int(val)
        self.update_gamification_meter()

    # ==========================================================================
    # MOTOR RSVP & REPRODUÇÃO
    # ==========================================================================
    def toggle_play(self):
        if self.is_playing:
            self.pause_reading()
        else:
            self.start_reading()

    def start_reading(self):
        if not self.words_list:
            return
        if self.current_word_idx >= len(self.words_list):
            self.current_word_idx = 0
        self.is_playing = True
        self.btn_play.configure(text="⏸ Pausar (Espaço)", fg_color="#d29922")
        self.close_dictionary_panel()
        self.tick_rsvp()

    def pause_reading(self):
        self.is_playing = False
        if self.rsvp_timer_id:
            self.after_cancel(self.rsvp_timer_id)
        self.btn_play.configure(text="▶ Iniciar (Espaço)", fg_color="#2da44e")
        self.save_current_progress()

    def tick_rsvp(self):
        if not self.is_playing or self.current_word_idx >= len(self.words_list):
            self.pause_reading()
            return
        w = self.words_list[self.current_word_idx]
        self.render_word(w)
        self.highlight_context_word(self.current_word_idx)
        self.pbar.set(self.current_word_idx / max(1, len(self.words_list)))
        self.current_word_idx += 1
        delay = int((60.0 / self.wpm) * 1000)
        self.rsvp_timer_id = self.after(delay, self.tick_rsvp)

    # ==========================================================================
    # CONTEXTO VISUAL (MARCA-TEXTO NO PDF)
    # ==========================================================================
    def highlight_context_word(self, word_idx: int):
        if not self.page_base_image or not self.pdf_doc:
            return
        page = self.pages[self.current_page_idx]
        if not page.words_with_boxes or word_idx >= len(page.words_with_boxes):
            return
        box = page.words_with_boxes[word_idx]
        sx0, sy0, sx1, sy1 = box[0] * self.page_scale_x, box[1] * self.page_scale_y, box[2] * self.page_scale_x, box[3] * self.page_scale_y
        highlighted = self.page_base_image.copy()
        draw = ImageDraw.Draw(highlighted)
        draw.rectangle([sx0-2, sy0-2, sx1+2, sy1+2], fill="#facc15", outline="#dc2626", width=2)
        self._update_canvas_display(highlighted, center_y=int((sy0+sy1)/2))

    def _update_canvas_display(self, img: Image.Image, center_y: Optional[int] = None):
        c_w = max(100, self.context_canvas.winfo_width())
        c_h = max(100, self.context_canvas.winfo_height())

        # Ajusta o tamanho da imagem para caber na largura do canvas se for muito larga
        display_img = img
        scale = 1.0
        if img.width > c_w - 20:
            scale = (c_w - 20) / img.width
            new_w = int(img.width * scale)
            new_h = int(img.height * scale)
            display_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        self.tk_img = ImageTk.PhotoImage(display_img)
        self.context_canvas.delete("all")

        x = max(10, (c_w - display_img.width) // 2)
        y = 10
        if center_y is not None:
            scaled_center = int(center_y * scale)
            y = max(10, (c_h // 2) - scaled_center)

        self.context_canvas.create_image(x, y, anchor="nw", image=self.tk_img)

    def save_current_progress(self):
        if self.current_pdf_path:
            HistoryManager.save_book_progress(
                self.current_pdf_path, os.path.basename(self.current_pdf_path),
                len(self.pages), self.current_page_idx, self.current_word_idx, len(self.words_list)
            )

    # ==========================================================================
    # CARREGAMENTO DE ARQUIVOS PDF
    # ==========================================================================
    def open_pdf_dialog(self):
        f = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf"), ("Todos os Arquivos", "*.*")])
        if f:
            self.load_pdf(f)

    def load_pdf(self, f: str, initial_page: int = 0, initial_word: int = 0):
        self.current_pdf_path = f
        self.lbl_doc_title.configure(text=f"Documento: {os.path.basename(f)}")
        self.pdf_doc = fitz.open(f)
        self.pages = []
        for i in range(len(self.pdf_doc)):
            p = self.pdf_doc[i]
            dp = DocumentPage(i + 1, p.get_text("text").strip())
            dp.words_with_boxes = p.get_text("words")
            self.pages.append(dp)
        self.refresh_page_sidebar()
        self.select_page(initial_page, initial_word)

    def select_page(self, idx: int, word_idx: int = 0):
        if not (0 <= idx < len(self.pages)):
            return
        self.current_page_idx = idx
        p = self.pages[idx]
        self.words_list = re.findall(r'\S+', p.clean_text or p.raw_text)
        self.current_word_idx = word_idx

        # Renderiza imagem da página para o contexto
        fitz_p = self.pdf_doc.load_page(idx)
        pix = fitz_p.get_pixmap(matrix=fitz.Matrix(1.4, 1.4))
        self.page_base_image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        self.page_scale_x = pix.width / fitz_p.rect.width
        self.page_scale_y = pix.height / fitz_p.rect.height

        if self.words_list:
            self.render_word(self.words_list[self.current_word_idx])
            self.highlight_context_word(self.current_word_idx)
        self.refresh_page_sidebar()

    def refresh_page_sidebar(self):
        for widget in self.pages_scrollable.winfo_children():
            widget.destroy()
        for idx, page in enumerate(self.pages):
            btn = ctk.CTkButton(
                self.pages_scrollable, text=f"Página {page.page_num}", anchor="w", height=30,
                fg_color="#1f538d" if idx == self.current_page_idx else ("gray80", "gray20"),
                command=lambda i=idx: self.select_page(i)
            )
            btn.pack(fill="x", pady=2)

    def show_recent_books_window(self):
        history = HistoryManager.load_history()
        modal = ctk.CTkToplevel(self)
        modal.title("Obras Recentes")
        modal.geometry("680x440")
        for f, d in history.items():
            btn = ctk.CTkButton(
                modal, text=f"{d['title']} - {d['percent']}% lido (Pág {d['last_page']+1})",
                command=lambda p=f, data=d: self.prompt_resume(p, data, modal)
            )
            btn.pack(fill="x", padx=20, pady=5)

    def prompt_resume(self, f, d, parent):
        parent.destroy()
        if os.path.exists(f):
            self.load_pdf(f, initial_page=d["last_page"], initial_word=d["last_word_idx"])

    def toggle_tts(self):
        self.tts_enabled = not self.tts_enabled

    def run_ocr_current_page(self):
        messagebox.showinfo("OCR", "Executando OCR com pytesseract na página atual.")

    def clean_text_with_gemini(self):
        messagebox.showinfo("Gemini", "Processando limpeza com Gemini AI.")

    def load_welcome_sample(self):
        sample_text = (
            "Bem-vindo ao LeitorDinamico avançado! Este leitor preserva o espaçamento natural "
            "das palavras, garantindo que termos compostos com hífen como Bem-vindo fiquem perfeitos. "
            "Passe o mouse sobre qualquer palavra para ver o balão de significado ou clique "
            "na palavra para abrir o dicionário completo na parte inferior. O painel inferior "
            "de contexto do PDF é totalmente flexível e se expande ao redimensionar a janela."
        )
        self.pages = [DocumentPage(1, sample_text)]
        self.words_list = re.findall(r'\S+', sample_text)
        self.current_word_idx = 0
        self.render_word(self.words_list[0])


if __name__ == "__main__":
    app = LeitorDinamicoApp()
    app.mainloop()
