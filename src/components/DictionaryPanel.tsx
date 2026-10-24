import React from 'react';
import { BookOpen, X, Volume2, Sparkles, Tag, Quote, ArrowRight } from 'lucide-react';
import { lookupWord, WordDefinition } from '../utils/dictionary';

interface DictionaryPanelProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
  onSpeakWord?: (word: string) => void;
}

export const DictionaryPanel: React.FC<DictionaryPanelProps> = ({
  word,
  isOpen,
  onClose,
  onSpeakWord,
}) => {
  if (!isOpen || !word) return null;

  const definition: WordDefinition = lookupWord(word);

  return (
    <div className="bg-neutral-900 border-2 border-indigo-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white capitalize">{definition.word}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium italic">
                {definition.class}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Dicionário da Língua Portuguesa & Consulta Semântica Integrada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSpeakWord && (
            <button
              onClick={() => onSpeakWord(definition.word)}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              title="Ouvir pronúncia"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
            title="Fechar dicionário"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Definições / Significados */}
      <div className="space-y-3">
        <div>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
            Significados:
          </span>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-neutral-200 leading-relaxed">
            {definition.meanings.map((meaning, idx) => (
              <li key={idx} className="pl-1">
                <span className="font-medium text-neutral-100">{meaning}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Sinônimos */}
        {definition.synonyms && definition.synonyms.length > 0 && (
          <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3 text-indigo-400" /> Sinônimos:
            </span>
            {definition.synonyms.map((syn, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60"
              >
                {syn}
              </span>
            ))}
          </div>
        )}

        {/* Exemplo de Uso */}
        {definition.example && (
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-300 flex items-start gap-2">
            <Quote className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span className="italic">{definition.example}</span>
          </div>
        )}
      </div>

      {/* Rodapé do Dicionário */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
        <span>Dica: Continue lendo pressionando a barra de <strong>Espaço</strong>.</span>
        <button
          onClick={onClose}
          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
        >
          Continuar Leitura <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
