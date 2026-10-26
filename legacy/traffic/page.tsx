'use client';

import React from 'react';
import { useSimStore } from '@/store/useSimStore';
import { Zap } from 'lucide-react';
import { formatDurationS } from '@/lib/time';

export default function TrafficPanelPage() {
  const { signals, totalTimeSavedS } = useSimStore();

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'GREEN_HOLD':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            GREEN HOLD (PREEMPTED)
          </span>
        );
      case 'PREEMPT_REQUESTED':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            PREEMPT REQUESTED
          </span>
        );
      case 'RECOVERY':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-500/20 border border-blue-500/40 text-blue-300 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            RECOVERY (FLUSHING)
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            NORMAL ADAPTIVE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Traffic Signal Pre-emption Control
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              ROLE: TRAFFIC CONTROLLER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Corridor signal state machine monitoring, preemption timeline, and intersection delay mitigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Cumulative Delay Avoided: </span>
            <span className="font-bold text-base text-white">{formatDurationS(totalTimeSavedS)}</span>
          </div>
        </div>
      </div>

      {/* Signal State Machine Architecture Legend */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
          Autonomous Pre-emption State Machine Protocol
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="font-mono font-bold text-slate-300 block mb-1">1. NORMAL</span>
            <p className="text-slate-400 text-[11px]">
              Adaptive cycle based on time-of-day traffic model.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
            <span className="font-mono font-bold text-amber-300 block mb-1">2. PREEMPT REQUESTED</span>
            <p className="text-amber-300/80 text-[11px]">
              Triggered when ambulance ETA to intersection is &le; 40s.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
            <span className="font-mono font-bold text-emerald-300 block mb-1">3. GREEN HOLD</span>
            <p className="text-emerald-300/80 text-[11px]">
              Corridor signal locked green when ETA &le; 15s until cleared.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40">
            <span className="font-mono font-bold text-blue-300 block mb-1">4. RECOVERY</span>
            <p className="text-blue-300/80 text-[11px]">
              20s flush cycle to clear accumulated cross-traffic queues.
            </p>
          </div>
        </div>
      </div>

      {/* Intersections Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Monitored Intersections ({signals.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-800/70">
          {signals.map((sig) => (
            <div
              key={sig.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-950/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{sig.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    ID: {sig.id}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>Base Delay: {sig.baseDelayS}s</span>
                  <span>•</span>
                  <span>Coords: {sig.pos.lat.toFixed(4)}°N, {sig.pos.lng.toFixed(4)}°E</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {sig.activePreemptEtaS && sig.activePreemptEtaS > 0 ? (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">
                      Ambulance ETA
                    </span>
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {Math.round(sig.activePreemptEtaS)}s
                    </span>
                  </div>
                ) : null}

                <div>{getStateBadge(sig.state)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
