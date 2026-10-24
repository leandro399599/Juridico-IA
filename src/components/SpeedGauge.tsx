import React from 'react';
import { Zap, Gauge, TrendingUp, Award, Clock } from 'lucide-react';

interface SpeedGaugeProps {
  wpm: number;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({ wpm }) => {
  const HUMAN_AVG = 220; // WPM padrão humano silencioso
  const ratio = Math.round((wpm / HUMAN_AVG) * 100);
  const multiplier = (wpm / HUMAN_AVG).toFixed(1);

  // Tempo economizado em relação à velocidade humana padrão
  // Se você lê a 440 WPM, gasta metade do tempo (50% economizado)
  const timeSavedPercent = wpm > HUMAN_AVG ? Math.min(75, Math.round((1 - HUMAN_AVG / wpm) * 100)) : 0;

  let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  let badgeTitle = 'Ritmo Humano Padrão';
  let badgeIcon = Gauge;

  if (wpm < 200) {
    badgeColor = 'bg-neutral-800 text-neutral-300 border-neutral-700';
    badgeTitle = 'Estudo Analítico Profundo';
  } else if (wpm <= 250) {
    badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    badgeTitle = 'Velocidade Humana Média (1.0x)';
  } else if (wpm <= 380) {
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    badgeTitle = '⚡ Leitor Dinâmico Avançado';
    badgeIcon = Zap;
  } else if (wpm <= 520) {
    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    badgeTitle = '🚀 Super Leitor Dinâmico';
    badgeIcon = TrendingUp;
  } else if (wpm <= 700) {
    badgeColor = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    badgeTitle = '⚡ Velocidade Supersônica';
    badgeIcon = Award;
  } else {
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    badgeTitle = '🧠 Hiperfoco Quântico';
    badgeIcon = Award;
  }

  const BadgeIconComponent = badgeIcon;

  // Posição no slider comparativo (escala 150 a 800)
  const percentOfMax = Math.min(100, Math.max(0, ((wpm - 150) / (800 - 150)) * 100));
  const humanMarkerPercent = ((220 - 150) / (800 - 150)) * 100;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              Indicador de Velocidade Relativa (Gamificação)
            </div>
            <div className="text-[11px] text-neutral-400">
              Comparação direta com a média humana padrão de leitura silenciosa (220 WPM)
            </div>
          </div>
        </div>

        {/* Badge Gamificado */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}
        >
          <BadgeIconComponent className="w-3.5 h-3.5" />
          <span>{badgeTitle}</span>
        </div>
      </div>

      {/* Barra de Progresso Comparativa com Marcador de Média Humana */}
      <div className="space-y-1">
        <div className="relative h-3 w-full bg-neutral-950 rounded-full overflow-visible border border-neutral-800">
          {/* Barra preenchida do usuário */}
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-200"
            style={{ width: `${percentOfMax}%` }}
          />

          {/* Marcador de Linha da Média Humana (220 WPM) */}
          <div
            className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-yellow-400 z-10"
            style={{ left: `${humanMarkerPercent}%` }}
            title="Média Humana Padrão (220 WPM)"
          >
            <div className="absolute -top-4 -left-7 bg-neutral-950 text-yellow-400 text-[9px] font-mono px-1 rounded border border-yellow-400/40 whitespace-nowrap">
              Média 220
            </div>
          </div>
        </div>

        {/* Métricas Numéricas em Destaque */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-emerald-400 text-sm">
              Ritmo: {ratio}%
            </span>
            <span className="text-neutral-400 text-[11px]">
              ({multiplier}x mais rápido que a média humana)
            </span>
          </div>

          {timeSavedPercent > 0 && (
            <div className="text-[11px] text-indigo-300 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-indigo-400" />
              Economia de ~{timeSavedPercent}% do tempo de estudo
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
