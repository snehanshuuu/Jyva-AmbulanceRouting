'use client';

import React from 'react';
import { useSimStore } from '@/store/useSimStore';
import { Ambulance as AmbIcon } from 'lucide-react';
import Link from 'next/link';

export function FleetList() {
  const { ambulances, activeAmbulanceId, selectAmbulance } = useSimStore();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            AVAILABLE
          </span>
        );
      case 'TRANSPORTING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse">
            TRANSPORTING
          </span>
        );
      case 'EN_ROUTE_SCENE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
            EN ROUTE
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Ambulance Fleet ({ambulances.length})
          </h2>
          <p className="text-[11px] text-slate-400">BLS &amp; ALS active telemetry</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {ambulances.map((amb) => {
          const isSelected = amb.id === activeAmbulanceId;
          return (
            <div
              key={amb.id}
              onClick={() => selectAmbulance(amb.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800">
                    <AmbIcon className={`h-4 w-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{amb.callSign}</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                        {amb.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block -mt-0.5">
                      Crew: {amb.paramedicName || 'On duty'}
                    </span>
                  </div>
                </div>

                <div>{getStatusBadge(amb.status)}</div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Speed: {amb.speedKmh ? `${amb.speedKmh} km/h` : 'Stationary'}</span>
                <Link
                  href={`/ambulance/${amb.id}`}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
