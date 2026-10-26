import React from 'react';
import { PatientTrend } from '@/lib/types';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface TrendSparkProps {
  trend: PatientTrend;
  score?: number;
}

export function TrendSpark({ trend, score }: TrendSparkProps) {
  if (trend === 'DETERIORATING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
        <TrendingUp className="h-3.5 w-3.5 text-rose-400" />
        <span>Deteriorating {score ? `(Score: ${score})` : ''}</span>
      </span>
    );
  }

  if (trend === 'IMPROVING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
        <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
        <span>Improving {score ? `(Score: ${score})` : ''}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
      <Minus className="h-3.5 w-3.5 text-slate-400" />
      <span>Stable {score ? `(Score: ${score})` : ''}</span>
    </span>
  );
}
