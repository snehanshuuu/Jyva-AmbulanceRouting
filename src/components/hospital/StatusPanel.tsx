'use client';

import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Minus,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { useJyvaStore } from '@/store/useJyvaStore';
import { Hospital } from '@/lib/types';

interface StatusPanelProps {
  hospital?: Hospital;
}

export default function StatusPanel({ hospital }: StatusPanelProps) {
  const activeHospitalId = useJyvaStore((s) => s.activeHospitalId);
  const hospitals = useJyvaStore((s) => s.hospitals);
  const updateHospitalStatus = useJyvaStore((s) => s.updateHospitalStatus);

  const currentHospital =
    hospital || hospitals.find((h) => h.id === activeHospitalId) || hospitals[0];

  const waitingMin = currentHospital?.waitingMin ?? 3;
  const freeErBeds = currentHospital?.freeErBeds ?? 6;
  const freeIcuBeds = currentHospital?.freeIcuBeds ?? 2;
  const isDiverted = currentHospital?.diverted ?? false;
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const totalEr = currentHospital?.capacity?.erBedsTotal ?? 24;
  const totalIcu = currentHospital?.capacity?.icuBedsTotal ?? 8;

  const erPercentage = Math.min(100, Math.round(((totalEr - freeErBeds) / totalEr) * 100));
  const icuPercentage = Math.min(100, Math.round(((totalIcu - freeIcuBeds) / totalIcu) * 100));

  const showSyncFeedback = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleWaitChange = (delta: number) => {
    const nextWait = Math.max(0, waitingMin + delta);
    updateHospitalStatus(currentHospital.id, { waitingMin: nextWait });
    showSyncFeedback(`Wait time updated to ${nextWait}m • Broadcasted to fleet`);
  };

  const handleErBedChange = (delta: number) => {
    const nextEr = Math.max(0, Math.min(totalEr, freeErBeds + delta));
    updateHospitalStatus(currentHospital.id, { freeErBeds: nextEr });
    showSyncFeedback(`Free ER beds updated to ${nextEr} • Broadcasted to fleet`);
  };

  const handleIcuBedChange = (delta: number) => {
    const nextIcu = Math.max(0, Math.min(totalIcu, freeIcuBeds + delta));
    updateHospitalStatus(currentHospital.id, { freeIcuBeds: nextIcu });
    showSyncFeedback(`Free ICU beds updated to ${nextIcu} • Broadcasted to fleet`);
  };

  const handleDivertToggle = () => {
    const nextDiverted = !isDiverted;
    updateHospitalStatus(currentHospital.id, {
      diverted: nextDiverted,
      divertReason: nextDiverted ? 'ER trauma capacity saturated • Diverting' : undefined,
    });
    showSyncFeedback(
      nextDiverted
        ? '⚠️ Hospital DIVERTED: excluded from ambulance rankings'
        : '✅ Hospital ACTIVE: receiving inbound ambulances'
    );
  };

  return (
    <div className="bg-white border border-[#e1eee7] rounded-3xl p-5 shadow-[0_4px_20px_-2px_rgba(15,81,70,0.04),0_2px_6px_-1px_rgba(15,81,70,0.02)] relative">
      {/* Sync Toast Pill */}
      {syncNotice && (
        <div className="absolute top-3 right-5 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f5146] text-[#64f9bc] text-[11px] font-semibold shadow-md animate-fadeIn">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#edf4f0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#daf2e8] flex items-center justify-center text-[#0f5146]">
            <Building2 className="w-4 h-4 text-[#0f5146]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#132a24] tracking-tight">Hospital Status & Capacity</h2>
            <p className="text-xs text-[#547169] mt-0.5">
              {currentHospital.name} • Shift Active (Trauma Level 1)
            </p>
          </div>
        </div>

        <button
          onClick={() => showSyncFeedback('Sync refreshed with regional coordinator')}
          className="w-8 h-8 rounded-full bg-white border border-[#dbece4] text-[#132a24] flex items-center justify-center hover:bg-[#edf7f3] transition-colors cursor-pointer"
          title="Refresh capacity status"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3 Metrics Grid (Matching Reference Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3.5">
        {/* Metric 1: Editable Waiting Time Stepper */}
        <div className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#e1eee7] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#547169] uppercase tracking-wider font-semibold">
              ER Wait Time
            </span>
          </div>
          <div className="flex items-center justify-between my-1">
            <span className="text-2xl font-extrabold text-[#132a24]">
              {waitingMin}
              <span className="text-xs font-normal text-[#547169] ml-0.5">m</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleWaitChange(-1)}
                className="w-6 h-6 rounded-full bg-white border border-[#dbece4] flex items-center justify-center text-[#132a24] hover:bg-[#daf2e8] active:scale-90 transition-all shadow-xs cursor-pointer"
                title="Decrease wait time"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleWaitChange(1)}
                className="w-6 h-6 rounded-full bg-white border border-[#dbece4] flex items-center justify-center text-[#132a24] hover:bg-[#daf2e8] active:scale-90 transition-all shadow-xs cursor-pointer"
                title="Increase wait time"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {waitingMin <= 15 ? '-4m vs average' : '+6m surge load'}
          </span>
        </div>

        {/* Metric 2: Free ER Beds */}
        <div className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#e1eee7] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#547169] uppercase tracking-wider font-semibold">
              Free ER Beds
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleErBedChange(-1)}
                className="w-5 h-5 rounded-full bg-white border border-[#dbece4] flex items-center justify-center text-[#132a24] hover:bg-[#daf2e8] transition-all shadow-xs cursor-pointer"
                title="Admit patient (-1 ER bed)"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => handleErBedChange(1)}
                className="w-5 h-5 rounded-full bg-white border border-[#dbece4] flex items-center justify-center text-[#132a24] hover:bg-[#daf2e8] transition-all shadow-xs cursor-pointer"
                title="Discharge patient (+1 ER bed)"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[#132a24]">{freeErBeds}</span>
              <span className="text-xs text-[#547169] font-medium">/ {totalEr} Free Beds</span>
            </div>
          </div>
          {/* Tactile Bar Indicator */}
          <div className="w-full bg-[#dbece4] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#0f5146] h-full rounded-full transition-all duration-300"
              style={{ width: `${erPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Free ICU Beds */}
        <div className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#e1eee7] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#547169] uppercase tracking-wider font-semibold">
              Free ICU Beds
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleIcuBedChange(-1)}
                className="w-5 h-5 rounded-full bg-white border border-[#dbece4] flex items-center justify-center text-[#132a24] hover:bg-[#daf2e8] transition-all shadow-xs cursor-pointer"
                title="Admit ICU patient (-1 ICU bed)"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => handleIcuBedChange(1)}
                className="w-5 h-5 rounded-full bg-white border border-[#dbece4] flex items-center justify-center text-[#132a24] hover:bg-[#daf2e8] transition-all shadow-xs cursor-pointer"
                title="Discharge ICU patient (+1 ICU bed)"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-2xl font-extrabold ${freeIcuBeds <= 2 ? 'text-[#9d4300]' : 'text-[#132a24]'}`}
              >
                {freeIcuBeds}
              </span>
              <span className="text-xs text-[#547169] font-medium">/ {totalIcu} Free ICU</span>
            </div>
          </div>
          <div className="w-full bg-[#dbece4] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                freeIcuBeds <= 2 ? 'bg-amber-500' : 'bg-[#0f5146]'
              }`}
              style={{ width: `${icuPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Divert Switch Banner */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-colors ${
          isDiverted
            ? 'bg-red-50/80 border-red-200'
            : 'bg-[#f4fbf7] border-[#e1eee7]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
              isDiverted
                ? 'bg-red-100 border-red-300 text-red-600'
                : 'bg-white border-[#dbece4] text-[#0f5146]'
            }`}
          >
            {isDiverted ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#0f5146]" />
            )}
          </div>
          <div className="flex flex-col">
            <span
              className={`text-xs font-bold ${
                isDiverted ? 'text-red-700' : 'text-[#132a24]'
              }`}
            >
              {isDiverted ? 'Diverting Inbound: ON (Redirection Active)' : 'Accepting patients: ON'}
            </span>
            <span className="text-[11px] text-[#547169]">
              {isDiverted
                ? 'Ambulance ranking engine will divert non-critical units elsewhere'
                : 'Ambulances can select this hospital'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDivertToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isDiverted ? 'bg-red-500' : 'bg-[#0f5146]'
          }`}
          role="switch"
          aria-checked={!isDiverted}
          title={isDiverted ? 'Turn off divert' : 'Initiate divert'}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              !isDiverted ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
