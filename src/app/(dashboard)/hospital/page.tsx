'use client';

import React, { useState } from 'react';
import { useJyvaStore } from '@/store/useJyvaStore';
import HospitalHeader from '@/components/hospital/HospitalHeader';
import StatusPanel from '@/components/hospital/StatusPanel';
import IncomingAmbulanceCard from '@/components/hospital/IncomingAmbulanceCard';
import HospitalRadarHud from '@/components/hospital/HospitalRadarHud';

type PriorityFilter = 'ALL' | 'CRITICAL' | 'URGENT' | 'STABLE';

export default function HospitalScreenPage() {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  const hospitals = useJyvaStore((s) => s.hospitals);
  const activeHospitalId = useJyvaStore((s) => s.activeHospitalId);
  const incomingTrips = useJyvaStore((s) => s.incomingTrips);

  const currentHospital =
    hospitals.find((h) => h.id === activeHospitalId) || hospitals[0];

  // Priority sorting: CRITICAL -> URGENT -> STABLE, then ETA ascending
  const priorityOrder: Record<string, number> = {
    CRITICAL: 1,
    P1: 1,
    URGENT: 2,
    P2: 2,
    P3: 2,
    STABLE: 3,
    P4: 3,
  };

  const sortedTrips = [...incomingTrips].sort((a, b) => {
    const pA = priorityOrder[a.priority || 'STABLE'] ?? 4;
    const pB = priorityOrder[b.priority || 'STABLE'] ?? 4;
    if (pA !== pB) return pA - pB;
    return (a.etaSec ?? 999) - (b.etaSec ?? 999);
  });

  // Filtered trips
  const filteredTrips = sortedTrips.filter((t) => {
    if (priorityFilter === 'ALL') return true;
    if (priorityFilter === 'CRITICAL') return t.priority === 'CRITICAL';
    if (priorityFilter === 'URGENT') return t.priority === 'URGENT';
    if (priorityFilter === 'STABLE') return t.priority === 'STABLE';
    return true;
  });

  // Priority counts for filter pills
  const totalInbound = incomingTrips.length;
  const criticalCount = incomingTrips.filter((t) => t.priority === 'CRITICAL').length;
  const urgentCount = incomingTrips.filter((t) => t.priority === 'URGENT').length;
  const stableCount = incomingTrips.filter((t) => t.priority === 'STABLE').length;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#ecf8f3] text-[#132a24] antialiased selection:bg-[#daf2e8]">
      {/* 1. TOP CLINICAL NAVIGATION BAR */}
      <HospitalHeader hospitalName={currentHospital?.name} />

      {/* 2. TWO-COLUMN WORKSPACE: LEFT TRIAGE + RIGHT HUD MAP */}
      <main className="flex-1 min-h-0 px-3 sm:px-4 lg:px-6 pb-2 pt-1.5 grid grid-cols-12 gap-3 max-w-[1800px] mx-auto w-full overflow-hidden">
        {/* LEFT COLUMN: CAPACITY & INCOMING AMBULANCES (approx 41% / 5 cols) */}
        <div className="col-span-12 xl:col-span-5 h-full min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {/* Hospital Status & Capacity Panel */}
          <div className="shrink-0">
            <StatusPanel hospital={currentHospital} />
          </div>

          {/* Incoming Ambulances Section: fills remaining height, scrolls internally */}
          <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#e1eee7] p-3 shadow-xs overflow-hidden">
            {/* Header & Priority Filter Chips */}
            <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-[#eef5f1] flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#132a24] tracking-tight">
                  Incoming Ambulances
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#daf2e8] text-[10px] text-[#0f5146] font-bold">
                  {totalInbound} inbound
                </span>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setPriorityFilter('ALL')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer shadow-xs ${
                    priorityFilter === 'ALL'
                      ? 'bg-[#0f5146] text-white hover:bg-[#0c433a]'
                      : 'bg-white border border-[#e1eee7] text-[#547169] hover:text-[#132a24] hover:bg-[#f4fbf7]'
                  }`}
                >
                  All ({totalInbound})
                </button>

                <button
                  onClick={() => setPriorityFilter('CRITICAL')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs ${
                    priorityFilter === 'CRITICAL'
                      ? 'bg-[#c5221f] text-white'
                      : 'bg-white border border-[#e1eee7] text-[#547169] hover:text-[#132a24] hover:bg-[#f4fbf7]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      priorityFilter === 'CRITICAL' ? 'bg-white' : 'bg-[#c5221f]'
                    }`}
                  />
                  Critical ({criticalCount})
                </button>

                <button
                  onClick={() => setPriorityFilter('URGENT')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs ${
                    priorityFilter === 'URGENT'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-[#e1eee7] text-[#547169] hover:text-[#132a24] hover:bg-[#f4fbf7]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      priorityFilter === 'URGENT' ? 'bg-white' : 'bg-amber-500'
                    }`}
                  />
                  Urgent ({urgentCount})
                </button>

                <button
                  onClick={() => setPriorityFilter('STABLE')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs ${
                    priorityFilter === 'STABLE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-[#e1eee7] text-[#547169] hover:text-[#132a24] hover:bg-[#f4fbf7]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      priorityFilter === 'STABLE' ? 'bg-white' : 'bg-emerald-500'
                    }`}
                  />
                  Stable ({stableCount})
                </button>
              </div>
            </div>

            {/* Ambulance Cards Stream - Scrolls smoothly with its own scrollbar */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {filteredTrips.length === 0 ? (
                <div className="p-6 text-center bg-[#fbfdfc] border border-[#e1eee7] rounded-2xl text-xs text-[#547169]">
                  No incoming ambulances currently match the selected priority filter.
                </div>
              ) : (
                filteredTrips.map((trip) => (
                  <IncomingAmbulanceCard key={trip.id} trip={trip} />
                ))
              )}
            </div>

            {/* Section Footer Note */}
            <p className="shrink-0 text-[10px] text-[#7a958e] italic pt-1 text-center">
              Demo data, not medical advice • {currentHospital?.name} Dispatch
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: REFINED CLINICAL RADAR HUD (approx 59% / 7 cols) */}
        <div className="col-span-12 xl:col-span-7 h-full min-h-0 flex flex-col overflow-hidden">
          <HospitalRadarHud hospital={currentHospital} />
        </div>
      </main>

      {/* 3. DOCKED FOOTER */}
      <footer className="shrink-0 w-full px-6 py-1.5 flex justify-between items-center bg-[#ecf8f3] text-[#7a958e] text-xs border-t border-[#d5e7de]">
        <div className="w-full flex items-center justify-center">
          <p className="text-[11px] text-[#547169] text-center">
            Demo data, not medical advice • Jyva Emergency Coordination Network
          </p>
        </div>
      </footer>
    </div>
  );
}
