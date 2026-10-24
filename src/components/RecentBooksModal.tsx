import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Play,
  RotateCcw,
  AlignLeft,
  FileText,
  Clock,
  Trash2,
  CheckCircle2,
  BookmarkCheck,
} from 'lucide-react';

export interface BookHistoryItem {
  id: string;
  title: string;
  totalPages: number;
  lastPage: number; // 0-indexed
  lastWordIdx: number;
  totalWordsPage: number;
  percent: number;
  lastReadAt: string;
}

interface RecentBooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: BookHistoryItem[];
  onResumeBook: (
    book: BookHistoryItem,
    option: 'exact' | 'paragraph' | 'page' | 'restart'
  ) => void;
  onDeleteBook: (id: string) => void;
}

export const RecentBooksModal: React.FC<RecentBooksModalProps> = ({
  isOpen,
  onClose,
  history,
  onResumeBook,
  onDeleteBook,
}) => {
  const [selectedBookForResume, setSelectedBookForResume] = useState<BookHistoryItem | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Obras Recentes & Memória de Leitura</h3>
              <p className="text-xs text-neutral-400">
                Progresso salvo automaticamente em JSON local (armazenado por obra)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: Lista de Livros ou Opções de Retomada */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {selectedBookForResume ? (
            /* Sub-tela: Opções de Retomada */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedBookForResume(null)}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                ← Voltar para lista de obras
              </button>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Obra Selecionada:
                </span>
                <h4 className="font-bold text-white text-base">{selectedBookForResume.title}</h4>
                <p className="text-xs text-neutral-400">
                  Progresso: <strong className="text-emerald-400">{selectedBookForResume.percent}%</strong> •
                  Última leitura: Página {selectedBookForResume.lastPage + 1} de {selectedBookForResume.totalPages} (Palavra {selectedBookForResume.lastWordIdx})
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Escolha como deseja retomar:
                </span>

                {/* Opção 1: Continuar de onde parei */}
                <button
                  onClick={() => {
                    onResumeBook(selectedBookForResume, 'exact');
                    setSelectedBookForResume(null);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/50 text-white transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-emerald-300">
                        🎯 Continuar Exatamente de Onde Parei
                      </div>
                      <div className="text-xs text-neutral-400">
                        Página {selectedBookForResume.lastPage + 1}, palavra #{selectedBookForResume.lastWordIdx}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition">
                    Retomar →
                  </span>
                </button>

                {/* Opção 2: Reiniciar do último parágrafo */}
                <button
                  onClick={() => {
                    onResumeBook(selectedBookForResume, 'paragraph');
                    setSelectedBookForResume(null);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700 text-white transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <AlignLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">📑 Reiniciar do Último Parágrafo</div>
                      <div className="text-xs text-neutral-400">
                        Volta ~25 palavras na página para recuperar o contexto do parágrafo
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 group-hover:text-white">Selecionar</span>
                </button>

                {/* Opção 3: Reiniciar da última página */}
                <button
                  onClick={() => {
                    onResumeBook(selectedBookForResume, 'page');
                    setSelectedBookForResume(null);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700 text-white transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">📄 Reiniciar da Última Página</div>
                      <div className="text-xs text-neutral-400">
                        Inicia a leitura do começo da página {selectedBookForResume.lastPage + 1}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 group-hover:text-white">Selecionar</span>
                </button>

                {/* Opção 4: Reiniciar do início da obra */}
                <button
                  onClick={() => {
                    onResumeBook(selectedBookForResume, 'restart');
                    setSelectedBookForResume(null);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-xs">🔄 Reiniciar do Início da Obra</div>
                      <div className="text-[11px] text-neutral-500">Página 1, palavra #0</div>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500">Zerar</span>
                </button>
              </div>
            </div>
          ) : (
            /* Lista Principal de Obras */
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 space-y-2">
                  <BookmarkCheck className="w-10 h-10 mx-auto text-neutral-600" />
                  <p className="text-sm font-medium">Nenhuma obra no histórico ainda.</p>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Abra qualquer PDF ou selecione uma amostra. Conforme você lê, o progresso é salvo automaticamente!
                  </p>
                </div>
              ) : (
                history.map((book) => (
                  <div
                    key={book.id}
                    className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{book.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {book.percent}% lido
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${book.percent}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-neutral-500" />
                          Página {book.lastPage + 1} de {book.totalPages}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          {book.lastReadAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => setSelectedBookForResume(book)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Retomar...
                      </button>
                      <button
                        onClick={() => onDeleteBook(book.id)}
                        className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition"
                        title="Remover do histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
