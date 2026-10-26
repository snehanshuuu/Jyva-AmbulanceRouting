'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useJyvaStore } from '@/store/useJyvaStore';
import { Hospital } from '@/lib/types';

// Dynamic import of NavMap with SSR disabled
const NavMap = dynamic(() => import('@/components/map/NavMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 w-full h-full bg-[#f8faf9] flex flex-col items-center justify-center border border-[#d9ebe2]">
      <div className="h-9 w-9 border-2 border-[#0f5146]/20 border-t-[#0f5146] rounded-full animate-spin mb-3" />
      <span className="text-xs text-[#0f5146] font-mono tracking-wider">Acquiring corridor telemetry...</span>
    </div>
  ),
});

interface HospitalRadarHudProps {
  hospital?: Hospital;
}

export default function HospitalRadarHud({ hospital }: HospitalRadarHudProps) {
  const hospitals = useJyvaStore((s) => s.hospitals);
  const ambulances = useJyvaStore((s) => s.ambulances);
  const activeHospitalId = useJyvaStore((s) => s.activeHospitalId);
  const incomingTrips = useJyvaStore((s) => s.incomingTrips);

  const currentHospital =
    hospital || hospitals.find((h) => h.id === activeHospitalId) || hospitals[0];

  // Nearest critical / first inbound trip to this hospital
  const hospitalIncoming = incomingTrips.filter(
    (t) => t.destinationHospitalId === currentHospital?.id && t.status !== 'ARRIVED'
  );
  const nextTrip = hospitalIncoming[0] || incomingTrips[0];
  const nextAmb = ambulances.find((a) => a.id === nextTrip?.ambulanceId);
  const nextEtaMin = nextTrip?.etaSec ? Math.max(1, Math.round(nextTrip.etaSec / 60)) : 6;
  const nextSpeed = nextAmb?.speedKmh || 64;
  const nextDist = ((nextEtaMin * nextSpeed) / 60).toFixed(1);

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden relative border border-[#e2efe8] bg-white shadow-sm h-full min-h-0">
      {/* FLOATING HUD TOP HEADER */}
      <div className="shrink-0 relative z-20 px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 bg-white/95 backdrop-blur-md border-b border-[#e2efe8]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
          <div>
            <h3 className="text-xs font-black text-[#132a24] tracking-tight">
              Incoming Fleet Vectors &amp; Overview
            </h3>
            <p className="text-[10px] text-[#547169] font-medium">
              MapLibre GL radar tracking inbound units to {currentHospital?.shortName || currentHospital?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#daf2e8] text-[#0f5146] border border-[#bce7d6]">
            {hospitalIncoming.length} En Route
          </span>
        </div>
      </div>

      {/* MAP / RADAR BODY - Fills container completely without forcing height */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-[#f8faf9]">
        <NavMap
          mode="overview"
          destinationHospitalId={currentHospital?.id}
          showHospitals={true}
          showRoute={true}
          showJams={true}
        />
      </div>

      {/* FLOATING NEXT-ARRIVAL BANNER / SUMMARY STRIP */}
      <div className="relative z-20 p-3.5 bg-white border-t border-[#e2efe8]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Next Inbound */}
          <div className="p-3 rounded-2xl bg-[#f6fbf9] border border-[#d9ebe2] shadow-xs">
            <span className="text-[10px] text-[#547169] uppercase block font-bold tracking-wider">
              Next Inbound Arrival
            </span>
            <span className="text-sm font-extrabold text-[#0f5146] mt-1 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              {nextTrip?.ambulanceId || 'AMB-014'} • {nextEtaMin} MIN ETA
            </span>
          </div>

          {/* Card 2: Distance & Speed */}
          <div className="p-3 rounded-2xl bg-[#f6fbf9] border border-[#d9ebe2] shadow-xs">
            <span className="text-[10px] text-[#547169] uppercase block font-bold tracking-wider">
              Vector Distance &amp; Speed
            </span>
            <span className="text-sm font-extrabold text-[#132a24] mt-1 block truncate font-mono">
              {nextDist} km • {nextSpeed} km/h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
