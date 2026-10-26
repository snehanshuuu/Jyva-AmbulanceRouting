'use client';

import React, { useState } from 'react';
import { HospitalRecommendation } from '@/lib/types';
import HospitalRow from './HospitalRow';
import { Building2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { checkHospitalAlertWarning } from '@/engine/rank';

interface NearbyHospitalsCardProps {
  rankedHospitals: HospitalRecommendation[];
  selectedHospitalId?: string;
  onSelectHospital: (hospitalId: string) => void;
}

export function NearbyHospitalsCard({
  rankedHospitals,
  selectedHospitalId,
  onSelectHospital,
}: NearbyHospitalsCardProps) {
  const [showAll, setShowAll] = useState(false);

  // Find selected hospital or fallback to first recommended / top ranked
  const recommendedItem = rankedHospitals.find((r) => r.isRecommended);
  const activeHospitalId =
    selectedHospitalId ||
    recommendedItem?.hospital.id ||
    rankedHospitals[0]?.hospital.id;

  const activeItem = rankedHospitals.find((r) => r.hospital.id === activeHospitalId);

  // Check diversion or wait warnings for currently selected hospital
  const diversionWarning = activeItem
    ? checkHospitalAlertWarning(activeItem.hospital.id, rankedHospitals)
    : { hasWarning: false };

  // Compact display: Recommended card plus next 2 hospitals (total 3 by default)
  const visibleHospitals = showAll ? rankedHospitals : rankedHospitals.slice(0, 3);
  const hiddenCount = Math.max(0, rankedHospitals.length - 3);

  return (
    <section
      className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e2efe8] shadow-hospital-card"
      data-purpose="nearby-hospitals-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-[#ebf7f3] text-[#0f5146] flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-[#0f5146]" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-[#132a24]">Nearby hospitals</h2>
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#ebf7f3] text-[#0f5146] rounded-full border border-[#d2e4dc]">
            {rankedHospitals.length} ranked
          </span>
        </div>
        <span className="text-[11px] text-[#547169] font-medium hidden sm:inline">
          Sorted by total time (travel + wait)
        </span>
      </div>

      {/* Diversion Warning Banner */}
      {diversionWarning.hasWarning && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-2.5 text-xs">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">{diversionWarning.warningMessage}</p>
              {diversionWarning.suggestedHospital && (
                <p className="text-rose-700 mt-0.5">
                  Suggested alternative: <strong>{diversionWarning.suggestedHospital.shortName || diversionWarning.suggestedHospital.name}</strong>
                </p>
              )}
            </div>
          </div>
          {diversionWarning.suggestedHospital && (
            <button
              type="button"
              onClick={() => onSelectHospital(diversionWarning.suggestedHospital!.id)}
              className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-full text-[11px] transition shrink-0 cursor-pointer"
            >
              Reroute
            </button>
          )}
        </div>
      )}

      {/* Ranked Hospitals List: compact by default */}
      <div className="space-y-2">
        {visibleHospitals.map((item) => (
          <HospitalRow
            key={item.hospital.id}
            item={item}
            isSelected={item.hospital.id === activeHospitalId}
            onSelect={onSelectHospital}
          />
        ))}
      </div>

      {/* Show more / Show less toggle */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2.5 py-1.5 px-3 bg-[#f6fbf9] hover:bg-[#ebf7f3] border border-[#d9ebe2] text-[#0f5146] text-xs font-semibold rounded-full transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
        >
          <span>{showAll ? 'Show less' : `Show ${hiddenCount} more hospitals`}</span>
          {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </section>
  );
}

export default NearbyHospitalsCard;
