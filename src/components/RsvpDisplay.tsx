import React from 'react';

interface RsvpDisplayProps {
  word: string;
  nextWord?: string;
  theme: 'dark' | 'high-contrast' | 'sepia' | 'light';
  fontSize: 'md' | 'lg' | 'xl';
  showNextPreview: boolean;
}

export function splitOrp(word: string): { prefix: string; orp: string; suffix: string } {
  if (!word) return { prefix: '', orp: '', suffix: '' };
  
  const cleanWord = word.trim();
  const len = cleanWord.length;

  let orpIdx = 0;
  if (len <= 1) {
    orpIdx = 0;
  } else if (len <= 5) {
    orpIdx = 1;
  } else if (len <= 9) {
    orpIdx = 2;
  } else if (len <= 13) {
    orpIdx = 3;
  } else {
    orpIdx = 4;
  }

  const prefix = cleanWord.slice(0, orpIdx);
  const orp = cleanWord.charAt(orpIdx);
  const suffix = cleanWord.slice(orpIdx + 1);

  return { prefix, orp, suffix };
}

export const RsvpDisplay: React.FC<RsvpDisplayProps> = ({
  word,
  nextWord,
  theme,
  fontSize,
  showNextPreview,
}) => {
  const { prefix, orp, suffix } = splitOrp(word);

  const themeStyles = {
    dark: {
      bg: 'bg-neutral-950 border-neutral-800 text-neutral-100',
      crosshair: 'text-red-500',
      orpColor: 'text-red-500 font-extrabold',
      guideLines: 'border-neutral-800',
      preview: 'text-neutral-500',
    },
    'high-contrast': {
      bg: 'bg-black border-yellow-400 text-yellow-300',
      crosshair: 'text-yellow-400',
      orpColor: 'text-cyan-400 font-black',
      guideLines: 'border-yellow-500/40',
      preview: 'text-yellow-600',
    },
    sepia: {
      bg: 'bg-[#fbf0d9] border-[#e2d5b5] text-[#433422]',
      crosshair: 'text-amber-700',
      orpColor: 'text-amber-800 font-black',
      guideLines: 'border-[#dfd0ad]',
      preview: 'text-[#9c8266]',
    },
    light: {
      bg: 'bg-white border-neutral-200 text-neutral-900',
      crosshair: 'text-red-600',
      orpColor: 'text-red-600 font-extrabold',
      guideLines: 'border-neutral-200',
      preview: 'text-neutral-400',
    },
  }[theme];

  const fontSizeClass = {
    md: 'text-4xl md:text-5xl h-24',
    lg: 'text-5xl md:text-7xl h-32',
    xl: 'text-6xl md:text-8xl h-40',
  }[fontSize];

  return (
    <div
      className={`relative w-full rounded-2xl border-2 p-6 transition-colors shadow-2xl flex flex-col items-center justify-center select-none ${themeStyles.bg}`}
      style={{ minHeight: '340px' }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Guia Superior de Alinhamento ORP */}
      <div className="flex flex-col items-center mb-2">
        <span className={`text-base font-bold animate-pulse ${themeStyles.crosshair}`}>▼</span>
        <div className={`w-8 h-1 rounded-full opacity-60 bg-current ${themeStyles.crosshair}`} />
      </div>

      {/* Caixa de Leitura Centralizada com ORP */}
      <div
        className={`relative w-full max-w-3xl flex items-center justify-center font-mono tracking-tight font-semibold overflow-hidden ${fontSizeClass}`}
      >
        {/* Lado Esquerdo (Prefixo alinhado à direita) */}
        <div className="w-1/2 text-right pr-0 whitespace-nowrap overflow-visible">
          <span>{prefix}</span>
        </div>

        {/* Letra Central Fixa (ORP) */}
        <div className="w-auto flex-shrink-0 text-center px-0.5 z-10">
          <span className={`${themeStyles.orpColor} underline decoration-2 underline-offset-8`}>
            {orp || '—'}
          </span>
        </div>

        {/* Lado Direito (Sufixo alinhado à esquerda) */}
        <div className="w-1/2 text-left pl-0 whitespace-nowrap overflow-visible">
          <span>{suffix}</span>
        </div>
      </div>

      {/* Guia Inferior de Alinhamento ORP */}
      <div className="flex flex-col items-center mt-2">
        <div className={`w-8 h-1 rounded-full opacity-60 bg-current ${themeStyles.crosshair}`} />
        <span className={`text-base font-bold animate-pulse ${themeStyles.crosshair}`}>▲</span>
      </div>

      {/* Palavra Seguinte (Prévia Opcional) */}
      {showNextPreview && nextWord && (
        <div className="absolute bottom-3 right-6 text-xs font-mono">
          <span className="opacity-60 mr-1.5">Próxima:</span>
          <span className={`font-semibold ${themeStyles.preview}`}>"{nextWord}"</span>
        </div>
      )}

      {/* Dica de Teclado */}
      <div className="absolute bottom-3 left-6 text-xs opacity-50 hidden sm:block">
        <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">Espaço</kbd> Play/Pause &nbsp;
        <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">← / →</kbd> Voltar/Avançar
      </div>
    </div>
  );
};
