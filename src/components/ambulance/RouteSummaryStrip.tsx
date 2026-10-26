'use client';

import React from 'react';
import { RoutePlan } from '@/lib/types';
import { Zap, ArrowUpRight } from 'lucide-react';

interface RouteSummaryStripProps {
  route?: RoutePlan | null;
  destinationHospitalName?: string;
  timeSavedMin?: number;
  isRerouted?: boolean;
  onViewFullRoute?: () => void;
}

export function RouteSummaryStrip({
  route,
  destinationHospitalName = 'Sion Hospital',
  timeSavedMin = 3,
  isRerouted = false,
  onViewFullRoute,
}: RouteSummaryStripProps) {
  const etaMinutes = route?.etaS ? Math.max(1, Math.round(route.etaS / 60)) : 6;
  const distanceKm = route?.distanceM ? (route.distanceM / 1000).toFixed(1) : '4.2';

  // Extract reroute subtitle reason if available
  const routeReason =
    route?.reasons?.find((r) => r.toLowerCase().includes('reroute') || r.toLowerCase().includes('flyover') || r.toLowerCase().includes('bypass') || r.toLowerCase().includes('matunga')) ||
    'Rerouted via Matunga Central link';

  return (
    <div className="flex items-center justify-between w-full" data-purpose="route-metrics-strip">
      <div className="flex items-center space-x-6">
        {/* Big ETA Readout */}
        <div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-4xl font-black text-[#132a24] tracking-tight font-mono">{etaMinutes}</span>
            <span className="text-base font-bold text-[#547169]">MIN</span>
          </div>
          <p className="text-xs text-[#547169] font-medium">ETA to {destinationHospitalName}</p>
        </div>

        <div className="h-10 w-[1px] bg-[#d9ebe2]"></div>

        {/* Distance Stats */}
        <div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-[#132a24] font-mono">{distanceKm}</span>
            <span className="text-sm font-bold text-[#547169]">KM</span>
          </div>
          <p className="text-xs text-[#547169] font-medium">Distance remaining</p>
        </div>

        <div className="h-10 w-[1px] bg-[#d9ebe2] hidden sm:block"></div>

        {/* Savings Badge: displayed only after a reroute has happened */}
        {isRerouted ? (
          <div className="hidden sm:block">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#c6f3e3] text-[#0a4239] border border-[#a6e6cf]">
              <Zap className="w-3.5 h-3.5 text-[#0f5146] fill-[#0f5146]" />
              {timeSavedMin > 0 ? `${timeSavedMin} min saved vs congested route` : 'Detour active'}
            </span>
            <p className="text-xs text-[#547169] font-medium mt-1">{routeReason}</p>
          </div>
        ) : (
          <div className="hidden sm:block">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#edf7f3] text-[#0f5146] border border-[#d2e4dc]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>Direct emergency route</span>
            </span>
            <p className="text-xs text-[#547169] font-medium mt-1">Direct transit to {destinationHospitalName}</p>
          </div>
        )}
      </div>

      {/* View Full Route CTA */}
      <button
        type="button"
        onClick={onViewFullRoute}
        className="px-5 py-2.5 bg-white hover:bg-[#eef7f3] text-[#0f5146] text-xs font-semibold rounded-full border border-[#d2e4dc] shadow-hospital-pill transition flex items-center space-x-2 cursor-pointer"
      >
        <span>View Full Route</span>
        <div className="w-5 h-5 rounded-full bg-[#ebf7f3] flex items-center justify-center text-[#0f5146]">
          <ArrowUpRight className="w-3 h-3 text-[#0f5146]" />
        </div>
      </button>
    </div>
  );
}

export default RouteSummaryStrip;
