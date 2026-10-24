import React, { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { lookupWord, WordDefinition } from '../utils/dictionary';

interface RsvpDisplayProps {
  word: string;
  nextWord?: string;
  theme: 'dark' | 'high-contrast' | 'sepia' | 'light';
  fontSize: 'md' | 'lg' | 'xl';
  showNextPreview: boolean;
  onWordClick?: (word: string) => void;
}

/**
 * Algoritmo robusto de divisão do Ponto de Reconhecimento Ótimo (ORP).
 * Trata palavras compostas com hífen (ex: "Bem-vindo", "guarda-chuva"),
 * acentuações e pontuações sem criar lacunas ou separações visuais anormais.
 */
export function splitOrp(rawWord: string): { prefix: string; orp: string; suffix: string } {
  if (!rawWord) return { prefix: '', orp: '', suffix: '' };

  const word = rawWord.trim();
  if (word.length <= 1) {
    return { prefix: '', orp: word, suffix: '' };
  }

  // Detecta pontuação inicial (ex: «, ", (, [)
  let leadingPunct = '';
  let coreWord = word;
  const leadMatch = word.match(/^([«"'({\[]+)/);
  if (leadMatch) {
    leadingPunct = leadMatch[1];
    coreWord = word.slice(leadingPunct.length);
  }

  // Detecta pontuação final (ex: », ", ), ], ., ,, !, ?)
  let trailingPunct = '';
  const trailMatch = coreWord.match(/([»"')}\].,;:!?-]+)$/);
  if (trailMatch) {
    trailingPunct = trailMatch[1];
    coreWord = coreWord.slice(0, -trailingPunct.length);
  }

  if (coreWord.length === 0) {
    return { prefix: leadingPunct, orp: trailingPunct.charAt(0) || '', suffix: trailingPunct.slice(1) };
  }

  // Se for palavra composta com hífen (ex: "Bem-vindo", "segunda-feira")
  // calcula o ORP no primeiro segmento para leitura natural fluida
  let orpIdx = 0;
  const hyphenIdx = coreWord.indexOf('-');
  const effectiveLen = hyphenIdx > 1 ? hyphenIdx : coreWord.length;

  if (effectiveLen <= 1) {
    orpIdx = 0;
  } else if (effectiveLen <= 5) {
    orpIdx = 1;
  } else if (effectiveLen <= 9) {
    orpIdx = 2;
  } else if (effectiveLen <= 13) {
    orpIdx = 3;
  } else {
    orpIdx = 4;
  }

  // Garante que o orpIdx seja um caractere válido dentro do coreWord
  orpIdx = Math.min(orpIdx, coreWord.length - 1);

  const prefix = leadingPunct + coreWord.slice(0, orpIdx);
  const orp = coreWord.charAt(orpIdx);
  const suffix = coreWord.slice(orpIdx + 1) + trailingPunct;

  return { prefix, orp, suffix };
}

export const RsvpDisplay: React.FC<RsvpDisplayProps> = ({
  word,
  nextWord,
  theme,
  fontSize,
  showNextPreview,
  onWordClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { prefix, orp, suffix } = splitOrp(word);

  const definition: WordDefinition = lookupWord(word);

  const themeStyles = {
    dark: {
      bg: 'bg-neutral-950 border-neutral-800 text-neutral-100',
      crosshair: 'text-red-500',
      orpColor: 'text-red-500 font-extrabold',
      preview: 'text-neutral-500',
      tooltipBg: 'bg-neutral-900 border-neutral-700 text-neutral-100',
    },
    'high-contrast': {
      bg: 'bg-black border-yellow-400 text-yellow-300',
      crosshair: 'text-yellow-400',
      orpColor: 'text-cyan-400 font-black',
      preview: 'text-yellow-600',
      tooltipBg: 'bg-neutral-900 border-yellow-400 text-yellow-300',
    },
    sepia: {
      bg: 'bg-[#fbf0d9] border-[#e2d5b5] text-[#433422]',
      crosshair: 'text-amber-700',
      orpColor: 'text-amber-800 font-black',
      preview: 'text-[#9c8266]',
      tooltipBg: 'bg-[#f4e4c3] border-[#d8c29d] text-[#3d2d1b]',
    },
    light: {
      bg: 'bg-white border-neutral-200 text-neutral-900',
      crosshair: 'text-red-600',
      orpColor: 'text-red-600 font-extrabold',
      preview: 'text-neutral-400',
      tooltipBg: 'bg-white border-neutral-300 text-neutral-900 shadow-xl',
    },
  }[theme];

  const fontSizeClass = {
    md: 'text-4xl md:text-5xl h-24',
    lg: 'text-5xl md:text-7xl h-28',
    xl: 'text-6xl md:text-8xl h-36',
  }[fontSize];

  return (
    <div
      className={`relative w-full rounded-2xl border-2 p-5 transition-colors shadow-2xl flex flex-col items-center justify-center select-none ${themeStyles.bg}`}
      style={{ minHeight: '260px' }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Guia Superior de Alinhamento ORP */}
      <div className="flex flex-col items-center mb-1">
        <span className={`text-base font-bold animate-pulse ${themeStyles.crosshair}`}>▼</span>
        <div className={`w-8 h-1 rounded-full opacity-60 bg-current ${themeStyles.crosshair}`} />
      </div>

      {/* Caixa de Leitura Centralizada: PALAVRA COMO UNIDADE CONTÍNUA SEM LACUNAS */}
      <div
        onClick={() => onWordClick && onWordClick(word)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative max-w-full cursor-pointer flex items-center justify-center font-mono tracking-normal font-semibold overflow-visible px-4 py-2 rounded-xl hover:bg-white/5 transition-all ${fontSizeClass}`}
        title="Clique para abrir o dicionário desta palavra na parte inferior"
      >
        {/* Contêiner único contíguo: as letras ficam unidas sem nenhuma separação artificial */}
        <div className="inline-flex items-baseline justify-center whitespace-nowrap leading-none tracking-tight">
          <span className="whitespace-pre">{prefix}</span>
          <span className={`${themeStyles.orpColor} underline decoration-2 underline-offset-8 px-[1px]`}>
            {orp || '—'}
          </span>
          <span className="whitespace-pre">{suffix}</span>
        </div>

        {/* Balão de Dicionário Flutuante (Tooltip no Hover) */}
        {isHovered && word && word.trim() !== '' && (
          <div
            className={`absolute -top-28 left-1/2 -translate-x-1/2 z-50 w-72 md:w-80 p-3.5 rounded-xl border text-left shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${themeStyles.tooltipBg}`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <BookOpen className="w-3.5 h-3.5" /> {definition.word}
              </span>
              <span className="text-[10px] font-normal opacity-70 italic">{definition.class}</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90 line-clamp-3">
              {definition.meanings[0]}
            </p>
            <div className="mt-2 text-[10px] text-indigo-300 font-semibold flex items-center justify-between">
              <span>💡 Clique para ver o dicionário completo</span>
              <span className="text-xs">↗</span>
            </div>
          </div>
        )}
      </div>

      {/* Guia Inferior de Alinhamento ORP */}
      <div className="flex flex-col items-center mt-1">
        <div className={`w-8 h-1 rounded-full opacity-60 bg-current ${themeStyles.crosshair}`} />
        <span className={`text-base font-bold animate-pulse ${themeStyles.crosshair}`}>▲</span>
      </div>

      {/* Palavra Seguinte (Prévia Sutil) */}
      {showNextPreview && nextWord && (
        <div className="absolute bottom-3 right-6 text-xs font-mono hidden sm:block">
          <span className="opacity-60 mr-1.5">Próxima:</span>
          <span className={`font-semibold ${themeStyles.preview}`}>"{nextWord}"</span>
        </div>
      )}

      {/* Dica de Teclado & Dicionário */}
      <div className="absolute bottom-3 left-6 text-xs opacity-60 hidden sm:flex items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] text-indigo-300">
          <BookOpen className="w-3 h-3" /> Passe o mouse ou clique para o dicionário
        </span>
      </div>
    </div>
  );
};
