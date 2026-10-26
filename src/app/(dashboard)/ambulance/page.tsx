'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useJyvaStore } from '@/store/useJyvaStore';
import { CaseType, Vitals } from '@/lib/types';
import { Navigation, Play, Pause, RotateCcw, AlertTriangle, LogOut, Send } from 'lucide-react';
import RouteTurnGuidance from '@/components/ambulance/RouteTurnGuidance';
import RouteSummaryStrip from '@/components/ambulance/RouteSummaryStrip';
import NearbyHospitalsCard from '@/components/ambulance/NearbyHospitalsCard';
import PatientVitalsCard from '@/components/ambulance/PatientVitalsCard';
import StatusStepper from '@/components/ambulance/StatusStepper';

// Dynamically import NavMap with SSR disabled
const NavMap = dynamic(() => import('@/components/map/NavMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#f8faf9] flex flex-col items-center justify-center border border-slate-200 rounded-xl">
      <div className="h-9 w-9 border-2 border-[#0f5146]/20 border-t-[#0f5146] rounded-full animate-spin mb-2" />
      <span className="text-xs text-slate-600 font-mono">Initializing navigation map...</span>
    </div>
  ),
});

export default function AmbulanceScreenPage() {
  const {
    ambulances,
    activeAmbulanceId,
    activeTrip,
    activeRoute,
    jams,
    rankedHospitals,
    timeSavedS,
    isSimRunning,
    setIsSimRunning,
    simSpeed,
    setSimSpeed,
    setDestinationHospital,
    updateVitals,
    sendAlertToHospital,
    addTrafficJam,
    clearTrafficJams,
    resetDemo,
  } = useJyvaStore();

  const activeAmbulance = ambulances.find((a) => a.id === activeAmbulanceId);
  const currentHospitalId = activeTrip.destinationHospitalId || 'hosp-sion';
  const destinationHospital = rankedHospitals.find((r) => r.hospital.id === currentHospitalId);
  const minutesSaved = Math.max(1, Math.round(timeSavedS / 60));

  // Vitals form state
  const [vitalsInput, setVitalsInput] = useState<Partial<Vitals>>({
    hr: activeTrip.vitals?.hr ?? 118,
    sbp: activeTrip.vitals?.sbp ?? 145,
    dbp: activeTrip.vitals?.dbp ?? 92,
    spo2: activeTrip.vitals?.spo2 ?? 88,
    gcs: activeTrip.vitals?.gcs ?? 12,
  });

  const [selectedCaseType, setSelectedCaseType] = useState<CaseType>(activeTrip.caseType || 'CARDIAC');

  const handleVitalsChange = (field: keyof Vitals, val: number) => {
    const updated = { ...vitalsInput, [field]: val };
    setVitalsInput(updated);
    updateVitals(updated, selectedCaseType);
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleCaseTypeChange = (ct: CaseType) => {
    setSelectedCaseType(ct);
    updateVitals(vitalsInput, ct);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-2.5 sm:p-3.5 max-w-[1800px] mx-auto gap-2.5">
      {/* 1. Header Strip: Fixed Height */}
      <header className="shrink-0 h-13 w-full px-4 flex items-center justify-between rounded-xl bg-white border border-[#e2efe8] shadow-xs">
        {/* Left: Brand mark & Status Info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#ebf7f3] flex items-center justify-center border border-[#d9ebe2] text-[#0f5146] shrink-0">
            <Navigation className="w-4 h-4 text-[#0f5146]" />
          </div>
          <div className="flex items-center space-x-2 flex-wrap">
            <h1 className="text-lg font-black tracking-tight text-[#132a24] leading-none">Jyva</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider bg-[#0f5146] text-white rounded-full shadow-xs">
              {activeAmbulance?.id || 'AMB-014'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#c6f3e3] text-[#0a4239] border border-[#a6e6cf]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0f5146] animate-pulse"></span>
              En route • Code 3 Priority
            </span>
          </div>
        </div>

        {/* Right: Crew Profile Capsule & Logout */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden sm:flex items-center space-x-2 bg-[#f6fbf9] rounded-full px-3 py-1 border border-[#d9ebe2]">
            <div className="w-6 h-6 rounded-full bg-[#0f5146] flex items-center justify-center text-white text-[10px] font-bold">
              MR
            </div>
            <div className="text-left pr-1">
              <p className="text-[9px] text-[#547169] uppercase font-bold tracking-wider leading-none">Lead</p>
              <p className="text-[11px] font-bold text-[#132a24] leading-tight">M. Rao</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#d9ebe2] hover:bg-[#ebf7f3] text-[#547169] hover:text-[#0f5146] text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title="Sign out of ambulance unit"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Two-Column Grid filling remaining height, zero page scroll */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* LEFT COLUMN: Controls & Telemetry (~41% / 5 cols) */}
        {/* Has its own scroll with min-h-0, action button is sticky at bottom */}
        <div
          className="lg:col-span-5 h-full min-h-0 flex flex-col bg-white rounded-2xl border border-[#e2efe8] shadow-sm overflow-hidden"
          data-purpose="controls-and-telemetry-column"
        >
          {/* Scrollable Upper Area: Nearby Hospitals & Patient Vitals */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5">
            {/* Nearby Hospitals Card */}
            <NearbyHospitalsCard
              rankedHospitals={rankedHospitals}
              selectedHospitalId={currentHospitalId}
              onSelectHospital={setDestinationHospital}
            />

            {/* Patient Vitals Card (Biometrics & Case Type, action button moved to sticky footer) */}
            <PatientVitalsCard
              vitals={vitalsInput}
              caseType={selectedCaseType}
              priority={activeTrip.priority || 'CRITICAL'}
              tripStatus={activeTrip.status}
              destinationHospitalName={
                destinationHospital?.hospital.shortName ||
                destinationHospital?.hospital.name ||
                'Sion Hospital'
              }
              hideActionFooter={true}
              onVitalsChange={handleVitalsChange}
              onCaseTypeChange={handleCaseTypeChange}
              onSendAlert={sendAlertToHospital}
            />
          </div>

          {/* Sticky Bottom Action Bar: Send Alert & Status Stepper */}
          <div className="shrink-0 p-3 bg-[#f6fbf9] border-t border-[#e2efe8] shadow-xs">
            <button
              type="button"
              onClick={sendAlertToHospital}
              className="w-full py-2.5 px-4 bg-[#0f5146] hover:bg-[#0c4239] text-white font-semibold rounded-full shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
            >
              <Send className="w-4 h-4 text-[#64f9bc]" />
              <span className="text-xs sm:text-sm tracking-wide">
                Send alert to {destinationHospital?.hospital.shortName || destinationHospital?.hospital.name || 'Sion Hospital'}
              </span>
            </button>

            <div className="mt-2">
              <StatusStepper status={activeTrip.status} />
            </div>

            <p className="text-[10px] text-[#547169] text-center font-medium mt-1">
              Demo only, not medical advice
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Tactical Navigator (~59% / 7 cols) */}
        {/* flex column, min-h-0 */}
        <div
          className="lg:col-span-7 h-full min-h-0 flex flex-col gap-2.5 overflow-hidden"
          data-purpose="tactical-navigator-column"
        >
          {/* Map Card: flex-1, relative, overflow-hidden */}
          <div
            className="flex-1 min-h-0 bg-white rounded-2xl border border-[#e2efe8] shadow-sm flex flex-col relative overflow-hidden p-2 sm:p-2.5"
            data-purpose="tactical-map-viewport"
          >
            {/* Absolute positioning container so MapLibre canvas cannot cause parent expansion */}
            <div className="relative flex-1 w-full h-full min-h-0 rounded-xl overflow-hidden border border-[#d9ebe2] bg-[#f8faf9]">
              {/* Top HUD: Turn Guidance & Simulation Controls */}
              <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-3.5 sm:left-3.5 sm:right-3.5 z-[500] flex flex-wrap md:flex-nowrap items-start justify-between pointer-events-none gap-2">
                <div className="flex flex-col gap-2 pointer-events-auto max-w-full">
                  <RouteTurnGuidance route={activeRoute} currentPos={activeAmbulance?.pos} />

                  {/* Dynamic Jam / Detour Notification Banner */}
                  {jams.length > 0 && (
                    <div className="bg-[#1b0808]/95 border border-rose-500/50 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs max-w-sm">
                      <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <div>
                        <p className="font-bold text-rose-200 text-xs leading-tight">
                          Congestion on Dr. Ambedkar Rd
                        </p>
                        <p className="text-[11px] text-rose-300/80 leading-tight mt-0.5">
                          Rerouted via Matunga Central link • <span className="font-bold text-emerald-400">{minutesSaved} min saved</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clean Demo & Simulation Controls (wraps cleanly without overflow) */}
                <div className="pointer-events-auto bg-[#0a1e19]/95 backdrop-blur-md rounded-2xl sm:rounded-full p-1 border border-white/10 flex items-center gap-1 shadow-lg flex-wrap justify-end max-w-full shrink">
                  {/* Simulation Play / Pause Button */}
                  <button
                    type="button"
                    onClick={() => setIsSimRunning(!isSimRunning)}
                    className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded-full transition flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                    title={isSimRunning ? 'Pause live movement simulation' : 'Resume live movement simulation'}
                  >
                    {isSimRunning ? (
                      <>
                        <Pause className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span className="hidden sm:inline">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        <span className="hidden sm:inline">Play</span>
                      </>
                    )}
                  </button>

                  {/* Simulation Speed Pills */}
                  <div className="flex items-center bg-black/40 rounded-full p-0.5 border border-white/5 shrink-0">
                    {[1, 2, 4].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setSimSpeed(speed)}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition cursor-pointer ${
                          simSpeed === speed
                            ? 'bg-emerald-500 text-slate-950 shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        title={`Simulation speed ${speed}x`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  <div className="h-3.5 w-px bg-white/20 hidden sm:block"></div>

                  {/* Traffic Jam Inject / Avoidance Toggle */}
                  {jams.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => addTrafficJam()}
                      className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-full transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Inject congestion bottleneck to demonstrate dynamic reroute"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                      <span>Add traffic jam</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => clearTrafficJams()}
                      className="px-2.5 py-1 text-[11px] font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-full transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Clear congestion bottleneck"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Clear jam (+{minutesSaved}m saved)</span>
                    </button>
                  )}

                  {/* Reset Demo Button */}
                  <button
                    type="button"
                    onClick={() => resetDemo()}
                    className="p-1 px-2 text-[11px] font-medium bg-transparent hover:bg-white/10 text-emerald-100 rounded-full transition flex items-center gap-1 cursor-pointer shrink-0"
                    title="Reset simulation, hospital beds, and trip state across all screens"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-300" />
                    <span className="hidden md:inline">Reset</span>
                  </button>
                </div>
              </div>

              {/* MapLibre GL Navigation Map */}
              <NavMap
                mode="navigation"
                onlyActiveAmbulance={true}
                destinationHospitalId={currentHospitalId}
                onSelectHospital={(id) => setDestinationHospital(id)}
              />
            </div>
          </div>

          {/* Route Summary Strip: Fixed Height at bottom of navigator column */}
          <div className="shrink-0 bg-white rounded-2xl border border-[#e2efe8] px-4 py-2.5 shadow-sm">
            <RouteSummaryStrip
              route={activeRoute}
              destinationHospitalName={
                destinationHospital?.hospital.shortName ||
                destinationHospital?.hospital.name ||
                'Sion Hospital'
              }
              timeSavedMin={minutesSaved}
              isRerouted={jams.length > 0}
              onViewFullRoute={() => {
                window.dispatchEvent(new CustomEvent('jyva:toggle-overview'));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
