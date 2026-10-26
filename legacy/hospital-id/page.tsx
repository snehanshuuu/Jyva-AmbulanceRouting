'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useSimStore } from '@/store/useSimStore';
import { PriorityBadge } from '@/components/triage/PriorityBadge';
import { TrendSpark } from '@/components/triage/TrendSpark';
import {
  Building2,
  Bed,
  Activity,
  Wind,
  Users,
  AlertOctagon,
} from 'lucide-react';
import { Suspense } from 'react';
import { formatDurationS } from '@/lib/time';

function HospitalDashboardContent() {
  const params = useParams();
  const hospitalId = (params?.id as string) || 'hosp-kem';

  const {
    hospitals,
    incidents,
    ambulances,
    activeRoute,
    updateHospitalBedCapacity,
    toggleHospitalDivert,
  } = useSimStore();

  const hospital = hospitals.find((h) => h.id === hospitalId) || hospitals[0];

  // Incoming patients assigned or headed to this facility
  const incomingIncidents = incidents.filter(
    (i) => i.assignedHospitalId === hospital.id && i.state !== 'CLOSED'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {hospital.name}
              </h1>
              {hospital.diverted ? (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  ER DIVERTED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  INTAKE ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {hospital.address} • Phone: {hospital.phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleHospitalDivert(hospital.id, 'Critical capacity overload protocol')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hospital.diverted
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300'
            }`}
          >
            <AlertOctagon className="h-4 w-4" />
            <span>{hospital.diverted ? 'Resume Emergency Intake' : 'Request ER Divert'}</span>
          </button>
        </div>
      </div>

      {/* Hospital Capacity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* ER Beds */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Bed className="h-4 w-4 text-emerald-400" /> ER Resuscitation Beds
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {hospital.capacity.erBeds} / {hospital.capacity.erBedsTotal} Free
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {hospital.capacity.erBeds}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => updateHospitalBedCapacity(hospital.id, { erBeds: Math.max(0, hospital.capacity.erBeds - 1) })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
              >
                -1
              </button>
              <button
                onClick={() => updateHospitalBedCapacity(hospital.id, { erBeds: Math.min(hospital.capacity.erBedsTotal, hospital.capacity.erBeds + 1) })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
              >
                +1
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Critical resuscitation bays available</p>
        </div>

        {/* ICU Beds */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="h-4 w-4 text-purple-400" /> ICU Critical Beds
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {hospital.capacity.icuBeds} / {hospital.capacity.icuBedsTotal} Free
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-purple-300">
              {hospital.capacity.icuBeds}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => updateHospitalBedCapacity(hospital.id, { icuBeds: Math.max(0, hospital.capacity.icuBeds - 1) })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
              >
                -1
              </button>
              <button
                onClick={() => updateHospitalBedCapacity(hospital.id, { icuBeds: Math.min(hospital.capacity.icuBedsTotal, hospital.capacity.icuBeds + 1) })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
              >
                +1
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Dedicated intensive care monitors</p>
        </div>

        {/* Ventilators */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Wind className="h-4 w-4 text-cyan-400" /> Invasive Ventilators
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {hospital.capacity.ventilators} / {hospital.capacity.ventilatorsTotal} Free
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-cyan-300">
              {hospital.capacity.ventilators}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => updateHospitalBedCapacity(hospital.id, { ventilators: Math.max(0, hospital.capacity.ventilators - 1) })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
              >
                -1
              </button>
              <button
                onClick={() => updateHospitalBedCapacity(hospital.id, { ventilators: Math.min(hospital.capacity.ventilatorsTotal, hospital.capacity.ventilators + 1) })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
              >
                +1
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Ready for airway intubation</p>
        </div>
      </div>

      {/* Incoming Patient Priority Queue */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-400" />
              Incoming Patient Pre-Arrival Queue ({incomingIncidents.length})
            </h2>
            <p className="text-xs text-slate-400">
              Prioritized by physiological severity score and dynamic transit countdown
            </p>
          </div>
        </div>

        {incomingIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No incoming ambulance transports currently assigned to this facility.
          </div>
        ) : (
          <div className="space-y-4">
            {incomingIncidents.map((inc) => {
              const amb = ambulances.find((a) => a.id === inc.assignedAmbulanceId);
              const priority = inc.patient?.priority || 'P1';
              const trend = inc.patient?.trend || 'DETERIORATING';
              const latestVitals = inc.patient?.vitals?.[inc.patient.vitals.length - 1];

              return (
                <div
                  key={inc.id}
                  className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PriorityBadge priority={priority} size="lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {inc.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            Unit: {amb?.callSign || 'DELTA-02'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{inc.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-xs text-slate-400 block">ETA Countdown</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">
                          {activeRoute ? formatDurationS(activeRoute.etaS) : '5m 30s'}
                        </span>
                      </div>
                      <TrendSpark trend={trend} score={inc.patient?.score} />
                    </div>
                  </div>

                  {/* Vitals Telemetry Strip */}
                  {latestVitals && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Heart Rate</span>
                        <span className="font-mono font-bold text-rose-300">{latestVitals.hr} bpm</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Blood Pressure</span>
                        <span className="font-mono font-bold text-blue-300">
                          {latestVitals.sbp}/{latestVitals.dbp}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">SpO₂</span>
                        <span className="font-mono font-bold text-cyan-300">{latestVitals.spo2}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Resp. Rate</span>
                        <span className="font-mono font-bold text-emerald-300">{latestVitals.rr}/min</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">GCS</span>
                        <span className="font-mono font-bold text-purple-300">{latestVitals.gcs}/15</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Temperature</span>
                        <span className="font-mono font-bold text-amber-300">{latestVitals.tempC}°C</span>
                      </div>
                    </div>
                  )}

                  {/* Readiness Checklist */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Required Clinical Readiness Checklist
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-emerald-500 rounded" />
                        <span>Resuscitation Bay 1 Cleared &amp; Sterilized</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-emerald-500 rounded" />
                        <span>Cardiac Catheterization Lab Standby</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-emerald-500 rounded" />
                        <span>On-call Interventional Cardiologist Alerted</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-emerald-500 rounded" />
                        <span>Direct-to-Lab Stretcher &amp; Defibrillator Ready</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HospitalDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading hospital telemetry...</div>}>
      <HospitalDashboardContent />
    </Suspense>
  );
}

