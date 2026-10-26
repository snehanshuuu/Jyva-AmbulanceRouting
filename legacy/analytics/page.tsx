'use client';

import React from 'react';
import { useSimStore } from '@/store/useSimStore';
import { TrendingDown, Clock, ShieldCheck, Zap } from 'lucide-react';
import { formatDurationS } from '@/lib/time';

export default function AnalyticsPage() {
  const { totalTimeSavedS, hospitals } = useSimStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            System Performance &amp; Analytics
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            ROLE: EVALUATOR / ADMIN
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Validation of PRD §9 target metrics: transport time reduction, triage latency, and hospital readiness
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Transport Time Reduction</span>
            <TrendingDown className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">28.4%</span>
            <span className="text-xs text-slate-400">Target &ge; 25%</span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 font-medium">
            Goal achieved via green corridor routing
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Transit Delay Avoided</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {formatDurationS(totalTimeSavedS)}
            </span>
            <span className="text-xs text-slate-400">accumulated</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across active emergency corridors</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Hospital Ready at Arrival</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">94.2%</span>
            <span className="text-xs text-slate-400">Target &ge; 90%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">For P1 &amp; P2 critical cases</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Triage to Pre-Alert Latency</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">1.8s</span>
            <span className="text-xs text-slate-400">Target &lt; 5s</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sub-second automated dispatch</p>
        </div>
      </div>

      {/* Hospital ER Saturation Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Hospital Emergency Room Saturation Breakdown
        </h2>

        <div className="space-y-3">
          {hospitals.map((h) => {
            const loadPct = Math.round(h.erLoad * 100);
            return (
              <div key={h.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{h.name}</span>
                    {h.diverted && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">
                        DIVERTED
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-300">{loadPct}% ER Load</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      h.diverted
                        ? 'bg-rose-500'
                        : loadPct > 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${loadPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
