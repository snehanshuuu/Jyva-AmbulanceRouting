'use client';

import React from 'react';
import { CaseType, Priority, TripStatus, Vitals } from '@/lib/types';
import VitalsTile from './VitalsTile';
import PriorityBanner from './PriorityBanner';
import StatusStepper from './StatusStepper';
import { Heart, Send, Activity } from 'lucide-react';
import { formatPriorityHeadline } from '@/engine/priority';

interface PatientVitalsCardProps {
  vitals: Partial<Vitals>;
  caseType: CaseType;
  priority: Priority;
  tripStatus: TripStatus;
  destinationHospitalName?: string;
  hideActionFooter?: boolean;
  onVitalsChange: (field: keyof Vitals, val: number) => void;
  onCaseTypeChange: (caseType: CaseType) => void;
  onSendAlert: () => void;
}

export function PatientVitalsCard({
  vitals,
  caseType,
  priority,
  tripStatus,
  destinationHospitalName = 'Sion Hospital',
  hideActionFooter = false,
  onVitalsChange,
  onCaseTypeChange,
  onSendAlert,
}: PatientVitalsCardProps) {
  const hr = vitals.hr ?? 118;
  const spo2 = vitals.spo2 ?? 88;
  const sbp = vitals.sbp ?? 145;
  const dbp = vitals.dbp ?? 92;
  const gcs = vitals.gcs ?? 12;

  const mapVal = ((sbp + 2 * dbp) / 3).toFixed(1);

  // Case types for the segmented pill selector
  const caseTypes: { type: CaseType; label: string }[] = [
    { type: 'CARDIAC', label: 'Cardiac' },
    { type: 'TRAUMA', label: 'Trauma' },
    { type: 'STROKE', label: 'Stroke' },
    { type: 'OTHER', label: 'More' },
  ];

  const priorityHeadline = formatPriorityHeadline(vitals, priority, caseType);

  return (
    <section
      className="bg-white rounded-3xl p-5 border border-[#e2efe8] shadow-hospital-card flex-1 flex flex-col justify-between"
      data-purpose="vitals-telemetry-card"
    >
      <div>
        {/* Header & Segmented Pill Case-Type Selector */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-[#ebf7f3] text-[#0f5146] flex items-center justify-center">
              <Heart className="w-4 h-4 text-[#0f5146]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#132a24]">
                Patient Vitals &amp; Status
              </h2>
              <p className="text-xs text-[#547169] font-medium">Adult Male, 54y • ID #JY-9022</p>
            </div>
          </div>

          {/* Segmented Pill Selector matching Stitch design */}
          <div className="flex items-center bg-[#f0f7f4] p-1 rounded-full text-xs font-medium text-[#547169] border border-[#d9ebe2]">
            {caseTypes.map((ct) => (
              <button
                key={ct.type}
                type="button"
                onClick={() => onCaseTypeChange(ct.type)}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  caseType === ct.type
                    ? 'bg-white text-[#132a24] font-semibold shadow-sm'
                    : 'text-[#547169] hover:text-[#132a24]'
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Vital Metric Panels (High-glanceability clean numbers) */}
        <div className="grid grid-cols-2 gap-3 mb-4" data-purpose="biometric-grid">
          {/* Heart Rate Tile */}
          <VitalsTile
            label="Heart rate"
            value={hr}
            unit="BPM"
            alertText={hr > 100 ? 'Tachycardia Alert' : hr < 50 ? 'Bradycardia' : undefined}
            subtext={hr > 100 ? 'Elevated cardiac rate' : 'Normal sinus rhythm'}
            isCritical={hr > 130 || hr < 40}
            isElevated={hr > 100 && hr <= 130}
            icon={Activity}
            min={30}
            max={220}
            onChange={(val) => onVitalsChange('hr', val)}
          />

          {/* SpO2 Tile */}
          <VitalsTile
            label="SpO2 (O2 Sat)"
            value={spo2}
            unit="%"
            alertText={spo2 < 90 ? 'Low' : spo2 <= 93 ? 'Borderline' : undefined}
            subtext={spo2 < 90 ? 'Critical Oxygenation' : spo2 <= 93 ? 'Moderate Hypoxia' : 'Normal O2 Saturation'}
            isCritical={spo2 < 90}
            isElevated={spo2 >= 90 && spo2 <= 93}
            min={50}
            max={100}
            onChange={(val) => onVitalsChange('spo2', val)}
          />

          {/* Blood Pressure Tile */}
          <VitalsTile
            label="Blood pressure"
            value={sbp}
            secondaryValue={dbp}
            unit="mmHg"
            alertText={sbp < 90 ? 'Shock' : sbp > 140 ? 'Elevated' : undefined}
            subtext={`MAP: ${mapVal} • ${sbp < 90 ? 'Hypotension Alert' : 'Stable'}`}
            isCritical={sbp < 90}
            isElevated={sbp >= 90 && sbp <= 100}
            min={40}
            max={240}
            secondaryMin={30}
            secondaryMax={160}
            onChange={(val) => onVitalsChange('sbp', val)}
            secondaryOnChange={(val) => onVitalsChange('dbp', val)}
          />

          {/* Consciousness (GCS) Tile */}
          <VitalsTile
            label="Consciousness (GCS)"
            value={gcs}
            unit="GCS"
            alertText={gcs <= 8 ? 'Severe' : gcs <= 13 ? 'E4 V4 M4' : undefined}
            subtext={gcs <= 8 ? 'Airway compromise risk' : gcs <= 13 ? 'Confused verbal response' : 'Fully alert / oriented'}
            isCritical={gcs <= 8}
            isElevated={gcs >= 9 && gcs <= 13}
            min={3}
            max={15}
            onChange={(val) => onVitalsChange('gcs', val)}
          />
        </div>

        {/* High-Contrast Priority Warning Banner */}
        <PriorityBanner
          priority={priority}
          headline={priorityHeadline}
          patientInfo="Adult Male, 54y • ID #JY-9022"
        />
      </div>

      {/* Action Button & 4-Stage Progress Stepper */}
      {!hideActionFooter && (
        <div className="mt-2 pt-3 border-t border-[#e2efe8]">
          <button
            type="button"
            onClick={onSendAlert}
            className="w-full py-3.5 px-6 bg-[#0f5146] hover:bg-[#0c4239] text-white font-semibold rounded-full shadow-button-soft transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#64f9bc]" />
            <span className="text-sm tracking-wide">
              Send alert to {destinationHospitalName}
            </span>
          </button>

          <StatusStepper status={tripStatus} />

          <p className="text-[10px] text-[#547169] text-center font-medium mt-2.5">
            Demo only, not medical advice
          </p>
        </div>
      )}
    </section>
  );
}

export default PatientVitalsCard;
