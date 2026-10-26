'use client';

import React from 'react';
import { HospitalRecommendation } from '@/lib/types';

interface HospitalRowProps {
  item: HospitalRecommendation;
  isSelected?: boolean;
  onSelect: (hospitalId: string) => void;
}

export function HospitalRow({ item, isSelected = false, onSelect }: HospitalRowProps) {
  const { hospital, etaMinutes, waitingMinutes, totalMin, isEligible, isRecommended, reason, shortReason } = item;

  // 1. Ineligible / Filtered Out Hospital (Disabled Row)
  if (!isEligible) {
    const reasonText = shortReason || (hospital.diverted ? 'Not accepting' : 'Unavailable');
    return (
      <div
        className="rounded-2xl p-3.5 border bg-[#fafafa] border-[#e2efe8] opacity-60 cursor-not-allowed select-none flex items-center justify-between"
        data-purpose="hospital-row-disabled"
      >
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-[#132a24] text-sm">
              {hospital.shortName || hospital.name}
            </h3>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              {reasonText}
            </span>
          </div>
          <p className="text-xs text-[#547169] mt-1">
            Travel: {etaMinutes}m • Wait: {waitingMinutes}m •{' '}
            <span className="font-bold text-[#132a24]">Total: {totalMin} min</span>
          </p>
        </div>

        <div>
          <span className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full">
            {reasonText}
          </span>
        </div>
      </div>
    );
  }

  // 2. Currently Selected Hospital (Active Target)
  if (isSelected) {
    return (
      <div
        className="relative rounded-2xl p-4 bg-[#f2faf7] border border-[#bee2d4] shadow-hospital-pill transition"
        data-purpose="hospital-row-active"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="font-bold text-[#132a24] text-base">
                {hospital.shortName || hospital.name}
              </h3>
              {isRecommended && (
                <span className="bg-[#c6f3e3] text-[#0a4239] text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-[#a6e6cf]">
                  Recommended
                </span>
              )}
            </div>
            {isRecommended && (
              <p className="text-xs text-[#0f5146] font-medium mt-1">
                {reason}
              </p>
            )}
          </div>

          {/* Active Target Pill */}
          <span className="px-3.5 py-1.5 bg-[#0f5146] text-white text-xs font-semibold rounded-full shadow-hospital-pill flex items-center space-x-1.5 shrink-0">
            <span>Active Target</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#64f9bc] animate-pulse"></span>
          </span>
        </div>

        {/* 3 Metric Boxes: Travel / Wait Time / Total Arrival */}
        <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#bee2d4] text-center">
          <div className="bg-white rounded-xl py-1.5 px-2 border border-[#d2e4dc]/70 shadow-hospital-pill">
            <p className="text-[10px] text-[#547169] font-semibold uppercase tracking-wider">Travel</p>
            <p className="text-xs font-black text-[#132a24] font-mono">{etaMinutes} min</p>
          </div>
          <div className="bg-white rounded-xl py-1.5 px-2 border border-[#d2e4dc]/70 shadow-hospital-pill">
            <p className="text-[10px] text-[#547169] font-semibold uppercase tracking-wider">Wait Time</p>
            <p className="text-xs font-black text-[#132a24] font-mono">{waitingMinutes} min</p>
          </div>
          <div className="bg-[#c6f3e3] rounded-xl py-1.5 px-2 border border-[#a6e6cf]">
            <p className="text-[10px] text-[#0a4239] uppercase font-black tracking-wider">Total Arrival</p>
            <p className="text-xs font-black text-[#0f5146] font-mono">{totalMin} min</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Eligible, Non-Selected Hospital (Alternative Option)
  return (
    <div
      onClick={() => onSelect(hospital.id)}
      className="rounded-2xl p-3.5 bg-white hover:bg-[#f6fbf9] border border-[#e2efe8] transition flex items-center justify-between cursor-pointer shadow-xs"
      data-purpose="hospital-row-eligible"
    >
      <div>
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <h3 className="font-bold text-[#132a24] text-sm">
            {hospital.shortName || hospital.name}
          </h3>
          {isRecommended ? (
            <span className="bg-[#c6f3e3] text-[#0a4239] text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-[#a6e6cf]">
              Recommended
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[#0f5146] bg-[#c6f3e3] px-2 py-0.5 rounded-full">
              {hospital.specialties.includes('TRAUMA') ? 'Trauma Ready' : 'ER Ready'}
            </span>
          )}
        </div>
        {isRecommended && (
          <p className="text-xs text-[#0f5146] font-medium mt-0.5">
            {reason}
          </p>
        )}
        <p className="text-xs text-[#547169] mt-0.5">
          Travel: {etaMinutes}m • Wait: {waitingMinutes}m •{' '}
          <span className="font-bold text-[#132a24]">Total: {totalMin} min</span>
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(hospital.id);
          }}
          className="px-4 py-1.5 text-xs font-semibold text-[#0f5146] bg-white hover:bg-[#ebf7f3] border border-[#d2e4dc] rounded-full shadow-hospital-pill transition cursor-pointer shrink-0"
        >
          Select
        </button>
      </div>
    </div>
  );
}

export default HospitalRow;
