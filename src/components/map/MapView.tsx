'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSimStore } from '@/store/useSimStore';
import {
  Navigation,
  Building2,
  Zap,
  Layers,
  Crosshair,
  RotateCcw,
  Activity,
  ShieldCheck,
  Radio,
} from 'lucide-react';

// Dynamically import LeafletMap with SSR disabled (pure client-side execution)
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <MapLoadingSkeleton />,
});

function MapLoadingSkeleton() {
  return (
    <div className="w-full h-full min-h-[480px] lg:min-h-[540px] rounded-xl bg-slate-950 flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Activity className="h-5 w-5 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-200">Initializing OpenStreetMap Engine...</p>
          <p className="text-xs text-slate-500 font-mono">Loading Leaflet cartography & telemetry nodes</p>
        </div>
      </div>
    </div>
  );
}

export function MapView() {
  const {
    ambulances,
    hospitals,
    signals,
    activeRoute,
    activeAmbulanceId,
    totalTimeSavedS,
  } = useSimStore();

  // Layer filter state
  const [showHospitals, setShowHospitals] = useState(true);
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [showRoute, setShowRoute] = useState(true);

  // Map view coordinates
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.0185, 72.8425]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  const activeAmbulance = ambulances.find((a) => a.id === activeAmbulanceId);
  const preemptedSignalsCount = signals.filter(
    (s) => s.state === 'PREEMPT_REQUESTED' || s.state === 'GREEN_HOLD'
  ).length;
  const activeAmbulancesCount = ambulances.filter(
    (a) => a.status === 'TRANSPORTING' || a.status === 'EN_ROUTE_SCENE'
  ).length;

  const handleRecenterCorridor = () => {
    setMapCenter([19.0185, 72.8425]);
    setMapZoom(13);
  };

  const handleFocusActiveAmbulance = () => {
    if (activeAmbulance) {
      setMapCenter([activeAmbulance.pos.lat, activeAmbulance.pos.lng]);
      setMapZoom(15);
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top HUD Controls Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        {/* Left: Corridor Title & Signal Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 shadow-sm">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <div>
              <span className="font-semibold text-xs text-white block">
                Mumbai Central Corridor
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                OSM High-Contrast Dark Tiles
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              <span>
                Pre-empted:{' '}
                <strong className="text-emerald-400 font-mono">
                  {preemptedSignalsCount}/{signals.length}
                </strong>
              </span>
            </div>
            {activeRoute && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                <span className="text-slate-400">ETA:</span>
                <strong className="text-emerald-400 font-mono">
                  {Math.round(activeRoute.etaS / 60)}m {activeRoute.etaS % 60}s
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Right: Layer Toggles & Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Layer Toggle: Hospitals */}
          <button
            type="button"
            onClick={() => setShowHospitals(!showHospitals)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showHospitals
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle Hospital Markers"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Hospitals ({hospitals.length})</span>
          </button>

          {/* Layer Toggle: Ambulances */}
          <button
            type="button"
            onClick={() => setShowAmbulances(!showAmbulances)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showAmbulances
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle Ambulance Markers"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Units ({activeAmbulancesCount} active / {ambulances.length})</span>
          </button>

          {/* Layer Toggle: Signals */}
          <button
            type="button"
            onClick={() => setShowSignals(!showSignals)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showSignals
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle Traffic Signal Markers"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Signals ({signals.length})</span>
          </button>

          {/* Layer Toggle: Route */}
          <button
            type="button"
            onClick={() => setShowRoute(!showRoute)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showRoute
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle Corridor Route Line"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Corridor</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Focus Active Unit */}
          {activeAmbulance && (
            <button
              type="button"
              onClick={handleFocusActiveAmbulance}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
              title={`Focus ${activeAmbulance.callSign}`}
            >
              <Crosshair className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Focus</span>
              <span className="font-mono text-emerald-400">{activeAmbulance.callSign}</span>
            </button>
          )}

          {/* Recenter Corridor */}
          <button
            type="button"
            onClick={handleRecenterCorridor}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
            title="Recenter Map View"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden md:inline">Recenter</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative w-full h-[480px] lg:h-[560px]">
        <LeafletMap
          showHospitals={showHospitals}
          showAmbulances={showAmbulances}
          showSignals={showSignals}
          showRoute={showRoute}
          center={mapCenter}
          zoom={mapZoom}
        />

        {/* Floating Telemetry Badge Overlay (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-2 max-w-sm pointer-events-auto">
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-2.5 backdrop-blur-md shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Active Unit:
              </span>
              <span className="font-bold font-mono text-white">
                {activeAmbulance?.callSign || 'DELTA-02'} ({activeAmbulance?.type || 'ALS'})
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">Total Delay Avoided:</span>
              <span className="font-mono font-bold text-emerald-400">
                {totalTimeSavedS} seconds
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">Active Signals Preempted:</span>
              <span className="font-mono font-bold text-amber-400">
                {preemptedSignalsCount} intersections
              </span>
            </div>
          </div>
        </div>

        {/* Floating Legend Overlay (Bottom-Right, collapsed on small screens) */}
        <div className="hidden md:block absolute bottom-4 right-4 z-[400] pointer-events-auto">
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-2 backdrop-blur-md shadow-2xl text-[10px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 text-[11px] mb-1">Map Legend</div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Hospital (Intake Open / Free Beds)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Hospital (Diverted / Full)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Ambulance (Transporting P1 / Siren Active)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Traffic Signal (Green Hold Active)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-4 bg-emerald-400 rounded-sm" />
              <span>Green Corridor Recommended Path</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar / Disclaimers */}
      <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 bg-slate-900/95 border-t border-slate-800 px-3.5 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Leaflet 1.9.4 &bull; CartoDB Dark Matter &bull; OpenStreetMap</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400 font-mono">
            Zero Paid APIs &bull; 100% Open Standards
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Demo only &bull; Emergency clinical decision support preview
        </div>
      </div>
    </div>
  );
}
export default MapView;
