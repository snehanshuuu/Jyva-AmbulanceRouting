'use client';

import React from 'react';
import { useSimStore } from '@/store/useSimStore';
import { PriorityBadge } from '@/components/triage/PriorityBadge';
import { TrendSpark } from '@/components/triage/TrendSpark';
import { MapPin, Navigation } from 'lucide-react';
import Link from 'next/link';

export function IncidentList() {
  const { incidents, ambulances, selectAmbulance } = useSimStore();

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Incident Queue ({incidents.length})
          </h2>
          <p className="text-[11px] text-slate-400">Live emergency cases requiring transit</p>
        </div>
      </div>

      <div className="space-y-3">
        {incidents.map((inc) => {
          const assignedAmb = ambulances.find((a) => a.id === inc.assignedAmbulanceId);
          const priority = inc.patient?.priority || 'P2';
          const trend = inc.patient?.trend || 'STABLE';

          return (
            <div
              key={inc.id}
              className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={priority} size="sm" />
                    <span className="text-xs font-semibold text-white">{inc.title || inc.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{inc.address}</span>
                  </div>
                </div>

                <TrendSpark trend={trend} score={inc.patient?.score} />
              </div>

              {/* Patient complaint snippet */}
              {inc.patient && (
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-300">
                  <span className="text-slate-400 font-medium">Chief Complaint: </span>
                  {inc.patient.complaint}
                </div>
              )}

              {/* Bottom footer: assigned unit + action */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Navigation className="h-3 w-3 text-emerald-400" />
                  <span>
                    Unit:{' '}
                    <span className="text-slate-200 font-mono font-medium">
                      {assignedAmb ? assignedAmb.callSign : 'Unassigned'}
                    </span>
                  </span>
                </div>

                {assignedAmb && (
                  <Link
                    href={`/ambulance/${assignedAmb.id}`}
                    onClick={() => selectAmbulance(assignedAmb.id)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2"
                  >
                    Open Ambulance View &rarr;
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
