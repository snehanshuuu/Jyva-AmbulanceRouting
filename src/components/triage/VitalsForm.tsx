'use client';

import React, { useState } from 'react';
import { Vitals, AgeBand } from '@/lib/types';
import { calculateTriageScore, TRIAGE_DISCLAIMER } from '@/engine/triage/score';
import { PriorityBadge } from './PriorityBadge';
import { ShieldAlert, Heart, Activity, Wind, Brain, Thermometer, Send } from 'lucide-react';

interface VitalsFormProps {
  initialVitals?: Vitals;
  initialComplaint?: string;
  initialAgeBand?: AgeBand;
  onSubmit: (vitals: Vitals, complaint: string, ageBand: AgeBand) => void;
}

export function VitalsForm({
  initialVitals,
  initialComplaint = 'Acute chest pain radiating to left shoulder',
  initialAgeBand = 'ADULT',
  onSubmit,
}: VitalsFormProps) {
  const [hr, setHr] = useState(initialVitals?.hr ?? 115);
  const [sbp, setSbp] = useState(initialVitals?.sbp ?? 88);
  const [dbp, setDbp] = useState(initialVitals?.dbp ?? 56);
  const [spo2, setSpo2] = useState(initialVitals?.spo2 ?? 91);
  const [rr, setRr] = useState(initialVitals?.rr ?? 26);
  const [gcs, setGcs] = useState(initialVitals?.gcs ?? 14);
  const [tempC, setTempC] = useState(initialVitals?.tempC ?? 36.8);
  const [ageBand, setAgeBand] = useState<AgeBand>(initialAgeBand);
  const [complaint, setComplaint] = useState(initialComplaint);

  const currentVitals: Vitals = {
    hr,
    sbp,
    dbp,
    spo2,
    rr,
    gcs,
    tempC,
    ts: initialVitals?.ts ?? 0,
  };

  const preview = calculateTriageScore(currentVitals, complaint, ageBand);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...currentVitals, ts: Date.now() }, complaint, ageBand);
  };

  const applyPreset = (type: 'CRITICAL' | 'STABLE' | 'HYPOXIC') => {
    if (type === 'CRITICAL') {
      setHr(128);
      setSbp(82);
      setDbp(48);
      setSpo2(89);
      setRr(28);
      setGcs(11);
      setComplaint('Severe polytrauma, diaphoresis & decompensated shock');
    } else if (type === 'HYPOXIC') {
      setHr(104);
      setSbp(120);
      setDbp(78);
      setSpo2(88);
      setRr(29);
      setGcs(15);
      setComplaint('Severe bronchospasm and cyanosis with oxygen desaturation');
    } else {
      setHr(76);
      setSbp(122);
      setDbp(78);
      setSpo2(98);
      setRr(16);
      setGcs(15);
      setComplaint('Mild limb injury, fully conscious and hemodynamically stable');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl">
      {/* Disclaimer banner required by rules.md */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-5">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <span className="font-semibold uppercase tracking-wider block">Decision-Support Demonstration</span>
          <span className="text-amber-300/80">{TRIAGE_DISCLAIMER}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Rapid Paramedic Vitals Entry
          </h2>
          <p className="text-xs text-slate-400">One-touch physiological telemetry scoring</p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('CRITICAL')}
            className="px-2 py-1 text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded hover:bg-rose-500/25 transition-colors"
          >
            P1 STEMI
          </button>
          <button
            type="button"
            onClick={() => applyPreset('HYPOXIC')}
            className="px-2 py-1 text-[11px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded hover:bg-amber-500/25 transition-colors"
          >
            P2 Hypoxia
          </button>
          <button
            type="button"
            onClick={() => applyPreset('STABLE')}
            className="px-2 py-1 text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 transition-colors"
          >
            Stable
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: HR, BP, SpO2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Heart Rate */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Heart className="h-3.5 w-3.5 text-rose-400" /> Heart Rate (BPM)
              </span>
              <span className="font-mono text-white text-base font-bold">{hr}</span>
            </div>
            <input
              type="range"
              min="30"
              max="180"
              value={hr}
              onChange={(e) => setHr(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Blood Pressure (SBP) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Activity className="h-3.5 w-3.5 text-blue-400" /> SBP (mmHg)
              </span>
              <span className="font-mono text-white text-base font-bold">{sbp} / {dbp}</span>
            </div>
            <input
              type="range"
              min="50"
              max="240"
              value={sbp}
              onChange={(e) => setSbp(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* SpO2 */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Wind className="h-3.5 w-3.5 text-cyan-400" /> SpO₂ (%)
              </span>
              <span className={`font-mono text-base font-bold ${spo2 <= 91 ? 'text-rose-400' : 'text-cyan-300'}`}>
                {spo2}%
              </span>
            </div>
            <input
              type="range"
              min="70"
              max="100"
              value={spo2}
              onChange={(e) => setSpo2(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Row 2: RR, GCS, Temp */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Respiratory Rate */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-medium">Resp. Rate (/min)</span>
              <span className="font-mono text-white text-base font-bold">{rr}</span>
            </div>
            <input
              type="range"
              min="6"
              max="45"
              value={rr}
              onChange={(e) => setRr(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* GCS */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Brain className="h-3.5 w-3.5 text-purple-400" /> GCS (3-15)
              </span>
              <span className="font-mono text-white text-base font-bold">{gcs}/15</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              value={gcs}
              onChange={(e) => setGcs(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Temperature */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Thermometer className="h-3.5 w-3.5 text-amber-400" /> Temp (°C)
              </span>
              <span className="font-mono text-white text-base font-bold">{tempC}°C</span>
            </div>
            <input
              type="range"
              min="34.0"
              max="41.0"
              step="0.1"
              value={tempC}
              onChange={(e) => setTempC(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Complaint & Age Band */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Chief Complaint / Mechanism
            </label>
            <input
              type="text"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. STEMI, severe crash, acute stroke symptoms..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Age Band</label>
            <select
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value as AgeBand)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="CHILD">Child (&lt;16)</option>
              <option value="ADULT">Adult (16-65)</option>
              <option value="ELDERLY">Elderly (&gt;65)</option>
            </select>
          </div>
        </div>

        {/* Real-time Triage Live Preview */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PriorityBadge priority={preview.priority} size="lg" />
            <div>
              <div className="text-xs text-slate-400">
                Calculated Acuity Score: <span className="text-white font-mono font-bold text-sm">{preview.score} pts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {preview.reasons[0] || 'Hemodynamics within standard limits'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Transmit Telemetry &amp; Alerts</span>
          </button>
        </div>
      </form>
    </div>
  );
}
