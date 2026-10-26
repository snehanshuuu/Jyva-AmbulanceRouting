'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface VitalsTileProps {
  label: string;
  value: number;
  unit: string;
  subtext?: string;
  isCritical?: boolean;
  isElevated?: boolean;
  alertText?: string;
  icon?: LucideIcon;
  onChange?: (val: number) => void;
  min?: number;
  max?: number;
  secondaryValue?: number;
  secondaryOnChange?: (val: number) => void;
  secondaryMin?: number;
  secondaryMax?: number;
}

export function VitalsTile({
  label,
  value,
  unit,
  subtext,
  isCritical = false,
  isElevated = false,
  alertText,
  icon: Icon,
  onChange,
  min,
  max,
  secondaryValue,
  secondaryOnChange,
  secondaryMin,
  secondaryMax,
}: VitalsTileProps) {
  const containerBg = isCritical
    ? 'bg-[#fff6f6] border-[#fecaca]'
    : isElevated
      ? 'bg-[#fffdf5] border-[#fef08a]'
      : 'bg-[#f7faf8] border-[#e2efe8]';

  const labelColor = isCritical ? 'text-[#b91c1c]' : 'text-[#547169]';
  const valColor = isCritical ? 'text-[#991b1b]' : 'text-[#132a24]';

  return (
    <div
      className={`rounded-2xl p-3.5 border relative transition-all ${containerBg}`}
      data-purpose="vitals-tile"
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {alertText && (
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                isCritical
                  ? 'bg-[#dc2626] text-white'
                  : isElevated
                    ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                    : 'bg-[#e4f6ef] text-[#0f5146]'
              }`}
            >
              {alertText}
            </span>
          )}
          {Icon && (
            <div className="w-5 h-5 rounded-full bg-white border border-[#d9ebe2] flex items-center justify-center text-[#547169]">
              <Icon className="w-3 h-3 text-[#547169]" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-baseline space-x-1">
          {onChange ? (
            secondaryValue !== undefined ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={Number.isNaN(value) ? '' : value}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isNaN(parsed)) onChange(parsed);
                  }}
                  className={`w-14 sm:w-16 bg-white/90 border rounded-lg px-1 py-0.5 text-xl sm:text-2xl font-black font-mono tracking-tight text-center focus:outline-none ${
                    isCritical
                      ? 'text-[#991b1b] border-rose-300 focus:border-rose-500'
                      : 'text-[#132a24] border-[#d2e4dc] focus:border-[#0f5146]'
                  }`}
                  aria-label={`${label} systolic`}
                />
                <span className="text-lg font-black text-[#547169] select-none">/</span>
                <input
                  type="number"
                  min={secondaryMin ?? 30}
                  max={secondaryMax ?? 160}
                  value={Number.isNaN(secondaryValue) ? '' : secondaryValue}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isNaN(parsed)) secondaryOnChange?.(parsed);
                  }}
                  className="w-14 sm:w-16 bg-white/90 border rounded-lg px-1 py-0.5 text-xl sm:text-2xl font-black font-mono tracking-tight text-center focus:outline-none text-[#132a24] border-[#d2e4dc] focus:border-[#0f5146]"
                  aria-label={`${label} diastolic`}
                />
              </div>
            ) : (
              <input
                type="number"
                min={min}
                max={max}
                value={Number.isNaN(value) ? '' : value}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (!Number.isNaN(parsed)) onChange(parsed);
                }}
                className={`w-20 bg-white/90 border rounded-lg px-2 py-0.5 text-2xl sm:text-3xl font-black font-mono tracking-tight focus:outline-none ${
                  isCritical
                    ? 'text-[#991b1b] border-rose-300 focus:border-rose-500'
                    : 'text-[#132a24] border-[#d2e4dc] focus:border-[#0f5146]'
                }`}
                aria-label={label}
              />
            )
          ) : (
            <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${valColor}`}>
              {secondaryValue !== undefined ? `${value}/${secondaryValue}` : value}
            </span>
          )}
          <span className={`text-xs font-bold ${isCritical ? 'text-[#b91c1c]' : 'text-[#547169]'}`}>
            {unit}
          </span>
        </div>

        {onChange && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const stepVal = label.toLowerCase().includes('blood') || label.toLowerCase().includes('heart') ? 5 : 1;
                const nextVal = Math.max(min ?? 0, Math.min(max ?? 999, value - stepVal));
                onChange(nextVal);
              }}
              className="w-7 h-7 rounded-lg bg-white border border-[#d2e4dc] hover:bg-[#eef7f3] text-[#132a24] font-black text-sm flex items-center justify-center transition active:scale-95 shadow-xs cursor-pointer select-none"
              aria-label={`Decrease ${label}`}
              title={`Decrease ${label}`}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                const stepVal = label.toLowerCase().includes('blood') || label.toLowerCase().includes('heart') ? 5 : 1;
                const nextVal = Math.max(min ?? 0, Math.min(max ?? 999, value + stepVal));
                onChange(nextVal);
              }}
              className="w-7 h-7 rounded-lg bg-white border border-[#d2e4dc] hover:bg-[#eef7f3] text-[#132a24] font-black text-sm flex items-center justify-center transition active:scale-95 shadow-xs cursor-pointer select-none"
              aria-label={`Increase ${label}`}
              title={`Increase ${label}`}
            >
              +
            </button>
          </div>
        )}
      </div>

      {subtext && (
        <span
          className={`inline-block mt-1.5 text-[11px] font-medium ${
            isCritical
              ? 'text-[#b91c1c]'
              : isElevated
                ? 'text-[#b45309]'
                : 'text-[#547169]'
          }`}
        >
          {subtext}
        </span>
      )}
    </div>
  );
}

export default VitalsTile;
