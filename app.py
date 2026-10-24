"""
================================================================================
          LEITOR DINÂMICO - RSVP, ACESSIBILIDADE & ESTUDO AVANÇADO
================================================================================
Aplicativo Desktop Windows com CustomTkinter, PyMuPDF (fitz), Pillow e OCR.

Novos Recursos Integrados:
1. Gerenciador de Múltiplas Obras e Memória Local de Progresso (JSON).
2. Opções Inteligentes de Retomada (Continuar de onde parou, último parágrafo,
   última página ou início).
3. Painel Inferior de Contexto ("Meia Página" Visual): Renderiza a página real
   do PDF e destaca graficamente com caixa luminosa a palavra correspondente
   ao leitor RSVP em tempo real!
4. Indicador Gamificado de Velocidade Relativa (comparado aos 220 WPM médios).
5. Síntese de Voz Offline (pyttsx3) e Limpeza/Estruturação com Gemini AI.
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

# Bibliotecas Gráficas
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

        # 2. Se estiver em pasta "tesseract" adjacente ao executável/script (Modo Portátil Nativo)
        base_dir = os.path.dirname(sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(__file__))
        local_tess = os.path.join(base_dir, "tesseract", "tesseract.exe")
        if os.path.exists(local_tess):
            pytesseract.pytesseract.tesseract_cmd = local_tess
            tessdata = os.path.join(base_dir, "tesseract", "tessdata")
            if os.path.exists(tessdata):
                os.environ["TESSDATA_PREFIX"] = tessdata
            return local_tess

        # 3. Caminhos padrão de instalação no Windows
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
# CONSTANTES E CONFIGURAÇÕES
# ==============================================================================
HUMAN_AVERAGE_WPM = 220  # Velocidade média humana de leitura silenciosa
HISTORY_FILE = os.path.join(os.path.expanduser("~"), ".leitor_dinamico_history.json")

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")
FONT_FAMILY = "Segoe UI"


class HistoryManager:
    """Gerencia a persistência local do histórico de livros e progresso em JSON."""
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
        
        # Calcula porcentagem total da obra
        if total_pages > 0:
            page_fraction = (current_page) / total_pages
            word_fraction = (word_idx / max(1, total_words)) * (1.0 / total_pages)
            total_percent = min(100.0, round((page_fraction + word_fraction) * 100, 1))
        else:
            total_percent = 0.0

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
        except Exception as e:
            print(f"Aviso ao salvar histórico: {e}")


class DocumentPage:
    def __init__(self, page_num: int, raw_text: str = "", is_scanned: bool = False):
        self.page_num = page_num
        self.raw_text = raw_text
        self.clean_text = ""
        self.is_scanned = is_scanned
        # Armazena palavras com coordenadas (x0, y0, x1, y1, palavra, block, line, word_no)
        self.words_with_boxes: List[Tuple] = []


class LeitorDinamicoApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("LeitorDinamico - RSVP, Contexto Visual & Memória de Leitura")
        self.geometry("1260x860")
        self.minsize(1050, 720)

        # Estado do Documento
        self.current_pdf_path: Optional[str] = None
        self.pdf_doc: Optional[fitz.Document] = None
        self.pages: List[DocumentPage] = []
        self.current_page_idx = 0
        
        # Estado do Motor RSVP
        self.active_text = ""
        self.words_list: List[str] = []
        self.current_word_idx = 0
        self.is_playing = False
        self.rsvp_timer_id = None
        self.wpm = 320
        
        # Estado do Painel de Contexto ("Meia Página")
        self.page_base_image: Optional[Image.Image] = None
        self.page_scale_x = 1.0
        self.page_scale_y = 1.0
        self.show_context_panel = True

        # TTS e Gemini
        self.tts_enabled = False
        self.tts_engine = None
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.init_tts()

        # Interface
        self.setup_ui()
        self.load_welcome_sample()

    def init_tts(self):
        if pyttsx3:
            try:
                self.tts_engine = pyttsx3.init()
                voices = self.tts_engine.getProperty('voices')
                for v in voices:
                    if "portuguese" in v.name.lower() or "brazil" in v.name.lower() or "maria" in v.name.lower():
                        self.tts_engine.setProperty('voice', v.id)
                        break
                self.tts_engine.setProperty('rate', 190)
                self.tts_engine.setProperty('volume', 1.0)
            except Exception as e:
                print(f"Aviso TTS: {e}")

    # ==========================================================================
    # INTERFACE GRÁFICA
    # ==========================================================================
    def setup_ui(self):
        self.grid_columnconfigure(0, weight=0, minsize=290)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # ----------------------------------------------------------------------
        # PAINEL LATERAL ESQUERDO
        # ----------------------------------------------------------------------
        self.sidebar_frame = ctk.CTkFrame(self, width=290, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(6, weight=1)
        self.sidebar_frame.grid_columnconfigure(0, weight=1)

        # Cabeçalho
        self.logo_label = ctk.CTkLabel(
            self.sidebar_frame, 
            text="⚡ LeitorDinamico", 
            font=ctk.CTkFont(family=FONT_FAMILY, size=20, weight="bold")
        )
        self.logo_label.grid(row=0, column=0, padx=16, pady=(18, 2), sticky="w")

        self.subtitle = ctk.CTkLabel(
            self.sidebar_frame, 
            text="RSVP • Contexto Visual • Memória", 
            font=ctk.CTkFont(family=FONT_FAMILY, size=11), text_color="gray60"
        )
        self.subtitle.grid(row=1, column=0, padx=16, pady=(0, 14), sticky="w")

        # Botão Abrir PDF
        self.btn_open = ctk.CTkButton(
            self.sidebar_frame, text="📂 Abrir PDF",
            font=ctk.CTkFont(family=FONT_FAMILY, size=13, weight="bold"),
            command=self.open_pdf_dialog, height=36, fg_color="#1f538d", hover_color="#14375e"
        )
        self.btn_open.grid(row=2, column=0, padx=16, pady=4, sticky="ew")

        # Botão Obras Recentes (Histórico / Progresso)
        self.btn_recent_books = ctk.CTkButton(
            self.sidebar_frame, text="📚 Obras Recentes & Memória",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12, weight="bold"),
            command=self.show_recent_books_window, height=34, fg_color="#2b3a4a", hover_color="#36495d"
        )
        self.btn_recent_books.grid(row=3, column=0, padx=16, pady=4, sticky="ew")

        # Botão OCR
        self.btn_ocr = ctk.CTkButton(
            self.sidebar_frame, text="🔍 Extrair OCR da Página",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12),
            command=self.run_ocr_current_page, height=32, fg_color="#2b2b2b"
        )
        self.btn_ocr.grid(row=4, column=0, padx=16, pady=4, sticky="ew")

        # Título da Lista de Páginas
        self.lbl_pages_title = ctk.CTkLabel(
            self.sidebar_frame, text="PÁGINAS DO DOCUMENTO", 
            font=ctk.CTkFont(family=FONT_FAMILY, size=11, weight="bold"), text_color="gray70"
        )
        self.lbl_pages_title.grid(row=5, column=0, padx=16, pady=(12, 4), sticky="w")

        # Scrollable de Páginas
        self.pages_scrollable = ctk.CTkScrollableFrame(self.sidebar_frame, label_text="")
        self.pages_scrollable.grid(row=6, column=0, padx=14, pady=4, sticky="nsew")

        # Botão Gemini IA
        self.btn_gemini = ctk.CTkButton(
            self.sidebar_frame, text="✨ Limpar via Gemini IA",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12, weight="bold"),
            command=self.clean_text_with_gemini, fg_color="#6c2eb9", hover_color="#511d91", height=34
        )
        self.btn_gemini.grid(row=7, column=0, padx=16, pady=6, sticky="ew")

        # Status
        self.lbl_status = ctk.CTkLabel(
            self.sidebar_frame, text="Pronto para leitura",
            font=ctk.CTkFont(family=FONT_FAMILY, size=11), text_color="gray60", anchor="w"
        )
        self.lbl_status.grid(row=8, column=0, padx=16, pady=(0, 14), sticky="ew")

        # ----------------------------------------------------------------------
        # PAINEL CENTRAL (DIVIDIDO EM: TOP BAR, ÁREA RSVP, CONTROLES & CONTEXTO)
        # ----------------------------------------------------------------------
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=16, pady=14)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(2, weight=1)  # Área de Contexto ganha peso

        # 1. Barra Superior: Título da Obra & Gamificação WPM
        self.top_info = ctk.CTkFrame(self.main_frame, height=50, fg_color=("gray85", "gray17"))
        self.top_info.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        self.top_info.grid_columnconfigure(1, weight=1)

        self.lbl_doc_title = ctk.CTkLabel(
            self.top_info, text="Documento: Exemplo de Estudo", 
            font=ctk.CTkFont(family=FONT_FAMILY, size=13, weight="bold")
        )
        self.lbl_doc_title.grid(row=0, column=0, padx=14, pady=8, sticky="w")

        # Badge de Gamificação WPM
        self.gamification_badge = ctk.CTkLabel(
            self.top_info,
            text="⚡ Ritmo: 145% da média humana (1.5x mais rápido)",
            font=ctk.CTkFont(family=FONT_FAMILY, size=11, weight="bold"),
            fg_color="#0f5132",
            text_color="#d1e7dd",
            corner_radius=8,
            padx=10,
            pady=4
        )
        self.gamification_badge.grid(row=0, column=2, padx=14, pady=8, sticky="e")

        # 2. Área Central RSVP (Focalização ORP)
        self.rsvp_box = ctk.CTkFrame(
            self.main_frame, corner_radius=12, 
            fg_color="#0a0c10", border_width=2, border_color="#1e2633",
            height=200
        )
        self.rsvp_box.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        self.rsvp_box.grid_rowconfigure(1, weight=1)
        self.rsvp_box.grid_columnconfigure((0, 1, 2), weight=1)

        self.marker_top = ctk.CTkLabel(
            self.rsvp_box, text="▼", font=ctk.CTkFont(size=14, weight="bold"), text_color="#ef4444"
        )
        self.marker_top.grid(row=0, column=1, pady=(6, 0))

        self.lbl_prefix = ctk.CTkLabel(
            self.rsvp_box, text="Lei", font=ctk.CTkFont(family="Consolas", size=48, weight="bold"), anchor="e"
        )
        self.lbl_prefix.grid(row=1, column=0, sticky="e")

        self.lbl_orp = ctk.CTkLabel(
            self.rsvp_box, text="t", font=ctk.CTkFont(family="Consolas", size=48, weight="bold"), 
            text_color="#ef4444", anchor="center"
        )
        self.lbl_orp.grid(row=1, column=1, sticky="nsew")

        self.lbl_suffix = ctk.CTkLabel(
            self.rsvp_box, text="or", font=ctk.CTkFont(family="Consolas", size=48, weight="bold"), anchor="w"
        )
        self.lbl_suffix.grid(row=1, column=2, sticky="w")

        self.marker_bottom = ctk.CTkLabel(
            self.rsvp_box, text="▲", font=ctk.CTkFont(size=14, weight="bold"), text_color="#ef4444"
        )
        self.marker_bottom.grid(row=2, column=1, pady=(0, 6))

        # 3. Painel Inferior de Contexto ("Meia Página" Visual do PDF)
        self.context_frame = ctk.CTkFrame(self.main_frame, corner_radius=10, fg_color=("gray90", "#11141c"), border_width=1, border_color="gray25")
        self.context_frame.grid(row=2, column=0, sticky="nsew", pady=(0, 10))
        self.context_frame.grid_rowconfigure(1, weight=1)
        self.context_frame.grid_columnconfigure(0, weight=1)

        # Cabeçalho do Contexto
        self.context_header = ctk.CTkFrame(self.context_frame, height=28, fg_color="transparent")
        self.context_header.grid(row=0, column=0, sticky="ew", padx=10, pady=(6, 2))
        
        self.lbl_context_title = ctk.CTkLabel(
            self.context_header,
            text="📖 Contexto da Página Original (Acompanhamento em Tempo Real):",
            font=ctk.CTkFont(family=FONT_FAMILY, size=11, weight="bold"),
            text_color="gray70"
        )
        self.lbl_context_title.pack(side="left")

        # Canvas para exibir a imagem da página com destaque
        self.context_canvas = tk.Canvas(
            self.context_frame, bg="#0d0f14", highlightthickness=0
        )
        self.context_canvas.grid(row=1, column=0, sticky="nsew", padx=8, pady=(0, 8))

        # 4. Barra de Controles de Reprodução e WPM
        self.controls = ctk.CTkFrame(self.main_frame, corner_radius=10, fg_color=("gray90", "gray14"))
        self.controls.grid(row=3, column=0, sticky="ew")
        self.controls.grid_columnconfigure(1, weight=1)

        # Barra de Progresso
        self.pbar = ctk.CTkProgressBar(self.controls, height=8)
        self.pbar.grid(row=0, column=0, columnspan=3, sticky="ew", padx=16, pady=(10, 2))
        self.pbar.set(0)

        self.lbl_progress = ctk.CTkLabel(
            self.controls, text="Palavra 0 de 0 (0%)",
            font=ctk.CTkFont(family=FONT_FAMILY, size=10), text_color="gray60"
        )
        self.lbl_progress.grid(row=1, column=0, columnspan=3, padx=16, pady=(0, 6), sticky="w")

        # Botões
        self.btn_box = ctk.CTkFrame(self.controls, fg_color="transparent")
        self.btn_box.grid(row=2, column=0, padx=16, pady=(0, 12), sticky="w")

        self.btn_rewind = ctk.CTkButton(self.btn_box, text="⏮ -10", width=55, height=34, command=lambda: self.seek_relative(-10))
        self.btn_rewind.pack(side="left", padx=(0, 4))

        self.btn_play = ctk.CTkButton(
            self.btn_box, text="▶ Iniciar (Espaço)", width=130, height=34,
            font=ctk.CTkFont(family=FONT_FAMILY, size=12, weight="bold"),
            fg_color="#2da44e", hover_color="#22863a", command=self.toggle_play
        )
        self.btn_play.pack(side="left", padx=4)

        self.btn_stop = ctk.CTkButton(self.btn_box, text="⏹ Parar", width=65, height=34, fg_color="#cf222e", command=self.stop_reading)
        self.btn_stop.pack(side="left", padx=4)

        self.btn_forward = ctk.CTkButton(self.btn_box, text="+10 ⏭", width=55, height=34, command=lambda: self.seek_relative(10))
        self.btn_forward.pack(side="left", padx=4)

        # Slider WPM
        self.wpm_box = ctk.CTkFrame(self.controls, fg_color="transparent")
        self.wpm_box.grid(row=2, column=1, padx=14, pady=(0, 12), sticky="ew")
        self.wpm_box.grid_columnconfigure(1, weight=1)

        self.lbl_wpm_label = ctk.CTkLabel(self.wpm_box, text="Velocidade:", font=ctk.CTkFont(size=11))
        self.lbl_wpm_label.grid(row=0, column=0, padx=(0, 6))

        self.slider_wpm = ctk.CTkSlider(self.wpm_box, from_=150, to=800, number_of_steps=65, command=self.on_wpm_changed)
        self.slider_wpm.set(self.wpm)
        self.slider_wpm.grid(row=0, column=1, sticky="ew")

        self.lbl_wpm_val = ctk.CTkLabel(
            self.wpm_box, text=f"{self.wpm} WPM", 
            font=ctk.CTkFont(size=12, weight="bold"), width=70
        )
        self.lbl_wpm_val.grid(row=0, column=2, padx=(6, 0))

        # Botão TTS
        self.btn_tts = ctk.CTkButton(
            self.controls, text="🔊 Voz TTS", width=100, height=34,
            fg_color="#343a40", hover_color="#495057", command=self.toggle_tts
        )
        self.btn_tts.grid(row=2, column=2, padx=16, pady=(0, 12), sticky="e")

        # Atalhos
        self.bind("<space>", lambda event: self.toggle_play())
        self.bind("<Left>", lambda event: self.seek_relative(-5))
        self.bind("<Right>", lambda event: self.seek_relative(5))

        self.update_gamification_meter()

    # ==========================================================================
    # GAMIFICAÇÃO DE VELOCIDADE WPM (COMPARATIVO COM 220 WPM)
    # ==========================================================================
    def update_gamification_meter(self):
        ratio = (self.wpm / HUMAN_AVERAGE_WPM) * 100
        mult = round(self.wpm / HUMAN_AVERAGE_WPM, 1)

        if self.wpm < 200:
            badge_text = f"📖 Estudo Profundo ({int(ratio)}% da média humana)"
            fg = "#495057"
        elif self.wpm <= 260:
            badge_text = f"🚶 Ritmo Humano Padrão ({int(ratio)}% • ~1.0x)"
            fg = "#0d6efd"
        elif self.wpm <= 380:
            badge_text = f"⚡ Leitor Dinâmico Avançado ({int(ratio)}% • {mult}x mais rápido)"
            fg = "#198754"
        elif self.wpm <= 550:
            badge_text = f"🚀 Super Leitor ({int(ratio)}% • {mult}x mais rápido!)"
            fg = "#d63384"
        else:
            badge_text = f"🧠 Hiperfoco Quântico ({int(ratio)}% • {mult}x supersônico!)"
            fg = "#fd7e14"

        self.gamification_badge.configure(text=badge_text, fg_color=fg)

    def on_wpm_changed(self, val):
        self.wpm = int(val)
        self.lbl_wpm_val.configure(text=f"{self.wpm} WPM")
        self.update_gamification_meter()

    # ==========================================================================
    # GERENCIAMENTO DE MÚLTIPLAS OBRAS & OPÇÕES DE RETOMADA
    # ==========================================================================
    def show_recent_books_window(self):
        """Abre janela com a lista de obras recentes e seu progresso."""
        history = HistoryManager.load_history()
        modal = ctk.CTkToplevel(self)
        modal.title("Obras Recentes & Memória de Leitura")
        modal.geometry("760x520")
        modal.transient(self)

        lbl = ctk.CTkLabel(
            modal, text="📚 Suas Obras & Histórico de Leitura", 
            font=ctk.CTkFont(family=FONT_FAMILY, size=16, weight="bold")
        )
        lbl.pack(padx=20, pady=(16, 8), anchor="w")

        if not history:
            no_docs = ctk.CTkLabel(
                modal, text="Nenhum PDF lido recentemente. Abra um arquivo para registrar seu progresso!",
                font=ctk.CTkFont(family=FONT_FAMILY, size=12), text_color="gray60"
            )
            no_docs.pack(padx=20, pady=40)
            return

        scroll = ctk.CTkScrollableFrame(modal)
        scroll.pack(fill="both", expand=True, padx=20, pady=(0, 16))

        for filepath, data in sorted(history.items(), key=lambda x: x[1].get("last_read_at", ""), reverse=True):
            card = ctk.CTkFrame(scroll, fg_color=("gray85", "gray20"), corner_radius=8)
            card.pack(fill="x", pady=5, padx=5)

            info_col = ctk.CTkFrame(card, fg_color="transparent")
            info_col.pack(side="left", fill="both", expand=True, padx=12, pady=10)

            title_lbl = ctk.CTkLabel(
                info_col, text=data.get("title", os.path.basename(filepath)),
                font=ctk.CTkFont(family=FONT_FAMILY, size=13, weight="bold"), anchor="w"
            )
            title_lbl.pack(fill="x")

            det = f"Última leitura: {data.get('last_read_at', 'Recente')} • Página {data.get('last_page', 0)+1} de {data.get('total_pages', 1)} • Progresso: {data.get('percent', 0)}%"
            det_lbl = ctk.CTkLabel(
                info_col, text=det, font=ctk.CTkFont(family=FONT_FAMILY, size=11), text_color="gray60", anchor="w"
            )
            det_lbl.pack(fill="x")

            btn_open_history = ctk.CTkButton(
                card, text="Abrir / Retomar", width=120, height=32,
                command=lambda p=filepath, d=data: self.prompt_resume_dialog(p, d, modal)
            )
            btn_open_history.pack(side="right", padx=12, pady=10)

    def prompt_resume_dialog(self, filepath: str, data: Dict[str, Any], parent_modal: Optional[ctk.CTkToplevel] = None):
        """Modal de Retomada Inteligente com 4 opções."""
        if parent_modal:
            parent_modal.destroy()

        if not os.path.exists(filepath):
            messagebox.showerror("Arquivo não encontrado", f"O arquivo não existe mais no caminho:\n{filepath}")
            return

        resume_win = ctk.CTkToplevel(self)
        resume_win.title("Opções de Retomada")
        resume_win.geometry("520x360")
        resume_win.transient(self)

        last_p = data.get("last_page", 0) + 1
        pct = data.get("percent", 0)
        word_idx = data.get("last_word_idx", 0)

        lbl = ctk.CTkLabel(
            resume_win, text=f"📖 {data.get('title', 'Documento')}", 
            font=ctk.CTkFont(family=FONT_FAMILY, size=14, weight="bold")
        )
        lbl.pack(padx=20, pady=(16, 4), anchor="w")

        info_lbl = ctk.CTkLabel(
            resume_win, 
            text=f"Você já leu {pct}% desta obra (Página {last_p}, Palavra {word_idx}).\nComo deseja retomar?",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12), text_color="gray70", justify="left"
        )
        info_lbl.pack(padx=20, pady=(0, 16), anchor="w")

        # Opção 1: Continuar de onde parei (exata palavra e página)
        btn1 = ctk.CTkButton(
            resume_win, text="🎯 Continuar Exatamente de Onde Parei",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12, weight="bold"),
            fg_color="#198754", hover_color="#146c43", height=38,
            command=lambda: self._execute_resume(filepath, data["last_page"], data["last_word_idx"], resume_win)
        )
        btn1.pack(fill="x", padx=24, pady=4)

        # Opção 2: Reiniciar do último parágrafo
        btn2 = ctk.CTkButton(
            resume_win, text="📑 Reiniciar do Último Parágrafo",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12),
            height=34,
            command=lambda: self._execute_resume(filepath, data["last_page"], max(0, data["last_word_idx"] - 30), resume_win)
        )
        btn2.pack(fill="x", padx=24, pady=4)

        # Opção 3: Reiniciar da última página
        btn3 = ctk.CTkButton(
            resume_win, text="📄 Reiniciar da Última Página (do início dela)",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12),
            height=34,
            command=lambda: self._execute_resume(filepath, data["last_page"], 0, resume_win)
        )
        btn3.pack(fill="x", padx=24, pady=4)

        # Opção 4: Reiniciar do início da obra
        btn4 = ctk.CTkButton(
            resume_win, text="🔄 Reiniciar do Início da Obra (Página 1)",
            font=ctk.CTkFont(family=FONT_FAMILY, size=12),
            fg_color="#495057", hover_color="#343a40", height=34,
            command=lambda: self._execute_resume(filepath, 0, 0, resume_win)
        )
        btn4.pack(fill="x", padx=24, pady=4)

    def _execute_resume(self, filepath: str, page_idx: int, word_idx: int, modal: ctk.CTkToplevel):
        modal.destroy()
        self.load_pdf_from_path(filepath, initial_page=page_idx, initial_word=word_idx)

    # ==========================================================================
    # CARREGAMENTO DE PDF & RENDERIZAÇÃO DE CONTEXTO
    # ==========================================================================
    def open_pdf_dialog(self):
        f = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf"), ("Todos os Arquivos", "*.*")])
        if not f:
            return

        # Verifica se já temos histórico salvo deste PDF para sugerir retomada
        history = HistoryManager.load_history()
        if f in history:
            self.prompt_resume_dialog(f, history[f])
        else:
            self.load_pdf_from_path(f, initial_page=0, initial_word=0)

    def load_pdf_from_path(self, filepath: str, initial_page: int = 0, initial_word: int = 0):
        self.current_pdf_path = filepath
        filename = os.path.basename(filepath)
        self.lbl_doc_title.configure(text=f"Documento: {filename}")
        self.lbl_status.configure(text="Carregando páginas e contexto visual...")

        threading.Thread(
            target=self._load_pdf_worker, 
            args=(filepath, initial_page, initial_word), 
            daemon=True
        ).start()

    def _load_pdf_worker(self, filepath: str, initial_page: int, initial_word: int):
        try:
            doc = fitz.open(filepath)
            self.pdf_doc = doc
            loaded_pages = []

            for i in range(len(doc)):
                page = doc.load_page(i)
                text = page.get_text("text").strip()
                # Extrai palavras com caixas delimitadoras: (x0, y0, x1, y1, word, block, line, word_no)
                words_boxes = page.get_text("words")
                doc_page = DocumentPage(i + 1, text, is_scanned=(len(text) < 30))
                doc_page.words_with_boxes = words_boxes
                loaded_pages.append(doc_page)

            self.after(0, lambda: self._on_pdf_loaded(loaded_pages, initial_page, initial_word))
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Erro ao Abrir PDF", f"Falha ao ler PDF:\n{e}"))

    def _on_pdf_loaded(self, loaded_pages: List[DocumentPage], initial_page: int, initial_word: int):
        self.pages = loaded_pages
        self.refresh_page_sidebar()
        target_page = min(initial_page, len(self.pages) - 1)
        self.select_page(target_page, initial_word=initial_word)
        self.lbl_status.configure(text=f"{len(self.pages)} páginas carregadas com sucesso.")

    def refresh_page_sidebar(self):
        for widget in self.pages_scrollable.winfo_children():
            widget.destroy()

        for idx, page in enumerate(self.pages):
            tag = " [Img]" if page.is_scanned and not page.raw_text else ""
            btn = ctk.CTkButton(
                self.pages_scrollable,
                text=f"Página {page.page_num}{tag}",
                anchor="w",
                height=30,
                fg_color="#1f538d" if idx == self.current_page_idx else ("gray80", "gray20"),
                command=lambda i=idx: self.select_page(i)
            )
            btn.pack(fill="x", pady=2)

    def select_page(self, page_idx: int, initial_word: int = 0):
        if not (0 <= page_idx < len(self.pages)):
            return

        self.pause_reading()
        self.current_page_idx = page_idx
        page = self.pages[page_idx]

        self.refresh_page_sidebar()
        self.active_text = page.clean_text or page.raw_text
        self.words_list = re.findall(r'\S+', self.active_text)
        self.current_word_idx = min(initial_word, max(0, len(self.words_list) - 1))

        # Renderiza a base da página do PDF para o painel de contexto
        self.render_context_page_image(page_idx)

        # Exibe palavra inicial
        if self.words_list:
            self.render_word(self.words_list[self.current_word_idx])
            self.highlight_context_word(self.current_word_idx)
        else:
            self.render_word("Sem texto")

        self.update_progress_ui()
        self.save_current_progress()

    # ==========================================================================
    # RENDERIZAÇÃO DO PAINEL DE CONTEXTO ("MEIA PÁGINA" COM MARCA-TEXTO)
    # ==========================================================================
    def render_context_page_image(self, page_idx: int):
        """Renderiza a página atual do PDF em uma imagem PIL e calcula escalas."""
        if not self.pdf_doc:
            self.page_base_image = None
            self.context_canvas.delete("all")
            return

        try:
            page = self.pdf_doc.load_page(page_idx)
            # Zoom adequado para caber suavemente no painel de contexto
            rect = page.rect
            zoom = 1.3
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)

            # Converte para PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            self.page_base_image = img
            self.page_scale_x = pix.width / rect.width
            self.page_scale_y = pix.height / rect.height

            # Exibe imagem no Canvas
            self._update_canvas_display(img)
        except Exception as e:
            print(f"Erro ao renderizar contexto: {e}")

    def highlight_context_word(self, word_idx: int):
        """Desenha um retângulo marca-texto chamativo sobre a palavra no PDF."""
        if not self.page_base_image or not self.pdf_doc:
            return

        page = self.pages[self.current_page_idx]
        if not page.words_with_boxes or word_idx >= len(page.words_with_boxes):
            return

        try:
            # Obtém coordenadas (x0, y0, x1, y1) da palavra no PDF
            box_data = page.words_with_boxes[word_idx]
            x0, y0, x1, y1 = box_data[0], box_data[1], box_data[2], box_data[3]

            # Converte para coordenadas da imagem renderizada
            sx0 = x0 * self.page_scale_x
            sy0 = y0 * self.page_scale_y
            sx1 = x1 * self.page_scale_x
            sy1 = y1 * self.page_scale_y

            # Cria cópia para desenhar o destaque (marca-texto fluorescente)
            highlighted_img = self.page_base_image.copy()
            draw = ImageDraw.Draw(highlighted_img)

            # Desenha fundo amarelo com borda vermelha/laranja de alta visibilidade
            padding = 2
            draw.rectangle(
                [sx0 - padding, sy0 - padding, sx1 + padding, sy1 + padding],
                fill="#facc15",
                outline="#dc2626",
                width=2
            )

            # Mantém texto nítido desenhando o retângulo
            self._update_canvas_display(highlighted_img, center_y=int((sy0 + sy1) / 2))
        except Exception as e:
            pass

    def _update_canvas_display(self, pil_image: Image.Image, center_y: Optional[int] = None):
        self.tk_page_image = ImageTk.PhotoImage(pil_image)
        self.context_canvas.delete("all")
        
        # Centraliza horizontalmente
        canvas_width = self.context_canvas.winfo_width()
        if canvas_width <= 1:
            canvas_width = 700

        x_offset = max(10, (canvas_width - pil_image.width) // 2)
        y_offset = 10

        # Se houver center_y, rola suavemente para manter a palavra visível
        if center_y is not None:
            canvas_height = self.context_canvas.winfo_height()
            if canvas_height > 10:
                y_offset = max(10, (canvas_height // 2) - center_y)

        self.context_canvas.create_image(x_offset, y_offset, anchor="nw", image=self.tk_page_image)

    # ==========================================================================
    # MOTOR RSVP (RAPID SERIAL VISUAL PRESENTATION)
    # ==========================================================================
    def split_orp(self, word: str):
        L = len(word)
        idx = 0 if L <= 1 else (1 if L <= 5 else (2 if L <= 9 else (3 if L <= 13 else 4)))
        return word[:idx], word[idx:idx+1], word[idx+1:]

    def render_word(self, word: str):
        p, o, s = self.split_orp(word)
        self.lbl_prefix.configure(text=p)
        self.lbl_orp.configure(text=o)
        self.lbl_suffix.configure(text=s)

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
        self.btn_play.configure(text="⏸ Pausar (Espaço)", fg_color="#d29922", hover_color="#b08018")
        self.lbl_status.configure(text=f"Lendo a {self.wpm} WPM...")

        if self.tts_enabled:
            self.start_tts_reading()

        self.tick_rsvp()

    def pause_reading(self):
        self.is_playing = False
        if self.rsvp_timer_id:
            self.after_cancel(self.rsvp_timer_id)
            self.rsvp_timer_id = None
        self.btn_play.configure(text="▶ Iniciar (Espaço)", fg_color="#2da44e", hover_color="#22863a")
        self.lbl_status.configure(text="Pausado")
        self.stop_tts()
        self.save_current_progress()

    def stop_reading(self):
        self.pause_reading()
        self.current_word_idx = 0
        self.update_progress_ui()
        if self.words_list:
            self.render_word(self.words_list[0])
            self.highlight_context_word(0)
        self.lbl_status.configure(text="Parado no início")
        self.save_current_progress()

    def seek_relative(self, offset: int):
        new_idx = max(0, min(len(self.words_list) - 1, self.current_word_idx + offset))
        self.current_word_idx = new_idx
        self.update_progress_ui()
        if self.words_list:
            self.render_word(self.words_list[self.current_word_idx])
            self.highlight_context_word(self.current_word_idx)
        self.save_current_progress()

    def tick_rsvp(self):
        if not self.is_playing:
            return

        if self.current_word_idx >= len(self.words_list):
            self.stop_reading()
            messagebox.showinfo("Fim da Página", "Você concluiu a leitura da página atual!")
            return

        current_word = self.words_list[self.current_word_idx]
        self.render_word(current_word)
        self.highlight_context_word(self.current_word_idx)
        self.update_progress_ui()

        delay_ms = int((60.0 / max(150, self.wpm)) * 1000)
        if current_word.endswith((".", "!", "?", ";", ":")):
            delay_ms = int(delay_ms * 1.8)
        elif current_word.endswith((",", "-", "—")):
            delay_ms = int(delay_ms * 1.3)

        self.current_word_idx += 1
        self.rsvp_timer_id = self.after(delay_ms, self.tick_rsvp)

    def update_progress_ui(self):
        total = len(self.words_list)
        curr = self.current_word_idx
        if total > 0:
            frac = curr / total
            self.pbar.set(frac)
            self.lbl_progress.configure(text=f"Palavra {curr} de {total} ({int(frac * 100)}%)")
        else:
            self.pbar.set(0)
            self.lbl_progress.configure(text="Palavra 0 de 0 (0%)")

    def save_current_progress(self):
        """Grava no JSON local o progresso da obra atual."""
        if not self.current_pdf_path:
            return
        title = os.path.basename(self.current_pdf_path)
        HistoryManager.save_book_progress(
            filepath=self.current_pdf_path,
            title=title,
            total_pages=len(self.pages),
            current_page=self.current_page_idx,
            word_idx=self.current_word_idx,
            total_words=len(self.words_list)
        )

    # ==========================================================================
    # SÍNTESE DE VOZ (TTS) & GEMINI AI
    # ==========================================================================
    def toggle_tts(self):
        self.tts_enabled = not self.tts_enabled
        if self.tts_enabled:
            self.btn_tts.configure(text="🔊 TTS: LIGADO", fg_color="#1f6feb", hover_color="#1855b3")
        else:
            self.btn_tts.configure(text="🔇 Voz TTS", fg_color="#343a40", hover_color="#495057")
            self.stop_tts()

    def start_tts_reading(self):
        if not self.tts_engine:
            return
        rem = " ".join(self.words_list[self.current_word_idx:])
        if not rem.strip():
            return
        threading.Thread(target=self._tts_worker, args=(rem,), daemon=True).start()

    def _tts_worker(self, text):
        try:
            worker = pyttsx3.init()
            worker.setProperty('rate', int(self.wpm * 0.85))
            voices = worker.getProperty('voices')
            for v in voices:
                if "portuguese" in v.name.lower() or "brazil" in v.name.lower():
                    worker.setProperty('voice', v.id)
                    break
            worker.say(text)
            worker.runAndWait()
        except Exception:
            pass

    def stop_tts(self):
        if self.tts_engine:
            try:
                self.tts_engine.stop()
            except Exception:
                pass

    def run_ocr_current_page(self):
        if not pytesseract or not self.current_pdf_path:
            messagebox.showinfo("Aviso", "Abra um arquivo PDF e certifique-se de que o Tesseract-OCR está instalado.")
            return
        self.lbl_status.configure(text="Executando OCR na página...")
        threading.Thread(target=self._ocr_worker, daemon=True).start()

    def _ocr_worker(self):
        try:
            page = self.pdf_doc.load_page(self.current_page_idx)
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text = pytesseract.image_to_string(img, lang="por")
            self.after(0, lambda: self._on_ocr_done(text))
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Erro OCR", str(e)))

    def _on_ocr_done(self, text):
        self.pages[self.current_page_idx].raw_text = text
        self.select_page(self.current_page_idx)
        messagebox.showinfo("Sucesso", "OCR concluído com sucesso!")

    def clean_text_with_gemini(self):
        if not self.active_text or len(self.active_text) < 10:
            return
        api_key = self.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            d = ctk.CTkInputDialog(title="Chave Gemini", text="Insira sua Chave de API:")
            key = d.get_input()
            if not key:
                return
            self.gemini_api_key = key
            api_key = key

        self.lbl_status.configure(text="✨ Gemini limpando ruídos e formatando texto...")
        threading.Thread(target=self._gemini_worker, args=(self.active_text, api_key), daemon=True).start()

    def _gemini_worker(self, text, api_key):
        prompt = (
            "Limpe os erros de OCR do seguinte texto em português, remova ruídos de digitalização "
            "e estruture em Markdown claro. Retorne APENAS o texto limpo:\n\n" + text
        )
        try:
            cleaned = ""
            if GEMINI_CLIENT_AVAILABLE == "genai":
                client = genai.Client(api_key=api_key)
                resp = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
                cleaned = resp.text
            elif GEMINI_CLIENT_AVAILABLE == "legacy":
                import google.generativeai as l_genai
                l_genai.configure(api_key=api_key)
                resp = l_genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
                cleaned = resp.text
            else:
                import urllib.request, json
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                req_data = {"contents": [{"parts": [{"text": prompt}]}]}
                req = urllib.request.Request(url, data=json.dumps(req_data).encode("utf-8"), headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                    cleaned = resp_json["candidates"][0]["content"]["parts"][0]["text"]

            self.after(0, lambda: self._on_gemini_done(cleaned))
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Erro Gemini", str(e)))

    def _on_gemini_done(self, cleaned):
        self.pages[self.current_page_idx].clean_text = cleaned
        self.select_page(self.current_page_idx)
        messagebox.showinfo("Sucesso", "Texto reestruturado e limpo com sucesso pelo Gemini!")

    def load_welcome_sample(self):
        sample = (
            "Bem-vindo ao LeitorDinamico avançado! Agora com memória automática de leitura "
            "e painel inferior de contexto visual. Conforme as palavras são apresentadas no centro, "
            "o aplicativo destaca a palavra exata na página original do documento logo abaixo. "
            "Assim, você ganha velocidade extrema sem perder a visão do parágrafo e dos gráficos."
        )
        self.pages = [DocumentPage(1, sample)]
        self.select_page(0)


if __name__ == "__main__":
    app = LeitorDinamicoApp()
    app.mainloop()
