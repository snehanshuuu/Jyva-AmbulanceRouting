'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  LogOut,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useJyvaStore } from '@/store/useJyvaStore';

interface HospitalHeaderProps {
  hospitalName?: string;
  doctorName?: string;
  doctorRole?: string;
}

export default function HospitalHeader({
  hospitalName = 'Sion Hospital',
  doctorName = 'Dr. A. Roy',
  doctorRole = 'Chief ER Trauma',
}: HospitalHeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const activeHospitalId = useJyvaStore((s) => s.activeHospitalId);
  const hospitals = useJyvaStore((s) => s.hospitals);
  const resetDemo = useJyvaStore((s) => s.resetDemo);

  const currentHosp = hospitals.find((h) => h.id === activeHospitalId);
  const displayName = currentHosp?.name || hospitalName;

  // Live ticking IST clock matching Stitch HUD design
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      try {
        sessionStorage.clear();
      } catch {}
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center bg-[#ecf8f3] border-b border-[#e1eee7] gap-3">
      {/* Left: Jyva Brand & Hospital Pill */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0f5146] flex items-center justify-center text-white shadow-xs">
            <Activity className="w-4 h-4 text-[#64f9bc]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg tracking-tight text-[#132a24]">JYVA</span>
          </div>
        </div>

        <div className="h-5 w-px bg-[#d5e7de] hidden sm:block"></div>

        {/* Facility Selector Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#e1eee7] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-[#132a24] truncate max-w-[150px] sm:max-w-none">
              {displayName}
            </span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#daf2e8] text-[#0f5146] font-semibold tracking-wide">
              Active
            </span>
          </div>

          <button
            onClick={() => resetDemo()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e1eee7] hover:bg-[#f4fbf7] text-[#547169] hover:text-[#0f5146] text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title="Reset simulation and all synced screens"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e1eee7] hover:bg-[#f4fbf7] text-[#547169] hover:text-[#132a24] text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title="Sign out of hospital terminal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Right: Telemetry & Physician Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Telemetry Clock */}
        <div className="hidden md:flex items-center px-3.5 py-1.5 bg-white rounded-full border border-[#e1eee7] text-xs text-[#547169] shadow-xs">
          <span className="font-mono font-semibold text-[#132a24] tracking-tight min-w-[76px]">
            {currentTime || '11:12:09 IST'}
          </span>
        </div>

        {/* Physician Profile Capsule */}
        <div className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white border border-[#e1eee7] hover:bg-[#f4fbf7] shadow-xs transition-all cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-[#daf2e8] text-[#0f5146] font-extrabold text-[11px] flex items-center justify-center border border-[#b8e4d2]">
            AR
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[#132a24] leading-tight">{doctorName}</span>
            <span className="text-[9px] text-[#547169] font-medium leading-tight">{doctorRole}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#7a958e] ml-0.5" />
        </div>
      </div>
    </header>
  );
}
