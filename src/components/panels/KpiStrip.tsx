'use client';

import React from 'react';
import { useSimStore } from '@/store/useSimStore';
import { Activity, Clock, Ambulance, Zap } from 'lucide-react';
import { formatDurationS } from '@/lib/time';

export function KpiStrip() {
  const { incidents, ambulances, totalTimeSavedS, signals } = useSimStore();

  const activeIncidents = incidents.filter((i) => i.state !== 'CLOSED').length;
  const availableAmbulances = ambulances.filter((a) => a.status === 'AVAILABLE').length;
  const preemptedSignals = signals.filter((s) => s.state === 'PREEMPT_REQUESTED' || s.state === 'GREEN_HOLD').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* KPI 1 */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Active Incidents</span>
          <Activity className="h-4 w-4 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">{activeIncidents}</span>
          <span className="text-[11px] text-rose-400 font-medium">1 P1 Critical</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Live emergency response queue</p>
      </div>

      {/* KPI 2 */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Time Saved (Corridor)</span>
          <Clock className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {formatDurationS(totalTimeSavedS)}
          </span>
          <span className="text-[11px] text-emerald-400/80 font-medium">vs baseline</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">A* + signal pre-emption advantage</p>
      </div>

      {/* KPI 3 */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Pre-empted Signals</span>
          <Zap className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-amber-400">{preemptedSignals}</span>
          <span className="text-[11px] text-slate-400">/ {signals.length} monitored</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Autonomous green hold state</p>
      </div>

      {/* KPI 4 */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Available Fleet</span>
          <Ambulance className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">{availableAmbulances}</span>
          <span className="text-[11px] text-blue-400">/ {ambulances.length} total units</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Ready for automated dispatch</p>
      </div>
    </div>
  );
}
