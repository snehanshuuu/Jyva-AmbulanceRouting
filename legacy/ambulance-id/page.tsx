'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useSimStore } from '@/store/useSimStore';
import { VitalsForm } from '@/components/triage/VitalsForm';
import { PriorityBadge } from '@/components/triage/PriorityBadge';
import { TrendSpark } from '@/components/triage/TrendSpark';
import { rankHospitals } from '@/engine/recommend/rank';
import {
  Ambulance,
  Navigation,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatDurationS } from '@/lib/time';

import { Suspense } from 'react';

function AmbulanceViewContent() {
  const params = useParams();
  const ambulanceId = (params?.id as string) || 'amb-108-02';

  const {
    ambulances,
    incidents,
    hospitals,
    activeRoute,
    totalTimeSavedS,
    updateVitals,
  } = useSimStore();

  const ambulance = ambulances.find((a) => a.id === ambulanceId) || ambulances[0];
  const incident = incidents.find((i) => i.id === ambulance.incidentId) || incidents[0];
  const priority = incident?.patient?.priority || 'P1';
  const trend = incident?.patient?.trend || 'DETERIORATING';

  // Hospital recommendations for this incident
  const recommendations = rankHospitals(
    hospitals,
    ambulance.pos,
    incident?.type || 'CARDIAC',
    priority
  );
  const topHospital = recommendations[0]?.hospital;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Unit Status Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Ambulance className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {ambulance.callSign}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300">
                {ambulance.type} Unit
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                {ambulance.status}
              </span>
              <TrendSpark trend={trend} score={incident?.patient?.score} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Paramedic: <span className="text-slate-200">{ambulance.paramedicName}</span> • Driver:{' '}
              <span className="text-slate-200">{ambulance.driverName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer">
            <CheckCircle2 className="h-4 w-4" />
            <span>Mark Arrived at Hospital</span>
          </button>
        </div>
      </div>

      {/* Transit Card: Route & Green Corridor */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Live Green Corridor Navigation</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Saved {formatDurationS(totalTimeSavedS)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
            <span className="text-slate-400 text-xs block">Estimated Time of Arrival</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
              {activeRoute ? formatDurationS(activeRoute.etaS) : '6m 12s'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Baseline: {activeRoute ? formatDurationS(activeRoute.baselineEtaS) : '9m 45s'}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
            <span className="text-slate-400 text-xs block">Destination Facility</span>
            <span className="text-base font-bold text-white mt-1 block truncate">
              {topHospital?.name || 'KEM Hospital Parel'}
            </span>
            <span className="text-[11px] text-emerald-400 mt-0.5 block">
              Cath Lab Standing By
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
            <span className="text-slate-400 text-xs block">Next Signal Preemption</span>
            <span className="text-base font-bold text-amber-400 mt-1 block truncate">
              Parel Flyover Junction
            </span>
            <span className="text-[11px] text-emerald-400 mt-0.5 block font-mono">
              STATUS: GREEN HOLD
            </span>
          </div>
        </div>

        {/* Turn-by-turn instructions snippet */}
        {activeRoute?.steps && activeRoute.steps.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              Upcoming Manoeuvres
            </span>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              {activeRoute.steps.slice(0, 3).map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>{st.instruction} ({st.distanceM}m)</span>
                  {st.hasSignal && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                      Signal Preempted
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Paramedic Triage & Vitals Telemetry */}
      <VitalsForm
        initialVitals={incident?.patient?.vitals?.[incident.patient.vitals.length - 1]}
        initialComplaint={incident?.patient?.complaint}
        initialAgeBand={incident?.patient?.ageBand}
        onSubmit={(vitals, comp, age) => {
          updateVitals(ambulance.id, vitals, comp, age);
        }}
      />

      {/* Smart Hospital Recommendation Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Smart Hospital Recommendation
            </h2>
            <p className="text-xs text-slate-400">
              Ranked by ETA, specialty capability, bed availability, and ER load
            </p>
          </div>
          <PriorityBadge priority={priority} size="md" />
        </div>

        <div className="space-y-3">
          {recommendations.slice(0, 3).map((rec, idx) => (
            <div
              key={rec.hospital.id}
              className={`p-4 rounded-lg border transition-all ${
                idx === 0
                  ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      RANK #{rec.rank}
                    </span>
                    <h3 className="text-sm font-bold text-white">{rec.hospital.name}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{rec.hospital.address}</span>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-xs text-slate-400 block">Transit ETA</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      ~{rec.etaMinutes} mins
                    </span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-xs text-slate-400 block">Fit Score</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {Math.round(rec.overallScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="text-xs text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Why chosen:
                </span>
                {rec.reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AmbulanceViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading ambulance telemetry...</div>}>
      <AmbulanceViewContent />
    </Suspense>
  );
}

