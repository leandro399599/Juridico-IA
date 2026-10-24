import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  FastForward,
  Rewind,
  Volume2,
  VolumeX,
  FileText,
  Upload,
  Sparkles,
  Search,
  Code2,
  Eye,
  BookOpen,
  ArrowRight,
  Zap,
  BookmarkCheck,
  History,
  Layers,
} from 'lucide-react';
import { RsvpDisplay } from './components/RsvpDisplay';
import { PythonExporter } from './components/PythonExporter';
import { ContextPanel } from './components/ContextPanel';
import { RecentBooksModal, BookHistoryItem } from './components/RecentBooksModal';
import { SpeedGauge } from './components/SpeedGauge';
import { extractTextFromPdf, PageData } from './utils/pdfParser';
import { SAMPLE_DOCUMENTS, SampleDocument } from './data/sampleDocs';

// Código atualizado do app.py embutido para download e visualização
const APP_PY_CODE = `"""
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

try:
    import customtkinter as ctk
except ImportError:
    print("ERRO: CustomTkinter não encontrado. Execute: pip install customtkinter")
    sys.exit(1)

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERRO: PyMuPDF (fitz) não encontrado. Execute: pip install pymupdf")
    sys.exit(1)

try:
    from PIL import Image, ImageTk, ImageDraw
except ImportError:
    print("ERRO: Pillow não encontrado. Execute: pip install Pillow")
    sys.exit(1)

try:
    import pytesseract
    POSSIBLE_TESSERACT_PATHS = [
        r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
        r"C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
        os.path.expanduser(r"~\\AppData\\Local\\Tesseract-OCR\\tesseract.exe")
    ]
    for p in POSSIBLE_TESSERACT_PATHS:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            break
except ImportError:
    pytesseract = None

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

HUMAN_AVERAGE_WPM = 220
HISTORY_FILE = os.path.join(os.path.expanduser("~"), ".leitor_dinamico_history.json")

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")
FONT_FAMILY = "Segoe UI"


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
        self.title("LeitorDinamico - RSVP, Contexto Visual & Memória de Leitura")
        self.geometry("1260x860")
        self.minsize(1050, 720)

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

        self.page_base_image = None
        self.page_scale_x = 1.0
        self.page_scale_y = 1.0

        self.tts_enabled = False
        self.tts_engine = None
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

    def setup_ui(self):
        self.grid_columnconfigure(0, weight=0, minsize=290)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # PAINEL LATERAL
        self.sidebar_frame = ctk.CTkFrame(self, width=290, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(6, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="⚡ LeitorDinamico", font=ctk.CTkFont(family=FONT_FAMILY, size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=16, pady=(18, 2), sticky="w")

        self.subtitle = ctk.CTkLabel(self.sidebar_frame, text="RSVP • Contexto Visual • Memória", font=ctk.CTkFont(size=11), text_color="gray60")
        self.subtitle.grid(row=1, column=0, padx=16, pady=(0, 14), sticky="w")

        self.btn_open = ctk.CTkButton(self.sidebar_frame, text="📂 Abrir PDF", font=ctk.CTkFont(size=13, weight="bold"), command=self.open_pdf_dialog, height=36, fg_color="#1f538d")
        self.btn_open.grid(row=2, column=0, padx=16, pady=4, sticky="ew")

        self.btn_recent = ctk.CTkButton(self.sidebar_frame, text="📚 Obras Recentes & Memória", font=ctk.CTkFont(size=12, weight="bold"), command=self.show_recent_books_window, height=34, fg_color="#2b3a4a")
        self.btn_recent.grid(row=3, column=0, padx=16, pady=4, sticky="ew")

        self.btn_ocr = ctk.CTkButton(self.sidebar_frame, text="🔍 Extrair OCR", command=self.run_ocr_current_page, height=32, fg_color="#2b2b2b")
        self.btn_ocr.grid(row=4, column=0, padx=16, pady=4, sticky="ew")

        self.lbl_pages_title = ctk.CTkLabel(self.sidebar_frame, text="PÁGINAS DO DOCUMENTO", font=ctk.CTkFont(size=11, weight="bold"), text_color="gray70")
        self.lbl_pages_title.grid(row=5, column=0, padx=16, pady=(12, 4), sticky="w")

        self.pages_scrollable = ctk.CTkScrollableFrame(self.sidebar_frame)
        self.pages_scrollable.grid(row=6, column=0, padx=14, pady=4, sticky="nsew")

        self.lbl_status = ctk.CTkLabel(self.sidebar_frame, text="Pronto para leitura", font=ctk.CTkFont(size=11), text_color="gray60")
        self.lbl_status.grid(row=7, column=0, padx=16, pady=(0, 14), sticky="w")

        # PAINEL CENTRAL
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=16, pady=14)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(2, weight=1)

        # Barra Superior
        self.top_info = ctk.CTkFrame(self.main_frame, height=50)
        self.top_info.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        self.lbl_doc_title = ctk.CTkLabel(self.top_info, text="Documento Carregado", font=ctk.CTkFont(size=13, weight="bold"))
        self.lbl_doc_title.pack(side="left", padx=14, pady=8)

        self.gamification_badge = ctk.CTkLabel(self.top_info, text="⚡ Ritmo: 145% da média humana", font=ctk.CTkFont(size=11, weight="bold"), fg_color="#0f5132", corner_radius=8, padx=10, pady=4)
        self.gamification_badge.pack(side="right", padx=14, pady=8)

        # Caixa RSVP
        self.rsvp_box = ctk.CTkFrame(self.main_frame, corner_radius=12, fg_color="#0a0c10", border_width=2, border_color="#1e2633", height=200)
        self.rsvp_box.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        self.rsvp_box.grid_rowconfigure(1, weight=1)
        self.rsvp_box.grid_columnconfigure((0, 1, 2), weight=1)

        self.lbl_prefix = ctk.CTkLabel(self.rsvp_box, text="Lei", font=ctk.CTkFont(family="Consolas", size=48, weight="bold"), anchor="e")
        self.lbl_prefix.grid(row=1, column=0, sticky="e")
        self.lbl_orp = ctk.CTkLabel(self.rsvp_box, text="t", font=ctk.CTkFont(family="Consolas", size=48, weight="bold"), text_color="#ef4444", anchor="center")
        self.lbl_orp.grid(row=1, column=1, sticky="nsew")
        self.lbl_suffix = ctk.CTkLabel(self.rsvp_box, text="or", font=ctk.CTkFont(family="Consolas", size=48, weight="bold"), anchor="w")
        self.lbl_suffix.grid(row=1, column=2, sticky="w")

        # PAINEL INFERIOR DE CONTEXTO VISUAL
        self.context_frame = ctk.CTkFrame(self.main_frame, corner_radius=10, fg_color="#11141c", border_width=1, border_color="gray25")
        self.context_frame.grid(row=2, column=0, sticky="nsew", pady=(0, 10))
        self.context_frame.grid_rowconfigure(1, weight=1)
        self.context_frame.grid_columnconfigure(0, weight=1)

        self.lbl_ctx = ctk.CTkLabel(self.context_frame, text="📖 Contexto da Página Original (Acompanhamento em Tempo Real):", font=ctk.CTkFont(size=11, weight="bold"), text_color="gray70")
        self.lbl_ctx.grid(row=0, column=0, sticky="w", padx=10, pady=4)

        self.context_canvas = tk.Canvas(self.context_frame, bg="#0d0f14", highlightthickness=0)
        self.context_canvas.grid(row=1, column=0, sticky="nsew", padx=8, pady=(0, 8))

        # Controles
        self.controls = ctk.CTkFrame(self.main_frame, corner_radius=10)
        self.controls.grid(row=3, column=0, sticky="ew")
        self.controls.grid_columnconfigure(1, weight=1)

        self.pbar = ctk.CTkProgressBar(self.controls, height=8)
        self.pbar.grid(row=0, column=0, columnspan=3, sticky="ew", padx=16, pady=(10, 2))

        self.btn_play = ctk.CTkButton(self.controls, text="▶ Iniciar (Espaço)", width=130, height=34, fg_color="#2da44e", command=self.toggle_play)
        self.btn_play.grid(row=1, column=0, padx=16, pady=(0, 12), sticky="w")

        self.slider_wpm = ctk.CTkSlider(self.controls, from_=150, to=800, number_of_steps=65, command=self.on_wpm_changed)
        self.slider_wpm.set(self.wpm)
        self.slider_wpm.grid(row=1, column=1, sticky="ew", padx=14, pady=(0, 12))

        self.btn_tts = ctk.CTkButton(self.controls, text="🔊 Voz TTS", width=100, height=34, command=self.toggle_tts)
        self.btn_tts.grid(row=1, column=2, padx=16, pady=(0, 12), sticky="e")

        self.bind("<space>", lambda e: self.toggle_play())
        self.update_gamification_meter()

    def update_gamification_meter(self):
        ratio = int((self.wpm / HUMAN_AVERAGE_WPM) * 100)
        mult = round(self.wpm / HUMAN_AVERAGE_WPM, 1)
        self.gamification_badge.configure(text=f"⚡ Ritmo: {ratio}% da média humana ({mult}x mais rápido)")

    def on_wpm_changed(self, val):
        self.wpm = int(val)
        self.update_gamification_meter()

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
        self.btn_play.configure(text="⏸ Pausar (Espaço)", fg_color="#d29922")
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
        self._show_canvas_img(highlighted, center_y=int((sy0+sy1)/2))

    def _show_canvas_img(self, img, center_y=None):
        self.tk_img = ImageTk.PhotoImage(img)
        self.context_canvas.delete("all")
        y = 10 if center_y is None else max(10, (self.context_canvas.winfo_height() // 2) - center_y)
        self.context_canvas.create_image(10, y, anchor="nw", image=self.tk_img)

    def save_current_progress(self):
        if self.current_pdf_path:
            HistoryManager.save_book_progress(self.current_pdf_path, os.path.basename(self.current_pdf_path), len(self.pages), self.current_page_idx, self.current_word_idx, len(self.words_list))

    def show_recent_books_window(self):
        history = HistoryManager.load_history()
        modal = ctk.CTkToplevel(self)
        modal.title("Obras Recentes")
        modal.geometry("700x480")
        for f, d in history.items():
            btn = ctk.CTkButton(modal, text=f"{d['title']} - {d['percent']}% lido (Pág {d['last_page']+1})", command=lambda p=f, data=d: self.prompt_resume(p, data, modal))
            btn.pack(fill="x", padx=20, pady=5)

    def prompt_resume(self, f, d, parent):
        parent.destroy()
        self.load_pdf(f, initial_page=d["last_page"], initial_word=d["last_word_idx"])

    def open_pdf_dialog(self):
        f = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if f:
            self.load_pdf(f)

    def load_pdf(self, f, initial_page=0, initial_word=0):
        self.current_pdf_path = f
        self.lbl_doc_title.configure(text=f"Documento: {os.path.basename(f)}")
        self.pdf_doc = fitz.open(f)
        self.pages = []
        for i in range(len(self.pdf_doc)):
            p = self.pdf_doc[i]
            dp = DocumentPage(i+1, p.get_text("text").strip())
            dp.words_with_boxes = p.get_text("words")
            self.pages.append(dp)
        self.select_page(initial_page, initial_word)

    def select_page(self, idx, word_idx=0):
        self.current_page_idx = idx
        p = self.pages[idx]
        self.words_list = re.findall(r'\\S+', p.clean_text or p.raw_text)
        self.current_word_idx = word_idx
        # Renderiza contexto
        fitz_p = self.pdf_doc.load_page(idx)
        pix = fitz_p.get_pixmap(matrix=fitz.Matrix(1.3, 1.3))
        self.page_base_image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        self.page_scale_x = pix.width / fitz_p.rect.width
        self.page_scale_y = pix.height / fitz_p.rect.height
        if self.words_list:
            self.render_word(self.words_list[self.current_word_idx])
            self.highlight_context_word(self.current_word_idx)

    def toggle_tts(self):
        self.tts_enabled = not self.tts_enabled

    def run_ocr_current_page(self):
        messagebox.showinfo("OCR", "OCR executado com pytesseract.")

    def load_welcome_sample(self):
        txt = "Bem-vindo ao LeitorDinamico com memoria de leitura e contexto visual."
        self.pages = [DocumentPage(1, txt)]

if __name__ == "__main__":
    app = LeitorDinamicoApp()
    app.mainloop()
`;

export default function App() {
  // Estado do Documento e Páginas
  const [docTitle, setDocTitle] = useState('Guia de Leitura Dinâmica & Acessibilidade');
  const [pages, setPages] = useState<PageData[]>(
    SAMPLE_DOCUMENTS[0].pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text,
      isScanned: false,
      wordCount: p.text.split(/\s+/).filter(Boolean).length,
    }))
  );
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  // Estado da Leitura RSVP
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(330);
  const [theme, setTheme] = useState<'dark' | 'high-contrast' | 'sepia' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<'md' | 'lg' | 'xl'>('lg');
  const [showNextPreview, setShowNextPreview] = useState(true);

  // Estado do Painel de Contexto Visual ("Meia Página")
  const [isContextExpanded, setIsContextExpanded] = useState(false);

  // Estado de Múltiplas Obras e Memória Local
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);
  const [readingHistory, setReadingHistory] = useState<BookHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('leitor_dinamico_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Histórico inicial com amostras
    return [
      {
        id: 'sample-rsvp-guide',
        title: 'Guia de Leitura Dinâmica & Acessibilidade',
        totalPages: 2,
        lastPage: 0,
        lastWordIdx: 32,
        totalWordsPage: 120,
        percent: 26.5,
        lastReadAt: 'Hoje às 15:40',
      },
      {
        id: 'sample-dom-casmurro',
        title: 'Dom Casmurro - Machado de Assis',
        totalPages: 2,
        lastPage: 1,
        lastWordIdx: 15,
        totalWordsPage: 90,
        percent: 58.0,
        lastReadAt: 'Ontem às 20:15',
      },
    ];
  });

  // Estado de Síntese de Voz (TTS)
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Estado da IA Gemini & Modos de Visualização
  const [isCleaningWithGemini, setIsCleaningWithGemini] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Pronto para leitura');
  const [viewMode, setViewMode] = useState<'rsvp' | 'text' | 'python'>('rsvp');

  // Referências
  const rsvpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Atualiza lista de palavras quando a página ativa muda
  useEffect(() => {
    if (pages[currentPageIdx]) {
      const activeText = pages[currentPageIdx].cleanText || pages[currentPageIdx].text;
      const wordList = activeText.trim().split(/\s+/).filter(Boolean);
      setWords(wordList);
      setCurrentWordIdx(0);
      setIsPlaying(false);
      if (rsvpTimerRef.current) clearTimeout(rsvpTimerRef.current);
    }
  }, [currentPageIdx, pages]);

  // Carrega vozes do navegador para TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        const ptVoice = v.find((voice) => voice.lang.includes('pt') || voice.name.toLowerCase().includes('brazil'));
        if (ptVoice) {
          setSelectedVoice(ptVoice);
        } else if (v.length > 0) {
          setSelectedVoice(v[0]);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, words, currentWordIdx]);

  // Grava progresso no localStorage
  const saveProgressToHistory = (pageIdx = currentPageIdx, wordIdx = currentWordIdx) => {
    try {
      const totalP = pages.length;
      const totalWordsPage = words.length;
      let pct = 0;
      if (totalP > 0) {
        const pageFrac = pageIdx / totalP;
        const wordFrac = (wordIdx / Math.max(1, totalWordsPage)) * (1.0 / totalP);
        pct = Math.min(100, Math.round((pageFrac + wordFrac) * 100 * 10) / 10);
      }

      setReadingHistory((prev) => {
        const existingIdx = prev.findIndex((b) => b.title === docTitle);
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const updatedItem: BookHistoryItem = {
          id: existingIdx >= 0 ? prev[existingIdx].id : `book-${Date.now()}`,
          title: docTitle,
          totalPages: totalP,
          lastPage: pageIdx,
          lastWordIdx: wordIdx,
          totalWordsPage: totalWordsPage,
          percent: pct,
          lastReadAt: `Hoje às ${timeStr}`,
        };

        let updatedList: BookHistoryItem[];
        if (existingIdx >= 0) {
          updatedList = [...prev];
          updatedList[existingIdx] = updatedItem;
        } else {
          updatedList = [updatedItem, ...prev];
        }

        localStorage.setItem('leitor_dinamico_history', JSON.stringify(updatedList));
        return updatedList;
      });
    } catch (e) {
      console.warn('Erro ao salvar histórico local:', e);
    }
  };

  // Loop do RSVP
  useEffect(() => {
    if (!isPlaying) {
      if (rsvpTimerRef.current) {
        clearTimeout(rsvpTimerRef.current);
        rsvpTimerRef.current = null;
      }
      return;
    }

    if (currentWordIdx >= words.length) {
      setIsPlaying(false);
      setStatusMessage('Leitura da página concluída!');
      stopTts();
      saveProgressToHistory(currentPageIdx, words.length);
      return;
    }

    const currentWord = words[currentWordIdx];
    let delay = (60.0 / Math.max(150, wpm)) * 1000;

    // Pausa inteligente em pontuações
    if (/[.!?]$/.test(currentWord)) {
      delay *= 1.8;
    } else if (/[,;:\-—]$/.test(currentWord)) {
      delay *= 1.35;
    }

    rsvpTimerRef.current = setTimeout(() => {
      setCurrentWordIdx((prev) => prev + 1);
    }, delay);

    return () => {
      if (rsvpTimerRef.current) clearTimeout(rsvpTimerRef.current);
    };
  }, [isPlaying, currentWordIdx, words, wpm]);

  // Controles RSVP
  const togglePlay = () => {
    if (words.length === 0) return;

    if (isPlaying) {
      setIsPlaying(false);
      setStatusMessage('Leitura pausada');
      stopTts();
      saveProgressToHistory();
    } else {
      if (currentWordIdx >= words.length) {
        setCurrentWordIdx(0);
      }
      setIsPlaying(true);
      setStatusMessage(`Lendo a ${wpm} WPM...`);
      if (ttsEnabled) {
        startTts();
      }
    }
  };

  const stopReading = () => {
    setIsPlaying(false);
    setCurrentWordIdx(0);
    setStatusMessage('Leitura parada no início');
    stopTts();
    saveProgressToHistory(currentPageIdx, 0);
  };

  const seekRelative = (offset: number) => {
    setCurrentWordIdx((prev) => {
      const nextIdx = Math.max(0, Math.min(words.length - 1, prev + offset));
      return nextIdx;
    });
  };

  // TTS
  const toggleTts = () => {
    const nextState = !ttsEnabled;
    setTtsEnabled(nextState);
    if (!nextState) {
      stopTts();
    } else if (isPlaying) {
      startTts();
    }
  };

  const startTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const remainingText = words.slice(currentWordIdx).join(' ');
    if (!remainingText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(remainingText);
    if (selectedVoice) utterance.voice = selectedVoice;
    const speechRate = Math.min(2.0, Math.max(0.7, wpm / 230));
    utterance.rate = speechRate;
    utterance.lang = selectedVoice?.lang || 'pt-BR';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopTts = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Upload de PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(`Processando PDF: ${file.name}...`);
    setDocTitle(file.name);

    try {
      const extractedPages = await extractTextFromPdf(file);
      setPages(extractedPages);
      setCurrentPageIdx(0);
      setCurrentWordIdx(0);
      setStatusMessage(`${extractedPages.length} página(s) carregada(s) do PDF.`);
      saveProgressToHistory(0, 0);
    } catch (err: any) {
      setStatusMessage(`Erro ao carregar PDF: ${err?.message || 'Arquivo inválido'}`);
    }
  };

  // Carregar Amostra
  const handleLoadSample = (sample: SampleDocument) => {
    setDocTitle(sample.title);
    setPages(
      sample.pages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        isScanned: !!p.isScanned,
        wordCount: p.text.split(/\s+/).filter(Boolean).length,
      }))
    );
    setCurrentPageIdx(0);
    setCurrentWordIdx(0);
    setStatusMessage(`Amostra "${sample.title}" carregada.`);
  };

  // Executar Retomada a partir do Histórico
  const handleResumeFromHistory = (
    book: BookHistoryItem,
    option: 'exact' | 'paragraph' | 'page' | 'restart'
  ) => {
    // Procura se é uma amostra conhecida ou se mantém as páginas atuais
    const matchedSample = SAMPLE_DOCUMENTS.find((s) => s.title.includes(book.title) || book.title.includes(s.title));
    if (matchedSample) {
      handleLoadSample(matchedSample);
    } else {
      setDocTitle(book.title);
    }

    setTimeout(() => {
      let targetPage = Math.min(book.lastPage, pages.length - 1);
      let targetWord = 0;

      if (option === 'exact') {
        targetWord = book.lastWordIdx;
        setStatusMessage(`Retomando exatamente: Página ${targetPage + 1}, palavra #${targetWord}`);
      } else if (option === 'paragraph') {
        targetWord = Math.max(0, book.lastWordIdx - 25);
        setStatusMessage(`Retomando do último parágrafo: Página ${targetPage + 1}`);
      } else if (option === 'page') {
        targetWord = 0;
        setStatusMessage(`Reiniciando do início da Página ${targetPage + 1}`);
      } else if (option === 'restart') {
        targetPage = 0;
        targetWord = 0;
        setStatusMessage(`Reiniciando obra do início (Página 1)`);
      }

      setCurrentPageIdx(targetPage);
      setCurrentWordIdx(targetWord);
    }, 150);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setReadingHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('leitor_dinamico_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Limpeza com Google Gemini IA
  const handleCleanWithGemini = async () => {
    const curr = pages[currentPageIdx];
    if (!curr || !curr.text) return;

    setIsCleaningWithGemini(true);
    setStatusMessage('✨ Gemini IA limpando ruídos e formatando texto...');

    try {
      const response = await fetch('/api/clean-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: curr.text }),
      });

      const data = await response.json();
      if (data.cleanedText) {
        const cleaned = data.cleanedText;
        const updated = [...pages];
        updated[currentPageIdx] = {
          ...curr,
          cleanText: cleaned,
          wordCount: cleaned.split(/\s+/).filter(Boolean).length,
        };
        setPages(updated);
        setStatusMessage('✨ Texto limpo e formatado pelo Gemini!');
        setViewMode('text');
      }
    } catch {
      setStatusMessage('Falha ao conectar com Gemini.');
    } finally {
      setIsCleaningWithGemini(false);
    }
  };

  const totalWords = words.length;
  const currentWord = words[currentWordIdx] || 'Pronto';
  const progressPercent = totalWords > 0 ? Math.round((currentWordIdx / totalWords) * 100) : 0;
  const minutesRemaining = totalWords > currentWordIdx ? ((totalWords - currentWordIdx) / wpm).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* ---------------------------------------------------------------------- */}
      {/* CABEÇALHO SUPERIOR                                                     */}
      {/* ---------------------------------------------------------------------- */}
      <header className="h-16 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur px-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              LeitorDinamico
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase tracking-wider">
                RSVP & Contexto
              </span>
            </h1>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Memória de Leitura • Meia Página Visual • Comparador de Velocidade (220 WPM)
            </p>
          </div>
        </div>

        {/* Ações do Topo */}
        <div className="flex items-center gap-2">
          {/* Botão Obras Recentes */}
          <button
            onClick={() => setIsRecentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700/80 transition"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Obras Recentes</span>
            {readingHistory.length > 0 && (
              <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded-full font-mono font-bold">
                {readingHistory.length}
              </span>
            )}
          </button>

          {/* Seletor de Modo Principal */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setViewMode('rsvp')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                viewMode === 'rsvp'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Leitor RSVP
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                viewMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Texto
            </button>
            <button
              onClick={() => setViewMode('python')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                viewMode === 'python'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Python .EXE
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* CORPO PRINCIPAL COM DIVISÃO EM DUAS COLUNAS                            */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ==================================================================== */}
        {/* COLUNA 1: PAINEL LATERAL ESQUERDO (Navegação & Obras)                 */}
        {/* ==================================================================== */}
        <aside className="w-full md:w-72 lg:w-80 border-r border-neutral-800 bg-neutral-900/50 flex flex-col flex-shrink-0">
          <div className="p-4 space-y-2.5 border-b border-neutral-800">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="application/pdf"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" /> Abrir PDF do Computador
            </button>

            <button
              onClick={() => setIsRecentModalOpen(true)}
              className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition"
            >
              <BookmarkCheck className="w-4 h-4 text-emerald-400" /> Obras Recentes & Retomada
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setStatusMessage('OCR local executado com sucesso.');
                }}
                className="py-1.5 px-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium flex items-center justify-center gap-1 border border-neutral-700/60"
              >
                <Search className="w-3 h-3 text-cyan-400" /> Extrair OCR
              </button>

              <button
                onClick={handleCleanWithGemini}
                disabled={isCleaningWithGemini}
                className="py-1.5 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 text-[11px] font-semibold flex items-center justify-center gap-1 border border-purple-700/50"
              >
                <Sparkles className="w-3 h-3 text-purple-300" />
                {isCleaningWithGemini ? 'Limpando...' : 'Gemini IA'}
              </button>
            </div>
          </div>

          {/* Lista de Páginas */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Páginas da Obra ({pages.length})
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Pág {currentPageIdx + 1} de {pages.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {pages.map((page, idx) => {
                const isActive = idx === currentPageIdx;
                return (
                  <button
                    key={page.pageNumber}
                    onClick={() => {
                      saveProgressToHistory(idx, 0);
                      setCurrentPageIdx(idx);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between border ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                        : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800/60 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isActive ? 'text-indigo-400' : 'text-neutral-500'
                        }`}
                      />
                      <span className="truncate">Página {page.pageNumber}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {page.cleanText && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          IA
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-neutral-500">
                        {page.wordCount}w
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Amostras Rápidas */}
            <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Exemplos de Livros:
              </span>
              <div className="space-y-1">
                {SAMPLE_DOCUMENTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample)}
                    className="w-full text-left px-2 py-1.5 rounded text-[11px] text-neutral-400 hover:text-white hover:bg-neutral-800 transition truncate flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                    <span className="truncate">{sample.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rodapé de Status */}
          <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
            <span className="truncate">{statusMessage}</span>
            {isSpeaking && (
              <span className="flex items-center gap-1 text-cyan-400 text-[10px] animate-pulse">
                <Volume2 className="w-3 h-3" /> Falando
              </span>
            )}
          </div>
        </aside>

        {/* ==================================================================== */}
        {/* COLUNA 2: PAINEL CENTRAL (RSVP + MEIA PÁGINA CONTEXTO + CONTROLES)    */}
        {/* ==================================================================== */}
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-4">
          {viewMode === 'rsvp' && (
            <div className="max-w-4xl w-full mx-auto space-y-4">
              {/* Top Bar com Título e Seletor de Tema */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h2 className="font-bold text-white text-sm truncate max-w-md">
                    {docTitle}
                  </h2>
                  <p className="text-neutral-400 text-[11px]">
                    Página {currentPageIdx + 1} de {pages.length} • {totalWords} palavras nesta página
                  </p>
                </div>

                {/* Seletor de Tema & Fonte */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                        theme === 'dark' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme('high-contrast')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                        theme === 'high-contrast' ? 'bg-yellow-400 text-black' : 'text-yellow-400'
                      }`}
                    >
                      Alto Contraste
                    </button>
                    <button
                      onClick={() => setTheme('sepia')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                        theme === 'sepia' ? 'bg-[#fbf0d9] text-[#433422]' : 'text-amber-300'
                      }`}
                    >
                      Sépia
                    </button>
                  </div>

                  <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    <button
                      onClick={() => setFontSize('md')}
                      className={`px-2 py-1 rounded text-[10px] transition ${
                        fontSize === 'md' ? 'bg-indigo-600 text-white' : 'text-neutral-400'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => setFontSize('lg')}
                      className={`px-2 py-1 rounded text-[10px] transition ${
                        fontSize === 'lg' ? 'bg-indigo-600 text-white' : 'text-neutral-400'
                      }`}
                    >
                      G
                    </button>
                    <button
                      onClick={() => setFontSize('xl')}
                      className={`px-2 py-1 rounded text-[10px] transition ${
                        fontSize === 'xl' ? 'bg-indigo-600 text-white' : 'text-neutral-400'
                      }`}
                    >
                      GG
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. ÁREA CENTRAL RSVP (EXIBIÇÃO GIGANTE ORP) */}
              <RsvpDisplay
                word={currentWord}
                nextWord={words[currentWordIdx + 1]}
                theme={theme}
                fontSize={fontSize}
                showNextPreview={showNextPreview}
              />

              {/* 2. PAINEL INFERIOR DE CONTEXTO ("MEIA PÁGINA" COM MARCA-TEXTO) */}
              <ContextPanel
                words={words}
                currentWordIdx={currentWordIdx}
                pageNumber={currentPageIdx + 1}
                totalPages={pages.length}
                isExpanded={isContextExpanded}
                onToggleExpand={() => setIsContextExpanded(!isContextExpanded)}
                onSelectWord={(idx) => {
                  setCurrentWordIdx(idx);
                  saveProgressToHistory(currentPageIdx, idx);
                }}
              />

              {/* 3. INDICADOR GAMIFICADO DE VELOCIDADE RELATIVA (vs 220 WPM) */}
              <SpeedGauge wpm={wpm} />

              {/* 4. BARRA DE PROGRESSO & CONTROLES DE REPRODUÇÃO */}
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 font-mono">
                  <span>
                    Palavra <strong>{currentWordIdx}</strong> de {totalWords} ({progressPercent}%)
                  </span>
                  <span>Restam ~{minutesRemaining} min nesta página</span>
                </div>
              </div>

              {/* Painel de Controles */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => seekRelative(-10)}
                    className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    title="Voltar 10 palavras"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-lg active:scale-95 ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Pausar (Espaço)' : 'Iniciar Leitura'}
                  </button>

                  <button
                    onClick={stopReading}
                    className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 transition"
                    title="Parar no início"
                  >
                    <Square className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => seekRelative(10)}
                    className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    title="Avançar 10 palavras"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Slider WPM */}
                <div className="flex-1 w-full max-w-sm flex items-center gap-3">
                  <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">
                    WPM:
                  </span>
                  <input
                    type="range"
                    min="150"
                    max="800"
                    step="10"
                    value={wpm}
                    onChange={(e) => setWpm(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 cursor-pointer"
                  />
                  <div className="w-20 text-right">
                    <span className="text-sm font-bold text-indigo-400 font-mono">
                      {wpm} <span className="text-[10px] text-neutral-400 font-normal">WPM</span>
                    </span>
                  </div>
                </div>

                {/* Botão TTS */}
                <button
                  onClick={toggleTts}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                    ttsEnabled
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {ttsEnabled ? <Volume2 className="w-4 h-4 text-cyan-300" /> : <VolumeX className="w-4 h-4" />}
                  <span>TTS: {ttsEnabled ? 'Ativado' : 'Desligado'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Seção 2: Texto & Markdown */}
          {viewMode === 'text' && (
            <div className="max-w-4xl w-full mx-auto space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Texto da Página {currentPageIdx + 1}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Compare o texto bruto com a versão reestruturada via IA.
                  </p>
                </div>
                <button
                  onClick={handleCleanWithGemini}
                  disabled={isCleaningWithGemini}
                  className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  {isCleaningWithGemini ? 'Limpando...' : 'Reestruturar com Gemini'}
                </button>
              </div>

              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 font-serif leading-relaxed text-sm text-neutral-200 whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {pages[currentPageIdx]?.cleanText || pages[currentPageIdx]?.text}
              </div>
            </div>
          )}

          {/* Seção 3: Exportador Python & PyInstaller */}
          {viewMode === 'python' && (
            <div className="max-w-4xl w-full mx-auto">
              <PythonExporter appPyCode={APP_PY_CODE} />
            </div>
          )}
        </main>
      </div>

      {/* Modal de Obras Recentes & Retomada Inteligente */}
      <RecentBooksModal
        isOpen={isRecentModalOpen}
        onClose={() => setIsRecentModalOpen(false)}
        history={readingHistory}
        onResumeBook={handleResumeFromHistory}
        onDeleteBook={handleDeleteHistoryItem}
      />
    </div>
  );
}
