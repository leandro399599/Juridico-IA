import React, { useEffect, useRef } from 'react';
import { Eye, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

interface ContextPanelProps {
  words: string[];
  currentWordIdx: number;
  pageNumber: number;
  totalPages: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectWord?: (idx: number) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  words,
  currentWordIdx,
  pageNumber,
  totalPages,
  isExpanded,
  onToggleExpand,
  onSelectWord,
}) => {
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll suave para manter a palavra ativa visível no centro do painel de contexto
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [currentWordIdx]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden transition-all duration-300 shadow-xl">
      {/* Cabeçalho do Painel de Contexto */}
      <div className="bg-neutral-950/80 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-neutral-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Contexto Visual da Página Original (Meia Página)
          </span>
          <span className="text-neutral-500 font-mono text-[10px]">
            [Página {pageNumber} de {totalPages}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            Clique em qualquer palavra para pular a leitura para ela
          </span>
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-medium transition"
            title={isExpanded ? 'Recolher painel' : 'Expandir painel'}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3 h-3" /> Reduzir
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" /> Expandir
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área da Página com Marca-Texto Chamativo */}
      <div
        ref={containerRef}
        className={`p-5 overflow-y-auto bg-neutral-950/60 font-serif leading-relaxed text-sm transition-all duration-300 ${
          isExpanded ? 'max-h-72 md:max-h-80' : 'max-h-36 md:max-h-44'
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-3xl mx-auto bg-neutral-900/90 border border-neutral-800/80 rounded-lg p-5 shadow-inner">
          <div className="flex flex-wrap gap-x-1.5 gap-y-2 text-neutral-300">
            {words.length === 0 ? (
              <span className="text-neutral-500 italic text-xs">Nenhum texto nesta página.</span>
            ) : (
              words.map((word, idx) => {
                const isActive = idx === currentWordIdx;
                const isNear = Math.abs(idx - currentWordIdx) <= 4;

                return (
                  <span
                    key={`${word}-${idx}`}
                    ref={isActive ? activeWordRef : null}
                    onClick={() => onSelectWord && onSelectWord(idx)}
                    className={`cursor-pointer px-1 py-0.5 rounded transition-all duration-100 ${
                      isActive
                        ? 'bg-yellow-400 text-neutral-950 font-bold shadow-lg ring-2 ring-red-500 scale-110 z-10'
                        : isNear
                        ? 'text-neutral-100 bg-neutral-800/70'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {word}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
