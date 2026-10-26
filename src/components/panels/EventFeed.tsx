'use client';

import React from 'react';
import { useSimStore } from '@/store/useSimStore';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function EventFeed() {
  const feed = useSimStore((s) => s.feed);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />;
      case 'INFO':
      default:
        return <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Live Coordination Feed
          </h2>
          <p className="text-[11px] text-slate-400">Realtime inter-agency events &amp; telemetry</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] font-mono text-emerald-400">STREAMING</span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {feed.map((msg) => (
          <div
            key={msg.id}
            className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 hover:bg-slate-950/90 transition-colors"
          >
            {getIcon(msg.type)}
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white truncate">{msg.title}</span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{msg.time}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{msg.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
